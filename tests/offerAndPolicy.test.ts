import { describe, expect, it } from 'vitest';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1, GHOSTTOWN_VERDICT_PACK_V1 } from '../src/lib/ghosttownOffer';
import { BUSINESS_POLICY } from '../src/lib/businessPolicy';

describe('GhostTown launch offer and public business policy', () => {
  it('uses the approved 30-day plan price and versioned offer', () => {
    expect(DEFAULT_30_DAY_PLAN_DISPLAY_PRICE).toBe('$97.00');
    expect(GHOSTTOWN_30_DAY_PLAN_V1).toMatchObject({
      offerId: 'ghosttown_30_day_plan_v1',
      version: '1.0',
      name: 'GhostTown Launch Blueprint: Your personalized 30-day validated idea to market-ready offer',
      stripeProductId: 'prod_Uyw4i87a8qRReT',
      amountCents: 9700,
      currency: 'usd',
      active: true
    });
    expect(GHOSTTOWN_VERDICT_PACK_V1).toMatchObject({
      offerId: 'ghosttown_verdict_pack_v1',
      version: '1.0',
      name: 'GhostTown Verdict Pack — 10 Additional Tests',
      stripeProductId: 'prod_Uyxf3Bm5FCwAKu',
      amountCents: 1497,
      currency: 'usd',
      credits: 10,
      active: true
    });
  });

  it('publishes the approved business identity and refund position', () => {
    expect(BUSINESS_POLICY.businessName).toBe('Zayas House LLC');
    expect(BUSINESS_POLICY.jurisdiction).toBe('Commonwealth of Puerto Rico, USA');
    expect(BUSINESS_POLICY.supportEmail).toBe('support@ghosttowntest.com');
    expect(BUSINESS_POLICY.productPrice).toBe('$97.00');
    expect(BUSINESS_POLICY.productName).toBe(GHOSTTOWN_30_DAY_PLAN_V1.name);
    expect(BUSINESS_POLICY.refundPosition).toBe('Conditional 100% Money-Back Guarantee');
    expect(BUSINESS_POLICY.refundCondition).toMatch(/fully implemented.*achieved no results/i);
  });
});
