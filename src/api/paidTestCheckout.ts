import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestIntake, PaidTestOrder, PaidArtifactType, StripeMode } from '../types/paidTest';
import type { PrePurchaseResearchSignals, ResearchSignalType } from '../types/researchSignals';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import {
  DEFAULT_30_DAY_PLAN_DISPLAY_PRICE,
  GHOSTTOWN_30_DAY_PLAN_V1,
  LEGACY_7_DAY_PLAN_LABEL
} from '../lib/ghosttownOffer';
import {
  appendStripeAttributionMetadata,
  commercialEventAttribution,
  sanitizeCommercialAttribution
} from './commercialAttribution';
import { recordCommercialFunnelEvent } from './analytics';

const PLAN_VERSION = '1.0' as const;
const LEGACY_REPORT_VERSION = '1.0' as const;
const orderKey = (id: string) => `paid_test_order_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function inferStripeMode(secretKey?: string): StripeMode {
  return secretKey?.startsWith('sk_live_') ? 'live' : 'test';
}

function configuredPlanPriceId(env: Env): string {
  return env.STRIPE_30_DAY_PLAN_PRICE_ID?.trim() || '';
}

function validResearchSignals(value: PrePurchaseResearchSignals, verdictId: string, targetBuyer: string): boolean {
  if (
    value.schemaVersion !== 'pre-purchase-research-signals-v1'
    || value.resultId !== verdictId
    || value.targetCustomer.trim() !== targetBuyer
    || value.origin !== 'free_verdict'
    || !['unverified', 'provider_candidate', 'verified'].includes(value.verificationStatus)
  ) return false;
  for (const type of ['commercial', 'audience', 'ecosystem'] as ResearchSignalType[]) {
    const signal = value[type];
    if (!signal) continue;
    if (
      signal.type !== type
      || !signal.value?.trim()
      || signal.value.length > 160
      || !['user_typed', 'suggestion', 'not_sure'].includes(signal.source)
      || !['unverified', 'provider_candidate', 'verified'].includes(signal.verificationStatus)
    ) return false;
    if (signal.publicUrl) {
      try {
        const url = new URL(signal.publicUrl);
        if (url.protocol !== 'https:' || url.username || url.password) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

function validIntake(value: Partial<PaidTestIntake>): value is PaidTestIntake {
  const verdictId = typeof value.verdictId === 'string' ? value.verdictId.trim() : '';
  const targetBuyer = typeof value.targetBuyer === 'string' ? value.targetBuyer.trim() : '';
  if (!Boolean(verdictId && targetBuyer && value.problem?.trim() && value.currentWorkaround?.trim())) return false;
  return !value.researchSignals || validResearchSignals(value.researchSignals, verdictId, targetBuyer);
}

function normalizedResearchSignals(value: PrePurchaseResearchSignals | undefined): PrePurchaseResearchSignals | undefined {
  if (!value) return undefined;
  const normalized = { ...value, updatedAt: new Date().toISOString() };
  for (const type of ['commercial', 'audience', 'ecosystem'] as ResearchSignalType[]) {
    const signal = normalized[type];
    if (!signal) continue;
    normalized[type] = {
      ...signal,
      value: signal.value.replace(/\s+/g, ' ').trim(),
      publicUrl: signal.publicUrl?.trim()
    };
  }
  return normalized;
}

async function savedVerdict(env: Env, verdictId: string, email?: string): Promise<EvaluationResult | null> {
  const normalizedEmail = email ? normalizeEmail(email) : '';
  const raw = await env.KV.get(`verdict_${verdictId}`)
    ?? await env.KV.get(`verdict:${verdictId}`)
    ?? (normalizedEmail ? await env.KV.get(`user_result_${normalizedEmail}_${verdictId}`) : null);
  return raw ? hydrateEvaluationResultDecisionV2(JSON.parse(raw) as EvaluationResult) : null;
}

interface PaidOrderSummary {
  orderId: string;
  ideaName: string;
  status: PaidTestOrder['status'];
  createdAt: string;
  updatedAt: string;
  artifactType: PaidArtifactType;
  offerName: string;
  sourceVerdictId: string;
  planVersion?: string;
}

async function savePaidOrderSummary(env: Env, order: PaidTestOrder, ideaName: string): Promise<void> {
  const key = userOrdersKey(order.email);
  const raw = await env.KV.get(key);
  const existing = raw ? JSON.parse(raw) as PaidOrderSummary[] : [];
  const artifactType = order.artifactType ?? 'execution_plan_30day_v1';
  const summary: PaidOrderSummary = {
    orderId: order.orderId,
    ideaName,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    artifactType,
    offerName: artifactType === 'execution_plan_30day_v1' ? GHOSTTOWN_30_DAY_PLAN_V1.name : LEGACY_7_DAY_PLAN_LABEL,
    sourceVerdictId: order.verdictId,
    planVersion: artifactType === 'execution_plan_30day_v1' ? order.planVersion ?? PLAN_VERSION : order.reportVersion
  };
  const orders = [summary, ...existing.filter(item => item.orderId !== order.orderId)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);
  await env.KV.put(key, JSON.stringify(orders));
}

export async function handlePaidTestCheckout(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    console.warn('Paid checkout rejected: authentication required');
    return json({ error: 'Please log in again before checkout' }, 401);
  }

  const intake = await request.json<Partial<PaidTestIntake>>();
  if (!validIntake(intake)) {
    console.warn('Paid checkout rejected: incomplete intake');
    return json({ error: 'Complete all required 30-day plan fields' }, 400);
  }

  const verdict = await savedVerdict(env, intake.verdictId, auth.email);
  if (!verdict) {
    console.warn('Paid checkout rejected: source verdict not found', intake.verdictId);
    return json({ error: 'This assessment must be saved before checkout. Reopen it from Dashboard and try again.' }, 404);
  }

  const stripePriceId = configuredPlanPriceId(env);
  if (!stripePriceId) {
    console.error('Paid checkout rejected: missing 30-day plan Stripe price configuration');
    return json({ error: 'Checkout is not configured for the 30-day plan yet' }, 503);
  }

  const attribution = sanitizeCommercialAttribution(intake.attribution, intake.verdictId);
  const now = new Date().toISOString();
  const order: PaidTestOrder = {
    orderId: id('gtt'),
    email: normalizeEmail(auth.email),
    verdictId: intake.verdictId,
    status: 'pending',
    artifactType: 'execution_plan_30day_v1',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: GHOSTTOWN_30_DAY_PLAN_V1.version,
    planVersion: PLAN_VERSION,
    reportVersion: LEGACY_REPORT_VERSION,
    stripePriceId,
    stripeMode: inferStripeMode(env.STRIPE_SECRET_KEY),
    idempotencyKey: id('idem'),
    commercialAttribution: attribution,
    intake: {
      ...intake,
      targetBuyer: intake.targetBuyer.trim(),
      problem: intake.problem.trim(),
      currentWorkaround: intake.currentWorkaround.trim(),
      offerHypothesis: intake.offerHypothesis?.trim(),
      expectedPrice: intake.expectedPrice?.trim(),
      competitorLinks: intake.competitorLinks?.map(item => item.trim()).filter(Boolean),
      researchSignals: normalizedResearchSignals(intake.researchSignals),
      attribution: undefined
    },
    createdAt: now,
    updatedAt: now
  };

  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));

  const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  const fields = new URLSearchParams({
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    customer_email: order.email,
    client_reference_id: order.orderId,
    'metadata[paid_test_order_id]': order.orderId,
    'metadata[owner_id]': order.email,
    'metadata[offer_id]': GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    'metadata[offer_version]': GHOSTTOWN_30_DAY_PLAN_V1.version,
    'metadata[offer_amount_cents]': String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents),
    'metadata[offer_currency]': GHOSTTOWN_30_DAY_PLAN_V1.currency,
    'metadata[plan_version]': PLAN_VERSION,
    'metadata[stripe_price_id]': stripePriceId,
    'metadata[fulfillment_type]': 'execution_plan_30day_v1',
    success_url: `${frontendUrl}/paid-test/success?order_id=${encodeURIComponent(order.orderId)}`,
    cancel_url: `${frontendUrl}/`
  });
  appendStripeAttributionMetadata(fields, attribution, intake.verdictId);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: fields.toString()
  });

  if (!response.ok) {
    const stripeError = await response.text();
    console.error('Paid checkout Stripe rejection', response.status, stripeError);
    await env.KV.delete(orderKey(order.orderId));
    return json({ error: 'Stripe rejected the 30-day plan checkout configuration. Confirm the price mode and STRIPE_30_DAY_PLAN_PRICE_ID.' }, 502);
  }

  const session = await response.json() as { id: string; url: string };
  order.stripeCheckoutSessionId = session.id;
  order.status = 'checkout_created';
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  await savePaidOrderSummary(env, order, verdict.idea.ideaName);
  try {
    await recordCommercialFunnelEvent(env, 'checkout_started', {
      ownerId: order.email,
      orderId: order.orderId,
      verdictId: order.verdictId,
      content: DEFAULT_30_DAY_PLAN_DISPLAY_PRICE,
      ...commercialEventAttribution(order.commercialAttribution)
    });
  } catch (error) {
    // A telemetry KV write must never hide a successfully created Stripe session
    // from the customer. Q5 acceptance verifies measurement independently.
    console.warn('Commercial checkout_started event could not be recorded', error);
  }
  return json({ sessionUrl: session.url, orderId: order.orderId, offerId: order.offerId });
}
