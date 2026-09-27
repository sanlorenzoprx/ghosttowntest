import { describe, expect, it } from 'vitest';
import type { DistributionFootprintPlan, ResearchBatchResult } from '../src/api/distributionFootprintResearch';
import {
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
      { intentId: 'competitor-1-complaint', kind: 'competitor_complaint', query: 'rover dog walking complaint discussion', evidenceGoal: 'market_evidence', derivedFrom: ['competitorSeed:rover'] }
    ]
  };
}

function batch(options: { candidates?: ResearchBatchResult['candidates']; attempts?: ResearchBatchResult['attempts'] } = {}): ResearchBatchResult {
  return {
    batchId: 'batch-1',
    completedAt: '2026-09-27T00:00:00.000Z',
    attempts: options.attempts || [
      { sourceId: 'web:buyer', sourceType: 'brave_search', success: true, outcome: 'SUCCESS', query: 'dog owner community', candidateCount: 1 }
    ],
    candidates: options.candidates || [],
    rejectedUrls: [],
    breakerState: {}
  };
}

describe('adaptive second-pass research', () => {
  it('detects evidence and direct-access gaps without weakening the 10/3/2 gate', () => {
    const gap = summarizeResearchGap([batch()]);
    expect(gap.missingVerifiedCandidates).toBe(10);
    expect(gap.missingCurrentCustomerAccess).toBe(3);
    expect(gap.missingProviderTypes).toBe(1);
    expect(needsAdaptiveSecondPass(gap)).toBe(true);
  });

  it('prioritizes customer-access expansion and caps the second pass', () => {
    const gap = summarizeResearchGap([batch()]);
    const adaptive = buildAdaptiveExpansionPlan(plan(), gap, 2);
    expect(adaptive.sourceIds).toHaveLength(2);
    expect(adaptive.sourceIds.every(id => id.startsWith('web:adaptive:'))).toBe(true);
    expect(adaptive.selectedIntentIds).toContain('buyer-community');
    expect(Object.keys(adaptive.queryBySourceId)).toEqual(adaptive.sourceIds);
  });

  it('merges only the bounded adaptive tasks into a second-pass plan', () => {
    const gap = summarizeResearchGap([batch()]);
    const adaptive = buildAdaptiveExpansionPlan(plan(), gap, 2);
    const secondPass = mergeAdaptivePlan(plan(), adaptive);
    expect(secondPass.sourceIds).toEqual(adaptive.sourceIds);
    expect(secondPass.queryBySourceId).toEqual(adaptive.queryBySourceId);
    expect(secondPass.expansionIntents).toHaveLength(3);
  });

  it('skips adaptive research when the canonical evidence gate is already met', () => {
    const candidates = Array.from({ length: 10 }, (_, index) => ({
      candidateId: `candidate-${index}`,
      provider: index < 5 ? 'brave_search' as const : 'rankparse_backlinks' as const,
      targetTypeHint: index < 3 ? 'community' as const : 'review_site' as const,
      title: `Target ${index}`,
      publicUrl: `https://example.com/${index}`,
      publisher: 'example.com',
      platform: 'web',
      activity: index < 3 ? 'recent' as const : 'uncertain' as const,
      confidence: 'high' as const,
      evidenceDate: '2026-09-26T00:00:00.000Z',
      evidenceDateSource: 'page_activity_text' as const,
      evidenceRecency: 'current' as const,
      currentActivityStatus: index < 3 ? 'verified_current' as const : 'unverified' as const,
      currentActivityVerifiedAt: index < 3 ? '2026-09-27T00:00:00.000Z' : undefined,
      currentActivityEvidence: 'fixture',
      factualSignals: ['fixture'],
      competitorEvidence: [],
      audienceOwner: 'fixture',
      observedAt: '2026-09-27T00:00:00.000Z'
    }));
    const complete = batch({
      candidates,
      attempts: [
        { sourceId: 'web:buyer', sourceType: 'brave_search', success: true, outcome: 'SUCCESS', query: 'dog owner community', candidateCount: 5 },
        { sourceId: 'dataforseo:seed', sourceType: 'rankparse_backlinks', success: true, outcome: 'SUCCESS', query: 'rover', candidateCount: 5 }
      ]
    });
    const gap = summarizeResearchGap([complete]);
    expect(needsAdaptiveSecondPass(gap)).toBe(false);
    expect(buildAdaptiveExpansionPlan(plan(), gap).sourceIds).toEqual([]);
  });
});
