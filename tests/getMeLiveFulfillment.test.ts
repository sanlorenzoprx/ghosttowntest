import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GetMeLiveOrder } from '../src/types/getMeLive';

const state = vi.hoisted(() => ({ order: null as GetMeLiveOrder | null, updates: [] as GetMeLiveOrder[] }));

vi.mock('../src/api/getMeLiveStore', () => ({
  createGetMeLiveOrder: vi.fn(), countGetMeLiveLeads: vi.fn(async () => 0), loadGetMeLiveBySprint: vi.fn(),
  getGetMeLiveActivity: vi.fn(async () => ({ visits: 0, shares: 0, sales: 0, revenueCents: 0 })), incrementGetMeLiveActivity: vi.fn(),
  listGetMeLiveAssets: vi.fn(async () => []), loadGetMeLiveAssetBytes: vi.fn(), markGetMeLiveAssetPublished: vi.fn(),
  orderGetMeLiveAssets: vi.fn(), removeGetMeLiveAsset: vi.fn(), saveGetMeLiveAsset: vi.fn(),
  listGetMeLiveShareDrafts: vi.fn(async () => []), saveGetMeLiveShareDraft: vi.fn(),
  loadGetMeLiveOrder: vi.fn(async () => state.order), loadGetMeLivePreview: vi.fn(), listGetMeLiveLeads: vi.fn(async () => []),
  listGetMeLiveOrders: vi.fn(async () => []), saveGetMeLiveLead: vi.fn(), saveGetMeLivePreview: vi.fn(),
  updateGetMeLiveOrder: vi.fn(async (_env: Env, order: GetMeLiveOrder) => { state.order = structuredClone(order); state.updates.push(structuredClone(order)); })
}));

import { fulfillGetMeLiveOrder } from '../src/api/getMeLive';

function env(): Env {
  return { JWT_SECRET: 'test', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price_base', STRIPE_WEBHOOK_SECRET: 'whsec_test' } as Env;
}

function order(): GetMeLiveOrder {
  return {
    orderId: 'gml_test', ownerId: 'owner@example.com', sourceSprintOrderId: 'sprint_1', sourceBlueprintId: 'bp_1',
    offerId: 'ghosttown_get_me_live_v1', offerVersion: '1.0', stripePriceId: 'price_gml', status: 'checkout_created',
    providerState: { cloudflareConnected: false, stripeConnected: false, businessEmailVerified: false, domainReady: false },
    configuration: {
      schemaVersion: 'get-me-live-config-v1',
      brand: { businessName: 'Proof Path', stylePreset: 'clean_saas' },
      offer: { intent: 'interest', offer: 'Pilot', price: '$49', ctaLabel: 'I am interested' },
      contact: { contactEmail: 'owner@example.com', leadDestinationEmail: 'owner@example.com', businessEmailLocalPart: 'hello' },
      domain: {}, payments: { enabled: false }
    },
    createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z'
  };
}

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs_test_gml', payment_status: 'paid', payment_intent: 'pi_test_gml',
    metadata: {
      get_me_live_order_id: 'gml_test', source_sprint_order_id: 'sprint_1', source_blueprint_id: 'bp_1',
      owner_id: 'owner@example.com', offer_id: 'ghosttown_get_me_live_v1', offer_version: '1.0', fulfillment_type: 'get_me_live_v1'
    },
    ...overrides
  };
}

describe('Get Me Live fulfillment', () => {
  beforeEach(() => { state.order = order(); state.updates = []; });

  it('moves one verified paid checkout into configuring without losing lineage', async () => {
    const result = await fulfillGetMeLiveOrder(env(), 'gml_test', session());
    expect(result.status).toBe('configuring');
    expect(result.stripePaymentIntentId).toBe('pi_test_gml');
    expect(result.paidAt).toBeTruthy();
    expect(result.sourceSprintOrderId).toBe('sprint_1');
    expect(result.sourceBlueprintId).toBe('bp_1');
    expect(state.updates).toHaveLength(1);
  });

  it('fails closed for mismatched ownership or product lineage', async () => {
    await expect(fulfillGetMeLiveOrder(env(), 'gml_test', session({ metadata: { ...session().metadata as Record<string, unknown>, owner_id: 'attacker@example.com' } }))).rejects.toThrow(/ownership/i);
    expect(state.updates).toHaveLength(0);
  });

  it('does not fulfill an unpaid checkout', async () => {
    await expect(fulfillGetMeLiveOrder(env(), 'gml_test', session({ payment_status: 'unpaid' }))).rejects.toThrow(/not paid/i);
    expect(state.order?.status).toBe('checkout_created');
  });
});
