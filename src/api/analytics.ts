import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { CommercialAttributionTouch, CommercialEventName, CommercialShareType } from '../types/commercialAttribution';

const allowedEvents = new Set<CommercialEventName>([
  'landing_viewed', 'qualified_click', 'verdict_started', 'verdict_completed',
  'paid_plan_viewed', 'checkout_started', 'download_clicked', 'blueprint_opened',
  'daily_packet_opened', 'day_completed', 'evidence_recorded', 'blueprint_retry_requested',
  'get_me_live_offer_viewed', 'get_me_live_cta_clicked', 'get_me_live_checkout_started',
  'get_me_live_purchase_completed', 'get_me_live_setup_started', 'get_me_live_preview_created',
  'get_me_live_publish_clicked', 'get_me_live_live_completed', 'get_me_live_lead_captured',
  'get_me_live_payment_connected', 'get_me_live_customer_payment'
]);
const allowedShareTypes = new Set<CommercialShareType>(['factory', 'customer', 'earned']);
const EVENT_TTL_SECONDS = 86400 * 180;

function clean(value: unknown, max = 160): string | undefined {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, max) : undefined;
}
function cleanShareType(value: unknown): CommercialShareType | undefined {
  return value === 'factory' || value === 'customer' || value === 'earned' ? value : undefined;
}
function cleanTouch(value: unknown): CommercialAttributionTouch | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const touch: CommercialAttributionTouch = {
    capturedAt: clean(source.capturedAt) || new Date().toISOString(),
    experimentId: clean(source.experimentId),
    sourceVerdictId: clean(source.sourceVerdictId),
    intentId: clean(source.intentId),
    creativeId: clean(source.creativeId),
    publicationId: clean(source.publicationId),
    platform: clean(source.platform, 40),
    accountId: clean(source.accountId),
    campaign: clean(source.campaign),
    source: clean(source.source),
    shareType: cleanShareType(source.shareType)
  };
  return touch;
}

export interface CommercialFunnelEventInput {
  ownerId?: string; orderId?: string; verdictId?: string; source?: string; content?: string;
  attributionToken?: string; experimentId?: string; sourceVerdictId?: string; intentId?: string; creativeId?: string;
  publicationId?: string; platform?: string; accountId?: string; campaign?: string;
  shareType?: CommercialShareType; visitorId?: string; ghosttownSessionId?: string;
  firstTouch?: CommercialAttributionTouch; lastTouch?: CommercialAttributionTouch;
}

export async function recordCommercialFunnelEvent(env: Env, eventName: CommercialEventName, input: CommercialFunnelEventInput = {}): Promise<void> {
  if (!allowedEvents.has(eventName)) throw new Error(`Unsupported commercial event: ${eventName}`);
  const shareType = input.shareType && allowedShareTypes.has(input.shareType) ? input.shareType : undefined;
  const now = new Date().toISOString();
  const event = {
    eventName,
    ownerId: clean(input.ownerId), orderId: clean(input.orderId, 120), verdictId: clean(input.verdictId, 120),
    source: clean(input.source, 120), content: clean(input.content, 120), attributionToken: clean(input.attributionToken),
    experimentId: clean(input.experimentId), sourceVerdictId: clean(input.sourceVerdictId), intentId: clean(input.intentId), creativeId: clean(input.creativeId),
    publicationId: clean(input.publicationId), platform: clean(input.platform, 40), accountId: clean(input.accountId),
    campaign: clean(input.campaign), shareType, visitorId: clean(input.visitorId), ghosttownSessionId: clean(input.ghosttownSessionId),
    firstTouch: cleanTouch(input.firstTouch), lastTouch: cleanTouch(input.lastTouch), createdAt: now
  };
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify(event), { expirationTtl: EVENT_TTL_SECONDS });
}

export async function handleAnalyticsEvent(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env).catch(() => null);
  const body = await request.json<CommercialFunnelEventInput & { eventName?: string; shareType?: CommercialShareType }>().catch(() => null);
  const eventName = body?.eventName?.trim() as CommercialEventName | undefined;
  if (!eventName || eventName === ('purchase_completed' as CommercialEventName) || !allowedEvents.has(eventName)) return json({ error: 'Unsupported analytics event' }, 400);
  if (body?.shareType && !allowedShareTypes.has(body.shareType)) return json({ error: 'Unsupported share type' }, 400);

  await recordCommercialFunnelEvent(env, eventName, {
    ...body,
    ownerId: auth?.email,
    shareType: body?.shareType,
    firstTouch: cleanTouch(body?.firstTouch),
    lastTouch: cleanTouch(body?.lastTouch)
  });
  return json({ recorded: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
