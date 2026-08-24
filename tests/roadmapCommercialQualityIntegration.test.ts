import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const readText = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Commercial Quality roadmap integration", () => {
  it("preserves the 47 production gate IDs and manual Gate 36", () => {
    const config = readJson("config/production-roadmap-47-gates.json");
    expect(config.gates).toHaveLength(47);
    expect(config.gates.map((gate: { id: number }) => gate.id)).toEqual(
      Array.from({ length: 47 }, (_, index) => index + 1),
    );
    const gate36 = config.gates.find((gate: { id: number }) => gate.id === 36);
    expect(gate36.mode).toBe("manual");
    expect(gate36.mutation_scope).toBe("production");
    expect(config.safety.production_auto_deploy).toBe(false);
  });

  it("inserts Q1-Q5 after Gate 25 and before Gate 26", () => {
    const config = readJson("config/commercial-quality-roadmap-v1.json");
    expect(config.insert_after_production_gate).toBe(25);
    expect(config.resume_production_at_gate).toBe(26);
    expect(config.production_release_gate).toBe(36);
    expect(config.quality_gates.map((gate: { id: string }) => gate.id)).toEqual([
      "Q1", "Q2", "Q3", "Q4", "Q5",
    ]);
  });

  it("keeps Baseline 001 as exploration rather than a 30-50-video permission gate", () => {
    const config = readJson("config/commercial-quality-roadmap-v1.json");
    const baseline = config.post_release_story_studio.baseline_001;
    expect(baseline.verdicts).toBe(100);
    expect(baseline.treatments).toBe(10);
    expect(baseline.master_creatives).toBe(1000);
    expect(baseline.commercial_permission_gate_from_30_50_videos).toBe(false);
    expect(config.post_release_story_studio.mandatory_before_baseline).toContain(
      "show_treatment_portfolio_review",
    );
  });

  it("preserves the stable roadmap wrapper while delegating into the master orchestrator", () => {
    const pkg = readJson("package.json");
    const wrapper = readText("scripts/roadmap-autopilot-wrapper.mjs");
    expect(pkg.scripts["roadmap:autopilot"]).toBe("node scripts/roadmap-autopilot-wrapper.mjs");
    expect(pkg.scripts["roadmap:status"]).toContain("roadmap-master-autopilot.mjs --status");
    expect(pkg.scripts["roadmap:reset"]).toContain("roadmap-master-autopilot.mjs --reset");
    expect(pkg.scripts["roadmap:status"]).toContain("roadmap-windows-spawn-compat.cjs");
    expect(pkg.scripts["roadmap:reset"]).toContain("roadmap-windows-spawn-compat.cjs");
    expect(wrapper).toContain("const RUNNER = 'scripts/roadmap-master-autopilot.mjs'");
  });

  it("prints the intended master plan without touching remote services", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/roadmap-master-autopilot.mjs", "--plan"],
      { cwd: root, encoding: "utf8", shell: false },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Production Gates 1-25");
    expect(result.stdout).toContain("Q1 Verdict Decision v2");
    expect(result.stdout).toContain("Gate 36 HUMAN RELEASE");
    expect(result.stdout).toContain("Baseline 001: 100 x 10 = 1,000");
  });

  it("allows customer-value purposes and blocks unrelated purposes", () => {
    const allowed = spawnSync(
      process.execPath,
      ["scripts/roadmap-infrastructure-freeze.mjs", "--purpose=verdict_quality"],
      { cwd: root, encoding: "utf8", shell: false },
    );
    expect(allowed.status).toBe(0);

    const blocked = spawnSync(
      process.execPath,
      ["scripts/roadmap-infrastructure-freeze.mjs", "--purpose=architecture_for_its_own_sake"],
      { cwd: root, encoding: "utf8", shell: false },
    );
    expect(blocked.status).not.toBe(0);
    expect(blocked.stderr).toContain("INFRASTRUCTURE_FREEZE_BLOCKED");
  });
});
