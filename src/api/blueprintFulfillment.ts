import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { PaidTestOrder } from '../types/paidTest';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import { createGhostTownLaunchBlueprint } from './launchBlueprintGenerator';
import { renderLaunchBlueprintPdf } from './blueprintPdf';
import { loadBlueprintRecord, saveBlueprintRecord } from './blueprintStore';

const orderKey = (id: string) => `paid_test_order_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;

export interface LaunchBlueprintWorkflowParams {
  orderId: string;
  eventId: string;
}

export interface LaunchBlueprintWorkflowContext {
  order: PaidTestOrder;
  verdict: EvaluationResult;
}

function metadataOf(session: Record<string, unknown>): Record<string, unknown> {
  return session.metadata && typeof session.metadata === 'object' ? session.metadata as Record<string, unknown> : {};
}

function assertMetadata(metadata: Record<string, unknown>, key: string, expected: string): void {
  if (metadata[key] !== expected) throw new Error(`Stripe metadata ${key} mismatch`);
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function workflowId(orderId: string, eventId: string): string {
  return `launch-blueprint-${orderId}-${eventId}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
}

function hasConfirmedSeeds(order: PaidTestOrder): boolean {
  const count = order.intake.competitorSeeds?.length || 0;
  return count >= 2 && count <= 3;
}

function blueprintForPdf(blueprint: GhostTownLaunchBlueprint): GhostTownLaunchBlueprint {
  return {
    ...blueprint,
    customerAccessPack: {
      ...blueprint.customerAccessPack,
      channels: blueprint.customerAccessPack.channels.map(channel => ({
        ...channel,
        relevance: [
          channel.relevance,
          channel.competitorEvidence?.length
            ? `Competitor footprint evidence: ${channel.competitorEvidence.join(' ')}`
            : ''
        ].filter(Boolean).join(' '),
        participationRules: [
          channel.participationRules,
          channel.audienceOwner ? `Audience owner: ${channel.audienceOwner}.` : '',
          channel.accessPath ? `Public access path: ${channel.accessPath}` : ''
        ].filter(Boolean).join(' '),
        recommendedApproach: [
          channel.recommendedApproach,
          channel.preparedAsset ? `Prepared asset: ${channel.preparedAsset}` : '',
          channel.outreachScriptId ? `Matching outreach script: ${channel.outreachScriptId}.` : ''
        ].filter(Boolean).join(' ')
      }))
    }
  };
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
    planVersion: order.planVersion,
    fulfillmentWorkflowId: order.fulfillmentWorkflowId
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
    origin: 'cloudflare_workflow',
    orderId: order.orderId,
    ownerId: order.email,
    offerId: order.offerId,
    artifactType: order.artifactType,
    stripeMode: order.stripeMode,
    stripeEventId: order.stripeEventId,
    workflowId: order.fulfillmentWorkflowId,
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

export async function markLaunchBlueprintAwaitingSeeds(
  env: Env,
  orderId: string,
  session: Record<string, unknown>,
  eventId: string
): Promise<PaidTestOrder> {
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;
  verifySession(order, session);

  if (order.status === 'ready' && order.artifactType === 'launch_blueprint_v2') return order;
  const verdict = await savedVerdict(env, order.verdictId, order.email);
  if (!verdict) throw new Error('Source verdict not found');

  order.status = hasConfirmedSeeds(order) ? 'paid' : 'awaiting_seeds';
  order.artifactType = 'launch_blueprint_v2';
  order.planVersion = '2.0';
  order.stripeCheckoutSessionId = String(session.id || order.stripeCheckoutSessionId || '');
  order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  order.stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
  order.stripeEventId = eventId;
  order.paidAt = order.paidAt || new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  order.fulfillmentError = undefined;
  await env.KV.put(orderKey(orderId), JSON.stringify(order));
  await saveOrderSummary(env, order, verdict.idea.ideaName);
  return order;
}

export async function startLaunchBlueprintWorkflow(
  env: Env,
  orderId: string,
  eventId = `seeds_confirmed_${crypto.randomUUID()}`
): Promise<{ order: PaidTestOrder; workflowId: string }> {
  if (!env.LAUNCH_BLUEPRINT_WORKFLOW) throw new Error('Launch Blueprint Workflow binding is not configured');
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;

  if (order.status === 'ready' && order.artifactType === 'launch_blueprint_v2') {
    const stored = await loadBlueprintRecord(env, orderId);
    if (stored?.blueprint.qualityGate.passed) return { order, workflowId: order.fulfillmentWorkflowId || 'already-complete' };
    throw new Error('Ready order is missing its canonical Launch Blueprint record');
  }
  if (order.status === 'researching' || order.status === 'generating') {
    return { order, workflowId: order.fulfillmentWorkflowId || 'already-running' };
  }
  if (!order.paidAt || !order.stripeCheckoutSessionId) throw new Error('Paid checkout has not been verified');
  if (!hasConfirmedSeeds(order)) throw new Error('Confirm two or three competitor or adjacent-product seeds before research starts');

  const verdict = await savedVerdict(env, order.verdictId, order.email);
  if (!verdict) throw new Error('Source verdict not found');
  const instanceId = workflowId(orderId, eventId);
  order.status = 'researching';
  order.artifactType = 'launch_blueprint_v2';
  order.planVersion = '2.0';
  order.updatedAt = new Date().toISOString();
  order.fulfillmentError = undefined;
  order.fulfillmentWorkflowId = instanceId;
  order.fulfillmentAttemptCount = (order.fulfillmentAttemptCount || 0) + 1;
  await env.KV.put(orderKey(orderId), JSON.stringify(order));
  await saveOrderSummary(env, order, verdict.idea.ideaName);

  try {
    const instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.create({
      id: instanceId,
      params: { orderId, eventId }
    });
    order.fulfillmentWorkflowId = instance.id;
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await saveOrderSummary(env, order, verdict.idea.ideaName);
    return { order, workflowId: instance.id };
  } catch (error) {
    order.status = 'failed';
    order.fulfillmentError = error instanceof Error ? error.message : 'Launch Blueprint Workflow could not start';
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await saveOrderSummary(env, order, verdict.idea.ideaName);
    throw error;
  }
}

export async function queueLaunchBlueprintOrder(
  env: Env,
  orderId: string,
  session: Record<string, unknown>,
  eventId: string
): Promise<{ order: PaidTestOrder; workflowId: string }> {
  const order = await markLaunchBlueprintAwaitingSeeds(env, orderId, session, eventId);
  if (!hasConfirmedSeeds(order)) return { order, workflowId: 'awaiting-seeds' };
  return startLaunchBlueprintWorkflow(env, orderId, eventId);
}

export async function loadLaunchBlueprintWorkflowContext(env: Env, orderId: string): Promise<LaunchBlueprintWorkflowContext> {
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;
  if (!hasConfirmedSeeds(order)) throw new Error('Confirmed competitor seeds are missing');
  const verdict = await savedVerdict(env, order.verdictId, order.email);
  if (!verdict) throw new Error('Source verdict not found');
  return { order, verdict };
}

export async function markLaunchBlueprintGenerating(env: Env, orderId: string): Promise<PaidTestOrder> {
  const context = await loadLaunchBlueprintWorkflowContext(env, orderId);
  context.order.status = 'generating';
  context.order.updatedAt = new Date().toISOString();
  context.order.fulfillmentError = undefined;
  await env.KV.put(orderKey(orderId), JSON.stringify(context.order));
  await saveOrderSummary(env, context.order, context.verdict.idea.ideaName);
  return context.order;
}

export async function completeLaunchBlueprintOrder(
  env: Env,
  orderId: string,
  result: CustomerAccessResearchResult
): Promise<PaidTestOrder> {
  const { order, verdict } = await loadLaunchBlueprintWorkflowContext(env, orderId);
  const blueprint = createGhostTownLaunchBlueprint(order, verdict, result.research, order.paidAt);
  blueprint.generationReceipt.model = result.receipt.model;
  blueprint.generationReceipt.promptVersion = 'distribution-footprint-v1';
  blueprint.generationReceipt.fallbackStatus = 'ai_enriched';
  blueprint.generationReceipt.fallbackReason = undefined;
  if (!blueprint.qualityGate.passed) {
    throw new Error(`Launch Blueprint quality gate failed: ${blueprint.qualityGate.failures.join(' | ')}`);
  }

  const pdf = renderLaunchBlueprintPdf(blueprintForPdf(blueprint));
  await saveBlueprintRecord(env, blueprint, result.receipt, pdf);

  order.status = 'ready';
  order.artifactType = 'launch_blueprint_v2';
  order.planVersion = '2.0';
  order.fulfillmentError = undefined;
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(orderId), JSON.stringify(order));
  await saveOrderSummary(env, order, verdict.idea.ideaName);
  await recordCompletion(env, order);
  return order;
}

export async function failLaunchBlueprintOrder(env: Env, orderId: string, error: unknown): Promise<void> {
  const context = await loadLaunchBlueprintWorkflowContext(env, orderId).catch(() => null);
  if (!context) return;
  context.order.status = 'failed';
  context.order.artifactType = 'launch_blueprint_v2';
  context.order.planVersion = '2.0';
  context.order.fulfillmentError = error instanceof Error ? error.message : 'Launch Blueprint generation failed';
  context.order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(orderId), JSON.stringify(context.order));
  await saveOrderSummary(env, context.order, context.verdict.idea.ideaName);
}
