import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env as runtimeEnv } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handleSignup } from "../../src/api/auth";
import {
  CUSTOM_DOMAIN_TIMEOUT_MESSAGE,
  handleGetMeLiveCustomDomainConnect,
  handleGetMeLiveCustomDomainDelete,
  handleGetMeLiveCustomDomainReconcile,
  handleGetMeLiveCustomDomainZones,
  handleGetMeLiveOrder,
  handleGetMeLivePublish,
  handleGetMeLiveReleaseReceipt
} from "../../src/api/getMeLive";
import { loadGetMeLiveOrder, saveGetMeLivePreview } from "../../src/api/getMeLiveStore";
import { preferredPublicUrl } from "../../src/lib/getMeLiveOffer";
import type { GetMeLiveConfiguration, GetMeLiveCustomDomain } from "../../src/types/getMeLive";
import type { CustomWebsiteSpec, WebsiteCreationResult, WebsiteSectionSpec } from "../../src/types/customWebsite";

// Slice 7 (plan §8, §20.3): "I bought it — connect it" on real D1. Cloudflare,
// the Pages host and the custom domain are stubbed at the fetch boundary.

const PAGES_HOST = "proof-path-4xz.pages.dev";
const PAGES_URL = `https://${PAGES_HOST}`;
const APEX = "proofpath.com";
const ZONE = "zone_proofpath";
const OWNER = "founder@domain.runtime.test";
const MARKER = /<meta name="ghosttown-release-id" content="(rel_[a-z0-9]+)">/;

const section = (component: WebsiteSectionSpec["component"], heading: string): WebsiteSectionSpec => ({
  sectionId: component === "lead_capture" ? "contact" : component, component, eyebrow: component, heading, body: heading, items: [],
  primaryCtaLabel: component === "hero" || component === "lead_capture" ? "Start" : "", secondaryCtaLabel: ""
});
const spec: CustomWebsiteSpec = {
  schemaVersion: "custom-website-spec-v1", templateId: "ghosttown_conversion", businessName: "Proof Path",
  metadataTitle: "Proof Path", metadataDescription: "A pilot.", stylePreset: "clean_saas",
  sections: [
    section("hero", "Proof first"), section("problem", "The problem"), section("solution", "The pilot"), section("pricing", "Pilot price: $49"),
    section("proof", "Proof boundary"), section("faq", "Questions"), section("lead_capture", "Interested?"), section("footer", "Proof Path")
  ]
};
const configuration: GetMeLiveConfiguration = {
  schemaVersion: "get-me-live-config-v1",
  brand: { businessName: "Proof Path", stylePreset: "clean_saas" },
  offer: { intent: "interest", headline: "Proof first", offer: "Pilot", price: "$49", ctaLabel: "I am interested" },
  contact: { contactEmail: OWNER, leadDestinationEmail: OWNER },
  domain: { cloudflareAccountId: "acct_runtime" },
  payments: { enabled: false }
};

/** Fake Cloudflare. `hosts` is what each customer-facing host currently serves. */
const cf = {
  calls: [] as string[],
  projects: new Set<string>(),
  deployments: 0,
  uploadedHtml: "",
  served: new Map<string, string>(),
  zones: [] as Array<{ id: string; name: string; status: string }>,
  dns: new Map<string, Array<{ id: string; type: string; name: string; comment?: string }>>(),
  pagesDomains: new Map<string, string>(),
  domainStatus: "pending",
  failAttach: false,
  attachDelayMs: 0
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  cf.calls.push(`${method} ${url.host}${url.pathname}`);
  if (url.host === "api.cloudflare.com") {
    const path = url.pathname;
    if (path.endsWith("/zones") && method === "GET") {
      const name = url.searchParams.get("name");
      return json({ success: true, result: name ? cf.zones.filter(zone => zone.name === name) : cf.zones });
    }
    const zoneMatch = path.match(/\/zones\/([^/]+)$/);
    if (zoneMatch && method === "GET") {
      const zone = cf.zones.find(item => item.id === zoneMatch[1]);
      return zone ? json({ success: true, result: { ...zone, account: { id: "acct_runtime" } } }) : json({ success: false, errors: [{ message: "not found" }] }, 404);
    }
    const dnsMatch = path.match(/\/zones\/([^/]+)\/dns_records(?:\/([^/]+))?$/);
    if (dnsMatch) {
      const name = url.searchParams.get("name") || "";
      if (method === "GET") return json({ success: true, result: cf.dns.get(name) || [] });
      if (method === "POST") {
        const record = JSON.parse(String(init?.body)) as { type: string; name: string; comment?: string };
        cf.dns.set(record.name, [...(cf.dns.get(record.name) || []), { id: `dns_${record.name}`, type: record.type, name: record.name, comment: record.comment }]);
        return json({ success: true, result: { id: `dns_${record.name}` } });
      }
      if (method === "DELETE") {
        for (const [key, records] of cf.dns) cf.dns.set(key, records.filter(record => record.id !== dnsMatch[2]));
        return json({ success: true, result: { id: dnsMatch[2] } });
      }
    }
    const domainMatch = path.match(/\/pages\/projects\/[^/]+\/domains(?:\/([^/]+))?$/);
    if (domainMatch) {
      const host = domainMatch[1] ? decodeURIComponent(domainMatch[1]) : "";
      if (!host && method === "GET") return json({ success: true, result: [...cf.pagesDomains].map(([name, status]) => ({ name, status })) });
      if (!host && method === "POST") {
        if (cf.attachDelayMs) await new Promise(resolve => setTimeout(resolve, cf.attachDelayMs));
        if (cf.failAttach) return json({ success: false, errors: [{ message: "Domain is not allowed" }] }, 400);
        const { name } = JSON.parse(String(init?.body)) as { name: string };
        cf.pagesDomains.set(name, "initializing");
        return json({ success: true, result: { name, status: "initializing" } });
      }
      if (host && method === "GET") {
        if (!cf.pagesDomains.has(host)) return json({ success: false, errors: [{ message: "not found" }] }, 404);
        return json({ success: true, result: { name: host, status: cf.domainStatus } });
      }
      if (host && method === "DELETE") { cf.pagesDomains.delete(host); return json({ success: true, result: null }); }
    }
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
        const text = atob(file.value);
        if (MARKER.test(text)) cf.uploadedHtml = text;
      }
      return json({ success: true, result: true });
    }
    if (path.endsWith("/pages/assets/upsert-hashes")) return json({ success: true, result: true });
    if (path.endsWith("/deployments") && method === "POST") {
      cf.deployments += 1;
      // A deployment serves on the Pages host and on every attached custom domain.
      for (const host of [PAGES_HOST, ...cf.pagesDomains.keys()]) cf.served.set(host, cf.uploadedHtml);
      return json({ success: true, result: { id: `dep_${cf.deployments}`, url: `https://hash${cf.deployments}.${PAGES_HOST}` } });
    }
    return json({ success: false, errors: [{ message: `unexpected ${method} ${path}` }] }, 500);
  }
  const html = cf.served.get(url.host);
  if (html !== undefined) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  return new Response("not found", { status: 404 });
}

const env = { ...(runtimeEnv as unknown as Env), BROWSER: { quickAction: async () => ({ ok: true }) } } as unknown as Env;
let token = "";
let counter = 0;

async function signup(): Promise<string> {
  if (await env.KV.get(`user_${OWNER}`)) await env.KV.delete(`user_${OWNER}`);
  const response = await handleSignup(new Request("https://api.test/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: OWNER, password: "runtime-password" })
  }), env);
  return (await response.json() as { token: string }).token;
}

async function seedOrder(extra: { customDomain?: string } = {}): Promise<string> {
  counter += 1;
  const orderId = `gml_domain_${Date.now()}_${counter}`;
  const now = new Date().toISOString();
  const sprintId = `gtt_domain_${orderId}`;
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
      status, configuration_json, provider_state_json, custom_domain, created_at, updated_at, paid_at)
    VALUES (?, ?, ?, 'bp_runtime', 'ghosttown_get_me_live_v1', '1.0', 'price_runtime', 'preview_ready', ?, ?, ?, ?, ?, ?)
  `).bind(orderId, OWNER, sprintId, JSON.stringify(configuration),
    JSON.stringify({ cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false }), extra.customDomain || null, now, now, now).run();
  await env.KV.put(`get_me_live_cf_token_${orderId}`, JSON.stringify({ accessToken: "cf_runtime", expiresAt: new Date(Date.now() + 3600_000).toISOString() }));
  await saveGetMeLivePreview(env, orderId, { spec, assets: [], build: { buildId: "website_spec_hash_1" } } as unknown as WebsiteCreationResult, "<html>preview</html>");
  return orderId;
}

const owner = (orderId: string, path: string, init: RequestInit = {}) => new Request(`https://api.test/api/get-me-live/orders/${orderId}${path}`, {
  ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }
});
const body = async (response: Response) => await response.json() as Record<string, any>;
const launch = async (orderId: string) => {
  const response = await handleGetMeLivePublish(owner(orderId, "/publish", { method: "POST" }), env, orderId, { verifyBackoffMs: [] });
  if (response.status !== 200) throw new Error(`launch ${response.status}: ${await response.text()}`);
};
const zones = (orderId: string) => handleGetMeLiveCustomDomainZones(owner(orderId, "/custom-domain/zones"), env, orderId);
const connect = (orderId: string, input: Record<string, unknown> = { zoneId: ZONE }) =>
  handleGetMeLiveCustomDomainConnect(owner(orderId, "/custom-domain", { method: "POST", body: JSON.stringify(input) }), env, orderId);
const reconcile = (orderId: string) => handleGetMeLiveCustomDomainReconcile(owner(orderId, "/custom-domain/reconcile", { method: "POST" }), env, orderId);
const receiptText = async (orderId: string) => (await handleGetMeLiveReleaseReceipt(owner(orderId, "/release-receipt"), env, orderId)).text();
async function row(orderId: string) {
  return await env.DB.prepare("SELECT status, public_url, custom_domain, custom_domain_json, hosting_json FROM get_me_live_orders WHERE order_id = ?")
    .bind(orderId).first<Record<string, string | null>>();
}
async function releases(orderId: string) {
  return (await env.DB.prepare("SELECT release_id, kind, custom_domain, verified_url FROM get_me_live_releases WHERE get_me_live_order_id = ? ORDER BY created_at, rowid")
    .bind(orderId).all<Record<string, string>>()).results;
}
const record = async (orderId: string) => (await loadGetMeLiveOrder(env, orderId))!.customDomainState as GetMeLiveCustomDomain;

beforeEach(async () => {
  Object.assign(cf, {
    calls: [], projects: new Set<string>(), deployments: 0, uploadedHtml: "", served: new Map(), dns: new Map(), pagesDomains: new Map(),
    zones: [{ id: ZONE, name: APEX, status: "active" }], domainStatus: "pending", failAttach: false, attachDelayMs: 0
  });
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  token = await signup();
});
afterEach(() => vi.unstubAllGlobals());

describe("Custom domain connect on real D1 (Slice 7)", () => {
  it("#9 #10 #12 #13 #11: connecting never changes the live URL; activation republishes with the apex canonical, verifies it, then switches", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    const launchReceipt = await receiptText(orderId);

    expect(await body(await zones(orderId))).toEqual({ zones: [{ zoneId: ZONE, name: APEX, eligible: true }] });
    const connected = await connect(orderId);
    expect(connected.status).toBe(202);
    expect((await body(connected)).customDomain).toMatchObject({ name: APEX, hosts: [APEX, `www.${APEX}`], status: "connecting", step: "attached", version: 3 });
    expect([...cf.pagesDomains.keys()]).toEqual([APEX, `www.${APEX}`]);
    expect(cf.dns.get(APEX)).toEqual([expect.objectContaining({ type: "CNAME", comment: "GhostTown Get Me Live" })]);

    // #9: connecting (provider still pending) changes nothing customers see.
    expect(await body(await reconcile(orderId))).toMatchObject({ customDomain: { step: "attached" }, providerStatus: expect.stringContaining("pending") });
    let order = (await loadGetMeLiveOrder(env, orderId))!;
    expect(preferredPublicUrl(order)).toBe(PAGES_URL);
    expect((await row(orderId))!.custom_domain).toBeNull();

    cf.domainStatus = "active";
    expect((await body(await reconcile(orderId))).customDomain).toMatchObject({ step: "provider_active", status: "connecting" });
    expect((await body(await reconcile(orderId))).customDomain).toMatchObject({ step: "republish_deployed", status: "connecting" });
    // #13: the activation release is rendered with the apex as canonical and OG URL.
    expect(cf.uploadedHtml).toContain(`<link rel="canonical" href="https://${APEX}">`);
    expect(cf.uploadedHtml).toContain(`<meta property="og:url" content="https://${APEX}">`);
    expect(preferredPublicUrl((await loadGetMeLiveOrder(env, orderId))!)).toBe(PAGES_URL);

    const activated = await body(await reconcile(orderId));
    expect(activated.customDomain).toMatchObject({ status: "active", step: "verified" });
    // #10 + #12
    order = (await loadGetMeLiveOrder(env, orderId))!;
    expect(preferredPublicUrl(order)).toBe(`https://${APEX}`);
    expect((await row(orderId))).toMatchObject({ status: "live", public_url: PAGES_URL, custom_domain: APEX });
    const rows = await releases(orderId);
    expect(rows.map(item => item.kind)).toEqual(["launch", "domain_activation"]);
    expect(rows[1]).toMatchObject({ custom_domain: APEX, verified_url: expect.stringMatching(new RegExp(`^https://${APEX.replace(".", "\\.")}/\\?gt_verify=rel_`)) });
    // #11: the launch receipt is untouched by activation.
    expect(await receiptText(orderId)).toBe(launchReceipt);
    // Active is terminal for reconcile.
    const calls = cf.calls.length;
    expect((await body(await reconcile(orderId))).customDomain).toMatchObject({ status: "active" });
    expect(cf.calls.length).toBe(calls);
  });

  it("#2: an attach failure marks only the domain failed; the live site, its status and the launch release are unchanged", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    const before = await row(orderId);
    const launchReceipt = await receiptText(orderId);
    cf.failAttach = true;
    const response = await connect(orderId);
    expect((await body(response)).customDomain).toMatchObject({ status: "failed", lastError: expect.stringContaining("Domain is not allowed") });
    const after = await row(orderId);
    expect(after).toMatchObject({ status: "live", public_url: before!.public_url, hosting_json: before!.hosting_json, custom_domain: null });
    expect(preferredPublicUrl((await loadGetMeLiveOrder(env, orderId))!)).toBe(PAGES_URL);
    expect(await receiptText(orderId)).toBe(launchReceipt);

    // Try again resets to attach_requested on a new version and carries on.
    cf.failAttach = false;
    const retried = await body(await connect(orderId, { zoneId: ZONE, hostname: APEX }));
    expect(retried.customDomain).toMatchObject({ status: "connecting", step: "attached", version: (await record(orderId)).version });
  });

  it("#24: twenty concurrent reconciles never double-attach or double-republish", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    const deploymentsAfterLaunch = cf.deployments;
    // Create the record without running the first step, then race 20 reconciles at attach_requested.
    await env.DB.prepare("UPDATE get_me_live_orders SET custom_domain_json = ? WHERE order_id = ?").bind(JSON.stringify({
      schemaVersion: "get-me-live-custom-domain-v1", version: 1, name: APEX, hosts: [APEX, `www.${APEX}`], zoneId: ZONE,
      status: "connecting", step: "attach_requested", addedAt: new Date().toISOString()
    }), orderId).run();
    cf.attachDelayMs = 5;
    await Promise.all(Array.from({ length: 20 }, () => reconcile(orderId)));
    const attachPosts = cf.calls.filter(call => /^POST api\.cloudflare\.com.*\/pages\/projects\/[^/]+\/domains$/.test(call));
    const dnsPosts = cf.calls.filter(call => /^POST api\.cloudflare\.com.*\/dns_records$/.test(call));
    expect(attachPosts).toHaveLength(2);
    expect(dnsPosts).toHaveLength(2);
    expect(cf.pagesDomains.size).toBe(2);
    expect((await record(orderId)).step).toBe("attached");
    expect((await record(orderId)).attachLeaseUntil).toBeUndefined();

    cf.domainStatus = "active";
    await reconcile(orderId);
    expect((await record(orderId)).step).toBe("provider_active");
    const raced = await Promise.all(Array.from({ length: 20 }, () => reconcile(orderId).then(body)));
    expect(cf.deployments - deploymentsAfterLaunch).toBe(1);
    expect(raced.filter(result => result.waiting === "publish_in_progress" || result.superseded).length).toBeGreaterThan(0);
    await Promise.all(Array.from({ length: 20 }, () => reconcile(orderId)));
    expect((await record(orderId)).status).toBe("active");
    expect((await releases(orderId)).filter(item => item.kind === "domain_activation")).toHaveLength(1);
    expect(cf.deployments - deploymentsAfterLaunch).toBe(1);
  });

  it("twenty orders connecting at the same time stay independent", async () => {
    const orderIds = await Promise.all(Array.from({ length: 20 }, () => seedOrder()));
    for (const orderId of orderIds) await launch(orderId);
    // Each order's account has its own zone (the fake shares one Pages project map, so give each order its own subdomain host).
    const results = await Promise.all(orderIds.map((orderId, index) => {
      return connect(orderId, { zoneId: ZONE, hostname: `shop${index}.${APEX}` }).then(body);
    }));
    expect(results.every(result => result.customDomain?.status === "connecting")).toBe(true);
    for (const [index, orderId] of orderIds.entries()) {
      expect(await record(orderId)).toMatchObject({ name: `shop${index}.${APEX}`, hosts: [`shop${index}.${APEX}`], version: 3 });
    }
  });

  it("#15: a legacy custom domain reads as connecting without a GET write, and is promoted only after verification", async () => {
    const orderId = await seedOrder({ customDomain: APEX });
    await launch(orderId);
    await env.DB.prepare("UPDATE get_me_live_orders SET custom_domain = ? WHERE order_id = ?").bind(APEX, orderId).run();
    const view = await body(await handleGetMeLiveOrder(owner(orderId, ""), env, orderId));
    expect(view.order.customDomainState).toMatchObject({ name: APEX, status: "connecting", legacy: true, version: 0 });
    expect(preferredPublicUrl((await loadGetMeLiveOrder(env, orderId))!)).toBe(PAGES_URL);
    expect(await row(orderId)).toMatchObject({ custom_domain: APEX, custom_domain_json: null });

    const persisted = await body(await reconcile(orderId));
    expect(persisted.customDomain).toMatchObject({ legacy: true, version: 1, status: "connecting", step: "attached", zoneId: ZONE });
    expect(await row(orderId)).toMatchObject({ custom_domain: null });

    cf.pagesDomains.set(APEX, "active");
    cf.domainStatus = "active";
    await reconcile(orderId); // provider_active
    await reconcile(orderId); // republish_deployed
    expect((await body(await reconcile(orderId))).customDomain).toMatchObject({ status: "active" });
    expect((await row(orderId))!.custom_domain).toBe(APEX);
  });

  it("ineligible zones are listed with a reason and cannot be connected", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    cf.zones.push({ id: "zone_busy", name: "busy.com", status: "active" }, { id: "zone_new", name: "new.com", status: "pending" });
    cf.dns.set("busy.com", [{ id: "a1", type: "A", name: "busy.com" }]);
    const listed = (await body(await zones(orderId))).zones;
    expect(listed).toEqual([
      { zoneId: ZONE, name: APEX, eligible: true },
      { zoneId: "zone_busy", name: "busy.com", eligible: false, reason: "This domain already has settings — use the guide." },
      { zoneId: "zone_new", name: "new.com", eligible: false, reason: "Cloudflare is still setting up this domain. Try again later." }
    ]);
    expect((await body(await handleGetMeLiveCustomDomainZones(owner(orderId, "/custom-domain/zones?name=new.com"), env, orderId))).zones.map((zone: { name: string }) => zone.name)).toEqual(["new.com"]);
    expect((await connect(orderId, { zoneId: "zone_busy" })).status).toBe(409);
    expect((await connect(orderId, { zoneId: "zone_other_account" })).status).toBe(404);
    expect((await connect(orderId, { zoneId: ZONE, hostname: "evil.example.com" })).status).toBe(400);
    expect((await record(orderId))).toBeUndefined();
  });

  it("times out after 72 hours of provider setup, on the next explicit reconcile", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    await env.DB.prepare("UPDATE get_me_live_orders SET custom_domain_json = ? WHERE order_id = ?").bind(JSON.stringify({
      schemaVersion: "get-me-live-custom-domain-v1", version: 3, name: APEX, hosts: [APEX, `www.${APEX}`], zoneId: ZONE,
      status: "connecting", step: "attached", addedAt: new Date(Date.now() - 73 * 3600_000).toISOString()
    }), orderId).run();
    expect((await body(await reconcile(orderId))).customDomain).toMatchObject({ status: "failed", lastError: CUSTOM_DOMAIN_TIMEOUT_MESSAGE, version: 4 });
    expect((await row(orderId))!.status).toBe("live");
  });

  it("disconnect detaches both hosts, removes only GhostTown DNS records, and clears the record", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    await connect(orderId);
    cf.dns.set(`mail.${APEX}`, [{ id: "mx", type: "MX", name: `mail.${APEX}` }]);
    const removed = await body(await handleGetMeLiveCustomDomainDelete(owner(orderId, "/custom-domain", { method: "DELETE" }), env, orderId));
    expect(removed).toEqual({ customDomain: null, removed: [APEX, `www.${APEX}`] });
    expect(cf.pagesDomains.size).toBe(0);
    expect(cf.dns.get(APEX)).toEqual([]);
    expect(cf.dns.get(`mail.${APEX}`)).toHaveLength(1);
    expect(await row(orderId)).toMatchObject({ custom_domain: null, custom_domain_json: null, status: "live" });
  });

  it("#35: GET order and GET zones make no Cloudflare writes and no state-machine writes", async () => {
    const orderId = await seedOrder();
    await launch(orderId);
    await connect(orderId);
    const before = await row(orderId);
    const attemptsBefore = await env.DB.prepare("SELECT COUNT(*) AS n FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ?").bind(orderId).first<{ n: number }>();
    const releasesBefore = (await releases(orderId)).length;
    cf.calls = [];
    await handleGetMeLiveOrder(owner(orderId, ""), env, orderId);
    await zones(orderId);
    expect(cf.calls.filter(call => !call.startsWith("GET "))).toEqual([]);
    expect(await row(orderId)).toEqual(before);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM get_me_live_publish_attempts WHERE get_me_live_order_id = ?").bind(orderId).first<{ n: number }>()).toEqual(attemptsBefore);
    expect((await releases(orderId)).length).toBe(releasesBefore);
  });
});
