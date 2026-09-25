import { apiUrl } from './api';
import type {
  CommercialAttributionEnvelope,
  CommercialAttributionTouch,
  CommercialEventContext,
  CommercialEventName,
  CommercialShareType
} from '../types/commercialAttribution';

const ATTRIBUTION_KEY = 'ghosttown_commercial_attribution_v1';
const SESSION_KEY = 'ghosttown_commercial_session_v1';
const EVENT_DEDUPE_PREFIX = 'ghosttown_commercial_event_v1:';
const TOKEN_LIMIT = 160;

function clean(value: unknown, max = TOKEN_LIMIT): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function randomId(prefix: string): string {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid}`.slice(0, TOKEN_LIMIT);
}

function safeLocalGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeLocalSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* analytics must never block the product */ }
}
function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* analytics must never block the product */ }
}

function sessionId(incoming?: string): string {
  const current = clean(safeSessionGet(SESSION_KEY));
  if (current) return current;
  const created = clean(incoming) || randomId('gts');
  safeSessionSet(SESSION_KEY, created);
  return created;
}

function readStored(): Partial<CommercialAttributionEnvelope> | null {
  try {
    const raw = safeLocalGet(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CommercialAttributionEnvelope>;
    return parsed.schemaVersion === 'ghosttown-commercial-attribution-v1' ? parsed : null;
  } catch {
    return null;
  }
}

function parameter(params: URLSearchParams, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = clean(params.get(name));
    if (value) return value;
  }
  return undefined;
}

function shareType(value: unknown): CommercialShareType | undefined {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}

function urlTouch(search: string): Omit<CommercialAttributionTouch, 'capturedAt'> {
  const params = new URLSearchParams(search);
  return {
    experimentId: parameter(params, 'experiment_id', 'experimentId'),
    sourceVerdictId: parameter(params, 'source_verdict_id', 'sourceVerdictId'),
    intentId: parameter(params, 'intent', 'intent_id', 'intentId'),
    creativeId: parameter(params, 'creative_id', 'creativeId'),
    publicationId: parameter(params, 'publication_id', 'publicationId'),
    platform: parameter(params, 'platform'),
    accountId: parameter(params, 'distribution_account_id', 'account_id', 'accountId'),
    campaign: parameter(params, 'campaign', 'utm_campaign'),
    source: parameter(params, 'source', 'utm_source'),
    shareType: shareType(parameter(params, 'share_type', 'shareType'))
  };
}

function hasTouch(value: Partial<CommercialAttributionTouch>): boolean {
  return Boolean(value.experimentId || value.sourceVerdictId || value.intentId || value.creativeId || value.publicationId || value.platform || value.accountId || value.campaign || value.source || value.shareType);
}

function sanitizeTouch(value: unknown, fallbackAt: string): CommercialAttributionTouch | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<CommercialAttributionTouch>;
  const touch: CommercialAttributionTouch = {
    capturedAt: clean(source.capturedAt) || fallbackAt,
    experimentId: clean(source.experimentId),
    sourceVerdictId: clean(source.sourceVerdictId),
    intentId: clean(source.intentId),
    creativeId: clean(source.creativeId),
    publicationId: clean(source.publicationId),
    platform: clean(source.platform, 40),
    accountId: clean(source.accountId),
    campaign: clean(source.campaign),
    source: clean(source.source),
    shareType: shareType(source.shareType)
  };
  return hasTouch(touch) ? touch : undefined;
}

function legacyTouch(prior: Partial<CommercialAttributionEnvelope>, capturedAt: string): CommercialAttributionTouch | undefined {
  const touch: CommercialAttributionTouch = {
    capturedAt,
    experimentId: clean(prior.experimentId),
    sourceVerdictId: clean(prior.sourceVerdictId),
    intentId: clean(prior.intentId),
    creativeId: clean(prior.creativeId),
    publicationId: clean(prior.publicationId),
    platform: clean(prior.platform, 40),
    accountId: clean(prior.accountId),
    campaign: clean(prior.campaign),
    source: clean(prior.source),
    shareType: shareType(prior.shareType)
  };
  return hasTouch(touch) ? touch : undefined;
}

function withSourceVerdict(touch: CommercialAttributionTouch, verdictId: string | undefined): CommercialAttributionTouch {
  return touch.sourceVerdictId || !verdictId ? touch : { ...touch, sourceVerdictId: verdictId };
}

export function captureCommercialAttribution(search = typeof window !== 'undefined' ? window.location.search : ''): CommercialAttributionEnvelope {
  const now = new Date().toISOString();
  const prior = readStored() || {};
  const incoming = urlTouch(search);
  const incomingTouch = hasTouch(incoming) ? { ...incoming, capturedAt: now } as CommercialAttributionTouch : undefined;
  const priorFirstAt = clean(prior.firstTouchAt) || now;
  const priorLastAt = clean(prior.lastTouchAt) || priorFirstAt;
  const priorFirst = sanitizeTouch(prior.firstTouch, priorFirstAt) || legacyTouch(prior, priorFirstAt);
  const priorLast = sanitizeTouch(prior.lastTouch, priorLastAt) || priorFirst;
  const firstTouch = priorFirst || incomingTouch || { capturedAt: now };
  const lastTouch = incomingTouch || priorLast || firstTouch;
  const params = new URLSearchParams(search);
  const stableToken = clean(prior.attributionToken) || parameter(params, 'attribution_token', 'attributionToken') || randomId('gta');

  const envelope: CommercialAttributionEnvelope = {
    schemaVersion: 'ghosttown-commercial-attribution-v1',
    attributionToken: stableToken,
    visitorId: clean(prior.visitorId) || parameter(params, 'visitor_id', 'visitorId') || randomId('gtv'),
    ghosttownSessionId: sessionId(parameter(params, 'ghosttown_session_id', 'ghosttownSessionId')),
    firstTouchAt: firstTouch.capturedAt,
    lastTouchAt: lastTouch.capturedAt,
    experimentId: firstTouch.experimentId,
    sourceVerdictId: firstTouch.sourceVerdictId,
    intentId: firstTouch.intentId,
    creativeId: firstTouch.creativeId,
    publicationId: firstTouch.publicationId,
    platform: firstTouch.platform,
    accountId: firstTouch.accountId,
    campaign: firstTouch.campaign,
    source: firstTouch.source,
    shareType: firstTouch.shareType,
    firstTouch,
    lastTouch,
    verdictId: clean(prior.verdictId)
  };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(envelope));
  return envelope;
}

export function linkCommercialVerdict(verdictId: string): CommercialAttributionEnvelope {
  const current = captureCommercialAttribution();
  const next: CommercialAttributionEnvelope = { ...current, verdictId: clean(verdictId) };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export function commercialAttributionForCheckout(verdictId: string): CommercialAttributionEnvelope {
  const current = linkCommercialVerdict(verdictId);
  const normalizedVerdict = clean(verdictId);
  const firstTouch = withSourceVerdict(current.firstTouch, normalizedVerdict);
  const lastTouch = withSourceVerdict(current.lastTouch, normalizedVerdict);
  const next: CommercialAttributionEnvelope = {
    ...current,
    sourceVerdictId: firstTouch.sourceVerdictId,
    firstTouch,
    lastTouch
  };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export async function recordCommercialEvent(eventName: CommercialEventName, context: CommercialEventContext = {}): Promise<void> {
  try {
    if (context.dedupeKey) {
      const key = `${EVENT_DEDUPE_PREFIX}${context.dedupeKey}`;
      if (safeSessionGet(key)) return;
      safeSessionSet(key, new Date().toISOString());
    }
    const attribution = captureCommercialAttribution();
    const token = safeLocalGet('lit_user_token_v1');
    await fetch(apiUrl('/api/analytics/events'), {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        eventName,
        orderId: clean(context.orderId, 120),
        verdictId: clean(context.verdictId || attribution.verdictId, 120),
        content: clean(context.content, 120),
        attributionToken: attribution.attributionToken,
        experimentId: attribution.experimentId,
        sourceVerdictId: attribution.sourceVerdictId,
        intentId: attribution.intentId,
        creativeId: attribution.creativeId,
        publicationId: attribution.publicationId,
        platform: attribution.platform,
        accountId: attribution.accountId,
        campaign: attribution.campaign,
        source: attribution.source,
        shareType: attribution.shareType,
        visitorId: attribution.visitorId,
        ghosttownSessionId: attribution.ghosttownSessionId,
        firstTouch: attribution.firstTouch,
        lastTouch: attribution.lastTouch
      })
    }).catch(() => undefined);
  } catch {
    // Browser-edge measurement is best-effort; trusted checkout/progress evidence is recorded by the Worker.
  }
}
