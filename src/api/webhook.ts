import {
  fulfillPaidTestOrder,
  markPaidTestCheckoutCanceled,
  markPaidTestPaymentFailed,
  markPaidTestPaymentProcessing,
  markPaidTestRefund
} from './paidTest';
import { fulfillAssessmentCreditOrder, markAssessmentCreditOrder, markAssessmentCreditRefund } from './checkout';
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
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  if (!await verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: 'Invalid signature' }, 400);
  }

  let event: {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return json({ error: 'Malformed Stripe event' }, 400);
  }
  if (!event.id || !event.type || !event.data?.object) return json({ error: 'Malformed Stripe event' }, 400);

  const eventKey = `stripe_event_${event.id}`;
  if (await env.KV.get(eventKey)) return json({ received: true, duplicate: true });

  try {
    const source = event.data.object;
    const metadata = objectMetadata(source);
    const paidTestOrderId = stringValue(metadata.paid_test_order_id);
    const assessmentOrderId = stringValue(metadata.assessment_order_id);

    if (event.type === 'checkout.session.completed') {
      if (paidTestOrderId) {
        if (source.payment_status === 'paid') await fulfillPaidTestOrder(env, paidTestOrderId, source, event.id);
        else await markPaidTestPaymentProcessing(env, paidTestOrderId, source, event.id);
      } else if (assessmentOrderId) {
        if (source.payment_status === 'paid') await fulfillAssessmentCreditOrder(env, assessmentOrderId, source, event.id);
        else await markAssessmentCreditOrder(env, assessmentOrderId, source, 'processing', event.id);
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      if (paidTestOrderId) await fulfillPaidTestOrder(env, paidTestOrderId, source, event.id);
      else if (assessmentOrderId) await fulfillAssessmentCreditOrder(env, assessmentOrderId, source, event.id);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      if (paidTestOrderId) await markPaidTestPaymentFailed(env, paidTestOrderId, source, event.id);
      else if (assessmentOrderId) await markAssessmentCreditOrder(env, assessmentOrderId, source, 'failed', event.id);
    } else if (event.type === 'checkout.session.expired') {
      if (paidTestOrderId) await markPaidTestCheckoutCanceled(env, paidTestOrderId, source, event.id);
      else if (assessmentOrderId) await markAssessmentCreditOrder(env, assessmentOrderId, source, 'canceled', event.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      if (paidTestOrderId) await markPaidTestPaymentFailed(env, paidTestOrderId, source, event.id);
      else if (assessmentOrderId) await markAssessmentCreditOrder(env, assessmentOrderId, source, 'failed', event.id);
    } else if (event.type === 'refund.created' || event.type === 'refund.updated' || event.type === 'refund.failed') {
      const assessmentRefund = await markAssessmentCreditRefund(env, source, event.id);
      if (!assessmentRefund) await markPaidTestRefund(env, source, event.id);
    }

    await env.KV.put(eventKey, new Date().toISOString(), { expirationTtl: 86400 * 90 });
    return json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', event.type, error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Webhook processing failed' }, 500);
  }
}

function objectMetadata(source: Record<string, unknown>): Record<string, unknown> {
  return source.metadata && typeof source.metadata === 'object' ? source.metadata as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
