import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type { GetMeLiveOrder } from '../src/types/getMeLive';
import { pagesProjectCandidates, pagesSlug, resolvePagesProject, shortHash } from '../src/api/getMeLive';

// Slice 1c (plan §4): customer-friendly Pages project names with an overwrite guard.

function env(orderId: string): Env {
  const kv = {
    get: vi.fn(async (key: string) => key === `get_me_live_cf_token_${orderId}`
      ? JSON.stringify({ accessToken: 'cf_token', expiresAt: new Date(Date.now() + 3600000).toISOString() })
      : null),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined)
  };
  return { KV: kv, JWT_SECRET: 'test', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' } as unknown as Env;
}

function order(overrides: Partial<GetMeLiveOrder> = {}, businessName = "Joe's Dog Walking"): GetMeLiveOrder {
  return {
    orderId: 'gml_naming_1', ownerId: 'owner@example.com', sourceSprintOrderId: 'sprint_1',
    offerId: 'ghosttown_get_me_live_v1', offerVersion: '1.0', stripePriceId: 'price', status: 'preview_ready',
    providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false },
    configuration: {
      schemaVersion: 'get-me-live-config-v1',
      brand: { businessName, stylePreset: 'clean_saas' },
      offer: { intent: 'interest' },
      contact: { contactEmail: 'owner@example.com', leadDestinationEmail: 'owner@example.com' },
      domain: { cloudflareAccountId: 'acct_1' },
      payments: { enabled: false }
    },
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides
  };
}

/** Fake Cloudflare account: `existing` projects belong to the customer, not to this order. */
function cloudflare(existing: string[]) {
  const projects = new Set(existing);
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method || 'GET';
    calls.push(`${method} ${url.pathname}`);
    if (method === 'GET') {
      const name = decodeURIComponent(url.pathname.split('/').pop() || '');
      return projects.has(name)
        ? new Response(JSON.stringify({ success: true, result: { name, subdomain: `${name}.pages.dev` } }), { status: 200 })
        : new Response(JSON.stringify({ success: false }), { status: 404 });
    }
    const { name } = JSON.parse(String(init?.body)) as { name: string };
    if (projects.has(name)) return new Response(JSON.stringify({ success: false, errors: [{ message: 'A project with this name already exists' }] }), { status: 409 });
    projects.add(name);
    return new Response(JSON.stringify({ success: true, result: { name, subdomain: `${name}-x1y.pages.dev` } }), { status: 200 });
  }));
  return { projects, calls, created: () => calls.filter(call => call.startsWith('POST')) };
}

afterEach(() => vi.unstubAllGlobals());

describe('#34 Pages project slug rules', () => {
  it('lowercases, keeps only [a-z0-9-], collapses and trims hyphens', () => {
    expect(pagesSlug("Joe's Dog Walking")).toBe('joe-s-dog-walking');
    expect(pagesSlug('  --Café  & Co.--  ')).toBe('caf-co');
    expect(pagesSlug('A---B___C')).toBe('a-b-c');
  });

  it('truncates to 53 so slug + "-" + 4-char suffix fits 58, without a trailing hyphen', async () => {
    const slug = pagesSlug('x'.repeat(52) + ' ' + 'y'.repeat(20));
    expect(slug.length).toBeLessThanOrEqual(53);
    expect(slug.endsWith('-')).toBe(false);
    expect(pagesSlug('z'.repeat(80))).toHaveLength(53);
    const suffixed = `${pagesSlug('z'.repeat(80))}-${await shortHash('gml_any')}`;
    expect(suffixed.length).toBe(58);
  });

  it('falls back to the order-id name when the slug is empty', async () => {
    expect(pagesSlug('!!! ¿? ***')).toBe('');
    expect(await pagesProjectCandidates(order({}, '!!!'))).toEqual(['gt-gml-naming-1']);
  });

  it('uses a deterministic 4-hex suffix from sha256(orderId)', async () => {
    const first = await shortHash('gml_naming_1');
    expect(first).toMatch(/^[0-9a-f]{4}$/);
    expect(await shortHash('gml_naming_1')).toBe(first);
    expect(await shortHash('gml_naming_2')).not.toBe(first);
    expect(await pagesProjectCandidates(order())).toEqual(['joe-s-dog-walking', `joe-s-dog-walking-${first}`, 'gt-gml-naming-1']);
  });
});

describe('#21 overwrite guard', () => {
  it('never deploys to an existing same-name project that is not persisted on the order', async () => {
    const account = cloudflare(['joe-s-dog-walking']);
    const project = await resolvePagesProject(env('gml_naming_1'), order(), 'acct_1');
    const suffix = await shortHash('gml_naming_1');
    expect(project.name).toBe(`joe-s-dog-walking-${suffix}`);
    expect(project.subdomain).toBe(`joe-s-dog-walking-${suffix}-x1y.pages.dev`);
    expect(account.created()).toEqual(['POST /client/v4/accounts/acct_1/pages/projects']);
  });

  it('falls through to the order-id name when both friendly names are taken', async () => {
    const suffix = await shortHash('gml_naming_1');
    const account = cloudflare(['joe-s-dog-walking', `joe-s-dog-walking-${suffix}`]);
    expect((await resolvePagesProject(env('gml_naming_1'), order(), 'acct_1')).name).toBe('gt-gml-naming-1');
    expect(account.projects.size).toBe(3);
  });

  it('treats a name taken between the check and the create as taken', async () => {
    const account = cloudflare([]);
    const realFetch = globalThis.fetch;
    let raced = false;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!raced && init?.method === 'POST') { raced = true; account.projects.add('joe-s-dog-walking'); }
      return realFetch(input, init);
    }));
    const project = await resolvePagesProject(env('gml_naming_1'), order(), 'acct_1');
    expect(project.name).toBe(`joe-s-dog-walking-${await shortHash('gml_naming_1')}`);
  });

  it('reuses the project persisted on the order, even though its name exists', async () => {
    const account = cloudflare(['joe-s-dog-walking']);
    const persisted = order({
      hosting: { schemaVersion: 'get-me-live-hosting-v1', cloudflareAccountId: 'acct_1', pagesProjectName: 'joe-s-dog-walking', pagesSubdomain: 'joe-s-dog-walking.pages.dev', pagesUrl: 'https://joe-s-dog-walking.pages.dev', source: 'provider' }
    });
    expect(await resolvePagesProject(env('gml_naming_1'), persisted, 'acct_1')).toEqual({ name: 'joe-s-dog-walking', subdomain: 'joe-s-dog-walking.pages.dev' });
    expect(account.created()).toEqual([]);
  });

  it('keeps a legacy order on its existing project name (hosting derived without an account id)', async () => {
    cloudflare(['ghosttown-e2e-legacy']);
    const legacy = order({
      hosting: { schemaVersion: 'get-me-live-hosting-v1', cloudflareAccountId: '', pagesProjectName: 'ghosttown-e2e-legacy', pagesSubdomain: 'ghosttown-e2e-legacy.pages.dev', pagesUrl: 'https://ghosttown-e2e-legacy.pages.dev', source: 'derived_from_legacy' }
    });
    expect((await resolvePagesProject(env('gml_naming_1'), legacy, 'acct_1')).name).toBe('ghosttown-e2e-legacy');
  });
});
