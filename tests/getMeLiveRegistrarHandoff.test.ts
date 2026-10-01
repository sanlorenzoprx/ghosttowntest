import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { cloudflareRegistrarUrl, domainIdeas, preferredPublicUrl } from '../src/lib/getMeLiveOffer';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const ACCOUNT = '0123456789abcdef0123456789ABCDEF';

describe('Cloudflare Registrar handoff', () => {
  it('builds the register-a-domain URL from the selected account ID', () => {
    expect(cloudflareRegistrarUrl(ACCOUNT)).toBe('https://dash.cloudflare.com/0123456789abcdef0123456789abcdef/domains/registrations/purchase');
    expect(cloudflareRegistrarUrl(` ${ACCOUNT} `)).toBe('https://dash.cloudflare.com/0123456789abcdef0123456789abcdef/domains/registrations/purchase');
  });

  it('falls back to the account picker when no usable account ID is known', () => {
    for (const missing of [undefined, '', 'acct_1', '../../evil', `${ACCOUNT}/x`]) {
      expect(cloudflareRegistrarUrl(missing)).toBe('https://dash.cloudflare.com/?to=/:account/registrar/register');
    }
  });

  it('turns name ideas into up to five .com ideas without checking availability', () => {
    expect(domainIdeas(['Proof Path', 'Clear Works', 'Proof-Path', '!!!', 'Bridge Studio', 'Path Clear', 'One', 'Two'])).toEqual([
      'proofpath.com', 'clearworks.com', 'bridgestudio.com', 'pathclear.com', 'one.com'
    ]);
    expect(domainIdeas([])).toEqual([]);
  });

  it('the card is optional: it only links out, and a bought-but-unconnected domain never changes the live URL', async () => {
    const order = { hosting: { pagesProjectName: 'proof-path', pagesSubdomain: 'proof-path.pages.dev', pagesUrl: 'https://proof-path.pages.dev' } };
    expect(preferredPublicUrl(order)).toBe('https://proof-path.pages.dev');
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    const card = workspace.slice(workspace.indexOf('Want your own website address?'), workspace.indexOf('Want a matching business email?'));
    expect(card).toContain('<a href={cloudflareRegistrarUrl(accountId)} target="_blank" rel="noopener noreferrer"');
    expect(card).toContain('Ideas to try — Cloudflare will confirm what is available and show the current price.');
    expect(card).not.toMatch(/request\(|fetch\(|setConfiguration|publish/);
    expect(workspace).toContain('{!order.customDomainState && <div');
  });
});
