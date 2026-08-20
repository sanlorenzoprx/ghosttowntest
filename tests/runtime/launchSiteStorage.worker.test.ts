import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handlePublicLaunchLead } from "../../src/api/launchSite";
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

    const rateKeys = await env.KV.list({ prefix: "launch_lead_rate_" });
    expect(rateKeys.keys.length).toBe(1);
    expect(await env.KV.get(rateKeys.keys[0].name)).toBe("1");
  });
});
