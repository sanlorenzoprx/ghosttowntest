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
