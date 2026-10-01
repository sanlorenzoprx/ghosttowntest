import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env as runtimeEnv } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handleSignup } from "../../src/api/auth";
import {
  handleGetMeLiveConfig,
  handleGetMeLiveHealth,
  handleGetMeLiveOrder,
  handleGetMeLiveReleaseReceipt,
  handleGetMeLiveReleaseReceiptBackfill,
  handleGetMeLiveReleases,
  handleGetMeLivePublish,
  handleGetMeLivePublishStatus,
  handleGetMeLivePublishVerify
} from "../../src/api/getMeLive";
import {
  CLAIM_EXPIRED_MESSAGE,
  DEPLOY_EXPIRED_MESSAGE,
  loadGetMeLiveOrder,
  loadPublishAttempt,
  saveGetMeLivePreview,
  settlePublishSuccess,
  updateGetMeLiveOrder
} from "../../src/api/getMeLiveStore";
import type { GetMeLiveConfiguration, GetMeLiveOrder } from "../../src/types/getMeLive";
import type { CustomWebsiteSpec, WebsiteSectionSpec, WebsiteCreationResult } from "../../src/types/customWebsite";

// Slice 1b (plan §2.4–§2.6): one unverified publish attempt per order, enforced by
// real D1; Cloudflare and the customer site are stubbed at the fetch boundary.

const PAGES_HOST = "proof-path-4xz.pages.dev";
const PAGES_URL = `https://${PAGES_HOST}`;
const OWNER = "founder@publish.runtime.test";
const MARKER = /<meta name="ghosttown-release-id" content="(rel_[a-z0-9]+)">/;

const section = (component: WebsiteSectionSpec["component"], heading: string, body: string): WebsiteSectionSpec => ({
  sectionId: component === "lead_capture" ? "contact" : component,
  component, eyebrow: component, heading, body, items: [],
  primaryCtaLabel: component === "hero" || component === "lead_capture" ? "Start my pilot" : "",
  secondaryCtaLabel: ""
});

const spec: CustomWebsiteSpec = {
  schemaVersion: "custom-website-spec-v1",
  templateId: "ghosttown_conversion",
  businessName: "Proof Path",
  metadataTitle: "Proof Path",
  metadataDescription: "A customer-ready pilot.",
  stylePreset: "clean_saas",
  sections: [
    section("hero", "Know whether buyers care.", "A focused pilot."),
    section("problem", "The problem", "Teams keep guessing."),
    section("solution", "The pilot", "A narrow offer with a clear next step."),
    section("pricing", "Pilot price: $49", "One fixed test price."),
    section("proof", "Proof boundary", "No outcome is claimed before evidence exists."),
    section("faq", "Questions", "What buyers need to know."),
    section("lead_capture", "Interested?", "Tell us where to follow up."),
    section("footer", "Proof Path", "Customer test.")
  ]
};

const configuration: GetMeLiveConfiguration = {
  schemaVersion: "get-me-live-config-v1",
  brand: { businessName: "Proof Path", stylePreset: "clean_saas" },
  offer: { intent: "interest", headline: "Know whether buyers care.", offer: "Pilot", price: "$49", ctaLabel: "I am interested" },
  contact: { contactEmail: OWNER, leadDestinationEmail: OWNER, businessEmailLocalPart: "hello" },
  domain: { cloudflareAccountId: "acct_runtime" },
  payments: { enabled: false }
};

/** Fake Cloudflare + customer site. `served` is the release the stable Pages URL serves. */
const cf = {
  served: "",
  autoServe: true,
  deployments: 0,
  uploadedRelease: "",
  calls: [] as string[],
  projects: new Set<string>(),
  onDeploy: null as null | (() => Promise<void>)
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  cf.calls.push(`${method} ${url.host}${url.pathname}`);
  if (url.host === "api.cloudflare.com") {
    const path = url.pathname;
    if (/\/pages\/projects\/[^/]+$/.test(path) && method === "GET") {
      const name = decodeURIComponent(path.split("/").pop() || "");
      if (!cf.projects.has(name)) return json({ success: false, errors: [{ message: "not found" }] }, 404);
      return json({ success: true, result: { name, subdomain: PAGES_HOST } });
    }
    if (path.endsWith("/pages/projects") && method === "POST") {
      const { name } = JSON.parse(String(init?.body)) as { name: string };
      cf.projects.add(name);
      return json({ success: true, result: { name, subdomain: PAGES_HOST } });
    }
    if (path.endsWith("/upload-token")) return json({ success: true, result: { jwt: "jwt_runtime" } });
    if (path.endsWith("/pages/assets/check-missing")) return json({ success: true, result: JSON.parse(String(init?.body)).hashes });
    if (path.endsWith("/pages/assets/upload")) {
      for (const file of JSON.parse(String(init?.body)) as Array<{ value: string }>) {
        const match = atob(file.value).match(MARKER);
        if (match) cf.uploadedRelease = match[1];
      }
      return json({ success: true, result: true });
    }
    if (path.endsWith("/pages/assets/upsert-hashes")) return json({ success: true, result: true });
    if (path.endsWith("/deployments") && method === "POST") {
      cf.deployments += 1;
      const id = `dep_${cf.deployments}`;
      if (cf.onDeploy) await cf.onDeploy();
      if (cf.autoServe) cf.served = cf.uploadedRelease;
      return json({ success: true, result: { id, url: `https://hash${cf.deployments}.${PAGES_HOST}` } });
    }
    return json({ success: false, errors: [{ message: `unexpected ${method} ${path}` }] }, 500);
  }
  if (url.host === PAGES_HOST) {
    return new Response(`<!doctype html><html><head><meta name="ghosttown-release-id" content="${cf.served}"><title>x</title></head><body><a href="/api/get-me-live/sites/x/leads"></a></body></html>`, {
      status: 200, headers: { "Content-Type": "text/html" }
    });
  }
  throw new Error(`unexpected fetch ${method} ${url}`);
}

const env = { ...(runtimeEnv as unknown as Env), BROWSER: { quickAction: async () => ({ ok: true }) } } as unknown as Env;
let token = "";
let orderCounter = 0;

async function signup(): Promise<string> {
  const existing = await env.KV.get(`user_${OWNER}`);
  if (existing) await env.KV.delete(`user_${OWNER}`);
  const response = await handleSignup(new Request("https://api.test/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: OWNER, password: "runtime-password" })
  }), env);
  return (await response.json() as { token: string }).token;
}

async function seedOrder(): Promise<string> {
  orderCounter += 1;
  const orderId = `gml_runtime_${Date.now()}_${orderCounter}`;
  const now = new Date().toISOString();
  const sprintId = `gtt_runtime_${orderId}`;
  await env.DB.prepare(`
    INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at)
    VALUES (?, ?, 'verdict', 'ghosttown-launch-blueprint-v2.1', 'ready', ?, '{}', 'private/x.pdf', ?, ?)
  `).bind(sprintId, OWNER, JSON.stringify({
    blueprintId: "bp_runtime",
    offer: { offerName: "Pilot", desiredOutcome: "Clear proof", targetCustomer: "Founders", painfulProblem: "Guessing", initialTestPrice: "$49" },
    landingPageCopy: { headline: "Proof first" },
    launchSite: { site: { businessName: "Proof Path", contactEmail: OWNER }, offer: { headline: "Proof first" } }
  }), now, now).run();
  await env.DB.prepare(`
    INSERT INTO get_me_live_orders (order_id, owner_id, source_sprint_order_id, source_blueprint_id, offer_id, offer_version, stripe_price_id,
      status, configuration_json, provider_state_json, created_at, updated_at, paid_at)
    VALUES (?, ?, ?, 'bp_runtime', 'ghosttown_get_me_live_v1', '1.0', 'price_runtime', 'preview_ready', ?, ?, ?, ?, ?)
  `).bind(orderId, OWNER, sprintId, JSON.stringify(configuration),
    JSON.stringify({ cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false, domainReady: false }), now, now, now).run();
  await env.KV.put(`get_me_live_cf_token_${orderId}`, JSON.stringify({ accessToken: "cf_runtime", expiresAt: new Date(Date.now() + 3600_000).toISOString() }));
  await saveGetMeLivePreview(env, orderId, { spec, assets: [], build: { buildId: "website_spec_hash_1" } } as unknown as WebsiteCreationResult, "<html>preview</html>");
  return orderId;
}

const owner = (orderId: string, path: string, init: RequestInit = {}) => new Request(`https://api.test/api/get-me-live/orders/${orderId}${path}`, {
  ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }
});
const publish = (orderId: string) => handleGetMeLivePublish(owner(orderId, "/publish", { method: "POST" }), env, orderId, { verifyBackoffMs: [] });
const verify = (orderId: string) => handleGetMeLivePublishVerify(owner(orderId, "/publish/verify", { method: "POST" }), env, orderId);
const body = async (response: Response) => await response.json() as Record<string, any>;

async function releases(orderId: string) {
  return (await env.DB.prepare("SELECT release_id, kind, build_id, deployment_id, deployment_url, pages_url, receipt_json FROM get_me_live_releases WHERE get_me_live_order_id = ? ORDER BY created_at, rowid").bind(orderId).all<Record<string, string>>()).results;
}
async function attempts(orderId: string) {
  return (await env.DB.prepare("SELECT * FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ?").bind(orderId).all<Record<string, string>>()).results;
}
async function insertAttempt(orderId: string, input: { attemptId: string; kind: string; phase: "claimed" | "deployed"; expiresAt: string }) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO get_me_live_publish_attempts (get_me_live_order_id, attempt_id, kind, build_id, phase, deployment_id, deployment_url, claimed_at, deployed_at, expires_at)
    VALUES (?, ?, ?, 'website_spec_hash_1', ?, ?, ?, ?, ?, ?)
  `).bind(orderId, input.attemptId, input.kind, input.phase,
    input.phase === "deployed" ? "dep_seed" : null, input.phase === "deployed" ? `https://seed.${PAGES_HOST}` : null,
    now, input.phase === "deployed" ? now : null, input.expiresAt).run();
}
const past = () => new Date(Date.now() - 1000).toISOString();
const future = () => new Date(Date.now() + 60_000).toISOString();

beforeEach(async () => {
  Object.assign(cf, { served: "", autoServe: true, deployments: 0, uploadedRelease: "", calls: [], projects: new Set<string>(), onDeploy: null });
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  token = await signup();
});
afterEach(() => vi.unstubAllGlobals());

describe("Get Me Live publish attempts on real D1 (Slice 1b)", () => {
  it("launches: verifies the exact release marker, writes one launch release, and goes live", async () => {
    const orderId = await seedOrder();
    const response = await publish(orderId);
    const result = await body(response);
    expect(response.status).toBe(200);
    expect(result).toMatchObject({ status: "live", verified: true, pagesUrl: PAGES_URL, publicUrl: PAGES_URL });
    expect(result.releaseId).toMatch(/^rel_[a-z0-9]{20}$/);
    const rows = await releases(orderId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ release_id: result.releaseId, kind: "launch", build_id: "website_spec_hash_1", pages_url: PAGES_URL, deployment_url: `https://hash1.${PAGES_HOST}` });
    const receipt = JSON.parse(rows[0].receipt_json);
    expect(receipt).toMatchObject({ schemaVersion: "ghosttown-get-me-live-release-receipt-v2", kind: "launch", releaseId: result.releaseId, pagesUrl: PAGES_URL, liveUrl: PAGES_URL, backfilled: false });
    expect(receipt.checks).toMatchObject({ releaseMarkerServed: true, customerPageHttpStatus: 200 });
    const order = await loadGetMeLiveOrder(env, orderId);
    expect(order).toMatchObject({ status: "live", publicUrl: PAGES_URL });
    expect(order?.deploymentReceipt).toMatchObject({ releaseId: result.releaseId, publicUrl: PAGES_URL, deploymentUrl: `https://hash1.${PAGES_HOST}` });
    expect(await attempts(orderId)).toHaveLength(0);
  });

  it("#28 two concurrent POST /publish produce one deployment and one releaseId; the second gets 202 duplicate", async () => {
    const orderId = await seedOrder();
    let releaseGate!: () => void;
    const gate = new Promise<void>(resolve => { releaseGate = resolve; });
    cf.onDeploy = () => gate;
    const first = publish(orderId);
    const second = publish(orderId);
    const early = await Promise.race([first, second]);
    const earlyBody = await body(early.clone());
    expect(early.status).toBe(202);
    expect(earlyBody).toMatchObject({ duplicate: true, verified: false, attemptKind: "launch" });
    releaseGate();
    const [a, b] = await Promise.all([first, second]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 202]);
    const winner = await body(a.status === 200 ? a : b);
    expect(cf.deployments).toBe(1);
    expect(earlyBody.releaseId).toBe(winner.releaseId);
    expect((await releases(orderId)).map(row => row.release_id)).toEqual([winner.releaseId]);
  });

  it("#29 POST /publish while an attempt is claimed or deployed returns that attempt and does not deploy", async () => {
    for (const phase of ["claimed", "deployed"] as const) {
      const orderId = await seedOrder();
      await insertAttempt(orderId, { attemptId: `rel_existing${phase}`, kind: "launch", phase, expiresAt: future() });
      const response = await publish(orderId);
      expect(response.status).toBe(202);
      expect(await body(response)).toMatchObject({ duplicate: true, releaseId: `rel_existing${phase}`, attemptKind: "launch" });
      expect(cf.deployments).toBe(0);
      expect((await attempts(orderId)).map(row => row.attempt_id)).toEqual([`rel_existing${phase}`]);
    }
  });

  it("#30 an expired attempt is settled as failed and a new attempt can be claimed", async () => {
    const orderId = await seedOrder();
    await insertAttempt(orderId, { attemptId: "rel_expiredclaim", kind: "launch", phase: "claimed", expiresAt: past() });
    const response = await publish(orderId);
    const result = await body(response);
    expect(response.status).toBe(200);
    expect(result.releaseId).not.toBe("rel_expiredclaim");
    expect(cf.deployments).toBe(1);
    expect((await releases(orderId)).map(row => row.release_id)).toEqual([result.releaseId]);
    expect(await attempts(orderId)).toHaveLength(0);
  });

  it("#23 expiry: claimed after 5 min and deployed after 10 min; a launch fails, a republish stays live", async () => {
    const launchOrder = await seedOrder();
    await insertAttempt(launchOrder, { attemptId: "rel_staledeploy", kind: "launch", phase: "deployed", expiresAt: past() });
    const failed = await body(await verify(launchOrder));
    expect(failed).toMatchObject({ status: "failed", verified: false, pending: false, failure: DEPLOY_EXPIRED_MESSAGE });
    expect(await attempts(launchOrder)).toHaveLength(0);

    const liveOrder = await seedOrder();
    await publish(liveOrder);
    await insertAttempt(liveOrder, { attemptId: "rel_staleclaim", kind: "republish", phase: "claimed", expiresAt: past() });
    const kept = await body(await verify(liveOrder));
    expect(kept).toMatchObject({ status: "live", pending: false, failure: CLAIM_EXPIRED_MESSAGE });
    const order = await loadGetMeLiveOrder(env, liveOrder);
    expect(order?.status).toBe("live");
    expect(order?.hosting?.lastReleaseFailure).toMatchObject({ releaseId: "rel_staleclaim", message: CLAIM_EXPIRED_MESSAGE });

    // The TTLs themselves: a fresh claim expires 5 min out; recording the deploy moves it to 10 min.
    const ttlOrder = await seedOrder();
    cf.autoServe = false;
    let claimedTtl = 0;
    cf.onDeploy = async () => {
      const attempt = await loadPublishAttempt(env, ttlOrder);
      claimedTtl = Date.parse(attempt!.expiresAt) - Date.parse(attempt!.claimedAt);
    };
    await publish(ttlOrder);
    const deployed = await loadPublishAttempt(env, ttlOrder);
    expect(claimedTtl).toBe(5 * 60 * 1000);
    expect(deployed?.phase).toBe("deployed");
    expect(Date.parse(deployed!.expiresAt) - Date.parse(deployed!.deployedAt!)).toBe(10 * 60 * 1000);
  });

  it("#31 a worker that loses its claim writes nothing further", async () => {
    const orderId = await seedOrder();
    cf.onDeploy = async () => {
      // Another request took the attempt over while this deploy was in flight.
      await env.DB.prepare("UPDATE get_me_live_publish_attempts SET attempt_id = 'rel_takeover', claimed_at = ?, expires_at = ? WHERE get_me_live_order_id = ?")
        .bind(new Date().toISOString(), future(), orderId).run();
    };
    const response = await publish(orderId);
    expect(response.status).toBe(202);
    expect(await body(response)).toMatchObject({ verified: false, superseded: true, releaseId: "rel_takeover" });
    expect(await releases(orderId)).toHaveLength(0);
    expect((await attempts(orderId)).map(row => [row.attempt_id, row.phase])).toEqual([["rel_takeover", "claimed"]]);
    const order = await loadGetMeLiveOrder(env, orderId);
    expect(order?.deploymentReceipt).toBeUndefined();
    expect(order?.status).toBe("publishing");
  });

  it("#32 autosave and stale writes during publish keep publication state; publish keeps config saved meanwhile", async () => {
    const orderId = await seedOrder();
    cf.onDeploy = async () => {
      expect((await loadGetMeLiveOrder(env, orderId))?.status).toBe("publishing");
      const saved = await handleGetMeLiveConfig(owner(orderId, "/config", {
        method: "PUT", body: JSON.stringify({ ...configuration, offer: { ...configuration.offer, headline: "Saved during publish" } })
      }), env, orderId);
      expect(saved.status).toBe(200);
      expect((await loadGetMeLiveOrder(env, orderId))?.status).toBe("publishing");
    };
    const response = await publish(orderId);
    expect(response.status).toBe(200);
    const order = await loadGetMeLiveOrder(env, orderId);
    expect(order?.configuration?.offer.headline).toBe("Saved during publish");
    expect(order).toMatchObject({ status: "live", publicUrl: PAGES_URL });

    // A stale full-row write (e.g. a preview regeneration that loaded the order
    // before publish) cannot reset status or clear publication-owned columns.
    const stale: GetMeLiveOrder = { ...order!, status: "preview_ready", publicUrl: undefined, deploymentReceipt: undefined, publishedAt: undefined, hosting: undefined, failure: "stale" };
    await updateGetMeLiveOrder(env, stale);
    const after = await loadGetMeLiveOrder(env, orderId);
    expect(after).toMatchObject({ status: "live", publicUrl: PAGES_URL, publishedAt: order?.publishedAt });
    expect(after?.deploymentReceipt).toEqual(order?.deploymentReceipt);
    expect(after?.hosting).toEqual(order?.hosting);
    expect(after?.failure).toBeUndefined();

    // The same guard holds while a launch is still verifying.
    const verifying = await seedOrder();
    cf.onDeploy = null; cf.autoServe = false;
    await publish(verifying);
    const inFlight = await loadGetMeLiveOrder(env, verifying);
    expect(inFlight?.status).toBe("verifying");
    await updateGetMeLiveOrder(env, { ...inFlight!, status: "preview_ready" });
    expect((await loadGetMeLiveOrder(env, verifying))?.status).toBe("verifying");
  });

  it("#33 two concurrent POST /publish/verify produce one release row and consistent order state", async () => {
    const orderId = await seedOrder();
    cf.autoServe = false;
    const pending = await body(await publish(orderId));
    expect(pending).toMatchObject({ verified: false, status: "verifying" });
    expect(await body(await verify(orderId))).toMatchObject({ pending: true, verified: false, phase: "deployed" });
    cf.served = pending.releaseId;
    const [a, b] = await Promise.all([verify(orderId), verify(orderId)]);
    expect(await body(a)).toMatchObject({ verified: true, status: "live", releaseId: pending.releaseId });
    expect(await body(b)).toMatchObject({ verified: true, status: "live", releaseId: pending.releaseId });
    expect((await releases(orderId)).map(row => row.release_id)).toEqual([pending.releaseId]);
    expect((await loadGetMeLiveOrder(env, orderId))?.deploymentReceipt?.releaseId).toBe(pending.releaseId);

    // Settlement itself: only one of two racing settles reports that it settled.
    const second = await seedOrder();
    cf.autoServe = false;
    const secondPending = await body(await publish(second));
    const attempt = (await loadPublishAttempt(env, second))!;
    const input = {
      attempt,
      release: { pagesUrl: PAGES_URL, verifiedUrl: `${PAGES_URL}/?gt_verify=${attempt.attemptId}`, verifiedAt: new Date().toISOString(), receiptJson: "{}" },
      order: { deploymentReceiptJson: "{}", hostingJson: JSON.stringify((await loadGetMeLiveOrder(env, second))?.hosting), publicUrl: PAGES_URL }
    };
    const settled = await Promise.all([settlePublishSuccess(env, input), settlePublishSuccess(env, input)]);
    expect(settled.filter(Boolean)).toHaveLength(1);
    expect((await releases(second)).map(row => row.release_id)).toEqual([secondPending.releaseId]);
  });

  it("#6 #22 a republish (same buildId) is not verified until pagesUrl serves its new releaseId", async () => {
    const orderId = await seedOrder();
    const launch = await body(await publish(orderId));
    expect(launch.verified).toBe(true);
    const launchRow = (await releases(orderId))[0];

    cf.autoServe = false; // the old release keeps being served
    const republish = await body(await publish(orderId));
    expect(republish).toMatchObject({ status: "live", verified: false, pagesUrl: PAGES_URL });
    expect(republish.releaseId).not.toBe(launch.releaseId);
    const attempt = await loadPublishAttempt(env, orderId);
    expect(attempt).toMatchObject({ kind: "republish", buildId: "website_spec_hash_1", phase: "deployed" });
    expect(await body(await verify(orderId))).toMatchObject({ pending: true, verified: false, status: "live" });
    expect(await releases(orderId)).toHaveLength(1);

    cf.served = republish.releaseId;
    expect(await body(await verify(orderId))).toMatchObject({ verified: true, pending: false, releaseId: republish.releaseId, pagesUrl: PAGES_URL });
    const rows = await releases(orderId);
    expect(rows.map(row => [row.kind, row.release_id])).toEqual([["launch", launch.releaseId], ["republish", republish.releaseId]]);
    expect(rows[0]).toEqual(launchRow);
    expect(rows[1].build_id).toBe(rows[0].build_id);
    const order = await loadGetMeLiveOrder(env, orderId);
    expect(order).toMatchObject({ status: "live", publicUrl: PAGES_URL });
    expect(order?.deploymentReceipt?.releaseId).toBe(republish.releaseId);
  });

  it("#35 GET /orders/:id and GET /publish/status make no Cloudflare write calls and no publication writes", async () => {
    const orderId = await seedOrder();
    cf.autoServe = false;
    await publish(orderId);
    const snapshot = async () => JSON.stringify({
      order: await env.DB.prepare("SELECT * FROM get_me_live_orders WHERE order_id = ?").bind(orderId).first(),
      attempts: await attempts(orderId),
      releases: await releases(orderId)
    });
    const before = await snapshot();
    cf.calls = [];
    cf.served = (await loadPublishAttempt(env, orderId))!.attemptId; // even a now-verifiable attempt must not settle on a read
    const status = await handleGetMeLivePublishStatus(owner(orderId, "/publish/status"), env, orderId);
    expect(await body(status)).toMatchObject({ status: "verifying", pendingAttempt: { kind: "launch", phase: "deployed" }, pagesUrl: PAGES_URL });
    const read = await handleGetMeLiveOrder(owner(orderId, ""), env, orderId);
    expect(read.status).toBe(200);
    expect(cf.calls.filter(call => !call.startsWith("GET "))).toEqual([]);
    expect(cf.calls.filter(call => call.includes(PAGES_HOST))).toEqual([]);
    expect(await snapshot()).toBe(before);
  });
});

describe("Get Me Live release records, receipt and health on real D1 (Slice 2)", () => {
  const receiptText = async (orderId: string) => {
    const response = await handleGetMeLiveReleaseReceipt(owner(orderId, "/release-receipt"), env, orderId);
    return { status: response.status, text: await response.text() };
  };

  it("#11 the launch receipt is the stored row, byte-identical across reads and after a republish", async () => {
    const orderId = await seedOrder();
    const launch = await body(await publish(orderId));
    const first = await receiptText(orderId);
    expect(first.status).toBe(200);
    const receipt = JSON.parse(first.text).receipt;
    expect(receipt).toMatchObject({ schemaVersion: "ghosttown-get-me-live-release-receipt-v2", kind: "launch", releaseId: launch.releaseId, pagesUrl: PAGES_URL, backfilled: false });
    expect(receipt.checks).toMatchObject({ releaseMarkerServed: true, customerPageHttpStatus: 200 });
    expect((await receiptText(orderId)).text).toBe(first.text);

    const republish = await body(await publish(orderId));
    expect(republish.verified).toBe(true);
    expect((await receiptText(orderId)).text).toBe(first.text);

    const list = await body(await handleGetMeLiveReleases(owner(orderId, "/releases"), env, orderId));
    expect(list.releases.map((release: { kind: string; releaseId: string }) => [release.kind, release.releaseId]))
      .toEqual([["launch", launch.releaseId], ["republish", republish.releaseId]]);
  });

  it("#27 a legacy order needs backfill; the backfilled receipt says so and backfill is idempotent", async () => {
    const orderId = await seedOrder();
    // A site published before launch records existed: published columns + hosting, no release rows.
    const publishedAt = "2026-09-01T00:00:00.000Z";
    await env.DB.prepare(`
      UPDATE get_me_live_orders SET status = 'live', public_url = ?, published_at = ?, deployment_receipt_json = ?, hosting_json = ? WHERE order_id = ?
    `).bind(PAGES_URL, publishedAt,
      JSON.stringify({ deploymentId: "dep_legacy", buildId: "website_legacy", publicUrl: "https://9f8e7d6c.proof-path-4xz.pages.dev", publishedAt }),
      JSON.stringify({ schemaVersion: "get-me-live-hosting-v1", cloudflareAccountId: "acct_runtime", pagesProjectName: "proof-path", pagesSubdomain: PAGES_HOST, pagesUrl: PAGES_URL, source: "derived_from_legacy" }),
      orderId).run();
    cf.served = "";

    const missing = await handleGetMeLiveReleaseReceipt(owner(orderId, "/release-receipt"), env, orderId);
    expect(missing.status).toBe(404);
    expect(await body(missing)).toMatchObject({ needsBackfill: true });

    const backfill = () => handleGetMeLiveReleaseReceiptBackfill(owner(orderId, "/release-receipt/backfill", { method: "POST" }), env, orderId);
    const created = await backfill();
    expect(created.status).toBe(201);
    const createdText = await created.text();
    const receipt = JSON.parse(createdText).receipt;
    expect(receipt).toMatchObject({
      kind: "launch", releaseId: `rel_legacy_${orderId}`, backfilled: true, publishedAt,
      deploymentId: "dep_legacy", buildId: "website_legacy", pagesUrl: PAGES_URL
    });
    expect(receipt.checks).toMatchObject({ releaseMarkerServed: false, customerPageHttpStatus: 200 });

    const again = await backfill();
    expect(again.status).toBe(200);
    expect(await again.text()).toBe(createdText);
    expect((await receiptText(orderId)).text).toBe(createdText);
    const rows = await releases(orderId);
    expect(rows.map(row => row.release_id)).toEqual([`rel_legacy_${orderId}`]);
  });

  it("backfill is refused for an order that never went live", async () => {
    const orderId = await seedOrder();
    const response = await handleGetMeLiveReleaseReceiptBackfill(owner(orderId, "/release-receipt/backfill", { method: "POST" }), env, orderId);
    expect(response.status).toBe(409);
    expect(await releases(orderId)).toHaveLength(0);
  });

  it("#35 GET /release-receipt, /releases and /health make no Cloudflare write calls and no publication writes", async () => {
    const orderId = await seedOrder();
    await publish(orderId);
    const snapshot = async () => JSON.stringify({
      order: await env.DB.prepare("SELECT * FROM get_me_live_orders WHERE order_id = ?").bind(orderId).first(),
      attempts: await attempts(orderId),
      releases: await releases(orderId)
    });
    const before = await snapshot();
    cf.calls = [];
    expect((await handleGetMeLiveReleaseReceipt(owner(orderId, "/release-receipt"), env, orderId)).status).toBe(200);
    expect((await handleGetMeLiveReleases(owner(orderId, "/releases"), env, orderId)).status).toBe(200);
    const health = await body(await handleGetMeLiveHealth(owner(orderId, "/health"), env, orderId));
    expect(health).toMatchObject({ preferredUrl: PAGES_URL, pagesUrl: PAGES_URL, servingLatestRelease: true });
    expect(health.targets).toHaveLength(1);
    expect(cf.calls.filter(call => !call.startsWith("GET "))).toEqual([]);
    expect(cf.calls.filter(call => call.includes("api.cloudflare.com"))).toEqual([]);
    expect(await snapshot()).toBe(before);
  });
});

