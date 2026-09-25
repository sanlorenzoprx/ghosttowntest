import { authenticateRequest } from './auth';
import type { Env } from './env';

const FUNNEL_EVENTS = [
  'landing_viewed', 'qualified_click', 'verdict_started', 'verdict_completed', 'paid_plan_viewed',
  'checkout_started', 'download_clicked', 'blueprint_opened', 'daily_packet_opened', 'day_completed',
  'evidence_recorded', 'blueprint_retry_requested',
  'get_me_live_offer_viewed', 'get_me_live_cta_clicked', 'get_me_live_checkout_started',
  'get_me_live_purchase_completed', 'get_me_live_setup_started', 'get_me_live_preview_created',
  'get_me_live_publish_clicked', 'get_me_live_live_completed', 'get_me_live_lead_captured',
  'get_me_live_payment_connected', 'get_me_live_customer_payment'
] as const;
type FunnelEventName = typeof FUNNEL_EVENTS[number];

type AttributionTouch = {
  capturedAt?: string; experimentId?: string; sourceVerdictId?: string; intentId?: string; creativeId?: string;
  publicationId?: string; platform?: string; accountId?: string; campaign?: string; source?: string;
  shareType?: 'factory' | 'customer' | 'earned';
};
type AcquisitionAttribution = {
  attributionToken?: string; experimentId?: string; sourceVerdictId?: string; intentId?: string; creativeId?: string;
  publicationId?: string; platform?: string; accountId?: string; campaign?: string; source?: string;
  shareType?: 'factory' | 'customer' | 'earned'; visitorId?: string; ghosttownSessionId?: string;
  firstTouch?: AttributionTouch; lastTouch?: AttributionTouch;
};
interface StoredFunnelEvent extends AcquisitionAttribution { eventName?: string; createdAt?: string; }
interface StoredPurchaseEvent extends AcquisitionAttribution {
  stripeEventId: string; orderId?: string; artifactType?: string; amountTotal?: number; currency?: string; createdAt: string;
}

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 180;
const EVENT_TTL_SECONDS = 86400 * MAX_LOOKBACK_DAYS;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' } });
}
function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }
function configuredOwners(env: Env): Set<string> {
  return new Set((env.INTERNAL_RESEARCH_OWNER_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean));
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
  return Number.isFinite(parsed) ? Math.min(MAX_LOOKBACK_DAYS, Math.max(1, Math.floor(parsed))) : DEFAULT_LOOKBACK_DAYS;
}
function validDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function ratio(numerator: number, denominator: number): number | null {
  return denominator <= 0 ? null : Math.round((numerator / denominator) * 10000) / 10000;
}
function clean(value: unknown, max = 160): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}
function cleanShareType(value: unknown): AttributionTouch['shareType'] {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}
function touchFromMetadata(metadata: Record<string, unknown>, prefix: 'first_touch' | 'last_touch'): AttributionTouch {
  return {
    experimentId: clean(metadata[`${prefix}_experiment_id`]),
    sourceVerdictId: clean(metadata[`${prefix}_source_verdict_id`]),
    intentId: clean(metadata[`${prefix}_intent_id`]),
    creativeId: clean(metadata[`${prefix}_creative_id`]),
    publicationId: clean(metadata[`${prefix}_publication_id`]),
    platform: clean(metadata[`${prefix}_platform`], 40),
    accountId: clean(metadata[`${prefix}_account_id`]),
    campaign: clean(metadata[`${prefix}_campaign`]),
    source: clean(metadata[`${prefix}_source`]),
    shareType: cleanShareType(metadata[`${prefix}_share_type`])
  };
}
function attributionFromMetadata(metadata: Record<string, unknown>): AcquisitionAttribution {
  const firstTouch = touchFromMetadata(metadata, 'first_touch');
  const lastTouch = touchFromMetadata(metadata, 'last_touch');
  const legacyShare = cleanShareType(metadata.share_type);
  return {
    attributionToken: clean(metadata.attribution_token), experimentId: clean(metadata.experiment_id),
    sourceVerdictId: clean(metadata.source_verdict_id), intentId: clean(metadata.intent_id), creativeId: clean(metadata.creative_id),
    publicationId: clean(metadata.publication_id), platform: clean(metadata.platform, 40),
    accountId: clean(metadata.distribution_account_id), campaign: clean(metadata.campaign), source: clean(metadata.source),
    shareType: legacyShare, visitorId: clean(metadata.visitor_id), ghosttownSessionId: clean(metadata.ghosttown_session_id),
    firstTouch: Object.values(firstTouch).some(Boolean) ? firstTouch : undefined,
    lastTouch: Object.values(lastTouch).some(Boolean) ? lastTouch : undefined
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
      try { return JSON.parse(raw) as T; } catch { return null; }
    }));
    for (const value of batch) if (value) values.push(value);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return values;
}

export async function recordVerifiedPurchase(env: Env, stripeEventId: string, session: Record<string, unknown>, context: { orderId?: string; artifactType?: string } = {}): Promise<void> {
  const amount = typeof session.amount_total === 'number' && Number.isFinite(session.amount_total) ? Math.max(0, Math.round(session.amount_total)) : undefined;
  const currency = typeof session.currency === 'string' && session.currency.trim() ? session.currency.trim().toLowerCase().slice(0, 12) : undefined;
  const metadata = typeof session.metadata === 'object' && session.metadata ? session.metadata as Record<string, unknown> : {};
  const event: StoredPurchaseEvent = {
    stripeEventId: stripeEventId.slice(0, 160), orderId: context.orderId?.slice(0, 120),
    artifactType: context.artifactType?.slice(0, 80), amountTotal: amount, currency,
    createdAt: new Date().toISOString(), ...attributionFromMetadata(metadata)
  };
  await env.KV.put(`analytics_purchase_${event.stripeEventId}`, JSON.stringify(event), { expirationTtl: EVENT_TTL_SECONDS });
}

function addPublicationRevenue(map: Map<string, { purchases: number; revenueMinor: number; currency?: string }>, publicationId: string | undefined, purchase: StoredPurchaseEvent): void {
  if (!publicationId) return;
  const current = map.get(publicationId) || { purchases: 0, revenueMinor: 0, currency: purchase.currency };
  current.purchases += 1;
  current.revenueMinor += purchase.amountTotal || 0;
  current.currency ||= purchase.currency;
  map.set(publicationId, current);
}
function publicationRows(map: Map<string, { purchases: number; revenueMinor: number; currency?: string }>) {
  return Array.from(map.entries()).map(([publicationId, value]) => ({ publicationId, ...value })).sort((a, b) => b.revenueMinor - a.revenueMinor);
}
function addIntentRevenue(map: Map<string, { purchases: number; revenueMinor: number; currency?: string }>, intentId: string | undefined, purchase: StoredPurchaseEvent): void {
  if (!intentId) return;
  const current = map.get(intentId) || { purchases: 0, revenueMinor: 0, currency: purchase.currency };
  current.purchases += 1;
  current.revenueMinor += purchase.amountTotal || 0;
  current.currency ||= purchase.currency;
  map.set(intentId, current);
}

export async function buildCommercialMetrics(env: Env, days = DEFAULT_LOOKBACK_DAYS, now = new Date()): Promise<Record<string, unknown>> {
  const boundedDays = Math.min(MAX_LOOKBACK_DAYS, Math.max(1, Math.floor(days)));
  const cutoff = new Date(now.getTime() - boundedDays * 86400 * 1000);
  const [events, purchases] = await Promise.all([
    readPrefix<StoredFunnelEvent>(env, 'analytics_event_'), readPrefix<StoredPurchaseEvent>(env, 'analytics_purchase_')
  ]);

  const counts = Object.fromEntries(FUNNEL_EVENTS.map(name => [name, 0])) as Record<FunnelEventName, number>;
  const sources = new Map<string, number>();
  const firstTouchPublications = new Map<string, { purchases: number; revenueMinor: number; currency?: string }>();
  const lastTouchPublications = new Map<string, { purchases: number; revenueMinor: number; currency?: string }>();
  const intentEvents = new Map<string, Partial<Record<FunnelEventName, number>>>();
  const intentPurchases = new Map<string, { purchases: number; revenueMinor: number; currency?: string }>();
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  let acceptedEvents = 0;
  let attributedEvents = 0;
  for (const event of events) {
    const createdAt = validDate(event.createdAt);
    if (!createdAt || createdAt < cutoff || createdAt > now) continue;
    acceptedEvents += 1;
    if (FUNNEL_EVENTS.includes(event.eventName as FunnelEventName)) {
      const eventName = event.eventName as FunnelEventName;
      counts[eventName] += 1;
      const intentId = event.intentId || event.firstTouch?.intentId;
      if (intentId) {
        const row = intentEvents.get(intentId) || {};
        row[eventName] = (row[eventName] || 0) + 1;
        intentEvents.set(intentId, row);
      }
    }
    const source = event.source?.trim().slice(0, 120);
    if (source) sources.set(source, (sources.get(source) || 0) + 1);
    if (event.visitorId) visitors.add(event.visitorId);
    if (event.ghosttownSessionId) sessions.add(event.ghosttownSessionId);
    if (event.attributionToken && event.visitorId && event.ghosttownSessionId) attributedEvents += 1;
  }

  const revenueByCurrency: Record<string, number> = {};
  let verifiedPurchases = 0;
  let attributedVerifiedPurchases = 0;
  let dualTouchPurchases = 0;
  for (const purchase of purchases) {
    const createdAt = validDate(purchase.createdAt);
    if (!createdAt || createdAt < cutoff || createdAt > now) continue;
    verifiedPurchases += 1;
    if (purchase.attributionToken && purchase.visitorId && purchase.ghosttownSessionId) attributedVerifiedPurchases += 1;
    if (purchase.firstTouch && purchase.lastTouch) dualTouchPurchases += 1;
    if (typeof purchase.amountTotal === 'number' && purchase.currency) revenueByCurrency[purchase.currency] = (revenueByCurrency[purchase.currency] || 0) + purchase.amountTotal;
    addPublicationRevenue(firstTouchPublications, purchase.firstTouch?.publicationId || purchase.publicationId, purchase);
    addPublicationRevenue(lastTouchPublications, purchase.lastTouch?.publicationId || purchase.publicationId, purchase);
    addIntentRevenue(intentPurchases, purchase.firstTouch?.intentId || purchase.intentId, purchase);
  }

  return {
    generatedAt: now.toISOString(), window: { days: boundedDays, startsAt: cutoff.toISOString(), endsAt: now.toISOString() },
    funnel: { ...counts, purchase_completed: verifiedPurchases },
    conversion: {
      landing_to_verdict_start: ratio(counts.verdict_started, counts.landing_viewed),
      qualified_click_to_verdict_start: ratio(counts.verdict_started, counts.qualified_click),
      verdict_start_to_complete: ratio(counts.verdict_completed, counts.verdict_started),
      verdict_complete_to_checkout: ratio(counts.checkout_started, counts.verdict_completed),
      checkout_to_verified_purchase: ratio(verifiedPurchases, counts.checkout_started),
      landing_to_verified_purchase: ratio(verifiedPurchases, counts.landing_viewed)
    },
    verifiedPurchases: { count: verifiedPurchases, revenueMinorUnitsByCurrency: revenueByCurrency, authority: 'stripe_webhook' },
    attributionCoverage: {
      uniqueVisitors: visitors.size, uniqueSessions: sessions.size, attributedEvents, totalEvents: acceptedEvents,
      attributedVerifiedPurchases, dualTouchPurchases, verifiedPurchases
    },
    publicationRevenue: publicationRows(firstTouchPublications),
    firstTouchPublicationRevenue: publicationRows(firstTouchPublications),
    lastTouchPublicationRevenue: publicationRows(lastTouchPublications),
    intentFunnel: Array.from(intentEvents.entries()).map(([intentId, eventCounts]) => ({ intentId, eventCounts })),
    intentRevenue: Array.from(intentPurchases.entries()).map(([intentId, value]) => ({ intentId, ...value })).sort((a, b) => b.revenueMinor - a.revenueMinor),
    topSources: Array.from(sources.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([source, eventCount]) => ({ source, eventCount })),
    metricContract: {
      terminal: ['revenue_per_1000_impressions', 'cost_per_paid_blueprint'],
      attribution: ['first_touch', 'last_touch', 'intent_id'],
      note: 'Stripe webhook-confirmed revenue is joined to first-touch acquisition intent and last-touch return attribution. Story Studio supplies impression and experiment-cost denominators.'
    }
  };
}

export async function handleCommercialMetrics(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;
  const days = safeDays(new URL(request.url).searchParams.get('days'));
  const summary = await buildCommercialMetrics(env, days);
  return json({ owner: owner.email, ...summary, note: 'Purchase counts and revenue come only from Stripe webhook-confirmed checkout events. Client analytics cannot create purchase proof.' });
}
