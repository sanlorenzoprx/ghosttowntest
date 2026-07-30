import { authenticateRequest, verifyJWT } from './auth';
import type { CheckoutRequest } from '../types/stripe';
import type { AssessmentCreditOrder, StripeMode, StripePrice } from '../types/stripe';
import { GHOSTTOWN_VERDICT_PACK_V1 } from '../lib/ghosttownOffer';

interface Env {
  KV: KVNamespace;
  FRONTEND_URL?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
}

const assessmentOrderKey = (orderId: string) => `assessment_credit_order_${orderId}`;

function stripeMode(secretKey: string): StripeMode | null {
  if (secretKey.startsWith('sk_test_')) return 'test';
  if (secretKey.startsWith('sk_live_')) return 'live';
  return null;
}

export function stripeProductId(price: StripePrice): string {
  const productId = typeof price.product === 'string' ? price.product : price.product?.id;
  if (!productId) throw new Error('Configured Stripe Price has no product');
  return productId;
}

export async function validateConfiguredStripePrice(
  secretKey: string,
  priceId: string,
  expectedAmountCents: number,
  expectedCurrency: string,
  expectedLiveProductId?: string
): Promise<{ price: StripePrice; mode: StripeMode }> {
  const mode = stripeMode(secretKey);
  if (!mode) throw new Error('Stripe secret key mode is not configured');
  if (!priceId.trim()) throw new Error('Stripe Price ID is not configured');

  const response = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId.trim())}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  if (!response.ok) {
    void response.body?.cancel();
    throw new Error('Configured Stripe Price could not be retrieved with this account');
  }

  const price = await response.json() as StripePrice;
  if (price.id !== priceId.trim()) throw new Error('Stripe returned an unexpected Price');
  if (!price.active) throw new Error('Configured Stripe Price is inactive');
  if (price.type !== 'one_time') throw new Error('Configured Stripe Price must be one-time');
  if (price.unit_amount !== expectedAmountCents) throw new Error('Configured Stripe Price amount does not match the offer');
  if (price.currency.toLowerCase() !== expectedCurrency.toLowerCase()) throw new Error('Configured Stripe Price currency does not match the offer');
  if (price.livemode !== (mode === 'live')) throw new Error('Stripe key and Price modes do not match');
  const productId = stripeProductId(price);
  if (mode === 'live' && expectedLiveProductId && productId !== expectedLiveProductId) {
    throw new Error('Configured Stripe Price belongs to the wrong Product');
  }
  return { price, mode };
}

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session
 */
export async function handleCheckout(request: Request, env: Env) {
  try {
    let auth = await authenticateRequest(request, env);
    if (!auth) {
      const { token } = await request.json<Partial<CheckoutRequest>>().catch((): Partial<CheckoutRequest> => ({}));
      const payload = token ? await verifyJWT(token, env.JWT_SECRET) : null;
      if (payload) {
        const userJson = await env.KV.get(`user_${payload.email}`);
        if (userJson) auth = { email: payload.email, user: JSON.parse(userJson) };
      }
    }
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }

    if (!env.STRIPE_PRICE_ID?.trim()) {
      return new Response(JSON.stringify({ error: 'Assessment checkout is not configured' }), { status: 503 });
    }

    let validated: { price: StripePrice; mode: StripeMode };
    try {
      validated = await validateConfiguredStripePrice(
        env.STRIPE_SECRET_KEY,
        env.STRIPE_PRICE_ID,
        GHOSTTOWN_VERDICT_PACK_V1.amountCents,
        GHOSTTOWN_VERDICT_PACK_V1.currency,
        GHOSTTOWN_VERDICT_PACK_V1.stripeProductId
      );
    } catch (error) {
      console.error('Assessment checkout Price validation failed', error instanceof Error ? error.message : 'unknown error');
      return new Response(JSON.stringify({ error: 'Assessment checkout Price configuration is invalid' }), { status: 502 });
    }

    const now = new Date().toISOString();
    const order: AssessmentCreditOrder = {
      orderId: `credits_${crypto.randomUUID()}`,
      ownerId: auth.email.trim().toLowerCase(),
      stripePriceId: validated.price.id,
      stripeProductId: stripeProductId(validated.price),
      stripeMode: validated.mode,
      amountCents: GHOSTTOWN_VERDICT_PACK_V1.amountCents,
      currency: GHOSTTOWN_VERDICT_PACK_V1.currency,
      credits: GHOSTTOWN_VERDICT_PACK_V1.credits,
      idempotencyKey: `checkout_${crypto.randomUUID()}`,
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      createdAt: now,
      updatedAt: now
    };
    await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));

    // Create Stripe Checkout session
    const checkoutData = new URLSearchParams({
      'line_items[0][price]': order.stripePriceId,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin}/dashboard?assessment_purchase=success`,
      'cancel_url': `${env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin}/?assessment_purchase=canceled`,
      'customer_email': order.ownerId,
      'customer_creation': 'always',
      'client_reference_id': order.orderId,
      'metadata[purchase_type]': 'assessment_pack',
      'metadata[offer_id]': GHOSTTOWN_VERDICT_PACK_V1.offerId,
      'metadata[offer_version]': GHOSTTOWN_VERDICT_PACK_V1.version,
      'metadata[offer_name]': GHOSTTOWN_VERDICT_PACK_V1.name,
      'metadata[test_credits]': String(order.credits),
      'metadata[assessment_order_id]': order.orderId,
      'metadata[owner_id]': order.ownerId,
      'metadata[stripe_price_id]': order.stripePriceId,
      'metadata[stripe_product_id]': order.stripeProductId || '',
      'payment_intent_data[metadata][assessment_order_id]': order.orderId,
      'payment_intent_data[metadata][owner_id]': order.ownerId
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': order.idempotencyKey
      },
      body: checkoutData.toString()
    });

    if (!stripeResponse.ok) {
      void stripeResponse.body?.cancel();
      order.paymentStatus = 'failed';
      order.failureReason = 'Stripe rejected checkout configuration';
      order.updatedAt = new Date().toISOString();
      await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));
      console.error('Assessment checkout creation failed', stripeResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500 }
      );
    }

    const session = await stripeResponse.json() as { id?: string; url?: string };
    if (!session.id || !session.url) throw new Error('Stripe Checkout Session response was incomplete');
    order.checkoutSessionId = session.id;
    order.updatedAt = new Date().toISOString();
    await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Checkout failed' }),
      { status: 500 }
    );
  }
}

export async function fulfillAssessmentCreditOrder(
  env: Env,
  orderId: string,
  session: Record<string, unknown>,
  eventId?: string
): Promise<AssessmentCreditOrder> {
  const order = await loadAssessmentOrder(env, orderId);
  if (order.fulfillmentStatus === 'fulfilled') return order;
  const metadata = metadataFrom(session);
  assertAssessmentMetadata(metadata, 'assessment_order_id', order.orderId);
  assertAssessmentMetadata(metadata, 'owner_id', order.ownerId);
  assertAssessmentMetadata(metadata, 'stripe_price_id', order.stripePriceId);
  if (order.stripeProductId) assertAssessmentMetadata(metadata, 'stripe_product_id', order.stripeProductId);
  if (session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid') {
    throw new Error('Assessment Checkout Session is not complete and paid');
  }
  if (session.client_reference_id !== order.orderId) throw new Error('Assessment Checkout client reference mismatch');
  if (order.checkoutSessionId && session.id !== order.checkoutSessionId) throw new Error('Assessment Checkout Session mismatch');
  if (session.amount_total !== order.amountCents || session.currency !== order.currency) throw new Error('Assessment Checkout amount or currency mismatch');
  const sessionMode: StripeMode = session.livemode === true ? 'live' : 'test';
  if (sessionMode !== order.stripeMode) throw new Error('Assessment Checkout mode mismatch');

  const userJson = await env.KV.get(`user_${order.ownerId}`);
  if (!userJson) throw new Error('Assessment purchase owner not found');
  const user = JSON.parse(userJson) as { testsPurchased: number; lastPurchaseAt?: string };
  user.testsPurchased += order.credits;
  const now = new Date().toISOString();
  user.lastPurchaseAt = now;
  await env.KV.put(`user_${order.ownerId}`, JSON.stringify(user));

  order.checkoutSessionId = String(session.id);
  order.paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  order.customerId = typeof session.customer === 'string' ? session.customer : undefined;
  order.paymentStatus = 'paid';
  order.fulfillmentStatus = 'fulfilled';
  order.stripeEventId = eventId;
  order.paidAt = now;
  order.updatedAt = now;
  await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));
  if (order.paymentIntentId) await env.KV.put(`assessment_payment_intent_${order.paymentIntentId}`, order.orderId);
  return order;
}

export async function markAssessmentCreditOrder(
  env: Env,
  orderId: string,
  source: Record<string, unknown>,
  paymentStatus: 'processing' | 'failed' | 'canceled',
  eventId?: string
): Promise<AssessmentCreditOrder> {
  const order = await loadAssessmentOrder(env, orderId);
  if (order.fulfillmentStatus === 'fulfilled') return order;
  const metadata = metadataFrom(source);
  assertAssessmentMetadata(metadata, 'assessment_order_id', order.orderId);
  assertAssessmentMetadata(metadata, 'owner_id', order.ownerId);
  order.paymentStatus = paymentStatus;
  order.stripeEventId = eventId;
  order.failureReason = paymentStatus === 'failed' ? 'Stripe payment failed or was not completed' : undefined;
  order.updatedAt = new Date().toISOString();
  await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));
  return order;
}

export async function markAssessmentCreditRefund(
  env: Env,
  refund: Record<string, unknown>,
  eventId?: string
): Promise<AssessmentCreditOrder | null> {
  const paymentIntentId = typeof refund.payment_intent === 'string' ? refund.payment_intent : '';
  if (!paymentIntentId) return null;
  const orderId = await env.KV.get(`assessment_payment_intent_${paymentIntentId}`);
  if (!orderId) return null;
  const order = await loadAssessmentOrder(env, orderId);
  const wasFullyRefunded = order.paymentStatus === 'refunded';
  const refundAmount = typeof refund.amount === 'number' ? refund.amount : 0;
  const refundId = typeof refund.id === 'string' ? refund.id : '';
  if (!refundId) throw new Error('Stripe refund has no ID');
  const refundStatus = typeof refund.status === 'string' ? refund.status : 'unknown';
  const now = new Date().toISOString();
  const refunds = order.refunds ?? [];
  order.refunds = [
    ...refunds.filter(item => item.id !== refundId),
    { id: refundId, amountCents: refundAmount, status: refundStatus, updatedAt: now }
  ];
  order.refundId = refundId;
  order.refundStatus = refundStatus;
  order.refundedAmountCents = Math.min(order.amountCents, order.refunds.filter(item => item.status === 'succeeded').reduce((sum, item) => sum + item.amountCents, 0));
  order.refundedAt = refundStatus === 'succeeded' ? now : order.refundedAt;
  order.stripeEventId = eventId;
  if (order.refundedAmountCents > 0) order.paymentStatus = order.refundedAmountCents >= order.amountCents ? 'refunded' : 'partially_refunded';
  if (order.paymentStatus === 'refunded' && !wasFullyRefunded) {
    order.fulfillmentStatus = 'revoked';
    const userJson = await env.KV.get(`user_${order.ownerId}`);
    if (userJson) {
      const user = JSON.parse(userJson) as { testsPurchased: number };
      user.testsPurchased = Math.max(0, user.testsPurchased - order.credits);
      await env.KV.put(`user_${order.ownerId}`, JSON.stringify(user));
    }
  }
  order.updatedAt = now;
  await env.KV.put(assessmentOrderKey(order.orderId), JSON.stringify(order));
  return order;
}

async function loadAssessmentOrder(env: Env, orderId: string): Promise<AssessmentCreditOrder> {
  const raw = await env.KV.get(assessmentOrderKey(orderId));
  if (!raw) throw new Error('Assessment credit order not found');
  return JSON.parse(raw) as AssessmentCreditOrder;
}

function metadataFrom(source: Record<string, unknown>): Record<string, unknown> {
  return source.metadata && typeof source.metadata === 'object' ? source.metadata as Record<string, unknown> : {};
}

function assertAssessmentMetadata(metadata: Record<string, unknown>, key: string, expected: string): void {
  if (metadata[key] !== expected) throw new Error(`Stripe assessment metadata ${key} mismatch`);
}
