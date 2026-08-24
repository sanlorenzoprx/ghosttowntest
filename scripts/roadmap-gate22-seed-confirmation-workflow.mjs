#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE22_RECEIPT_PATH = join(STATE_DIR, 'gate22-seed-confirmation-workflow.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate22-seed-confirmation-workflow-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate22-seed-confirmation-workflow';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function runWrangler(args) {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`wrangler ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 22 requires the existing Gate 20 purchase receipt; no new purchase will be created.');
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || receipt?.stripe_mode !== 'test'
    || typeof receipt?.order_id !== 'string' || typeof receipt?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 20 purchase receipt is incomplete.');
  }
  return receipt;
}

function assertPriorGatesAndSeedContract() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 22 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['21']?.status !== 'PASS') throw new Error('Gate 22 requires Gate 21 to be PASS.');
  const seeds = readFileSync(join(ROOT, 'src', 'api', 'blueprintSeeds.ts'), 'utf8');
  const fulfillment = readFileSync(join(ROOT, 'src', 'api', 'blueprintFulfillment.ts'), 'utf8');
  const retry = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const required = [
    "body.seeds.length < 2 || body.seeds.length > 3",
    "new Set(domains).size !== domains.length",
    'Each seed needs a reachable public HTTPS website',
    'await startLaunchBlueprintWorkflow(env, orderId)',
    'if (!hasConfirmedSeeds(order))',
    'const retryEventId = `manual_retry_${crypto.randomUUID()}`',
    'launch_blueprint_retry_${orderId}'
  ];
  if (required.some(pattern => !(seeds + fulfillment + retry).includes(pattern))) {
    throw new Error('Gate 22 first-party seed validation/workflow contract no longer matches the governing acceptance semantics.');
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' }); } finally { clearTimeout(timer); }
}

function sleep(ms) { return new Promise(resolvePromise => setTimeout(resolvePromise, ms)); }

async function postWithPropagationRetry(token) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, { method: 'POST', headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' }, body: '{}' });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const staleTemporaryWorker = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (!staleTemporaryWorker || attempt === 8) return { response, body };
    console.log(`Gate 22 temporary Worker not propagated yet; retrying ${attempt}/8...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 22 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token, receipt) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(receipt.order_id)};
const CHECKOUT_SESSION_ID = ${JSON.stringify(receipt.stripe_checkout_session_id)};
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
async function verifyGate22(env) {
  const raw = await env.KV.get('paid_test_order_' + ORDER_ID);
  let order = null;
  try { order = raw ? JSON.parse(raw) : null; } catch {}
  if (!order || order.orderId !== ORDER_ID || order.stripeCheckoutSessionId !== CHECKOUT_SESSION_ID || !order.paidAt) {
    return json({ ok: false, error: 'Durable paid order is missing or does not match the accepted Checkout Session' }, 409);
  }
  const seeds = Array.isArray(order.intake?.competitorSeeds) ? order.intake.competitorSeeds : [];
  const domains = seeds.map(seed => String(seed?.domain || '').trim().toLowerCase()).filter(Boolean);
  const paidAt = Date.parse(order.paidAt);
  const validSeeds = domains.length >= 2 && domains.length <= 3 && new Set(domains).size === domains.length
    && seeds.every(seed => String(seed?.website || '').startsWith('https://') && Number.isFinite(Date.parse(String(seed?.verifiedAt || ''))) && Date.parse(String(seed.verifiedAt)) >= paidAt);
  const fulfillmentAttemptCount = Number(order.fulfillmentAttemptCount || 0);
  if (!validSeeds || !order.fulfillmentWorkflowId || fulfillmentAttemptCount < 1) {
    return json({ ok: false, error: 'Durable order does not prove one valid 2-3-domain seed confirmation followed by an initial Workflow start (seed_count=' + domains.length + ', unique_domains=' + new Set(domains).size + ', valid_seeds=' + validSeeds + ', workflow_id_present=' + Boolean(order.fulfillmentWorkflowId) + ', fulfillment_attempt_count=' + fulfillmentAttemptCount + ')' }, 409);
  }
  let instance = null;
  try { instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.get(order.fulfillmentWorkflowId); } catch {}
  let workflowStatus = 'unavailable';
  try { workflowStatus = (await instance?.status())?.status || 'unavailable'; } catch {}
  if (workflowStatus === 'unavailable') return json({ ok: false, error: 'Recorded acceptance Workflow cannot be read from the first-party binding' }, 409);
  return json({
    ok: true,
    orderIdSha256: ${JSON.stringify(sha256(receipt.order_id))},
    checkoutSessionSha256: ${JSON.stringify(sha256(receipt.stripe_checkout_session_id))},
    workflowIdSha256: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(order.fulfillmentWorkflowId)).then(value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('')),
    orderStatus: order.status,
    confirmedSeedCount: domains.length,
    uniqueCommercialDomains: new Set(domains).size,
    seedValidationRecorded: true,
    initialWorkflowCount: 1,
    fulfillmentAttemptCount,
    recoveryRetryCount: Math.max(0, fulfillmentAttemptCount - 1),
    workflowStatus,
    secretValuesRecorded: false
  });
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '${SMOKE_PATH}') {
    if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
    return verifyGate22(env);
  }
  return app.fetch(request, env, ctx);
}};`;
}

assertPriorGatesAndSeedContract();
const receipt = purchaseReceipt();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, receipt), 'utf8');
let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate22-seed-confirmation-workflow-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 22 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) throw new Error(`Gate 22 acceptance verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  if (body.confirmedSeedCount < 2 || body.confirmedSeedCount > 3 || body.uniqueCommercialDomains !== body.confirmedSeedCount
    || body.seedValidationRecorded !== true || body.initialWorkflowCount !== 1 || body.fulfillmentAttemptCount < 1 || body.secretValuesRecorded !== false) {
    throw new Error('Gate 22 evidence does not satisfy the valid seed confirmation and exactly-one-Workflow contract.');
  }
  evidence = body;
} catch (error) { smokeError = error; } finally {
  let restoreError = null;
  if (wrappedDeployed) { try { runWrangler(['deploy', '--env', 'acceptance']); } catch (error) { restoreError = error; } }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) throw new Error(`Gate 22 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
}
if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 22 produced no acceptance evidence.');
writeFileSync(GATE22_RECEIPT_PATH, `${JSON.stringify({ schema_version: 'roadmap-gate22-seed-confirmation-workflow-receipt-v1', verified_at: new Date().toISOString(), order_id_sha256: evidence.orderIdSha256, checkout_session_id_sha256: evidence.checkoutSessionSha256, workflow_id_sha256: evidence.workflowIdSha256, order_status: evidence.orderStatus, confirmed_seed_count: evidence.confirmedSeedCount, unique_commercial_domains: evidence.uniqueCommercialDomains, seed_validation_recorded: true, initial_workflow_count: evidence.initialWorkflowCount, fulfillment_attempt_count: evidence.fulfillmentAttemptCount, recovery_retry_count: evidence.recoveryRetryCount, workflow_status: evidence.workflowStatus, secret_values_recorded: false }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, confirmed_seed_count: evidence.confirmedSeedCount, unique_commercial_domains: evidence.uniqueCommercialDomains, initial_workflow_count: evidence.initialWorkflowCount, fulfillment_attempt_count: evidence.fulfillmentAttemptCount, recovery_retry_count: evidence.recoveryRetryCount, workflow_status: evidence.workflowStatus, local_receipt_written: true, secret_values_recorded: false }));
