import { describe, expect, it } from 'vitest';
import { paidBlueprintResearchEnabled, researchEnvForPaidBlueprint } from '../src/api/paidBlueprintResearch';
import type { Env } from '../src/api/env';
import type { PaidTestOrder } from '../src/types/paidTest';

function env(overrides: Partial<Env> = {}): Env {
  return {
    DEPLOYMENT_ENV: 'acceptance',
    DISTRIBUTION_FOOTPRINT_ENABLED: 'false',
    PAID_BLUEPRINT_RESEARCH_ENABLED: 'true',
    ...overrides
  } as Env;
}

function order(overrides: Partial<PaidTestOrder> = {}): PaidTestOrder {
  return {
    orderId: 'gtt_paid_acceptance',
    email: 'buyer@example.com',
    verdictId: 'verdict_1',
    status: 'failed',
    stripeMode: 'test',
    stripeCheckoutSessionId: 'cs_test_123',
    stripeEventId: 'evt_test_123',
    paidAt: '2026-08-16T12:00:00.000Z',
    intake: {
      verdictId: 'verdict_1',
      targetBuyer: 'small business owners',
      problem: 'customer acquisition uncertainty',
      currentWorkaround: 'ad hoc referrals'
    },
    createdAt: '2026-08-16T11:55:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    reportVersion: '1.0'
  } as PaidTestOrder;
}

describe('paid Blueprint research enablement', () => {
  it('permits verified Stripe test-mode paid fulfillment only in acceptance', () => {
    const paidOrder = order();
    const acceptance = env();

    expect(paidBlueprintResearchEnabled(acceptance, paidOrder)).toBe(true);
    expect(researchEnvForPaidBlueprint(acceptance, paidOrder).DISTRIBUTION_FOOTPRINT_ENABLED).toBe('true');
  });

  it('does not permit an unpaid, unverified, live-mode, or production order through the paid override', () => {
    expect(paidBlueprintResearchEnabled(env(), order({ paidAt: undefined }))).toBe(false);
    expect(paidBlueprintResearchEnabled(env(), order({ stripeEventId: undefined }))).toBe(false);
    expect(paidBlueprintResearchEnabled(env(), order({ stripeMode: 'live' }))).toBe(false);
    expect(paidBlueprintResearchEnabled(env({ DEPLOYMENT_ENV: 'production' }), order())).toBe(false);
  });

  it('still honors the existing general research switch when explicitly enabled', () => {
    expect(paidBlueprintResearchEnabled(
      env({ DEPLOYMENT_ENV: 'development', DISTRIBUTION_FOOTPRINT_ENABLED: 'true', PAID_BLUEPRINT_RESEARCH_ENABLED: 'false' }),
      order({ paidAt: undefined, stripeCheckoutSessionId: undefined, stripeEventId: undefined })
    )).toBe(true);
  });
});
