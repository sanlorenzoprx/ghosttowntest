import { describe, expect, it } from 'vitest';
import type { CompetitorReviewIntelligence } from '../src/types/launchBlueprint';
import type { DistributionFootprintPlan, ResearchBatchResult } from '../src/api/distributionFootprintResearch';
import {
  adaptiveResearchExhausted,
  buildAdaptiveExpansionPlan,
  mergeAdaptivePlan,
  needsAdaptiveSecondPass,
  summarizeResearchGap
} from '../src/api/adaptiveResearch';

function plan(): DistributionFootprintPlan {
  return {
    planVersion: 'distribution-footprint-plan-v1',
    createdAt: '2026-09-27T00:00:00.000Z',
    packs: ['customer_access'],
    sourceIds: ['web:buyer'],
    queryBySourceId: { 'web:buyer': 'dog owner community' },
    seedDomains: ['rover.com', 'wagwalking.com'],
    seedNames: ['Rover', 'Wag'],
    language: 'en',
    geography: 'Puerto Rico',
    expansionIntents: [
      { intentId: 'buyer-community', kind: 'buyer_community', query: 'dog owner community puerto rico', evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer'] },
      { intentId: 'problem-forum', kind: 'problem_discussion', query: 'dog walking missed visits forum', evidenceGoal: 'customer_access', derivedFrom: ['problem'] },
      { intentId: 'buyer-problem', kind: 'buyer_problem', query: 'dog owners missed dog walking visits discussion', evidenceGoal: 'customer_access', derivedFrom: ['targetBuyer', 'problem'] },
      { intentId: 'competitor-1-complaint', kind: 'competitor_complaint', query: 'rover dog walking complaint discussion', evidenceGoal: 'market_evidence', derivedFrom: ['competitorSeed:rover'] }
    ]
  };
}

function batch(candidates: ResearchBatchResult['candidates'] = []): ResearchBatchResult {
  return {
    batchId: 'batch-1',
    completedAt: '2026-09-27T00:00:00.000Z',
    attempts: [
      { sourceId: 'web:buyer', sourceType: 'brave_search', success: true, outcome: candidates.length ? 'SUCCESS' : 'NO_RESULTS', query: 'dog owner community', candidateCount: candidates.length }
    ],
    candidates,
    rejectedUrls: [],
    breakerState: {}
  };
}

function candidate(index: number, kind: 'access' | 'competitive'): ResearchBatchResult['candidates'][number] {
  const access = kind === 'access';
  return {
    candidateId: `candidate-${index}`,
    provider: 'brave_search',
    targetTypeHint: access ? 'community' : 'review_site',
    title: `Dog walking evidence ${index}`,
    publicUrl: `https://example.com/${index}`,
    publisher: 'example.com',
    platform: access ? 'community' : 'review',
    activity: access ? 'recent' : 'uncertain',
    confidence: 'high',
    evidenceDate: '2026-09-26T00:00:00.000Z',
    evidenceDateSource: 'page_activity_text',
    evidenceRecency: 'current',
    currentActivityStatus: access ? 'verified_current' : 'unverified',
    currentActivityVerifiedAt: access ? '2026-09-27T00:00:00.000Z' : undefined,
    currentActivityEvidence: 'fixture',
    factualSignals: ['dog walking fixture'],
    competitorEvidence: kind === 'competitive' ? ['Rover or Wag alternative evidence'] : [],
    audienceOwner: 'fixture',
    observedAt: '2026-09-27T00:00:00.000Z'
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
    competitorSeedIds: ['rover', 'wag'],
    observations: Array.from({ length: count }, (_, index) => ({
      observationId: `obs-${index}`,
      competitorSeedId: index % 2 ? 'wag' : 'rover',
      competitorName: index % 2 ? 'Wag' : 'Rover',
      sourceId: `review-${index}`,
      sourceUrl: `https://reviews.example/${index}`,
      sourceTitle: `Review ${index}`,
      accessedAt: '2026-09-27T00:00:00.000Z',
      customerLanguage: ['I used this for dog walking and still had a problem.']
    })),
    patterns: [],
    customerLanguagePhrases: [],
    productImplications: [],
    sources: [],
    limitations: []
  };
}

describe('adaptive role-gap research', () => {
  it('detects missing evidence roles instead of a raw 10/3/2 count', () => {
    const gap = summarizeResearchGap([batch()], reviews(0));
    expect(gap.missingCurrentCustomerAccess).toBe(3);
    expect(gap.missingProblemLanguageObservations).toBe(3);
    expect(gap.missingCompetitiveAlternativeSources).toBe(2);
    expect(needsAdaptiveSecondPass(gap)).toBe(true);
  });

  it('prioritizes customer-access expansion and caps the pass', () => {
    const gap = summarizeResearchGap([batch()], reviews(0));
    const adaptive = buildAdaptiveExpansionPlan(plan(), gap, 2);
    expect(adaptive.sourceIds).toHaveLength(2);
    expect(adaptive.sourceIds.every(id => id.startsWith('web:adaptive:'))).toBe(true);
    expect(adaptive.selectedIntentIds).toContain('buyer-community');
  });

  it('merges only bounded adaptive tasks', () => {
    const gap = summarizeResearchGap([batch()], reviews(0));
    const adaptive = buildAdaptiveExpansionPlan(plan(), gap, 2);
    const secondPass = mergeAdaptivePlan(plan(), adaptive);
    expect(secondPass.sourceIds).toEqual(adaptive.sourceIds);
    expect(secondPass.queryBySourceId).toEqual(adaptive.queryBySourceId);
    expect(secondPass.expansionIntents).toHaveLength(3);
  });

  it('skips adaptive research when the role-based evidence gate is already met', () => {
    const candidates = [
      candidate(1, 'access'),
      candidate(2, 'access'),
      candidate(3, 'access'),
      candidate(4, 'competitive'),
      candidate(5, 'competitive')
    ];
    const gap = summarizeResearchGap([batch(candidates)], reviews(3));
    expect(gap.sufficient).toBe(true);
    expect(needsAdaptiveSecondPass(gap)).toBe(false);
    expect(buildAdaptiveExpansionPlan(plan(), gap).sourceIds).toEqual([]);
  });

  it('runs bounded problem-discussion expansion when only problem-language evidence is missing', () => {
    const candidates = [
      candidate(1, 'access'),
      candidate(2, 'access'),
      candidate(3, 'access'),
      candidate(4, 'competitive'),
      candidate(5, 'competitive')
    ];
    const gap = summarizeResearchGap([batch(candidates)], reviews(2));
    expect(gap.missingProblemLanguageObservations).toBe(1);
    expect(needsAdaptiveSecondPass(gap)).toBe(true);
    const adaptive = buildAdaptiveExpansionPlan(plan(), gap, 1);
    expect(['problem-forum', 'buyer-problem']).toContain(adaptive.selectedIntentIds[0]);
  });
});

describe('adaptive multi-round expansion', () => {
  it('advances through distinct intent batches instead of repeating the same queries', () => {
    const gap = summarizeResearchGap([batch()], reviews(0));
    const first = buildAdaptiveExpansionPlan(plan(), gap, 2);
    const second = buildAdaptiveExpansionPlan(plan(), gap, 2, first.selectedIntentIds);
    expect(first.selectedIntentIds.length).toBeGreaterThan(0);
    expect(second.selectedIntentIds.length).toBeGreaterThan(0);
    expect(second.selectedIntentIds.some(id => first.selectedIntentIds.includes(id))).toBe(false);
  });

  it('knows when all bounded expansion intents have been exhausted', () => {
    const p = plan();
    expect(adaptiveResearchExhausted(p, [])).toBe(false);
    expect(adaptiveResearchExhausted(p, p.expansionIntents.map(intent => intent.intentId))).toBe(true);
  });
});
