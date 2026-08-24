#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE23_RECEIPT_PATH = join(STATE_DIR, 'gate23-paid-provider-research.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate23-paid-provider-research-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate23-paid-provider-research';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
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
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) {
    throw new Error('Gate 23 requires the existing Gate 20 purchase receipt; no new purchase will be created.');
  }
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || receipt?.stripe_mode !== 'test'
    || typeof receipt?.order_id !== 'string'
    || typeof receipt?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 20 purchase receipt is incomplete.');
  }
  return receipt;
}

function assertPriorGatesAndResearchContract() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 23 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['22']?.status !== 'PASS') throw new Error('Gate 23 requires Gate 22 to be PASS.');

  const research = readFileSync(join(ROOT, 'src', 'api', 'distributionFootprintResearch.ts'), 'utf8');
  const persistence = readFileSync(join(ROOT, 'src', 'api', 'blueprintStoreV21.ts'), 'utf8');
  const required = [
    'const MIN_CHANNELS = 10;',
    "provider: 'distribution_footprint'",
    'sourceTypeCount: sourceTypes.size',
    'candidateChannelCount: candidates.length',
    'verifiedChannelCount: channels.length',
    'research_receipt_json'
  ];
  if (required.some(pattern => !(research + persistence).includes(pattern))) {
    throw new Error('Gate 23 first-party provider research or persisted-receipt contract no longer proves the required acceptance semantics.');
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

async function postWithPropagationRetry(token) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const staleTemporaryWorker = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (!staleTemporaryWorker || attempt === 8) return { response, body };
    console.log(`Gate 23 temporary Worker not propagated yet; retrying ${attempt}/8...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 23 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token, receipt) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(receipt.order_id)};
const CHECKOUT_SESSION_ID = ${JSON.stringify(receipt.stripe_checkout_session_id)};
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
async function sha256(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join(''); }
async function verifyGate23(env) {
  const rawOrder = await env.KV.get('paid_test_order_' + ORDER_ID);
  let order = null;
  try { order = rawOrder ? JSON.parse(rawOrder) : null; } catch {}
  if (!order || order.orderId !== ORDER_ID || order.stripeCheckoutSessionId !== CHECKOUT_SESSION_ID || !order.paidAt || order.status !== 'ready') {
    return json({ ok: false, error: 'Durable READY paid order does not match the accepted Checkout Session' }, 409);
  }
  const row = await env.DB.prepare('SELECT status, research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(ORDER_ID).first();
  if (!row || row.status !== 'ready' || typeof row.research_receipt_json !== 'string') {
    return json({ ok: false, error: 'Persisted READY Blueprint research receipt is unavailable for the accepted order' }, 409);
  }
  let receipt = null;
  try { receipt = JSON.parse(row.research_receipt_json); } catch {}
  const sourceDefinitionIds = Array.isArray(receipt?.sourceDefinitionIds) ? receipt.sourceDefinitionIds.filter(value => typeof value === 'string' && value.trim()) : [];
  const sourceDefinitionFamilies = new Set(sourceDefinitionIds.map(value => value.split(':')[0]).filter(Boolean));
  const attemptedSourceCount = Number(receipt?.attemptedSourceCount || 0);
  const successfulSourceCount = Number(receipt?.successfulSourceCount || 0);
  const sourceTypeCount = Number(receipt?.sourceTypeCount || 0);
  const candidateChannelCount = Number(receipt?.candidateChannelCount || 0);
  const verifiedChannelCount = Number(receipt?.verifiedChannelCount || 0);
  const seedDomains = Array.isArray(receipt?.seedDomains) ? receipt.seedDomains.filter(value => typeof value === 'string' && value.trim()) : [];
  if (receipt?.provider !== 'distribution_footprint' || attemptedSourceCount < 1 || successfulSourceCount < 1
    || sourceTypeCount < 1 || sourceDefinitionIds.length < 1 || seedDomains.length < 2 || seedDomains.length > 3 || candidateChannelCount < 10
    || verifiedChannelCount < 10 || verifiedChannelCount > 25) {
    return json({ ok: false, error: 'Persisted paid provider research does not satisfy required attempts, provider diversity, or verified-candidate evidence' }, 409);
  }
  return json({
    ok: true,
    orderIdSha256: await sha256(ORDER_ID),
    checkoutSessionSha256: await sha256(CHECKOUT_SESSION_ID),
    researchReceiptSha256: await sha256(row.research_receipt_json),
    blueprintStatus: row.status,
    provider: receipt.provider,
    attemptedSourceCount,
    successfulSourceCount,
    providerTypeCount: sourceTypeCount,
    providerSourceFamilyCount: sourceDefinitionFamilies.size,
    sourceDefinitionCount: sourceDefinitionIds.length,
    seedDomainCount: seedDomains.length,
    candidateChannelCount,
    verifiedChannelCount,
    persistedResearchReceipt: true,
    providerRequestsReplayed: false,
    secretValuesRecorded: false
  });
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '${SMOKE_PATH}') {
    if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
    return verifyGate23(env);
  }
  return app.fetch(request, env, ctx);
}};`;
}

assertPriorGatesAndResearchContract();
const receipt = purchaseReceipt();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, receipt), 'utf8');
let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate23-paid-provider-research-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 23 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) throw new Error(`Gate 23 acceptance verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  if (body.provider !== 'distribution_footprint' || body.attemptedSourceCount < 1 || body.successfulSourceCount < 1
    || body.providerTypeCount < 1 || body.sourceDefinitionCount < 1 || body.seedDomainCount < 2 || body.seedDomainCount > 3 || body.candidateChannelCount < 10
    || body.verifiedChannelCount < 10 || body.verifiedChannelCount > 25 || body.persistedResearchReceipt !== true
    || body.providerRequestsReplayed !== false || body.secretValuesRecorded !== false) {
    throw new Error('Gate 23 evidence does not satisfy the persisted paid provider research and verified-candidate contract.');
  }
  evidence = body;
} catch (error) {
  smokeError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try { runWrangler(['deploy', '--env', 'acceptance']); } catch (error) { restoreError = error; }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Gate 23 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}
if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 23 produced no acceptance evidence.');
writeFileSync(GATE23_RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'roadmap-gate23-paid-provider-research-receipt-v1',
  verified_at: new Date().toISOString(),
  order_id_sha256: evidence.orderIdSha256,
  checkout_session_id_sha256: evidence.checkoutSessionSha256,
  research_receipt_sha256: evidence.researchReceiptSha256,
  blueprint_status: evidence.blueprintStatus,
  provider: evidence.provider,
  attempted_source_count: evidence.attemptedSourceCount,
  successful_source_count: evidence.successfulSourceCount,
  provider_type_count: evidence.providerTypeCount,
  provider_source_family_count: evidence.providerSourceFamilyCount,
  source_definition_count: evidence.sourceDefinitionCount,
  seed_domain_count: evidence.seedDomainCount,
  candidate_channel_count: evidence.candidateChannelCount,
  verified_channel_count: evidence.verifiedChannelCount,
  persisted_research_receipt: true,
  provider_requests_replayed: false,
  secret_values_recorded: false
}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  attempted_source_count: evidence.attemptedSourceCount,
  successful_source_count: evidence.successfulSourceCount,
  provider_type_count: evidence.providerTypeCount,
  provider_source_family_count: evidence.providerSourceFamilyCount,
  source_definition_count: evidence.sourceDefinitionCount,
  seed_domain_count: evidence.seedDomainCount,
  candidate_channel_count: evidence.candidateChannelCount,
  verified_channel_count: evidence.verifiedChannelCount,
  persisted_research_receipt: true,
  provider_requests_replayed: false,
  local_receipt_written: true,
  secret_values_recorded: false
}));
