import { describe, expect, it } from "vitest";
import { env as runtimeEnv } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { loadBlueprintProgress, saveBlueprintProgress, type BlueprintEvidenceLedgerEntry, type BlueprintProgress } from "../../src/api/blueprintStore";

// Regression for the 30-Day Sprint acceptance failure "Day N … missing Day N-1":
// the Sprint page sends whole progress snapshots and saves can reach the server
// out of order, so an older snapshot used to erase a newer completion.

const env = runtimeEnv as unknown as Env;
const OWNER = "founder@progress.runtime.test";
let counter = 0;

async function seedBlueprint(): Promise<string> {
  counter += 1;
  const orderId = `gtt_progress_${Date.now()}_${counter}`;
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO launch_blueprints (order_id, owner_id, source_verdict_id, schema_version, status, blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at)
    VALUES (?, ?, 'verdict', 'ghosttown-launch-blueprint-v2.1', 'ready', '{}', '{}', 'private/x.pdf', ?, ?)
  `).bind(orderId, OWNER, now, now).run();
  return orderId;
}

const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

function ledgerEntry(entryId: string, response: string): BlueprintEvidenceLedgerEntry {
  return {
    entryId, contactOrChannel: "Synthetic contact", date: "2026-10-01", action: "Outreach", response,
    customerLanguage: "", alternativeMentioned: "", objection: "", commitmentOffered: "", commitmentReceived: "none",
    revenueCents: 0, founderMinutes: 5, variableCostCents: 0, followUpDate: "", evidenceStrength: "early", sourceNote: "test"
  };
}

describe("Sprint progress saves are safe against stale and concurrent snapshots", () => {
  it("a late, older snapshot does not erase a newer day completion", async () => {
    const orderId = await seedBlueprint();
    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: days(1, 8) });
    const staleSnapshot: Partial<BlueprintProgress> = { completedDays: days(1, 8), evidenceNotes: { "day-9": "note typed before completing" } };

    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: days(1, 9), completedDayChanges: [{ dayNumber: 9, completed: true }] });
    await saveBlueprintProgress(env, orderId, OWNER, staleSnapshot);

    const stored = await loadBlueprintProgress(env, orderId, OWNER);
    expect(stored.completedDays).toEqual(days(1, 9));
    expect(stored.evidenceNotes["day-9"]).toBe("note typed before completing");
  });

  it("reopening a day requires an explicit change", async () => {
    const orderId = await seedBlueprint();
    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: days(1, 9) });
    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: days(1, 8) });
    expect((await loadBlueprintProgress(env, orderId, OWNER)).completedDays).toEqual(days(1, 9));
    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: days(1, 8), completedDayChanges: [{ dayNumber: 9, completed: false }] });
    expect((await loadBlueprintProgress(env, orderId, OWNER)).completedDays).toEqual(days(1, 8));
  });

  it("concurrent saves completing different days all persist", async () => {
    const orderId = await seedBlueprint();
    await saveBlueprintProgress(env, orderId, OWNER, {});
    await Promise.all(days(1, 10).map(day => saveBlueprintProgress(env, orderId, OWNER, {
      completedDays: [day], completedDayChanges: [{ dayNumber: day, completed: true }]
    })));
    expect((await loadBlueprintProgress(env, orderId, OWNER)).completedDays).toEqual(days(1, 10));
  });

  it("a stale snapshot does not drop evidence entries; entries upsert by id", async () => {
    const orderId = await seedBlueprint();
    await saveBlueprintProgress(env, orderId, OWNER, { evidenceLedger: [ledgerEntry("evidence_a", "first")] });
    await saveBlueprintProgress(env, orderId, OWNER, { evidenceLedger: [ledgerEntry("evidence_a", "first"), ledgerEntry("evidence_b", "second")] });
    await saveBlueprintProgress(env, orderId, OWNER, { evidenceLedger: [ledgerEntry("evidence_a", "first")] });
    await saveBlueprintProgress(env, orderId, OWNER, { evidenceLedger: [ledgerEntry("evidence_a", "edited")] });
    const ledger = (await loadBlueprintProgress(env, orderId, OWNER)).evidenceLedger;
    expect(ledger.map(entry => [entry.entryId, entry.response]).sort()).toEqual([["evidence_a", "edited"], ["evidence_b", "second"]]);
  });

  it("keeps the owner immutable", async () => {
    const orderId = await seedBlueprint();
    await saveBlueprintProgress(env, orderId, OWNER, { completedDays: [1] });
    await expect(saveBlueprintProgress(env, orderId, "someone-else@runtime.test", { completedDays: [2] })).rejects.toThrow();
    expect((await loadBlueprintProgress(env, orderId, OWNER)).completedDays).toEqual([1]);
  });
});
