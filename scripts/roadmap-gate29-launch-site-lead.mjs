#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate29-launch-site-lead-receipt.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate29-launch-site-acceptance-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate29-owner-token';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 29 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function runWrangler(args) {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 29 Wrangler command failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
  }
}

async function sleep(ms) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function requirePriorAcceptance() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 29 requires roadmap state.');
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 29 requires the existing Gate 20 purchase receipt.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['28']?.status !== 'PASS') throw new Error('Gate 29 requires Gate 28 to be PASS.');
  const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
      || purchase?.stripe_mode !== 'test'
      || typeof purchase?.order_id !== 'string'
      || !/^gtt_[A-Za-z0-9_-]+$/.test(purchase.order_id)) {
    throw new Error('Gate 29 found an invalid Gate 20 purchase receipt.');
  }
  return purchase;
}

function temporaryWorkerSource(token) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}

function encodeBase64Url(value) {
  return toBase64Url(new TextEncoder().encode(value));
}

async function signToken(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))));
}

async function ownerToken(env, orderId) {
  if (env.DEPLOYMENT_ENV !== 'acceptance') return json({ ok: false, error: 'Acceptance environment required' }, 404);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'JWT secret is not configured' }, 502);
  const rawOrder = await env.KV.get('paid_test_order_' + orderId);
  if (!rawOrder) return json({ ok: false, error: 'Paid order not found' }, 404);
  let order;
  try { order = JSON.parse(rawOrder); } catch { return json({ ok: false, error: 'Paid order is invalid' }, 500); }
  const email = String(order.email || '').trim().toLowerCase();
  if (!email || order.orderId !== orderId || order.status !== 'ready' || order.artifactType !== 'launch_blueprint_v2') {
    return json({ ok: false, error: 'Paid order is not a ready Launch Blueprint' }, 409);
  }
  if (!await env.KV.get('user_' + email)) return json({ ok: false, error: 'Paid owner account is missing' }, 409);
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({ email, iat: now, exp: now + 600 }));
  const signature = await signToken(header + '.' + payload, env.JWT_SECRET);
  return json({ ok: true, token: header + '.' + payload + '.' + signature });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      return ownerToken(env, String(body?.orderId || ''));
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

async function requestJson(url, init, expectedStatus, label) {
  const response = await fetchWithTimeout(url, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (response.status !== expectedStatus) {
    throw new Error(`Gate 29 ${label} expected HTTP ${expectedStatus}, received ${response.status}: ${body?.error || 'unexpected response'}`);
  }
  return { response, body, text };
}

async function acquireOwnerToken(adapterToken, orderId) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: {
        'X-Roadmap-Acceptance-Token': adapterToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    if (response.status === 200 && body?.ok === true && typeof body?.token === 'string') return body.token;
    const canonicalWorkerStillServing = response.status === 404 && (body?.error === 'Endpoint not found' || !body);
    if (!canonicalWorkerStillServing || attempt === maxAttempts) {
      throw new Error(`Gate 29 temporary owner-token endpoint failed HTTP ${response.status}: ${body?.error || 'unexpected response'}`);
    }
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 29 temporary Worker propagation retry exhausted unexpectedly.');
}

async function waitForCanonicalRestore(adapterToken) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: {
        'X-Roadmap-Acceptance-Token': adapterToken,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (response.status === 404) return;
    if (attempt === maxAttempts) throw new Error(`Gate 29 canonical Worker restore did not propagate; smoke endpoint still returned HTTP ${response.status}.`);
    await sleep(1500 * attempt);
  }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

const purchase = requirePriorAcceptance();
mkdirSync(STATE_DIR, { recursive: true });
const adapterToken = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(adapterToken), 'utf8');

let wrappedDeployed = false;
let ownerJwt = null;
let published = false;
let publicUrl = null;
let siteId = null;
let publicSlug = null;
let leadEmail = null;
let evidence = null;
let primaryError = null;
let cleanupError = null;
let restoreError = null;

try {
  runWrangler(['deploy', '.roadmap-autopilot/gate29-launch-site-acceptance-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  ownerJwt = await acquireOwnerToken(adapterToken, purchase.order_id);

  const ownerUrl = `${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(purchase.order_id)}/launch-site`;
  const initial = await requestJson(ownerUrl, { method: 'GET', headers: bearer(ownerJwt) }, 200, 'owner Launch Site view');
  if (!initial.body?.site?.siteId || !initial.body?.site?.publicSlug || !Array.isArray(initial.body?.publishFailures)) {
    throw new Error('Gate 29 owner Launch Site view is missing site identity or publishability evidence.');
  }
  if (initial.body.publishFailures.length !== 0) {
    throw new Error(`Gate 29 Launch Site is not publishable: ${initial.body.publishFailures.join(' | ')}`);
  }
  siteId = initial.body.site.siteId;
  publicSlug = initial.body.site.publicSlug;

  const publish = await requestJson(`${ownerUrl}/publish`, { method: 'POST', headers: bearer(ownerJwt) }, 200, 'publish');
  if (publish.body?.site?.status !== 'published' || !publish.body?.site?.publishedAt || typeof publish.body?.publicUrl !== 'string') {
    throw new Error('Gate 29 publish did not return a published site with a public URL.');
  }
  publicUrl = publish.body.publicUrl;
  const parsedPublicUrl = new URL(publicUrl);
  if (parsedPublicUrl.origin !== WORKER_URL || parsedPublicUrl.pathname !== `/launch/${encodeURIComponent(publicSlug)}`) {
    throw new Error(`Gate 29 public URL escaped the acceptance Worker origin: ${parsedPublicUrl.origin}${parsedPublicUrl.pathname}`);
  }
  published = true;

  const publicPage = await fetchWithTimeout(publicUrl, { method: 'GET' });
  const publicHtml = await publicPage.text();
  if (publicPage.status !== 200) throw new Error(`Gate 29 public Launch Site expected HTTP 200, received ${publicPage.status}.`);
  if (!String(publicPage.headers.get('content-type') || '').toLowerCase().includes('text/html')) throw new Error('Gate 29 public Launch Site is not HTML.');
  if (String(publicPage.headers.get('cache-control') || '').toLowerCase() !== 'no-store') throw new Error('Gate 29 public Launch Site cache policy drifted.');
  if (!String(publicPage.headers.get('content-security-policy') || '').includes("frame-ancestors 'none'")) throw new Error('Gate 29 public Launch Site CSP boundary drifted.');
  if (!publicHtml.includes('data-lead-form') || !publicHtml.includes(`/api/launch-sites/${publicSlug}/leads`)) throw new Error('Gate 29 public Launch Site is missing its live lead form contract.');
  if (publicHtml.includes(purchase.order_id) || publicHtml.includes(siteId)) throw new Error('Gate 29 public Launch Site leaked private order/site identity.');

  leadEmail = `gate29-${Date.now()}-${randomBytes(5).toString('hex')}@example.test`;
  const lead = await requestJson(`${WORKER_URL}/api/launch-sites/${encodeURIComponent(publicSlug)}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: leadEmail,
      name: 'Roadmap Gate 29',
      message: 'Acceptance-only Launch Site lead capture verification.',
      consent: true
    })
  }, 201, 'public lead capture');
  if (lead.body?.ok !== true) throw new Error('Gate 29 public lead capture did not acknowledge success.');

  const ownerLeads = await requestJson(`${ownerUrl}/leads`, { method: 'GET', headers: bearer(ownerJwt) }, 200, 'owner lead view');
  const captured = Array.isArray(ownerLeads.body?.leads)
    ? ownerLeads.body.leads.find(item => item?.email === leadEmail)
    : null;
  if (!captured || captured.source_path !== `/launch/${publicSlug}` || !captured.consent_text) {
    throw new Error('Gate 29 owner lead view did not contain the consented public test lead.');
  }

  const csvResponse = await fetchWithTimeout(`${ownerUrl}/leads.csv`, { method: 'GET', headers: bearer(ownerJwt) });
  const csv = await csvResponse.text();
  if (csvResponse.status !== 200) throw new Error(`Gate 29 owner CSV export expected HTTP 200, received ${csvResponse.status}.`);
  if (!String(csvResponse.headers.get('content-type') || '').toLowerCase().includes('text/csv')) throw new Error('Gate 29 owner lead export is not CSV.');
  if (String(csvResponse.headers.get('cache-control') || '').toLowerCase() !== 'private, no-store') throw new Error('Gate 29 owner CSV export cache policy drifted.');
  if (!csv.includes('"lead_id","email","name","message","source_path","consent_text","created_at"') || !csv.includes(leadEmail)) {
    throw new Error('Gate 29 owner CSV export does not contain the captured lead contract.');
  }

  const unpublish = await requestJson(`${ownerUrl}/unpublish`, { method: 'POST', headers: bearer(ownerJwt) }, 200, 'unpublish');
  if (unpublish.body?.site?.status !== 'unpublished' || !unpublish.body?.site?.unpublishedAt) {
    throw new Error('Gate 29 unpublish did not persist the unpublished lifecycle state.');
  }
  published = false;

  const unavailable = await fetchWithTimeout(publicUrl, { method: 'GET' });
  const unavailableText = await unavailable.text();
  if (unavailable.status !== 404 || !unavailableText.includes('Launch Site not found')) {
    throw new Error(`Gate 29 unpublished public URL expected HTTP 404, received ${unavailable.status}.`);
  }

  const finalOwner = await requestJson(ownerUrl, { method: 'GET', headers: bearer(ownerJwt) }, 200, 'final owner Launch Site view');
  if (finalOwner.body?.site?.status !== 'unpublished') throw new Error('Gate 29 final owner view did not confirm unpublished state.');

  evidence = {
    schema_version: 'roadmap-gate29-launch-site-lead-receipt-v1',
    verified_at: new Date().toISOString(),
    environment: 'acceptance',
    order_id_sha256: sha256(Buffer.from(purchase.order_id, 'utf8')),
    site_id_sha256: sha256(Buffer.from(siteId, 'utf8')),
    public_slug_sha256: sha256(Buffer.from(publicSlug, 'utf8')),
    public_url_sha256: sha256(Buffer.from(publicUrl, 'utf8')),
    public_url_acceptance_origin_verified: true,
    publish_verified: true,
    public_page_http_status: 200,
    public_page_html_verified: true,
    public_page_private_identity_absent: true,
    lead_capture_http_status: 201,
    lead_capture_verified: true,
    synthetic_lead_email_sha256: sha256(Buffer.from(leadEmail, 'utf8')),
    owner_lead_view_verified: true,
    owner_csv_export_verified: true,
    unpublish_verified: true,
    public_after_unpublish_http_status: 404,
    final_owner_status: 'unpublished',
    purchase_replayed: false,
    research_replayed: false,
    vertex_invoked: false,
    r2_artifacts_mutated: false,
    acceptance_only: true,
    production_deployed: false,
    secret_values_recorded: false,
    decision: 'PASS'
  };
} catch (error) {
  primaryError = error;
} finally {
  if (wrappedDeployed && ownerJwt && published) {
    try {
      const ownerUrl = `${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(purchase.order_id)}/launch-site`;
      const response = await fetchWithTimeout(`${ownerUrl}/unpublish`, { method: 'POST', headers: bearer(ownerJwt) });
      if (response.status !== 200) throw new Error(`cleanup unpublish returned HTTP ${response.status}`);
      published = false;
    } catch (error) {
      cleanupError = error;
    }
  }
  if (wrappedDeployed) {
    try {
      runWrangler(['deploy', '--env', 'acceptance']);
      await waitForCanonicalRestore(adapterToken);
    } catch (error) {
      restoreError = error;
    }
  }
  rmSync(TEMP_ENTRY, { force: true });
}

if (restoreError) {
  throw new Error(`Gate 29 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
}
if (cleanupError) {
  throw new Error(`Gate 29 could not restore the Launch Site to unpublished state: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}${primaryError ? `; original failure: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}` : ''}`);
}
if (primaryError) throw primaryError;
if (!evidence) throw new Error('Gate 29 produced no acceptance evidence.');

writeFileSync(RECEIPT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  environment: 'acceptance',
  publish_verified: true,
  public_url_verified: true,
  lead_capture_verified: true,
  owner_lead_view_verified: true,
  owner_csv_export_verified: true,
  unpublish_verified: true,
  public_after_unpublish_http_status: 404,
  final_owner_status: 'unpublished',
  canonical_acceptance_worker_restored: true,
  purchase_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate29-launch-site-lead-receipt.json'
}));
