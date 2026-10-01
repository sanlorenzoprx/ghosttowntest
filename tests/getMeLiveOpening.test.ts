import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OPENING_GIVE_UP_MS, openingStep } from '../src/components/GetMeLiveOpening';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Get Me Live opening tab', () => {
  it('opens the website only once the release is verified live', () => {
    expect(openingStep({ status: 'live', verified: true, pending: false }, true, 10_000)).toBe('open');
    expect(openingStep({ status: 'verifying', verified: false, pending: true }, true, 10_000)).toBe('wait');
    expect(openingStep({ status: 'publishing', verified: false, pending: true }, false, 1_000)).toBe('wait');
  });

  it('keeps waiting when it checks before the publish request has claimed an attempt', () => {
    expect(openingStep({ status: 'provider_setup', verified: false, pending: false }, false, 1_000)).toBe('wait');
    expect(openingStep(null, false, 1_000)).toBe('wait');
  });

  it('ignores a failure left from an earlier try until this attempt has been seen running', () => {
    const staleFailure = { status: 'failed', verified: false, pending: false, failure: 'Earlier try failed' };
    expect(openingStep(staleFailure, false, 2_000)).toBe('wait');
    expect(openingStep(staleFailure, true, 40_000)).toBe('slow');
  });

  it('gives up after three minutes with a way back', () => {
    expect(openingStep({ status: 'verifying', verified: false, pending: true }, true, OPENING_GIVE_UP_MS)).toBe('slow');
  });
});

describe('#18 popup blocking does not prevent completion', () => {
  it('opens the tab first, synchronously, and publishes whatever window.open returns', async () => {
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    const handler = workspace.match(/const goLive = \(\) => \{\n([\s\S]*?)\n  \};/)?.[1] ?? '';
    const statements = handler.split('\n').map(line => line.trim()).filter(Boolean);
    expect(statements[0]).toBe('window.open(`/get-me-live/opening?order_id=${encodeURIComponent(orderId)}`, "_blank", "noopener");');
    expect(statements[1]).toBe('void publish();');
    expect(statements).toHaveLength(2);
    expect(workspace).toContain('<button onClick={goLive} disabled=');
  });

  it('the ready screen offers Open and Copy for the preferred URL without needing the tab', async () => {
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    expect(workspace).toContain('const liveUrl = order ? preferredPublicUrl(order) || order.publicUrl : undefined;');
    expect(workspace).toContain('Your website is ready.');
    expect(workspace).toContain('We built your website and put it online. You can open it, share it, and start receiving leads.');
    expect(workspace).toContain('<a href={liveUrl} target="_blank" rel="noreferrer" className="block rounded-xl border-2 border-ghost-rust bg-ghost-rust px-5 py-4 text-center font-black text-white">Open My Website</a>');
    expect(workspace).toContain('navigator.clipboard.writeText(liveUrl)');
    expect(workspace).toContain('Your latest changes are still going online.');
  });

  it('routes /get-me-live/opening before the setup workspace', async () => {
    const app = await read('src/app/App.tsx');
    expect(app).toContain("const getMeLiveOpening = screen === 'get-me-live' && window.location.pathname.startsWith('/get-me-live/opening');");
    expect(app).toContain('const getMeLiveSetup = !getMeLiveOpening &&');
    expect(app).toContain('<GetMeLiveOpening orderId={getMeLiveOrderId} />');
  });
});
