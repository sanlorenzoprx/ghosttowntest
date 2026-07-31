import { UserData } from '../types/auth';
import { fulfillPaidTestOrder } from './paidTest';
import { fulfillLaunchBlueprintOrder, isLaunchBlueprintCheckout } from './blueprintFulfillment';
import type { Env } from './env';

/**
 * Verify the Stripe-Signature HMAC and reject stale replay attempts.
 */
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const fields = signature.split(',').map(field => field.split('=', 2));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || !secret) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  ));
  const expected = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some(candidate => constantTimeEqual(candidate, expected));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

/**
 * POST /api/webhook/stripe
 * Stripe retries non-2xx fulfillment failures. The event receipt is written only
 * after the paid artifact has passed its gate and storage has completed.
 */
export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    if (!await verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const event = JSON.parse(body) as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    if (!event.id || !event.type || !event.data?.object) {
      return new Response(JSON.stringify({ error: 'Malformed Stripe event' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const eventKey = `stripe_event_${event.id}`;
    if (await env.KV.get(eventKey)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paidTestOrderId = typeof session.metadata === 'object' && session.metadata
        ? (session.metadata as Record<string, unknown>).paid_test_order_id
        : undefined;
      if (typeof paidTestOrderId === 'string' && paidTestOrderId) {
        const order = isLaunchBlueprintCheckout(session)
          ? await fulfillLaunchBlueprintOrder(env, paidTestOrderId, session, event.id)
          : await fulfillPaidTestOrder(env, paidTestOrderId, session, event.id);
        await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });
        return new Response(JSON.stringify({ received: true, paidTest: order.status, artifactType: order.artifactType }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const email = typeof session.customer_email === 'string' ? session.customer_email.trim().toLowerCase() : '';
      if (!email) {
        await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const metadata = typeof session.metadata === 'object' && session.metadata ? session.metadata as Record<string, unknown> : {};
      const purchasedCredits = metadata.purchase_type === 'assessment_pack'
        ? Math.max(0, Number(metadata.test_credits) || 10)
        : 10;
      const userJSON = await env.KV.get(`user_${email}`);
      if (userJSON) {
        const user = JSON.parse(userJSON) as UserData;
        user.testsPurchased += purchasedCredits;
        user.lastPurchaseAt = new Date().toISOString();
        await env.KV.put(`user_${email}`, JSON.stringify(user));
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      console.warn(`Payment failed for ${String(event.data.object.id ?? 'unknown')}`);
    }

    await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Webhook fulfillment error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook fulfillment failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
    });
  }
}
