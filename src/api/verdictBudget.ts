/**
 * Rate limits and cost tracking for the free verdict (POST /api/verdict).
 *
 * - Per-IP and per-account hourly limits, stored in runtime_rate_limits.
 * - One structured `verdict_cost` log line per delivered verdict with tokens,
 *   searches, and an estimated cost.
 * - A daily cost total; the first verdict that pushes the day over
 *   VERDICT_DAILY_COST_ALARM_USD logs `verdict_daily_cost_alarm` and, when
 *   VERDICT_COST_ALARM_WEBHOOK_URL is set, posts the alarm there.
 *
 * Limits and the cost counter fail open: a D1 problem must not take the free
 * verdict down. Every fail-open path logs a warning.
 */
import type { Env } from './env';
import type { GenerateResult } from './generativeAIService';
import type { EvidenceProviderReceipt } from '../types/evidence';
import { addToDailyCounter, consumeHourlyRateLimit } from './runtimeControls';

export const DEFAULT_VERDICT_IP_HOURLY_LIMIT = 10;
export const DEFAULT_VERDICT_ACCOUNT_HOURLY_LIMIT = 10;
export const DEFAULT_VERDICT_DAILY_COST_ALARM_USD = 5;

// Planning rates used for the estimate, not invoice rates. The log line keeps
// the raw token and search counts so the real cost can be recomputed once the
// Vertex and DataForSEO invoices are in. YouTube Data API and Podcast Index are
// quota-based with no per-call charge.
export const VERDICT_COST_RATES_USD = {
  inputPerMillionTokens: 0.10,
  outputPerMillionTokens: 0.40,
  perSearch: { dataforseo: 0.015, youtube_api: 0, podcast_index: 0 }
} as const;

type SearchProvider = keyof typeof VERDICT_COST_RATES_USD.perSearch;

export interface VerdictUsage {
  aiCalls: number;
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  searches: Record<SearchProvider, number>;
}

export function emptyVerdictUsage(): VerdictUsage {
  return { aiCalls: 0, promptTokens: 0, outputTokens: 0, thoughtsTokens: 0, searches: { dataforseo: 0, youtube_api: 0, podcast_index: 0 } };
}

export function addModelUsage(usage: VerdictUsage, receipt: GenerateResult['receipt']): void {
  usage.aiCalls += 1;
  usage.promptTokens += receipt.promptTokenCount ?? 0;
  usage.outputTokens += receipt.candidatesTokenCount ?? 0;
  usage.thoughtsTokens += receipt.thoughtsTokenCount ?? 0;
}

export function addSearchUsage(usage: VerdictUsage, receipts: EvidenceProviderReceipt[]): void {
  for (const receipt of receipts) {
    if (receipt.provider in usage.searches) usage.searches[receipt.provider as SearchProvider] += receipt.queryCount;
  }
}

export function estimateVerdictCostUsd(usage: VerdictUsage): number {
  const rates = VERDICT_COST_RATES_USD;
  const tokens = (usage.promptTokens * rates.inputPerMillionTokens
    + (usage.outputTokens + usage.thoughtsTokens) * rates.outputPerMillionTokens) / 1_000_000;
  const searches = (Object.keys(usage.searches) as SearchProvider[])
    .reduce((sum, provider) => sum + usage.searches[provider] * rates.perSearch[provider], 0);
  return Math.round((tokens + searches) * 1_000_000) / 1_000_000;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
}

function rateLimited(message: string, retryAfter: number): Response {
  return new Response(JSON.stringify({ error: message, code: 'VERDICT_RATE_LIMITED', retryAfter }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) }
  });
}

export async function enforceVerdictRateLimit(
  request: Request,
  env: Env,
  accountEmail?: string,
  now = new Date()
): Promise<Response | null> {
  if (!env.DB) return null;
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const ipLimit = Math.floor(positiveNumber(env.VERDICT_IP_HOURLY_LIMIT, DEFAULT_VERDICT_IP_HOURLY_LIMIT));
  const accountLimit = Math.floor(positiveNumber(env.VERDICT_ACCOUNT_HOURLY_LIMIT, DEFAULT_VERDICT_ACCOUNT_HOURLY_LIMIT));
  try {
    const ipState = await consumeHourlyRateLimit(env, `verdict_ip:${await shortHash(ip)}`, ipLimit, now);
    if (!ipState.allowed) {
      console.warn(JSON.stringify({ event: 'verdict_rate_limited', scope: 'ip', limit: ipLimit }));
      return rateLimited('You have run a lot of verdicts from this connection. Please try again in a little while.', ipState.retryAfter);
    }
    if (accountEmail) {
      const accountState = await consumeHourlyRateLimit(env, `verdict_account:${await shortHash(accountEmail.trim().toLowerCase())}`, accountLimit, now);
      if (!accountState.allowed) {
        console.warn(JSON.stringify({ event: 'verdict_rate_limited', scope: 'account', limit: accountLimit }));
        return rateLimited('You have run a lot of verdicts from this account. Please try again in a little while.', accountState.retryAfter);
      }
    }
  } catch (error) {
    console.warn('Verdict rate-limit check failed open', error);
  }
  return null;
}

export interface VerdictCostRecord {
  resultId: string;
  cacheHit: boolean;
  usedAI: boolean;
  authenticated: boolean;
  usage: VerdictUsage;
}

export async function recordVerdictCost(env: Env, record: VerdictCostRecord, now = new Date()): Promise<void> {
  const estimatedCostUsd = estimateVerdictCostUsd(record.usage);
  console.log(JSON.stringify({
    event: 'verdict_cost',
    resultId: record.resultId,
    cacheHit: record.cacheHit,
    usedAI: record.usedAI,
    authenticated: record.authenticated,
    aiCalls: record.usage.aiCalls,
    promptTokens: record.usage.promptTokens,
    outputTokens: record.usage.outputTokens,
    thoughtsTokens: record.usage.thoughtsTokens,
    searches: record.usage.searches,
    estimatedCostUsd
  }));

  if (!env.DB) return;
  const thresholdUsd = positiveNumber(env.VERDICT_DAILY_COST_ALARM_USD, DEFAULT_VERDICT_DAILY_COST_ALARM_USD);
  const thresholdMicros = Math.round(thresholdUsd * 1_000_000);
  try {
    const [cost] = await Promise.all([
      addToDailyCounter(env, 'verdict_cost_micro_usd', Math.round(estimatedCostUsd * 1_000_000), now),
      addToDailyCounter(env, 'verdict_count', 1, now)
    ]);
    if (cost.before < thresholdMicros && cost.after >= thresholdMicros) {
      await raiseDailyCostAlarm(env, now.toISOString().slice(0, 10), cost.after / 1_000_000, thresholdUsd);
    }
  } catch (error) {
    console.warn('Verdict daily cost counter failed open', error);
  }
}

async function raiseDailyCostAlarm(env: Env, day: string, totalUsd: number, thresholdUsd: number): Promise<void> {
  const alarm = {
    event: 'verdict_daily_cost_alarm',
    environment: env.DEPLOYMENT_ENV ?? 'unknown',
    day,
    estimatedTotalUsd: Math.round(totalUsd * 100) / 100,
    thresholdUsd
  };
  console.error(JSON.stringify(alarm));
  const webhook = env.VERDICT_COST_ALARM_WEBHOOK_URL?.trim();
  if (!webhook) return;
  try {
    const text = `GhostTown verdict spend reached about $${alarm.estimatedTotalUsd.toFixed(2)} on ${day} (${alarm.environment}), over the $${thresholdUsd} daily alarm.`;
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...alarm, text, content: text }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    console.warn('Verdict cost alarm webhook failed', error);
  }
}
