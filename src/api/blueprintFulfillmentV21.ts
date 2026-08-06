import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import {
  completeLaunchBlueprintOrder,
  loadLaunchBlueprintWorkflowContext
} from './blueprintFulfillment';
import { loadBlueprintRecord, saveBlueprintRecord } from './blueprintStore';
import { renderLaunchBlueprintPdf } from './blueprintPdf';
import { upgradeGhostTownLaunchBlueprintToV21 } from './launchBlueprintGeneratorV21';

/**
 * Preserve the proven v2 fulfillment path, then atomically replace the stored
 * customer artifacts with the canonical v2.1-enriched record before the
 * Workflow reports success. A v2.1 quality failure is allowed to bubble to the
 * Workflow catch path, which marks the paid order failed instead of silently
 * delivering a weakened artifact.
 */
export async function completeLaunchBlueprintOrderV21(
  env: Env,
  orderId: string,
  result: CustomerAccessResearchResult
): Promise<PaidTestOrder> {
  const context = await loadLaunchBlueprintWorkflowContext(env, orderId);
  const completedOrder = await completeLaunchBlueprintOrder(env, orderId, result);
  const stored = await loadBlueprintRecord(env, orderId);
  if (!stored) throw new Error('Canonical v2 Blueprint record was not available for v2.1 enrichment');

  const blueprint = upgradeGhostTownLaunchBlueprintToV21(
    stored.blueprint,
    context.order,
    context.verdict
  );
  if (!blueprint.qualityGate.passed) {
    throw new Error(`Launch Blueprint v2.1 quality gate failed: ${blueprint.qualityGate.failures.join(' | ')}`);
  }

  const pdf = renderLaunchBlueprintPdf(blueprint);
  await saveBlueprintRecord(env, blueprint, stored.researchReceipt, pdf);
  return completedOrder;
}
