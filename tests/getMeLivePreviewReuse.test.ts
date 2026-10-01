import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GetMeLiveConfiguration, GetMeLiveOrder } from '../src/types/getMeLive';

// The AI website plan is generated once per set of AI inputs; customer edits that
// do not change those inputs (style, colour, photos, payments) re-render from the
// stored plan instead of calling Vertex again.

const state = vi.hoisted(() => ({
  order: null as GetMeLiveOrder | null,
  stored: null as { preview: Record<string, unknown>; html: string } | null,
  manufactureCalls: 0
}));

vi.mock('../src/api/getMeLiveStore', () => ({
  loadGetMeLiveOrder: vi.fn(async () => structuredClone(state.order)),
  loadGetMeLivePreview: vi.fn(async () => structuredClone(state.stored)),
  saveGetMeLivePreview: vi.fn(async (_env: Env, _orderId: string, preview: Record<string, unknown>, html: string) => { state.stored = structuredClone({ preview, html }); }),
  updateGetMeLiveOrder: vi.fn(async () => undefined),
  listGetMeLiveAssets: vi.fn(async () => []),
  loadGetMeLiveAssetBytes: vi.fn(async () => null),
  recordHosting: vi.fn(async () => undefined)
}));
vi.mock('../src/api/auth', () => ({ authenticateRequest: vi.fn(async () => ({ email: 'owner@example.com' })) }));
vi.mock('../src/api/analytics', () => ({ recordCommercialFunnelEvent: vi.fn(async () => undefined) }));
vi.mock('../src/api/blueprintStore', () => ({
  loadBlueprintRecord: vi.fn(async () => ({ blueprint: {
    blueprintId: 'bp_1',
    offer: { offerName: 'Pilot', desiredOutcome: 'Clear proof', targetCustomer: 'Founders', painfulProblem: 'Guessing', initialTestPrice: '$49' },
    landingPageCopy: { headline: 'Proof first', primaryCallToAction: 'Start' },
    launchSite: { site: { businessName: 'Proof Path', contactEmail: 'owner@example.com' }, offer: { headline: 'Proof first', callToAction: 'Start' }, leadCapture: { destination: 'owner@example.com' } }
  } }))
}));
vi.mock('../src/api/websiteCreationService', () => ({
  manufactureCustomWebsite: vi.fn(async () => {
    state.manufactureCalls += 1;
    return {
      spec: { businessName: 'Proof Path', stylePreset: 'clean_saas', templateId: 'ghosttown_conversion', sections: [{ component: 'hero', heading: `AI heading ${state.manufactureCalls}`, body: 'AI body' }] },
      assets: [],
      receipt: { generation: state.manufactureCalls }
    };
  })
}));
vi.mock('../src/api/websiteBuildRunner', () => ({
  buildCustomWebsite: vi.fn(async (spec: { stylePreset: string }) => ({ buildId: `build_${spec.stylePreset}`, templateId: 'ghosttown_conversion', runtime: 'static' })),
  renderCustomWebsiteStaticHtml: vi.fn((spec: { sections: Array<{ heading: string }> }) => `<html>${spec.sections[0].heading}</html>`)
}));

import { handleGetMeLivePreview } from '../src/api/getMeLive';

const env = { JWT_SECRET: 'test', STRIPE_SECRET_KEY: 'sk', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' } as Env;

function configuration(overrides: Partial<GetMeLiveConfiguration['brand']> = {}, offer: Partial<GetMeLiveConfiguration['offer']> = {}): GetMeLiveConfiguration {
  return {
    schemaVersion: 'get-me-live-config-v1',
    brand: { businessName: 'Proof Path', stylePreset: 'clean_saas', ...overrides },
    offer: { intent: 'interest', offer: 'Pilot', price: '$49', ctaLabel: 'I am interested', ...offer },
    contact: { contactEmail: 'owner@example.com', leadDestinationEmail: 'owner@example.com' },
    domain: {}, payments: { enabled: false }
  };
}

function order(config: GetMeLiveConfiguration): GetMeLiveOrder {
  return {
    orderId: 'gml_preview', ownerId: 'owner@example.com', sourceSprintOrderId: 'sprint_1', sourceBlueprintId: 'bp_1',
    offerId: 'ghosttown_get_me_live_v1', offerVersion: '1.0', stripePriceId: 'price', status: 'configuring', paidAt: '2026-10-01T00:00:00.000Z',
    providerState: { cloudflareConnected: false, stripeConnected: false, businessEmailVerified: false, domainReady: false },
    configuration: config, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'
  };
}

const preview = () => handleGetMeLivePreview(new Request('https://api.test/api/get-me-live/orders/gml_preview/preview', {
  method: 'POST', headers: { Authorization: 'Bearer token' }
}), env, 'gml_preview');

describe('Get Me Live preview reuses the AI website plan', () => {
  beforeEach(() => { state.order = order(configuration()); state.stored = null; state.manufactureCalls = 0; });

  it('generates once, then re-renders style, colour and repeat saves from the stored plan', async () => {
    expect((await preview()).status).toBe(200);
    expect(state.manufactureCalls).toBe(1);
    expect((await preview()).status).toBe(200);
    state.order = order(configuration({ stylePreset: 'bold_validation', primaryColor: '#B6422E' }));
    const restyled = await preview();
    expect(restyled.status).toBe(200);
    expect(await restyled.json()).toMatchObject({ buildId: 'build_bold_validation' });
    expect(state.manufactureCalls).toBe(1);
    expect(state.stored?.html).toBe('<html>AI heading 1</html>');
  });

  it('regenerates when an AI input (business name or offer text) changes', async () => {
    await preview();
    state.order = order(configuration({ businessName: 'Proof Path Studio' }));
    await preview();
    expect(state.manufactureCalls).toBe(2);
    state.order = order(configuration({ businessName: 'Proof Path Studio' }, { offer: 'Pilot Plus' }));
    await preview();
    expect(state.manufactureCalls).toBe(3);
  });

  it('regenerates when no stored plan exists (previews saved before this change)', async () => {
    await preview();
    delete (state.stored!.preview as { aiPlan?: unknown }).aiPlan;
    await preview();
    expect(state.manufactureCalls).toBe(2);
  });
});
