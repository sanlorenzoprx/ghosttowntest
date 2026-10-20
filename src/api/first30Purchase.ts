import type { Env } from './env';
import type { PaidTestOrder } from '../types/paidTest';
import { GHOSTTOWN_FIRST_30_V1 } from '../lib/ghosttownOffer';
import { markLaunchBlueprintAwaitingSeeds } from './blueprintFulfillment';
import { grantFirst30Website } from './getMeLive';
import {
  loadGetMeLiveOrder,
  markGetMeLiveRefunded,
  refundIncludedGetMeLiveOrder,
  restoreIncludedGetMeLiveOrder
} from './getMeLiveStore';
import { requireOwner } from './commercialMetrics';
import { recordCommercialFunnelEvent } from './analytics';

/**
 * First 30: one payment buys the 30-day plan (the Launch Blueprint Sprint) and
 * the customer-acquisition website (Get Me Live). Refund rule: full refund
 * until the website build starts, none after. The build starts the first time
 * the founder asks for the website preview (`markGetMeLiveBuildStarted`).
 */

const orderKey = (id: string) => `paid_test_order_${id}`;
const paymentIntentKey = (paymentIntentId: string) => `first30_payment_intent_${paymentIntentId}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

async function loadOrder(env: Env, orderId: string): Promise<PaidTestOrder | null> {
  const raw = await env.KV.get(orderKey(orderId));
  return raw ? JSON.parse(raw) as PaidTestOrder : null;
}

async function saveOrder(env: Env, order: PaidTestOrder): Promise<void> {
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
}

/** Verified, paid First 30 checkout: unlock the Sprint and grant the included website. */
export async function fulfillFirst30Purchase(
  env: Env,
  orderId: string,
  session: Record<string, unknown>,
  eventId: string
): Promise<{ order: PaidTestOrder; websiteOrderId: string }> {
  const order = await markLaunchBlueprintAwaitingSeeds(env, orderId, session, eventId);
  if (order.offerId !== GHOSTTOWN_FIRST_30_V1.offerId) throw new Error('First 30 checkout does not match a First 30 order');
  // A replayed payment for a refunded order must not grant anything again; answer it without retrying.
  if (order.status === 'refunded') return { order, websiteOrderId: order.websiteOrderId || '' };
  const website = await grantFirst30Website(env, {
    orderId: order.orderId,
    email: order.email,
    stripePriceId: order.stripePriceId,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    stripePaymentIntentId: order.stripePaymentIntentId,
    paidAt: order.paidAt
  });
  if (order.websiteOrderId !== website.orderId) {
    order.websiteOrderId = website.orderId;
    order.updatedAt = new Date().toISOString();
    await saveOrder(env, order);
  }
  if (order.stripePaymentIntentId) {
    await env.KV.put(paymentIntentKey(order.stripePaymentIntentId), order.orderId);
  }
  await recordCommercialFunnelEvent(env, 'first30_purchase_completed', {
    ownerId: order.email,
    orderId: order.orderId,
    source: 'stripe',
    content: website.orderId
  }).catch(() => undefined);
  return { order, websiteOrderId: website.orderId };
}

async function markOrderRefunded(env: Env, order: PaidTestOrder, at: string): Promise<void> {
  order.status = 'refunded';
  order.refundedAt = order.refundedAt || at;
  order.updatedAt = at;
  await saveOrder(env, order);
  await recordCommercialFunnelEvent(env, 'first30_refunded', { ownerId: order.email, orderId: order.orderId, source: 'stripe' }).catch(() => undefined);
}

/**
 * A refund recorded by Stripe (`charge.refunded`), for example one made from the
 * Stripe dashboard. The founder decided to refund, so the order and its website
 * are closed whatever the website's state. Returns the order id, if any.
 */
export async function recordFirst30Refund(env: Env, paymentIntentId: string): Promise<string | undefined> {
  const orderId = await env.KV.get(paymentIntentKey(paymentIntentId));
  if (!orderId) return undefined;
  const order = await loadOrder(env, orderId);
  if (!order || order.offerId !== GHOSTTOWN_FIRST_30_V1.offerId) return undefined;
  const at = new Date().toISOString();
  if (order.websiteOrderId) await markGetMeLiveRefunded(env, order.websiteOrderId, at);
  if (order.status !== 'refunded') await markOrderRefunded(env, order, at);
  return order.orderId;
}

/**
 * POST /api/internal/first30/refund { orderId } — owner only.
 * Applies the published rule: a full refund only while the website build has
 * not started. The website row is closed first, so a build cannot start while
 * Stripe processes the refund; if Stripe refuses, the website is restored.
 */
export async function handleFirst30Refund(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;
  const body = await request.json<{ orderId?: unknown }>().catch(() => ({} as { orderId?: unknown }));
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const order = await loadOrder(env, orderId);
  if (!order || order.offerId !== GHOSTTOWN_FIRST_30_V1.offerId) return json({ error: 'First 30 order not found' }, 404);
  if (order.status === 'refunded') return json({ refunded: true, alreadyRefunded: true, orderId });
  if (!order.paidAt || !order.stripePaymentIntentId || !order.websiteOrderId) {
    return json({ error: 'This First 30 order has no completed payment to refund' }, 409);
  }

  const website = await loadGetMeLiveOrder(env, order.websiteOrderId);
  if (!website) return json({ error: 'The included website record is missing' }, 409);
  const at = new Date().toISOString();
  if (!(await refundIncludedGetMeLiveOrder(env, website.orderId, at))) {
    return json({
      error: 'The website build has already started, so this order is outside the First 30 refund window.',
      code: 'FIRST30_REFUND_WINDOW_CLOSED',
      buildStartedAt: (await loadGetMeLiveOrder(env, website.orderId))?.buildStartedAt
    }, 409);
  }

  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `first30_refund_${order.orderId}`
    },
    body: new URLSearchParams({
      payment_intent: order.stripePaymentIntentId,
      'metadata[paid_test_order_id]': order.orderId,
      'metadata[reason]': 'first30_refund_before_website_build'
    }).toString()
  });
  if (!response.ok) {
    console.error('First 30 refund rejected by Stripe', response.status, await response.text());
    await restoreIncludedGetMeLiveOrder(env, website.orderId, website.status, new Date().toISOString());
    return json({ error: 'Stripe did not complete the refund. Nothing was changed.' }, 502);
  }
  const refund = await response.json<{ id?: string }>().catch(() => ({} as { id?: string }));
  await markOrderRefunded(env, order, at);
  return json({ refunded: true, orderId, refundId: refund.id });
}
