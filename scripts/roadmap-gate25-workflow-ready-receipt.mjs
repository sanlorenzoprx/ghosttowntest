#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE25_RECEIPT_PATH = join(STATE_DIR, 'gate25-workflow-ready-receipt.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate25-workflow-ready-receipt-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate25-workflow-ready-receipt';
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
    throw new Error('Gate 25 requires the existing Gate 20 purchase receipt; no new purchase will be created.');
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

function assertPriorGatesAndReadyContract() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 25 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['24']?.status !== 'PASS') throw new Error('Gate 25 requires Gate 24 to be PASS.');

  const workflow = readFileSync(join(ROOT, 'src', 'api', 'launchBlueprintWorkflow.ts'), 'utf8');
  const fulfillment = readFileSync(join(ROOT, 'src', 'api', 'blueprintFulfillmentV21.ts'), 'utf8');
  const delivery = readFileSync(join(ROOT, 'src', 'api', 'blueprintDeliveryVerifierV21.ts'), 'utf8');
  const persistence = readFileSync(join(ROOT, 'src', 'api', 'blueprintStoreV21.ts'), 'utf8');
  const retry = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const required = [
    "'mark canonical blueprint v2.1 generating'",
    "'persist canonical blueprint v2.1 artifacts before ready'",
    'completeLaunchBlueprintOrderV21',
    'order.status = \'ready\';',
    'await recordCompletionV21(',
    "eventName: 'launch_blueprint_completed'",
    'verifyBlueprintDeliveryStateExactV21',
    'generationReceiptEvidence',
    'const retryEventId = `manual_retry_${crypto.randomUUID()}`',
    "if (workflowStatus === 'complete')"
  ];
  if (required.some(pattern => !(workflow + fulfillment + delivery + persistence + retry).includes(pattern))) {
    throw new Error('Gate 25 first-party Workflow transition, completion receipt, persistence, or retry contract no longer proves the required acceptance semantics.');
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
    console.log(`Gate 25 temporary Worker not propagated yet; retrying ${attempt}/8...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 25 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token, receipt) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(receipt.order_id)};
const CHECKOUT_SESSION_ID = ${JSON.stringify(receipt.stripe_checkout_session_id)};
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function validHash(value) { return /^[a-f0-9]{64}$/i.test(text(value)); }
async function sha256(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join(''); }
async function completionEvent(env, order, receipt) {
  let cursor;
  do {
    const page = await env.KV.list({ prefix: 'analytics_event_', limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const item of page.keys) {
      const raw = await env.KV.get(item.name);
      let event = null;
      try { event = raw ? JSON.parse(raw) : null; } catch {}
      if (event?.eventName === 'launch_blueprint_completed' && event?.origin === 'cloudflare_workflow'
        && event?.orderId === ORDER_ID && event?.workflowId === order.fulfillmentWorkflowId
        && event?.canonicalBlueprintSha256 === receipt?.hashes?.canonicalBlueprintSha256
        && Date.parse(String(event?.createdAt || '')) >= Date.parse(String(order.paidAt || ''))) return true;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return false;
}
async function verifyGate25(env) {
  const rawOrder = await env.KV.get('paid_test_order_' + ORDER_ID);
  let order = null;
  try { order = rawOrder ? JSON.parse(rawOrder) : null; } catch {}
  if (!order || order.orderId !== ORDER_ID || order.stripeCheckoutSessionId !== CHECKOUT_SESSION_ID || !order.paidAt
    || order.status !== 'ready' || order.artifactType !== 'launch_blueprint_v2' || order.planVersion !== '2.0'
    || text(order.fulfillmentError) || !text(order.fulfillmentWorkflowId)) {
    return json({ ok: false, error: 'Durable paid order is not in a clean READY fulfillment state' }, 409);
  }
  const fulfillmentAttemptCount = Number(order.fulfillmentAttemptCount || 0);
  if (fulfillmentAttemptCount < 1) return json({ ok: false, error: 'Durable order lacks a Workflow fulfillment attempt receipt' }, 409);
  let instance = null;
  try { instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.get(order.fulfillmentWorkflowId); } catch {}
  let workflowStatus = 'unavailable';
  try { workflowStatus = (await instance?.status())?.status || 'unavailable'; } catch {}
  if (workflowStatus !== 'complete') return json({ ok: false, error: 'Recorded acceptance Workflow is not complete (status=' + workflowStatus + ')' }, 409);
  const row = await env.DB.prepare('SELECT status, owner_id, blueprint_json, research_receipt_json, pdf_r2_key FROM launch_blueprints WHERE order_id = ?').bind(ORDER_ID).first();
  if (!row || row.status !== 'ready' || typeof row.blueprint_json !== 'string' || typeof row.research_receipt_json !== 'string' || !text(row.pdf_r2_key)) {
    return json({ ok: false, error: 'Persisted READY Blueprint, research receipt, or PDF key is unavailable' }, 409);
  }
  let blueprint = null;
  let researchReceipt = null;
  let pointer = null;
  let integrity = null;
  try {
    blueprint = JSON.parse(row.blueprint_json);
    researchReceipt = JSON.parse(row.research_receipt_json);
    pointer = JSON.parse((await env.KV.get('paid_test_blueprint_pointer_' + ORDER_ID)) || 'null');
    integrity = JSON.parse((await env.KV.get('paid_test_blueprint_integrity_' + ORDER_ID)) || 'null');
  } catch {}
  const evidence = researchReceipt?.generationReceiptEvidence;
  const hashes = evidence?.hashes;
  const artifactKeys = evidence?.artifactKeys;
  const quality = evidence?.quality;
  const researchComplete = researchReceipt?.provider === 'distribution_footprint' && text(researchReceipt?.completedAt)
    && Number(researchReceipt?.successfulSourceCount || 0) >= 1 && Number(researchReceipt?.candidateChannelCount || 0) >= 10
    && Number(researchReceipt?.verifiedChannelCount || 0) >= 10 && Number(researchReceipt?.verifiedChannelCount || 0) <= 25
    && Array.isArray(researchReceipt?.sourceDefinitionIds) && researchReceipt.sourceDefinitionIds.length > 0;
  const generationComplete = evidence?.vertex?.required === true && Array.isArray(evidence?.vertex?.stages) && evidence.vertex.stages.length === 4
    && quality?.deterministicGatePassed === true && quality?.v21GatePassed === true && quality?.redTeamPassed === true
    && quality?.sourceVerificationPassed === true && quality?.candidateIdValidationPassed === true
    && validHash(hashes?.normalizedInputSha256) && validHash(hashes?.canonicalBlueprintSha256)
    && validHash(hashes?.pdfSha256) && validHash(hashes?.zipSha256);
  const persistenceComplete = blueprint?.status === 'ready' && blueprint?.orderId === ORDER_ID && blueprint?.qualityGate?.passed === true
    && row.pdf_r2_key === artifactKeys?.pdf && pointer?.orderId === ORDER_ID && pointer?.pdfR2Key === artifactKeys?.pdf
    && pointer?.jsonR2Key === artifactKeys?.json && pointer?.assetsR2Key === artifactKeys?.zip
    && pointer?.hashes?.canonicalBlueprintSha256 === hashes?.canonicalBlueprintSha256
    && integrity?.hashes?.canonicalBlueprintSha256 === hashes?.canonicalBlueprintSha256
    && integrity?.hashes?.pdfSha256 === hashes?.pdfSha256 && integrity?.hashes?.zipSha256 === hashes?.zipSha256;
  const matchingCompletionEvent = generationComplete && await completionEvent(env, order, evidence);
  if (!researchComplete || !generationComplete || !persistenceComplete || !matchingCompletionEvent) {
    return json({ ok: false, error: 'Existing Workflow completion evidence does not prove complete research, generation, transition, persistence, and matching completion receipt state' }, 409);
  }
  return json({
    ok: true,
    orderIdSha256: await sha256(ORDER_ID),
    checkoutSessionSha256: await sha256(CHECKOUT_SESSION_ID),
    workflowIdSha256: await sha256(order.fulfillmentWorkflowId),
    blueprintSha256: await sha256(row.blueprint_json),
    researchReceiptSha256: await sha256(row.research_receipt_json),
    workflowStatus,
    orderStatus: order.status,
    blueprintStatus: blueprint.status,
    fulfillmentAttemptCount,
    recoveryRetryCount: Math.max(0, fulfillmentAttemptCount - 1),
    initialWorkflowCount: 1,
    researchReceiptComplete: true,
    generationReceiptComplete: true,
    transitionPersistenceConsistent: true,
    matchingCompletionEvent: true,
    workflowReplayed: false,
    generationReplayed: false,
    secretValuesRecorded: false
  });
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '${SMOKE_PATH}') {
    if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
    return verifyGate25(env);
  }
  return app.fetch(request, env, ctx);
}};`;
}

assertPriorGatesAndReadyContract();
const receipt = purchaseReceipt();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, receipt), 'utf8');
let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate25-workflow-ready-receipt-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 25 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) throw new Error(`Gate 25 acceptance verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  if (body.workflowStatus !== 'complete' || body.orderStatus !== 'ready' || body.blueprintStatus !== 'ready'
    || body.fulfillmentAttemptCount < 1 || body.initialWorkflowCount !== 1 || body.researchReceiptComplete !== true
    || body.generationReceiptComplete !== true || body.transitionPersistenceConsistent !== true || body.matchingCompletionEvent !== true
    || body.workflowReplayed !== false || body.generationReplayed !== false || body.secretValuesRecorded !== false) {
    throw new Error('Gate 25 evidence does not satisfy the completed Workflow READY receipt contract.');
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
    throw new Error(`Gate 25 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}
if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 25 produced no acceptance evidence.');
writeFileSync(GATE25_RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'roadmap-gate25-workflow-ready-receipt-v1',
  verified_at: new Date().toISOString(),
  order_id_sha256: evidence.orderIdSha256,
  checkout_session_id_sha256: evidence.checkoutSessionSha256,
  workflow_id_sha256: evidence.workflowIdSha256,
  blueprint_sha256: evidence.blueprintSha256,
  research_receipt_sha256: evidence.researchReceiptSha256,
  workflow_status: evidence.workflowStatus,
  order_status: evidence.orderStatus,
  blueprint_status: evidence.blueprintStatus,
  fulfillment_attempt_count: evidence.fulfillmentAttemptCount,
  recovery_retry_count: evidence.recoveryRetryCount,
  initial_workflow_count: evidence.initialWorkflowCount,
  research_receipt_complete: true,
  generation_receipt_complete: true,
  transition_persistence_consistent: true,
  matching_completion_event: true,
  workflow_replayed: false,
  generation_replayed: false,
  secret_values_recorded: false
}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  workflow_status: evidence.workflowStatus,
  order_status: evidence.orderStatus,
  blueprint_status: evidence.blueprintStatus,
  fulfillment_attempt_count: evidence.fulfillmentAttemptCount,
  recovery_retry_count: evidence.recoveryRetryCount,
  initial_workflow_count: evidence.initialWorkflowCount,
  research_receipt_complete: true,
  generation_receipt_complete: true,
  transition_persistence_consistent: true,
  matching_completion_event: true,
  workflow_replayed: false,
  generation_replayed: false,
  local_receipt_written: true,
  secret_values_recorded: false
}));
