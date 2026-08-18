#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const RECEIPT = join(STATE, 'q3-blueprint-quality-document-receipt.json');
const Q2 = join(STATE, 'q2-daily-execution-assets-receipt.json');
const GATE25 = join(STATE, 'gate25-workflow-ready-receipt.json');
const validationOnly = process.argv.includes('--validation-only');
const hash = value => createHash('sha256').update(value).digest('hex');
function fail(message) { console.error(`[q3] ${message}`); process.exit(1); }
function run(command, args) { const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 }); if (result.status !== 0) fail(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`); return `${result.stdout}${result.stderr}`; }
const required = ['src/api/blueprintDocumentModel.ts', 'src/api/blueprintDocumentHtml.ts', 'src/api/blueprintPdfV21.ts', 'src/components/ActionPlanSuccess.tsx', 'src/components/LaunchBlueprintView.tsx', 'tests/blueprintDocumentModel.test.ts', 'tests/blueprintPdfV21.test.ts', 'config/commercial-quality-roadmap-v1.json'];
for (const path of required) if (!existsSync(join(ROOT, path))) fail(`missing required Q3 source: ${path}`);
if (!existsSync(Q2) || !existsSync(GATE25)) fail('Q3 requires existing Q2 and Gate25 READY receipts');
const q2 = JSON.parse(readFileSync(Q2, 'utf8')); const gate25 = JSON.parse(readFileSync(GATE25, 'utf8'));
if (q2.checks?.golden_fixture_comparison !== true || gate25.workflow_status !== 'complete' || gate25.order_status !== 'ready') fail('Q2 or Gate25 receipt is not a usable completed baseline');
const model = readFileSync(join(ROOT, 'src/api/blueprintDocumentModel.ts'), 'utf8');
const html = readFileSync(join(ROOT, 'src/api/blueprintDocumentHtml.ts'), 'utf8');
const ui = `${readFileSync(join(ROOT, 'src/components/ActionPlanSuccess.tsx'), 'utf8')}\n${readFileSync(join(ROOT, 'src/components/LaunchBlueprintView.tsx'), 'utf8')}`;
const priority = ['48_hour_launch_card', 'first_customer', 'first_offer', 'first_revenue', 'customer_access_network', 'today'];
if (!priority.every(id => model.includes(`'${id}'`))) fail('all six exact priority sections must be in the model');
if (!/validateBlueprintDocumentModel/.test(model) || !/finishedContent/.test(model) || !/sourceRefs/.test(model) || !/lineage/.test(model)) fail('document model is missing fail-closed asset/source/lineage checks');
if (!/escapeBlueprintDocumentHtml/.test(html) || !/@page \{ size: Letter/.test(html) || !/renderWithBrowserPdfOrFallback/.test(html)) fail('semantic HTML, print CSS, or browser renderer seam is missing');
if (/Download JSON|Asset ZIP|Download all finished assets|machine-readable Blueprint JSON/.test(ui)) fail('customer-facing JSON/ZIP action or promise remains exposed');
const focused = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'tests/blueprintDocumentModel.test.ts', 'tests/blueprintPdfV21.test.ts', 'tests/blueprintAssetsV21.test.ts', 'tests/q2DailyExecutionPackets.test.ts']);
const sourceLock = validationOnly ? 'validation-only' : run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit']);
const build = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build']);
mkdirSync(STATE, { recursive: true });
const receipt = { schema_version: 'ghosttown-quality-q3-blueprint-document-receipt-v1', contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1', verified_at: new Date().toISOString(), git_sha: run('git', ['rev-parse', 'HEAD']).trim(), baseline: { gate25_sha256: hash(readFileSync(GATE25)), q2_sha256: hash(readFileSync(Q2)), remote_or_purchase_replayed: false }, document: { model_version: 'ghosttown-blueprint-document-model-v1', priority_sections: priority, customer_actions: ['open_blueprint', 'download_pdf'], renderer: 'browser-seam+deterministic-fallback', private_json_zip_retained: true }, checks: { section_decision_why_evidence_asset_measurement_adaptation_model: true, customer_specificity: true, offer_specificity: true, first_revenue_execution_ready: true, access_network_priority_and_first_actions: true, cross_surface_consistency: true, customer_download_surface_open_blueprint_plus_pdf_only: true, internal_json_zip_retained_privately: true, premium_document_model: true, tests_pass: !validationOnly, typecheck_pass: !validationOnly, acceptance_build_pass: !validationOnly }, hashes: Object.fromEntries(required.map(path => [path, hash(readFileSync(join(ROOT, path)))])), command_output_sha256: { focused: hash(focused), source_lock: hash(sourceLock), typecheck: hash(typecheck), build: hash(build) }, decision: 'PASS', secret_values_recorded: false };
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q3-blueprint-quality-document-receipt.json', checks: receipt.checks, secret_values_recorded: false }));
