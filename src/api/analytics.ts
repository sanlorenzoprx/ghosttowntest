import { authenticateRequest } from './auth';
import type { Env } from './env';

const allowedEvents = new Set([
  'landing_viewed',
  'verdict_started',
  'verdict_completed',
  'paid_plan_viewed',
  'checkout_started',
  'download_clicked'
]);

export async function handleAnalyticsEvent(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env).catch(() => null);
  const body = await request.json<{
    eventName?: string;
    orderId?: string;
    verdictId?: string;
    source?: string;
    content?: string;
  }>().catch(() => null);
  const eventName = body?.eventName?.trim();
  if (!eventName || eventName === 'purchase_completed' || !allowedEvents.has(eventName)) {
    return json({ error: 'Unsupported analytics event' }, 400);
  }

  const now = new Date().toISOString();
  const event = {
    eventName,
    ownerId: auth?.email,
    orderId: body?.orderId?.slice(0, 120),
    verdictId: body?.verdictId?.slice(0, 120),
    source: body?.source?.slice(0, 120),
    content: body?.content?.slice(0, 120),
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
