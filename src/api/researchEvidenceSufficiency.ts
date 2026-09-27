import type { CompetitorReviewIntelligence } from '../types/launchBlueprint';
import type { ResearchBatchResult } from './distributionFootprintResearch';

export const RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS = {
  currentCustomerAccess: 3,
  problemLanguageObservations: 3,
  competitiveAlternativeSources: 2,
  evidenceRoles: 3
} as const;

export type StrategicResearchEvidenceRole =
  | 'customer_access'
  | 'problem_language'
  | 'competitive_alternative';

export interface ResearchEvidenceSufficiency {
  currentCustomerAccessCount: number;
  problemLanguageObservationCount: number;
  competitiveAlternativeSourceCount: number;
  coveredRoles: StrategicResearchEvidenceRole[];
  missingRoles: StrategicResearchEvidenceRole[];
  independentEvidenceUrls: number;
  sufficient: boolean;
}

function normalizedUrl(value: string): string {
  return value.trim().toLowerCase().replace(/\/$/, '');
}

export function evaluateResearchEvidenceSufficiency(
  batches: ResearchBatchResult[],
  competitorReviewIntelligence?: CompetitorReviewIntelligence
): ResearchEvidenceSufficiency {
  const byUrl = new Map<string, ResearchBatchResult['candidates'][number]>();
  for (const candidate of batches.flatMap(batch => batch.candidates)) {
    const key = normalizedUrl(candidate.publicUrl);
    if (!key) continue;
    const existing = byUrl.get(key);
    if (!existing || candidate.currentActivityStatus === 'verified_current') {
      byUrl.set(key, candidate);
    }
  }
  const candidates = [...byUrl.values()];

  const currentCustomerAccess = candidates.filter(candidate =>
    candidate.targetTypeHint === 'community'
    && candidate.currentActivityStatus === 'verified_current'
    && Boolean(candidate.currentActivityVerifiedAt)
  );

  const reviewByUrl = new Map<string, NonNullable<CompetitorReviewIntelligence>['observations'][number]>();
  for (const observation of competitorReviewIntelligence?.observations || []) {
    const key = normalizedUrl(observation.sourceUrl);
    if (!key || !observation.customerLanguage?.some(value => value.trim())) continue;
    reviewByUrl.set(key, observation);
  }

  const competitiveAlternativeUrls = new Set(
    candidates
      .filter(candidate => candidate.competitorEvidence.some(value => value.trim()))
      .map(candidate => normalizedUrl(candidate.publicUrl))
      .filter(Boolean)
  );

  const coveredRoles: StrategicResearchEvidenceRole[] = [];
  if (currentCustomerAccess.length >= RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.currentCustomerAccess) {
    coveredRoles.push('customer_access');
  }
  if (reviewByUrl.size >= RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.problemLanguageObservations) {
    coveredRoles.push('problem_language');
  }
  if (competitiveAlternativeUrls.size >= RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.competitiveAlternativeSources) {
    coveredRoles.push('competitive_alternative');
  }

  const allRoles: StrategicResearchEvidenceRole[] = [
    'customer_access',
    'problem_language',
    'competitive_alternative'
  ];
  const missingRoles = allRoles.filter(role => !coveredRoles.includes(role));
  const independentUrls = new Set([
    ...currentCustomerAccess.map(candidate => normalizedUrl(candidate.publicUrl)),
    ...reviewByUrl.keys(),
    ...competitiveAlternativeUrls
  ]);

  return {
    currentCustomerAccessCount: currentCustomerAccess.length,
    problemLanguageObservationCount: reviewByUrl.size,
    competitiveAlternativeSourceCount: competitiveAlternativeUrls.size,
    coveredRoles,
    missingRoles,
    independentEvidenceUrls: independentUrls.size,
    sufficient: coveredRoles.length >= RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS.evidenceRoles
  };
}
