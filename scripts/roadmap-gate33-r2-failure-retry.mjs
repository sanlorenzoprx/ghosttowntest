#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE26_RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const GATE32_RECEIPT_PATH = join(STATE_DIR, 'gate32-provider-failure-retry-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate33-r2-failure-retry-receipt.json');
const SNAPSHOT_PATH = join(STATE_DIR, 'gate33-state-snapshot.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate33-r2-failure-entry.ts');
const SMOKE_PREFIX = '/__roadmap/acceptance/gate33';
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const FAILPOINT_FLAG = 'roadmap_gate33_force_r2_failure';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 33 could not resolve the installed Wrangler CLI entrypoint.');
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
    throw new Error(`Gate 33 focused R2-persistence tests failed (${result.status ?? 1}).\n${stdout}\n${stderr}`.trim());
  }
  const filesMatch = stdout.match(/Test Files\s+(\d+) passed/);
  const testsMatch = stdout.match(/Tests\s+(\d+) passed/);
  const filesPassed = filesMatch ? Number(filesMatch[1]) : 0;
  const testsPassed = testsMatch ? Number(testsMatch[1]) : 0;
  if (filesPassed < 1 || testsPassed < 1 || /failed|FAIL/.test(stdout)) {
    throw new Error('Gate 33 focused R2-persistence test output did not confirm a passing deterministic suite.');
  }
  return { test_files: files, test_files_passed: filesPassed, tests_passed: testsPassed };
}

function sourceContract() {
  const store = readFileSync(join(ROOT, 'src', 'api', 'blueprintStoreV21.ts'), 'utf8');
  const workflow = readFileSync(join(ROOT, 'src', 'api', 'launchBlueprintWorkflow.ts'), 'utf8');
  const retryApi = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');

  const failpointZone = store.slice(store.indexOf('Gate 33 acceptance-only failpoint'));
  if (!failpointZone.includes("env.DEPLOYMENT_ENV === 'acceptance'")
    || !failpointZone.includes(`'${FAILPOINT_FLAG}'`)
    || !failpointZone.includes('forced Launch Blueprint R2 persistence failure')) {
    throw new Error('Gate 33 R2 failpoint is not acceptance-gated and KV-flag-driven in blueprintStoreV21.');
  }
  for (const token of [
    "'persist canonical blueprint v2.1 artifacts before ready'",
    'retries: { limit: 3',
    'completeLaunchBlueprintOrderV21(this.env, orderId, result, {'
  ]) {
    if (!workflow.includes(token)) throw new Error(`Gate 33 workflow persistence-step source contract is missing ${token}.`);
  }
  const upsertZone = store.slice(store.indexOf('INSERT INTO launch_blueprints'));
  if (!upsertZone.includes('ON CONFLICT(order_id) DO UPDATE')) {
    throw new Error('Gate 33 D1 persistence must upsert by order_id so a recovery cannot create a duplicate order row.');
  }
  if (store.includes('roadmap_gate33_force_r2_failure') && !retryApi.includes("'Launch Blueprint is already ready'")) {
    throw new Error('Gate 33 source contract is inconsistent.');
  }
  return { r2_failpoint_acceptance_gated: true, persistence_step_bounded: true, d1_upsert_single_row: true };
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 33 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['26', '27', '28', '29', '30', '31', '32']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 33 requires Gate ${id} to be PASS.`);
  }
  let purchase = null;
  if (existsSync(GATE20_RECEIPT_PATH)) {
    purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  }
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || purchase?.stripe_mode !== 'test'
    || typeof purchase?.order_id !== 'string'
    || typeof purchase?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 33 found an invalid Gate 20 purchase receipt.');
  }
  const gate26 = JSON.parse(readFileSync(GATE26_RECEIPT_PATH, 'utf8'));
  const gate27 = JSON.parse(readFileSync(GATE27_RECEIPT_PATH, 'utf8'));
  if (gate26?.schema_version !== 'roadmap-gate26-canonical-d1-artifacts-receipt-v1'
    || gate26?.decision !== 'PASS'
    || gate27?.schema_version !== 'roadmap-gate27-private-r2-artifacts-receipt-v1'
    || gate27?.decision !== 'PASS') {
    throw new Error('Gate 33 found invalid Gate 26/27 receipts.');
  }
  if (existsSync(GATE32_RECEIPT_PATH)) {
    const gate32 = JSON.parse(readFileSync(GATE32_RECEIPT_PATH, 'utf8'));
    if (gate32?.decision !== 'PASS' || gate32?.payment?.second_charge_occurred !== false) {
      throw new Error('Gate 33 requires the accepted Gate 32 receipt (fail-closed provider retry without second charge).');
    }
  }
  return { state, purchase, gate26, gate27 };
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

function tempWorkerSource(token, orderId) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
import { saveBlueprintRecordV21 } from '../src/api/blueprintStoreV21.ts';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21.ts';
import { blueprintAssetsKey, blueprintJsonKey, blueprintPdfKey } from '../src/api/blueprintStore.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const REAL_ORDER_ID = ${JSON.stringify(orderId)};
const SMOKE = ${JSON.stringify(SMOKE_PREFIX)};
const STRIPE_API = 'https://api.stripe.com/v1';
const FAILPOINT_FLAG = ${JSON.stringify(FAILPOINT_FLAG)};
const REAL_JSON_KEY = blueprintJsonKey(REAL_ORDER_ID);
const REAL_PDF_KEY = blueprintPdfKey(REAL_ORDER_ID);
const REAL_ZIP_KEY = blueprintAssetsKey(REAL_ORDER_ID);

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function objectSha256(object) {
  if (!object) return null;
  const digest = await crypto.subtle.digest('SHA-256', await object.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function readR2Hashes(env, keys) {
  const json = await objectSha256(await env.BLUEPRINTS.get(keys.json));
  const pdf = await objectSha256(await env.BLUEPRINTS.get(keys.pdf));
  const zip = await objectSha256(await env.BLUEPRINTS.get(keys.zip));
  return { jsonSha: json, pdfSha: pdf, zipSha: zip };
}
function orderKey(orderId) {
  return 'paid_test_order_' + orderId;
}
async function d1Count(env, orderId) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM launch_blueprints WHERE order_id = ?').bind(orderId).first();
  return Number(row && row.count || 0);
}
async function snapshotState(env) {
  const raw = await env.KV.get(orderKey(REAL_ORDER_ID));
  let order = null;
  try { order = raw ? JSON.parse(raw) : null; } catch {}
  const realRow = await env.DB.prepare('SELECT status, blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(REAL_ORDER_ID).first();
  return {
    realOrderKv: raw,
    realOrderStatus: order ? order.status : 'missing',
    realD1Status: realRow ? realRow.status : null,
    realD1BlueprintSha: realRow && typeof realRow.blueprint_json === 'string' ? await sha256(realRow.blueprint_json) : null,
    realR2: await readR2Hashes(env, { json: REAL_JSON_KEY, pdf: REAL_PDF_KEY, zip: REAL_ZIP_KEY })
  };
}
async function stripeState(env) {
  const key = text(env.STRIPE_SECRET_KEY || '');
  const raw = await env.KV.get(orderKey(REAL_ORDER_ID));
  let sessionId = null;
  try { sessionId = raw ? JSON.parse(raw).stripeCheckoutSessionId : null; } catch {}
  if (!key || !sessionId) return json({ error: 'stripe or session unavailable' }, 502);
  const sessionResponse = await fetch(STRIPE_API + '/checkout/sessions/' + encodeURIComponent(sessionId), {
    headers: { Authorization: 'Bearer ' + key }
  });
  const session = await sessionResponse.json();
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  let charges = [];
  if (paymentIntentId) {
    const chargesResponse = await fetch(STRIPE_API + '/charges?payment_intent=' + encodeURIComponent(paymentIntentId), {
      headers: { Authorization: 'Bearer ' + key }
    });
    const chargesBody = await chargesResponse.json();
    charges = Array.isArray(chargesBody.data) ? chargesBody.data.map(item => String(item.id || '')) : [];
  }
  return { sessionId, paymentIntentId, chargeCount: charges.length, chargeIds: charges.sort() };
}

let FIXTURE_STATE = null;
async function fixtureSetup(env, suffix) {
  const fixtureId = 'gtt_gate33_fixture_' + suffix;
  const fixtureEmail = 'roadmap-gate33-fixture-' + suffix + '@example.com';
  const realRow = await env.DB.prepare('SELECT blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(REAL_ORDER_ID).first();
  if (!realRow) return json({ error: 'real blueprint unavailable' }, 409);
  const realBlueprint = JSON.parse(realRow.blueprint_json);
  const fixtureBlueprint = JSON.parse(realRow.blueprint_json);
  fixtureBlueprint.orderId = fixtureId;
  fixtureBlueprint.ownerId = fixtureEmail;
  fixtureBlueprint.generationReceipt.artifactKeys = {
    pdf: blueprintPdfKey(fixtureId),
    json: blueprintJsonKey(fixtureId),
    zip: blueprintAssetsKey(fixtureId)
  };
  const fixtureResearchReceipt = JSON.parse(realRow.research_receipt_json);
  if (fixtureResearchReceipt.generationReceiptEvidence) {
    fixtureResearchReceipt.generationReceiptEvidence.artifactKeys = {
      pdf: blueprintPdfKey(fixtureId),
      json: blueprintJsonKey(fixtureId),
      zip: blueprintAssetsKey(fixtureId)
    };
  }
  const pdfBytes = await renderLaunchBlueprintPdfV21(fixtureBlueprint);
  const fixtureOrder = {
    orderId: fixtureId,
    email: fixtureEmail,
    verdictId: String(realBlueprint.sourceVerdictId || 'uxdxxt'),
    status: 'paid',
    artifactType: 'launch_blueprint_v2',
    planVersion: '2.0',
    intake: {
      verdictId: String(realBlueprint.sourceVerdictId || 'uxdxxt'),
      competitorSeeds: (realBlueprint.customerAccessPack && realBlueprint.customerAccessPack.seedDomains) || []
    },
    paidAt: new Date().toISOString(),
    stripeCheckoutSessionId: 'cs_test_gate33_fixture_' + suffix,
    stripeMode: 'test',
    stripeEventId: 'fixture_gate33_' + suffix,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await env.KV.put(orderKey(fixtureId), JSON.stringify(fixtureOrder));
  FIXTURE_STATE = {
    fixtureId,
    fixtureEmail,
    blueprint: fixtureBlueprint,
    researchReceipt: fixtureResearchReceipt,
    pdfBytes
  };
  return {
    fixtureId,
    fixtureEmail,
    canonicalJsonSha: await sha256(JSON.stringify(fixtureBlueprint, null, 2)),
    pdfSha: await sha256(pdfBytes),
    d1Count: await d1Count(env, fixtureId)
  };
}
async function persistAttempt(env) {
  if (!FIXTURE_STATE) return json({ error: 'fixture not set up' }, 409);
  try {
    const exactReceipt = await saveBlueprintRecordV21(
      env,
      FIXTURE_STATE.blueprint,
      FIXTURE_STATE.researchReceipt,
      FIXTURE_STATE.pdfBytes
    );
    const fixtureR2 = await readR2Hashes(env, {
      json: blueprintJsonKey(FIXTURE_STATE.fixtureId),
      pdf: blueprintPdfKey(FIXTURE_STATE.fixtureId),
      zip: blueprintAssetsKey(FIXTURE_STATE.fixtureId)
    });
    return {
      ok: true,
      d1Count: await d1Count(env, FIXTURE_STATE.fixtureId),
      fixtureR2,
      receiptHashes: exactReceipt.hashes
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error && error.message || error),
      d1Count: await d1Count(env, FIXTURE_STATE.fixtureId)
    };
  }
}
async function cleanup(env) {
  await env.KV.delete(FAILPOINT_FLAG);
  if (FIXTURE_STATE) {
    const id = FIXTURE_STATE.fixtureId;
    await env.BLUEPRINTS.delete(blueprintPdfKey(id)).catch(() => undefined);
    await env.BLUEPRINTS.delete(blueprintJsonKey(id)).catch(() => undefined);
    await env.BLUEPRINTS.delete(blueprintAssetsKey(id)).catch(() => undefined);
    await env.DB.prepare('DELETE FROM launch_blueprints WHERE order_id = ?').bind(id).run().catch(() => undefined);
    await env.KV.delete(orderKey(id));
    await env.KV.delete('paid_test_blueprint_pointer_' + id);
    await env.KV.delete('paid_test_blueprint_integrity_' + id);
  }
  return { ok: true, flagDeleted: (await env.KV.get(FAILPOINT_FLAG)) === null };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== SMOKE && !url.pathname.startsWith(SMOKE + '/')) {
      return app.fetch(request, env, ctx);
    }
    if (env.DEPLOYMENT_ENV !== 'acceptance') return json({ error: 'not acceptance' }, 404);
    if (request.headers.get('x-roadmap-acceptance-token') !== AUTH_TOKEN) return json({ error: 'unauthorized' }, 401);
    if (url.pathname === SMOKE + '/health') return json({ ok: true });
    if (url.pathname === SMOKE + '/snapshot') return json(await snapshotState(env));
    if (url.pathname === SMOKE + '/stripe') return json(await stripeState(env));
    if (url.pathname === SMOKE + '/failpoint/on' && request.method === 'POST') {
      await env.KV.put(FAILPOINT_FLAG, '1');
      return json({ ok: true, flag: (await env.KV.get(FAILPOINT_FLAG)) });
    }
    if (url.pathname === SMOKE + '/failpoint/off' && request.method === 'POST') {
      await env.KV.delete(FAILPOINT_FLAG);
      return json({ ok: true, flag: (await env.KV.get(FAILPOINT_FLAG)) });
    }
    if (url.pathname === SMOKE + '/fixture/setup' && request.method === 'POST') {
      const suffix = (await crypto.randomUUID()).slice(0, 8);
      return json(await fixtureSetup(env, suffix));
    }
    if (url.pathname === SMOKE + '/persist/attempt' && request.method === 'POST') {
      return json(await persistAttempt(env));
    }
    if (url.pathname === SMOKE + '/cleanup' && request.method === 'POST') {
      return json(await cleanup(env));
    }
    return json({ error: 'unknown smoke endpoint' }, 404);
  }
};`;
}

async function waitForSmoke(token) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const { response, body } = await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/health`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 33 smoke health');
    const stale = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (response.ok && body?.ok === true) return;
    if (!stale || attempt === 50) {
      throw new Error(`Gate 33 temporary Worker did not become healthy (attempt ${attempt}): HTTP ${response.status}.`);
    }
    await sleep(3000);
  }
  throw new Error('Gate 33 temporary Worker propagation retry exhausted.');
}

async function waitCanonicalRestored(token) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const { response } = await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/health`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 33 canonical restore health');
    if (response.status === 404) return;
    await sleep(3000);
  }
  throw new Error('Gate 33 canonical acceptance Worker did not return within the restore window.');
}

const { state, purchase, gate26, gate27 } = prerequisites();
const contract = sourceContract();
const focused = runVitest([
  'tests/blueprintAssetsV21.test.ts',
  'tests/blueprintDeliveryVerifierV21.test.ts',
  'tests/blueprintOwnershipV21.test.ts'
]);

if (existsSync(RECEIPT_PATH)) {
  const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate33-r2-failure-retry-receipt-v1'
    || receipt?.decision !== 'PASS'
    || receipt?.recovery?.accepted_artifacts_exact !== true
    || receipt?.restore?.acceptance_restored_verified !== true
    || receipt?.payment?.second_charge_occurred !== false) {
    throw new Error('Gate 33 existing receipt is incomplete; the live R2 failure window will not be replayed.');
  }
  if (state?.gates?.['33']?.status === 'PASS') {
    throw new Error('Gate 33 is already PASS; do not replay R2-failure evidence.');
  }
  console.log(JSON.stringify({
    ok: true,
    decision: 'PASS',
    replayed: false,
    reason: 'accepted Gate 33 receipt verified; live R2 failure window not replayed',
    receipt: '.roadmap-autopilot/gate33-r2-failure-retry-receipt.json',
    production_deployed: false,
    secret_values_recorded: false
  }));
  process.exit(0);
}

const orderId = purchase.order_id;
const token = randomBytes(32).toString('hex');
mkdirSync(STATE_DIR, { recursive: true });

let tempDeployed = false;
let baseline = null;
let stripeBefore = null;
let stripeAfter = null;
let fixtureInfo = null;
let failAttempts = null;
let recoveryOne = null;
let recoveryTwo = null;
let acceptedAfter = null;
let cleaned = null;
let smokeError = null;

try {
  writeFileSync(TEMP_ENTRY, tempWorkerSource(token, orderId), 'utf8');
  runWrangler(['deploy', TEMP_ENTRY, '--env', 'acceptance']);
  tempDeployed = true;
  await waitForSmoke(token);

  // Self-heal any prior interrupted run before the baseline check.
  await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/cleanup`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 self-heal cleanup');

  baseline = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 snapshot')).body;
  if (baseline?.realOrderStatus !== 'ready' || baseline?.realD1Status !== 'ready') {
    throw new Error(`Gate 33 requires the accepted order to be READY before the R2 failure window (got ${baseline?.realOrderStatus}/${baseline?.realD1Status}).`);
  }
  if (baseline?.realR2?.jsonSha !== gate27.artifacts.json.sha256
    || baseline?.realR2?.pdfSha !== gate27.artifacts.pdf.sha256
    || baseline?.realR2?.zipSha !== gate27.artifacts.zip.sha256) {
    throw new Error('Gate 33 accepted R2 artifacts no longer match the Gate 27 certified hashes.');
  }
  if (baseline?.realD1BlueprintSha !== gate26.canonical.canonical_blueprint_sha256) {
    throw new Error('Gate 33 accepted D1 Blueprint no longer matches the Gate 26 certified hash.');
  }
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify({ captured_at: now(), orderId, baseline }, null, 2)}\n`, 'utf8');

  stripeBefore = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/stripe`, {
    method: 'GET', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 stripe before')).body;
  if (stripeBefore?.chargeCount < 1) throw new Error('Gate 33 Stripe baseline is missing the accepted charge.');

  const fixture = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/fixture/setup`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 fixture setup')).body;
  if (!fixture?.fixtureId || fixture?.d1Count !== 0) {
    throw new Error('Gate 33 fixture setup did not produce an isolated order with zero D1 rows.');
  }
  fixtureInfo = fixture;
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify({ captured_at: now(), orderId, baseline, fixture }, null, 2)}\n`, 'utf8');

  await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/failpoint/on`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 failpoint on');

  // With the failpoint on, the persistence step must fail closed repeatedly
  // (bounded workflow retry would keep failing) without writing D1/R2 rows.
  failAttempts = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/persist/attempt`, {
      method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 33 fail attempt')).body;
    if (result?.ok !== false || !String(result?.error || '').includes('R2 persistence failure')) {
      throw new Error(`Gate 33 R2 failpoint did not fail closed (attempt ${attempt + 1}): ${result?.error || 'unexpected success'}.`);
    }
    if (result?.d1Count !== 0) throw new Error('Gate 33 failed persistence wrote a D1 row before R2 succeeded.');
    failAttempts.push({ ok: false, error: result.error, d1Count: result.d1Count });
  }

  await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/failpoint/off`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 failpoint off');

  recoveryOne = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/persist/attempt`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 recovery one')).body;
  if (recoveryOne?.ok !== true || recoveryOne?.d1Count !== 1) {
    throw new Error(`Gate 33 recovery did not persist exactly one order row (d1Count=${recoveryOne?.d1Count}).`);
  }
  if (!recoveryOne?.fixtureR2?.jsonSha || !recoveryOne?.fixtureR2?.pdfSha || !recoveryOne?.fixtureR2?.zipSha) {
    throw new Error('Gate 33 recovery did not write the fixture R2 artifacts.');
  }

  recoveryTwo = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/persist/attempt`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 recovery two')).body;
  if (recoveryTwo?.ok !== true || recoveryTwo?.d1Count !== 1) {
    throw new Error(`Gate 33 repeated recovery created a duplicate order row (d1Count=${recoveryTwo?.d1Count}).`);
  }
  if (recoveryTwo?.fixtureR2?.jsonSha !== recoveryOne?.fixtureR2?.jsonSha
    || recoveryTwo?.fixtureR2?.pdfSha !== recoveryOne?.fixtureR2?.pdfSha
    || recoveryTwo?.fixtureR2?.zipSha !== recoveryOne?.fixtureR2?.zipSha
    || JSON.stringify(recoveryTwo?.receiptHashes) !== JSON.stringify(recoveryOne?.receiptHashes)) {
    throw new Error('Gate 33 repeated recovery produced non-identical artifact bytes; persistence is not idempotent-exact.');
  }

  stripeAfter = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/stripe`, {
    method: 'GET', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 stripe after')).body;
  if (stripeAfter?.chargeCount !== stripeBefore?.chargeCount
    || JSON.stringify(stripeAfter?.chargeIds) !== JSON.stringify(stripeBefore?.chargeIds)) {
    throw new Error('Gate 33 detected a second Stripe charge during the R2 recovery window.');
  }

  acceptedAfter = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 accepted after')).body;
  if (acceptedAfter?.realR2?.jsonSha !== baseline?.realR2?.jsonSha
    || acceptedAfter?.realR2?.pdfSha !== baseline?.realR2?.pdfSha
    || acceptedAfter?.realR2?.zipSha !== baseline?.realR2?.zipSha
    || acceptedAfter?.realD1BlueprintSha !== baseline?.realD1BlueprintSha) {
    throw new Error('Gate 33 recovery mutated the accepted D1/R2 artifacts; accepted bytes must remain exact.');
  }

  cleaned = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/cleanup`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 33 cleanup')).body;
  if (cleaned?.ok !== true || cleaned?.flagDeleted !== true) {
    throw new Error('Gate 33 cleanup did not remove the fixture and the R2 failpoint flag.');
  }
} catch (error) {
  smokeError = error;
} finally {
  if (tempDeployed) {
    try {
      await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/cleanup`, {
        method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
      }, 'Gate 33 emergency cleanup');
    } catch {}
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (tempDeployed) {
    runWrangler(['deploy', '--env', 'acceptance']);
  }
}

if (smokeError) {
  throw new Error(`Gate 33 live R2 failure window failed; acceptance was restored and cleaned (${SNAPSHOT_PATH}).\n${smokeError instanceof Error ? smokeError.message : String(smokeError)}`);
}

await waitCanonicalRestored(token);

let finalIntegrity = null;
let bridgeAttempts = 0;
let bridgeError = null;
while (!finalIntegrity && bridgeAttempts < 3) {
  bridgeAttempts += 1;
  try {
    await withAcceptanceDataBindings(async client => {
      const snapshot = await client.snapshot(orderId);
      if (!snapshot?.hashes) throw new Error('Gate 33 post-restore acceptance snapshot could not be read.');
      finalIntegrity = {
        json_sha256: snapshot.hashes.json,
        pdf_sha256: snapshot.hashes.pdf,
        zip_sha256: snapshot.hashes.zip,
        blueprint_sha256: snapshot.blueprintJson ? sha256(Buffer.from(snapshot.blueprintJson, 'utf8')) : null
      };
    });
  } catch (error) {
    bridgeError = error;
    if (bridgeAttempts < 3) await sleep(10000);
  }
}
if (!finalIntegrity) {
  throw new Error(`Gate 33 post-restore acceptance snapshot could not be read after ${bridgeAttempts} bridge attempts.\n${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
}
if (finalIntegrity.json_sha256 !== gate27.artifacts.json.sha256
  || finalIntegrity.pdf_sha256 !== gate27.artifacts.pdf.sha256
  || finalIntegrity.zip_sha256 !== gate27.artifacts.zip.sha256
  || finalIntegrity.blueprint_sha256 !== gate26.canonical.canonical_blueprint_sha256) {
  throw new Error('Gate 33 post-restore D1/R2 artifact hashes no longer match the accepted Gate 26/27 evidence.');
}

const receipt = {
  schema_version: 'roadmap-gate33-r2-failure-retry-receipt-v1',
  verified_at: now(),
  environment: 'acceptance',
  gate: { id: 33, phase: 9, slug: 'r2-failure-retry', title: 'Force R2 failure and prove persistence recovery without duplicate order/charge' },
  order_id_sha256: sha256(Buffer.from(orderId, 'utf8')),
  checkout_session_id_sha256: sha256(Buffer.from(stripeBefore.sessionId, 'utf8')),
  fixture_order_id_sha256: fixtureInfo?.fixtureId ? sha256(Buffer.from(fixtureInfo.fixtureId, 'utf8')) : null,
  r2_failure: {
    forced_mechanism: 'acceptance KV flag roadmap_gate33_force_r2_failure gated by DEPLOYMENT_ENV=acceptance in saveBlueprintRecordV21',
    fail_closed_attempts: failAttempts?.length,
    d1_rows_after_failed_attempts: failAttempts?.map(attempt => attempt.d1Count),
    ready_never_reached_during_failure: true
  },
  recovery: {
    recovery_one_d1_rows: recoveryOne?.d1Count,
    recovery_two_d1_rows: recoveryTwo?.d1Count,
    duplicate_order_row_created: false,
    artifact_bytes_identical_across_recovery: JSON.stringify(recoveryOne?.fixtureR2) === JSON.stringify(recoveryTwo?.fixtureR2),
    fixture_json_sha256: recoveryOne?.fixtureR2?.jsonSha,
    fixture_pdf_sha256: recoveryOne?.fixtureR2?.pdfSha,
    fixture_zip_sha256: recoveryOne?.fixtureR2?.zipSha,
    persistence_retry_bounded: 'workflow step.do limit 3 (source contract) + Gate 32 live bounded-retry proof',
    accepted_artifacts_exact: true
  },
  payment: {
    second_charge_occurred: false,
    charges_before: stripeBefore?.chargeCount,
    charges_after: stripeAfter?.chargeCount,
    charge_ids_identical: JSON.stringify(stripeBefore?.chargeIds) === JSON.stringify(stripeAfter?.chargeIds),
    checkout_replayed: false,
    purchase_replayed: false
  },
  restore: {
    fixture_cleaned: cleaned?.ok === true,
    failpoint_flag_removed: cleaned?.flagDeleted === true,
    canonical_worker_redeployed: true,
    accepted_d1_hash_matches_gate26: finalIntegrity.blueprint_sha256 === gate26.canonical.canonical_blueprint_sha256,
    accepted_r2_hashes_match_gate27: finalIntegrity.json_sha256 === gate27.artifacts.json.sha256
      && finalIntegrity.pdf_sha256 === gate27.artifacts.pdf.sha256
      && finalIntegrity.zip_sha256 === gate27.artifacts.zip.sha256,
    acceptance_restored_verified: true
  },
  mutation_scope: 'acceptance',
  temporary_acceptance_mutations: 'isolated fixture order KV + fixture R2 objects + fixture D1 row + failpoint KV flag (all removed); temporary Worker entry (deployed then replaced)',
  production_deployed: false,
  secret_values_recorded: false,
  token_values_recorded: false,
  research_replayed: false,
  vertex_generation_replayed: false,
  gate28_rematerialization_reused: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
rmSync(SNAPSHOT_PATH, { force: true });
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  environment: 'acceptance',
  forced_r2_failure: true,
  fail_closed: true,
  duplicate_order_created: false,
  second_charge_occurred: false,
  accepted_artifacts_exact: true,
  fixture_cleaned: true,
  failpoint_removed: true,
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate33-r2-failure-retry-receipt.json'
}));
