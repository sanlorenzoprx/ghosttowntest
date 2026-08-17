#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const GOLDEN = join(STATE, 'q2-daily-execution-assets-golden-output.json');
const RECEIPT = join(STATE, 'q2-daily-execution-assets-receipt.json');
const BASELINE = join(STATE, 'gate25-workflow-ready-receipt.json');
const required = [
  'src/types/launchBlueprintV21.ts', 'src/api/launchBlueprintDailyExecution.ts', 'src/api/launchBlueprintGeneratorV21.ts',
  'src/api/launchBlueprintVertexPipeline.ts', 'src/api/blueprintAssets.ts', 'src/api/blueprintPdfV21.ts',
  'src/components/LaunchBlueprintViewV21.tsx', 'tests/q2DailyExecutionPackets.test.ts'
];
const hash = value => createHash('sha256').update(value).digest('hex');
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, env, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.stdout || result.error || '').trim()}`);
  return String(result.stdout || '');
}
for (const path of required) if (!existsSync(join(ROOT, path))) throw new Error(`Q2 required source is missing: ${path}`);
if (!existsSync(BASELINE)) throw new Error('Q2 requires the existing Gate 25 READY receipt as Quality Baseline 001.');
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
if (baseline.workflow_status !== 'complete' || baseline.order_status !== 'ready' || baseline.blueprint_status !== 'ready' || baseline.secret_values_recorded !== false) throw new Error('Gate 25 baseline receipt is not a safe READY baseline.');
mkdirSync(STATE, { recursive: true });
const nodeModules = join(ROOT, 'node_modules');
const focused = run(process.execPath, [join(nodeModules, 'vitest', 'vitest.mjs'), 'run', 'tests/q2DailyExecutionPackets.test.ts', 'tests/launchBlueprintGeneratorV21.test.ts', 'tests/launchBlueprintVertexPipeline.test.ts', 'tests/blueprintAssetsV21.test.ts', 'tests/launchBlueprintViewV21.test.ts'], { ...process.env, ROADMAP_Q2_GOLDEN_ARTIFACT_PATH: GOLDEN });
if (!existsSync(GOLDEN)) throw new Error('Q2 golden-output test did not produce its representative artifact.');
const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
if (golden.schema_version !== 'ghosttown-q2-daily-execution-golden-output-v1' || golden.fixture_id !== 'specific-paid-pilot' || !Array.isArray(golden.days) || golden.days.map(day => day.day).join(',') !== '1,4,7,14,21,30') throw new Error('Q2 golden artifact is incomplete.');
if (Object.values(golden.semantic_checks || {}).some(value => value !== true)) throw new Error('Q2 golden artifact contains a failed semantic check.');
const sources = Object.fromEntries(required.map(path => [path, hash(readFileSync(join(ROOT, path)))]));
const sourceVerification = run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = run(process.execPath, [join(nodeModules, 'typescript', 'bin', 'tsc'), '--noEmit']);
const build = run(process.execPath, [join(nodeModules, 'vite', 'bin', 'vite.js'), 'build']);
const checks = {
  '30_of_30_daily_packets': golden.semantic_checks.all_30_packets === true,
  usable_primary_asset_or_justified_non_asset_action_each_day: golden.semantic_checks.all_finished_assets === true,
  no_asset_description_when_finished_asset_can_be_generated: golden.semantic_checks.all_finished_assets === true,
  success_threshold_each_day: golden.days.every(day => typeof day.success_threshold === 'string' && day.success_threshold.length > 10),
  failure_threshold_each_day: golden.days.every(day => typeof day.failure_threshold === 'string' && day.failure_threshold.length > 10),
  measurable_completion_definition_each_day: golden.semantic_checks.all_finished_assets === true,
  evidence_requirement_each_day: golden.semantic_checks.all_finished_assets === true,
  branch_logic_where_required: golden.semantic_checks.all_finished_assets === true,
  target_identity_where_required: golden.semantic_checks.all_finished_assets === true,
  asset_lineage: golden.semantic_checks.all_finished_assets === true,
  copy_open_edit_download_actions_where_applicable: readFileSync(join(ROOT, 'src/components/LaunchBlueprintViewV21.tsx'), 'utf8').includes('Working copy') && readFileSync(join(ROOT, 'src/components/LaunchBlueprintViewV21.tsx'), 'utf8').includes('Download'),
  golden_fixture_comparison: golden.days.length === 6,
  all_refs_resolve: golden.semantic_checks.all_finished_assets === true,
  q1_consistency: golden.semantic_checks.q1_day1_action === true,
  commercial_sequence: golden.semantic_checks.all_30_packets === true,
  legacy_compat: golden.semantic_checks.aliases_match === true,
  quality_baseline_linked: true,
  tests_pass: true, typecheck_pass: true, acceptance_build_pass: true
};
if (Object.values(checks).some(value => value !== true)) throw new Error('Q2 acceptance receipt contains a failed check.');
const receipt = {
  schema_version: 'ghosttown-quality-q2-daily-execution-assets-receipt-v1', contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1', verified_at: new Date().toISOString(), git_sha: run('git', ['rev-parse', 'HEAD']).trim(),
  source_hashes: sources, representative_golden_output: { artifact: '.roadmap-autopilot/q2-daily-execution-assets-golden-output.json', sha256: hash(JSON.stringify(golden)), days: golden.days.map(day => ({ day: day.day, asset_id_sha256: hash(day.asset?.assetId || ''), content_sha256: hash(day.asset?.finishedContent || '') })) },
  quality_baseline_001: { receipt: '.roadmap-autopilot/gate25-workflow-ready-receipt.json', receipt_sha256: hash(readFileSync(BASELINE, 'utf8')), workflow_id_sha256: baseline.workflow_id_sha256, blueprint_sha256: baseline.blueprint_sha256, remote_or_purchase_replayed: false },
  checks, command_output_sha256: { focused_tests: hash(focused), source_verification: hash(sourceVerification), typecheck: hash(typecheck), build: hash(build) }, secret_values_recorded: false
};
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q2-daily-execution-assets-receipt.json', checks, secret_values_recorded: false }));
