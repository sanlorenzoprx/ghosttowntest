import type {
  CommercialAttributionEnvelope,
  CommercialAttributionTouch,
  CommercialShareType
} from '../types/commercialAttribution';

const MAX = 160;

function clean(value: unknown, max = MAX): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function cleanShareType(value: unknown): CommercialShareType | undefined {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}

function sanitizeTouch(value: unknown, fallbackAt: string, fallbackSourceVerdictId?: string): CommercialAttributionTouch | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const touch: CommercialAttributionTouch = {
    capturedAt: clean(source.capturedAt) || fallbackAt,
    experimentId: clean(source.experimentId),
    sourceVerdictId: clean(source.sourceVerdictId) || clean(fallbackSourceVerdictId, 120),
    creativeId: clean(source.creativeId),
    publicationId: clean(source.publicationId),
    platform: clean(source.platform, 40),
    accountId: clean(source.accountId),
    campaign: clean(source.campaign),
    source: clean(source.source),
    shareType: cleanShareType(source.shareType)
  };
  const hasDimension = Boolean(touch.experimentId || touch.sourceVerdictId || touch.creativeId || touch.publicationId || touch.platform || touch.accountId || touch.campaign || touch.source || touch.shareType);
  return hasDimension ? touch : undefined;
}

function legacyTouch(source: Record<string, unknown>, capturedAt: string, fallbackSourceVerdictId?: string): CommercialAttributionTouch {
  return {
    capturedAt,
    experimentId: clean(source.experimentId),
    sourceVerdictId: clean(source.sourceVerdictId) || clean(fallbackSourceVerdictId, 120),
    creativeId: clean(source.creativeId),
    publicationId: clean(source.publicationId),
    platform: clean(source.platform, 40),
    accountId: clean(source.accountId),
    campaign: clean(source.campaign),
    source: clean(source.source),
    shareType: cleanShareType(source.shareType)
  };
}

export function sanitizeCommercialAttribution(value: unknown, fallbackVerdictId?: string): CommercialAttributionEnvelope | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const attributionToken = clean(source.attributionToken);
  const visitorId = clean(source.visitorId);
  const ghosttownSessionId = clean(source.ghosttownSessionId);
  if (!attributionToken || !visitorId || !ghosttownSessionId) return undefined;

  const now = new Date().toISOString();
  const firstTouchAt = clean(source.firstTouchAt) || now;
  const lastTouchAt = clean(source.lastTouchAt) || firstTouchAt;
  const fallbackSource = clean(fallbackVerdictId, 120);
  const firstTouch = sanitizeTouch(source.firstTouch, firstTouchAt, fallbackSource)
    || legacyTouch(source, firstTouchAt, fallbackSource);
  const lastTouch = sanitizeTouch(source.lastTouch, lastTouchAt, fallbackSource) || firstTouch;
  const verdictId = clean(source.verdictId, 120) || fallbackSource;

  return {
    schemaVersion: 'ghosttown-commercial-attribution-v1',
    attributionToken,
    visitorId,
    ghosttownSessionId,
    firstTouchAt: firstTouch.capturedAt,
    lastTouchAt: lastTouch.capturedAt,
    experimentId: firstTouch.experimentId,
    sourceVerdictId: firstTouch.sourceVerdictId,
    creativeId: firstTouch.creativeId,
    publicationId: firstTouch.publicationId,
    platform: firstTouch.platform,
    accountId: firstTouch.accountId,
    campaign: firstTouch.campaign,
    source: firstTouch.source,
    shareType: firstTouch.shareType,
    firstTouch,
    lastTouch,
    verdictId
  };
}

function setTouchMetadata(fields: URLSearchParams, prefix: 'first_touch' | 'last_touch', touch: CommercialAttributionTouch | undefined): void {
  if (!touch) return;
  if (touch.experimentId) fields.set(`metadata[${prefix}_experiment_id]`, touch.experimentId);
  if (touch.sourceVerdictId) fields.set(`metadata[${prefix}_source_verdict_id]`, touch.sourceVerdictId);
  if (touch.creativeId) fields.set(`metadata[${prefix}_creative_id]`, touch.creativeId);
  if (touch.publicationId) fields.set(`metadata[${prefix}_publication_id]`, touch.publicationId);
  if (touch.platform) fields.set(`metadata[${prefix}_platform]`, touch.platform);
  if (touch.accountId) fields.set(`metadata[${prefix}_account_id]`, touch.accountId);
  if (touch.campaign) fields.set(`metadata[${prefix}_campaign]`, touch.campaign);
  if (touch.source) fields.set(`metadata[${prefix}_source]`, touch.source);
  if (touch.shareType) fields.set(`metadata[${prefix}_share_type]`, touch.shareType);
}

export function appendStripeAttributionMetadata(fields: URLSearchParams, attribution: CommercialAttributionEnvelope | undefined, verdictId: string): void {
  const sourceVerdictId = clean(attribution?.sourceVerdictId) || clean(verdictId, 120);
  if (attribution?.attributionToken) fields.set('metadata[attribution_token]', attribution.attributionToken);
  if (attribution?.experimentId) fields.set('metadata[experiment_id]', attribution.experimentId);
  if (sourceVerdictId) fields.set('metadata[source_verdict_id]', sourceVerdictId);
  if (attribution?.creativeId) fields.set('metadata[creative_id]', attribution.creativeId);
  if (attribution?.publicationId) fields.set('metadata[publication_id]', attribution.publicationId);
  if (attribution?.platform) fields.set('metadata[platform]', attribution.platform);
  if (attribution?.accountId) fields.set('metadata[distribution_account_id]', attribution.accountId);
  if (attribution?.campaign) fields.set('metadata[campaign]', attribution.campaign);
  if (attribution?.source) fields.set('metadata[source]', attribution.source);
  if (attribution?.shareType) fields.set('metadata[share_type]', attribution.shareType);
  if (attribution?.visitorId) fields.set('metadata[visitor_id]', attribution.visitorId);
  if (attribution?.ghosttownSessionId) fields.set('metadata[ghosttown_session_id]', attribution.ghosttownSessionId);
  setTouchMetadata(fields, 'first_touch', attribution?.firstTouch);
  setTouchMetadata(fields, 'last_touch', attribution?.lastTouch);
}

export function commercialEventAttribution(attribution: CommercialAttributionEnvelope | undefined) {
  return attribution ? {
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
    ghosttownSessionId: attribution.ghosttownSessionId,
    firstTouch: attribution.firstTouch,
    lastTouch: attribution.lastTouch
  } : {};
}
