import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import { loadLaunchBlueprintWorkflowContext } from './blueprintFulfillment';
import { renderLaunchBlueprintPdfV21 } from './blueprintPdfV21';
import { composeBlueprintDocumentModel } from './blueprintDocumentModel';
import { renderBlueprintDocumentHtml } from './blueprintDocumentHtml';
import { createGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';
import {
  prepareBlueprintGenerationReceiptV21,
  saveBlueprintRecordV21,
  sha256Hex
} from './blueprintStoreV21';
import {
  assertBlueprintReleaseQualityGateV21,
  evaluateBlueprintReleaseQualityGateV21
} from './blueprintReleaseQualityGateV21';
import { verifyBlueprintDeliveryStateExactV21 } from './blueprintDeliveryVerifierV21';

const orderKey = (id: string) => `paid_test_order_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;

export interface CompleteLaunchBlueprintOrderV21Options {
  blueprint?: GhostTownLaunchBlueprintV21;
  vertexRequired?: boolean;
}

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
  return;
}

async function persistLifecycle(
  env: Env,
  order: PaidTestOrder,
  ideaName: string
): Promise<PaidTestOrder> {
  order.artifactType = 'launch_blueprint_v2';
  order.planVersion = '2.0';
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  await saveOrderSummaryV21(env, order, ideaName);
  return order;
}

async function recordCompletionV21(
  env: Env,
  order: PaidTestOrder,
  contractVersion: GhostTownLaunchBlueprintV21['contractVersion'],
  canonicalBlueprintSha256: string,
  canonicalSourceHash: string
): Promise<void> {
  const now = new Date().toISOString();
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify({
    eventName: 'launch_blueprint_completed',
    origin: 'cloudflare_workflow',
    orderId: order.orderId,
    ownerId: order.email,
    offerId: order.offerId,
    artifactType: order.artifactType,
    planVersion: order.planVersion,
    contractVersion,
    canonicalBlueprintSha256,
    canonicalSourceHash,
    stripeMode: order.stripeMode,
    stripeEventId: order.stripeEventId,
    workflowId: order.fulfillmentWorkflowId,
    createdAt: now
  }), { expirationTtl: 86400 * 365 });
}

function assertVertexPipelineComplete(
  blueprint: GhostTownLaunchBlueprintV21,
  required: boolean
): void {
  const receipt = blueprint.generationReceipt.vertexPipeline;
  if (!required) return;
  if (!receipt || receipt.status !== 'complete' || !receipt.required) {
    throw new Error('Launch Blueprint v2.1 requires a completed staged Vertex pipeline receipt');
  }
  const expectedStages = [
    'evidence_normalization',
    'strategy_synthesis',
    'asset_generation',
    'red_team_review'
  ];
  const stages = receipt.stages.map(stage => stage.stage);
  if (stages.join(',') !== expectedStages.join(',')) {
    throw new Error(`Launch Blueprint v2.1 Vertex stage receipt mismatch: ${stages.join(',')}`);
  }
  if (!receipt.redTeam.passed || receipt.redTeam.findings.some(finding => finding.severity === 'blocking')) {
    throw new Error('Launch Blueprint v2.1 red-team receipt did not pass');
  }
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
 * PDF, JSON, stable 16-file ZIP, research receipt, exact source hash, and Step 3
 * exact-byte integrity receipt have all passed their gates and persisted.
 */
export async function completeLaunchBlueprintOrderV21(
  env: Env,
  orderId: string,
  result: CustomerAccessResearchResult,
  options: CompleteLaunchBlueprintOrderV21Options = {}
): Promise<PaidTestOrder> {
  const { order, verdict } = await loadLaunchBlueprintWorkflowContext(env, orderId);
  const blueprint = options.blueprint || createGhostTownLaunchBlueprintV21(
    order,
    verdict,
    result.research,
    order.paidAt
  );
  const vertexRequired = options.vertexRequired === true;

  assertVertexPipelineComplete(blueprint, vertexRequired);

  if (blueprint.generationReceipt.vertexPipeline?.status !== 'complete') {
    blueprint.generationReceipt.model = blueprint.generationReceipt.model || result.receipt.model;
    blueprint.generationReceipt.promptVersion = blueprint.generationReceipt.promptVersion ||
      'distribution-footprint-v1+canonical-blueprint-v2.1';
    if (!blueprint.generationReceipt.vertexPipeline) {
      blueprint.generationReceipt.fallbackStatus = 'deterministic_only';
      blueprint.generationReceipt.fallbackReason = 'Staged Vertex generation was not required for this environment.';
    }
  }

  if (!blueprint.qualityGate.passed) {
    throw new Error(`Launch Blueprint v2.1 quality gate failed: ${blueprint.qualityGate.failures.join(' | ')}`);
  }

  assertBlueprintReleaseQualityGateV21(evaluateBlueprintReleaseQualityGateV21({ blueprint, research: result }));

  await prepareBlueprintGenerationReceiptV21(
    env,
    order,
    verdict,
    result,
    blueprint,
    vertexRequired
  );

  const documentModel = composeBlueprintDocumentModel(blueprint);
  const documentHtml = renderBlueprintDocumentHtml(documentModel);
  const pdf = renderLaunchBlueprintPdfV21(blueprint);
  const css = documentHtml.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '';
  const documentReceipt = {
    modelVersion: 'ghosttown-blueprint-document-model-v1' as const,
    renderMode: 'deterministic_fallback' as const,
    modelSha256: await sha256Hex(new TextEncoder().encode(JSON.stringify(documentModel))),
    htmlSha256: await sha256Hex(new TextEncoder().encode(documentHtml)),
    cssSha256: await sha256Hex(new TextEncoder().encode(css))
  };
  const exactReceipt = await saveBlueprintRecordV21(env, blueprint, result.receipt, pdf, documentReceipt);
  const delivery = await verifyBlueprintDeliveryStateExactV21(env, blueprint, exactReceipt);
  assertBlueprintReleaseQualityGateV21(evaluateBlueprintReleaseQualityGateV21({ blueprint, research: result, delivery }));

  order.status = 'ready';
  order.fulfillmentError = undefined;
  await persistLifecycle(env, order, verdict.idea.ideaName);
  await recordCompletionV21(
    env,
    order,
    blueprint.contractVersion,
    exactReceipt.hashes.canonicalBlueprintSha256,
    blueprint.generationReceipt.canonicalContract.gitBlobSha1
  );
  return order;
}
