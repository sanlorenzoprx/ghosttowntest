import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import {
  BRAVE_ESTIMATED_COST_PER_REQUEST_USD,
  BRAVE_MONTHLY_BUDGET_USD,
  braveSearchProvider,
  reserveBraveSearchBudget
} from '../src/api/braveSearchProvider';
import { ProviderRequestError } from '../src/api/providerOutcome';

function fakeKv(seed: Record<string, string> = {}): KVNamespace {
  const values = new Map(Object.entries(seed));
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    delete: vi.fn(async (key: string) => { values.delete(key); })
  } as unknown as KVNamespace;
}

describe('Brave Search discovery provider', () => {
  it('uses Brave only for candidate URL discovery and records budget usage', async () => {
    const kv = fakeKv();
    const env = { KV: kv, BRAVE_SEARCH_API_KEY: 'fixture-brave-key' } as Env;
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ 'X-Subscription-Token': 'fixture-brave-key' });
      return Response.json({
        web: {
          results: [
            { title: 'Founder discussion', url: 'https://example.com/forum/thread', description: 'Public discussion' }
          ]
        }
      });
    }));

    const results = await braveSearchProvider.search(env, 'AI app launch forum');
    expect(results).toEqual([
      { title: 'Founder discussion', url: 'https://example.com/forum/thread', description: 'Public discussion' }
    ]);
    expect(kv.put).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('fails closed at the internal $25 monthly budget cap', async () => {
    const month = new Date().toISOString().slice(0, 7);
    const env = {
      KV: fakeKv({
        [`provider_budget:brave_search:${month}`]: JSON.stringify({
          schemaVersion: 'ghosttown-brave-budget-v1',
          month,
          requests: 5000,
          estimatedUsd: BRAVE_MONTHLY_BUDGET_USD,
          updatedAt: new Date().toISOString()
        })
      })
    } as Env;

    const error = await reserveBraveSearchBudget(env).catch(value => value);
    expect(error).toBeInstanceOf(ProviderRequestError);
    expect((error as ProviderRequestError).outcome).toBe('QUOTA_EXHAUSTED');
  });

  it('meters the documented per-request estimate deterministically', async () => {
    const env = { KV: fakeKv() } as Env;
    const meter = await reserveBraveSearchBudget(env);
    expect(meter.requests).toBe(1);
    expect(meter.estimatedUsd).toBe(BRAVE_ESTIMATED_COST_PER_REQUEST_USD);
  });
});
