import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import type { PaidTestOrder } from "../../src/types/paidTest";
import { handleSignup } from "../../src/api/auth";
import { handleFirst30Checkout, handlePaidTestCheckout } from "../../src/api/paidTestCheckout";
import { handleStripeWebhook } from "../../src/api/webhook";
import { handleFirst30Refund } from "../../src/api/first30Purchase";
import { handleGetMeLiveCheckout } from "../../src/api/getMeLive";
import { loadGetMeLiveBySprint, markGetMeLiveBuildStarted } from "../../src/api/getMeLiveStore";

// First 30 on real local KV and D1: one payment unlocks the 30-day plan and the
// included website; the refund rule holds against the website build start.

function runtimeEnv(extra: Partial<Env> = {}): Env {
  const base = env as unknown as Env;
  return {
    KV: base.KV,
    DB: base.DB,
    JWT_SECRET: base.JWT_SECRET,
    STRIPE_WEBHOOK_SECRET: base.STRIPE_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: "sk_test_runtime_first30",
    FRONTEND_URL: "https://app.runtime.test",
    DEPLOYMENT_ENV: "development",
    ...extra,
  } as Env;
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function signup(runtime: Env, email: string): Promise<string> {
  const response = await handleSignup(new Request("https://runtime.test/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "runtime-password" }),
  }), runtime);
  return ((await response.json()) as { token: string }).token;
}

async function saveVerdict(email: string, verdictId: string): Promise<void> {
  const verdict = {
    resultId: verdictId,
    generatedAt: "2026-10-20T12:00:00.000Z",
    idea: { ideaName: "Family Game Night", description: "Curated family game nights.", targetUser: "Families with children", painfulProblem: "Choosing games is difficult.", currentAlternative: "Buying random games", motivation: "Firsthand experience" },
    deterministicScores: { ghostTownScore: 3, ghostTownRisk: "medium", leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: "unclear", highWallsScore: 2, highWallsBand: "weak", businessDnaType: "service", businessDnaTrap: "Scope creep", businessDnaWinStrategy: "Narrow offer", finalVerdict: "test_first", verdictHeadline: "Test first", verdictExplanation: "Validate it", recommendedNextTest: "Interview buyers", doNotBuildUntil: "A buyer commits", oneSentenceAdvice: "Talk to buyers" },
    usedAI: false,
    cacheHit: false,
    answers: {},
  };
  await env.KV.put(`user_result_${email}_${verdictId}`, JSON.stringify(verdict));
}

function intake(verdictId: string) {
  return {
    verdictId,
    targetBuyer: "Parents of kids aged 5 to 10",
    problem: "Game nights fall apart",
    currentWorkaround: "Buying random games",
    founderLanguage: "es",
    buyerLanguage: "en",
  };
}

function checkoutRequest(token: string, body: unknown): Request {
  return new Request("https://runtime.test/api/first30/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

async function signedEvent(type: string, object: Record<string, unknown>, id = `evt_${crypto.randomUUID()}`): Promise<Request> {
  const body = JSON.stringify({ id, type, data: { object } });
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)));
  const signature = Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
  return new Request("https://runtime.test/api/webhook/stripe", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
    body,
  });
}

/** Creates a First 30 order through checkout, with the payment provider stubbed. */
async function buyFirst30(runtime: Env, email: string): Promise<{ order: PaidTestOrder; sessionFields: URLSearchParams; token: string }> {
  const token = await signup(runtime, email);
  const verdictId = `verdict_${crypto.randomUUID()}`;
  await saveVerdict(email, verdictId);
  let sessionFields = new URLSearchParams();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    sessionFields = new URLSearchParams(String(init?.body ?? ""));
    return new Response(JSON.stringify({ id: `cs_${crypto.randomUUID()}`, url: "https://checkout.runtime.test/session" }), { status: 200 });
  });
  const response = await handleFirst30Checkout(checkoutRequest(token, intake(verdictId)), runtime);
  expect(response.status).toBe(200);
  const { orderId } = (await response.json()) as { orderId: string };
  vi.restoreAllMocks();
  const order = JSON.parse(String(await env.KV.get(`paid_test_order_${orderId}`))) as PaidTestOrder;
  return { order, sessionFields, token };
}

function paidSession(order: PaidTestOrder, fields: URLSearchParams, paymentIntent = `pi_${crypto.randomUUID()}`) {
  const metadata: Record<string, string> = {};
  for (const [key, value] of fields) {
    const match = key.match(/^metadata\[(.+)\]$/);
    if (match) metadata[match[1]] = value;
  }
  return {
    id: order.stripeCheckoutSessionId,
    mode: "payment",
    livemode: false,
    payment_status: "paid",
    payment_intent: paymentIntent,
    customer_email: order.email,
    metadata,
  };
}

describe("First 30 checkout", () => {
  it("stays closed until FIRST30_CHECKOUT_ENABLED is true, and needs its own price", async () => {
    const closed = await handleFirst30Checkout(checkoutRequest("x", {}), runtimeEnv());
    expect(closed.status).toBe(410);
    expect(await closed.json()).toMatchObject({ code: "FIRST30_CHECKOUT_CLOSED" });

    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true" });
    const email = "first30-noprice@runtime.test";
    const token = await signup(runtime, email);
    await saveVerdict(email, "verdict_noprice");
    const noPrice = await handleFirst30Checkout(checkoutRequest(token, intake("verdict_noprice")), runtime);
    expect(noPrice.status).toBe(503);

    // The $97 Sprint keeps its own switch.
    const sprint = await handlePaidTestCheckout(checkoutRequest(token, intake("verdict_noprice")), runtime);
    expect(sprint.status).toBe(410);
  });

  it("creates a $297 First 30 order with both languages and its own fulfillment type", async () => {
    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true", STRIPE_FIRST_30_PRICE_ID: "price_first30_runtime" });
    const { order, sessionFields } = await buyFirst30(runtime, "first30-buyer@runtime.test");
    expect(order.orderId.startsWith("gtf_")).toBe(true);
    expect(order).toMatchObject({ offerId: "ghosttown_first_30_v1", status: "checkout_created", stripePriceId: "price_first30_runtime" });
    expect(order.intake).toMatchObject({ founderLanguage: "es", buyerLanguage: "en" });
    expect(sessionFields.get("metadata[fulfillment_type]")).toBe("first30_v1");
    expect(sessionFields.get("metadata[offer_amount_cents]")).toBe("29700");
    expect(sessionFields.get("line_items[0][price]")).toBe("price_first30_runtime");
    expect(sessionFields.get("success_url")).toContain("&offer=first30");
  });
});

describe("First 30 payment", () => {
  it("unlocks the plan and grants exactly one paid website, even when Stripe replays the event", async () => {
    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true", STRIPE_FIRST_30_PRICE_ID: "price_first30_runtime" });
    const { order, sessionFields } = await buyFirst30(runtime, "first30-paid@runtime.test");
    const session = paidSession(order, sessionFields);

    const first = await handleStripeWebhook(await signedEvent("checkout.session.completed", session), runtime);
    expect(first.status).toBe(200);
    const body = (await first.json()) as { paidTest: string; websiteOrderId: string };
    expect(body.paidTest).toBe("awaiting_seeds");

    const website = await loadGetMeLiveBySprint(runtime, order.email, order.orderId);
    expect(website).toMatchObject({ orderId: body.websiteOrderId, status: "paid", entitlementSource: "first30" });
    expect(website?.paidAt).toBeTruthy();
    expect(website?.buildStartedAt).toBeUndefined();

    // A second delivery with a new event id must not create a second website or move the order back.
    const stored = JSON.parse(String(await env.KV.get(`paid_test_order_${order.orderId}`))) as PaidTestOrder;
    await env.KV.put(`paid_test_order_${order.orderId}`, JSON.stringify({ ...stored, status: "researching" }));
    const replay = await handleStripeWebhook(await signedEvent("checkout.session.completed", session), runtime);
    expect(replay.status).toBe(200);
    const after = JSON.parse(String(await env.KV.get(`paid_test_order_${order.orderId}`))) as PaidTestOrder;
    expect(after.status).toBe("researching");
    expect(after.websiteOrderId).toBe(body.websiteOrderId);
    const rows = await env.DB.prepare("SELECT COUNT(*) AS count FROM get_me_live_orders WHERE source_sprint_order_id = ?").bind(order.orderId).first<{ count: number }>();
    expect(rows?.count).toBe(1);
  });

  it("refuses a paid event whose amount does not match First 30", async () => {
    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true", STRIPE_FIRST_30_PRICE_ID: "price_first30_runtime" });
    const { order, sessionFields } = await buyFirst30(runtime, "first30-tamper@runtime.test");
    const session = paidSession(order, sessionFields);
    session.metadata.offer_amount_cents = "9700";
    const response = await handleStripeWebhook(await signedEvent("checkout.session.completed", session), runtime);
    expect(response.status).toBe(500);
    expect(await loadGetMeLiveBySprint(runtime, order.email, order.orderId)).toBeNull();
  });

  it("never sells the included website a second time", async () => {
    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true", STRIPE_FIRST_30_PRICE_ID: "price_first30_runtime", STRIPE_GET_ME_LIVE_PRICE_ID: "price_gml_runtime" });
    const { order, sessionFields, token } = await buyFirst30(runtime, "first30-nogml@runtime.test");
    await handleStripeWebhook(await signedEvent("checkout.session.completed", paidSession(order, sessionFields)), runtime);
    const response = await handleGetMeLiveCheckout(new Request("https://runtime.test/api/get-me-live/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sourceSprintOrderId: order.orderId }),
    }), runtime);
    expect(await response.json()).toMatchObject({ alreadyPurchased: true, includedInFirst30: true });
  });
});

describe("First 30 refund rule", () => {
  async function paidOrder(email: string) {
    const owner = `owner-${email}`;
    const runtime = runtimeEnv({ FIRST30_CHECKOUT_ENABLED: "true", STRIPE_FIRST_30_PRICE_ID: "price_first30_runtime", INTERNAL_RESEARCH_OWNER_EMAILS: owner });
    const { order, sessionFields } = await buyFirst30(runtime, email);
    const paymentIntent = `pi_${crypto.randomUUID()}`;
    await handleStripeWebhook(await signedEvent("checkout.session.completed", paidSession(order, sessionFields, paymentIntent)), runtime);
    const ownerToken = await signup(runtime, owner);
    return { runtime, order, paymentIntent, ownerToken };
  }

  function refundRequest(token: string, orderId: string): Request {
    return new Request("https://runtime.test/api/internal/first30/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    });
  }

  it("refunds in full before the website build starts, then the website can no longer be built", async () => {
    const { runtime, order, ownerToken } = await paidOrder("first30-refund@runtime.test");
    let refundBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      refundBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "re_runtime" }), { status: 200 });
    });
    const response = await handleFirst30Refund(refundRequest(ownerToken, order.orderId), runtime);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ refunded: true, refundId: "re_runtime" });
    expect(refundBody).toContain("payment_intent=");

    const refunded = JSON.parse(String(await env.KV.get(`paid_test_order_${order.orderId}`))) as PaidTestOrder;
    expect(refunded.status).toBe("refunded");
    const website = await loadGetMeLiveBySprint(runtime, order.email, order.orderId);
    expect(website?.status).toBe("refunded");
    expect(await markGetMeLiveBuildStarted(runtime, website!.orderId, new Date().toISOString())).toBe(false);
  });

  it("refuses the refund once the website build has started", async () => {
    const { runtime, order, ownerToken } = await paidOrder("first30-built@runtime.test");
    const website = await loadGetMeLiveBySprint(runtime, order.email, order.orderId);
    expect(await markGetMeLiveBuildStarted(runtime, website!.orderId, new Date().toISOString())).toBe(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleFirst30Refund(refundRequest(ownerToken, order.orderId), runtime);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "FIRST30_REFUND_WINDOW_CLOSED" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the website when the payment provider refuses the refund", async () => {
    const { runtime, order, ownerToken } = await paidOrder("first30-stripe-no@runtime.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    const response = await handleFirst30Refund(refundRequest(ownerToken, order.orderId), runtime);
    expect(response.status).toBe(502);
    const website = await loadGetMeLiveBySprint(runtime, order.email, order.orderId);
    expect(website?.status).toBe("paid");
    const stored = JSON.parse(String(await env.KV.get(`paid_test_order_${order.orderId}`))) as PaidTestOrder;
    expect(stored.status).not.toBe("refunded");
  });

  it("only lets owners issue refunds", async () => {
    const { runtime, order } = await paidOrder("first30-not-owner@runtime.test");
    const stranger = await signup(runtime, "stranger@runtime.test");
    expect((await handleFirst30Refund(refundRequest(stranger, order.orderId), runtime)).status).toBe(403);
  });

  it("closes the order and website when Stripe reports a refund", async () => {
    const { runtime, order, paymentIntent } = await paidOrder("first30-dashboard-refund@runtime.test");
    const response = await handleStripeWebhook(await signedEvent("charge.refunded", { id: "ch_runtime", payment_intent: paymentIntent }), runtime);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ refunded: order.orderId });
    const website = await loadGetMeLiveBySprint(runtime, order.email, order.orderId);
    expect(website?.status).toBe("refunded");
  });
});
