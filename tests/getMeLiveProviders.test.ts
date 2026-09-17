import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConnectedCheckoutSession, getCloudflareRegistrationStatus, registerCloudflareDomain, searchCloudflareDomains } from '../src/api/getMeLiveProviders';
import type { Env } from '../src/api/env';

function env(orderId?: string): Env {
  const token = orderId ? JSON.stringify({ accessToken: 'cf_oauth_token', expiresAt: new Date(Date.now() + 3600000).toISOString() }) : null;
  const kv = {
    get: vi.fn(async (key: string) => key === `get_me_live_cf_token_${orderId}` ? token : null),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined)
  };
  return {
    KV: kv,
    JWT_SECRET: 'test',
    STRIPE_SECRET_KEY: 'sk_test_get_me_live',
    STRIPE_PRICE_ID: 'price_base',
    STRIPE_WEBHOOK_SECRET: 'whsec_platform'
  } as unknown as Env;
}

afterEach(() => vi.unstubAllGlobals());

describe('Get Me Live provider contracts', () => {
  it('normalizes Cloudflare domain search results through the connected OAuth token', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('/registrar/domain-search');
      return new Response(JSON.stringify({ success: true, result: { domains: [{ name: 'proofpath.com', registrable: true, tier: 'standard', pricing: { currency: 'USD', registration_cost: '10.00', renewal_cost: '10.00' } }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const domains = await searchCloudflareDomains(env('gml_1'), 'gml_1', 'acct_1', 'Proof Path', 6);
    expect(domains[0]).toMatchObject({ name: 'proofpath.com', registrable: true, registrationCost: '10.00', renewalCost: '10.00', currency: 'USD' });
  });


  it('treats Cloudflare registration as a workflow and does not mark pending registration ready', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      if (call === 1) return new Response(JSON.stringify({ success: true, result: { domains: [{ name: 'proofpath.com', registrable: true, tier: 'standard', pricing: { currency: 'USD', registration_cost: '10.00', renewal_cost: '10.00' } }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, result: { completed: false, state: 'in_progress', context: { domain_name: 'proofpath.com' } } }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    }));
    const result = await registerCloudflareDomain(env('gml_2'), 'gml_2', 'acct_1', 'proofpath.com', { registrationCost: '10.00', currency: 'USD' });
    expect(result).toMatchObject({ domainName: 'proofpath.com', ready: false, workflowState: 'in_progress', registrationCost: '10.00' });
  });


  it('marks registration ready only after Cloudflare reports succeeded', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/registration-status');
      return new Response(JSON.stringify({ success: true, result: { completed: true, state: 'succeeded', context: { registration: { domain_name: 'proofpath.com', status: 'active', expires_at: '2027-09-16T00:00:00Z' } } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const result = await getCloudflareRegistrationStatus(env('gml_3'), 'gml_3', 'acct_1', 'proofpath.com');
    expect(result).toMatchObject({ domainName: 'proofpath.com', status: 'active', ready: true, workflowState: 'succeeded' });
  });

  it('creates connected-account checkout with evidence lineage metadata', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string,string>)['Stripe-Account']).toBe('acct_connected');
      const form = new URLSearchParams(String(init?.body || ''));
      expect(form.get('metadata[get_me_live_experiment_order_id]')).toBe('gml_42');
      expect(form.get('metadata[source_sprint_order_id]')).toBe('sprint_42');
      expect(form.get('line_items[0][price_data][unit_amount]')).toBe('4900');
      expect(form.get('payment_method_types[0]')).toBeNull();
      expect(form.get('integration_identifier')).toMatch(/^ghosttown_gml_[a-z]{8}$/);
      return new Response(JSON.stringify({ id: 'cs_connected', url: 'https://checkout.stripe.test/session' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = await createConnectedCheckoutSession(env(), { accountId: 'acct_connected', productName: 'Pilot', price: '$49', successUrl: 'https://site.test?success=1', cancelUrl: 'https://site.test?cancel=1', getMeLiveOrderId: 'gml_42', sourceSprintOrderId: 'sprint_42' });
    expect(session.id).toBe('cs_connected');
  });
});
