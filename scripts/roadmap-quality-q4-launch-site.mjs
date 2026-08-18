#!/usr/bin/env node
/* First-party Q4 acceptance for the existing validation-stage Launch Site.
 * It uses only local fixtures/browser routes and never deploys or calls a provider. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const RECEIPT = join(STATE, 'q4-direct-response-launch-site-receipt.json');
const GOLDEN = join(STATE, 'q4-launch-site-golden-artifact.json');
const LIFECYCLE = join(STATE, 'q4-launch-site-lifecycle-evidence.json');
const Q2_GOLDEN = join(STATE, 'q2-daily-execution-assets-golden-output.json');
const Q3_GOLDEN = join(STATE, 'q3-blueprint-document-golden-output.json');
const Q3_RECEIPT = join(STATE, 'q3-blueprint-quality-document-receipt.json');
const FREEZE = join(ROOT, 'config/infrastructure-freeze-policy-v1.json');
const required = [
  'src/api/launchSite.ts', 'src/api/index.ts', 'src/components/LaunchSitePanel.tsx',
  'tests/fixtures/checkoutAccessibilityBlueprint.ts', 'tests/launchSite.test.ts',
  'tests/q2DailyExecutionPackets.test.ts', 'tests/blueprintDocumentModel.test.ts',
  'tests/q4LaunchSiteBrowser.test.ts', 'config/commercial-quality-roadmap-v1.json',
];
const keys = ['customer_and_offer_match_blueprint','conversion_jobs_present','generic_copy_gate_pass','purposeful_visual_system','mobile_render_pass','desktop_render_pass','lead_flow_pass','publish_unpublish_pass','visual_review_receipt'];
const jobs = ['hero','specific_promise','customer_qualifier','pain_cost','mechanism','offer','inclusions','how_it_works','evidence_proof','risk_scope_boundary','primary_cta','objections','faq_final_cta'];
const expectedViewports = [
  ['mobile-375', 375, 667], ['mobile-390', 390, 844], ['tablet-768', 768, 1024],
  ['desktop-1366', 1366, 768], ['desktop-1440', 1440, 900],
];
const hash = value => createHash('sha256').update(value).digest('hex');
const fileHash = path => hash(readFileSync(path));
const json = path => JSON.parse(readFileSync(path, 'utf8'));
function fail(message) { throw new Error(`Q4 acceptance failed: ${message}`); }
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, env, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}
function pngSize(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') fail(`invalid PNG: ${path}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
function artifactFile(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.startsWith('.roadmap-autopilot/')) fail('screenshot path escaped the local evidence directory');
  const absolute = resolve(ROOT, relativePath);
  if (!absolute.toLowerCase().startsWith(STATE.toLowerCase()) || !existsSync(absolute)) fail(`missing local screenshot: ${relativePath}`);
  return absolute;
}

for (const path of required) if (!existsSync(join(ROOT, path))) fail(`missing ${path}`);
for (const path of [Q3_RECEIPT, FREEZE]) if (!existsSync(path)) fail(`missing prerequisite ${path}`);
const head = run('git', ['rev-parse', 'HEAD']).trim();
const q3Receipt = json(Q3_RECEIPT);
if (q3Receipt.decision !== 'PASS' || q3Receipt.git_sha !== head || q3Receipt.secret_values_recorded !== false) fail('Q3 must be a safe PASS at the exact current HEAD');
const freeze = json(FREEZE);
if (!freeze.policy?.allowed_purposes?.includes('conversion') || freeze.invariants?.production_auto_deploy !== false || freeze.invariants?.gate_36_remains_manual !== true) fail('Infrastructure Freeze does not authorize bounded conversion work or manual gates changed');

const focused = run(process.execPath, [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'tests/launchSite.test.ts', 'tests/q2DailyExecutionPackets.test.ts', 'tests/blueprintDocumentModel.test.ts', 'tests/q4LaunchSiteBrowser.test.ts'], {
  ...process.env,
  ROADMAP_Q2_GOLDEN_ARTIFACT_PATH: Q2_GOLDEN,
  ROADMAP_Q3_GOLDEN_ARTIFACT_PATH: Q3_GOLDEN,
  ROADMAP_Q4_LIFECYCLE_ARTIFACT_PATH: LIFECYCLE,
});
const sourceLock = run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = run(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit']);
const build = run(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build']);
for (const path of [GOLDEN, LIFECYCLE, Q2_GOLDEN, Q3_GOLDEN]) if (!existsSync(path)) fail(`focused tests did not produce ${path}`);

const artifact = json(GOLDEN);
const lifecycle = json(LIFECYCLE);
const q2 = json(Q2_GOLDEN);
const q3 = json(Q3_GOLDEN);
if (artifact.schema_version !== 'ghosttown-q4-launch-site-golden-artifact-v3' || artifact.renderer !== 'playwright-local-chromium' || artifact.origin !== 'local-only') fail('unexpected Q4 browser artifact schema or renderer');
if (artifact.production_deployed !== false || artifact.secret_values_recorded !== false || artifact.security?.privateIdentifiersAbsent !== true) fail('Q4 evidence is not safe/local-only');

const canonical = artifact.canonical || {};
const q2Canonical = q2.canonical || {};
const q3Canonical = q3.canonical || {};
const exactCanonical = canonical.sourceVerdictId === q2Canonical.sourceVerdictId
  && canonical.sourceVerdictId === q3Canonical.sourceVerdictId
  && canonical.customer === q2Canonical.customer && canonical.customer === q3Canonical.customer
  && canonical.problem === q2Canonical.problem && canonical.problem === q3Canonical.problem
  && canonical.offer === q2Canonical.offer && canonical.offer === q3Canonical.offer
  && canonical.promise === q2Canonical.offerPromise && canonical.promise === q3Canonical.promise
  && canonical.price === q2Canonical.price && canonical.price === q3Canonical.price
  && canonical.cta === q2Canonical.primaryCallToAction && canonical.cta === q3Canonical.cta
  && canonical.proofBoundary === q2Canonical.proofBoundary && canonical.proofBoundary === q3Canonical.proof;

const presentation = artifact.presentation || {};
const exactJobs = presentation.blocks?.map(block => block.job).join(',') === jobs.join(',');
const honestBlockLabels = presentation.blocks?.every(block => ['INFERRED','VALIDATION_STAGE'].includes(block.truthLabel)) === true;
const proofLabels = presentation.proofItems?.length >= 2
  && presentation.proofItems.some(item => item.label === 'TEST')
  && presentation.proofItems.some(item => item.label === 'PROOF_TO_EARN')
  && presentation.proofItems.every(item => ['TEST','PROOF_TO_EARN'].includes(item.label) && item.text);
const genericOrFabricated = /unlock your potential|revolutionize your workflow|game.?changer|best-in-class|next.?level|transform your business|one-stop solution|for everyone|any business|customers? (?:achieved|increased|saved)|\d+% (?:increase|improvement)|limited spots|act now|testimonial/i;
const copySafe = !genericOrFabricated.test(JSON.stringify(presentation)) && presentation.verifiedOutcomeNotice === 'No verified outcomes yet' && honestBlockLabels && proofLabels;
const artifactSteps = presentation.artifactSteps || [];
const purposefulArtifact = artifactSteps.length === 4
  && /one active checkout path/i.test(artifactSteps[0])
  && /observed checkout accessibility friction/i.test(artifactSteps[1])
  && /prioritized checkout accessibility issue list/i.test(artifactSteps[2])
  && /thirty-minute review/i.test(artifactSteps[3]);

if (!Array.isArray(artifact.viewports) || artifact.viewports.length !== expectedViewports.length) fail('all five exact viewports are required');
const screenshotEvidence = [];
const viewportResults = artifact.viewports.map((item, index) => {
  const [name, width, height] = expectedViewports[index];
  if (item.name !== name || item.width !== width || item.height !== height) fail(`viewport identity drift at ${name}`);
  const viewportPath = artifactFile(item.viewportScreenshot);
  const fullPath = artifactFile(item.fullPageScreenshot);
  const viewportSize = pngSize(viewportPath);
  const fullSize = pngSize(fullPath);
  const viewportHash = fileHash(viewportPath);
  const fullHash = fileHash(fullPath);
  if (viewportSize.width !== width || viewportSize.height !== height || fullSize.width !== width || fullSize.height < height) fail(`screenshot dimensions do not prove ${name}`);
  if (viewportHash !== item.viewportSha256 || fullHash !== item.fullPageSha256) fail(`screenshot hash drift at ${name}`);
  const boxes = Object.values(item.boxes || {});
  const boundsPass = boxes.length === 4 && boxes.every(box => box && box.x >= 0 && box.y >= 0 && box.width > 120 && box.y + box.height <= height + 1);
  const result = item.horizontalOverflow === false && item.aboveFold === true && boundsPass
    && item.jobOrder?.join(',') === jobs.join(',') && item.h1Count === 1
    && item.faqCount >= 1 && item.artifactStepCount === 4 && item.consoleErrors?.length === 0;
  screenshotEvidence.push({ name, viewportScreenshot: item.viewportScreenshot, viewportSha256: viewportHash, fullPageScreenshot: item.fullPageScreenshot, fullPageSha256: fullHash, bounds: item.boxes });
  return result;
});
const mobileEvidence = viewportResults.slice(0, 2).every(Boolean);
const desktopEvidence = viewportResults.slice(2).every(Boolean);
const accessibility = artifact.accessibility || {};
const accessibilityPass = ['skipLink','semanticLandmarks','oneH1','visibleFocus','minimumTargets','liveStatus','alertErrors','busyDisabled','failureRetainsValues','successResets','resultFocused','reducedMotion'].every(key => accessibility[key] === true);
const lead = artifact.leadFlow || {};
const leadPass = ['localRoute','successReset','failureRetained','busyAndDisabled','successLiveStatus','failureAlert','resultFocused','primaryCtaFocusedForm','secondaryCtaFocusedScope','faqExpanded'].every(key => lead[key] === true);
const lifecyclePass = lifecycle.schema_version === 'ghosttown-q4-lifecycle-evidence-v1'
  && lifecycle.owner_publish === true && lifecycle.published_status === 'published'
  && lifecycle.owner_unpublish === true && lifecycle.unpublished_status === 'unpublished'
  && lifecycle.cross_account_denied === true && lifecycle.denial_status === 404
  && lifecycle.handler === 'handleLaunchSiteOwner' && lifecycle.storage === 'D1' && lifecycle.production_mutated === false;
const adversePass = ['canonical_drift','missing_or_unordered_job','generic_copy','fabricated_claim','proof_label_drift','incomplete_artifact','private_identifier','horizontal_overflow','above_fold_failure','accessibility_state_failure'].every(value => artifact.adverseCases?.includes(value));

const checks = {
  customer_and_offer_match_blueprint: exactCanonical,
  conversion_jobs_present: exactJobs && artifact.viewports.every(item => item.jobOrder?.join(',') === jobs.join(',')),
  generic_copy_gate_pass: copySafe && adversePass,
  purposeful_visual_system: purposefulArtifact && viewportResults.every(Boolean),
  mobile_render_pass: mobileEvidence && accessibilityPass,
  desktop_render_pass: desktopEvidence && accessibilityPass,
  lead_flow_pass: leadPass,
  publish_unpublish_pass: lifecyclePass,
  visual_review_receipt: viewportResults.every(Boolean) && accessibilityPass && screenshotEvidence.length === 5,
};
if (Object.keys(checks).join(',') !== keys.join(',') || !Object.values(checks).every(Boolean)) fail(`one or more independently derived Q4 checks failed: ${JSON.stringify(checks)}`);

const receipt = {
  schema_version: 'ghosttown-quality-q4-direct-response-launch-site-receipt-v3',
  contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1',
  git_sha: head,
  q3_receipt_sha256: fileHash(Q3_RECEIPT),
  golden_artifact: '.roadmap-autopilot/q4-launch-site-golden-artifact.json',
  golden_artifact_sha256: fileHash(GOLDEN),
  lifecycle_artifact: '.roadmap-autopilot/q4-launch-site-lifecycle-evidence.json',
  lifecycle_artifact_sha256: fileHash(LIFECYCLE),
  canonical,
  checks,
  screenshot_evidence: screenshotEvidence,
  local_in_memory_lead_tests: leadPass,
  local_in_memory_publish_unpublish_tests: lifecyclePass,
  infrastructure_freeze: { purpose: 'conversion', new_architecture: false, new_provider: false, new_binding: false, new_container: false, production_auto_deploy: false, gate_36_remains_manual: true },
  gate_34_manual_visual_certification_preserved: true,
  production_deployed: false,
  secret_values_recorded: false,
  command_output_sha256: { focused: hash(focused), source_lock: hash(sourceLock), typecheck: hash(typecheck), build: hash(build) },
  decision: 'PASS',
};
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q4-direct-response-launch-site-receipt.json', checks, production_deployed: false, secret_values_recorded: false }));
