import { describe, expect, it } from 'vitest';
import { returnOriginFor } from '../src/api/getMeLive';
import type { GetMeLiveCustomDomain, GetMeLiveOrder } from '../src/types/getMeLive';

// Slice 3 (plan §5): visitors return to a validated origin of *this* site only.

const PAGES_HOST = 'proof-path-4xz.pages.dev';

function order(customDomainStatus?: GetMeLiveCustomDomain['status']): GetMeLiveOrder {
  return {
    orderId: 'gml_returns', ownerId: 'owner@example.com', sourceSprintOrderId: 'sprint_1',
    offerId: 'ghosttown_get_me_live_v1', offerVersion: '1.0', stripePriceId: 'price', status: 'live',
    providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false, domainReady: false },
    hosting: { schemaVersion: 'get-me-live-hosting-v1', cloudflareAccountId: 'acct_1', pagesProjectName: 'proof-path', pagesSubdomain: PAGES_HOST, pagesUrl: `https://${PAGES_HOST}`, source: 'provider' },
    customDomainState: customDomainStatus ? {
      schemaVersion: 'get-me-live-custom-domain-v1', version: 1, name: 'proofpath.com', hosts: ['proofpath.com', 'www.proofpath.com'],
      zoneId: 'zone_1', status: customDomainStatus, step: customDomainStatus === 'active' ? 'verified' : 'attached', addedAt: '2026-10-01T00:00:00.000Z'
    } : undefined,
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'
  };
}

const request = (headers: Record<string, string>) => new Request('https://api.ghosttown.test/api/get-me-live/sites/gml_returns/leads', { method: 'POST', headers });

describe('#7 lead and payment returns go to the validated visitor origin', () => {
  it('uses the Origin header when it is this site', () => {
    expect(returnOriginFor(order(), request({ Origin: `https://${PAGES_HOST}` }))).toBe(`https://${PAGES_HOST}`);
  });

  it("accepts this project's deployment-hash and branch-alias hosts", () => {
    expect(returnOriginFor(order(), request({ Origin: `https://a1b2c3d4.${PAGES_HOST}` }))).toBe(`https://a1b2c3d4.${PAGES_HOST}`);
    expect(returnOriginFor(order(), request({ Origin: `https://main.${PAGES_HOST}` }))).toBe(`https://main.${PAGES_HOST}`);
  });

  it('falls back to the Referer origin, dropping its path and query', () => {
    expect(returnOriginFor(order(), request({ Referer: `https://${PAGES_HOST}/pricing?utm=x#top` }))).toBe(`https://${PAGES_HOST}`);
  });

  it('falls back to the preferred public URL when neither header is usable', () => {
    expect(returnOriginFor(order(), request({}))).toBe(`https://${PAGES_HOST}`);
  });
});

describe('#8 arbitrary or look-alike origins cannot create an open redirect', () => {
  const lookalikes = [
    'https://evil.example',
    `https://${PAGES_HOST}.evil.example`,
    `https://evil${PAGES_HOST}`,
    'https://other-project.pages.dev',
    `https://a.b.${PAGES_HOST}`,
    `http://${PAGES_HOST}`,
    `https://${PAGES_HOST}:8443`,
    `https://user:pass@${PAGES_HOST}`,
    'javascript:alert(1)',
    'null',
    'not a url'
  ];
  for (const candidate of lookalikes) {
    it(`rejects ${candidate}`, () => {
      expect(returnOriginFor(order(), request({ Origin: candidate }))).toBe(`https://${PAGES_HOST}`);
      expect(returnOriginFor(order(), request({ Referer: candidate }))).toBe(`https://${PAGES_HOST}`);
    });
  }

  it('a bad Origin does not mask a good Referer', () => {
    expect(returnOriginFor(order(), request({ Origin: 'https://evil.example', Referer: `https://main.${PAGES_HOST}/x` }))).toBe(`https://main.${PAGES_HOST}`);
  });
});

describe('#25 apex and www are return origins only while the custom domain is active', () => {
  for (const status of [undefined, 'connecting', 'failed'] as const) {
    it(`rejects proofpath.com and www.proofpath.com when the domain is ${status ?? 'absent'}`, () => {
      expect(returnOriginFor(order(status), request({ Origin: 'https://proofpath.com' }))).toBe(`https://${PAGES_HOST}`);
      expect(returnOriginFor(order(status), request({ Origin: 'https://www.proofpath.com' }))).toBe(`https://${PAGES_HOST}`);
    });
  }

  it('accepts apex and www once active, and prefers the active domain as the fallback', () => {
    expect(returnOriginFor(order('active'), request({ Origin: 'https://proofpath.com' }))).toBe('https://proofpath.com');
    expect(returnOriginFor(order('active'), request({ Origin: 'https://www.proofpath.com' }))).toBe('https://www.proofpath.com');
    expect(returnOriginFor(order('active'), request({}))).toBe('https://proofpath.com');
    expect(returnOriginFor(order('active'), request({ Origin: 'https://evil.proofpath.com' }))).toBe('https://proofpath.com');
  });
});
