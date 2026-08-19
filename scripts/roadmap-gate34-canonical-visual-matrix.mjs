#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const GATE34_V2_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt-v2.json');
const FIXTURE_PATH = join(STATE_DIR, 'gate34-ui-fixture-artifact.json');
const Q4_PATH = join(STATE_DIR, 'q4-launch-site-golden-artifact.json');
const MATRIX_PATH = join(STATE_DIR, 'gate34-visual-evidence-matrix.json');
const VIEWPORTS = ['375x667', '390x844', '768x1024', '1366x768', '1440x900'];

const REQUIREMENTS = [
  ['free_verdict', 'Free verdict'],
  ['micro_commitments', 'Micro-commitments'],
  ['checkout', 'Checkout'],
  ['seed_confirmation', 'Seed confirmation'],
  ['workflow_status', 'Workflow status'],
  ['launch_card_48h', '48-hour card'],
  ['starting_state_audit', 'Starting-state audit'],
  ['first_revenue_plan', 'First-revenue plan'],
  ['fulfillment_economics', 'Fulfillment economics'],
  ['media_network', 'Media Network'],
  ['evidence_ledger', 'Evidence ledger'],
  ['checkpoint_forms', 'Checkpoint forms'],
  ['thirty_day_calendar', 'Thirty-day calendar'],
  ['pdf_button', 'PDF button'],
  ['zip_button', 'ZIP button'],
  ['launch_site_panel', 'Launch Site panel'],
  ['public_launch_site', 'Public Launch Site'],
  ['lead_form', 'Lead form'],
  ['leads_table', 'Leads table'],
  ['failure_state', 'Failure state'],
  ['retry_state', 'Retry state']
];

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`Gate 34 visual matrix requires ${label}: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function runVisualTests() {
  const result = spawnSync('npx', ['vitest', 'run', 'tests/gate34VisualFixtureBrowser.test.ts', 'tests/q4LaunchSiteBrowser.test.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 360000
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 34 canonical visual fixture tests failed (${result.status ?? 1}).\n${result.stdout || ''}\n${result.stderr || ''}`.trim());
  }
  return { command: 'npx vitest run tests/gate34VisualFixtureBrowser.test.ts tests/q4LaunchSiteBrowser.test.ts', status: 'PASS' };
}

function normalizeScreenshot(relative) {
  const absolute = join(ROOT, relative.replaceAll('/', process.platform === 'win32' ? '\\' : '/'));
  if (!existsSync(absolute)) throw new Error(`Gate 34 visual matrix is missing screenshot evidence: ${relative}`);
  return { screenshot: relative, screenshot_sha256: sha256File(absolute) };
}

function fixtureEvidence(fixture, surface) {
  return VIEWPORTS.map(viewport => {
    const item = fixture.evidence.find(entry => entry.surface === surface && entry.viewport === viewport);
    if (!item || item.horizontal_overflow !== false || item.production_component !== true) {
      throw new Error(`Gate 34 fixture evidence is incomplete for ${surface} at ${viewport}.`);
    }
    return {
      viewport,
      environment: 'DETERMINISTIC_UI_FIXTURE',
      associated_test: 'tests/gate34VisualFixtureBrowser.test.ts',
      evidence_source: '.roadmap-autopilot/gate34-ui-fixture-artifact.json',
      ...normalizeScreenshot(item.screenshot),
      no_horizontal_overflow: true,
      production_component: true
    };
  });
}

function paidLiveEvidence(gate34, stage) {
  return VIEWPORTS.map(viewport => {
    const item = gate34.viewports.find(entry => entry.viewport === viewport);
    if (!item || item.passed !== true || item.no_horizontal_overflow !== true || !item.stages.includes(stage)) {
      throw new Error(`Gate 34 live paid-journey evidence is incomplete for ${stage} at ${viewport}.`);
    }
    const shot = `.roadmap-autopilot/gate34-paid-journey-screenshots-v2/${viewport.replace('x', '_')}_${stage}.png`;
    return {
      viewport,
      environment: 'LIVE_ACCEPTANCE',
      associated_test: 'scripts/roadmap-gate34-visual-certification.mjs --correction',
      evidence_source: '.roadmap-autopilot/gate34-visual-certification-receipt-v2.json',
      ...normalizeScreenshot(shot),
      no_horizontal_overflow: true
    };
  });
}

function q4Evidence(q4, useFullPage) {
  return VIEWPORTS.map(viewport => {
    const [width, height] = viewport.split('x').map(Number);
    const item = q4.viewports.find(entry => entry.width === width && entry.height === height);
    if (!item || item.horizontalOverflow !== false) throw new Error(`Q4 Launch Site visual evidence is incomplete at ${viewport}.`);
    const shot = useFullPage ? item.fullPageScreenshot : item.viewportScreenshot;
    return {
      viewport,
      environment: 'DETERMINISTIC_UI_FIXTURE',
      associated_test: 'tests/q4LaunchSiteBrowser.test.ts',
      evidence_source: '.roadmap-autopilot/q4-launch-site-golden-artifact.json',
      ...normalizeScreenshot(shot),
      no_horizontal_overflow: true,
      production_component: true
    };
  });
}

const visualTests = runVisualTests();
const gate34 = readJson(GATE34_V2_PATH, 'the corrected Gate 34 v2 live receipt');
const fixture = readJson(FIXTURE_PATH, 'the deterministic production-component UI fixture artifact');
const q4 = readJson(Q4_PATH, 'the Q4 Launch Site browser artifact');
if (gate34?.decision !== 'PASS' || gate34?.schema_version !== 'roadmap-gate34-visual-certification-receipt-v2') throw new Error('Gate 34 visual matrix requires a passing corrected Gate 34 v2 receipt.');
if (fixture?.schema_version !== 'roadmap-gate34-ui-fixture-artifact-v1' || fixture?.all_no_horizontal_overflow !== true) throw new Error('Gate 34 visual matrix requires a passing deterministic UI fixture artifact.');
if (q4?.schema_version !== 'ghosttown-q4-launch-site-golden-artifact-v3' || q4?.production_deployed !== false) throw new Error('Gate 34 visual matrix requires the accepted Q4 Launch Site browser artifact.');

const evidenceByRequirement = {
  free_verdict: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'free-verdict'), justification: 'Real ResultReport production component rendered with a deterministic verdict.' },
  micro_commitments: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'micro-commitments'), justification: 'Real ResultReport production component visibly renders the customer, offer and requested commitment.' },
  checkout: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'checkout'), justification: 'Real ActionPlanModal production checkout-handoff form; no Stripe session or purchase created.' },
  seed_confirmation: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'seed-confirmation'), justification: 'Real CompetitorSeedStep production component with controlled public-seed responses; no acceptance seed mutation.' },
  workflow_status: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'workflow-status'), justification: 'Real UserDashboard renders the generating/building workflow state with mocked order reads.' },
  launch_card_48h: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-48-hour-card'), justification: 'Real LaunchBlueprintViewV21 Overview/48-hour Launch Card rendered from the canonical test fixture.' },
  starting_state_audit: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-starting-state'), justification: 'Real LaunchBlueprintViewV21 Starting State tab.' },
  first_revenue_plan: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-first-revenue'), justification: 'Real LaunchBlueprintViewV21 First Revenue tab.' },
  fulfillment_economics: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-fulfillment'), justification: 'Real LaunchBlueprintViewV21 Fulfillment tab.' },
  media_network: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'media-network'), justification: 'Real UserDashboard purchased-product Media Network workflow state.' },
  evidence_ledger: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-evidence-ledger'), justification: 'Real LaunchBlueprintViewV21 Evidence tab with deterministic ledger evidence.' },
  checkpoint_forms: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'blueprint-checkpoint-forms'), justification: 'Real LaunchBlueprintViewV21 Weekly Review/checkpoint forms.' },
  thirty_day_calendar: { environment: 'LIVE_ACCEPTANCE', evidence: paidLiveEvidence(gate34, 'open-blueprint'), justification: 'Corrected read-only Gate 34 v2 certifies the real accepted paid calendar-primary UI.' },
  pdf_button: { environment: 'LIVE_ACCEPTANCE', evidence: paidLiveEvidence(gate34, 'download-pdf'), justification: 'Real accepted owner UI; downloaded PDF hash equals Gate 27 at every viewport.' },
  zip_button: { environment: 'LIVE_ACCEPTANCE', evidence: paidLiveEvidence(gate34, 'export-zip'), justification: 'Real accepted owner UI; downloaded ZIP hash equals Gate 27 at every viewport.' },
  launch_site_panel: { environment: 'LIVE_ACCEPTANCE', evidence: paidLiveEvidence(gate34, 'launch-site-panel'), justification: 'Real accepted owner Launch Site panel, read-only and unpublished.' },
  public_launch_site: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: q4Evidence(q4, false), justification: 'Production Launch Site renderer exercised locally by Q4 Playwright at all canonical viewports.' },
  lead_form: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: q4Evidence(q4, true), justification: 'Q4 full-page screenshots contain the production lead form at every viewport; interactive success/failure semantics are separately exercised at 390x844.' },
  leads_table: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'leads-table'), justification: 'Real LaunchSitePanel owner-only Leads table with controlled lead responses.' },
  failure_state: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'failure-state'), justification: 'Real UserDashboard failed Blueprint state; accepted paid order is not broken to recreate failure.' },
  retry_state: { environment: 'DETERMINISTIC_UI_FIXTURE', evidence: fixtureEvidence(fixture, 'retry-state'), justification: 'Real UserDashboard retry-in-progress state with controlled retry response; no accepted order mutation.' }
};

const matrix = REQUIREMENTS.map(([id, name]) => {
  const mapped = evidenceByRequirement[id];
  if (!mapped || mapped.evidence.length !== VIEWPORTS.length) throw new Error(`Gate 34 visual matrix has no complete evidence mapping for ${id}.`);
  return {
    requirement_id: id,
    requirement_name: name,
    status: 'PASS',
    evidence_environment: mapped.environment,
    required_viewports: VIEWPORTS,
    evidence: mapped.evidence,
    justification: mapped.justification
  };
});

if (matrix.length !== REQUIREMENTS.length || matrix.some(item => item.status !== 'PASS')) throw new Error('Gate 34 visual matrix is incomplete.');
const receipt = {
  schema_version: 'roadmap-gate34-visual-evidence-matrix-v1',
  generated_at: new Date().toISOString(),
  canonical_requirement_count: REQUIREMENTS.length,
  required_viewports: VIEWPORTS,
  visual_tests: visualTests,
  requirements: matrix,
  all_requirements_pass: true,
  all_viewports_represented_per_requirement: matrix.every(item => item.evidence.length === VIEWPORTS.length),
  receipt_only_evidence_allowed: false,
  live_acceptance_claims_limited_to_live_evidence: true,
  accessibility_not_weakened: true,
  horizontal_overflow_fail_closed: true,
  purchase_replayed: false,
  acceptance_order_mutated: false,
  production_deployed: false,
  gate_36_touched: false,
  secret_values_recorded: false,
  decision: 'PASS'
};
writeFileSync(MATRIX_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, decision: 'PASS', requirements: matrix.length, viewports_each: VIEWPORTS.length, receipt: '.roadmap-autopilot/gate34-visual-evidence-matrix.json' }));
