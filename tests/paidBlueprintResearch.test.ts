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
    reportVersion: '1.0',
    ...overrides
  } as PaidTestOrder;
}

describe('paid Blueprint research enablement', () => {
  it('permits verified Stripe test-mode paid fulfillment in acceptance', () => {
    const paidOrder = order();
    const acceptance = env();

    expect(paidBlueprintResearchEnabled(acceptance, paidOrder)).toBe(true);
    expect(researchEnvForPaidBlueprint(acceptance, paidOrder).DISTRIBUTION_FOOTPRINT_ENABLED).toBe('true');
  });

  it('permits verified Stripe live-mode paid fulfillment in production only after the paid release flag is enabled', () => {
    const production = env({ DEPLOYMENT_ENV: 'production', PAID_BLUEPRINT_RESEARCH_ENABLED: 'true' });
    const liveOrder = order({
      orderId: 'gtt_paid_production',
      stripeMode: 'live',
      stripeCheckoutSessionId: 'cs_live_123',
      stripeEventId: 'evt_live_123'
    });

    expect(paidBlueprintResearchEnabled(production, liveOrder)).toBe(true);
    expect(researchEnvForPaidBlueprint(production, liveOrder).DISTRIBUTION_FOOTPRINT_ENABLED).toBe('true');
  });

  it('rejects unpaid, unverified, environment-mismatched, or release-disabled paid overrides', () => {
    expect(paidBlueprintResearchEnabled(env(), order({ paidAt: undefined }))).toBe(false);
    expect(paidBlueprintResearchEnabled(env(), order({ stripeEventId: undefined }))).toBe(false);
    expect(paidBlueprintResearchEnabled(env(), order({ stripeMode: 'live' }))).toBe(false);

    const production = env({ DEPLOYMENT_ENV: 'production', PAID_BLUEPRINT_RESEARCH_ENABLED: 'true' });
    expect(paidBlueprintResearchEnabled(production, order({ stripeMode: 'test' }))).toBe(false);
    expect(paidBlueprintResearchEnabled(
      env({ DEPLOYMENT_ENV: 'production', PAID_BLUEPRINT_RESEARCH_ENABLED: 'false' }),
      order({ stripeMode: 'live', stripeCheckoutSessionId: 'cs_live_123', stripeEventId: 'evt_live_123' })
    )).toBe(false);
  });

  it('uses the acceptance YouTube key only as an acceptance fallback for paid research', () => {
    const acceptance = env({ YOUTUBE_API_KEY: 'acceptance-youtube', YOUTUBE_API_KEY_PAID: undefined });
    expect(researchEnvForPaidBlueprint(acceptance, order()).YOUTUBE_API_KEY).toBe('acceptance-youtube');

    const production = env({
      DEPLOYMENT_ENV: 'production',
      YOUTUBE_API_KEY: 'free-production-key',
      YOUTUBE_API_KEY_PAID: undefined
    });
    const liveOrder = order({
      stripeMode: 'live',
      stripeCheckoutSessionId: 'cs_live_123',
      stripeEventId: 'evt_live_123'
    });
    expect(researchEnvForPaidBlueprint(production, liveOrder).YOUTUBE_API_KEY).toBeUndefined();
  });

  it('prefers the dedicated paid YouTube key in acceptance when it exists', () => {
    const acceptance = env({
      YOUTUBE_API_KEY: 'acceptance-youtube',
      YOUTUBE_API_KEY_PAID: 'paid-youtube'
    });
    expect(researchEnvForPaidBlueprint(acceptance, order()).YOUTUBE_API_KEY).toBe('paid-youtube');
  });

  it('still honors the existing general research switch when explicitly enabled', () => {
    expect(paidBlueprintResearchEnabled(
      env({ DEPLOYMENT_ENV: 'development', DISTRIBUTION_FOOTPRINT_ENABLED: 'true', PAID_BLUEPRINT_RESEARCH_ENABLED: 'false' }),
      order({ paidAt: undefined, stripeCheckoutSessionId: undefined, stripeEventId: undefined })
    )).toBe(true);
  });
});
