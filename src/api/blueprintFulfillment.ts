import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import { researchCustomerAccess } from './customerAccessResearch';
import { createGhostTownLaunchBlueprint } from './launchBlueprintGenerator';
import { renderLaunchBlueprintPdf } from './blueprintPdf';
import { loadBlueprintRecord, saveBlueprintRecord } from './blueprintStore';

const orderKey = (id: string) => `paid_test_order_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;

function metadataOf(session: Record<string, unknown>): Record<string, unknown> {
  return session.metadata && typeof session.metadata === 'object' ? session.metadata as Record<string, unknown> : {};
}

function assertMetadata(metadata: Record<string, unknown>, key: string, expected: string): void {
  if (metadata[key] !== expected) throw new Error(`Stripe metadata ${key} mismatch`);
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function savedVerdict(env: Env, verdictId: string, email: string): Promise<EvaluationResult | null> {
  const normalized = normalizedEmail(email);
  const raw = await env.KV.get(`verdict_${verdictId}`)
    ?? await env.KV.get(`verdict:${verdictId}`)
    ?? await env.KV.get(`user_result_${normalized}_${verdictId}`);
  return raw ? JSON.parse(raw) as EvaluationResult : null;
}

export function isLaunchBlueprintCheckout(session: Record<string, unknown>): boolean {
  const metadata = metadataOf(session);
  return metadata.offer_id === GHOSTTOWN_30_DAY_PLAN_V1.offerId
    && (metadata.fulfillment_type === 'execution_plan_30day_v1' || metadata.fulfillment_type === 'launch_blueprint_v2');
}

async function saveOrderSummary(env: Env, order: PaidTestOrder, ideaName: string): Promise<void> {
  const key = userOrdersKey(order.email);
  const raw = await env.KV.get(key);
  const existing = raw ? JSON.parse(raw) as Array<Record<string, unknown>> : [];
  const summary = {
    orderId: order.orderId,
    ideaName,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    artifactType: order.artifactType,
    offerName: 'GhostTown Launch Blueprint',
    sourceVerdictId: order.verdictId,
    planVersion: order.planVersion
  };
  const next = [summary, ...existing.filter(item => item.orderId !== order.orderId)]
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .slice(0, 50);
  await env.KV.put(key, JSON.stringify(next));
}

async function recordCompletion(env: Env, order: PaidTestOrder): Promise<void> {
  const now = new Date().toISOString();
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify({
    eventName: 'launch_blueprint_completed',
    origin: 'stripe_webhook',
    orderId: order.orderId,
    ownerId: order.email,
    offerId: order.offerId,
    artifactType: order.artifactType,
    stripeMode: order.stripeMode,
    stripeEventId: order.stripeEventId,
    createdAt: now
  }), { expirationTtl: 86400 * 365 });
}

function verifySession(order: PaidTestOrder, session: Record<string, unknown>): void {
  const metadata = metadataOf(session);
  assertMetadata(metadata, 'paid_test_order_id', order.orderId);
  assertMetadata(metadata, 'owner_id', order.email);
  assertMetadata(metadata, 'offer_id', GHOSTTOWN_30_DAY_PLAN_V1.offerId);
  assertMetadata(metadata, 'offer_version', GHOSTTOWN_30_DAY_PLAN_V1.version);
  assertMetadata(metadata, 'offer_amount_cents', String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents));
  assertMetadata(metadata, 'offer_currency', GHOSTTOWN_30_DAY_PLAN_V1.currency);
  if (order.stripePriceId) assertMetadata(metadata, 'stripe_price_id', order.stripePriceId);
  const sessionMode = typeof session.livemode === 'boolean' && session.livemode ? 'live' : 'test';
  if (order.stripeMode && sessionMode !== order.stripeMode) throw new Error('Stripe mode mismatch');
  if (session.mode !== undefined && session.mode !== 'payment') throw new Error('Stripe checkout mode mismatch');
  if (session.payment_status !== undefined && session.payment_status !== 'paid') throw new Error('Stripe session is not paid');
}

export async function fulfillLaunchBlueprintOrder(
  env: Env,
  orderId: string,
  session: Record<string, unknown>,
  eventId?: string
): Promise<PaidTestOrder> {
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;
  verifySession(order, session);

  if (order.status === 'ready' && order.artifactType === 'launch_blueprint_v2') {
    const stored = await loadBlueprintRecord(env, orderId);
    if (stored?.blueprint.qualityGate.passed) return order;
    throw new Error('Ready order is missing its canonical Launch Blueprint record');
  }

  const verdict = await savedVerdict(env, order.verdictId, order.email);
  if (!verdict) throw new Error('Source verdict not found');

  order.status = 'researching';
  order.stripeCheckoutSessionId = String(session.id || order.stripeCheckoutSessionId || '');
  order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  order.stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
  order.stripeEventId = eventId;
  order.paidAt = order.paidAt || new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  order.fulfillmentError = undefined;
  await env.KV.put(orderKey(orderId), JSON.stringify(order));
  await saveOrderSummary(env, order, verdict.idea.ideaName);

  try {
    const { research, receipt } = await researchCustomerAccess(env, order, verdict);
    order.status = 'generating';
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await saveOrderSummary(env, order, verdict.idea.ideaName);

    const blueprint = createGhostTownLaunchBlueprint(order, verdict, research, order.paidAt);
    blueprint.generationReceipt.model = receipt.model;
    blueprint.generationReceipt.promptVersion = 'customer-access-google-v1';
    blueprint.generationReceipt.fallbackStatus = 'ai_enriched';
    blueprint.generationReceipt.fallbackReason = undefined;
    if (!blueprint.qualityGate.passed) throw new Error(`Launch Blueprint quality gate failed: ${blueprint.qualityGate.failures.join(' | ')}`);

    const pdf = renderLaunchBlueprintPdf(blueprint);
    await saveBlueprintRecord(env, blueprint, receipt, pdf);

    order.status = 'ready';
    order.artifactType = 'launch_blueprint_v2';
    order.planVersion = '2.0';
    order.fulfillmentError = undefined;
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await saveOrderSummary(env, order, verdict.idea.ideaName);
    await recordCompletion(env, order);
    return order;
  } catch (error) {
    order.status = 'failed';
    order.artifactType = 'launch_blueprint_v2';
    order.planVersion = '2.0';
    order.fulfillmentError = error instanceof Error ? error.message : 'Launch Blueprint generation failed';
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await saveOrderSummary(env, order, verdict.idea.ideaName);
    throw error;
  }
}
