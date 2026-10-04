#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const TEMP_ENTRY = join(STATE_DIR, 'acceptance-stripe-payment-proof-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__acceptance/stripe-payment-webhook-proof';
const PROOF_PATH = join(ROOT, 'github-acceptance', 'stripe-payment-webhook-proof.json');
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
      headers: { 'X-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const canonicalWorkerStillServing = response.status === 404
      && (body?.error === 'Endpoint not found' || !body);
    if (!canonicalWorkerStillServing || attempt === maxAttempts) return { response, body };
    console.log(`Stripe proof temporary Worker not propagated yet; retrying ${attempt}/${maxAttempts}...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Stripe payment proof propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token) {
  return `import app from '../src/api/worker.ts';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};
const MAX_PURCHASE_AGE_MS = 6 * 60 * 60 * 1000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function allOrderRecords(env) {
  const records = [];
  let cursor;
  do {
    const page = await env.KV.list({ prefix: 'paid_test_order_', limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const item of page.keys) {
      const raw = await env.KV.get(item.name);
      if (!raw) continue;
      try { records.push(JSON.parse(raw)); } catch {}
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return records;
}

async function stripeJson(url, stripeKey) {
  const response = await fetch(url, { method: 'GET', headers: { Authorization: 'Bearer ' + stripeKey } });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function stripeSignature(body, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(timestamp + '.' + body)
  ));
  const signature = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  return 't=' + timestamp + ',v1=' + signature;
}

async function verifyPayment(env, ctx) {
  const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
  const signingSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  if ((!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('rk_test_')) || !signingSecret.startsWith('whsec_')) {
    return json({ ok: false, inputRequired: false, error: 'Acceptance Stripe test-mode credentials or webhook signing secret are unavailable' }, 502);
  }

  const now = Date.now();
  const orders = await allOrderRecords(env);
  const recentHumanOrders = orders.filter(order => {
    const email = String(order?.email || '').trim().toLowerCase();
    const activityAt = Date.parse(String(order?.paidAt || order?.updatedAt || order?.createdAt || ''));
    return email
      && !email.endsWith('@example.invalid')
      && Number.isFinite(activityAt)
      && now - activityAt >= 0
      && now - activityAt <= MAX_PURCHASE_AGE_MS;
  }).sort((left, right) => String(right.paidAt || right.updatedAt || right.createdAt || '').localeCompare(String(left.paidAt || left.updatedAt || left.createdAt || '')));

  const diagnostics = [];
  for (const order of recentHumanOrders.slice(0, 10)) {
    const sessionId = typeof order?.stripeCheckoutSessionId === 'string' ? order.stripeCheckoutSessionId : '';
    let stripeSession = null;
    let stripeSessionLookupOk = false;
    if (sessionId) {
      const result = await stripeJson('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId), stripeKey);
      stripeSessionLookupOk = result.response.ok;
      stripeSession = result.body;
    }
    diagnostics.push({
      orderIdSha256: order?.orderId ? await sha256(order.orderId) : null,
      status: order?.status || null,
      stripeMode: order?.stripeMode || null,
      offerId: order?.offerId || null,
      artifactType: order?.artifactType || null,
      paidAtPresent: Boolean(order?.paidAt),
      checkoutSessionPresent: Boolean(sessionId),
      stripeEventIdPresent: typeof order?.stripeEventId === 'string',
      paymentIntentPresent: typeof order?.stripePaymentIntentId === 'string',
      stripeSessionLookupOk,
      stripeSessionStatus: stripeSession?.status || null,
      stripePaymentStatus: stripeSession?.payment_status || null,
      stripeAmountTotal: stripeSession?.amount_total ?? null,
      stripeCurrency: stripeSession?.currency || null,
      stripeLivemode: typeof stripeSession?.livemode === 'boolean' ? stripeSession.livemode : null,
      expectedThirtyDayOffer: order?.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId,
      expectedBlueprintArtifact: order?.artifactType === 'launch_blueprint_v2'
    });
  }

  const candidates = recentHumanOrders.filter(order => {
    const paidAt = Date.parse(String(order?.paidAt || ''));
    return Number.isFinite(paidAt)
      && now - paidAt >= 0
      && now - paidAt <= MAX_PURCHASE_AGE_MS
      && order?.stripeMode === 'test'
      && order?.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId
      && order?.artifactType === 'launch_blueprint_v2'
      && typeof order?.stripeCheckoutSessionId === 'string'
      && typeof order?.stripeEventId === 'string'
      && ['awaiting_seeds', 'paid', 'researching', 'generating', 'ready', 'failed'].includes(order?.status);
  }).sort((left, right) => String(right.paidAt || '').localeCompare(String(left.paidAt || '')));

  for (const order of candidates) {
    const sessionResult = await stripeJson('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(order.stripeCheckoutSessionId), stripeKey);
    const session = sessionResult.body;
    if (!sessionResult.response.ok || !session) continue;

    const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
    const validSession = session.id === order.stripeCheckoutSessionId
      && session.livemode === false
      && session.mode === 'payment'
      && session.payment_status === 'paid'
      && session.status === 'complete'
      && session.amount_total === GHOSTTOWN_30_DAY_PLAN_V1.amountCents
      && session.currency === GHOSTTOWN_30_DAY_PLAN_V1.currency
      && metadata.paid_test_order_id === order.orderId
      && metadata.offer_id === GHOSTTOWN_30_DAY_PLAN_V1.offerId
      && metadata.offer_amount_cents === String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents)
      && metadata.offer_currency === GHOSTTOWN_30_DAY_PLAN_V1.currency
      && (metadata.fulfillment_type === 'execution_plan_30day_v1' || metadata.fulfillment_type === 'launch_blueprint_v2')
      && typeof session.payment_intent === 'string';
    if (!validSession) continue;

    const stripeEventReceiptRaw = await env.KV.get('stripe_event_' + order.stripeEventId);
    if (!stripeEventReceiptRaw) continue;
    let stripeEventReceipt = null;
    try { stripeEventReceipt = JSON.parse(stripeEventReceiptRaw); } catch {}
    if (!stripeEventReceipt
      || stripeEventReceipt.orderId !== order.orderId
      || stripeEventReceipt.artifactType !== 'launch_blueprint_v2') continue;

    const eventResult = await stripeJson('https://api.stripe.com/v1/events/' + encodeURIComponent(order.stripeEventId), stripeKey);
    const stripeEvent = eventResult.body;
    if (!eventResult.response.ok || !stripeEvent
      || stripeEvent.livemode !== false
      || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(stripeEvent.type)
      || stripeEvent.data?.object?.id !== session.id) continue;

    const chargesResult = await stripeJson('https://api.stripe.com/v1/charges?payment_intent=' + encodeURIComponent(session.payment_intent) + '&limit=100', stripeKey);
    const charges = Array.isArray(chargesResult.body?.data) ? chargesResult.body.data : [];
    const successfulCharges = charges.filter(charge => charge?.paid === true && charge?.status === 'succeeded');
    if (!chargesResult.response.ok || chargesResult.body?.has_more === true || successfulCharges.length !== 1) continue;

    const matchingOrders = orders.filter(item => item?.stripeCheckoutSessionId === session.id);
    if (matchingOrders.length !== 1 || matchingOrders[0]?.orderId !== order.orderId) continue;

    const replayBody = JSON.stringify(stripeEvent);
    const replaySignature = await stripeSignature(replayBody, signingSecret);
    const replayResponse = await app.fetch(new Request('https://acceptance.internal/api/webhook/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': replaySignature
      },
      body: replayBody
    }), env, ctx);
    let replayResult = null;
    try { replayResult = await replayResponse.json(); } catch {}
    if (!replayResponse.ok || replayResult?.received !== true || replayResult?.duplicate !== true) continue;

    const matchingAfterReplay = (await allOrderRecords(env)).filter(item => item?.stripeCheckoutSessionId === session.id);
    if (matchingAfterReplay.length !== 1 || matchingAfterReplay[0]?.orderId !== order.orderId) continue;

    const summaryRaw = await env.KV.get('paid_test_orders_' + String(order.email).trim().toLowerCase());
    let summaries = [];
    try { summaries = summaryRaw ? JSON.parse(summaryRaw) : []; } catch {}
    const summary = Array.isArray(summaries) ? summaries.find(item => item?.orderId === order.orderId) : null;
    if (!summary || summary.artifactType !== 'launch_blueprint_v2') continue;

    return json({
      ok: true,
      passed: true,
      stripeMode: 'test',
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      artifactType: order.artifactType,
      orderStatus: order.status,
      signedWebhookAccepted: true,
      webhookEventRecorded: true,
      eventType: stripeEvent.type,
      eventReceiptMatchesOrder: true,
      dashboardProjectionPresent: true,
      matchingOrderCount: matchingOrders.length,
      successfulChargeCount: successfulCharges.length,
      idempotencyEventKeyPresent: true,
      duplicateReplayPerformed: true,
      duplicateReplayRejectedAsDuplicate: true,
      matchingOrderCountAfterReplay: matchingAfterReplay.length,
      orderIdSha256: await sha256(order.orderId),
      checkoutSessionSha256: await sha256(session.id),
      paymentIntentSha256: await sha256(session.payment_intent),
      stripeEventSha256: await sha256(order.stripeEventId),
      paidAt: order.paidAt,
      secretValuesRecorded: false
    });
  }

  return json({
    ok: false,
    inputRequired: true,
    error: 'No qualifying recent acceptance Stripe test-mode $97 payment with a recorded GhostTown webhook entitlement was found',
    diagnostics: {
      recentHumanOrderCount: recentHumanOrders.length,
      qualifyingCandidateCount: candidates.length,
      recentOrders: diagnostics
    }
  }, 409);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return verifyPayment(env, ctx);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

mkdirSync(STATE_DIR, { recursive: true });
mkdirSync(join(ROOT, 'github-acceptance'), { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token), 'utf8');

let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/acceptance-stripe-payment-proof-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Stripe payment proof returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true || body?.passed !== true) {
    if (body?.inputRequired === true) {
      evidence = { passed: false, diagnostics: body?.diagnostics || null };
      console.error('[acceptance-stripe-payment] diagnostics', JSON.stringify(body?.diagnostics || null));
      throw new Error('INPUT_REQUIRED: no qualifying recent Stripe test payment/webhook entitlement was found in acceptance.');
    }
    throw new Error(`Stripe payment proof failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
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
    throw new Error(`Stripe payment proof temporary Worker could not restore the canonical acceptance Worker: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

const proof = evidence?.passed === true ? {
  schemaVersion: 'ghosttown-acceptance-stripe-payment-webhook-v1',
  passed: true,
  stripeMode: evidence.stripeMode,
  sessionStatus: evidence.sessionStatus,
  paymentStatus: evidence.paymentStatus,
  amountTotal: evidence.amountTotal,
  currency: evidence.currency,
  artifactType: evidence.artifactType,
  orderStatus: evidence.orderStatus,
  signedWebhookAccepted: evidence.signedWebhookAccepted,
  webhookEventRecorded: evidence.webhookEventRecorded,
  eventType: evidence.eventType,
  eventReceiptMatchesOrder: evidence.eventReceiptMatchesOrder,
  dashboardProjectionPresent: evidence.dashboardProjectionPresent,
  matchingOrderCount: evidence.matchingOrderCount,
  successfulChargeCount: evidence.successfulChargeCount,
  idempotencyEventKeyPresent: evidence.idempotencyEventKeyPresent,
  duplicateReplayPerformed: evidence.duplicateReplayPerformed,
  duplicateReplayRejectedAsDuplicate: evidence.duplicateReplayRejectedAsDuplicate,
  matchingOrderCountAfterReplay: evidence.matchingOrderCountAfterReplay,
  orderIdSha256: evidence.orderIdSha256,
  checkoutSessionSha256: evidence.checkoutSessionSha256,
  paymentIntentSha256: evidence.paymentIntentSha256,
  stripeEventSha256: evidence.stripeEventSha256,
  paidAt: evidence.paidAt,
  secretValuesRecorded: false,
  recordedAt: new Date().toISOString()
} : {
  schemaVersion: 'ghosttown-acceptance-stripe-payment-webhook-v1',
  passed: false,
  diagnostics: evidence?.diagnostics || null,
  error: smokeError instanceof Error ? smokeError.message : String(smokeError || 'unknown failure'),
  secretValuesRecorded: false,
  recordedAt: new Date().toISOString()
};
writeFileSync(PROOF_PATH, JSON.stringify(proof, null, 2) + '\n');

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Stripe payment proof produced no evidence.');
console.log('[acceptance-stripe-payment] PASS: one recent Stripe test-mode $97 payment produced one signed-webhook-backed GhostTown Sprint entitlement.');
