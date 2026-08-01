import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleResearchPreviewSuggestions, safePublicHttpsUrl } from '../src/api/researchPreview';
import type { Env } from '../src/api/env';

class MemoryKv {
  values = new Map<string, string>([['verdict_result-1', '{}']]);
  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
}

function env(kv = new MemoryKv()): Env {
  return { KV: kv as unknown as KVNamespace, AI: {} as Ai, DATAFORSEO_LOGIN: 'login', DATAFORSEO_PASSWORD: 'password', JWT_SECRET: 'secret', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' };
}

function request(signalType = 'commercial') {
  return new Request('https://example.com/api/research-preview/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' }, body: JSON.stringify({ resultId: 'result-1', ideaSummary: 'Scheduling for dental offices', signalType, locale: 'en' }) });
}

afterEach(() => vi.unstubAllGlobals());

describe('pre-purchase provider research preview', () => {
  it('normalizes provider candidates, caps results at six, and returns no raw snippets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: Array.from({ length: 9 }, (_, index) => ({ type: 'organic', title: `Tool ${index}`, url: `https://tool-${index}.example.com/page`, description: 'raw provider snippet must not escape' })) }] }] }), { status: 200 })));
    const response = await handleResearchPreviewSuggestions(request(), env());
    const body = await response.json() as { suggestions: Array<Record<string, unknown>> };
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.suggestions).toHaveLength(6);
    expect(body.suggestions[0]).toMatchObject({ provider: 'dataforseo', verificationStatus: 'provider_candidate' });
    expect(body.suggestions[0].candidateId).toMatch(/^preview_dataforseo_/);
    expect(JSON.stringify(body)).not.toContain('raw provider snippet');
  });

  it('rate-limits anonymous previews in KV while leaving suggestions out of KV', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: [] }] }] }), { status: 200 })));
    const kv = new MemoryKv();
    const bound = env(kv);
    for (let index = 0; index < 3; index += 1) expect((await handleResearchPreviewSuggestions(request(), bound)).status).toBe(200);
    expect((await handleResearchPreviewSuggestions(request(), bound)).status).toBe(429);
    expect([...kv.values.keys()].some(key => key.startsWith('research_preview_rate_'))).toBe(true);
    expect([...kv.values.keys()].some(key => key.includes('suggestion'))).toBe(false);
  });

  it('rejects non-public URLs before they can become candidates', () => {
    expect(safePublicHttpsUrl('http://example.com')).toBeNull();
    expect(safePublicHttpsUrl('https://localhost/path')).toBeNull();
    expect(safePublicHttpsUrl('https://192.168.1.2/path')).toBeNull();
    expect(safePublicHttpsUrl('https://example.com/path')?.hostname).toBe('example.com');
  });
});
