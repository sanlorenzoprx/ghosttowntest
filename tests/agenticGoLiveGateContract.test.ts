import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sprintPath = fileURLToPath(new URL('../tests/e2e/30-day-sprint-acceptance.mjs', import.meta.url));
const reportPath = fileURLToPath(new URL('../scripts/acceptance-go-live-gate-report.mjs', import.meta.url));
const sprintWithoutGmlPath = fileURLToPath(new URL('../tests/e2e/sprint-without-gml-acceptance.mjs', import.meta.url));
const workflow = readFileSync(new URL('../.github/workflows/acceptance.yml', import.meta.url), 'utf8');
const sprint = readFileSync(sprintPath, 'utf8');
const report = readFileSync(reportPath, 'utf8');

describe('agentic go-live gate contract', () => {
  it('keeps both orchestration scripts syntactically valid', () => {
    for (const path of [sprintPath, sprintWithoutGmlPath, reportPath]) {
      const checked = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      expect(checked.status, checked.stderr).toBe(0);
    }
  });

  it('runs the Learning Coach after recorded results, samples grounded freshness, and never turns generated text into market evidence', () => {
    expect(sprint).toContain("const agentic = process.env.GHOSTTOWN_E2E_AGENTIC === '1';");
    expect(sprint).toContain("const groundedDailyDays = new Set([1, 15, 30]);");
    expect(sprint).toContain("phase = 'review'");
    expect(sprint).toContain('Review the recorded results for Day');
    expect(sprint).toContain('synthetic records are not real customer proof');
    expect(sprint).toContain('QA simulation only; not real customer or market evidence.');
    expect(sprint).toContain('coachMemory.reviewCount !== 30');
    expect(sprint).toContain("cachedReview.cache?.hit !== true");
    expect(report).toContain("groundedDailyRequired = [1, 15, 30]");
    expect(report).toContain("groundedCheckpointRequired = [7, 14, 21, 30]");
    expect(report).toContain("'sprint.agentic.memory'");
    expect(report).toContain("'sprint.agentic.cache'");
  });

  it('treats missing provider proof as a blocker instead of assuming success', () => {
    expect(report).toContain("'payments.full_webhook'");
    expect(report).toContain("'gml.cloudflare_oauth'");
    expect(report).toContain("'sprint.without_gml'");
    expect(report).toContain("jsonFile('sprint-without-gml-proof.json')");
    expect(report).toContain("sprintWithoutGml.progress?.writeRoundTrip === true");
    expect(report).toContain("sprintWithoutGml.coachMemory?.reviewCount === 30");
    expect(report).toContain("const result = blockers.length === 0 ? 'PASS' : 'BLOCKED';");
  });

  it('wires the gate into acceptance and preserves its evidence even when blocked', () => {
    expect(workflow).toContain('GHOSTTOWN_E2E_AGENTIC: "1"');
    expect(workflow).toContain('npx wrangler d1 migrations apply DB --env acceptance --remote');
    expect(workflow).toContain('timeout --foreground 35m node tests/e2e/30-day-sprint-acceptance.mjs');
    expect(workflow).toContain('timeout --foreground 6m node tests/e2e/sprint-without-gml-acceptance.mjs');
    expect(workflow).toContain('SPRINT_WITHOUT_GML_OUTCOME');
    expect(workflow).toContain('node scripts/acceptance-go-live-gate-report.mjs');
    expect(workflow).toContain('GO_LIVE_GATE_OUTCOME');
    expect(workflow).toContain('Upload acceptance execution evidence');
  });
});
