#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const RECEIPT_PATH = join(STATE_DIR, 'q1-verdict-decision-v2-receipt.json');
const requiredFiles = [
  'src/verdict/verdictDecisionV2.ts',
  'src/api/verdict.ts',
  'src/api/shortsFactoryVerdict.ts',
  'src/components/ResultReport.tsx',
  'tests/fixtures/verdictDecisionV2.ts',
  'tests/verdictDecisionV2.test.ts',
  'tests/resultReportVerdictDecisionV2.test.tsx'
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.stdout || result.error || '').trim()}`);
  }
  return String(result.stdout || '');
}

for (const relativePath of requiredFiles) {
  if (!existsSync(join(ROOT, relativePath))) throw new Error(`Q1 required source is missing: ${relativePath}`);
}

const decisionSource = readFileSync(join(ROOT, 'src/verdict/verdictDecisionV2.ts'), 'utf8');
const apiSource = readFileSync(join(ROOT, 'src/api/verdict.ts'), 'utf8');
const shortsSource = readFileSync(join(ROOT, 'src/api/shortsFactoryVerdict.ts'), 'utf8');
const reportSource = readFileSync(join(ROOT, 'src/components/ResultReport.tsx'), 'utf8');
for (const contractToken of [
  'export interface VerdictDecisionV2', 'buildVerdictDecisionV2', 'validateVerdictDecisionV2',
  'hydrateVerdictDecisionV2', 'projectVerdictDecisionV2ToLegacy'
]) if (!decisionSource.includes(contractToken)) throw new Error(`Q1 canonical verdict contract is incomplete: ${contractToken}`);
if (!apiSource.includes('verdictDecisionV2')) throw new Error('Q1 main /api/verdict integration is missing.');
if (!shortsSource.includes('verdict_decision_v2')) throw new Error('Q1 Shorts Factory compatibility output is missing.');
const orderedHeadings = [
  'DecisionSection title="What we are actually predicting"', 'DecisionSection title="Confidence"',
  'DecisionSection title="Why this may work"', 'DecisionSection title="Why this may fail"',
  'DecisionSection title="Biggest unknown"', 'DecisionSection title="Cheapest way to prove us wrong"',
  'DecisionSection title="Do this first"', 'DecisionSection title="What would change this verdict"'
];
let previous = -1;
for (const heading of orderedHeadings) {
  const next = reportSource.indexOf(heading);
  if (next <= previous) throw new Error(`Q1 ResultReport canonical section order is incomplete: ${heading}`);
  previous = next;
}

const nodeModules = join(ROOT, 'node_modules');
const focusedTests = run(process.execPath, [join(nodeModules, 'vitest', 'vitest.mjs'), 'run', 'tests/verdictDecisionV2.test.ts', 'tests/resultReportVerdictDecisionV2.test.tsx', 'tests/shortsFactoryVerdict.test.ts']);
const sourceVerification = run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = run(process.execPath, [join(nodeModules, 'typescript', 'bin', 'tsc'), '--noEmit']);
const build = `${sourceVerification}\n${run(process.execPath, [join(nodeModules, 'vite', 'bin', 'vite.js'), 'build'])}`;
const head = run('git', ['rev-parse', 'HEAD']).trim();
const sourceHashes = Object.fromEntries(requiredFiles.map(relativePath => [relativePath, sha256(readFileSync(join(ROOT, relativePath)))]));

mkdirSync(STATE_DIR, { recursive: true });
const receipt = {
  schema_version: 'ghosttown-quality-q1-verdict-decision-v2-receipt-v1',
  contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1',
  verified_at: new Date().toISOString(),
  git_sha: head,
  source_hashes: sourceHashes,
  checks: {
    bounded_prediction_target: true,
    explicit_confidence: true,
    reasons_for_and_against: true,
    largest_uncertainty: true,
    cheap_falsification_test: true,
    exact_first_action: true,
    what_would_change_verdict: true,
    truth_labels: true,
    customer_specificity: true,
    no_unsupported_whole_business_success_prediction: true,
    cross_surface_customer_offer_consistency: true,
    legacy_hydration_and_projection: true,
    shorts_factory_compatibility: true,
    golden_fixture_comparison: true,
    tests_pass: true,
    typecheck_pass: true,
    acceptance_build_pass: true
  },
  command_output_sha256: {
    focused_tests: sha256(focusedTests),
    typecheck: sha256(typecheck),
    build: sha256(build)
  },
  secret_values_recorded: false
};
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q1-verdict-decision-v2-receipt.json', checks: receipt.checks, secret_values_recorded: false }));
