import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GetMeLiveCustomDomain, GetMeLiveOrder } from '../src/types/getMeLive';

// Slice 8 (plan §10): business email is optional and offered only after the
// customer's own web address is active.

const state = vi.hoisted(() => ({ order: null as GetMeLiveOrder | null, routed: [] as Array<Record<string, unknown>>, verified: true }));

vi.mock('../src/api/getMeLiveStore', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadGetMeLiveOrder: vi.fn(async () => structuredClone(state.order)),
  updateGetMeLiveOrder: vi.fn(async (_env: Env, order: GetMeLiveOrder) => { state.order = structuredClone(order); })
}));
vi.mock('../src/api/getMeLiveProviders', async importOriginal => ({
  ...(await importOriginal<object>()),
  findCloudflareZone: vi.fn(async () => ({ id: 'zone_found', name: 'proofpath.com' })),
  configureCloudflareEmailRouting: vi.fn(async (_env: Env, _orderId: string, input: Record<string, unknown>) => {
    state.routed.push(input);
    return { businessEmail: `${input.localPart}@${input.domain}`, verified: state.verified };
  })
}));
vi.mock('../src/api/auth', () => ({ authenticateRequest: vi.fn(async () => ({ email: 'owner@example.com' })) }));

import { handleGetMeLiveEmailSetup } from '../src/api/getMeLive';

const env = { JWT_SECRET: 'test' } as Env;
const domain = (status: GetMeLiveCustomDomain['status'], name = 'proofpath.com', hosts = [name, `www.${name}`]): GetMeLiveCustomDomain => ({
  schemaVersion: 'get-me-live-custom-domain-v1', version: 5, name, hosts, zoneId: 'zone_1', status,
  step: status === 'active' ? 'verified' : 'attached', addedAt: '2026-10-01T00:00:00.000Z'
});

function order(customDomainState?: GetMeLiveCustomDomain, legacySelectedDomain?: string): GetMeLiveOrder {
  return {
    orderId: 'gml_email', ownerId: 'owner@example.com', sourceSprintOrderId: 'sprint_1', offerId: 'ghosttown_get_me_live_v1', offerVersion: '1.0',
    stripePriceId: 'price', status: 'live', paidAt: '2026-10-01T00:00:00.000Z', publishedAt: '2026-10-01T00:00:00.000Z',
    providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false },
    hosting: { schemaVersion: 'get-me-live-hosting-v1', cloudflareAccountId: 'acct_1', pagesProjectName: 'proof-path', pagesSubdomain: 'proof-path.pages.dev', pagesUrl: 'https://proof-path.pages.dev', source: 'provider' },
    customDomainState,
    configuration: {
      schemaVersion: 'get-me-live-config-v1',
      brand: { businessName: 'Proof Path', stylePreset: 'clean_saas' },
      offer: { intent: 'interest', offer: 'Pilot', price: '$49', ctaLabel: 'I am interested' },
      contact: { contactEmail: 'owner@example.com', leadDestinationEmail: 'leads@example.com', businessEmailLocalPart: 'hello' },
      domain: { cloudflareAccountId: 'acct_1', selectedDomain: legacySelectedDomain },
      payments: { enabled: false }
    },
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'
  };
}

const setup = () => handleGetMeLiveEmailSetup(new Request('https://api.test/api/get-me-live/orders/gml_email/email/setup', {
  method: 'POST', headers: { Authorization: 'Bearer token' }
}), env, 'gml_email');

describe('Business email setup (Slice 8)', () => {
  beforeEach(() => { state.routed = []; state.verified = true; });

  it('returns 409 unless the custom domain is active, including a legacy selected domain', async () => {
    for (const current of [order(), order(undefined, 'proofpath.com'), order(domain('connecting')), order(domain('failed'))]) {
      state.order = current;
      const response = await setup();
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: 'Connect your own web address first. Business email is available once it is active.' });
    }
    expect(state.routed).toEqual([]);
  });

  it('returns 409 for an active sub-address; email needs the main domain', async () => {
    state.order = order(domain('active', 'shop.proofpath.com', ['shop.proofpath.com']));
    expect((await setup()).status).toBe(409);
    expect(state.routed).toEqual([]);
  });

  it('routes hello@<active domain> to the lead email using the domain record zone', async () => {
    state.order = order(domain('active'));
    const response = await setup();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ businessEmail: 'hello@proofpath.com', verified: true });
    expect(state.routed).toEqual([{ accountId: 'acct_1', zoneId: 'zone_1', domain: 'proofpath.com', localPart: 'hello', destinationEmail: 'leads@example.com' }]);
    expect(state.order?.providerState.businessEmailVerified).toBe(true);
  });

  it('asks the customer to confirm the destination when Cloudflare has not verified it yet', async () => {
    state.order = order(domain('active'));
    state.verified = false;
    const response = await setup();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ verified: false, actionRequired: 'Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.' });
    expect(state.order?.status).toBe('live');
  });
});
