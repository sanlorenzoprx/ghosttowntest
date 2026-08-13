import { authenticateRequest } from './auth';
import type { Env } from './env';

const FUNNEL_EVENTS = [
  'landing_viewed',
  'qualified_click',
  'verdict_started',
  'verdict_completed',
  'paid_plan_viewed',
  'checkout_started',
  'download_clicked'
] as const;

type FunnelEventName = typeof FUNNEL_EVENTS[number];

type AcquisitionAttribution = {
  attributionToken?: string;
  experimentId?: string;
  sourceVerdictId?: string;
  creativeId?: string;
  publicationId?: string;
  platform?: string;
  accountId?: string;
  campaign?: string;
  source?: string;
  shareType?: 'factory' | 'customer' | 'earned';
};

interface StoredFunnelEvent extends AcquisitionAttribution {
  eventName?: string;
  createdAt?: string;
}

interface StoredPurchaseEvent extends AcquisitionAttribution {
  stripeEventId: string;
  orderId?: string;
  artifactType?: string;
  amountTotal?: number;
  currency?: string;
  createdAt: string;
}

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 180;
const EVENT_TTL_SECONDS = 86400 * MAX_LOOKBACK_DAYS;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache'
    }
  });
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function configuredOwners(env: Env): Set<string> {
  return new Set((env.INTERNAL_RESEARCH_OWNER_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean));
}

async function requireOwner(request: Request, env: Env): Promise<{ email: string } | Response> {
  const auth = await authenticateRequest(request, env).catch(() => null);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const owners = configuredOwners(env);
  if (!owners.size) return json({ error: 'Commercial metrics owners are not configured' }, 503);
  if (!owners.has(normalizeEmail(auth.email))) return json({ error: 'Commercial metrics access denied' }, 403);
  return { email: auth.email };
}

function safeDays(value: string | null): number {
  const parsed = Number(value || DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(parsed)) return DEFAULT_LOOKBACK_DAYS;
  return Math.min(MAX_LOOKBACK_DAYS, Math.max(1, Math.floor(parsed)));
}

function validDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function perThousand(value: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((value * 1000 / denominator) * 10000) / 10000;
}

function clean(value: unknown, max = 160): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

function attributionFromMetadata(metadata: Record<string, unknown>): AcquisitionAttribution {
  const shareType = clean(metadata.share_type, 20);
  return {
    attributionToken: clean(metadata.attribution_token),
    experimentId: clean(metadata.experiment_id),
    sourceVerdictId: clean(metadata.source_verdict_id),
    creativeId: clean(metadata.creative_id),
    publicationId: clean(metadata.publication_id),
    platform: clean(metadata.platform, 40),
    accountId: clean(metadata.distribution_account_id),
    campaign: clean(metadata.campaign),
    source: clean(metadata.source),
    shareType: shareType === 'factory' || shareType === 'customer' || shareType === 'earned'
      ? shareType
      : undefined
  };
}

async function readPrefix<T>(env: Env, prefix: string): Promise<T[]> {
  const values: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list(cursor ? { prefix, cursor } : { prefix });
    const batch = await Promise.all(page.keys.map(async key => {
      const raw = await env.KV.get(key.name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }));
    for (const value of batch) if (value) values.push(value);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return values;
}

export async function recordVerifiedPurchase(
  env: Env,
  stripeEventId: string,
  session: Record<string, unknown>,
  context: { orderId?: string; artifactType?: string } = {}
): Promise<void> {
  const amount = typeof session.amount_total === 'number' && Number.isFinite(session.amount_total)
    ? Math.max(0, Math.round(session.amount_total))
    : undefined;
  const currency = typeof session.currency === 'string' && session.currency.trim()
    ? session.currency.trim().toLowerCase().slice(0, 12)
    : undefined;
  const metadata = typeof session.metadata === 'object' && session.metadata
    ? session.metadata as Record<string, unknown>
    : {};
  const event: StoredPurchaseEvent = {
    stripeEventId: stripeEventId.slice(0, 160),
    orderId: context.orderId?.slice(0, 120),
    artifactType: context.artifactType?.slice(0, 80),
    amountTotal: amount,
    currency,
    createdAt: new Date().toISOString(),
    ...attributionFromMetadata(metadata)
  };
  await env.KV.put(`analytics_purchase_${event.stripeEventId}`, JSON.stringify(event), {
    expirationTtl: EVENT_TTL_SECONDS
  });
}

export async function buildCommercialMetrics(
  env: Env,
  days = DEFAULT_LOOKBACK_DAYS,
  now = new Date()
): Promise<Record<string, unknown>> {
  const boundedDays = Math.min(MAX_LOOKBACK_DAYS, Math.max(1, Math.floor(days)));
  const cutoff = new Date(now.getTime() - boundedDays * 86400 * 1000);
  const [events, purchases] = await Promise.all([
    readPrefix<StoredFunnelEvent>(env, 'analytics_event_'),
    readPrefix<StoredPurchaseEvent>(env, 'analytics_purchase_')
  ]);

  const counts = Object.fromEntries(FUNNEL_EVENTS.map(name => [name, 0])) as Record<FunnelEventName, number>;
  const sources = new Map<string, number>();
  const publications = new Map<string, { purchases: number; revenueMinor: number; currency?: string }>();
  for (const event of events) {
    const createdAt = validDate(event.createdAt);
    if (!createdAt || createdAt < cutoff || createdAt > now) continue;
    if (FUNNEL_EVENTS.includes(event.eventName as FunnelEventName)) {
      counts[event.eventName as FunnelEventName] += 1;
    }
    const source = event.source?.trim().slice(0, 120);
    if (source) sources.set(source, (sources.get(source) || 0) + 1);
  }

  const revenueByCurrency: Record<string, number> = {};
  let verifiedPurchases = 0;
  for (const purchase of purchases) {
    const createdAt = validDate(purchase.createdAt);
    if (!createdAt || createdAt < cutoff || createdAt > now) continue;
    verifiedPurchases += 1;
    if (typeof purchase.amountTotal === 'number' && purchase.currency) {
      revenueByCurrency[purchase.currency] = (revenueByCurrency[purchase.currency] || 0) + purchase.amountTotal;
    }
    if (purchase.publicationId) {
      const current = publications.get(purchase.publicationId) || { purchases: 0, revenueMinor: 0, currency: purchase.currency };
      current.purchases += 1;
      current.revenueMinor += purchase.amountTotal || 0;
      current.currency ||= purchase.currency;
      publications.set(purchase.publicationId, current);
    }
  }

  return {
    generatedAt: now.toISOString(),
    window: { days: boundedDays, startsAt: cutoff.toISOString(), endsAt: now.toISOString() },
    funnel: {
      ...counts,
      purchase_completed: verifiedPurchases
    },
    conversion: {
      landing_to_verdict_start: ratio(counts.verdict_started, counts.landing_viewed),
      qualified_click_to_verdict_start: ratio(counts.verdict_started, counts.qualified_click),
      verdict_start_to_complete: ratio(counts.verdict_completed, counts.verdict_started),
      verdict_complete_to_checkout: ratio(counts.checkout_started, counts.verdict_completed),
      checkout_to_verified_purchase: ratio(verifiedPurchases, counts.checkout_started),
      landing_to_verified_purchase: ratio(verifiedPurchases, counts.landing_viewed)
    },
    verifiedPurchases: {
      count: verifiedPurchases,
      revenueMinorUnitsByCurrency: revenueByCurrency,
      authority: 'stripe_webhook'
    },
    publicationRevenue: Array.from(publications.entries())
      .map(([publicationId, value]) => ({ publicationId, ...value }))
      .sort((left, right) => right.revenueMinor - left.revenueMinor),
    topSources: Array.from(sources.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([source, eventCount]) => ({ source, eventCount })),
    metricContract: {
      terminal: ['revenue_per_1000_impressions', 'cost_per_paid_blueprint'],
      note: 'Impression and experiment cost denominators are joined from the Story Studio publication ledger; Stripe remains revenue authority.'
    }
  };
}

export async function handleCommercialMetrics(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;
  const days = safeDays(new URL(request.url).searchParams.get('days'));
  const summary = await buildCommercialMetrics(env, days);
  return json({
    owner: owner.email,
    ...summary,
    note: 'Purchase counts and revenue come only from Stripe webhook-confirmed checkout events. Client analytics cannot create purchase proof.'
  });
}
