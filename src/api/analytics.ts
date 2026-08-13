import { authenticateRequest } from './auth';
import type { Env } from './env';

const allowedEvents = new Set([
  'landing_viewed',
  'qualified_click',
  'verdict_started',
  'verdict_completed',
  'paid_plan_viewed',
  'checkout_started',
  'download_clicked'
]);

const allowedShareTypes = new Set(['factory', 'customer', 'earned']);

function clean(value: unknown, max = 160): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
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
  const eventName = body?.eventName?.trim();
  if (!eventName || eventName === 'purchase_completed' || !allowedEvents.has(eventName)) {
    return json({ error: 'Unsupported analytics event' }, 400);
  }

  const shareType = clean(body?.shareType, 20);
  if (shareType && !allowedShareTypes.has(shareType)) {
    return json({ error: 'Unsupported share type' }, 400);
  }

  const now = new Date().toISOString();
  const event = {
    eventName,
    ownerId: auth?.email,
    orderId: clean(body?.orderId, 120),
    verdictId: clean(body?.verdictId, 120),
    source: clean(body?.source, 120),
    content: clean(body?.content, 120),
    attributionToken: clean(body?.attributionToken),
    experimentId: clean(body?.experimentId),
    sourceVerdictId: clean(body?.sourceVerdictId),
    creativeId: clean(body?.creativeId),
    publicationId: clean(body?.publicationId),
    platform: clean(body?.platform, 40),
    accountId: clean(body?.accountId),
    campaign: clean(body?.campaign),
    shareType: shareType as 'factory' | 'customer' | 'earned' | undefined,
    visitorId: clean(body?.visitorId),
    ghosttownSessionId: clean(body?.ghosttownSessionId),
    createdAt: now
  };
  await env.KV.put(`analytics_event_${now}_${crypto.randomUUID()}`, JSON.stringify(event), { expirationTtl: 86400 * 180 });
  return json({ recorded: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
