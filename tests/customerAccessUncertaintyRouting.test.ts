import { describe, expect, it } from 'vitest';
import {
  customerAccessResearchUncertaintyGate,
  isCustomerAccessResearchUncertainty
} from '../src/api/launchBlueprintWorkflow';
import { ResearchOutcomeError } from '../src/api/researchOutcome';

const context = {
  order: {
    orderId: 'gtt-access-gap',
    email: 'founder@example.com',
    verdictId: 'verdict-access-gap',
    status: 'researching',
    intake: {
      verdictId: 'verdict-access-gap',
      targetBuyer: 'Parents who buy family board games',
      problem: 'Parents buy games their children do not enjoy.',
      currentWorkaround: 'Reviews, friends, and trial and error.',
      offerHypothesis: 'A manual game-match recommendation.',
      expectedPrice: '$29'
    },
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z'
  },
  verdict: {
    resultId: 'verdict-access-gap',
    generatedAt: '2026-09-27T00:00:00.000Z',
    idea: {
      ideaName: 'Family Game Match',
      description: 'Manual board-game matching.',
      targetUser: 'Parents',
      painfulProblem: 'Parents buy games their children do not enjoy.',
      currentAlternative: 'Reviews and trial and error.',
      motivation: 'Reduce wasted purchases.'
    },
    deterministicScores: {
      recommendedNextTest: 'Ask parents to pay for a manual recommendation.'
    }
  }
} as any;

describe('customer-access uncertainty routing', () => {
  it('classifies a lack of verified direct customer access as uncertainty rather than a terminal provider failure', () => {
    expect(isCustomerAccessResearchUncertainty(
      new ResearchOutcomeError({
        outcome: 'INSUFFICIENT_EVIDENCE',
        code: 'MIN_CURRENT_CUSTOMER_ACCESS',
        detail: 'No currently verified customer-access candidates were found.',
        attempts: [{ sourceType: 'web_search', success: true, candidateCount: 0 }]
      })
    )).toBe(true);
    expect(isCustomerAccessResearchUncertainty(
      new ResearchOutcomeError({
        outcome: 'PROVIDER_BLOCKED',
        code: 'MIN_CURRENT_CUSTOMER_ACCESS',
        detail: 'Provider capacity prevented completion.',
        attempts: [{ sourceType: 'youtube_api', success: false, candidateCount: 0 }]
      })
    )).toBe(false);
    expect(isCustomerAccessResearchUncertainty(
      new Error('Distribution Footprint recovery found only 0 currently verified customer-access candidates; at least 3 are required')
    )).toBe(false);
  });

  it('creates an access-path blocker without pretending weak sources are customer access', () => {
    const gate = customerAccessResearchUncertaintyGate(
      context,
      'No currently verified customer-access candidates were found.'
    );

    expect(gate.passed).toBe(false);
    expect(gate.links).toHaveLength(8);
    expect(gate.links.find(item => item.link === 'access_path')).toMatchObject({
      status: 'unresolved',
      channelIds: []
    });
    expect(gate.blockers).toEqual([expect.objectContaining({
      code: 'ACCESS_PATH_NOT_VERIFIED',
      link: 'access_path'
    })]);
  });
});
