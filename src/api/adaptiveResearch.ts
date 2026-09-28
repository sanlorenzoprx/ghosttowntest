import type { CompetitorReviewIntelligence } from '../types/launchBlueprint';
import type { DistributionFootprintPlan, ResearchBatchResult } from './distributionFootprintResearch';
import {
  evaluateResearchEvidenceSufficiency,
  RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS,
  type ResearchEvidenceSufficiency
} from './researchEvidenceSufficiency';

export interface ResearchGapSummary extends ResearchEvidenceSufficiency {
  missingCurrentCustomerAccess: number;
  missingProblemLanguageObservations: number;
  missingCompetitiveAlternativeSources: number;
}

export interface AdaptiveExpansionPlan {
  sourceIds: string[];
  queryBySourceId: Record<string, string>;
  selectedIntentIds: string[];
}

export function summarizeResearchGap(
  batches: ResearchBatchResult[],
  competitorReviewIntelligence?: CompetitorReviewIntelligence
): ResearchGapSummary {
  const sufficiency = evaluateResearchEvidenceSufficiency(batches, competitorReviewIntelligence);
  return {
    ...sufficiency,
    missingCurrentCustomerAccess: Math.max(
      0,
      RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.currentCustomerAccess - sufficiency.currentCustomerAccessCount
    ),
    missingProblemLanguageObservations: Math.max(
      0,
      RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.problemLanguageObservations - sufficiency.problemLanguageObservationCount
    ),
    missingCompetitiveAlternativeSources: Math.max(
      0,
      RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.competitiveAlternativeSources - sufficiency.competitiveAlternativeSourceCount
    )
  };
}

export function needsAdaptiveSecondPass(gap: ResearchGapSummary): boolean {
  // Verified original community pages and YouTube comment threads can provide
  // first-person problem language, so a missing problem-language role is a
  // legitimate reason for bounded adaptive expansion.
  return gap.missingCurrentCustomerAccess > 0
    || gap.missingProblemLanguageObservations > 0
    || gap.missingCompetitiveAlternativeSources > 0;
}

function intentPriority(
  intent: DistributionFootprintPlan['expansionIntents'][number],
  gap: ResearchGapSummary
): number {
  if (gap.missingCurrentCustomerAccess > 0 && intent.evidenceGoal === 'customer_access') return 0;
  if (
    gap.missingCompetitiveAlternativeSources > 0
    && ['competitor_complaint', 'competitor_alternative', 'current_alternative'].includes(intent.kind)
  ) return 0;
  if (
    gap.missingProblemLanguageObservations > 0
    && ['review_language', 'problem_discussion', 'buyer_problem'].includes(intent.kind)
  ) return 0;
  return intent.evidenceGoal === 'customer_access' ? 2 : 3;
}

export function buildAdaptiveExpansionPlan(
  plan: DistributionFootprintPlan,
  gap: ResearchGapSummary,
  maxTasks = 8,
  excludedIntentIds: Iterable<string> = []
): AdaptiveExpansionPlan {
  if (!needsAdaptiveSecondPass(gap)) return { sourceIds: [], queryBySourceId: {}, selectedIntentIds: [] };

  const excluded = new Set(excludedIntentIds);
  const prioritized = plan.expansionIntents
    .filter(intent => !excluded.has(intent.intentId))
    .sort((left, right) => {
      const priorityDifference = intentPriority(left, gap) - intentPriority(right, gap);
      return priorityDifference || left.intentId.localeCompare(right.intentId);
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

export function adaptiveResearchExhausted(
  plan: DistributionFootprintPlan,
  selectedIntentIds: Iterable<string>
): boolean {
  const selected = new Set(selectedIntentIds);
  return plan.expansionIntents.every(intent => selected.has(intent.intentId));
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
