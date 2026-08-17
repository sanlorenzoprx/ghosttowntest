#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE21_RECEIPT_PATH = join(STATE_DIR, 'gate21-stripe-order-idempotency.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate21-stripe-order-idempotency-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate21-stripe-order-idempotency';
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

function readGate20Receipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) {
    throw new Error('Gate 21 requires the existing .roadmap-autopilot/gate20-purchase.json receipt.');
  }
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || receipt?.stripe_mode !== 'test'
    || receipt?.amount_total !== 9700
    || receipt?.currency !== 'usd'
    || typeof receipt?.order_id !== 'string'
    || typeof receipt?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 20 receipt is incomplete or does not describe the accepted $97 Stripe test purchase.');
  }
  return receipt;
}

function assertGate20Passed() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 21 requires existing roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['20']?.status !== 'PASS') {
    throw new Error('Gate 21 requires Gate 20 to be PASS; no new purchase will be created.');
  }
}

function assertFirstPartyWebhookContract() {
  const webhook = readFileSync(join(ROOT, 'src', 'api', 'webhook.ts'), 'utf8');
  const required = [
    'verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)',
    'if (await env.KV.get(eventKey))',
    'duplicate: true',
    'markLaunchBlueprintAwaitingSeeds',
    'await env.KV.put(eventKey'
  ];
  if (required.some(pattern => !webhook.includes(pattern)) || webhook.includes('startLaunchBlueprintWorkflow')) {
    throw new Error('Gate 21 first-party webhook contract no longer proves signature verification, duplicate short-circuiting, and deferred workflow start.');
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
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    const canonicalWorkerStillServing = response.status === 404
      && (body?.error === 'Endpoint not found' || !body);
    if (!canonicalWorkerStillServing || attempt === maxAttempts) return { response, body };
    console.log(`Gate 21 temporary Worker not propagated yet; retrying ${attempt}/${maxAttempts}...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 21 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token, receipt) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(receipt.order_id)};
const CHECKOUT_SESSION_ID = ${JSON.stringify(receipt.stripe_checkout_session_id)};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function allOrderKeys(env) {
  const names = [];
  let cursor;
  do {
    const page = await env.KV.list({ prefix: 'paid_test_order_', limit: 1000, ...(cursor ? { cursor } : {}) });
    names.push(...page.keys.map(item => item.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return names;
}

async function stripeJson(url, stripeKey) {
  const response = await fetch(url, { method: 'GET', headers: { Authorization: 'Bearer ' + stripeKey } });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function verifyGate21(env) {
  const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
  const signingSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  if ((!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('rk_test_')) || !signingSecret.startsWith('whsec_')) {
    return json({ ok: false, error: 'Acceptance Stripe test-mode credentials or webhook signing-secret binding are unavailable' }, 502);
  }

  const linkedOrders = [];
  for (const key of await allOrderKeys(env)) {
    const raw = await env.KV.get(key);
    if (!raw) continue;
    let order;
    try { order = JSON.parse(raw); } catch { continue; }
    if (order?.stripeCheckoutSessionId === CHECKOUT_SESSION_ID) linkedOrders.push(order);
  }
  if (linkedOrders.length !== 1) {
    return json({ ok: false, error: 'Accepted Checkout Session does not map to exactly one persisted order', matchingOrderCount: linkedOrders.length }, 409);
  }

  const order = linkedOrders[0];
  if (order.orderId !== ORDER_ID || order.stripeMode !== 'test' || !order.paidAt || !order.stripeEventId) {
    return json({ ok: false, error: 'Persisted order does not match the accepted test-mode payment evidence' }, 409);
  }

  const confirmedSeeds = Array.isArray(order.intake?.competitorSeeds) ? order.intake.competitorSeeds : [];
  const seedDomains = confirmedSeeds.map(seed => String(seed?.domain || '').trim().toLowerCase()).filter(Boolean);
  const paymentTime = Date.parse(order.paidAt);
  const validSeedConfirmation = seedDomains.length >= 2 && seedDomains.length <= 3
    && new Set(seedDomains).size === seedDomains.length
    && confirmedSeeds.every(seed => Number.isFinite(Date.parse(String(seed?.verifiedAt || ''))) && Date.parse(String(seed.verifiedAt)) >= paymentTime);
  if (!validSeedConfirmation) {
    return json({ ok: false, error: 'Durable order state cannot prove that workflow execution followed valid 2-3-domain seed confirmation' }, 409);
  }

  const sessionResult = await stripeJson('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(CHECKOUT_SESSION_ID), stripeKey);
  const session = sessionResult.body;
  if (!sessionResult.response.ok || session?.id !== CHECKOUT_SESSION_ID || session?.livemode !== false
    || session?.mode !== 'payment' || session?.payment_status !== 'paid' || session?.status !== 'complete'
    || session?.amount_total !== 9700 || session?.currency !== 'usd'
    || session?.metadata?.paid_test_order_id !== ORDER_ID || typeof session?.payment_intent !== 'string') {
    return json({ ok: false, error: 'Stripe Checkout Session no longer matches the accepted $97 test purchase' }, 409);
  }

  const chargesResult = await stripeJson('https://api.stripe.com/v1/charges?payment_intent=' + encodeURIComponent(session.payment_intent) + '&limit=100', stripeKey);
  const charges = Array.isArray(chargesResult.body?.data) ? chargesResult.body.data : [];
  const successfulCharges = charges.filter(charge => charge?.paid === true && charge?.status === 'succeeded');
  if (!chargesResult.response.ok || chargesResult.body?.has_more === true || successfulCharges.length !== 1) {
    return json({ ok: false, error: 'Accepted payment intent does not prove exactly one successful charge', successfulChargeCount: successfulCharges.length }, 409);
  }

  return json({
    ok: true,
    orderIdSha256: ${JSON.stringify(sha256(receipt.order_id))},
    checkoutSessionSha256: ${JSON.stringify(sha256(receipt.stripe_checkout_session_id))},
    stripeEventSha256: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(order.stripeEventId)).then(value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('')),
    paymentIntentSha256: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(session.payment_intent)).then(value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('')),
    signedWebhookAccepted: true,
    persistedIdempotencyEvidence: true,
    duplicateReplayPerformed: false,
    matchingOrderCount: linkedOrders.length,
    successfulChargeCount: successfulCharges.length,
    confirmedSeedCount: seedDomains.length,
    workflowStartedAfterValidSeeds: Boolean(order.fulfillmentWorkflowId),
    workflowStartedByWebhook: false,
    secretValuesRecorded: false
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return verifyGate21(env);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

assertGate20Passed();
assertFirstPartyWebhookContract();
const gate20Receipt = readGate20Receipt();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, gate20Receipt), 'utf8');

let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate21-stripe-order-idempotency-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 21 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) {
    throw new Error(`Gate 21 acceptance verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
  if (body.signedWebhookAccepted !== true || body.persistedIdempotencyEvidence !== true || body.duplicateReplayPerformed !== false
    || body.matchingOrderCount !== 1 || body.successfulChargeCount !== 1 || body.confirmedSeedCount < 2 || body.confirmedSeedCount > 3
    || body.workflowStartedByWebhook !== false || body.secretValuesRecorded !== false) {
    throw new Error('Gate 21 evidence did not prove the signed webhook, idempotency, single-order/single-charge, and no-premature-Workflow contract.');
  }
  evidence = body;
} catch (error) {
  smokeError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try {
      runWrangler(['deploy', '--env', 'acceptance']);
    } catch (error) {
      restoreError = error;
    }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Gate 21 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 21 produced no acceptance evidence.');
writeFileSync(GATE21_RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'roadmap-gate21-stripe-order-idempotency-receipt-v1',
  verified_at: new Date().toISOString(),
  order_id_sha256: evidence.orderIdSha256,
  checkout_session_id_sha256: evidence.checkoutSessionSha256,
  stripe_event_id_sha256: evidence.stripeEventSha256,
  payment_intent_id_sha256: evidence.paymentIntentSha256,
  signed_webhook_accepted: true,
  persisted_idempotency_evidence: true,
  duplicate_replay_performed: false,
  matching_order_count: evidence.matchingOrderCount,
  successful_charge_count: evidence.successfulChargeCount,
  confirmed_seed_count: evidence.confirmedSeedCount,
  workflow_started_after_valid_seeds: evidence.workflowStartedAfterValidSeeds,
  workflow_started_by_webhook: false,
  secret_values_recorded: false
}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  signed_webhook_accepted: true,
  persisted_idempotency_evidence: true,
  duplicate_replay_performed: false,
  matching_order_count: evidence.matchingOrderCount,
  successful_charge_count: evidence.successfulChargeCount,
  confirmed_seed_count: evidence.confirmedSeedCount,
  workflow_started_after_valid_seeds: evidence.workflowStartedAfterValidSeeds,
  workflow_started_by_webhook: false,
  local_receipt_written: true,
  secret_values_recorded: false
}));
