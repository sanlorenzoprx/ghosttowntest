import type { DistributionFootprintPlan, ResearchBatchResult } from './distributionFootprintResearch';

export interface ResearchGapSummary {
  verifiedCandidateCount: number;
  currentCustomerAccessCount: number;
  successfulProviderTypes: number;
  missingVerifiedCandidates: number;
  missingCurrentCustomerAccess: number;
  missingProviderTypes: number;
}

export interface AdaptiveExpansionPlan {
  sourceIds: string[];
  queryBySourceId: Record<string, string>;
  selectedIntentIds: string[];
}

function uniqueCandidates(batches: ResearchBatchResult[]) {
  const byUrl = new Map<string, ResearchBatchResult['candidates'][number]>();
  for (const candidate of batches.flatMap(batch => batch.candidates)) {
    const key = candidate.publicUrl.toLowerCase().replace(/\/$/, '');
    if (!key) continue;
    const existing = byUrl.get(key);
    if (!existing || candidate.currentActivityStatus === 'verified_current') byUrl.set(key, candidate);
  }
  return [...byUrl.values()];
}

export function summarizeResearchGap(
  batches: ResearchBatchResult[],
  minimumVerifiedTargets = 10,
  minimumCurrentCustomerAccess = 3,
  minimumProviderTypes = 2
): ResearchGapSummary {
  const candidates = uniqueCandidates(batches);
  const currentCustomerAccessCount = candidates.filter(candidate =>
    candidate.targetTypeHint === 'community'
    && candidate.currentActivityStatus === 'verified_current'
    && Boolean(candidate.currentActivityVerifiedAt)
  ).length;
  const successfulProviderTypes = new Set(
    batches.flatMap(batch => batch.attempts)
      .filter(attempt => attempt.outcome === 'SUCCESS' || attempt.success)
      .map(attempt => attempt.sourceType)
  ).size;
  return {
    verifiedCandidateCount: candidates.length,
    currentCustomerAccessCount,
    successfulProviderTypes,
    missingVerifiedCandidates: Math.max(0, minimumVerifiedTargets - candidates.length),
    missingCurrentCustomerAccess: Math.max(0, minimumCurrentCustomerAccess - currentCustomerAccessCount),
    missingProviderTypes: Math.max(0, minimumProviderTypes - successfulProviderTypes)
  };
}

export function needsAdaptiveSecondPass(gap: ResearchGapSummary): boolean {
  return gap.missingVerifiedCandidates > 0
    || gap.missingCurrentCustomerAccess > 0
    || gap.missingProviderTypes > 0;
}

export function buildAdaptiveExpansionPlan(
  plan: DistributionFootprintPlan,
  gap: ResearchGapSummary,
  maxTasks = 8
): AdaptiveExpansionPlan {
  if (!needsAdaptiveSecondPass(gap)) return { sourceIds: [], queryBySourceId: {}, selectedIntentIds: [] };

  const prioritized = [...plan.expansionIntents].sort((left, right) => {
    if (gap.missingCurrentCustomerAccess > 0 && left.evidenceGoal !== right.evidenceGoal) {
      return left.evidenceGoal === 'customer_access' ? -1 : 1;
    }
    return left.intentId.localeCompare(right.intentId);
  });

  const sourceIds: string[] = [];
  const queryBySourceId: Record<string, string> = {};
  const selectedIntentIds: string[] = [];
  const seenQueries = new Set<string>();

  for (const intent of prioritized) {
    const key = intent.query.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seenQueries.has(key)) continue;
    seenQueries.add(key);
    const sourceId = `web:adaptive:${intent.intentId}`;
    sourceIds.push(sourceId);
    queryBySourceId[sourceId] = intent.query;
    selectedIntentIds.push(intent.intentId);
    if (sourceIds.length >= Math.max(1, Math.min(8, maxTasks))) break;
  }

  return { sourceIds, queryBySourceId, selectedIntentIds };
}

export function mergeAdaptivePlan(
  base: DistributionFootprintPlan,
  adaptive: AdaptiveExpansionPlan
): DistributionFootprintPlan {
  return {
    ...base,
    sourceIds: adaptive.sourceIds,
    queryBySourceId: adaptive.queryBySourceId
  };
}
