import { describe, expect, it } from 'vitest';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';
import { BUSINESS_POLICY } from '../src/lib/businessPolicy';

describe('GhostTown launch offer and public business policy', () => {
  it('uses the approved 30-day plan price and versioned offer', () => {
    expect(DEFAULT_30_DAY_PLAN_DISPLAY_PRICE).toBe('$97.00');
    expect(GHOSTTOWN_30_DAY_PLAN_V1).toMatchObject({
      offerId: 'ghosttown_30_day_plan_v1',
      version: '1.0',
      amountCents: 9700,
      currency: 'usd',
      active: true
    });
  });

  it('publishes the approved business identity and refund position', () => {
    expect(BUSINESS_POLICY.businessName).toBe('Zayas House LLC');
    expect(BUSINESS_POLICY.jurisdiction).toBe('Commonwealth of Puerto Rico, USA');
    expect(BUSINESS_POLICY.supportEmail).toBe('support@ghosttowntest.com');
    expect(BUSINESS_POLICY.productPrice).toBe('$97.00');
    expect(BUSINESS_POLICY.refundPosition).toBe('Conditional 100% Money-Back Guarantee');
    expect(BUSINESS_POLICY.refundCondition).toMatch(/fully implemented.*achieved no results/i);
  });
});
