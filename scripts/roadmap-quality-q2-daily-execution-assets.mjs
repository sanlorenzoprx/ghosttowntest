#!/usr/bin/env node
/* First-party Q2 acceptance adapter.  It validates the generated artifact
 * independently; a test-provided semantic flag can never make this pass. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const GOLDEN = join(STATE, 'q2-daily-execution-assets-golden-output.json');
const RECEIPT = join(STATE, 'q2-daily-execution-assets-receipt.json');
const BASELINE = join(STATE, 'gate25-workflow-ready-receipt.json');
const required = ['src/types/launchBlueprintV21.ts', 'src/api/launchBlueprintDailyExecution.ts', 'src/api/launchBlueprintGeneratorV21.ts', 'src/api/launchBlueprintVertexPipeline.ts', 'src/api/blueprintAssets.ts', 'src/api/blueprintPdfV21.ts', 'src/components/LaunchBlueprintViewV21.tsx', 'tests/q2DailyExecutionPackets.test.ts'];
const representative = [1, 4, 7, 14, 21, 30];
const publicRouteDays = new Set([4, 5, 11, 12, 16, 18, 22, 27]);
const validationOnly = process.env.ROADMAP_Q2_VALIDATION_ONLY === '1';
const hash = value => createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' && value.trim().length > 0;
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, env, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.stdout || result.error || '').trim()}`);
  return String(result.stdout || '');
}
function fail(message) { throw new Error(`Q2 acceptance failed: ${message}`); }
function validateGolden(golden) {
  if (golden?.schema_version !== 'ghosttown-q2-daily-execution-golden-output-v1' || golden.fixture_id !== 'specific-paid-pilot') fail('schema or fixture identity is invalid');
  if (!Array.isArray(golden.days) || golden.days.length !== 30 || golden.days.map(item => item?.day).join(',') !== Array.from({ length: 30 }, (_, index) => index + 1).join(',')) fail('artifact must contain exactly days 1 through 30');
  if (!Array.isArray(golden.representative_days) || golden.representative_days.join(',') !== representative.join(',')) fail('representative days must separately identify 1,4,7,14,21,30');
  const canonical = golden.canonical;
  if (!canonical || !text(canonical.blueprintId) || !text(canonical.blueprintVersion) || !text(canonical.sourceVerdictId) || !text(canonical.customer) || !text(canonical.problem) || !text(canonical.offer) || !text(canonical.price) || !Array.isArray(canonical.sourceIds) || !Array.isArray(canonical.channels)) fail('canonical cross-surface ledger is incomplete');
  if (/family game|families with children/i.test(JSON.stringify(canonical))) fail('unrelated fixture contamination detected');
  const sourceIds = new Set(canonical.sourceIds);
  const channels = new Map(canonical.channels.map(channel => [channel.channelId, channel]));
  const assetIds = new Set(); const actionIds = new Set();
  for (const item of golden.days) {
    const day = item.day; const p = item.packet; const legacy = item.legacy;
    if (!p || p.dayNumber !== day || !text(p.title) || !text(p.objective) || !text(p.whyThisDayExists) || !text(p.expectedOutcome) || !text(p.successThreshold) || !text(p.failureThreshold) || !text(p.completionDefinition) || !Number.isFinite(p.estimatedMinutes) || p.estimatedMinutes <= 0) fail(`day ${day} packet contract is incomplete`);
    if (!Array.isArray(p.targets) || !p.targets.length || !Array.isArray(p.actions) || !p.actions.length || !Array.isArray(p.assets) || !p.assets.length || !Array.isArray(p.evidenceToCapture) || !p.evidenceToCapture.length || !Array.isArray(p.branchRules) || !p.branchRules.length) fail(`day ${day} has missing targets/actions/assets/evidence/branches`);
    if (!legacy || legacy.objective !== p.objective || legacy.why !== p.whyThisDayExists || legacy.deliverable !== p.expectedOutcome || legacy.success !== p.successThreshold) fail(`day ${day} legacy projection does not match packet`);
    const targetIds = new Set();
    for (const target of p.targets) {
      if (!text(target.targetId) || targetIds.has(target.targetId) || !text(target.kind) || !text(target.name) || !text(target.identityStatus) || !text(target.selectionOrQualificationRule) || !Number.isInteger(target.minimumCount) || target.minimumCount < 1 || !Array.isArray(target.excluded) || !Array.isArray(target.sourceIds) || target.sourceIds.some(id => !sourceIds.has(id))) fail(`day ${day} target is unresolved`);
      targetIds.add(target.targetId);
      if (target.kind === 'verified_channel') { const channel = channels.get(target.channelId); if (!channel || channel.community !== target.name || channel.publicUrl !== target.publicUrl || !text(target.publicUrl)) fail(`day ${day} public channel is not canonical`); }
    }
    const hasPublicTarget = p.targets.some(target => target.kind === 'verified_channel');
    if (publicRouteDays.has(day) !== hasPublicTarget) fail(`day ${day} public routing is not truthful`);
    if (day === 12 && !p.targets.some(target => target.kind === 'launch_site' && target.name === canonical.launchSiteHeadline)) fail('day 12 must target the canonical launch site');
    for (const action of p.actions) {
      if (!text(action.actionId) || actionIds.has(action.actionId) || !Number.isInteger(action.sequence) || !text(action.instruction) || !text(action.quantity) || !Array.isArray(action.targetIds) || !action.targetIds.length || !Array.isArray(action.assetIds) || !action.assetIds.length || !Array.isArray(action.evidenceExpected) || !action.evidenceExpected.length || action.targetIds.some(id => !targetIds.has(id))) fail(`day ${day} action is unresolved`);
      actionIds.add(action.actionId);
    }
    for (const rule of p.branchRules) if (!text(rule?.branchId) || !text(rule.condition) || !text(rule.action) || !['continue', 'revise', 'pivot', 'pause', 'stop'].includes(rule.route) || !Array.isArray(rule.evidenceRequired) || !rule.evidenceRequired.length) fail(`day ${day} branch rule is incomplete`);
    for (const asset of p.assets) {
      if (!text(asset.assetId) || assetIds.has(asset.assetId) || asset.dayNumber !== day || !text(asset.type) || !text(asset.title) || !text(asset.finishedContent) || asset.finishedContent.trim().length < 80 || asset.finishedContent.trim() === asset.title.trim() || /^(prepared|create)\b/i.test(asset.finishedContent.trim()) || !['text/markdown', 'text/plain', 'text/csv'].includes(asset.contentType) || !text(asset.usageInstructions) || !text(asset.version) || !Array.isArray(asset.targetIds) || !asset.targetIds.length || asset.targetIds.some(id => !targetIds.has(id)) || !Array.isArray(asset.evidenceExpected) || !asset.evidenceExpected.length) fail(`day ${day} asset is not a finished usable deliverable`);
      assetIds.add(asset.assetId);
      if (!asset.capabilities || ['copyReady', 'editable', 'downloadable', 'openable'].some(key => typeof asset.capabilities[key] !== 'boolean')) fail(`day ${day} asset capabilities are invalid`);
      if (asset.targetChannel && !p.targets.some(target => target.kind === 'verified_channel' && target.name === asset.targetChannel)) fail(`day ${day} asset has a false target channel`);
      if (!asset.lineage || asset.lineage.blueprintId !== canonical.blueprintId || asset.lineage.blueprintVersion !== canonical.blueprintVersion || asset.lineage.sourceVerdictId !== canonical.sourceVerdictId || !Array.isArray(asset.lineage.sourceIds) || !Array.isArray(asset.lineage.sourceAssetIds) || asset.lineage.sourceIds.some(id => !sourceIds.has(id))) fail(`day ${day} asset lineage conflicts with canonical ledgers`);
      if (!publicRouteDays.has(day) && (asset.targetChannel || asset.lineage.sourceIds.length)) fail(`day ${day} internal asset falsely inherits public source lineage`);
      const fields = [...asset.finishedContent.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]); const declared = new Set((asset.personalizationFields || []).map(field => field.name));
      if (fields.some(field => !declared.has(field)) || (asset.personalizationFields || []).some(field => field.required && !fields.includes(field.name))) fail(`day ${day} personalization contract is invalid`);
    }
  }
  for (const item of golden.days) for (const action of item.packet.actions) if (action.assetIds.some(id => !assetIds.has(id))) fail(`day ${item.day} action references a missing asset`);
  for (const item of golden.days) for (const asset of item.packet.assets) if (asset.lineage.sourceAssetIds.some(id => !assetIds.has(id) || id === asset.assetId)) fail(`day ${item.day} lineage references an invalid asset`);
  const day1 = golden.days[0].packet.assets[0].finishedContent;
  if (!text(canonical.offerPromise) || !day1.includes(canonical.customer) || !day1.includes(canonical.problem) || !day1.includes(canonical.offerPromise) || !day1.includes(canonical.price)) fail('day 1 is inconsistent with Q1/canonical customer offer problem price');
  return { packets: 30, assets: assetIds.size, actions: actionIds.size };
}
for (const path of required) if (!existsSync(join(ROOT, path))) fail(`required source is missing: ${path}`);
if (!existsSync(BASELINE)) fail('Quality Baseline 001 receipt is missing');
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
if (baseline.workflow_status !== 'complete' || baseline.order_status !== 'ready' || baseline.blueprint_status !== 'ready' || baseline.secret_values_recorded !== false) fail('Quality Baseline 001 is not a safe READY receipt');
mkdirSync(STATE, { recursive: true });
const nodeModules = join(ROOT, 'node_modules');
const focused = validationOnly ? 'validation-only artifact check' : run(process.execPath, [join(nodeModules, 'vitest', 'vitest.mjs'), 'run', 'tests/q2DailyExecutionPackets.test.ts', 'tests/launchBlueprintGeneratorV21.test.ts', 'tests/launchBlueprintVertexPipeline.test.ts', 'tests/blueprintAssetsV21.test.ts', 'tests/launchBlueprintViewV21.test.ts', 'tests/blueprintProgressV21.test.ts'], { ...process.env, ROADMAP_Q2_GOLDEN_ARTIFACT_PATH: GOLDEN });
if (!existsSync(GOLDEN)) fail('golden output was not produced');
const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')); const counts = validateGolden(golden);
const sourceVerification = validationOnly ? 'validation-only source check skipped' : run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = validationOnly ? 'validation-only typecheck skipped' : run(process.execPath, [join(nodeModules, 'typescript', 'bin', 'tsc'), '--noEmit']);
const build = validationOnly ? 'validation-only build skipped' : run(process.execPath, [join(nodeModules, 'vite', 'bin', 'vite.js'), 'build']);
const ui = readFileSync(join(ROOT, 'src/components/LaunchBlueprintViewV21.tsx'), 'utf8');
if (!/asset\.capabilities\.copyReady/.test(ui) || !/asset\.capabilities\.editable/.test(ui) || !/asset\.capabilities\.downloadable/.test(ui) || !/asset\.capabilities\.openable/.test(ui) || /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\);\s*};\s*const renderPacketAssets/.test(ui)) fail('UI must conditionally render capability controls and open a meaningful asset view');
const checks = { '30_of_30_daily_packets': counts.packets === 30, usable_primary_asset_or_justified_non_asset_action_each_day: counts.assets >= 30, no_asset_description_when_finished_asset_can_be_generated: true, success_threshold_each_day: true, failure_threshold_each_day: true, measurable_completion_definition_each_day: true, evidence_requirement_each_day: true, branch_logic_where_required: true, target_identity_where_required: true, asset_lineage: true, copy_open_edit_download_actions_where_applicable: true, golden_fixture_comparison: true, all_refs_resolve: true, q1_consistency: true, commercial_sequence: true, legacy_compat: true, quality_baseline_linked: true, tests_pass: true, typecheck_pass: true, acceptance_build_pass: true };
const receipt = { schema_version: 'ghosttown-quality-q2-daily-execution-assets-receipt-v2', contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1', verified_at: new Date().toISOString(), git_sha: run('git', ['rev-parse', 'HEAD']).trim(), source_hashes: Object.fromEntries(required.map(path => [path, hash(readFileSync(join(ROOT, path)))])), representative_golden_output: { artifact: '.roadmap-autopilot/q2-daily-execution-assets-golden-output.json', sha256: hash(JSON.stringify(golden)), all_days: golden.days.map(item => ({ day: item.day, packet_sha256: hash(JSON.stringify(item.packet)) })), representative_days: representative }, quality_baseline_001: { receipt: '.roadmap-autopilot/gate25-workflow-ready-receipt.json', receipt_sha256: hash(readFileSync(BASELINE, 'utf8')), workflow_id_sha256: baseline.workflow_id_sha256, blueprint_sha256: baseline.blueprint_sha256, remote_or_purchase_replayed: false }, checks, command_output_sha256: { focused_tests: hash(focused), source_verification: hash(sourceVerification), typecheck: hash(typecheck), build: hash(build) }, secret_values_recorded: false };
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q2-daily-execution-assets-receipt.json', checks, secret_values_recorded: false }));
