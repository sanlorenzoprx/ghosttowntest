import { afterEach, describe, expect, it, vi } from 'vitest';
import { researchCustomerAccess } from '../src/api/customerAccessResearch';
import type { Env } from '../src/api/env';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const order = {
  orderId: 'gtt_research_1',
  email: 'buyer@example.com',
  verdictId: 'verdict_board_games',
  status: 'researching',
  intake: {
    verdictId: 'verdict_board_games',
    targetBuyer: 'Families with children ages 5-15',
    geography: 'United States',
    problem: 'Parents spend money on games their children do not enjoy',
    currentWorkaround: 'Retail stores, libraries, and recommendations',
    expectedPrice: '$39'
  },
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z'
} as PaidTestOrder;

const verdict = {
  resultId: 'verdict_board_games',
  generatedAt: '2026-07-31T12:00:00.000Z',
  idea: {
    ideaName: 'Board Game Subscription for Families',
    description: 'A curated family board-game subscription.',
    targetUser: 'Families with children ages 5-15',
    painfulProblem: 'Parents buy games their children do not enjoy.',
    currentAlternative: 'Retail stores, libraries, cafes, and recommendations.',
    motivation: 'Family game-night experience.'
  },
  deterministicScores: {
    ghostTownScore: 3,
    ghostTownRisk: 'medium',
    leverageScore: 3,
    insightScore: 3,
    timingScore: 3,
    litScore: 3,
    litBand: 'unclear',
    highWallsScore: 2,
    highWallsBand: 'weak',
    businessDnaType: 'subscription',
    businessDnaTrap: 'Inventory risk',
    businessDnaWinStrategy: 'Validate curation before inventory',
    finalVerdict: 'test_first',
    verdictHeadline: 'Test the curation promise first',
    verdictExplanation: 'Prove family preference matching before buying inventory.',
    recommendedNextTest: 'Recruit founding families.',
    doNotBuildUntil: 'Families pay for a manual curated pilot.',
    oneSentenceAdvice: 'Sell the curation outcome before buying inventory.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

function env(): Env {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
    GOOGLE_SEARCH_GROUNDING_ENABLED: 'true',
    GEMINI_API_KEY: 'test-key',
    GEMINI_RESEARCH_MODEL: 'gemini-test',
    JWT_SECRET: 'test',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  };
}

afterEach(() => vi.restoreAllMocks());

describe('customer access research provider', () => {
  it('normalizes and verifies a complete Google-grounded channel pack', async () => {
    const channels = Array.from({ length: 12 }, (_, index) => ({
      community: `Family Game Community ${index + 1}`,
      platform: index % 2 ? 'Association' : 'Public forum',
      publicUrl: `https://community${index + 1}.example.com/family-games`,
      relevance: 'Parents discuss family game selection and recommendations.',
      activity: 'active',
      participationRules: "Rules not confirmed publicly; read the channel's current rules before participating.",
      recommendedApproach: 'Read current discussions and contribute a useful family game-selection checklist.',
      usefulTopic: 'How to choose a game for mixed ages.',
      risk: 'Promotional posts may be restricted.',
      firstAction: 'Read the current rules and record three recurring questions.',
      confidence: 'high'
    }));
    channels.push({
      community: 'Unsafe local result',
      platform: 'Invalid',
      publicUrl: 'https://localhost/private',
      relevance: 'Invalid',
      activity: 'uncertain',
      participationRules: 'Invalid',
      recommendedApproach: 'Invalid',
      usefulTopic: 'Invalid',
      risk: 'Invalid',
      firstAction: 'Invalid',
      confidence: 'unverified'
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [{
            content: { parts: [{ text: JSON.stringify({ channels, publicExpertsAndPartners: [] }) }] },
            groundingMetadata: {
              webSearchQueries: ['family board game community', 'parents board game recommendations'],
              searchEntryPoint: { renderedContent: '<div>Google Search</div>', sdkBlob: 'blob' }
            }
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('<html><title>Community</title></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    });

    const result = await researchCustomerAccess(env(), order, verdict);

    expect(fetchMock).toHaveBeenCalled();
    expect(result.research.status).toBe('complete');
    expect(result.research.channels).toHaveLength(12);
    expect(result.research.sources).toHaveLength(12);
    expect(result.research.channels.every(channel => channel.sourceIds.length === 1)).toBe(true);
    expect(result.receipt.webSearchQueries).toContain('family board game community');
    expect(result.receipt.verifiedChannelCount).toBe(12);
    expect(result.receipt.rejectedUrls).toEqual(expect.arrayContaining([expect.objectContaining({ url: 'https://localhost/private' })]));
  });

  it('fails closed when Google Search grounding is disabled', async () => {
    const disabled = env();
    disabled.GOOGLE_SEARCH_GROUNDING_ENABLED = 'false';
    await expect(researchCustomerAccess(disabled, order, verdict)).rejects.toThrow(/not enabled/i);
  });
});
