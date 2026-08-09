import { describe, expect, it } from 'vitest';
import { buildCommercialMetrics, recordVerifiedPurchase } from '../src/api/commercialMetrics';
import type { Env } from '../src/api/env';

class MemoryKv {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async list(options: { prefix?: string; cursor?: string } = {}) {
    const prefix = options.prefix || '';
    return {
      keys: Array.from(this.data.keys())
        .filter(key => key.startsWith(prefix))
        .sort()
        .map(name => ({ name })),
      list_complete: true,
      cacheStatus: null
    };
  }
}

function envWithKv(kv: MemoryKv): Env {
  return { KV: kv } as unknown as Env;
}

describe('commercial metrics', () => {
  it('turns funnel events and Stripe webhook purchases into conversion metrics', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const now = new Date('2026-08-09T13:00:00.000Z');
    const createdAt = '2026-08-09T12:00:00.000Z';

    const events = [
      ['landing_viewed', 'youtube'],
      ['landing_viewed', 'youtube'],
      ['verdict_started', 'youtube'],
      ['verdict_completed', 'youtube'],
      ['checkout_started', 'youtube']
    ];
    for (let index = 0; index < events.length; index += 1) {
      const [eventName, source] = events[index];
      await kv.put(`analytics_event_${index}`, JSON.stringify({ eventName, source, createdAt }));
    }

    await recordVerifiedPurchase(env, 'evt_paid_1', {
      amount_total: 9700,
      currency: 'USD'
    }, {
      orderId: 'order-1',
      artifactType: 'launch_blueprint_v2'
    });
    const purchaseKey = 'analytics_purchase_evt_paid_1';
    const purchase = JSON.parse((await kv.get(purchaseKey)) || '{}');
    purchase.createdAt = createdAt;
    await kv.put(purchaseKey, JSON.stringify(purchase));

    const metrics = await buildCommercialMetrics(env, 30, now) as any;

    expect(metrics.funnel).toMatchObject({
      landing_viewed: 2,
      verdict_started: 1,
      verdict_completed: 1,
      checkout_started: 1,
      purchase_completed: 1
    });
    expect(metrics.conversion).toMatchObject({
      landing_to_verdict_start: 0.5,
      verdict_start_to_complete: 1,
      verdict_complete_to_checkout: 1,
      checkout_to_verified_purchase: 1,
      landing_to_verified_purchase: 0.5
    });
    expect(metrics.verifiedPurchases).toEqual({
      count: 1,
      revenueMinorUnitsByCurrency: { usd: 9700 },
      authority: 'stripe_webhook'
    });
    expect(metrics.topSources[0]).toEqual({ source: 'youtube', eventCount: 5 });
  });

  it('keeps Stripe event replays idempotent in the commercial ledger', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);

    await recordVerifiedPurchase(env, 'evt_same', { amount_total: 9700, currency: 'usd' }, { artifactType: 'launch_blueprint_v2' });
    await recordVerifiedPurchase(env, 'evt_same', { amount_total: 9700, currency: 'usd' }, { artifactType: 'launch_blueprint_v2' });

    const metrics = await buildCommercialMetrics(env, 30, new Date(Date.now() + 1000)) as any;
    expect(metrics.verifiedPurchases.count).toBe(1);
    expect(metrics.verifiedPurchases.revenueMinorUnitsByCurrency.usd).toBe(9700);
  });

  it('excludes events outside the requested commercial window', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    await kv.put('analytics_event_old', JSON.stringify({
      eventName: 'landing_viewed',
      source: 'old-campaign',
      createdAt: '2026-06-01T00:00:00.000Z'
    }));

    const metrics = await buildCommercialMetrics(env, 30, new Date('2026-08-09T13:00:00.000Z')) as any;
    expect(metrics.funnel.landing_viewed).toBe(0);
    expect(metrics.topSources).toEqual([]);
  });
});
