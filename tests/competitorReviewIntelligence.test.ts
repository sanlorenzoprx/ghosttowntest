import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { EvaluationResult } from '../src/types/lit';

vi.mock('../src/api/generativeAIService', () => ({
  generateAI: async (_env: unknown, options: { task: string; prompt: string; googleSearch?: boolean }) => {
    if (options.task === 'grounded_research' || options.googleSearch) {
      const competitor = options.prompt.includes('Cursor') ? 'cursor' : 'replit';
      return {
        text: 'Grounded public review sources.',
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: `https://reviews.example.com/${competitor}/customer-review-1`, title: `${competitor} customer reviews` } },
            { web: { uri: `https://community.example.com/${competitor}/experience-thread`, title: `${competitor} user experience` } }
          ]
        },
        receipt: {
          provider: 'google_vertex_ai',
          gateway: 'cloudflare_ai_gateway',
          gatewayId: 'default',
          task: 'grounded_research',
          model: 'gemini-test',
          promptHash: 'x',
          responseHash: 'y',
          completedAt: '2026-09-27T00:00:00.000Z'
        }
      };
    }

    if (options.task === 'review_intelligence') {
      const marker = 'Review observations: ';
      const observations = JSON.parse(options.prompt.slice(options.prompt.indexOf(marker) + marker.length)) as Array<{
        sourceId: string;
        competitorName: string;
        customerLanguage: string[];
      }>;
      const ids = observations.map(item => item.sourceId);
      return {
        text: JSON.stringify({
          patterns: [
            {
              kind: 'weakness',
              theme: 'Users report launch setup and billing configuration friction.',
              customerLanguage: ['authentication setup was confusing', 'billing was hard to finish'],
              sourceIds: ids.slice(0, 2),
              competitorNames: [...new Set(observations.map(item => item.competitorName))],
              confidence: 'medium'
            },
            {
              kind: 'strength',
              theme: 'Users value fast initial building and iteration.',
              customerLanguage: ['building the first version was fast'],
              sourceIds: ids.slice(0, 2),
              competitorNames: [...new Set(observations.map(item => item.competitorName))],
              confidence: 'medium'
            }
          ],
          customerLanguagePhrases: [
            'authentication setup was confusing',
            'billing was hard to finish',
            'building the first version was fast'
          ],
          productImplications: [
            {
              hypothesis: 'Test a launch-readiness offer focused on authentication, billing, and deployment blockers.',
              whyItMatters: 'Those launch steps appear in verified competitor-user complaints.',
              testQuestion: 'Will qualified solo founders pay for a fixed-scope launch blocker audit?',
              sourceIds: ids.slice(0, 2)
            }
          ]
        }),
        receipt: {
          provider: 'google_vertex_ai',
          gateway: 'cloudflare_ai_gateway',
          gatewayId: 'default',
          task: 'review_intelligence',
          model: 'gemini-test',
          promptHash: 'x2',
          responseHash: 'y2',
          completedAt: '2026-09-27T00:00:00.000Z'
        }
      };
    }

    throw new Error('Unexpected AI task');
  }
}));

import { researchCompetitorReviews } from '../src/api/competitorReviewIntelligence';
import { planCustomerAccessResearch } from '../src/api/distributionFootprintResearch';

const order = {
  orderId: 'gtt_review_test',
  email: 'founder@example.com',
  verdictId: 'verdict_review_test',
  status: 'researching',
  intake: {
    verdictId: 'verdict_review_test',
    targetBuyer: 'Solo founders using AI coding tools who personally launch web apps',
    geography: 'United States',
    problem: 'They can build a prototype but struggle with authentication, billing, domains, and production deployment.',
    currentWorkaround: 'Product documentation, Reddit, Discord, and trial-and-error debugging.',
    offerHypothesis: 'A $49 manual launch-readiness audit with the top three production blockers and fixes.',
    expectedPrice: '$49',
    competitorSeeds: [
      {
        seedId: 'seed_cursor',
        name: 'Cursor',
        website: 'https://cursor.com',
        domain: 'cursor.com',
        relationship: 'adjacent_product',
        origin: 'customer_confirmed',
        verifiedAt: '2026-09-27T00:00:00.000Z'
      },
      {
        seedId: 'seed_replit',
        name: 'Replit',
        website: 'https://replit.com',
        domain: 'replit.com',
        relationship: 'adjacent_product',
        origin: 'customer_confirmed',
        verifiedAt: '2026-09-27T00:00:00.000Z'
      }
    ]
  },
  createdAt: '2026-09-27T00:00:00.000Z',
  updatedAt: '2026-09-27T00:00:00.000Z',
  paidAt: '2026-09-27T00:00:00.000Z',
  stripeCheckoutSessionId: 'cs_test_review'
} as PaidTestOrder;

const verdict = {
  resultId: 'verdict_review_test',
  generatedAt: '2026-09-27T00:00:00.000Z',
  idea: {
    ideaName: 'AI App Launch Readiness Audit',
    description: 'A fixed-scope manual audit for production launch blockers.',
    targetUser: 'Solo founders using AI coding tools',
    painfulProblem: 'Prototype-to-production launch setup breaks across authentication, billing, domains, and deployment.',
    currentAlternative: 'Documentation, communities, and trial and error.',
    motivation: 'Launch without rebuilding everything.'
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
    businessDnaType: 'service',
    businessDnaTrap: 'Free help may be good enough.',
    businessDnaWinStrategy: 'Sell a narrow manual audit.',
    finalVerdict: 'test_first',
    verdictHeadline: 'Test the launch audit',
    verdictExplanation: 'Payment is not proven.',
    recommendedNextTest: 'Ask qualified founders to pay for the audit.',
    doNotBuildUntil: 'A few founders make meaningful commitments.',
    oneSentenceAdvice: 'Sell the outcome before automating.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

function env(): Env {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
    JWT_SECRET: 'test',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('product-specific competitor review intelligence', () => {
  it('extracts review-backed product intelligence and feeds customer language into access research', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      const competitor = url.includes('cursor') ? 'Cursor' : 'Replit';
      return new Response(
        `<html><head><title>${competitor} customer review</title><meta property="article:published_time" content="2026-09-20T00:00:00.000Z"></head><body>
        I use ${competitor} to build my app. Building the first version was fast and easy.
        Authentication setup was confusing when I tried to launch.
        Billing was hard to finish and support was slow when production configuration broke.
        I wish the product explained the deployment checklist before launch.
        I paid because I wanted to move faster, but I still needed help getting the app production ready.
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    });

    const intelligence = await researchCompetitorReviews(env(), order, verdict);

    expect(intelligence.productSpecific).toBe(true);
    expect(intelligence.orderId).toBe(order.orderId);
    expect(intelligence.competitorSeedIds).toEqual(['seed_cursor', 'seed_replit']);
    expect(intelligence.observations.length).toBeGreaterThanOrEqual(2);
    expect(intelligence.patterns.some(pattern => pattern.kind === 'weakness')).toBe(true);
    expect(intelligence.customerLanguagePhrases).toContain('authentication setup was confusing');
    expect(intelligence.productImplications[0]?.hypothesis).toMatch(/launch-readiness/i);

    const plan = planCustomerAccessResearch(order, verdict, intelligence.customerLanguagePhrases);
    expect(plan.packs).toContain('competitor_review_intelligence');
    const reviewQueries = plan.sourceIds
      .filter(id => id.startsWith('customer_access:review_'))
      .map(id => plan.queryBySourceId[id]);
    expect(reviewQueries.some(query => /authentication setup confusing/i.test(query))).toBe(true);
    expect(reviewQueries.some(query => /billing hard finish/i.test(query))).toBe(true);
  });
});
