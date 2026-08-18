#!/usr/bin/env node
/* First-party Q4 acceptance. It validates the controlled validation-stage
 * Launch Site only; it neither deploys nor calls a provider. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const RECEIPT = join(STATE, 'q4-direct-response-launch-site-receipt.json');
const GOLDEN = join(STATE, 'q4-launch-site-golden-artifact.json');
const Q3 = join(STATE, 'q3-blueprint-quality-document-receipt.json');
const required = ['src/api/launchSite.ts', 'src/api/index.ts', 'src/components/LaunchSitePanel.tsx', 'tests/launchSite.test.ts', 'tests/q4LaunchSiteBrowser.test.ts'];
const keys = ['customer_and_offer_match_blueprint','conversion_jobs_present','generic_copy_gate_pass','purposeful_visual_system','mobile_render_pass','desktop_render_pass','lead_flow_pass','publish_unpublish_pass','visual_review_receipt'];
const hash = value => createHash('sha256').update(value).digest('hex');
function fail(message) { throw new Error(`Q4 acceptance failed: ${message}`); }
function run(command, args) { const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 }); if (result.status !== 0) fail(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`); return `${result.stdout}${result.stderr}`; }
for (const path of required) if (!existsSync(join(ROOT, path))) fail(`missing ${path}`);
if (!existsSync(Q3)) fail('Q3 current-head receipt is required');
const q3 = JSON.parse(readFileSync(Q3, 'utf8'));
if (q3.decision !== 'PASS' || q3.secret_values_recorded !== false) fail('Q3 evidence is not a safe passing baseline');
const source = readFileSync(join(ROOT, 'src/api/launchSite.ts'), 'utf8');
const jobs = ['hero','specific_promise','customer_qualifier','pain_cost','mechanism','offer','inclusions','how_it_works','evidence_proof','risk_scope_boundary','primary_cta','objections','faq_final_cta'];
if (!/LaunchSitePresentationModel/.test(source) || !/composeLaunchSitePresentation/.test(source) || !/validateLaunchSitePresentation/.test(source)) fail('pure presentation composer and validator are required');
if (jobs.some(job => !source.includes(`job: "${job}"`))) fail('one or more canonical conversion jobs are missing');
if (/WebsiteCreationService|websiteCreationService/.test(source)) fail('Q4 must not use the custom WebsiteCreationService architecture');
if (!/launch_site_leads|launch_sites|CF-Connecting-IP|Content-Security-Policy/.test(source)) fail('existing lifecycle, rate limiting, or CSP guard is missing');
const focused = run(process.execPath, [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'tests/launchSite.test.ts', 'tests/q4LaunchSiteBrowser.test.ts']);
const sourceLock = run(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = run(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit']);
const build = run(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build']);
if (!existsSync(GOLDEN)) fail('browser golden artifact was not produced');
const artifact = JSON.parse(readFileSync(GOLDEN, 'utf8'));
const expectedViewports = ['mobile-375','mobile-390','tablet-768','desktop-1366','desktop-1440'];
const validViewports = Array.isArray(artifact.viewports) && artifact.viewports.length === expectedViewports.length && artifact.viewports.map(item => item.name).join(',') === expectedViewports.join(',') && artifact.viewports.every(item => typeof item.sha256 === 'string' && item.sha256.length === 64 && item.horizontalOverflow === false && item.jobs === 13);
const checks = {
  customer_and_offer_match_blueprint: /blueprint\.launchSite\.offer\.headline/.test(source) && /blueprint\.launchSite\.offer\.targetCustomer/.test(source),
  conversion_jobs_present: artifact.conversion_jobs === 13 && jobs.every(job => source.includes(`job: "${job}"`)),
  generic_copy_gate_pass: /genericCopy/.test(source) && !/unlock your potential|revolutionize your workflow/.test(JSON.stringify(artifact)),
  purposeful_visual_system: /grid-template-columns|clamp\(/.test(source) && validViewports,
  mobile_render_pass: validViewports && artifact.viewports.filter(item => item.width < 700).length === 2,
  desktop_render_pass: validViewports && artifact.viewports.filter(item => item.width >= 700).length === 3,
  lead_flow_pass: artifact.local_lead_success_and_failure === true && /handlePublicLaunchLead/.test(source),
  publish_unpublish_pass: /action === "publish"/.test(source) && /action === "unpublish"/.test(source),
  visual_review_receipt: artifact.renderer === 'playwright-local-chromium' && validViewports
};
if (Object.keys(checks).join(',') !== keys.join(',') || !Object.values(checks).every(Boolean)) fail('one or more independently derived Q4 checks failed');
const receipt = { schema_version: 'ghosttown-quality-q4-direct-response-launch-site-receipt-v2', contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1', git_sha: run('git', ['rev-parse', 'HEAD']).trim(), q3_receipt_sha256: hash(readFileSync(Q3, 'utf8')), golden_artifact: '.roadmap-autopilot/q4-launch-site-golden-artifact.json', golden_artifact_sha256: hash(JSON.stringify(artifact)), checks, local_in_memory_lead_and_publish_tests: artifact.local_lead_success_and_failure === true, production_deployed: false, secret_values_recorded: false, command_output_sha256: { focused: hash(focused), source_lock: hash(sourceLock), typecheck: hash(typecheck), build: hash(build) }, decision: 'PASS' };
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, receipt: '.roadmap-autopilot/q4-direct-response-launch-site-receipt.json', checks, production_deployed: false, secret_values_recorded: false }));
