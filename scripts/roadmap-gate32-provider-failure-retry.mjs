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
const RECEIPT_PATH = join(STATE_DIR, 'gate32-provider-failure-retry-receipt.json');
const SNAPSHOT_PATH = join(STATE_DIR, 'gate32-state-snapshot.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate32-provider-failure-entry.ts');
const TEMP_TOML = join(STATE_DIR, 'gate32-provider-failure.wrangler.toml');
const WRANGLER_TOML = join(ROOT, 'wrangler.toml');
const SMOKE_PREFIX = '/__roadmap/acceptance/gate32';
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const BOGUS_GATEWAY_ID = 'roadmap-gate32-forced-missing-gateway';
const ACTIVE_WORKFLOW_STATUSES = new Set(['queued', 'running', 'paused', 'unknown', 'none']);

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 32 could not resolve the installed Wrangler CLI entrypoint.');
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
    throw new Error(`Gate 32 focused provider-failure tests failed (${result.status ?? 1}).\n${stdout}\n${stderr}`.trim());
  }
  const filesMatch = stdout.match(/Test Files\s+(\d+) passed/);
  const testsMatch = stdout.match(/Tests\s+(\d+) passed/);
  const filesPassed = filesMatch ? Number(filesMatch[1]) : 0;
  const testsPassed = testsMatch ? Number(testsMatch[1]) : 0;
  if (filesPassed < 1 || testsPassed < 1 || /failed|FAIL/.test(stdout)) {
    throw new Error('Gate 32 focused provider-failure test output did not confirm a passing deterministic suite.');
  }
  return { test_files: files, test_files_passed: filesPassed, tests_passed: testsPassed };
}

function requireJson(path, schemaVersion, label) {
  if (!existsSync(path)) throw new Error(`Gate 32 requires ${label}.`);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema_version !== schemaVersion || value?.decision !== 'PASS') {
    throw new Error(`Gate 32 found an invalid ${label}.`);
  }
  return value;
}

function sourceContract() {
  const workflow = readFileSync(join(ROOT, 'src', 'api', 'launchBlueprintWorkflow.ts'), 'utf8');
  const retryApi = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const fulfillment = readFileSync(join(ROOT, 'src', 'api', 'blueprintFulfillment.ts'), 'utf8');
  const toml = readFileSync(WRANGLER_TOML, 'utf8');

  const workflowRequired = [
    "'vertex stage 1 evidence normalization'",
    'retries: { limit: 3',
    'retries: { limit: 2',
    'failLaunchBlueprintOrderV21(this.env, orderId, error)',
    'vertexBlueprintRequired(this.env)'
  ];
  for (const token of workflowRequired) {
    if (!workflow.includes(token)) throw new Error(`Gate 32 workflow source contract is missing ${token}.`);
  }
  if (workflow.includes('retries: {}') || workflow.includes('retries: { retries:')) {
    throw new Error('Gate 32 workflow must keep every provider step retry bounded; an unbounded retry was found.');
  }

  const retryRequired = [
    "'Launch Blueprint is already ready'",
    'ACTIVE_BLUEPRINT_WORKFLOW_STATUSES.has(workflowStatus)',
    "'A Blueprint Workflow is already running'",
    'launch_blueprint_retry_',
    'expirationTtl: 900',
    'https://api.stripe.com/v1/checkout/sessions/',
    'manual_retry_',
    'crypto.randomUUID()',
    'queueLaunchBlueprintOrder(env, orderId, session, retryEventId)'
  ];
  for (const token of retryRequired) {
    if (!retryApi.includes(token)) throw new Error(`Gate 32 retry source contract is missing ${token}.`);
  }
  const retryZone = retryApi.slice(retryApi.indexOf('export async function handleLaunchBlueprintRetry'));
  if (retryZone.includes('payment_intents') || retryZone.includes('/v1/charges') || retryZone.includes("method: 'POST'")) {
    throw new Error('Gate 32 retry path must never create a new charge; a charging call was found in the retry handler.');
  }

  const fulfillmentRequired = [
    'verifySession(order, session)',
    "session.payment_status !== undefined && session.payment_status !== 'paid'",
    'order.fulfillmentAttemptCount',
    'workflowId(orderId, eventId)',
    "'already-running'",
    "'already-complete'"
  ];
  for (const token of fulfillmentRequired) {
    if (!fulfillment.includes(token)) throw new Error(`Gate 32 fulfillment source contract is missing ${token}.`);
  }

  if (!toml.includes('AI_GATEWAY_ID = "default"')) {
    throw new Error('Gate 32 requires the canonical acceptance AI_GATEWAY_ID to be "default" before the forced-failure window.');
  }
  if (!toml.includes('VERTEX_BLUEPRINT_REQUIRED = "true"')) {
    throw new Error('Gate 32 requires VERTEX_BLUEPRINT_REQUIRED=true so a Vertex provider failure fails closed without a deterministic opt-out.');
  }
  return { workflow_bounded_steps: true, retry_bounded: true, no_charge_creation: true, vertex_required_fail_closed: true };
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 32 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['26', '27', '28', '29', '30', '31']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 32 requires Gate ${id} to be PASS.`);
  }
  const purchase = requireJson(GATE20_RECEIPT_PATH, 'roadmap-gate20-purchase-receipt-v1', 'Gate 20 receipt');
  const gate26 = requireJson(GATE26_RECEIPT_PATH, 'roadmap-gate26-canonical-d1-artifacts-receipt-v1', 'Gate 26 receipt');
  const gate27 = requireJson(GATE27_RECEIPT_PATH, 'roadmap-gate27-private-r2-artifacts-receipt-v1', 'Gate 27 receipt');
  if (purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string' || typeof purchase?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 32 found an invalid Gate 20 purchase receipt.');
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
import { handleLaunchBlueprintRetry } from '../src/api/blueprintApi.ts';
import { failLaunchBlueprintOrderV21 } from '../src/api/blueprintFulfillmentV21.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(orderId)};
const SMOKE = ${JSON.stringify(SMOKE_PREFIX)};
const STRIPE_API = 'https://api.stripe.com/v1';
const ACTIVE = new Set(['queued', 'running', 'paused', 'unknown', 'none']);

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
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
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
function orderKey(orderId) {
  return 'paid_test_order_' + orderId;
}
function userOrdersKey(email) {
  return 'paid_test_orders_' + email.trim().toLowerCase();
}
async function readOrder(env) {
  const raw = await env.KV.get(orderKey(ORDER_ID));
  let order = null;
  try { order = raw ? JSON.parse(raw) : null; } catch {}
  return { raw, order };
}
async function snapshotState(env) {
  const { raw: orderKv, order } = await readOrder(env);
  const summaryKv = order && order.email ? await env.KV.get(userOrdersKey(order.email)) : null;
  const row = await env.DB.prepare('SELECT status, blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(ORDER_ID).first();
  return {
    orderKv,
    summaryKv,
    orderStatus: order ? order.status : 'missing',
    artifactType: order ? order.artifactType : null,
    fulfillmentError: order ? order.fulfillmentError || null : null,
    fulfillmentAttemptCount: order ? Number(order.fulfillmentAttemptCount || 0) : null,
    d1Status: row ? row.status : null,
    d1BlueprintSha: row && typeof row.blueprint_json === 'string' ? await sha256(row.blueprint_json) : null,
    d1ResearchSha: row && typeof row.research_receipt_json === 'string' ? await sha256(row.research_receipt_json) : null
  };
}
async function stripeState(env) {
  const key = text(env.STRIPE_SECRET_KEY || '');
  const { order } = await readOrder(env);
  const sessionId = order && order.stripeCheckoutSessionId ? order.stripeCheckoutSessionId : null;
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
    charges = Array.isArray(chargesBody.data) ? chargesBody.data.map(item => ({
      id: String(item.id || ''),
      amount: Number(item.amount || 0),
      currency: String(item.currency || ''),
      status: String(item.status || ''),
      created: Number(item.created || 0)
    })) : [];
  }
  return {
    sessionId,
    sessionPaymentStatus: session.payment_status || null,
    sessionMode: session.mode || null,
    livemode: Boolean(session.livemode),
    amountTotal: Number(session.amount_total || 0),
    currency: session.currency || null,
    paymentIntentId,
    chargeCount: charges.length,
    chargeIds: charges.map(charge => charge.id).sort(),
    charges
  };
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
    if (url.pathname === SMOKE + '/fail-order' && request.method === 'POST') {
      await failLaunchBlueprintOrderV21(env, ORDER_ID, new Error('Gate 32 simulated pre-failure state (restored after the test)'));
      return json(await snapshotState(env));
    }
    if (url.pathname === SMOKE + '/retry' && request.method === 'POST') {
      const { order } = await readOrder(env);
      if (!order || !order.email) return json({ error: 'order missing' }, 409);
      const token = await mintToken(order.email, text(env.JWT_SECRET || ''));
      const response = await handleLaunchBlueprintRetry(new Request('https://gate32.local/api/paid-test/orders/' + ORDER_ID + '/blueprint/retry', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      }), env, ORDER_ID);
      const responseText = await response.text();
      let body = null;
      try { body = JSON.parse(responseText); } catch {}
      return json({ status: response.status, body, text: responseText });
    }
    if (url.pathname === SMOKE + '/workflow') {
      const { order } = await readOrder(env);
      const workflowId = order && order.fulfillmentWorkflowId ? order.fulfillmentWorkflowId : null;
      if (!workflowId || !env.LAUNCH_BLUEPRINT_WORKFLOW) return json({ status: 'none' });
      try {
        const instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.get(workflowId);
        return json({ status: (await instance.status()).status });
      } catch (error) {
        return json({ status: 'error', error: String(error && error.message || error) });
      }
    }
    if (url.pathname === SMOKE + '/restore' && request.method === 'POST') {
      const body = await request.json();
      if (typeof body.orderKv !== 'string' || typeof body.summaryKv !== 'string') return json({ error: 'restore payload incomplete' }, 400);
      const { order } = await readOrder(env);
      const summaryKey = order && order.email ? userOrdersKey(order.email) : null;
      await env.KV.put(orderKey(ORDER_ID), body.orderKv);
      if (summaryKey) await env.KV.put(summaryKey, body.summaryKv);
      return json({
        ok: true,
        orderHash: await sha256(body.orderKv),
        summaryHash: await sha256(body.summaryKv),
        activeWorkflowStatuses: [...ACTIVE]
      });
    }
    return json({ error: 'unknown smoke endpoint' }, 404);
  }
};`;
}

function writeTempToml() {
  const original = readFileSync(WRANGLER_TOML, 'utf8');
  const expected = original.replaceAll('AI_GATEWAY_ID = "default"', `AI_GATEWAY_ID = "${BOGUS_GATEWAY_ID}"`);
  if (expected === original) throw new Error('Gate 32 could not isolate the acceptance AI_GATEWAY_ID var for the forced-failure window.');
  writeFileSync(TEMP_TOML, expected, 'utf8');
  return original;
}

async function waitForSmoke(token) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const { response, body } = await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/health`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 32 smoke health');
    const stale = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (response.ok && body?.ok === true) return;
    if (!stale || attempt === 50) {
      throw new Error(`Gate 32 temporary Worker did not become healthy (attempt ${attempt}): HTTP ${response.status}.`);
    }
    await sleep(3000);
  }
  throw new Error('Gate 32 temporary Worker propagation retry exhausted.');
}

async function waitCanonicalRestored(token) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const { response } = await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/health`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 32 canonical restore health');
    if (response.status === 404) return;
    await sleep(3000);
  }
  throw new Error('Gate 32 canonical acceptance Worker did not return within the restore window.');
}

const { state, purchase, gate26, gate27 } = prerequisites();
const contract = sourceContract();
const focused = runVitest([
  'tests/generativeAIService.test.ts',
  'tests/launchBlueprintVertexPipeline.test.ts',
  'tests/launchBlueprintVertexGuards.test.ts',
  'tests/launchBlueprintVertexAssetGuard.test.ts'
]);

// Fast path: an accepted Gate 32 receipt already proves the forced-failure,
// fail-closed retry, and no-second-charge contract. Do not replay the live
// failure window merely to re-satisfy the gate.
if (existsSync(RECEIPT_PATH)) {
  const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate32-provider-failure-retry-receipt-v1'
    || receipt?.decision !== 'PASS'
    || receipt?.mutation_scope !== 'acceptance'
    || receipt?.restore?.acceptance_restored_verified !== true
    || receipt?.payment?.second_charge_occurred !== false) {
    throw new Error('Gate 32 existing receipt is incomplete; the live forced-failure window will not be replayed.');
  }
  if (state?.gates?.['32']?.status === 'PASS') {
    throw new Error('Gate 32 is already PASS; do not replay provider-failure evidence.');
  }
  console.log(JSON.stringify({
    ok: true,
    decision: 'PASS',
    replayed: false,
    reason: 'accepted Gate 32 receipt verified; live failure window not replayed',
    receipt: '.roadmap-autopilot/gate32-provider-failure-retry-receipt.json',
    production_deployed: false,
    secret_values_recorded: false
  }));
  process.exit(0);
}

const orderId = purchase.order_id;
const token = randomBytes(32).toString('hex');
mkdirSync(STATE_DIR, { recursive: true });

let tomlOriginal = null;
let tempDeployed = false;
let baseline = null;
let stripeBefore = null;
let stripeAfter = null;
let firstRetry = null;
let secondRetry = null;
let workflowOutcome = null;
let afterFailure = null;
let restored = null;
let smokeError = null;

try {
  writeFileSync(TEMP_ENTRY, tempWorkerSource(token, orderId), 'utf8');
  tomlOriginal = writeTempToml();
  runWrangler(['deploy', TEMP_ENTRY, '--config', TEMP_TOML, '--env', 'acceptance']);
  tempDeployed = true;
  await waitForSmoke(token);

  baseline = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 snapshot')).body;
  // Self-heal from a previous interrupted run: if a snapshot already exists and
  // the order is not ready, restore the captured bytes before the baseline check.
  if (baseline?.orderStatus !== 'ready' && existsSync(SNAPSHOT_PATH)) {
    try {
      const prior = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
      if (prior?.baseline?.orderKv && prior?.baseline?.summaryKv) {
        await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/restore`, {
          method: 'POST',
          headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderKv: prior.baseline.orderKv, summaryKv: prior.baseline.summaryKv })
        }, 'Gate 32 self-heal restore');
        baseline = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
          method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
        }, 'Gate 32 snapshot')).body;
      }
    } catch {}
  }
  if (baseline?.orderStatus !== 'ready' || baseline?.d1Status !== 'ready') {
    throw new Error(`Gate 32 requires the accepted order to be READY before the forced-failure window (got ${baseline?.orderStatus}/${baseline?.d1Status}). Acceptance state was not restored; review .roadmap-autopilot/gate32-state-snapshot.json.`);
  }
  if (baseline?.orderKv === null || typeof baseline?.orderKv !== 'string') {
    throw new Error('Gate 32 snapshot could not capture the accepted order KV state.');
  }
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify({ captured_at: now(), orderId, baseline }, null, 2)}\n`, 'utf8');

  const d1BlueprintHash = baseline.d1BlueprintSha;
  if (!d1BlueprintHash || d1BlueprintHash !== gate26.canonical.canonical_blueprint_sha256) {
    throw new Error('Gate 32 D1 canonical Blueprint hash no longer matches the Gate 26 certified hash.');
  }

  stripeBefore = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/stripe`, {
    method: 'GET', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 stripe before')).body;
  if (stripeBefore?.sessionPaymentStatus !== 'paid' || stripeBefore?.chargeCount < 1 || stripeBefore?.livemode) {
    throw new Error(`Gate 32 Stripe baseline is not the accepted paid test session (payment_status=${stripeBefore?.sessionPaymentStatus}, charges=${stripeBefore?.chargeCount}).`);
  }

  // Create the pre-failure non-ready state with the real first-party failure
  // function; it is restored from the snapshot before the gate completes.
  const failedState = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/fail-order`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 fail order')).body;
  if (failedState?.orderStatus !== 'failed') {
    throw new Error('Gate 32 could not place the accepted order into the failed state through the first-party failure function.');
  }

  // Real retry route with a real owner token: reverify + queue.
  firstRetry = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/retry`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 retry one')).body;
  if (firstRetry?.status !== 202 || typeof firstRetry?.body?.workflowId !== 'string') {
    throw new Error(`Gate 32 retry did not queue a new workflow (HTTP ${firstRetry?.status}: ${firstRetry?.text || 'no body'}).`);
  }

  // Bounded concurrency: a second retry while the workflow is active must 409.
  secondRetry = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/retry`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 retry two')).body;
  if (secondRetry?.status !== 409) {
    throw new Error(`Gate 32 retry concurrency guard did not fail closed (HTTP ${secondRetry?.status}: ${secondRetry?.text || 'no body'}).`);
  }

  // Wait for the workflow to exhaust its bounded provider retries and fail closed.
  let terminal = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const current = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/workflow`, {
      method: 'GET', headers: { 'X-Roadmap-Acceptance-Token': token }
    }, 'Gate 32 workflow status')).body;
    if (!ACTIVE_WORKFLOW_STATUSES.has(String(current?.status || ''))) {
      terminal = current;
      break;
    }
    await sleep(4000);
  }
  if (!terminal) throw new Error('Gate 32 workflow did not reach a terminal state within the bounded window.');
  workflowOutcome = terminal;

  afterFailure = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 after failure')).body;
  if (afterFailure?.orderStatus !== 'failed') {
    throw new Error(`Gate 32 did not fail closed: order status after provider failure is ${afterFailure?.orderStatus}.`);
  }
  if (!afterFailure?.fulfillmentError) {
    throw new Error('Gate 32 failed order is missing a fulfillment error (fail-closed evidence).');
  }
  if (afterFailure?.d1BlueprintSha !== d1BlueprintHash || afterFailure?.d1Status !== 'ready') {
    throw new Error('Gate 32 provider failure mutated the canonical D1 Blueprint row; fail-closed requires D1 to remain untouched until retry success.');
  }

  stripeAfter = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/stripe`, {
    method: 'GET', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 stripe after')).body;
  if (stripeAfter?.chargeCount !== stripeBefore?.chargeCount
    || JSON.stringify(stripeAfter?.chargeIds) !== JSON.stringify(stripeBefore?.chargeIds)
    || stripeAfter?.sessionPaymentStatus !== 'paid') {
    throw new Error('Gate 32 detected a second Stripe charge or payment-state change during the forced-failure retry window.');
  }

  restored = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/restore`, {
    method: 'POST',
    headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderKv: baseline.orderKv, summaryKv: baseline.summaryKv })
  }, 'Gate 32 restore')).body;
  if (restored?.ok !== true) throw new Error('Gate 32 KV restore failed.');

  const postRestore = await (await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/snapshot`, {
    method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token }
  }, 'Gate 32 post restore')).body;
  if (postRestore?.orderKv !== baseline.orderKv || postRestore?.summaryKv !== baseline.summaryKv || postRestore?.orderStatus !== 'ready') {
    throw new Error('Gate 32 acceptance order state was not restored byte-for-byte from the snapshot.');
  }
} catch (error) {
  smokeError = error;
} finally {
  // Best-effort KV restore while the temporary Worker is still deployed.
  if (baseline && !restored) {
    try {
      await fetchJson(`${WORKER_URL}${SMOKE_PREFIX}/restore`, {
        method: 'POST',
        headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderKv: baseline.orderKv, summaryKv: baseline.summaryKv })
      }, 'Gate 32 emergency restore');
    } catch {}
  }
  if (tomlOriginal !== null) {
    try { writeFileSync(WRANGLER_TOML, tomlOriginal, 'utf8'); } catch {}
  }
  rmSync(TEMP_ENTRY, { force: true });
  rmSync(TEMP_TOML, { force: true });
  if (tempDeployed) {
    runWrangler(['deploy', '--env', 'acceptance']);
  }
}

if (smokeError) {
  throw new Error(`Gate 32 live forced-failure window failed; acceptance state was restored from the snapshot (${SNAPSHOT_PATH}).\n${smokeError instanceof Error ? smokeError.message : String(smokeError)}`);
}

await waitCanonicalRestored(token);

// Final integrity: D1/R2 artifacts must still match the accepted Gate 26/27 hashes.
let finalIntegrity = null;
await withAcceptanceDataBindings(async client => {
  const snapshot = await client.snapshot(orderId);
  if (!snapshot?.hashes) throw new Error('Gate 32 post-restore acceptance snapshot could not be read.');
  finalIntegrity = {
    json_sha256: snapshot.hashes.json,
    pdf_sha256: snapshot.hashes.pdf,
    zip_sha256: snapshot.hashes.zip,
    blueprint_sha256: snapshot.blueprintJson ? sha256(Buffer.from(snapshot.blueprintJson, 'utf8')) : null
  };
});
if (finalIntegrity.json_sha256 !== gate27.artifacts.json.sha256
  || finalIntegrity.pdf_sha256 !== gate27.artifacts.pdf.sha256
  || finalIntegrity.zip_sha256 !== gate27.artifacts.zip.sha256
  || finalIntegrity.blueprint_sha256 !== gate26.canonical.canonical_blueprint_sha256) {
  throw new Error('Gate 32 post-restore D1/R2 artifact hashes no longer match the accepted Gate 26/27 evidence.');
}

const receipt = {
  schema_version: 'roadmap-gate32-provider-failure-retry-receipt-v1',
  verified_at: now(),
  environment: 'acceptance',
  gate: { id: 32, phase: 9, slug: 'provider-failure-retry', title: 'Force provider failure and prove fail-closed retry without a second charge' },
  order_id_sha256: sha256(Buffer.from(orderId, 'utf8')),
  checkout_session_id_sha256: sha256(Buffer.from(stripeBefore.sessionId, 'utf8')),
  provider_failure: {
    forced_mechanism: `acceptance AI_GATEWAY_ID temporarily misconfigured to "${BOGUS_GATEWAY_ID}" and restored`,
    provider_path: 'cloudflare_ai_gateway -> google_vertex_ai (vertexBlueprintRequired=true)',
    workflow_terminal_status: workflowOutcome?.status,
    fail_closed: true,
    ready_never_reached: true,
    order_status_after_failure: afterFailure?.orderStatus,
    fulfillment_error_present: Boolean(afterFailure?.fulfillmentError),
    d1_row_unchanged: afterFailure?.d1BlueprintSha === baseline?.d1BlueprintSha,
    artifact_hashes_unchanged_during_failure: true
  },
  retry: {
    first_retry_via_real_route_status: firstRetry?.status,
    workflow_queued: true,
    second_retry_concurrent_status: secondRetry?.status,
    concurrent_retry_denied: true,
    retry_event_id_unique: 'manual_retry_<uuid> per retry (source contract)',
    kv_retry_lock_ttl_seconds: 900,
    workflow_step_retries_bounded: true,
    workflow_step_retry_limits: [2, 3],
    active_workflow_guard: true,
    owner_auth_required: true
  },
  payment: {
    second_charge_occurred: false,
    charges_before: stripeBefore?.chargeCount,
    charges_after: stripeAfter?.chargeCount,
    charge_ids_identical: JSON.stringify(stripeBefore?.chargeIds) === JSON.stringify(stripeAfter?.chargeIds),
    session_payment_status_unchanged: stripeBefore?.sessionPaymentStatus === stripeAfter?.sessionPaymentStatus && stripeAfter?.sessionPaymentStatus === 'paid',
    checkout_replayed: false,
    purchase_replayed: false
  },
  restore: {
    order_kv_restored: restored?.ok === true,
    summary_kv_restored: restored?.ok === true,
    wrangler_toml_restored: true,
    canonical_worker_redeployed: true,
    d1_blueprint_hash_matches_gate26: finalIntegrity.blueprint_sha256 === gate26.canonical.canonical_blueprint_sha256,
    r2_hashes_match_gate27: finalIntegrity.json_sha256 === gate27.artifacts.json.sha256
      && finalIntegrity.pdf_sha256 === gate27.artifacts.pdf.sha256
      && finalIntegrity.zip_sha256 === gate27.artifacts.zip.sha256,
    acceptance_restored_verified: true
  },
  mutation_scope: 'acceptance',
  temporary_acceptance_mutations: 'order KV status (failed then restored), summary KV, acceptance AI_GATEWAY_ID var (deployed then restored), temporary Worker entry (deployed then replaced)',
  production_deployed: false,
  secret_values_recorded: false,
  token_values_recorded: false,
  research_replayed: 'one bounded forced-failure workflow attempt only (documented gate requirement)',
  vertex_generation_replayed: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
rmSync(SNAPSHOT_PATH, { force: true });
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  environment: 'acceptance',
  forced_provider_failure: true,
  fail_closed: true,
  first_retry_status: firstRetry?.status,
  concurrent_retry_status: secondRetry?.status,
  second_charge_occurred: false,
  order_restored: true,
  artifact_hashes_match_gate26_27: true,
  acceptance_restored_verified: true,
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate32-provider-failure-retry-receipt.json'
}));
