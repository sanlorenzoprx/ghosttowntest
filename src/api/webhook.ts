import { UserData } from '../types/auth';
import { fulfillPaidTestOrder } from './paidTest';
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
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return false;
  }

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
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * POST /api/webhook/stripe
 * Handles Stripe webhook events
 */
export async function handleStripeWebhook(request: Request, env: Env) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    // Verify webhook signature
    if (!await verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401 }
      );
    }

    const event = JSON.parse(body) as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    if (!event.id || !event.type || !event.data?.object) {
      return new Response(JSON.stringify({ error: 'Malformed Stripe event' }), { status: 400 });
    }

    const eventKey = `stripe_event_${event.id}`;
    if (await env.KV.get(eventKey)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paidTestOrderId = typeof session.metadata === 'object' && session.metadata
        ? (session.metadata as Record<string, unknown>).paid_test_order_id
        : undefined;
      if (typeof paidTestOrderId === 'string' && paidTestOrderId) {
        await fulfillPaidTestOrder(env, paidTestOrderId, session);
        await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });
        return new Response(JSON.stringify({ received: true, paidTest: 'ready' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const email = typeof session.customer_email === 'string'
        ? session.customer_email.trim().toLowerCase()
        : '';

      if (!email) {
        console.warn('No customer email in webhook');
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const metadata = typeof session.metadata === 'object' && session.metadata
        ? session.metadata as Record<string, unknown>
        : {};
      const purchasedCredits = metadata.purchase_type === 'assessment_pack'
        ? Math.max(0, Number(metadata.test_credits) || 10)
        : 10;

      // Update user: increment testsPurchased
      const userJSON = await env.KV.get(`user_${email}`);
      if (userJSON) {
        const user = JSON.parse(userJSON) as UserData;
        user.testsPurchased += purchasedCredits;
        user.lastPurchaseAt = new Date().toISOString();
        await env.KV.put(`user_${email}`, JSON.stringify(user));
        console.log(`User ${email} purchased ${purchasedCredits} tests`);
      } else {
        console.warn(`User ${email} not found in webhook`);
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.warn(`Payment failed for ${String(paymentIntent.id ?? 'unknown')}`);
    }

    await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent Stripe retries
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  }
}
