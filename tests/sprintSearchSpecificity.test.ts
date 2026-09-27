import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { planCustomerAccessResearch, searchTerms, sourceClaimSupportFailure } from '../src/api/distributionFootprintResearch';

function fixture(ideaName: string, targetBuyer: string, problem: string): { order: PaidTestOrder; verdict: EvaluationResult } {
  const order = {
    orderId: 'gtt_specificity',
    email: 'fixture@example.com',
    verdictId: 'verdict_specificity',
    status: 'researching',
    intake: {
      verdictId: 'verdict_specificity',
      targetBuyer,
      geography: 'United States',
      problem,
      currentWorkaround: 'Existing products and community advice',
      competitorSeeds: [
        { seedId: 'seed_one', name: 'Competitor One', website: 'https://one.example.com', domain: 'one.example.com', relationship: 'direct_competitor', origin: 'customer_confirmed', verifiedAt: '2026-09-27T00:00:00.000Z' },
        { seedId: 'seed_two', name: 'Competitor Two', website: 'https://two.example.com', domain: 'two.example.com', relationship: 'direct_competitor', origin: 'customer_confirmed', verifiedAt: '2026-09-27T00:00:00.000Z' }
      ]
    },
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z'
  } as unknown as PaidTestOrder;

  const verdict = {
    resultId: 'verdict_specificity',
    generatedAt: '2026-09-27T00:00:00.000Z',
    idea: {
      ideaName,
      description: problem,
      targetUser: targetBuyer,
      painfulProblem: problem,
      currentAlternative: 'Existing products and community advice',
      motivation: 'Validate demand'
    },
    deterministicScores: {},
    usedAI: false,
    cacheHit: false,
    answers: {}
  } as unknown as EvaluationResult;

  return { order, verdict };
}

describe('Sprint product-specific search construction', () => {
  it('keeps short meaningful category terms while excluding the invented dog-walking brand', () => {
    const { order, verdict } = fixture(
      'PawPal Walks',
      'Busy dog owners in San Juan',
      'Dog owners need reliable dog walking when work runs late'
    );
    const plan = planCustomerAccessResearch(order, verdict, [
      'dog walker missed visit',
      'pet owner wants photo updates'
    ]);
    const all = Object.values(plan.queryBySourceId).join(' ').toLowerCase();

    expect(searchTerms('dog pet app AI SEO CPA')).toEqual(expect.arrayContaining(['dog', 'pet', 'app', 'ai', 'seo', 'cpa']));
    expect(all).toContain('dog');
    expect(all).not.toContain('pawpal');
    expect(plan.sourceIds).toContain('customer_access:buyer_problem');
    expect(plan.sourceIds.some(id => id.endsWith('_complaint'))).toBe(true);
    expect(plan.sourceIds.some(id => id.endsWith('_alternatives'))).toBe(true);

    const reviewIds = plan.sourceIds.filter(id => id.startsWith('customer_access:review_'));
    expect(reviewIds).toHaveLength(2);
    expect(plan.queryBySourceId[reviewIds[0]]).toContain('dog');
    expect(plan.queryBySourceId[reviewIds[0]]).not.toContain('photo');
    expect(plan.queryBySourceId[reviewIds[1]]).toContain('pet');
  });

  it('preserves family board-game category language', () => {
    const { order, verdict } = fixture(
      'Family Fun Box',
      'Parents of children ages 5-15',
      'Parents waste money on board games their children do not enjoy'
    );
    const plan = planCustomerAccessResearch(order, verdict);
    expect(plan.queryBySourceId['customer_access:problem']).toContain('board');
    expect(plan.queryBySourceId['customer_access:problem']).toContain('games');
    expect(Object.values(plan.queryBySourceId).join(' ').toLowerCase()).not.toContain('family fun box');
  });

  it('preserves AI and app in AI-app research instead of dropping short terms', () => {
    const { order, verdict } = fixture(
      'LaunchLens',
      'Solo founders using AI coding tools',
      'AI app founders struggle with app deployment authentication and payments'
    );
    const plan = planCustomerAccessResearch(order, verdict);
    const problem = plan.queryBySourceId['customer_access:problem'];
    expect(problem).toMatch(/\bai\b/);
    expect(problem).toMatch(/\bapp\b/);
    expect(Object.values(plan.queryBySourceId).join(' ').toLowerCase()).not.toContain('launchlens');
  });

  it('requires the specific search-intent anchor instead of matching only generic secondary words', () => {
    expect(sourceClaimSupportFailure(
      'dog walking reliable missed visits',
      'A general service article about reliable operations and missed appointments.'
    )).toMatch(/anchor/i);
    expect(sourceClaimSupportFailure(
      'dog walking reliable missed visits',
      'Dog walking customers discuss reliable walkers and missed visits.'
    )).toBeUndefined();
  });
});
