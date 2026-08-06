import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import { loadLaunchBlueprintWorkflowContext } from './blueprintFulfillment';
import { saveBlueprintRecord } from './blueprintStore';
import { renderLaunchBlueprintPdfV21 } from './blueprintPdfV21';
import { createGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';

const orderKey = (id: string) => `paid_test_order_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;

async function saveOrderSummaryV21(env: Env, order: PaidTestOrder, ideaName: string): Promise<void> {
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

async function persistLifecycle(
  env: Env,
  order: PaidTestOrder,
  ideaName: string
): Promise<PaidTestOrder> {
  order.artifactType = 'launch_blueprint_v2';
  order.planVersion = '2.1';
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  await saveOrderSummaryV21(env, order, ideaName);
  return order;
}

async function recordCompletionV21(env: Env, order: PaidTestOrder, canonicalHash: string): Promise<void> {
  const now = new Date().toISOString();
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify({
    eventName: 'launch_blueprint_completed',
    origin: 'cloudflare_workflow',
    orderId: order.orderId,
    ownerId: order.email,
    offerId: order.offerId,
    artifactType: order.artifactType,
    planVersion: order.planVersion,
    canonicalHash,
    stripeMode: order.stripeMode,
    stripeEventId: order.stripeEventId,
    workflowId: order.fulfillmentWorkflowId,
    createdAt: now
  }), { expirationTtl: 86400 * 365 });
}

export async function markLaunchBlueprintGeneratingV21(
  env: Env,
  orderId: string
): Promise<PaidTestOrder> {
  const { order, verdict } = await loadLaunchBlueprintWorkflowContext(env, orderId);
  order.status = 'generating';
  order.fulfillmentError = undefined;
  return persistLifecycle(env, order, verdict.idea.ideaName);
}

export async function failLaunchBlueprintOrderV21(
  env: Env,
  orderId: string,
  error: unknown
): Promise<void> {
  const context = await loadLaunchBlueprintWorkflowContext(env, orderId).catch(() => null);
  if (!context) return;
  context.order.status = 'failed';
  context.order.fulfillmentError = error instanceof Error
    ? error.message
    : 'Launch Blueprint v2.1 generation failed';
  await persistLifecycle(env, context.order, context.verdict.idea.ideaName);
}

/**
 * A paid order becomes ready only after the v2.1 canonical record, decision-first
 * PDF, JSON, stable 16-file ZIP, research receipt, and exact source hash have all
 * passed their gates and persisted. There is no intermediate ready v2.0 state.
 */
export async function completeLaunchBlueprintOrderV21(
  env: Env,
  orderId: string,
  result: CustomerAccessResearchResult
): Promise<PaidTestOrder> {
  const { order, verdict } = await loadLaunchBlueprintWorkflowContext(env, orderId);
  const blueprint = createGhostTownLaunchBlueprintV21(
    order,
    verdict,
    result.research,
    order.paidAt
  );
  blueprint.generationReceipt.model = result.receipt.model;
  blueprint.generationReceipt.promptVersion = 'distribution-footprint-v1+canonical-blueprint-v2.1';
  blueprint.generationReceipt.fallbackStatus = 'ai_enriched';
  blueprint.generationReceipt.fallbackReason = undefined;

  if (!blueprint.qualityGate.passed) {
    throw new Error(`Launch Blueprint v2.1 quality gate failed: ${blueprint.qualityGate.failures.join(' | ')}`);
  }

  const pdf = renderLaunchBlueprintPdfV21(blueprint);
  await saveBlueprintRecord(env, blueprint, result.receipt, pdf);

  order.status = 'ready';
  order.fulfillmentError = undefined;
  await persistLifecycle(env, order, verdict.idea.ideaName);
  await recordCompletionV21(
    env,
    order,
    blueprint.generationReceipt.canonicalContract.gitBlobSha1
  );
  return order;
}
