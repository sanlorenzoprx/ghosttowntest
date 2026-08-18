import type { CommercialAttributionEnvelope, CommercialShareType } from '../types/commercialAttribution';

const MAX = 160;

function clean(value: unknown, max = MAX): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function cleanShareType(value: unknown): CommercialShareType | undefined {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}

export function sanitizeCommercialAttribution(
  value: unknown,
  fallbackVerdictId?: string
): CommercialAttributionEnvelope | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const attributionToken = clean(source.attributionToken);
  const visitorId = clean(source.visitorId);
  const ghosttownSessionId = clean(source.ghosttownSessionId);
  if (!attributionToken || !visitorId || !ghosttownSessionId) return undefined;
  const now = new Date().toISOString();
  const firstTouchAt = clean(source.firstTouchAt) || now;
  const lastTouchAt = clean(source.lastTouchAt) || now;
  const sourceVerdictId = clean(source.sourceVerdictId) || clean(fallbackVerdictId, 120);
  const verdictId = clean(source.verdictId, 120) || clean(fallbackVerdictId, 120);
  return {
    schemaVersion: 'ghosttown-commercial-attribution-v1',
    attributionToken,
    visitorId,
    ghosttownSessionId,
    firstTouchAt,
    lastTouchAt,
    experimentId: clean(source.experimentId),
    sourceVerdictId,
    creativeId: clean(source.creativeId),
    publicationId: clean(source.publicationId),
    platform: clean(source.platform, 40),
    accountId: clean(source.accountId),
    campaign: clean(source.campaign),
    source: clean(source.source),
    shareType: cleanShareType(source.shareType),
    verdictId
  };
}

export function appendStripeAttributionMetadata(
  fields: URLSearchParams,
  attribution: CommercialAttributionEnvelope | undefined,
  verdictId: string
): void {
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
    ghosttownSessionId: attribution.ghosttownSessionId
  } : {};
}
