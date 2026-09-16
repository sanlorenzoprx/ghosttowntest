import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handleSignup } from "../../src/api/auth";
import { handleLaunchSiteOwner, handlePublicLaunchLead } from "../../src/api/launchSite";
import { loadBlueprintProgress } from "../../src/api/blueprintStore";
import { launchBlueprintFixture } from "../fixtures/launchBlueprint";

function runtimeEnv(): Env {
  return {
    KV: env.KV,
    DB: env.DB,
    BLUEPRINTS: env.BLUEPRINTS,
    AI: {} as Ai,
    JWT_SECRET: env.JWT_SECRET,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET
  } as Env;
}

describe("GhostTown Launch Site on real local D1/KV", () => {
  it("persists a public lead through the production handler and real migration schema", async () => {
    const owner = "launch-owner@runtime.test";
    const blueprint = launchBlueprintFixture(owner);
    const now = new Date().toISOString();
    const slug = "runtime-launch-site";
    const siteId = "site_runtime_contract";

    await env.DB.prepare(
      "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      blueprint.orderId,
      owner,
      blueprint.sourceVerdictId,
      blueprint.schemaVersion,
      blueprint.status,
      JSON.stringify(blueprint),
      "{}",
      "private/runtime.pdf",
      blueprint.createdAt,
      now
    ).run();

    await env.DB.prepare(
      "INSERT INTO launch_sites (site_id, order_id, owner_id, public_slug, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'published', ?, ?, ?)"
    ).bind(siteId, blueprint.orderId, owner, slug, now, now, now).run();

    const request = new Request(`https://runtime.test/api/launch/${slug}/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.10"
      },
      body: JSON.stringify({
        email: "buyer@example.com",
        name: "Runtime Buyer",
        message: "Interested",
        consent: true
      })
    });

    const response = await handlePublicLaunchLead(request, runtimeEnv(), slug);
    expect(response.status).toBe(201);

    const row = await env.DB.prepare(
      "SELECT email, name, source_path, consent_text FROM launch_site_leads WHERE site_id = ?"
    ).bind(siteId).first<{
      email: string;
      name: string | null;
      source_path: string;
      consent_text: string;
    }>();
    expect(row?.email).toBe("buyer@example.com");
    expect(row?.name).toBe("Runtime Buyer");
    expect(row?.source_path).toBe(`/launch/${slug}`);
    expect(row?.consent_text).toMatch(/agree/i);

    const rateRows = await env.DB.prepare(
      "SELECT scope, used FROM runtime_rate_limits WHERE scope LIKE ?"
    ).bind(`launch_lead:${siteId}:%`).all<{ scope: string; used: number }>();
    expect(rateRows.results).toHaveLength(1);
    expect(rateRows.results[0]?.scope).toMatch(new RegExp(`^launch_lead:${siteId}:[0-9a-f]{24}$`));
    expect(rateRows.results[0]?.used).toBe(1);

    const retiredKvRateKeys = await env.KV.list({ prefix: "launch_lead_rate_" });
    expect(retiredKvRateKeys.keys).toHaveLength(0);

    const evidence = await env.DB.prepare(
      "SELECT event_type, evidence_class, evidence_strength, applied_at FROM observed_evidence_events WHERE order_id = ?"
    ).bind(blueprint.orderId).first<{ event_type: string; evidence_class: string; evidence_strength: string; applied_at: string | null }>();
    expect(evidence).toMatchObject({ event_type: "launch_site_lead", evidence_class: "customer", evidence_strength: "early" });
    expect(evidence?.applied_at).toBeTruthy();

    const progress = await loadBlueprintProgress(runtimeEnv(), blueprint.orderId, owner);
    expect(progress.metrics.leads).toBe(1);
    expect(progress.evidenceLedger).toHaveLength(1);
    expect(progress.evidenceLedger[0]).toMatchObject({
      contactOrChannel: "buyer@example.com",
      customerLanguage: "Interested",
      evidenceStrength: "early"
    });
  });

  it("keeps owner GET mutation-free when no Launch Site exists", async () => {
    const runtime = runtimeEnv();
    const owner = "launch-read-owner@runtime.test";
    const blueprint = launchBlueprintFixture(owner);
    const orderId = `runtime-read-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    blueprint.orderId = orderId;

    await env.DB.prepare(
      "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      orderId,
      owner,
      blueprint.sourceVerdictId,
      blueprint.schemaVersion,
      blueprint.status,
      JSON.stringify(blueprint),
      "{}",
      "private/runtime-read.pdf",
      blueprint.createdAt,
      now
    ).run();

    await env.KV.put(`paid_test_order_${orderId}`, JSON.stringify({
      orderId,
      email: owner,
      verdictId: blueprint.sourceVerdictId,
      status: "ready",
      artifactType: "launch_blueprint_v2",
      intake: {},
      createdAt: blueprint.createdAt,
      updatedAt: now
    }));

    const signupResponse = await handleSignup(new Request("https://runtime.test/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: owner, password: "correct-horse-battery" })
    }), runtime);
    expect(signupResponse.status).toBe(201);
    const signup = await signupResponse.json<{ token: string }>();

    const before = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM launch_sites WHERE order_id = ?"
    ).bind(orderId).first<{ count: number }>();
    expect(Number(before?.count ?? -1)).toBe(0);

    const response = await handleLaunchSiteOwner(new Request(
      `https://runtime.test/api/paid-test/orders/${orderId}/launch-site`,
      { headers: { Authorization: `Bearer ${signup.token}` } }
    ), runtime, orderId, "get");
    expect(response.status).toBe(200);
    expect(await response.json<{ site: unknown; publicUrl: string | null }>()).toMatchObject({
      site: null,
      publicUrl: null
    });

    const after = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM launch_sites WHERE order_id = ?"
    ).bind(orderId).first<{ count: number }>();
    expect(Number(after?.count ?? -1)).toBe(0);
  });
});
