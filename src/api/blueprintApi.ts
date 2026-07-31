import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import { fulfillLaunchBlueprintOrder } from './blueprintFulfillment';
import {
  loadBlueprintPdf,
  loadBlueprintProgress,
  loadBlueprintRecord,
  saveBlueprintProgress,
  type BlueprintProgress
} from './blueprintStore';

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers }
});

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function ownedOrder(request: Request, env: Env, orderId: string, requireReady = true): Promise<{ order: PaidTestOrder; email: string } | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(`paid_test_order_${orderId}`);
  if (!raw) return json({ error: 'Launch Blueprint not found' }, 404);
  const order = JSON.parse(raw) as PaidTestOrder;
  if (normalizedEmail(order.email) !== normalizedEmail(auth.email)) return json({ error: 'Launch Blueprint not found' }, 404);
  if (requireReady && (order.status !== 'ready' || order.artifactType !== 'launch_blueprint_v2')) {
    return json({ error: order.fulfillmentError || 'Launch Blueprint is not ready', status: order.status }, order.status === 'failed' ? 409 : 425);
  }
  return { order, email: auth.email };
}

export async function handleLaunchBlueprint(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record) return json({ error: 'Canonical Launch Blueprint record not found' }, 404);
  const progress = await loadBlueprintProgress(env, orderId, owned.email);
  return json({
    blueprint: record.blueprint,
    progress,
    research: {
      provider: record.researchReceipt.provider,
      model: record.researchReceipt.model,
      completedAt: record.researchReceipt.completedAt,
      webSearchQueries: record.researchReceipt.webSearchQueries,
      verifiedChannelCount: record.researchReceipt.verifiedChannelCount,
      rejectedUrlCount: record.researchReceipt.rejectedUrls.length
    }
  });
}

export async function handleLaunchBlueprintJson(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record) return json({ error: 'Canonical Launch Blueprint record not found' }, 404);
  return new Response(JSON.stringify(record.blueprint, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ghosttown-launch-blueprint-${orderId}.json"`,
      'Cache-Control': 'private, no-store'
    }
  });
}

export async function handleLaunchBlueprintPdf(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const object = await loadBlueprintPdf(env, orderId);
  if (!object) return json({ error: 'Launch Blueprint PDF not found' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
}

export async function handleLaunchBlueprintProgress(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (request.method === 'GET') return json({ progress: await loadBlueprintProgress(env, orderId, owned.email) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await request.json<Partial<BlueprintProgress>>();
  const progress = await saveBlueprintProgress(env, orderId, owned.email, body);
  return json({ progress });
}

export async function handleLaunchBlueprintRetry(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedOrder(request, env, orderId, false);
  if (owned instanceof Response) return owned;
  if (owned.order.status === 'ready' && owned.order.artifactType === 'launch_blueprint_v2') return json({ error: 'Launch Blueprint is already ready' }, 409);
  if (!owned.order.stripeCheckoutSessionId) return json({ error: 'Stripe checkout session is missing' }, 409);
  const lockKey = `launch_blueprint_retry_${orderId}`;
  if (await env.KV.get(lockKey)) return json({ error: 'A Blueprint retry is already running' }, 409);
  await env.KV.put(lockKey, new Date().toISOString(), { expirationTtl: 900 });
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(owned.order.stripeCheckoutSessionId)}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    const session = await response.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!response.ok) return json({ error: session.error?.message || 'Stripe session could not be verified' }, 502);
    const order = await fulfillLaunchBlueprintOrder(env, orderId, session, `manual_retry_${crypto.randomUUID()}`);
    return json({ orderId: order.orderId, status: order.status, artifactType: order.artifactType });
  } finally {
    await env.KV.delete(lockKey);
  }
}
