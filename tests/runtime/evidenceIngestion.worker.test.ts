import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handleStoryStudioEvidence, ingestObservedEvidenceEvent } from "../../src/api/evidenceIngestion";
import { loadBlueprintProgress } from "../../src/api/blueprintStore";
import { launchBlueprintFixture } from "../fixtures/launchBlueprint";

function runtimeEnv(): Env {
  return {
    KV: env.KV,
    DB: env.DB,
    AI: {} as Ai,
    STORY_STUDIO_EVIDENCE_API_KEY: "story-secret",
    JWT_SECRET: env.JWT_SECRET,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET
  } as Env;
}

async function seedBlueprint(owner = "evidence-owner@runtime.test") {
  const blueprint = launchBlueprintFixture(owner);
  blueprint.orderId = `runtime-evidence-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    blueprint.orderId, owner, blueprint.sourceVerdictId, blueprint.schemaVersion, blueprint.status,
    JSON.stringify(blueprint), "{}", `private/${blueprint.orderId}.pdf`, blueprint.createdAt, now
  ).run();
  return { blueprint, owner };
}

describe("automatic observed evidence ingestion on real local D1", () => {
  it("is idempotent and projects payment evidence once", async () => {
    const { blueprint, owner } = await seedBlueprint();
    const event = {
      eventId: `stripe:${crypto.randomUUID()}`,
      orderId: blueprint.orderId,
      eventType: "payment" as const,
      occurredAt: "2026-09-15T20:00:00.000Z",
      source: "stripe" as const,
      summary: "Customer paid for the experiment offer.",
      revenueCents: 25000,
      sourceReference: "pi_runtime"
    };
    const first = await ingestObservedEvidenceEvent(runtimeEnv(), event);
    const second = await ingestObservedEvidenceEvent(runtimeEnv(), event);
    expect(first).toMatchObject({ duplicate: false, applied: true, classification: { evidenceClass: "commercial", strength: "strong" } });
    expect(second).toMatchObject({ duplicate: true, applied: true });

    const progress = await loadBlueprintProgress(runtimeEnv(), blueprint.orderId, owner);
    expect(progress.evidenceLedger).toHaveLength(1);
    expect(progress.evidenceLedger[0]).toMatchObject({ revenueCents: 25000, evidenceStrength: "strong" });
    expect(progress.metrics).toMatchObject({ commitments: 1, revenueCents: 25000 });
  });

  it("rejects one event ID being reused for different evidence", async () => {
    const { blueprint } = await seedBlueprint();
    const event = {
      eventId: `stripe:${crypto.randomUUID()}`,
      orderId: blueprint.orderId,
      eventType: "payment" as const,
      occurredAt: "2026-09-15T20:00:00.000Z",
      source: "stripe" as const,
      summary: "Customer paid for the experiment offer.",
      revenueCents: 25000
    };
    await ingestObservedEvidenceEvent(runtimeEnv(), event);
    await expect(
      ingestObservedEvidenceEvent(runtimeEnv(), { ...event, summary: "Changed evidence payload." })
    ).rejects.toThrow(/different evidence/i);
  });

  it("requires the Story Studio key and stores qualified clicks as market evidence", async () => {
    const { blueprint } = await seedBlueprint();
    const body = JSON.stringify({
      eventId: `story:click:${crypto.randomUUID()}`,
      orderId: blueprint.orderId,
      occurredAt: "2026-09-15T20:00:00.000Z",
      platform: "youtube",
      summary: "Qualified click reached the GhostTown experiment."
    });
    const unauthorized = await handleStoryStudioEvidence(new Request(
      "https://runtime.test/api/integrations/story-studio/evidence",
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    ), runtimeEnv());
    expect(unauthorized.status).toBe(401);

    const authorized = await handleStoryStudioEvidence(new Request(
      "https://runtime.test/api/integrations/story-studio/evidence",
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer story-secret" }, body }
    ), runtimeEnv());
    expect(authorized.status).toBe(202);
    expect(await authorized.json()).toMatchObject({ classification: { evidenceClass: "market", strength: "weak" } });

    const row = await env.DB.prepare(
      "SELECT evidence_class, evidence_strength, applied_at FROM observed_evidence_events WHERE order_id = ?"
    ).bind(blueprint.orderId).first<{ evidence_class: string; evidence_strength: string; applied_at: string | null }>();
    expect(row).toMatchObject({ evidence_class: "market", evidence_strength: "weak" });
    expect(row?.applied_at).toBeTruthy();
  });
});
