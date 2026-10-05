import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

async function columns(table: string): Promise<string[]> {
  const result = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return result.results.map(row => row.name);
}

describe("GhostTown real local D1 migration contract", () => {
  it("applies the canonical migrations and exposes ownership-critical columns", async () => {
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).all<{ name: string }>();
    const names = tables.results.map(row => row.name);
    expect(names).toContain("launch_blueprints");
    expect(names).toContain("launch_blueprint_progress");
    expect(names).toContain("launch_sites");
    expect(names).toContain("launch_site_leads");
    expect(names).toContain("get_me_live_orders");
    expect(names).toContain("get_me_live_assets");
    expect(names).toContain("get_me_live_share_drafts");
    expect(names).toContain("get_me_live_activity_counts");
    expect(names).toContain("get_me_live_releases");
    expect(names).toContain("get_me_live_publish_attempts");
    expect(names).toContain("execution_coach_responses");
    expect(names).toContain("execution_learning_candidates");
    expect(names).toContain("execution_product_knowledge");

    expect(await columns("launch_blueprints")).toEqual(expect.arrayContaining([
      "order_id", "owner_id", "source_verdict_id", "schema_version",
      "status", "blueprint_json", "research_receipt_json", "pdf_r2_key"
    ]));
    expect(await columns("launch_blueprint_progress")).toEqual(expect.arrayContaining([
      "order_id", "owner_id", "progress_json", "updated_at"
    ]));
    expect(await columns("launch_sites")).toEqual(expect.arrayContaining([
      "site_id", "order_id", "owner_id", "public_slug", "status"
    ]));
    expect(await columns("launch_site_leads")).toEqual(expect.arrayContaining([
      "lead_id", "site_id", "email", "source_path", "consent_text"
    ]));
    expect(await columns("get_me_live_orders")).toEqual(expect.arrayContaining([
      "public_url", "custom_domain", "deployment_receipt_json", "hosting_json", "custom_domain_json"
    ]));
    expect(await columns("get_me_live_releases")).toEqual(expect.arrayContaining([
      "release_id", "get_me_live_order_id", "kind", "build_id", "deployment_id", "deployment_url",
      "pages_url", "custom_domain", "verified_url", "verified_at", "backfilled", "receipt_json", "created_at"
    ]));
    expect(await columns("get_me_live_publish_attempts")).toEqual(expect.arrayContaining([
      "get_me_live_order_id", "attempt_id", "kind", "build_id", "custom_domain", "phase",
      "deployment_id", "deployment_url", "claimed_at", "deployed_at", "expires_at"
    ]));
    expect(await columns("execution_coach_responses")).toEqual(expect.arrayContaining([
      "response_id", "account_id", "order_id", "blueprint_id", "blueprint_version",
      "day_number", "phase", "capability", "context_sha256", "question_sha256",
      "response_json", "receipt_json", "degradation_json", "cache_expires_at", "hit_count"
    ]));
    expect(await columns("execution_learning_candidates")).toEqual(expect.arrayContaining([
      "candidate_id", "source_response_id", "knowledge_class", "scope", "lesson_text",
      "privacy_safe", "global_eligible", "valid_until", "status"
    ]));
    expect(await columns("execution_product_knowledge")).toEqual(expect.arrayContaining([
      "knowledge_id", "knowledge_fingerprint", "knowledge_class", "scope", "lesson_text",
      "support_count", "contradiction_count", "status", "valid_until", "next_review_at"
    ]));
  });

  it("returns real D1 affected-row metadata", async () => {
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      "runtime-d1-meta",
      "owner@example.com",
      "verdict-runtime",
      "ghosttown-launch-blueprint-v2.1",
      "ready",
      "{}",
      "{}",
      "private/runtime.pdf",
      now,
      now
    ).run();

    expect(result.success).toBe(true);
    expect(result.meta.changes).toBe(1);
  });
});
