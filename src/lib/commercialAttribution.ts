import { apiUrl } from './api';
import type {
  CommercialAttributionEnvelope,
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

function sessionId(): string {
  const current = clean(safeSessionGet(SESSION_KEY));
  if (current) return current;
  const created = randomId('gts');
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

function shareType(value: string | undefined): CommercialShareType | undefined {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}

function urlTouch(search: string): Partial<CommercialAttributionEnvelope> {
  const params = new URLSearchParams(search);
  return {
    attributionToken: parameter(params, 'attribution_token', 'attributionToken'),
    experimentId: parameter(params, 'experiment_id', 'experimentId'),
    sourceVerdictId: parameter(params, 'source_verdict_id', 'sourceVerdictId'),
    creativeId: parameter(params, 'creative_id', 'creativeId'),
    publicationId: parameter(params, 'publication_id', 'publicationId'),
    platform: parameter(params, 'platform'),
    accountId: parameter(params, 'distribution_account_id', 'account_id', 'accountId'),
    campaign: parameter(params, 'campaign', 'utm_campaign'),
    source: parameter(params, 'source', 'utm_source'),
    shareType: shareType(parameter(params, 'share_type', 'shareType'))
  };
}

export function captureCommercialAttribution(search = typeof window !== 'undefined' ? window.location.search : ''): CommercialAttributionEnvelope {
  const now = new Date().toISOString();
  const prior = readStored();
  const touch = urlTouch(search);
  const firstTouchAt = clean(prior?.firstTouchAt) || now;
  const visitorId = clean(prior?.visitorId) || randomId('gtv');
  const stableToken = clean(prior?.attributionToken) || clean(touch.attributionToken) || randomId('gta');

  // Attribution is intentionally sticky: the first attributable acquisition touch
  // owns the conversion lineage. Untagged revisits and later URL changes do not
  // silently rewrite the source/creative that originally acquired the visitor.
  const envelope: CommercialAttributionEnvelope = {
    schemaVersion: 'ghosttown-commercial-attribution-v1',
    attributionToken: stableToken,
    visitorId,
    ghosttownSessionId: sessionId(),
    firstTouchAt,
    lastTouchAt: now,
    experimentId: clean(prior?.experimentId) || clean(touch.experimentId),
    sourceVerdictId: clean(prior?.sourceVerdictId) || clean(touch.sourceVerdictId),
    creativeId: clean(prior?.creativeId) || clean(touch.creativeId),
    publicationId: clean(prior?.publicationId) || clean(touch.publicationId),
    platform: clean(prior?.platform, 40) || clean(touch.platform, 40),
    accountId: clean(prior?.accountId) || clean(touch.accountId),
    campaign: clean(prior?.campaign) || clean(touch.campaign),
    source: clean(prior?.source) || clean(touch.source),
    shareType: shareType(prior?.shareType) || shareType(touch.shareType),
    verdictId: clean(prior?.verdictId)
  };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(envelope));
  return envelope;
}

export function linkCommercialVerdict(verdictId: string): CommercialAttributionEnvelope {
  const current = captureCommercialAttribution();
  const next: CommercialAttributionEnvelope = {
    ...current,
    verdictId: clean(verdictId),
    lastTouchAt: new Date().toISOString()
  };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export function commercialAttributionForCheckout(verdictId: string): CommercialAttributionEnvelope {
  const current = linkCommercialVerdict(verdictId);
  const next: CommercialAttributionEnvelope = {
    ...current,
    // When there is no upstream Story Studio/source verdict, the current
    // GhostTown verdict becomes the terminal source-verdict lineage key.
    sourceVerdictId: current.sourceVerdictId || clean(verdictId),
    lastTouchAt: new Date().toISOString()
  };
  safeLocalSet(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}

export async function recordCommercialEvent(
  eventName: CommercialEventName,
  context: CommercialEventContext = {}
): Promise<void> {
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
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        eventName,
        orderId: clean(context.orderId, 120),
        verdictId: clean(context.verdictId || attribution.verdictId, 120),
        content: clean(context.content, 120),
        attributionToken: attribution.attributionToken,
        experimentId: attribution.experimentId,
        sourceVerdictId: attribution.sourceVerdictId,
        creativeId: attribution.creativeId,
        publicationId: attribution.publicationId,
        platform: attribution.platform,
        accountId: attribution.accountId,
        campaign: attribution.campaign,
        source: attribution.source,
        shareType: attribution.shareType,
        visitorId: attribution.visitorId,
        ghosttownSessionId: attribution.ghosttownSessionId
      })
    }).catch(() => undefined);
  } catch {
    // Measurement is best-effort at the browser edge; trusted purchase and
    // progress evidence is recorded again by the Worker on authoritative paths.
  }
}
