#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate20-manual-purchase-verifier-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate20-manual-purchase';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

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
    console.log(`Gate 20 temporary Worker not propagated yet; retrying ${attempt}/${maxAttempts}...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 20 temporary Worker propagation retry exhausted unexpectedly.');
}

function qualifyingWindowStart() {
  if (!existsSync(STATE_PATH)) throw new Error('INPUT_REQUIRED: roadmap state is missing; rerun npm run roadmap:autopilot first.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const gate19 = state?.gates?.['19'];
  if (gate19?.status !== 'PASS' || !gate19.checked_at) {
    throw new Error('INPUT_REQUIRED: Gate 19 must be PASS before the Gate 20 purchase can be verified.');
  }
  return String(gate19.checked_at);
}

function temporaryWorkerSource(token, minCreatedAt) {
  return `import app from '../src/api/worker.ts';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const MIN_CREATED_AT = ${JSON.stringify(minCreatedAt)};

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

async function verifyPurchase(env) {
  const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('rk_test_')) {
    return json({ ok: false, inputRequired: false, error: 'Acceptance Stripe credential is not test mode' }, 502);
  }

  const minTime = Date.parse(MIN_CREATED_AT);
  const candidates = [];
  for (const key of await allOrderKeys(env)) {
    const raw = await env.KV.get(key);
    if (!raw) continue;
    let order;
    try { order = JSON.parse(raw); } catch { continue; }
    if (!order?.createdAt || Date.parse(order.createdAt) < minTime) continue;
    if (order.stripeMode !== 'test') continue;
    if (order.offerId !== GHOSTTOWN_30_DAY_PLAN_V1.offerId) continue;
    if (!order.paidAt || !order.stripeCheckoutSessionId || !order.stripeEventId) continue;
    // Gate 20 proves the human Stripe purchase, not successful downstream fulfillment.
    // A paid order that later failed in research/generation still satisfies this gate
    // and must be carried forward to the fulfillment recovery gates without charging again.
    if (!['awaiting_seeds', 'paid', 'researching', 'generating', 'ready', 'failed'].includes(order.status)) continue;
    candidates.push(order);
  }

  candidates.sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || '')));
  for (const order of candidates) {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(order.stripeCheckoutSessionId), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + stripeKey }
    });
    if (!response.ok) continue;
    const session = await response.json();
    const metadata = session?.metadata && typeof session.metadata === 'object' ? session.metadata : {};
    const valid = session?.livemode === false
      && session?.mode === 'payment'
      && session?.payment_status === 'paid'
      && session?.status === 'complete'
      && session?.amount_total === GHOSTTOWN_30_DAY_PLAN_V1.amountCents
      && session?.currency === GHOSTTOWN_30_DAY_PLAN_V1.currency
      && metadata.paid_test_order_id === order.orderId
      && metadata.offer_id === GHOSTTOWN_30_DAY_PLAN_V1.offerId
      && metadata.offer_amount_cents === String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents)
      && metadata.offer_currency === GHOSTTOWN_30_DAY_PLAN_V1.currency
      && metadata.fulfillment_type === 'execution_plan_30day_v1';
    if (!valid) continue;

    return json({
      ok: true,
      orderId: order.orderId,
      checkoutSessionId: session.id,
      orderStatus: order.status,
      artifactType: order.artifactType,
      paidAt: order.paidAt,
      stripeMode: 'test',
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
      webhookEventRecorded: true,
      secretValuesRecorded: false
    });
  }

  return json({
    ok: false,
    inputRequired: true,
    error: 'No qualifying post-Gate-19 Stripe test-mode $97 purchase has been observed yet'
  }, 409);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return verifyPurchase(env);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

const minCreatedAt = qualifyingWindowStart();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, minCreatedAt), 'utf8');

let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate20-manual-purchase-verifier-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 20 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) {
    if (body?.inputRequired === true) {
      throw new Error('INPUT_REQUIRED: complete one Stripe TEST-mode $97 purchase using a new account and clean browser profile, then rerun npm run roadmap:autopilot.');
    }
    throw new Error(`Gate 20 Stripe test purchase verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
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
    throw new Error(`Gate 20 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 20 produced no purchase evidence.');
writeFileSync(RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'roadmap-gate20-purchase-receipt-v1',
  verified_at: new Date().toISOString(),
  order_id: evidence.orderId,
  stripe_checkout_session_id: evidence.checkoutSessionId,
  paid_at: evidence.paidAt,
  stripe_mode: evidence.stripeMode,
  amount_total: evidence.amountTotal,
  currency: evidence.currency,
  webhook_event_recorded: evidence.webhookEventRecorded
}, null, 2)}\n`, 'utf8');
const sessionHash = createHash('sha256').update(evidence.checkoutSessionId).digest('hex');
console.log(JSON.stringify({
  ok: true,
  stripe_mode: evidence.stripeMode,
  amount_total: evidence.amountTotal,
  currency: evidence.currency,
  order_status: evidence.orderStatus,
  payment_status: evidence.paymentStatus,
  session_status: evidence.sessionStatus,
  checkout_session_sha256: sessionHash,
  webhook_event_recorded: evidence.webhookEventRecorded,
  local_receipt_written: true,
  secret_values_recorded: false
}));
