import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/api/getMeLive', () => ({
  fulfillGetMeLiveOrder: vi.fn(async () => ({ orderId: 'gml_1', status: 'configuring', ownerId: 'o', sourceSprintOrderId: 's' })),
  recordGetMeLiveExperimentPayment: vi.fn(async () => true)
}));

import { handleStripeWebhook } from '../src/api/webhook';
import { handleCheckout } from '../src/api/checkout';
import { fulfillGetMeLiveOrder, recordGetMeLiveExperimentPayment } from '../src/api/getMeLive';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';

const PLATFORM_SECRET = 'whsec_platform';
const CONNECT_SECRET = 'whsec_connect';
const EMAIL = 'founder@example.com';
const ORDER_ID = 'gtt_boundary_order';

class MemKV {
  store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) ?? null; }
  async put(key: string, value: string) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return Array.from(mac, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function deliver(env: Record<string, unknown>, event: unknown, secret: string): Promise<Response> {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  return handleStripeWebhook(new Request('https://api.example.test/api/webhook/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': `t=${t},v1=${await hmacHex(secret, `${t}.${body}`)}` }
  }), env as never);
}

function verdict() {
  return {
    resultId: 'v1', generatedAt: '2026-10-01T00:00:00.000Z',
    idea: { ideaName: 'X', description: 'd', targetUser: 'u', painfulProblem: 'p', currentAlternative: 'a', motivation: 'm' },
    deterministicScores: {
      ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3,
      litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'subscription', businessDnaTrap: 't',
      businessDnaWinStrategy: 'w', finalVerdict: 'test_first', verdictHeadline: 'h', verdictExplanation: 'e',
      recommendedNextTest: 'n', doNotBuildUntil: 'd', oneSentenceAdvice: 'o'
    },
    usedAI: false, cacheHit: false, answers: {}
  };
}

function sprintMetadata() {
  return {
    paid_test_order_id: ORDER_ID, owner_id: EMAIL,
    offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId, offer_version: GHOSTTOWN_30_DAY_PLAN_V1.version,
    offer_amount_cents: String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents), offer_currency: GHOSTTOWN_30_DAY_PLAN_V1.currency,
    plan_version: '1.0', stripe_price_id: 'price_platform', fulfillment_type: 'execution_plan_30day_v1'
  };
}

function checkoutEvent(id: string, session: Record<string, unknown>, account?: string) {
  return {
    id, type: 'checkout.session.completed', ...(account ? { account } : {}),
    data: { object: { livemode: true, mode: 'payment', payment_status: 'paid', ...session } }
  };
}

let kv: MemKV;
let env: Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  kv = new MemKV();
  kv.store.set(`user_result_${EMAIL}_v1`, JSON.stringify(verdict()));
  kv.store.set(`paid_test_order_${ORDER_ID}`, JSON.stringify({
    orderId: ORDER_ID, email: EMAIL, verdictId: 'v1', status: 'checkout_created', artifactType: 'execution_plan_30day_v1',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId, stripePriceId: 'price_platform', stripeMode: 'live',
    stripeCheckoutSessionId: 'cs_platform', intake: {}, createdAt: '2026-10-01', updatedAt: '2026-10-01'
  }));
  env = { KV: kv, JWT_SECRET: 'jwt_secret', STRIPE_WEBHOOK_SECRET: PLATFORM_SECRET, STRIPE_CONNECT_WEBHOOK_SECRET: CONNECT_SECRET };
});

function storedOrder() {
  return JSON.parse(kv.store.get(`paid_test_order_${ORDER_ID}`)!);
}

describe('Stripe connected-account webhook boundary', () => {
  it('refuses to unlock a paid Sprint from a Connect-signed self-paid session', async () => {
    const response = await deliver(env, checkoutEvent('evt_forged_1', { id: 'cs_self_paid', amount_total: 50, metadata: sprintMetadata() }, 'acct_customer'), CONNECT_SECRET);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, ignored: true });
    const order = storedOrder();
    expect(order.status).toBe('checkout_created');
    expect(order.paidAt).toBeUndefined();
    expect(order.stripeCheckoutSessionId).toBe('cs_platform');
  });

  it('refuses platform fulfillment for any event carrying a connected account, whatever the signature', async () => {
    const response = await deliver(env, checkoutEvent('evt_forged_2', { id: 'cs_self_paid', metadata: sprintMetadata() }, 'acct_customer'), PLATFORM_SECRET);
    expect(await response.json()).toMatchObject({ ignored: true });
    expect(storedOrder().paidAt).toBeUndefined();
  });

  it('refuses Get Me Live fulfillment from a connected account', async () => {
    await deliver(env, checkoutEvent('evt_forged_3', {
      id: 'cs_self_paid',
      metadata: { fulfillment_type: 'get_me_live_v1', get_me_live_order_id: 'gml_1', offer_id: 'x', offer_version: '1', owner_id: EMAIL }
    }, 'acct_customer'), CONNECT_SECRET);
    expect(fulfillGetMeLiveOrder).not.toHaveBeenCalled();
  });

  it('refuses assessment credits from a connected account', async () => {
    kv.store.set(`user_${EMAIL}`, JSON.stringify({ email: EMAIL, testsPurchased: 0 }));
    await deliver(env, checkoutEvent('evt_forged_4', { id: 'cs_self_paid', customer_email: EMAIL, metadata: { purchase_type: 'assessment_pack', test_credits: '1000' } }, 'acct_customer'), CONNECT_SECRET);
    expect(JSON.parse(kv.store.get(`user_${EMAIL}`)!).testsPurchased).toBe(0);
  });

  it('still records a real customer-site payment from the connected account', async () => {
    const response = await deliver(env, checkoutEvent('evt_experiment', {
      id: 'cs_customer_sale', amount_total: 4900,
      metadata: { get_me_live_experiment_order_id: 'gml_1', source_sprint_order_id: 'sprint_1', evidence_event_type: 'payment' }
    }, 'acct_customer'), CONNECT_SECRET);
    expect(await response.json()).toMatchObject({ received: true, experimentPayment: true });
    expect(recordGetMeLiveExperimentPayment).toHaveBeenCalledWith(expect.anything(), 'evt_experiment', expect.anything(), 'acct_customer');
  });

  it('still fulfills the genuine platform Sprint purchase', async () => {
    const response = await deliver(env, checkoutEvent('evt_platform', { id: 'cs_platform', amount_total: 9700, metadata: sprintMetadata() }), PLATFORM_SECRET);
    expect(await response.json()).toMatchObject({ received: true, paidTest: 'awaiting_seeds' });
    expect(storedOrder().paidAt).toBeTruthy();
  });

  it('still fulfills the genuine platform Get Me Live purchase', async () => {
    await deliver(env, checkoutEvent('evt_platform_gml', {
      id: 'cs_gml', metadata: { fulfillment_type: 'get_me_live_v1', get_me_live_order_id: 'gml_1' }
    }), PLATFORM_SECRET);
    expect(fulfillGetMeLiveOrder).toHaveBeenCalledTimes(1);
  });
});

describe('Legacy assessment-pack credits', () => {
  beforeEach(() => kv.store.set(`user_${EMAIL}`, JSON.stringify({ email: EMAIL, testsPurchased: 0 })));
  const credits = () => JSON.parse(kv.store.get(`user_${EMAIL}`)!).testsPurchased;

  it('does not credit an unpaid (delayed payment) completion, then credits once on success', async () => {
    const session = { id: 'cs_pack', customer_email: EMAIL, metadata: { purchase_type: 'assessment_pack', test_credits: '10' } };
    await deliver(env, checkoutEvent('evt_pack_completed', { ...session, payment_status: 'unpaid' }), PLATFORM_SECRET);
    expect(credits()).toBe(0);
    await deliver(env, { ...checkoutEvent('evt_pack_async', session), type: 'checkout.session.async_payment_succeeded' }, PLATFORM_SECRET);
    expect(credits()).toBe(10);
  });

  it('acknowledges a redelivered event without crediting twice', async () => {
    const event = checkoutEvent('evt_pack_dup', { id: 'cs_pack', customer_email: EMAIL, metadata: { purchase_type: 'assessment_pack', test_credits: '10' } });
    await deliver(env, event, PLATFORM_SECRET);
    const second = await deliver(env, event, PLATFORM_SECRET);
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect(credits()).toBe(10);
  });
});

describe('Legacy assessment-pack checkout', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function token(authVersion: number) {
    const b64 = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64(JSON.stringify({ email: EMAIL, authVersion, iat: 1, exp: Math.floor(Date.now() / 1000) + 3600 }));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('jwt_secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`)));
    let binary = '';
    for (const byte of sig) binary += String.fromCharCode(byte);
    return `${header}.${payload}.${b64(binary)}`;
  }

  function checkoutEnv() {
    return { ...env, FRONTEND_URL: 'https://ghosttowntest.com/', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_ID: 'price_pack' };
  }

  it('returns the customer to the frontend, not the API host', async () => {
    kv.store.set(`user_${EMAIL}`, JSON.stringify({ email: EMAIL, authVersion: 1 }));
    let sent = '';
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response(JSON.stringify({ id: 'cs_pack', url: 'https://checkout.stripe.com/x' }), { status: 200 });
    }));
    const response = await handleCheckout(new Request('https://api.ghosttowntest.com/api/checkout', {
      method: 'POST', body: JSON.stringify({ token: await token(1) })
    }), checkoutEnv() as never);
    expect(response.status).toBe(200);
    const fields = new URLSearchParams(sent);
    expect(fields.get('success_url')).toBe('https://ghosttowntest.com/?purchase=assessments_success');
    expect(fields.get('cancel_url')).toBe('https://ghosttowntest.com/?purchase=assessments_cancelled');
  });

  it('rejects a token whose sessions were revoked', async () => {
    kv.store.set(`user_${EMAIL}`, JSON.stringify({ email: EMAIL, authVersion: 2 }));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const response = await handleCheckout(new Request('https://api.ghosttowntest.com/api/checkout', {
      method: 'POST', body: JSON.stringify({ token: await token(1) })
    }), checkoutEnv() as never);
    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
