import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GetMeLiveHosting, GetMeLiveOrder } from '../src/types/getMeLive';

const state = vi.hoisted(() => ({
  order: null as GetMeLiveOrder | null,
  updates: [] as GetMeLiveOrder[],
  hostingWrites: [] as Array<{ hosting: GetMeLiveHosting; publicUrl?: string }>,
  releases: [] as Array<{ releaseId: string; kind: string }>
}));

vi.mock('../src/api/getMeLiveStore', () => ({
  createGetMeLiveOrder: vi.fn(), countGetMeLiveLeads: vi.fn(async () => 0), loadGetMeLiveBySprint: vi.fn(),
  getGetMeLiveActivity: vi.fn(async () => ({ visits: 0, shares: 0, sales: 0, revenueCents: 0 })), incrementGetMeLiveActivity: vi.fn(),
  listGetMeLiveAssets: vi.fn(async () => []), loadGetMeLiveAssetBytes: vi.fn(), markGetMeLiveAssetPublished: vi.fn(),
  orderGetMeLiveAssets: vi.fn(), removeGetMeLiveAsset: vi.fn(), saveGetMeLiveAsset: vi.fn(), loadGetMeLiveAsset: vi.fn(),
  listGetMeLiveShareDrafts: vi.fn(async () => []), saveGetMeLiveShareDraft: vi.fn(),
  loadGetMeLiveOrder: vi.fn(async () => structuredClone(state.order)), listGetMeLiveLeads: vi.fn(async () => []),
  loadGetMeLivePreview: vi.fn(async () => ({
    preview: { spec: { businessName: 'Proof Path', sections: [] }, assets: [], build: { buildId: 'website_spec_hash_1' } },
    html: '<html>preview</html>'
  })),
  listGetMeLiveOrders: vi.fn(async () => []), saveGetMeLiveLead: vi.fn(), saveGetMeLivePreview: vi.fn(),
  recordHosting: vi.fn(async (_env: Env, _orderId: string, hosting: GetMeLiveHosting, options: { publicUrl?: string } = {}) => {
    state.hostingWrites.push({ hosting: structuredClone(hosting), publicUrl: options.publicUrl });
    if (state.order) {
      state.order.hosting = structuredClone(hosting);
      if (options.publicUrl) state.order.publicUrl = options.publicUrl;
    }
  }),
  updateGetMeLiveOrder: vi.fn(async (_env: Env, order: GetMeLiveOrder) => {
    // Mirrors the real generic write: publication-owned columns are never part of it.
    const current = state.order;
    state.order = {
      ...structuredClone(order),
      hosting: current?.hosting, publicUrl: current?.publicUrl, customDomain: current?.customDomain,
      deploymentReceipt: current?.deploymentReceipt, publishedAt: current?.publishedAt, failure: current?.failure,
      status: current && ['publishing', 'verifying', 'live'].includes(current.status) ? current.status : order.status
    };
    state.updates.push(structuredClone(order));
  }),
  // Publication attempt functions: business doubles; the SQL itself is proven on real D1 in tests/runtime.
  claimPublishAttempt: vi.fn(async (_env: Env, orderId: string, input: { kind: 'launch' | 'republish'; buildId: string }) => ({
    claimed: true,
    attempt: { orderId, attemptId: `rel_test_${state.releases.length + 1}`, kind: input.kind, buildId: input.buildId, phase: 'claimed', claimedAt: '2026-10-01T00:00:00.000Z', expiresAt: '2999-01-01T00:00:00.000Z' }
  })),
  recordPublishDeployment: vi.fn(async (_env: Env, attempt: Record<string, unknown>, deployment: { deploymentId: string; deploymentUrl?: string }) => ({
    ...attempt, ...deployment, phase: 'deployed', deployedAt: '2026-10-01T00:00:01.000Z'
  })),
  settlePublishSuccess: vi.fn(async (_env: Env, input: { attempt: { attemptId: string; kind: string }; order: { deploymentReceiptJson: string; hostingJson: string; publicUrl?: string; publishedAt?: string } }) => {
    state.releases.push({ releaseId: input.attempt.attemptId, kind: input.attempt.kind });
    if (!state.order) return false;
    state.order.deploymentReceipt = JSON.parse(input.order.deploymentReceiptJson);
    state.order.hosting = JSON.parse(input.order.hostingJson);
    if (input.attempt.kind === 'launch') {
      state.order.status = 'live'; state.order.publicUrl = input.order.publicUrl; state.order.publishedAt = input.order.publishedAt; state.order.failure = undefined;
    }
    return true;
  }),
  settlePublishFailure: vi.fn(async () => true),
  transitionGetMeLiveStatus: vi.fn(async (_env: Env, _orderId: string, to: GetMeLiveOrder['status']) => { if (state.order) state.order.status = to; return true; }),
  loadPublishAttempt: vi.fn(async () => null),
  loadLatestGetMeLiveRelease: vi.fn(async () => null),
  isPublishAttemptExpired: vi.fn(() => false),
  CLAIM_EXPIRED_MESSAGE: 'claim expired',
  DEPLOY_EXPIRED_MESSAGE: 'deploy expired'
}));

const providers = vi.hoisted(() => ({
  ensurePagesProject: vi.fn(),
  createPagesProject: vi.fn(),
  getPagesProject: vi.fn(),
  deployCloudflarePagesHtml: vi.fn(),
  addCloudflarePagesDomain: vi.fn()
}));
vi.mock('../src/api/getMeLiveProviders', async importOriginal => ({ ...(await importOriginal<object>()), ...providers }));
vi.mock('../src/api/auth', () => ({ authenticateRequest: vi.fn(async () => ({ email: 'owner@example.com' })) }));
vi.mock('../src/api/analytics', () => ({ recordCommercialFunnelEvent: vi.fn(async () => undefined) }));
vi.mock('../src/api/evidenceIngestion', () => ({ ingestObservedEvidenceEvent: vi.fn(async () => undefined) }));
vi.mock('../src/api/blueprintStore', () => ({
  loadBlueprintRecord: vi.fn(async () => ({ blueprint: {
    blueprintId: 'bp_1',
    offer: { offerName: 'Pilot', desiredOutcome: 'Clear proof', targetCustomer: 'Founders', painfulProblem: 'Guessing', initialTestPrice: '$49' },
    landingPageCopy: { headline: 'Proof first' },
    launchSite: { site: { businessName: 'Proof Path', contactEmail: 'owner@example.com' }, offer: { headline: 'Proof first' } }
  } }))
}));
vi.mock('../src/api/websiteBuildRunner', () => ({
  buildCustomWebsite: vi.fn(),
  renderCustomWebsiteStaticHtml: vi.fn((_spec: unknown, options: { canonicalUrl?: string }) => `<html><link rel="canonical" href="${options.canonicalUrl}"></html>`)
}));

import { fulfillGetMeLiveOrder, handleGetMeLiveConfig, handleGetMeLiveOrder, handleGetMeLivePublish, handlePublicGetMeLiveLead, legacyPagesSubdomain } from '../src/api/getMeLive';
import { renderCustomWebsiteStaticHtml } from '../src/api/websiteBuildRunner';

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
  beforeEach(() => { state.order = order(); state.updates = []; state.hostingWrites = []; });

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

const PAGES_HOST = 'proof-path-4xz.pages.dev';
const PAGES_URL = `https://${PAGES_HOST}`;
const HASH_URL = `https://a1b2c3d4.${PAGES_HOST}`;

function publishEnv(): Env {
  return { ...env(), FRONTEND_URL: 'https://ghosttown.test', BROWSER: { quickAction: vi.fn(async () => ({ ok: true })) } } as unknown as Env;
}

function publishableOrder(): GetMeLiveOrder {
  const base = order();
  return {
    ...base, status: 'preview_ready', paidAt: '2026-09-16T00:00:00.000Z',
    providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false, domainReady: true },
    configuration: {
      ...base.configuration!,
      // A legacy, registrar-ready domain must not be attached by publish.
      domain: { cloudflareAccountId: 'acct_1', selectedDomain: 'proofpath.com', cloudflareZoneId: 'zone_1' }
    }
  };
}

const ownerRequest = (path: string, init: RequestInit = {}) => new Request(`https://api.ghosttown.test/api/get-me-live/orders/gml_test${path}`, {
  ...init, headers: { Authorization: 'Bearer token', ...(init.headers || {}) }
});

describe('Get Me Live publish URL truth (Slice 1a)', () => {
  let fetched: string[] = [];
  beforeEach(() => {
    state.order = publishableOrder(); state.updates = []; state.hostingWrites = []; state.releases = []; fetched = [];
    vi.clearAllMocks();
    providers.ensurePagesProject.mockImplementation(async (_env: Env, _orderId: string, _accountId: string, name: string) => ({ name, subdomain: PAGES_HOST }));
    providers.createPagesProject.mockImplementation(async (_env: Env, _orderId: string, _accountId: string, name: string) => ({ name, subdomain: PAGES_HOST }));
    providers.deployCloudflarePagesHtml.mockImplementation(async () => ({ deploymentId: `dep_${state.updates.length}`, deploymentUrl: HASH_URL }));
    providers.getPagesProject.mockResolvedValue(null);
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      fetched.push(String(input));
      // The stable Pages URL serves whichever release was asked about.
      const releaseId = new URL(String(input)).searchParams.get('gt_verify') || '';
      return new Response(`<html><meta name="ghosttown-release-id" content="${releaseId}"></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }));
  });

  it('#1 publishes without a custom domain and never attaches one', async () => {
    const response = await handleGetMeLivePublish(ownerRequest('/publish', { method: 'POST' }), publishEnv(), 'gml_test');
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ status: 'live', verified: true, releaseId: 'rel_test_1' });
    expect(body).not.toHaveProperty('customDomain');
    expect(providers.addCloudflarePagesDomain).not.toHaveBeenCalled();
    expect(fetched.every(url => !url.includes('/domains'))).toBe(true);
    expect(state.order?.status).toBe('live');
    expect(state.order?.customDomain).toBeUndefined();
  });

  it('#3 uses the provider-returned subdomain as pagesUrl, canonical, and hosting', async () => {
    const response = await handleGetMeLivePublish(ownerRequest('/publish', { method: 'POST' }), publishEnv(), 'gml_test');
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ pagesUrl: PAGES_URL, publicUrl: PAGES_URL, pagesProjectName: 'proof-path' });
    expect(state.hostingWrites[0].hosting).toMatchObject({
      schemaVersion: 'get-me-live-hosting-v1', cloudflareAccountId: 'acct_1', pagesProjectName: 'proof-path',
      pagesSubdomain: PAGES_HOST, pagesUrl: PAGES_URL, source: 'provider'
    });
    // Hosting is persisted before the first deploy so a retry reuses the project.
    expect(vi.mocked((await import('../src/api/getMeLiveStore')).recordHosting).mock.invocationCallOrder[0])
      .toBeLessThan(providers.deployCloudflarePagesHtml.mock.invocationCallOrder[0]);
    const render = vi.mocked(renderCustomWebsiteStaticHtml).mock.calls[0][1];
    expect(render.canonicalUrl).toBe(PAGES_URL);
    expect(render.socialImageUrl).toBe(`${PAGES_URL}/og.svg`);
    expect(render.releaseId).toBe('rel_test_1');
    expect(fetched).toContain(`${PAGES_URL}/?gt_verify=rel_test_1`);
  });

  it('#4 keeps the deployment hash URL out of pagesUrl, public_url, and redirect targets', async () => {
    const response = await handleGetMeLivePublish(ownerRequest('/publish', { method: 'POST' }), publishEnv(), 'gml_test');
    const body = await response.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('a1b2c3d4');
    expect(state.order?.publicUrl).toBe(PAGES_URL);
    expect(state.order?.deploymentReceipt).toMatchObject({ publicUrl: PAGES_URL, deploymentUrl: HASH_URL, buildId: 'website_spec_hash_1' });
    const form = new FormData();
    form.set('name', 'Ada'); form.set('email', 'ada@example.com'); form.set('consent', 'yes');
    const lead = await handlePublicGetMeLiveLead(new Request('https://api.ghosttown.test/api/get-me-live/sites/gml_test/leads', { method: 'POST', body: form }), publishEnv(), 'gml_test');
    expect(lead.status).toBe(303);
    expect(lead.headers.get('Location')).toBe(`${PAGES_URL}?lead=received`);
  });

  it('#5 republish keeps the same pagesUrl and reuses the persisted project', async () => {
    await handleGetMeLivePublish(ownerRequest('/publish', { method: 'POST' }), publishEnv(), 'gml_test');
    const first = structuredClone(state.order!);
    // Even if a stale client sends a different project name, the server keeps its own.
    const config = await handleGetMeLiveConfig(ownerRequest('/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...first.configuration, offer: { ...first.configuration!.offer, headline: 'New headline' }, domain: { ...first.configuration!.domain, pagesProjectName: 'someone-elses-project' } })
    }), publishEnv(), 'gml_test');
    expect(config.status).toBe(200);
    expect(state.order?.configuration?.domain.pagesProjectName).toBeUndefined();
    const response = await handleGetMeLivePublish(ownerRequest('/publish', { method: 'POST' }), publishEnv(), 'gml_test');
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ pagesUrl: first.publicUrl, verified: true, releaseId: 'rel_test_2' });
    expect(state.releases).toEqual([{ releaseId: 'rel_test_1', kind: 'launch' }, { releaseId: 'rel_test_2', kind: 'republish' }]);
    expect(state.order?.publicUrl).toBe(PAGES_URL);
    expect(state.order?.hosting?.pagesUrl).toBe(PAGES_URL);
    // First publish creates the business-name project; the republish reuses the persisted one.
    expect(providers.createPagesProject.mock.calls.map(call => call[3])).toEqual(['proof-path']);
    expect(providers.ensurePagesProject.mock.calls.map(call => call[3])).toEqual(['proof-path']);
    expect(providers.deployCloudflarePagesHtml.mock.calls.map(call => call[3])).toEqual(['proof-path', 'proof-path']);
  });

  it('#14 normalizes a legacy hash-URL order to its stable pagesUrl from the provider', async () => {
    state.order = {
      ...publishableOrder(), status: 'live', publicUrl: 'https://9f8e7d6c.legacy-proj.pages.dev', publishedAt: '2026-09-01T00:00:00.000Z',
      deploymentReceipt: { deploymentId: 'dep_old', buildId: 'website_old', publicUrl: 'https://9f8e7d6c.legacy-proj.pages.dev', publishedAt: '2026-09-01T00:00:00.000Z' }
    };
    providers.getPagesProject.mockResolvedValue({ name: 'gt-gml-test', subdomain: 'legacy-proj.pages.dev' });
    const response = await handleGetMeLiveOrder(ownerRequest(''), publishEnv(), 'gml_test');
    expect(response.status).toBe(200);
    const body = await response.json() as { order: GetMeLiveOrder };
    expect(body.order.publicUrl).toBe('https://legacy-proj.pages.dev');
    expect(body.order.hosting).toMatchObject({ pagesSubdomain: 'legacy-proj.pages.dev', source: 'provider', pagesProjectName: 'gt-gml-test' });
    expect(state.hostingWrites).toEqual([{ hosting: expect.objectContaining({ pagesUrl: 'https://legacy-proj.pages.dev' }), publicUrl: 'https://legacy-proj.pages.dev' }]);
    expect(state.order?.status).toBe('live');
    expect(providers.deployCloudflarePagesHtml).not.toHaveBeenCalled();
    // Idempotent: a second read finds hosting and writes nothing.
    await handleGetMeLiveOrder(ownerRequest(''), publishEnv(), 'gml_test');
    expect(state.hostingWrites).toHaveLength(1);
  });

  it('#14 derives the stable host from the stored URL when Cloudflare cannot be read', async () => {
    state.order = {
      ...publishableOrder(), status: 'live', publicUrl: 'https://9f8e7d6c.legacy-proj.pages.dev',
      providerState: { ...publishableOrder().providerState, cloudflareConnected: false }
    };
    const response = await handleGetMeLiveOrder(ownerRequest(''), publishEnv(), 'gml_test');
    const body = await response.json() as { order: GetMeLiveOrder };
    expect(body.order.publicUrl).toBe('https://legacy-proj.pages.dev');
    expect(body.order.hosting?.source).toBe('derived_from_legacy');
    expect(providers.getPagesProject).not.toHaveBeenCalled();
  });

  it('#14 leaves unpublished orders and unrecognizable URLs without hosting', async () => {
    await handleGetMeLiveOrder(ownerRequest(''), publishEnv(), 'gml_test');
    expect(state.hostingWrites).toHaveLength(0);
    expect(legacyPagesSubdomain('https://proofpath.com')).toBeNull();
    expect(legacyPagesSubdomain('https://a.b.c.proj.pages.dev')).toBeNull();
    expect(legacyPagesSubdomain('https://main.proj.pages.dev')).toBe('proj.pages.dev');
    expect(legacyPagesSubdomain('https://proj.pages.dev/')).toBe('proj.pages.dev');
  });
});
