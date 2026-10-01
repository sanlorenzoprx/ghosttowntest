import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { preferredPublicUrl } from '../src/lib/getMeLiveOffer';
import type { GetMeLiveCustomDomain } from '../src/types/getMeLive';

// Slice 7 contracts. The state machine itself runs on real D1 in
// tests/runtime/getMeLiveCustomDomain.worker.test.ts.

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const hosting = { schemaVersion: 'get-me-live-hosting-v1' as const, cloudflareAccountId: 'acct', pagesProjectName: 'proof-path', pagesSubdomain: 'proof-path.pages.dev', pagesUrl: 'https://proof-path.pages.dev', source: 'provider' as const };
const domain = (status: GetMeLiveCustomDomain['status']): GetMeLiveCustomDomain => ({
  schemaVersion: 'get-me-live-custom-domain-v1', version: 3, name: 'proofpath.com', hosts: ['proofpath.com', 'www.proofpath.com'],
  zoneId: 'zone', status, step: status === 'active' ? 'verified' : 'attached', addedAt: '2026-10-01T00:00:00.000Z'
});

describe('Get Me Live custom domain contracts', () => {
  it('#9 #10: only an active domain changes the preferred URL', () => {
    expect(preferredPublicUrl({ hosting, customDomainState: domain('connecting') })).toBe(hosting.pagesUrl);
    expect(preferredPublicUrl({ hosting, customDomainState: domain('failed') })).toBe(hosting.pagesUrl);
    expect(preferredPublicUrl({ hosting, customDomainState: domain('active') })).toBe('https://proofpath.com');
  });

  it('exposes zones (GET), connect and delete, and reconcile (POST only)', async () => {
    const index = await read('src/api/index.ts');
    expect(index).toContain("getMeLiveCustomDomainZonesMatch && method === 'GET'");
    expect(index).toContain("getMeLiveCustomDomainReconcileMatch && method === 'POST'");
    expect(index).toContain("getMeLiveCustomDomainMatch && (method === 'POST' || method === 'DELETE')");
  });

  it('reads never reconcile; the workspace reconciles by POST on load and every 15 s while connecting', async () => {
    const api = await read('src/api/getMeLive.ts');
    const orderHandler = api.slice(api.indexOf('export async function handleGetMeLiveOrder('), api.indexOf('export async function handleGetMeLiveConfig('));
    expect(orderHandler).not.toContain('reconcileCustomDomainStep');
    const zonesHandler = api.slice(api.indexOf('export async function handleGetMeLiveCustomDomainZones('), api.indexOf('function customDomainResponse('));
    expect(zonesHandler).not.toMatch(/addCloudflarePagesDomain|createCloudflareDnsCname|updateCustomDomainCas|claimPublishAttempt/);
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    expect(workspace).toContain('const domainConnecting = order?.customDomainState?.status === "connecting";');
    expect(workspace).toContain('request<CustomDomainResult>(`${customDomainPath}/reconcile`, { method: "POST" })');
    expect(workspace).toContain('window.setInterval(() => void reconcile(), 15000)');
  });

  it('the card reads as optional in every state and always names the working Pages address', async () => {
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    expect(workspace).toContain('Cloudflare is setting up your address. This can take a few minutes; you can close this page.');
    expect(workspace).toContain('Your website is now at {order.customDomainState.name}');
    expect(workspace).toContain('Your website is still open at {order.hosting?.pagesUrl}.');
    expect(workspace).toContain('I bought it — connect it');
    expect(workspace).toContain('Show me how to connect it');
    expect(workspace).toContain('>Try again</button>');
  });

  it('custom_domain is written only by the compare-and-swap writer, and only while active', async () => {
    const store = await read('src/api/getMeLiveStore.ts');
    expect(store).toContain("next?.status === 'active' ? next.name : null");
    expect(store).toContain("json_extract(custom_domain_json, '$.version') = ?");
    const writers = store.match(/SET[^;`]*\bcustom_domain\s*=/g) || [];
    expect(writers).toHaveLength(1);
  });
});
