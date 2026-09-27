import type { Env } from './env';
import { ProviderRequestError, providerHttpError, providerSemanticError } from './providerOutcome';
import type { SearchDiscoveryResult, SearchProvider } from './searchProvider';

export const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
export const BRAVE_MONTHLY_BUDGET_USD = 25;
export const BRAVE_WARNING_FRACTION = 0.8;
export const BRAVE_ESTIMATED_COST_PER_REQUEST_USD = 0.005;

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
}

interface BraveBudgetMeter {
  schemaVersion: 'ghosttown-brave-budget-v1';
  month: string;
  requests: number;
  estimatedUsd: number;
  updatedAt: string;
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function budgetKey(month: string): string {
  return `provider_budget:brave_search:${month}`;
}

function parseMeter(raw: string | null, month: string): BraveBudgetMeter {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BraveBudgetMeter;
      if (parsed.month === month && Number.isFinite(parsed.requests) && Number.isFinite(parsed.estimatedUsd)) return parsed;
    } catch {
      // Corrupt accounting data fails closed below by starting a new meter only
      // when the stored value is unusable, while preserving the hard cap logic.
    }
  }
  return {
    schemaVersion: 'ghosttown-brave-budget-v1',
    month,
    requests: 0,
    estimatedUsd: 0,
    updatedAt: new Date().toISOString()
  };
}

export async function reserveBraveSearchBudget(env: Env): Promise<BraveBudgetMeter> {
  const month = monthKey();
  const key = budgetKey(month);
  const current = parseMeter(await env.KV.get(key), month);
  const nextEstimated = Number((current.estimatedUsd + BRAVE_ESTIMATED_COST_PER_REQUEST_USD).toFixed(6));
  if (nextEstimated > BRAVE_MONTHLY_BUDGET_USD) {
    throw new ProviderRequestError({
      provider: 'brave_search',
      outcome: 'QUOTA_EXHAUSTED',
      message: 'GhostTown Brave Search monthly budget cap reached'
    });
  }
  const next: BraveBudgetMeter = {
    ...current,
    requests: current.requests + 1,
    estimatedUsd: nextEstimated,
    updatedAt: new Date().toISOString()
  };
  await env.KV.put(key, JSON.stringify(next), { expirationTtl: 86400 * 62 });
  if (next.estimatedUsd >= BRAVE_MONTHLY_BUDGET_USD * BRAVE_WARNING_FRACTION) {
    await env.KV.put(
      `provider_budget_warning:brave_search:${month}`,
      JSON.stringify({
        provider: 'brave_search',
        month,
        threshold: BRAVE_WARNING_FRACTION,
        estimatedUsd: next.estimatedUsd,
        capUsd: BRAVE_MONTHLY_BUDGET_USD,
        recordedAt: next.updatedAt
      }),
      { expirationTtl: 86400 * 62 }
    );
  }
  return next;
}

export const braveSearchProvider: SearchProvider = {
  id: 'brave_search',

  async search(env: Env, query: string): Promise<SearchDiscoveryResult[]> {
    const apiKey = env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) throw providerSemanticError('brave_search', 'Brave Search API key is not configured');
    const cleaned = query.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    await reserveBraveSearchBudget(env);

    const url = new URL(BRAVE_SEARCH_ENDPOINT);
    url.searchParams.set('q', cleaned.slice(0, 600));
    url.searchParams.set('count', '20');
    url.searchParams.set('search_lang', 'en');
    url.searchParams.set('safesearch', 'moderate');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey
      }
    });
    if (!response.ok) {
      const bodyText = await response.text();
      throw providerHttpError('brave_search', response.status, bodyText, response.headers.get('retry-after'));
    }

    const body = await response.json() as BraveSearchResponse;
    return (body.web?.results || [])
      .map(result => ({
        title: String(result.title || '').replace(/\s+/g, ' ').trim(),
        url: String(result.url || '').trim(),
        description: String(result.description || '').replace(/\s+/g, ' ').trim() || undefined
      }))
      .filter(result => Boolean(result.title && result.url));
  }
};
