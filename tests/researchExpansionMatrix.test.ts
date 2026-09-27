import { describe, expect, it } from 'vitest';
import type { PaidTestOrder } from '../src/types/paidTest';
import { buildResearchExpansionMatrix } from '../src/api/researchExpansionMatrix';

function order(overrides: Partial<PaidTestOrder['intake']> = {}): PaidTestOrder {
  return {
    orderId: 'gtt_expansion_fixture',
    email: 'fixture@example.com',
    verdictId: 'verdict_fixture',
    status: 'researching',
    intake: {
      verdictId: 'verdict_fixture',
      targetBuyer: 'Busy dog owners in San Juan',
      geography: 'Puerto Rico',
      problem: 'Dog owners need reliable dog walking when work runs late',
      currentWorkaround: 'Ask friends or use general pet service apps',
      competitorSeeds: [
        { seedId: 'wag', name: 'Wag', website: 'https://wagwalking.com', domain: 'wagwalking.com', relationship: 'direct_competitor', origin: 'customer_confirmed', verifiedAt: '2026-09-27T00:00:00.000Z' },
        { seedId: 'rover', name: 'Rover', website: 'https://rover.com', domain: 'rover.com', relationship: 'direct_competitor', origin: 'customer_confirmed', verifiedAt: '2026-09-27T00:00:00.000Z' }
      ],
      ...overrides
    },
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z'
  } as PaidTestOrder;
}

describe('research expansion matrix', () => {
  it('generates a bounded 8-15 intent matrix from known product dimensions', () => {
    const matrix = buildResearchExpansionMatrix(order(), [
      'dog walker missed visit',
      'pet owner wants photo updates'
    ]);
    expect(matrix.length).toBeGreaterThanOrEqual(8);
    expect(matrix.length).toBeLessThanOrEqual(15);
    expect(new Set(matrix.map(item => item.query)).size).toBe(matrix.length);
    expect(matrix.some(item => item.kind === 'competitor_complaint')).toBe(true);
    expect(matrix.some(item => item.kind === 'competitor_alternative')).toBe(true);
    expect(matrix.some(item => item.kind === 'review_language')).toBe(true);
    expect(matrix.some(item => item.evidenceGoal === 'customer_access')).toBe(true);
  });

  it('preserves short product/category terms and never introduces an unlaunched idea name', () => {
    const matrix = buildResearchExpansionMatrix(order({
      targetBuyer: 'Solo founders using AI coding tools',
      problem: 'AI app founders struggle with app deployment authentication and payments'
    }), ['app auth setup confusing']);
    const text = matrix.map(item => item.query).join(' ').toLowerCase();
    expect(text).toMatch(/\bai\b/);
    expect(text).toMatch(/\bapp\b/);
    expect(text).not.toContain('launchlens');
  });

  it('does not explode when many review phrases are supplied', () => {
    const matrix = buildResearchExpansionMatrix(order(), Array.from({ length: 30 }, (_, index) => `dog walking review phrase ${index}`));
    expect(matrix.length).toBeLessThanOrEqual(15);
    expect(matrix.filter(item => item.kind === 'review_language').length).toBeLessThanOrEqual(4);
  });
});
