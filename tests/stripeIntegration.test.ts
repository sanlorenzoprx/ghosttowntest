import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/api/index';
import { handleStripeWebhook } from '../src/api/webhook';
import type { Env } from '../src/api/env';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { AssessmentCreditOrder } from '../src/types/stripe';
import type { EvaluationResult } from '../src/types/lit';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';

class MemoryKv {
  values = new Map<string, string>();

  async get<T = string>(key: string, type?: 'text' | 'json'): Promise<T | null> {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return (type === 'json' ? JSON.parse(value) : value) as T;
  }

  async put(key: string, value: string, _options?: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(options: { prefix?: string } = {}): Promise<{ keys: Array<{ name: string }> }> {
    const prefix = options.prefix ?? '';
    return { keys: [...this.values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) };
  }
}

const verdict = {
  resultId: 'verdict_checkout',
  generatedAt: '2026-07-30T00:00:00.000Z',
  idea: { ideaName: 'Release QA', description: 'A QA offer', targetUser: 'Agencies', painfulProblem: 'Defects', currentAlternative: 'Checklists', motivation: 'Experience' },
  deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Scope', businessDnaWinStrategy: 'Narrow', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Validate', recommendedNextTest: 'Interview', doNotBuildUntil: 'Buyer pays', oneSentenceAdvice: 'Test' },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

function envWithKv(kv: MemoryKv, overrides: Partial<Env> = {}): Env {
  return {
    KV: kv as unknown as KVNamespace,
    AI: {} as Ai,
    FRONTEND_URL: 'https://lit-ghosttown.app',
    JWT_SECRET: 'unit-test-jwt-secret',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_assessment_test',
    STRIPE_30_DAY_PLAN_PRICE_ID: 'price_plan_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit_test',
    ...overrides
  };
}

async function signup(env: Env, email: string): Promise<string> {
  const response = await worker.fetch(new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse' })
  }), env);
  return (await response.json<{ token: string }>()).token;
}

function validPrice(id = 'price_plan_test', livemode = false, amount = 9700) {
  return { id, object: 'price', active: true, currency: 'usd', livemode, type: 'one_time', unit_amount: amount, product: 'prod_test' };
}

function completedAssessmentSession(order: AssessmentCreditOrder, overrides: Record<string, unknown> = {}) {
  return {
    id: order.checkoutSessionId,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: order.orderId,
    amount_total: 1497,
    currency: 'usd',
    livemode: false,
    payment_intent: 'pi_assessment_pack',
    customer: 'cus_assessment_pack',
    metadata: {
      purchase_type: 'assessment_pack',
      test_credits: '10',
      assessment_order_id: order.orderId,
      owner_id: order.ownerId,
      stripe_price_id: order.stripePriceId
    },
    ...overrides
  };
}

function intake() {
  return { verdictId: verdict.resultId, targetBuyer: 'Agency owners', problem: 'Release defects', currentWorkaround: 'Manual checklists' };
}

function paidOrder(overrides: Partial<PaidTestOrder> = {}): PaidTestOrder {
  return {
    orderId: 'gtt_webhook',
    email: 'buyer@example.com',
    verdictId: verdict.resultId,
    stripeCheckoutSessionId: 'cs_test_plan',
    stripePriceId: 'price_plan_test',
    stripeMode: 'test',
    amountCents: 9700,
    currency: 'usd',
    paymentStatus: 'pending',
    fulfillmentStatus: 'pending',
    status: 'checkout_created',
    artifactType: 'execution_plan_30day_v1',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: '1.0',
    planVersion: '1.0',
    idempotencyKey: 'idem_webhook',
    intake: intake(),
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
    ...overrides
  };
}

function completedSession(order: PaidTestOrder, overrides: Record<string, unknown> = {}) {
  return {
    id: order.stripeCheckoutSessionId,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: order.orderId,
    amount_total: 9700,
    currency: 'usd',
    livemode: false,
    payment_intent: 'pi_test_plan',
    customer: 'cus_test_plan',
    metadata: {
      paid_test_order_id: order.orderId,
      owner_id: order.email,
      offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
      offer_version: '1.0',
      offer_amount_cents: '9700',
      offer_currency: 'usd',
      plan_version: '1.0',
      stripe_price_id: order.stripePriceId,
      fulfillment_type: 'execution_plan_30day_v1'
    },
    ...overrides
  };
}

async function signedWebhook(event: unknown, secret = 'whsec_unit_test'): Promise<Request> {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
  const signature = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  return new Request('http://localhost/api/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` }, body });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('10-assessment credit pack', () => {
  it('creates a validated $14.97 checkout and grants exactly 10 credits after a verified paid webhook', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const token = await signup(env, 'credits@example.com');
    const stripeFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/prices/')) {
        return Response.json(validPrice('price_assessment_test', false, 1497));
      }
      const headers = new Headers(init?.headers);
      const fields = new URLSearchParams(String(init?.body));
      expect(headers.get('Idempotency-Key')).toMatch(/^checkout_/);
      expect(fields.get('line_items[0][price]')).toBe('price_assessment_test');
      expect(fields.get('metadata[purchase_type]')).toBe('assessment_pack');
      expect(fields.get('metadata[test_credits]')).toBe('10');
      expect(fields.get('metadata[owner_id]')).toBe('credits@example.com');
      return Response.json({ id: 'cs_assessment_pack', url: 'https://checkout.stripe.com/c/pay/credits' });
    });
    vi.stubGlobal('fetch', stripeFetch);

    const checkout = await worker.fetch(new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}'
    }), env);
    expect(checkout.status).toBe(200);
    expect(await checkout.json<{ sessionUrl: string }>()).toMatchObject({
      sessionUrl: 'https://checkout.stripe.com/c/pay/credits'
    });

    const orderKey = [...kv.values.keys()].find(key => key.startsWith('assessment_credit_order_'));
    expect(orderKey).toBeTruthy();
    const order = JSON.parse((await kv.get(orderKey!)) || '{}') as AssessmentCreditOrder;
    expect(order).toMatchObject({
      ownerId: 'credits@example.com',
      amountCents: 1497,
      currency: 'usd',
      credits: 10,
      checkoutSessionId: 'cs_assessment_pack',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending'
    });

    const event = {
      id: 'evt_assessment_paid',
      type: 'checkout.session.completed',
      data: { object: completedAssessmentSession(order) }
    };
    expect((await handleStripeWebhook(await signedWebhook(event), env)).status).toBe(200);
    const userAfterPayment = JSON.parse((await kv.get('user_credits@example.com')) || '{}') as { testsPurchased: number };
    expect(userAfterPayment.testsPurchased).toBe(10);

    const duplicate = await handleStripeWebhook(await signedWebhook(event), env);
    expect(await duplicate.json<{ duplicate: boolean }>()).toMatchObject({ duplicate: true });
    const userAfterDuplicate = JSON.parse((await kv.get('user_credits@example.com')) || '{}') as { testsPurchased: number };
    expect(userAfterDuplicate.testsPurchased).toBe(10);
  });

  it('rejects a mispriced credit pack before creating a Checkout Session', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const token = await signup(env, 'mispriced-credits@example.com');
    const stripeFetch = vi.fn(async () => Response.json(validPrice('price_assessment_test', false, 1496)));
    vi.stubGlobal('fetch', stripeFetch);

    const response = await worker.fetch(new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}'
    }), env);

    expect(response.status).toBe(502);
    expect(stripeFetch).toHaveBeenCalledTimes(1);
    expect([...kv.values.keys()].some(key => key.startsWith('assessment_credit_order_'))).toBe(false);
  });

  it('revokes the 10 purchased credits after a successful full refund', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    await signup(env, 'refund-credits@example.com');
    const now = '2026-07-30T00:00:00.000Z';
    const order: AssessmentCreditOrder = {
      orderId: 'credits_refund',
      ownerId: 'refund-credits@example.com',
      stripePriceId: 'price_assessment_test',
      stripeMode: 'test',
      amountCents: 1497,
      currency: 'usd',
      credits: 10,
      idempotencyKey: 'checkout_refund',
      checkoutSessionId: 'cs_assessment_refund',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      createdAt: now,
      updatedAt: now
    };
    await kv.put(`assessment_credit_order_${order.orderId}`, JSON.stringify(order));
    await handleStripeWebhook(await signedWebhook({
      id: 'evt_assessment_refund_paid',
      type: 'checkout.session.completed',
      data: { object: completedAssessmentSession(order, { payment_intent: 'pi_assessment_refund' }) }
    }), env);

    const refund = { id: 're_assessment_full', payment_intent: 'pi_assessment_refund', amount: 1497, currency: 'usd', status: 'succeeded' };
    expect((await handleStripeWebhook(await signedWebhook({
      id: 'evt_assessment_refunded',
      type: 'refund.created',
      data: { object: refund }
    }), env)).status).toBe(200);

    const user = JSON.parse((await kv.get('user_refund-credits@example.com')) || '{}') as { testsPurchased: number };
    const stored = JSON.parse((await kv.get(`assessment_credit_order_${order.orderId}`)) || '{}') as AssessmentCreditOrder;
    expect(user.testsPurchased).toBe(0);
    expect(stored).toMatchObject({
      paymentStatus: 'refunded',
      fulfillmentStatus: 'revoked',
      refundedAmountCents: 1497
    });
  });
});

describe('paid plan Checkout Session creation', () => {
  it('creates checkout only for an authenticated owner using a validated server Price and idempotency key', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const token = await signup(env, 'buyer@example.com');
    await kv.put(`user_result_buyer@example.com_${verdict.resultId}`, JSON.stringify(verdict));
    const stripeFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/prices/')) return Response.json(validPrice());
      expect(new Headers(init?.headers).get('Idempotency-Key')).toMatch(/^idem_/);
      const fields = new URLSearchParams(String(init?.body));
      expect(fields.get('line_items[0][price]')).toBe('price_plan_test');
      expect(fields.get('metadata[owner_id]')).toBe('buyer@example.com');
      expect(fields.get('payment_intent_data[metadata][paid_test_order_id]')).toMatch(/^gtt_/);
      return Response.json({ id: 'cs_test_created', url: 'https://checkout.stripe.com/c/pay/test' });
    });
    vi.stubGlobal('fetch', stripeFetch);

    const response = await worker.fetch(new Request('http://localhost/api/paid-test/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(intake())
    }), env);
    const body = await response.json<{ orderId: string; sessionUrl: string }>();
    const stored = JSON.parse(await kv.get(`paid_test_order_${body.orderId}`) || '{}') as PaidTestOrder;

    expect(response.status).toBe(200);
    expect(body.sessionUrl).toContain('checkout.stripe.com');
    expect(stripeFetch).toHaveBeenCalledTimes(2);
    expect(stored).toMatchObject({ stripeCheckoutSessionId: 'cs_test_created', amountCents: 9700, currency: 'usd', paymentStatus: 'pending', fulfillmentStatus: 'pending' });
  });

  it('rejects unauthenticated checkout before calling Stripe', async () => {
    const stripeFetch = vi.fn();
    vi.stubGlobal('fetch', stripeFetch);
    const response = await worker.fetch(new Request('http://localhost/api/paid-test/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(intake()) }), envWithKv(new MemoryKv()));
    expect(response.status).toBe(401);
    expect(stripeFetch).not.toHaveBeenCalled();
  });

  it('fails closed when the Price ID is missing', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv, { STRIPE_30_DAY_PLAN_PRICE_ID: '' });
    const token = await signup(env, 'buyer@example.com');
    await kv.put(`user_result_buyer@example.com_${verdict.resultId}`, JSON.stringify(verdict));
    const response = await worker.fetch(new Request('http://localhost/api/paid-test/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(intake()) }), env);
    expect(response.status).toBe(503);
  });

  it.each([
    ['nonexistent Price', new Response('{}', { status: 404 })],
    ['live Price with test key', Response.json(validPrice('price_plan_test', true))],
    ['wrong amount', Response.json(validPrice('price_plan_test', false, 1234))]
  ])('rejects %s', async (_name, priceResponse) => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const token = await signup(env, 'buyer@example.com');
    await kv.put(`user_result_buyer@example.com_${verdict.resultId}`, JSON.stringify(verdict));
    vi.stubGlobal('fetch', vi.fn(async () => priceResponse.clone()));
    const response = await worker.fetch(new Request('http://localhost/api/paid-test/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(intake()) }), env);
    expect(response.status).toBe(502);
    expect([...kv.values.keys()].some(key => key.startsWith('paid_test_order_'))).toBe(false);
  });
});

describe('verified Stripe webhook fulfillment', () => {
  it('rejects an invalid signature', async () => {
    const request = new Request('http://localhost/api/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, body: '{}' });
    expect((await handleStripeWebhook(request, envWithKv(new MemoryKv()))).status).toBe(400);
  });

  it('fulfills once and treats a duplicate delivery as a no-op', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const order = paidOrder();
    await kv.put(`paid_test_order_${order.orderId}`, JSON.stringify(order));
    await kv.put(`verdict_${verdict.resultId}`, JSON.stringify(verdict));
    const event = { id: 'evt_complete', type: 'checkout.session.completed', data: { object: completedSession(order) } };

    expect((await handleStripeWebhook(await signedWebhook(event), env)).status).toBe(200);
    const firstPlan = await kv.get(`paid_test_plan_${order.orderId}`);
    const duplicate = await handleStripeWebhook(await signedWebhook(event), env);
    const stored = JSON.parse(await kv.get(`paid_test_order_${order.orderId}`) || '{}') as PaidTestOrder;

    expect(await duplicate.json<{ duplicate: boolean }>()).toMatchObject({ duplicate: true });
    expect(await kv.get(`paid_test_plan_${order.orderId}`)).toBe(firstPlan);
    expect(stored).toMatchObject({ status: 'ready', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', stripePaymentIntentId: 'pi_test_plan' });
    expect(stored.artifactId).toMatch(/^plan_/);
  });

  it('returns 500 and leaves the event retryable for an unknown order', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const order = paidOrder({ orderId: 'missing' });
    const event = { id: 'evt_unknown', type: 'checkout.session.completed', data: { object: completedSession(order) } };
    expect((await handleStripeWebhook(await signedWebhook(event), env)).status).toBe(500);
    expect(await kv.get('stripe_event_evt_unknown')).toBeNull();
  });

  it.each([
    ['checkout.session.async_payment_failed', 'failed'],
    ['checkout.session.expired', 'canceled']
  ])('records %s without fulfillment', async (type, expectedStatus) => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const order = paidOrder();
    await kv.put(`paid_test_order_${order.orderId}`, JSON.stringify(order));
    const event = { id: `evt_${expectedStatus}`, type, data: { object: completedSession(order, { payment_status: 'unpaid' }) } };
    expect((await handleStripeWebhook(await signedWebhook(event), env)).status).toBe(200);
    const stored = JSON.parse(await kv.get(`paid_test_order_${order.orderId}`) || '{}') as PaidTestOrder;
    expect(stored.status).toBe(expectedStatus);
    expect(await kv.get(`paid_test_plan_${order.orderId}`)).toBeNull();
  });

  it('tracks pending and multiple partial refunds, revoking access only after the full amount succeeds', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const order = paidOrder();
    await kv.put(`paid_test_order_${order.orderId}`, JSON.stringify(order));
    await kv.put(`verdict_${verdict.resultId}`, JSON.stringify(verdict));
    await handleStripeWebhook(await signedWebhook({ id: 'evt_paid', type: 'checkout.session.completed', data: { object: completedSession(order) } }), env);
    const pending = { id: 're_first', payment_intent: 'pi_test_plan', amount: 4000, currency: 'usd', status: 'pending' };
    await handleStripeWebhook(await signedWebhook({ id: 'evt_refund_pending', type: 'refund.created', data: { object: pending } }), env);
    let stored = JSON.parse(await kv.get(`paid_test_order_${order.orderId}`) || '{}') as PaidTestOrder;
    expect(stored).toMatchObject({ status: 'ready', paymentStatus: 'paid', refundStatus: 'pending', refundedAmountCents: 0 });

    await handleStripeWebhook(await signedWebhook({ id: 'evt_refund_partial', type: 'refund.updated', data: { object: { ...pending, status: 'succeeded' } } }), env);
    stored = JSON.parse(await kv.get(`paid_test_order_${order.orderId}`) || '{}') as PaidTestOrder;
    expect(stored).toMatchObject({ status: 'ready', paymentStatus: 'partially_refunded', refundedAmountCents: 4000 });

    const remainder = { id: 're_second', payment_intent: 'pi_test_plan', amount: 5700, currency: 'usd', status: 'succeeded' };
    expect((await handleStripeWebhook(await signedWebhook({ id: 'evt_refund_full', type: 'refund.created', data: { object: remainder } }), env)).status).toBe(200);
    stored = JSON.parse(await kv.get(`paid_test_order_${order.orderId}`) || '{}') as PaidTestOrder;
    expect(stored).toMatchObject({ status: 'refunded', paymentStatus: 'refunded', fulfillmentStatus: 'revoked', refundId: 're_second', refundedAmountCents: 9700 });
  });
});

describe('purchased report ownership', () => {
  it('allows the owner download and hides it from another authenticated customer', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const ownerToken = await signup(env, 'buyer@example.com');
    const intruderToken = await signup(env, 'other@example.com');
    const order = paidOrder({ status: 'ready', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled' });
    await kv.put(`paid_test_order_${order.orderId}`, JSON.stringify(order));
    await kv.put(`paid_test_plan_${order.orderId}`, JSON.stringify({ planId: 'plan_owned', orderId: order.orderId }));

    const url = `http://localhost/api/paid-test/orders/${order.orderId}/plan`;
    const owner = await worker.fetch(new Request(url, { headers: { Authorization: `Bearer ${ownerToken}` } }), env);
    const intruder = await worker.fetch(new Request(url, { headers: { Authorization: `Bearer ${intruderToken}` } }), env);
    expect(owner.status).toBe(200);
    expect(owner.headers.get('Content-Disposition')).toContain(order.orderId);
    expect(intruder.status).toBe(404);
  });
});
