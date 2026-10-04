import { afterEach, describe, expect, it, vi } from 'vitest';
import * as providers from '../src/api/getMeLiveProviders';
import { createConnectedCheckoutSession, deployCloudflarePagesHtml, ensurePagesProject, getPagesProject, listCloudflareAccounts } from '../src/api/getMeLiveProviders';
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
  it('resolves Cloudflare accounts from the memberships scope used by OAuth', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/memberships?per_page=50');
      return new Response(JSON.stringify({ success: true, result: [
        { account: { id: 'acct_1', name: 'Zayas House LLC' } },
        { account: { id: 'acct_1', name: 'Zayas House LLC' } }
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    await expect(listCloudflareAccounts(env('gml_accounts'), 'gml_accounts')).resolves.toEqual([
      { id: 'acct_1', name: 'Zayas House LLC' }
    ]);
  });

  it('no longer searches, checks, or registers domains in-app (registrar path retired)', () => {
    for (const retired of ['searchCloudflareDomains', 'checkCloudflareDomain', 'registerCloudflareDomain', 'getCloudflareRegistrationStatus']) {
      expect(providers).not.toHaveProperty(retired);
    }
    for (const kept of ['findCloudflareZone', 'addCloudflarePagesDomain', 'configureCloudflareEmailRouting', 'ensurePagesProject', 'deployCloudflarePagesHtml']) {
      expect(providers).toHaveProperty(kept);
    }
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

const cfJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Get Me Live Pages hostname truth (plan §3)', () => {
  it('#3 returns the provider subdomain for an existing project, including a Cloudflare-suffixed one', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.cloudflare.com/client/v4/accounts/acct_1/pages/projects/proof-path');
      expect(init?.method ?? 'GET').toBe('GET');
      return cfJson({ success: true, result: { name: 'proof-path', subdomain: 'proof-path-4xz.pages.dev' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(ensurePagesProject(env('gml_p1'), 'gml_p1', 'acct_1', 'proof-path')).resolves.toEqual({ name: 'proof-path', subdomain: 'proof-path-4xz.pages.dev' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('#3 creates a missing project and keeps the subdomain Cloudflare assigned', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${String(input)}`);
      if ((init?.method ?? 'GET') === 'GET') return cfJson({ success: false, errors: [{ message: 'not found' }] }, 404);
      expect(JSON.parse(String(init?.body))).toEqual({ name: 'proof-path', production_branch: 'main' });
      return cfJson({ success: true, result: { name: 'proof-path', subdomain: 'proof-path-9qa.pages.dev' } });
    }));
    await expect(ensurePagesProject(env('gml_p2'), 'gml_p2', 'acct_1', 'proof-path')).resolves.toEqual({ name: 'proof-path', subdomain: 'proof-path-9qa.pages.dev' });
    expect(calls).toEqual([
      'GET https://api.cloudflare.com/client/v4/accounts/acct_1/pages/projects/proof-path',
      'POST https://api.cloudflare.com/client/v4/accounts/acct_1/pages/projects'
    ]);
  });

  it('#3 re-reads a created project when the create response omits the subdomain', async () => {
    let gets = 0;
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST') return cfJson({ success: true, result: { name: 'proof-path' } });
      gets += 1;
      return gets === 1 ? cfJson({ success: false }, 404) : cfJson({ success: true, result: { name: 'proof-path', subdomain: 'proof-path-2b7.pages.dev' } });
    }));
    await expect(ensurePagesProject(env('gml_p3'), 'gml_p3', 'acct_1', 'proof-path')).resolves.toEqual({ name: 'proof-path', subdomain: 'proof-path-2b7.pages.dev' });
  });

  it('#3 never manufactures a Pages host when Cloudflare does not return one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => cfJson({ success: true, result: { name: 'proof-path' } })));
    await expect(getPagesProject(env('gml_p4'), 'gml_p4', 'acct_1', 'proof-path')).rejects.toThrow(/did not return the Pages address/);
  });

  it('#4 reports the deployment hash URL as deploymentUrl only and does not look up or invent a project URL', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/upload-token')) return cfJson({ success: true, result: { jwt: 'jwt_1' } });
      if (url.endsWith('/pages/assets/check-missing')) return cfJson({ success: true, result: [] });
      if (url.endsWith('/pages/assets/upsert-hashes')) return cfJson({ success: true, result: true });
      if (url.endsWith('/deployments')) return cfJson({ success: true, result: { id: 'dep_1', url: 'https://a1b2c3d4.proof-path-4xz.pages.dev', aliases: ['https://main.proof-path-4xz.pages.dev'] } });
      throw new Error(`unexpected ${url}`);
    }));
    const deployment = await deployCloudflarePagesHtml(env('gml_p5'), 'gml_p5', 'acct_1', 'proof-path', '<html></html>');
    expect(deployment).toEqual({ deploymentId: 'dep_1', deploymentUrl: 'https://a1b2c3d4.proof-path-4xz.pages.dev' });
    expect(deployment).not.toHaveProperty('publicUrl');
    expect(calls.some(call => call === 'GET https://api.cloudflare.com/client/v4/accounts/acct_1/pages/projects/proof-path')).toBe(false);
  });
});

describe('Cloudflare OAuth least privilege (Slice 9)', () => {
  it('never requests Registrar scopes, whatever the configured list says', () => {
    expect(providers.cloudflareOAuthScopes('account:read registrar:write page.write pages:write, zone:read registrar:read dns_records:edit'))
      .toEqual(['account.read', 'pages.write', 'zone.read', 'dns.write']);
    expect(() => providers.cloudflareOAuthScopes(' ')).toThrow('CLOUDFLARE_OAUTH_SCOPES is not configured');
  });

  it('the authorization URL carries the filtered scopes', async () => {
    const kv = { put: vi.fn(async () => undefined) };
    const url = new URL(await providers.createCloudflareAuthorizationUrl({
      KV: kv, CLOUDFLARE_OAUTH_CLIENT_ID: 'client', CLOUDFLARE_OAUTH_SCOPES: 'account:read registrar:write page.write'
    } as unknown as Env, { orderId: 'gml_1', ownerId: 'owner@example.com', redirectUri: 'https://api.test/cb' }));
    expect(url.searchParams.get('scope')).toBe('account.read pages.write');
  });

  it('no Registrar API call remains in the Worker source', async () => {
    const { readFile } = await import('node:fs/promises');
    for (const file of ['src/api/getMeLiveProviders.ts', 'src/api/getMeLive.ts', 'src/api/index.ts']) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
      expect(source).not.toMatch(/\/registrar\/(domain-search|domain-check|registrations)/);
    }
  });
});
