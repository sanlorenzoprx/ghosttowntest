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
const GOLDEN = join(STATE, 'q3-blueprint-document-golden-output.json');
const Q2_GOLDEN = join(STATE, 'q2-daily-execution-assets-golden-output.json');
const validationOnly = process.argv.includes('--validation-only');
const hash = value => createHash('sha256').update(value).digest('hex');
function fail(message) { console.error(`[q3] ${message}`); process.exit(1); }
function run(command, args, env = process.env) { const result = spawnSync(command, args, { cwd: ROOT, env, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 }); if (result.status !== 0) fail(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`); return `${result.stdout}${result.stderr}`; }
const required = ['src/api/blueprintDocumentModel.ts', 'src/api/blueprintDocumentHtml.ts', 'src/api/blueprintPdfV21.ts', 'src/components/ActionPlanSuccess.tsx', 'src/components/LaunchBlueprintView.tsx', 'tests/blueprintDocumentModel.test.ts', 'tests/blueprintPdfV21.test.ts', 'config/commercial-quality-roadmap-v1.json'];
for (const path of required) if (!existsSync(join(ROOT, path))) fail(`missing required Q3 source: ${path}`);
if (!existsSync(Q2) || !existsSync(Q2_GOLDEN) || !existsSync(GATE25)) fail('Q3 requires existing Q2 and Gate25 READY receipts');
const q2 = JSON.parse(readFileSync(Q2, 'utf8')); const gate25 = JSON.parse(readFileSync(GATE25, 'utf8'));
const q2Golden = JSON.parse(readFileSync(Q2_GOLDEN, 'utf8'));
if (q2.checks?.golden_fixture_comparison !== true || gate25.workflow_status !== 'complete' || gate25.order_status !== 'ready') fail('Q2 or Gate25 receipt is not a usable completed baseline');
const model = readFileSync(join(ROOT, 'src/api/blueprintDocumentModel.ts'), 'utf8');
const html = readFileSync(join(ROOT, 'src/api/blueprintDocumentHtml.ts'), 'utf8');
const ui = `${readFileSync(join(ROOT, 'src/components/ActionPlanSuccess.tsx'), 'utf8')}\n${readFileSync(join(ROOT, 'src/components/LaunchBlueprintView.tsx'), 'utf8')}`;
const priority = ['48_hour_launch_card', 'first_customer', 'first_offer', 'first_revenue', 'customer_access_network', 'today'];
if (!priority.every(id => model.includes(`'${id}'`))) fail('all six exact priority sections must be in the model');
if (!/validateBlueprintDocumentAgainstCanonical/.test(model) || !/finishedContent/.test(model) || !/sourceRefs/.test(model) || !/lineage/.test(model) || !/access-target-count/.test(model)) fail('document model is missing fail-closed asset/source/access/lineage checks');
if (!/escapeBlueprintDocumentHtml/.test(html) || !/@page \{ size: Letter/.test(html) || !/renderWithBrowserPdfOrFallback/.test(html)) fail('semantic HTML, print CSS, or browser renderer seam is missing');
if (/Download JSON|Asset ZIP|Download all finished assets|machine-readable Blueprint JSON/.test(ui)) fail('customer-facing JSON/ZIP action or promise remains exposed');
const focused = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'tests/blueprintDocumentModel.test.ts', 'tests/blueprintPdfV21.test.ts', 'tests/blueprintAssetsV21.test.ts', 'tests/q2DailyExecutionPackets.test.ts'], { ...process.env, ROADMAP_Q3_GOLDEN_ARTIFACT_PATH: GOLDEN });
if (!existsSync(GOLDEN)) fail('Q3 generated golden artifact is missing');
const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
const pdf = Buffer.from(golden.pdf_base64 || '', 'base64'); const pdfText = pdf.toString('utf8');
const expectedBlocks = ['DECISION', 'WHY', 'EVIDENCE', 'READY-TO-USE ASSETS', 'MEASUREMENT', 'ADAPTATION RULE'];
const generatedSections = golden.model?.prioritySections?.map(section => section.sectionId) || [];
const generatedAssets = golden.model?.prioritySections?.flatMap(section => section.readyToUseAssets || []) || [];
const canonicalTerms = Object.entries(golden.canonical || {}).filter(([key, value]) => key !== 'sourceVerdictId' && typeof value === 'string').map(([, value]) => value);
const pdfContainsTerm = term => String(term).split(/\s+/).filter(part => part.length > 2).every(part => pdfText.includes(part));
const artifactChecks = {
  generated_model_schema: golden.schema_version === 'ghosttown-q3-document-golden-output-v1' && golden.model?.schemaVersion === 'ghosttown-blueprint-document-model-v1',
  exact_priority_order: generatedSections.join(',') === priority.join(','),
  complete_blocks: golden.model?.prioritySections?.every(section => section.decision && section.why && section.evidence?.length && section.readyToUseAssets?.length && section.measurement?.successThreshold && section.measurement?.failureThreshold && section.measurement?.completionDefinition && section.adaptationRule?.length) && /<h3>Decision<\/h3>|<h3>DECISION<\/h3>/.test(golden.html || '') && /Ready-to-use assets/.test(golden.html || '') && /Adaptation rule/.test(golden.html || ''),
  asset_content: generatedAssets.every(asset => asset.finishedContent && !/^prepared asset\s*:/i.test(asset.finishedContent)),
  access_groups: golden.model?.prioritySections?.find(section => section.sectionId === 'customer_access_network')?.accessGroups?.map(group => group.groupId).join(',') === 'priority_five,reserve_five,partner_targets',
  access_metadata: golden.model?.prioritySections?.find(section => section.sectionId === 'customer_access_network')?.accessGroups?.flatMap(group => group.targets || []).every(target => target.publicUrl && target.sourceRefs?.length && target.researchDate && target.confidence && target.accessPath && target.risk && target.matchedAssetOrScript?.resourceId && target.matchedAssetOrScript?.targetIds?.includes(target.targetId) && target.matchedAssetOrScript?.sourceRefs?.join(',') === target.sourceRefs.join(',') && target.matchedAssetOrScript?.lineage === `${golden.model.sourceBlueprint.blueprintId}->${target.matchedAssetOrScript.resourceId}->${target.targetId}` && target.firstAction),
  access_count: (() => { const count = golden.model?.prioritySections?.find(section => section.sectionId === 'customer_access_network')?.accessGroups?.flatMap(group => group.targets || []).length || 0; return count >= 10 && count <= 25; })(),
  html_semantic_print: /<main>|<section|<table><caption>|<thead>|scope=\"col\"/.test(golden.html || '') && /@page \{ size: Letter|font-size:9\.5pt|print-color-adjust:exact|widows:3|overflow-wrap:anywhere/.test(golden.css || ''),
  pdf_document_driven: priority.every(id => pdfText.includes(id === '48_hour_launch_card' ? '48-Hour Launch Card' : id === 'first_customer' ? 'First Customer' : id === 'first_offer' ? 'First Offer' : id === 'first_revenue' ? 'First Revenue Path' : id === 'customer_access_network' ? 'Customer Access Network' : 'Today: Day 1')) && expectedBlocks.every(block => pdfText.includes(block)) && [golden.model?.presentation?.title, golden.model?.presentation?.customer, golden.model?.presentation?.subtitle].every(value => value && pdfContainsTerm(value)) && !['blueprint-document:', 'Render mode:', 'Verdict lineage:'].some(value => pdfText.includes(value)),
  cross_surface_terms: canonicalTerms.every(term => JSON.stringify(golden.model).includes(term) && golden.html.includes(term) && pdfContainsTerm(term)),
  coherent_fixture_lineage: golden.canonical?.sourceVerdictId === q2Golden.canonical?.sourceVerdictId && golden.model?.sourceBlueprint?.sourceVerdictId === golden.canonical.sourceVerdictId && golden.lineage?.sourceVerdictId === golden.canonical.sourceVerdictId && golden.lineage?.blueprintId === golden.model?.sourceBlueprint?.blueprintId && /ecommerce/i.test(golden.canonical?.customer || '') && /checkout accessibility/i.test(`${golden.canonical?.problem || ''} ${golden.canonical?.offer || ''}`),
  sixteen_file_bundle: golden.bundle_file_count === 16,
  adverse_cases: Array.isArray(golden.adversarial_cases) && ['broad_generic', 'contradictory_offer_price', 'unresolved_source', 'description_only_asset', 'missing_branch', 'duplicate_id', 'script_injection', 'private_material', 'invalid_browser_pdf', 'legacy_v21_compatibility'].every(value => golden.adversarial_cases.includes(value)),
  no_customer_json_zip: !/Download JSON|Asset ZIP|machine-readable Blueprint JSON/.test(ui)
};
if (Object.values(artifactChecks).some(value => value !== true)) fail(`generated Q3 artifact failed: ${JSON.stringify(artifactChecks)}`);
const sourceLock = validationOnly ? 'validation-only' : run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit']);
const build = validationOnly ? 'validation-only' : run(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build']);
mkdirSync(STATE, { recursive: true });
const checks = { section_decision_why_evidence_asset_measurement_adaptation_model: artifactChecks.exact_priority_order && artifactChecks.complete_blocks && artifactChecks.asset_content, customer_specificity: artifactChecks.cross_surface_terms && artifactChecks.coherent_fixture_lineage, offer_specificity: artifactChecks.cross_surface_terms && artifactChecks.coherent_fixture_lineage, first_revenue_execution_ready: artifactChecks.pdf_document_driven, access_network_priority_and_first_actions: artifactChecks.access_groups && artifactChecks.access_metadata && artifactChecks.access_count, cross_surface_consistency: artifactChecks.cross_surface_terms && artifactChecks.coherent_fixture_lineage, customer_download_surface_open_blueprint_plus_pdf_only: artifactChecks.no_customer_json_zip, internal_json_zip_retained_privately: artifactChecks.sixteen_file_bundle, premium_document_model: artifactChecks.generated_model_schema && artifactChecks.html_semantic_print && artifactChecks.pdf_document_driven, tests_pass: !validationOnly, typecheck_pass: !validationOnly, acceptance_build_pass: !validationOnly };
const receipt = { schema_version: 'ghosttown-quality-q3-blueprint-document-receipt-v2', contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1', verified_at: new Date().toISOString(), git_sha: run('git', ['rev-parse', 'HEAD']).trim(), baseline: { gate25_sha256: hash(readFileSync(GATE25)), q2_sha256: hash(readFileSync(Q2)), remote_or_purchase_replayed: false }, document: { model_version: golden.model.schemaVersion, priority_sections: generatedSections, customer_actions: golden.model.customerActions, renderer: 'browser-seam+deterministic-fallback', render_mode: golden.render_mode === 'deterministic_fallback' ? 'deterministic_fallback' : 'unknown', private_json_zip_retained: artifactChecks.sixteen_file_bundle }, generated_artifacts: { golden: '.roadmap-autopilot/q3-blueprint-document-golden-output.json', model_sha256: hash(JSON.stringify(golden.model)), html_sha256: hash(golden.html), css_sha256: hash(golden.css), pdf_sha256: hash(pdf), bundle_file_count: golden.bundle_file_count, adverse_cases: golden.adversarial_cases }, checks, hashes: Object.fromEntries(required.map(path => [path, hash(readFileSync(join(ROOT, path)))])), command_output_sha256: { focused: hash(focused), source_lock: hash(sourceLock), typecheck: hash(typecheck), build: hash(build) }, decision: 'PASS', secret_values_recorded: false };
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q3-blueprint-quality-document-receipt.json', checks: receipt.checks, secret_values_recorded: false }));
