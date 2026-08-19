import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const readText = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Gate 34 canonical visual evidence matrix', () => {
  it('enumerates every literal canonical surface and all five required viewports', () => {
    const script = readText('scripts/roadmap-gate34-canonical-visual-matrix.mjs');
    for (const label of [
      'Free verdict', 'Micro-commitments', 'Checkout', 'Seed confirmation', 'Workflow status',
      '48-hour card', 'Starting-state audit', 'First-revenue plan', 'Fulfillment economics', 'Media Network',
      'Evidence ledger', 'Checkpoint forms', 'Thirty-day calendar', 'PDF button', 'ZIP button',
      'Launch Site panel', 'Public Launch Site', 'Lead form', 'Leads table', 'Failure state', 'Retry state'
    ]) expect(script, label).toContain(label);
    for (const viewport of ['375x667', '390x844', '768x1024', '1366x768', '1440x900']) expect(script, viewport).toContain(viewport);
    expect(script).toContain('canonical_requirement_count: REQUIREMENTS.length');
    expect(script).toContain('all_viewports_represented_per_requirement');
  });

  it('requires screenshot files rather than receipt-only assertions and labels fixture evidence truthfully', () => {
    const script = readText('scripts/roadmap-gate34-canonical-visual-matrix.mjs');
    expect(script).toContain('normalizeScreenshot');
    expect(script).toContain('is missing screenshot evidence');
    expect(script).toContain("environment: 'DETERMINISTIC_UI_FIXTURE'");
    expect(script).toContain("environment: 'LIVE_ACCEPTANCE'");
    expect(script).toContain('receipt_only_evidence_allowed: false');
    expect(script).toContain('live_acceptance_claims_limited_to_live_evidence: true');
  });

  it('uses real production React components for deterministic failure/retry and non-mutating surfaces', () => {
    const fixture = readText('tests/fixtures/gate34VisualFixtureApp.tsx');
    const browser = readText('tests/gate34VisualFixtureBrowser.test.ts');
    for (const component of ['ResultReport', 'ActionPlanModal', 'CompetitorSeedStep', 'UserDashboard', 'LaunchSitePanel', 'LaunchBlueprintViewV21']) {
      expect(fixture).toContain(component);
    }
    expect(browser).toContain("'failure-state'");
    expect(browser).toContain("'retry-state'");
    expect(browser).toContain('Retry Blueprint');
    expect(browser).toContain('Checking…');
    expect(browser).toContain('horizontalOverflow');
    expect(browser).toContain("environment: 'DETERMINISTIC_UI_FIXTURE'");
  });

  it('serializes the two heavy Playwright suites and preserves suite-specific diagnostics', () => {
    const script = readText('scripts/roadmap-gate34-canonical-visual-matrix.mjs');
    expect(script).toContain("runVisualSuite('tests/gate34VisualFixtureBrowser.test.ts', 300000)");
    expect(script).toContain("runVisualSuite('tests/q4LaunchSiteBrowser.test.ts', 240000)");
    expect(script).toContain("'--no-file-parallelism'");
    expect(script).toContain('file_parallelism: false');
    expect(script).toContain('canonical visual suite ${file} failed');
  });

  it('does not recreate purchase, production, or accepted order mutations', () => {
    const script = readText('scripts/roadmap-gate34-canonical-visual-matrix.mjs');
    expect(script).toContain('purchase_replayed: false');
    expect(script).toContain('acceptance_order_mutated: false');
    expect(script).toContain('production_deployed: false');
    expect(script).toContain('gate_36_touched: false');
    expect(script).toContain('secret_values_recorded: false');
  });
});
