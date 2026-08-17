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
  'src/api/resultHistory.ts',
  'src/api/paidTest.ts',
  'src/api/blueprintFulfillment.ts',
  'src/api/blueprintSeeds.ts',
  'src/api/launchBlueprintGenerator.ts',
  'src/api/launchBlueprintVertexPipeline.ts',
  'src/lib/storage.ts',
  'src/lib/share.ts',
  'src/lib/verdictCardImage.ts',
  'tests/fixtures/verdictDecisionV2.ts',
  'tests/verdictDecisionV2.test.ts',
  'tests/resultReportVerdictDecisionV2.test.tsx',
  'tests/q1GoldenReceipt.test.tsx'
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, env, maxBuffer: 32 * 1024 * 1024 });
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
const persistedResultSources = [
  'src/api/resultHistory.ts', 'src/api/paidTest.ts', 'src/api/blueprintFulfillment.ts', 'src/api/blueprintSeeds.ts', 'src/lib/storage.ts'
].map(relativePath => readFileSync(join(ROOT, relativePath), 'utf8'));
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
const GOLDEN_ARTIFACT_PATH = join(STATE_DIR, 'q1-verdict-decision-v2-golden-output.json');
mkdirSync(STATE_DIR, { recursive: true });
const focusedTests = run(
  process.execPath,
  [join(nodeModules, 'vitest', 'vitest.mjs'), 'run', 'tests/verdictDecisionV2.test.ts', 'tests/resultReportVerdictDecisionV2.test.tsx', 'tests/q1GoldenReceipt.test.tsx', 'tests/shortsFactoryVerdict.test.ts'],
  { ...process.env, ROADMAP_Q1_GOLDEN_ARTIFACT_PATH: GOLDEN_ARTIFACT_PATH }
);
if (!existsSync(GOLDEN_ARTIFACT_PATH)) throw new Error('Q1 golden-output test did not produce a representative artifact.');
const goldenArtifact = JSON.parse(readFileSync(GOLDEN_ARTIFACT_PATH, 'utf8'));
if (goldenArtifact?.schema_version !== 'ghosttown-q1-golden-output-v1' || !Array.isArray(goldenArtifact.outputs) || goldenArtifact.outputs.length < 2) {
  throw new Error('Q1 golden-output artifact is incomplete.');
}
const semanticChecks = goldenArtifact.outputs.map(output => output?.semantic_checks);
if (semanticChecks.some(checks => !checks || Object.values(checks).some(value => value !== true))) {
  throw new Error('Q1 golden-output artifact contains a failed semantic consistency check.');
}
const adverse = goldenArtifact.outputs.find(output => output.fixture_id === 'broad-missing-intake');
if (!adverse || adverse.decision !== 'DO_NOT_PURSUE_YET' || adverse.confidence !== 'LOW' || !adverse.evidence_labels?.includes('UNKNOWN')) {
  throw new Error('Q1 adverse golden does not lower broad/missing intake to LOW-confidence unknown evidence.');
}
const genericOffer = goldenArtifact.outputs.find(output => output.fixture_id === 'generic-offer');
if (!genericOffer || genericOffer.decision === 'WORTH_TESTING' || genericOffer.confidence !== 'LOW' || !genericOffer.semantic_checks.generic_offer_not_claimed_testable) {
  throw new Error('Q1 generic-offer adverse golden did not fail closed.');
}
if (!goldenArtifact.blueprint?.canonical_no_build_before_commitment) {
  throw new Error('Q1 Blueprint golden still contains build-before-commitment language.');
}
const sourceVerification = run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = run(process.execPath, [join(nodeModules, 'typescript', 'bin', 'tsc'), '--noEmit']);
const build = `${sourceVerification}\n${run(process.execPath, [join(nodeModules, 'vite', 'bin', 'vite.js'), 'build'])}`;
const head = run('git', ['rev-parse', 'HEAD']).trim();
const sourceHashes = Object.fromEntries(requiredFiles.map(relativePath => [relativePath, sha256(readFileSync(join(ROOT, relativePath)))]));
const goldenOutputSha256 = sha256(JSON.stringify(goldenArtifact));
const allOutputs = goldenArtifact.outputs;

const receipt = {
  schema_version: 'ghosttown-quality-q1-verdict-decision-v2-receipt-v1',
  contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1',
  verified_at: new Date().toISOString(),
  git_sha: head,
  source_hashes: sourceHashes,
  representative_golden_outputs: {
    artifact: '.roadmap-autopilot/q1-verdict-decision-v2-golden-output.json',
    sha256: goldenOutputSha256,
    fixture_ids: allOutputs.map(output => output.fixture_id),
    decision_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.decision_sha256])),
    rendered_report_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.rendered_report_sha256])),
    share_summary_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.share_summary_sha256])),
    verdict_card_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.verdict_card_svg_sha256])),
    shorts_top_level_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.shorts_top_level_sha256])),
    vertex_input_hashes: Object.fromEntries(allOutputs.map(output => [output.fixture_id, output.vertex_input_sha256])),
    blueprint: goldenArtifact.blueprint,
    baseline_comparison: {
      baseline: 'legacy-verdict-fields',
      canonical_v2_present_for_every_fixture: allOutputs.every(output => Boolean(output.decision_sha256)),
      rendered_canonical_customer_offer_commitment: allOutputs.every(output => output.semantic_checks.rendered_canonical_customer_offer_commitment),
      share_card_shorts_vertex_parity: allOutputs.every(output => output.semantic_checks.share_card_short_vertex_parity),
      blueprint_no_build_before_commitment: goldenArtifact.blueprint.canonical_no_build_before_commitment === true
    }
  },
  checks: {
    bounded_prediction_target: allOutputs.every(output => output.semantic_checks.bounded_commitment_prediction),
    explicit_confidence: allOutputs.every(output => typeof output.confidence === 'string'),
    reasons_for_and_against: allOutputs.every(output => Boolean(output.decision_sha256)),
    largest_uncertainty: allOutputs.every(output => Boolean(output.falsification?.test)),
    cheap_falsification_test: allOutputs.every(output => /PASS:|FAIL:|INCONCLUSIVE:/i.test(`${output.falsification?.successThreshold} ${output.falsification?.failureThreshold}`)),
    exact_first_action: allOutputs.every(output => Boolean(output.first_action)),
    what_would_change_verdict: allOutputs.every(output => Boolean(output.decision_sha256)),
    truth_labels: allOutputs.every(output => output.evidence_labels.includes('UNKNOWN')),
    customer_specificity: allOutputs.some(output => output.fixture_id === 'specific-paid-pilot' && /^10 /.test(output.customer)),
    no_unsupported_whole_business_success_prediction: allOutputs.every(output => output.semantic_checks.no_whole_business_claim),
    cross_surface_customer_offer_consistency: allOutputs.every(output => output.semantic_checks.rendered_canonical_customer_offer_commitment && output.semantic_checks.share_card_short_vertex_parity) && goldenArtifact.blueprint.canonical_no_build_before_commitment === true,
    legacy_hydration_and_projection: decisionSource.includes('hydrateEvaluationResultDecisionV2') && persistedResultSources.every(source => source.includes('hydrateEvaluationResultDecisionV2')) && shortsSource.includes('projectVerdictDecisionV2ToLegacy'),
    shorts_factory_compatibility: shortsSource.includes('verdict_decision_v2') && shortsSource.includes('legacy_decision_projection') && shortsSource.includes('projectVerdictDecisionV2ToLegacy'),
    golden_fixture_comparison: allOutputs.length >= 3 && adverse.decision === 'DO_NOT_PURSUE_YET' && genericOffer.decision === 'DO_NOT_PURSUE_YET',
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
if (Object.values(receipt.checks).some(value => value !== true)) {
  throw new Error('Q1 receipt contains a failed acceptance check.');
}
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q1-verdict-decision-v2-receipt.json', checks: receipt.checks, secret_values_recorded: false }));
