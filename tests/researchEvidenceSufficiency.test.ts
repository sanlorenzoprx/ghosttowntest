import { describe, expect, it } from 'vitest';
import type { CompetitorReviewIntelligence } from '../src/types/launchBlueprint';
import type { ResearchBatchResult } from '../src/api/distributionFootprintResearch';
import {
  evaluateResearchEvidenceSufficiency,
  primaryResearchEvidenceShortfall
} from '../src/api/researchEvidenceSufficiency';

function candidate(index: number, options: {
  community?: boolean;
  current?: boolean;
  competitor?: boolean;
  problemLanguage?: boolean;
  provider?: 'brave_search' | 'rankparse_backlinks';
} = {}): ResearchBatchResult['candidates'][number] {
  const current = options.current === true;
  return {
    candidateId: `candidate-${index}`,
    provider: options.provider || 'brave_search',
    targetTypeHint: options.community ? 'community' : 'review_site',
    title: `Evidence ${index}`,
    publicUrl: `https://evidence.example/${index}`,
    publisher: 'evidence.example',
    platform: options.community ? 'Community' : 'Review',
    activity: current ? 'recent' : 'uncertain',
    confidence: 'high',
    evidenceDate: '2026-09-26T00:00:00.000Z',
    evidenceDateSource: 'page_activity_text',
    evidenceRecency: 'current',
    currentActivityStatus: current ? 'verified_current' : 'unverified',
    currentActivityVerifiedAt: current ? '2026-09-27T00:00:00.000Z' : undefined,
    currentActivityEvidence: current ? 'Current public activity verified.' : 'Current activity not established.',
    factualSignals: ['Verified original page.'],
    competitorEvidence: options.competitor ? ['Observed competitor or alternative evidence.'] : [],
    problemLanguageEvidence: options.problemLanguage ? [{
      text: 'I am struggling to make deployment and payments work together.',
      sourceKind: 'public_discussion',
      observedAt: '2026-09-27T00:00:00.000Z',
      evidenceDate: '2026-09-26T00:00:00.000Z'
    }] : undefined,
    audienceOwner: 'Evidence owner',
    observedAt: '2026-09-27T00:00:00.000Z'
  };
}

function batch(candidates: ResearchBatchResult['candidates']): ResearchBatchResult {
  return {
    batchId: 'batch-1',
    completedAt: '2026-09-27T00:00:00.000Z',
    attempts: [{ sourceId: 'web:test', sourceType: 'brave_search', success: true, outcome: 'SUCCESS', query: 'test', candidateCount: candidates.length }],
    candidates,
    rejectedUrls: [],
    breakerState: {}
  };
}

function reviews(count = 3): CompetitorReviewIntelligence {
  return {
    schemaVersion: 'competitor-review-intelligence-v1',
    orderId: 'order-1',
    sourceVerdictId: 'verdict-1',
    productSpecific: true,
    generatedAt: '2026-09-27T00:00:00.000Z',
    status: count >= 3 ? 'complete' : 'partial',
    competitorSeedIds: ['seed-1', 'seed-2'],
    observations: Array.from({ length: count }, (_, index) => ({
      observationId: `obs-${index + 1}`,
      competitorSeedId: index % 2 ? 'seed-2' : 'seed-1',
      competitorName: index % 2 ? 'Alternative Two' : 'Alternative One',
      sourceId: `review-source-${index + 1}`,
      sourceUrl: `https://reviews.example/${index + 1}`,
      sourceTitle: `Review ${index + 1}`,
      accessedAt: '2026-09-27T00:00:00.000Z',
      evidenceDate: '2026-09-26T00:00:00.000Z',
      customerLanguage: ['I used this and still had the problem.']
    })),
    patterns: [],
    customerLanguagePhrases: [],
    productImplications: [],
    sources: [],
    limitations: []
  };
}

const sufficientCandidates = () => [
  candidate(1, { community: true, current: true, problemLanguage: true }),
  candidate(2, { community: true, current: true, problemLanguage: true }),
  candidate(3, { community: true, current: true, problemLanguage: true }),
  candidate(4, { competitor: true }),
  candidate(5, { competitor: true })
];

describe('role-based research evidence sufficiency', () => {
  it('passes with independent evidence across all required roles without requiring ten targets or two providers', () => {
    const summary = evaluateResearchEvidenceSufficiency([batch(sufficientCandidates())], reviews(0));
    expect(summary.sufficient).toBe(true);
    expect(summary.coveredRoles).toEqual(['customer_access', 'problem_language', 'competitive_alternative']);
    expect(summary.currentCustomerAccessCount).toBe(3);
    expect(summary.problemLanguageObservationCount).toBe(3);
    expect(summary.competitiveAlternativeSourceCount).toBe(2);
    expect(primaryResearchEvidenceShortfall(summary)).toBeNull();
  });

  it('identifies customer-access evidence as the first missing role', () => {
    const candidates = sufficientCandidates().filter(candidate => candidate.candidateId !== 'candidate-3');
    const summary = evaluateResearchEvidenceSufficiency([batch(candidates)], reviews(3));
    expect(summary.sufficient).toBe(false);
    expect(primaryResearchEvidenceShortfall(summary)).toBe('MIN_CURRENT_CUSTOMER_ACCESS');
  });

  it('identifies missing first-person problem language without counting generic factual signals', () => {
    const candidates = sufficientCandidates().map(item => ({ ...item, problemLanguageEvidence: undefined }));
    const summary = evaluateResearchEvidenceSufficiency([batch(candidates)], reviews(2));
    expect(summary.sufficient).toBe(false);
    expect(primaryResearchEvidenceShortfall(summary)).toBe('MIN_PROBLEM_LANGUAGE_OBSERVATIONS');
  });

  it('counts only one independent problem-language observation per source URL', () => {
    const candidates = sufficientCandidates();
    candidates[1] = {
      ...candidates[1],
      publicUrl: candidates[0].publicUrl,
      problemLanguageEvidence: [
        ...(candidates[0].problemLanguageEvidence || []),
        { text: 'I still need help getting deployment to work.', sourceKind: 'public_discussion', observedAt: '2026-09-27T00:00:00.000Z' }
      ]
    };
    const summary = evaluateResearchEvidenceSufficiency([batch(candidates)], reviews(0));
    expect(summary.problemLanguageObservationCount).toBe(2);
    expect(summary.sufficient).toBe(false);
  });

  it('identifies missing competitive or alternative evidence', () => {
    const candidates = sufficientCandidates().filter(candidate => candidate.candidateId !== 'candidate-5');
    const summary = evaluateResearchEvidenceSufficiency([batch(candidates)], reviews(3));
    expect(summary.sufficient).toBe(false);
    expect(primaryResearchEvidenceShortfall(summary)).toBe('MIN_COMPETITIVE_ALTERNATIVE_EVIDENCE');
  });
});
