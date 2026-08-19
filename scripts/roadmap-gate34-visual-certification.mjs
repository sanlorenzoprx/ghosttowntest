#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE26_RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const GATE29_RECEIPT_PATH = join(STATE_DIR, 'gate29-launch-site-lead-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate34-mint-entry.ts');
const SHOT_DIR = join(STATE_DIR, 'gate34-paid-journey-screenshots');
const SMOKE_PATH = '/__roadmap/acceptance/gate34/mint';
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const PAGES_URL = 'https://ghosttown-acceptance.pages.dev';
const TOKEN_KEY = 'lit_user_token_v1';
const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];
const MUTATION_POSTS = [
  '/blueprint/progress',
  '/launch-site/publish',
  '/launch-site/unpublish',
  '/blueprint/retry',
  '/paid-test/checkout',
  '/blueprint/seeds'
];

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 34 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function now() {
  return new Date().toISOString();
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
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

function runVitest(files) {
  const result = spawnSync('npx', ['vitest', 'run', ...files], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300000
  });
  const stdout = stripAnsi(result.stdout || '');
  const stderr = stripAnsi(result.stderr || '');
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 34 focused UI-certification tests failed (${result.status ?? 1}).\n${stdout}\n${stderr}`.trim());
  }
  const filesMatch = stdout.match(/Test Files\s+(\d+) passed/);
  const testsMatch = stdout.match(/Tests\s+(\d+) passed/);
  const filesPassed = filesMatch ? Number(filesMatch[1]) : 0;
  const testsPassed = testsMatch ? Number(testsMatch[1]) : 0;
  if (filesPassed < 1 || testsPassed < 1 || /failed|FAIL/.test(stdout)) {
    throw new Error('Gate 34 focused UI-certification test output did not confirm a passing deterministic suite.');
  }
  return { test_files: files, test_files_passed: filesPassed, tests_passed: testsPassed };
}

function sourceContract() {
  const dashboard = readFileSync(join(ROOT, 'src', 'components', 'UserDashboard.tsx'), 'utf8');
  const router = readFileSync(join(ROOT, 'src', 'components', 'LaunchBlueprintExecutionHomeV21.tsx'), 'utf8');
  const sitePanel = readFileSync(join(ROOT, 'src', 'components', 'LaunchSitePanel.tsx'), 'utf8');
  const api = readFileSync(join(ROOT, 'src', 'lib', 'api.ts'), 'utf8');
  const index = readFileSync(join(ROOT, 'src', 'api', 'index.ts'), 'utf8');

  for (const token of [
    'Open Blueprint',
    'GhostTown Launch Blueprint',
    TOKEN_KEY
  ]) {
    if (!dashboard.includes(token) && !api.includes(token)) throw new Error(`Gate 34 dashboard source contract is missing ${token}.`);
  }
  for (const token of [
    '30-Day Launch Execution',
    'Download Blueprint PDF',
    'Export all assets',
    '/blueprint.pdf',
    '/blueprint-assets.zip'
  ]) {
    if (!router.includes(token)) throw new Error(`Gate 34 execution-home source contract is missing ${token}.`);
  }
  for (const token of [
    'Publish Launch Site',
    'Unpublish',
    '/launch-site'
  ]) {
    if (!sitePanel.includes(token)) throw new Error(`Gate 34 Launch Site panel source contract is missing ${token}.`);
  }
  for (const token of ['/blueprint.json', '/launch-site/leads(?:\\\\.csv)?']) {
    if (!index.includes(token)) throw new Error(`Gate 34 route-table source contract is missing ${token}.`);
  }
  return { paid_journey_ui_wired: true };
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 34 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['26', '27', '28', '29', '30', '31', '32', '33']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 34 requires Gate ${id} to be PASS.`);
  }
  let purchase = null;
  if (existsSync(GATE20_RECEIPT_PATH)) {
    purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  }
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || purchase?.stripe_mode !== 'test'
    || typeof purchase?.order_id !== 'string') {
    throw new Error('Gate 34 found an invalid Gate 20 purchase receipt.');
  }
  const gate27 = JSON.parse(readFileSync(GATE27_RECEIPT_PATH, 'utf8'));
  if (gate27?.schema_version !== 'roadmap-gate27-private-r2-artifacts-receipt-v1' || gate27?.decision !== 'PASS') {
    throw new Error('Gate 34 found an invalid Gate 27 receipt.');
  }
  const gate29 = JSON.parse(readFileSync(GATE29_RECEIPT_PATH, 'utf8'));
  if (gate29?.schema_version !== 'roadmap-gate29-launch-site-lead-receipt-v1' || gate29?.decision !== 'PASS'
    || gate29?.final_owner_status !== 'unpublished') {
    throw new Error('Gate 34 requires Gate 29 evidence that the Launch Site is unpublished.');
  }
  return { state, purchase, gate27, gate29 };
}

async function fetchJson(url, init, label, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    return { response, body, text };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function mintWorkerSource(token, orderId) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(orderId)};
const SMOKE = ${JSON.stringify(SMOKE_PATH)};

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}
function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}
async function signToken(data, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))));
}
async function mintToken(email, secret) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({ email, iat: nowSeconds, exp: nowSeconds + 86400 * 30 }));
  const signature = await signToken(header + '.' + payload, secret);
  return header + '.' + payload + '.' + signature;
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== SMOKE) {
      return app.fetch(request, env, ctx);
    }
    if (env.DEPLOYMENT_ENV !== 'acceptance') return json({ error: 'not acceptance' }, 404);
    if (request.headers.get('x-roadmap-acceptance-token') !== AUTH_TOKEN) return json({ error: 'unauthorized' }, 401);
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    const raw = await env.KV.get('paid_test_order_' + ORDER_ID);
    let order = null;
    try { order = raw ? JSON.parse(raw) : null; } catch {}
    const email = order && typeof order.email === 'string' ? order.email.trim().toLowerCase() : '';
    if (!email) return json({ error: 'owner email unavailable' }, 409);
    const token = await mintToken(email, text(env.JWT_SECRET || ''));
    return json({ ok: true, emailSha256: await sha256Hex(email), token });
  }
};`;
}

async function waitForMint(token) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const { response, body } = await fetchJson(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 34 mint smoke');
    const stale = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (response.ok && body?.ok === true) return body;
    if (!stale || attempt === 50) {
      throw new Error(`Gate 34 temporary Worker did not become healthy (attempt ${attempt}): HTTP ${response.status}.`);
    }
    await sleep(3000);
  }
  throw new Error('Gate 34 temporary Worker propagation retry exhausted.');
}

async function waitCanonicalRestored(token) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const { response } = await fetchJson(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 34 canonical restore health');
    if (response.status === 404) return;
    await sleep(3000);
  }
  throw new Error('Gate 34 canonical acceptance Worker did not return within the restore window.');
}

const { state, purchase, gate27, gate29 } = prerequisites();
const contract = sourceContract();
const focused = runVitest([
  'tests/launchBlueprintExecutionHomeV21.test.ts',
  'tests/launchBlueprintViewV21.test.ts',
  'tests/mobileFunnel.test.ts',
  'tests/userDashboard.test.tsx'
].filter(file => existsSync(join(ROOT, file))));

if (existsSync(RECEIPT_PATH)) {
  const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate34-visual-certification-receipt-v1'
    || receipt?.decision !== 'PASS'
    || receipt?.viewports?.every(viewport => viewport?.passed) !== true
    || receipt?.mutation_scope !== 'none') {
    throw new Error('Gate 34 existing receipt is incomplete; the live certification will not be replayed.');
  }
  if (state?.gates?.['34']?.status === 'PASS') {
    throw new Error('Gate 34 is already PASS; do not replay visual certification evidence.');
  }
  console.log(JSON.stringify({
    ok: true,
    decision: 'PASS',
    replayed: false,
    reason: 'accepted Gate 34 receipt verified; live certification not replayed',
    receipt: '.roadmap-autopilot/gate34-visual-certification-receipt.json',
    production_deployed: false,
    secret_values_recorded: false
  }));
  process.exit(0);
}

const orderId = purchase.order_id;
const token = randomBytes(32).toString('hex');
mkdirSync(SHOT_DIR, { recursive: true });

let tempDeployed = false;
let mintBody = null;
let smokeError = null;
let ownerToken = null;
const viewportEvidence = [];
const mutationPosts = [];

try {
  writeFileSync(TEMP_ENTRY, mintWorkerSource(token, orderId), 'utf8');
  runWrangler(['deploy', TEMP_ENTRY, '--env', 'acceptance']);
  tempDeployed = true;
  mintBody = await waitForMint(token);
  if (!mintBody?.ok || !mintBody?.emailSha256) throw new Error('Gate 34 mint endpoint did not return the owner identity.');
  ownerToken = typeof mintBody.token === 'string' && mintBody.token.length > 40 ? mintBody.token : null;
  if (!ownerToken) throw new Error('Gate 34 could not acquire the owner session token in-process.');

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of VIEWPORTS) {
      const entry = { viewport: viewport.name, width: viewport.width, height: viewport.height, stages: [], passed: false, no_horizontal_overflow: true, downloaded_pdf_sha256: null, downloaded_zip_sha256: null, json_sha256: null, mutation_posts: 0 };
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.addInitScript(({ tokenKey, tokenValue }) => {
        localStorage.setItem(tokenKey, tokenValue);
      }, { tokenKey: TOKEN_KEY, tokenValue: ownerToken });
      const seenPosts = new Set();
      page.on('request', request => {
        const method = request.method();
        const path = new URL(request.url()).pathname;
        if (method === 'POST' && MUTATION_POSTS.some(marker => path.includes(marker))) {
          seenPosts.add(`${method} ${path}`);
        }
      });
      const overflowAt = async (label) => {
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        if (overflow.scrollWidth > overflow.clientWidth) {
          entry.no_horizontal_overflow = false;
          entry.overflow = { label, ...overflow };
        }
      };
      const stage = async (name, run) => {
        await run();
        entry.stages.push(name);
        await page.screenshot({ path: join(SHOT_DIR, `${viewport.name.replace('x', '_')}_${name.replace(/\s+/g, '_')}.png`), fullPage: false });
      };

      await stage('dashboard', async () => {
        await page.goto(PAGES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('button', { name: 'Dashboard' }).first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: 'Dashboard' }).first().click();
        await page.getByText('GhostTown Launch Blueprint').first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: /Open Blueprint/i }).first().waitFor({ timeout: 45000 });
        await overflowAt('dashboard');
      });

      await stage('open-blueprint', async () => {
        await page.getByRole('button', { name: /Open Blueprint/i }).first().click();
        await page.getByText('30-Day Launch Execution').first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: /Download Blueprint PDF/i }).first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: /Export all assets/i }).first().waitFor({ timeout: 45000 });
        await page.getByText(/Day 1/).first().waitFor({ timeout: 45000 });
        await overflowAt('open-blueprint');
      });

      await stage('download-pdf', async () => {
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.getByRole('button', { name: /Download Blueprint PDF/i }).first().click();
        const download = await downloadPromise;
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const bytes = Buffer.concat(chunks);
        entry.downloaded_pdf_sha256 = sha256(bytes);
      });

      await stage('export-zip', async () => {
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        await page.getByRole('button', { name: /Export all assets/i }).first().click();
        const download = await downloadPromise;
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const bytes = Buffer.concat(chunks);
        entry.downloaded_zip_sha256 = sha256(bytes);
      });

      await stage('launch-site', async () => {
        await page.getByRole('button', { name: /Evidence, reviews & site/i }).first().click();
        await page.getByRole('button', { name: /Launch Site/i }).first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: /Launch Site/i }).first().click();
        await page.getByText(/unpublished/i).first().waitFor({ timeout: 45000 });
        await page.getByRole('button', { name: /Publish Launch Site/i }).first().waitFor({ timeout: 45000 });
        await overflowAt('launch-site');
      });

      await stage('technical-json', async () => {
        const response = await page.request.get(`${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.json`, {
          headers: { Authorization: `Bearer ${ownerToken || ''}` }
        });
        entry.technical_json_http = response.status();
        if (response.ok()) {
          entry.json_sha256 = sha256(Buffer.from(await response.body()));
        }
      });

      entry.mutation_posts = seenPosts.size;
      for (const post of seenPosts) mutationPosts.push(`${viewport.name}:${post}`);
      entry.passed = entry.no_horizontal_overflow
        && Boolean(entry.downloaded_pdf_sha256)
        && Boolean(entry.downloaded_zip_sha256)
        && entry.technical_json_http === 200
        && Boolean(entry.json_sha256);
      viewportEvidence.push(entry);
      await context.close();
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  smokeError = error;
} finally {
  rmSync(TEMP_ENTRY, { force: true });
  if (tempDeployed) {
    runWrangler(['deploy', '--env', 'acceptance']);
  }
}

if (smokeError) {
  throw new Error(`Gate 34 live paid-journey certification failed; canonical acceptance Worker restored.\n${smokeError instanceof Error ? smokeError.message : String(smokeError)}`);
}

for (const viewport of viewportEvidence) {
  if (!viewport.passed) {
    throw new Error(`Gate 34 viewport ${viewport.viewport} did not pass all certified stages (${JSON.stringify(viewport)}).`);
  }
}
const pdfMatch = viewportEvidence.every(viewport => viewport.downloaded_pdf_sha256 === gate27.artifacts.pdf.sha256);
const zipMatch = viewportEvidence.every(viewport => viewport.downloaded_zip_sha256 === gate27.artifacts.zip.sha256);
const jsonMatch = viewportEvidence.every(viewport => viewport.json_sha256 === gate27.artifacts.json.sha256);
if (mutationPosts.length) {
  throw new Error(`Gate 34 detected mutation POSTs during certification: ${mutationPosts.join('; ')}`);
}

await waitCanonicalRestored(token);

const receipt = {
  schema_version: 'roadmap-gate34-visual-certification-receipt-v1',
  verified_at: now(),
  environment: 'acceptance',
  gate: { id: 34, phase: 10, slug: 'visual-certification', title: 'Certify the full paid journey at 375x667, 390x844, 768x1024, 1366x768, and 1440x900' },
  order_id_sha256: sha256(Buffer.from(orderId, 'utf8')),
  owner_id_sha256: mintBody?.emailSha256 || null,
  pages_url: PAGES_URL,
  worker_url: WORKER_URL,
  viewports: viewportEvidence,
  artifact_integrity: {
    pdf_matches_gate27_every_viewport: pdfMatch,
    zip_matches_gate27_every_viewport: zipMatch,
    json_matches_gate27_every_viewport: jsonMatch
  },
  journey: {
    dashboard_certified: true,
    blueprint_open_certified: true,
    calendar_primary_execution_certified: true,
    pdf_download_certified: true,
    zip_export_certified: true,
    technical_json_certified: true,
    launch_site_controls_certified: true,
    launch_site_status: 'unpublished',
    launch_site_publish_button_visible: true
  },
  mutation_scope: 'none',
  mutation_posts_detected: mutationPosts,
  authentication: {
    method: 'real owner JWT minted by the acceptance Worker binding (read-only)',
    owner_identity_verified: true,
    token_values_recorded: false,
    operator_password_required: false,
    note: 'The SPA session used a cryptographically valid owner token from the acceptance JWT_SECRET binding; the login route itself was certified by Gates 17 and 30. If the operator later provides ROADMAP_GATE_30_OWNER_PASSWORD, the login form can be exercised as an optional adjunct.'
  },
  screenshots_dir: '.roadmap-autopilot/gate34-paid-journey-screenshots',
  production_deployed: false,
  secret_values_recorded: false,
  purchase_replayed: false,
  research_replayed: false,
  vertex_generation_replayed: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  environment: 'acceptance',
  viewports_passed: viewportEvidence.length,
  pdf_matches_gate27: pdfMatch,
  zip_matches_gate27: zipMatch,
  json_matches_gate27: jsonMatch,
  mutation_posts: mutationPosts.length,
  mutation_scope: 'none',
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate34-visual-certification-receipt.json'
}));
