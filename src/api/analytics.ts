import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { CommercialEventName, CommercialShareType } from '../types/commercialAttribution';

const allowedEvents = new Set<CommercialEventName>([
  'landing_viewed',
  'qualified_click',
  'verdict_started',
  'verdict_completed',
  'paid_plan_viewed',
  'checkout_started',
  'download_clicked',
  'blueprint_opened',
  'daily_packet_opened',
  'day_completed',
  'evidence_recorded',
  'blueprint_retry_requested'
]);

const allowedShareTypes = new Set<CommercialShareType>(['factory', 'customer', 'earned']);
const EVENT_TTL_SECONDS = 86400 * 180;

function clean(value: unknown, max = 160): string | undefined {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, max) : undefined;
}

export interface CommercialFunnelEventInput {
  ownerId?: string;
  orderId?: string;
  verdictId?: string;
  source?: string;
  content?: string;
  attributionToken?: string;
  experimentId?: string;
  sourceVerdictId?: string;
  creativeId?: string;
  publicationId?: string;
  platform?: string;
  accountId?: string;
  campaign?: string;
  shareType?: CommercialShareType;
  visitorId?: string;
  ghosttownSessionId?: string;
}

export async function recordCommercialFunnelEvent(
  env: Env,
  eventName: CommercialEventName,
  input: CommercialFunnelEventInput = {}
): Promise<void> {
  if (!allowedEvents.has(eventName)) throw new Error(`Unsupported commercial event: ${eventName}`);
  const shareType = input.shareType && allowedShareTypes.has(input.shareType) ? input.shareType : undefined;
  const now = new Date().toISOString();
  const event = {
    eventName,
    ownerId: clean(input.ownerId),
    orderId: clean(input.orderId, 120),
    verdictId: clean(input.verdictId, 120),
    source: clean(input.source, 120),
    content: clean(input.content, 120),
    attributionToken: clean(input.attributionToken),
    experimentId: clean(input.experimentId),
    sourceVerdictId: clean(input.sourceVerdictId),
    creativeId: clean(input.creativeId),
    publicationId: clean(input.publicationId),
    platform: clean(input.platform, 40),
    accountId: clean(input.accountId),
    campaign: clean(input.campaign),
    shareType,
    visitorId: clean(input.visitorId),
    ghosttownSessionId: clean(input.ghosttownSessionId),
    createdAt: now
  };
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify(event), { expirationTtl: EVENT_TTL_SECONDS });
}

export async function handleAnalyticsEvent(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env).catch(() => null);
  const body = await request.json<{
    eventName?: string;
    orderId?: string;
    verdictId?: string;
    source?: string;
    content?: string;
    attributionToken?: string;
    experimentId?: string;
    sourceVerdictId?: string;
    creativeId?: string;
    publicationId?: string;
    platform?: string;
    accountId?: string;
    campaign?: string;
    shareType?: string;
    visitorId?: string;
    ghosttownSessionId?: string;
  }>().catch(() => null);
  const eventName = body?.eventName?.trim() as CommercialEventName | undefined;
  if (!eventName || eventName === ('purchase_completed' as CommercialEventName) || !allowedEvents.has(eventName)) {
    return json({ error: 'Unsupported analytics event' }, 400);
  }

  const requestedShareType = clean(body?.shareType, 20);
  if (requestedShareType && !allowedShareTypes.has(requestedShareType as CommercialShareType)) {
    return json({ error: 'Unsupported share type' }, 400);
  }

  await recordCommercialFunnelEvent(env, eventName, {
    ownerId: auth?.email,
    orderId: body?.orderId,
    verdictId: body?.verdictId,
    source: body?.source,
    content: body?.content,
    attributionToken: body?.attributionToken,
    experimentId: body?.experimentId,
    sourceVerdictId: body?.sourceVerdictId,
    creativeId: body?.creativeId,
    publicationId: body?.publicationId,
    platform: body?.platform,
    accountId: body?.accountId,
    campaign: body?.campaign,
    shareType: requestedShareType as CommercialShareType | undefined,
    visitorId: body?.visitorId,
    ghosttownSessionId: body?.ghosttownSessionId
  });
  return json({ recorded: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
