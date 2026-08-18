#!/usr/bin/env node
/* First-party Q5 acceptance for GhostTown commercial measurement.
 * The adapter is local/read-only with respect to customer systems: it inspects
 * repository sources, runs deterministic tests/build checks, and writes a local
 * acceptance receipt. It never creates a Stripe purchase or deploys production. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE = join(ROOT, '.roadmap-autopilot');
const RECEIPT = join(STATE, 'q5-commercial-measurement-receipt.json');
const Q4_RECEIPT = join(STATE, 'q4-direct-response-launch-site-receipt.json');
const FREEZE = join(ROOT, 'config/infrastructure-freeze-policy-v1.json');
const CONFIG = join(ROOT, 'config/commercial-quality-roadmap-v1.json');

const requiredSources = [
  'config/commercial-quality-roadmap-v1.json',
  'config/infrastructure-freeze-policy-v1.json',
  'src/api/analytics.ts',
  'src/api/commercialMetrics.ts',
  'src/api/paidTest.ts',
  'src/api/webhook.ts',
  'src/api/blueprintApi.ts',
  'src/api/index.ts',
  'src/app/App.tsx',
  'src/components/QuestionFlow.tsx',
  'src/components/ResultReport.tsx',
  'src/components/PaywallModal.tsx',
  'src/components/ActionPlanSuccess.tsx',
  'src/components/LaunchBlueprintViewV21.tsx',
  'tests/commercialMetrics.test.ts',
  'tests/blueprintProgressV21.test.ts',
  'tests/blueprintRecoveryV21.test.ts',
  'tests/q5CommercialMeasurementAdapter.test.ts'
];

const acceptanceKeys = [
  'source_to_session_attribution',
  'test_started',
  'verdict_completed',
  'checkout_started',
  'purchase_and_revenue',
  'blueprint_opened',
  'daily_packet_opened',
  'day_completed',
  'evidence_recorded',
  'repair_routing_supported',
  'tests_pass'
];

const measuredEvents = {
  test_started: 'verdict_started',
  verdict_completed: 'verdict_completed',
  checkout_started: 'checkout_started',
  blueprint_opened: 'blueprint_opened',
  daily_packet_opened: 'daily_packet_opened',
  day_completed: 'day_completed',
  evidence_recorded: 'evidence_recorded',
  repair_routing_supported: 'blueprint_retry_requested'
};

const hash = value => createHash('sha256').update(value).digest('hex');
const fileHash = path => hash(readFileSync(path));
const read = relative => readFileSync(join(ROOT, relative), 'utf8');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const has = (text, value) => text.includes(value);

function currentHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(`Q5 acceptance failed: cannot resolve git HEAD\n${result.stderr || result.stdout || ''}`);
  return String(result.stdout || '').trim();
}

function command(commandName, args) {
  const result = spawnSync(commandName, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env
  });
  return {
    ok: result.status === 0,
    status: result.status ?? -1,
    output: `${result.stdout || ''}${result.stderr || ''}`
  };
}

function eventNamesFromAnalytics(source) {
  const block = source.match(/const allowedEvents\s*=\s*new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
  return [...block.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
}

function occurrences(text, value) {
  return text.split(value).length - 1;
}

function writeReceipt(receipt) {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

for (const relative of requiredSources) {
  if (!existsSync(join(ROOT, relative))) {
    throw new Error(`Q5 acceptance failed: missing required source ${relative}`);
  }
}
if (!existsSync(Q4_RECEIPT)) throw new Error('Q5 acceptance failed: missing Q4 acceptance receipt');

const head = currentHead();
const roadmap = readJson(CONFIG);
const q5 = roadmap.quality_gates?.find(gate => gate.id === 'Q5');
if (!q5) throw new Error('Q5 acceptance failed: Q5 is missing from the governing quality roadmap');
if (JSON.stringify(q5.acceptance) !== JSON.stringify(acceptanceKeys)) {
  throw new Error(`Q5 acceptance failed: governing acceptance keys drifted: ${JSON.stringify(q5.acceptance)}`);
}
if (q5.purpose !== 'measurement' || q5.requires?.join(',') !== 'Q4') {
  throw new Error('Q5 acceptance failed: measurement purpose or Q4 prerequisite drifted');
}

const q4 = readJson(Q4_RECEIPT);
if (q4.decision !== 'PASS' || q4.git_sha !== head || q4.secret_values_recorded !== false || q4.production_deployed !== false) {
  throw new Error('Q5 acceptance failed: Q4 must be a safe PASS at the exact current HEAD');
}

const freeze = readJson(FREEZE);
if (!freeze.policy?.allowed_purposes?.includes('measurement') || freeze.invariants?.production_auto_deploy !== false || freeze.invariants?.gate_36_remains_manual !== true) {
  throw new Error('Q5 acceptance failed: Infrastructure Freeze does not authorize bounded measurement work or manual-release invariants changed');
}

const analytics = read('src/api/analytics.ts');
const metrics = read('src/api/commercialMetrics.ts');
const paidTest = read('src/api/paidTest.ts');
const webhook = read('src/api/webhook.ts');
const blueprintApi = read('src/api/blueprintApi.ts');
const index = read('src/api/index.ts');
const emitterSources = [
  'src/app/App.tsx',
  'src/components/QuestionFlow.tsx',
  'src/components/ResultReport.tsx',
  'src/components/PaywallModal.tsx',
  'src/components/ActionPlanSuccess.tsx',
  'src/components/LaunchBlueprintViewV21.tsx',
  'src/api/paidTest.ts',
  'src/api/blueprintApi.ts'
].map(read).join('\n');

const allowedEvents = eventNamesFromAnalytics(analytics);
const supportedAndEmitted = eventName => allowedEvents.includes(eventName) && occurrences(emitterSources, eventName) > 0;

const attributionFields = [
  'attributionToken', 'experimentId', 'sourceVerdictId', 'creativeId', 'publicationId',
  'platform', 'accountId', 'campaign', 'source', 'visitorId', 'ghosttownSessionId'
];
const analyticsAttributionContract = attributionFields.every(field => has(analytics, field));
const metricAttributionContract = [
  'attributionToken', 'experimentId', 'sourceVerdictId', 'creativeId', 'publicationId',
  'platform', 'accountId', 'campaign', 'source'
].every(field => has(metrics, field));
const checkoutAttributionMetadata = [
  'metadata[attribution_token]',
  'metadata[experiment_id]',
  'metadata[source_verdict_id]',
  'metadata[creative_id]',
  'metadata[publication_id]',
  'metadata[platform]',
  'metadata[source]',
  'metadata[visitor_id]',
  'metadata[ghosttown_session_id]'
].every(field => has(paidTest, field));
const purchaseAttributionRecovered = has(webhook, 'recordVerifiedPurchase')
  && has(metrics, 'attributionFromMetadata')
  && has(metrics, 'metadata.attribution_token')
  && has(metrics, 'metadata.publication_id')
  && has(metrics, 'metadata.source');

const purchaseAuthority = has(webhook, 'recordVerifiedPurchase')
  && has(webhook, "event.type === 'checkout.session.completed'")
  && has(metrics, "authority: 'stripe_webhook'")
  && has(metrics, 'revenueMinorUnitsByCurrency')
  && has(metrics, 'checkout_to_verified_purchase');

const repairRoute = has(index, '/blueprint/retry')
  && has(index, 'handleLaunchBlueprintRetry')
  && has(blueprintApi, 'handleLaunchBlueprintRetry');

const focused = command(process.execPath, [
  join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run',
  'tests/commercialMetrics.test.ts',
  'tests/blueprintProgressV21.test.ts',
  'tests/blueprintRecoveryV21.test.ts',
  'tests/q5CommercialMeasurementAdapter.test.ts'
]);
const sourceLock = command(process.execPath, ['scripts/verify-blueprint-source.mjs']);
const typecheck = command(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit']);
const build = command(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build']);

const checks = {
  source_to_session_attribution: analyticsAttributionContract && metricAttributionContract && checkoutAttributionMetadata && purchaseAttributionRecovered,
  test_started: supportedAndEmitted(measuredEvents.test_started),
  verdict_completed: supportedAndEmitted(measuredEvents.verdict_completed),
  checkout_started: supportedAndEmitted(measuredEvents.checkout_started),
  purchase_and_revenue: purchaseAuthority,
  blueprint_opened: supportedAndEmitted(measuredEvents.blueprint_opened),
  daily_packet_opened: supportedAndEmitted(measuredEvents.daily_packet_opened),
  day_completed: supportedAndEmitted(measuredEvents.day_completed),
  evidence_recorded: supportedAndEmitted(measuredEvents.evidence_recorded),
  repair_routing_supported: repairRoute && supportedAndEmitted(measuredEvents.repair_routing_supported),
  tests_pass: focused.ok && sourceLock.ok && typecheck.ok && build.ok
};

if (Object.keys(checks).join(',') !== acceptanceKeys.join(',')) {
  throw new Error(`Q5 acceptance failed: adapter check order drifted: ${Object.keys(checks).join(',')}`);
}

const failedChecks = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const receipt = {
  schema_version: 'ghosttown-quality-q5-commercial-measurement-receipt-v1',
  contract_version: 'ghosttown-commercial-quality-autopilot-development-contract-v1',
  verified_at: new Date().toISOString(),
  git_sha: head,
  q4_receipt_sha256: fileHash(Q4_RECEIPT),
  acceptance_keys: acceptanceKeys,
  checks,
  failed_checks: failedChecks,
  evidence: {
    analytics_event_contract: allowedEvents,
    required_measured_events: measuredEvents,
    attribution: {
      analytics_contract: analyticsAttributionContract,
      metrics_contract: metricAttributionContract,
      checkout_to_stripe_metadata: checkoutAttributionMetadata,
      stripe_webhook_recovery: purchaseAttributionRecovered
    },
    stripe_purchase_authority: purchaseAuthority,
    repair_route_present: repairRoute,
    runtime_receipt: '.roadmap-autopilot/q5-commercial-measurement-receipt.json'
  },
  hashes: Object.fromEntries(requiredSources.map(relative => [relative, fileHash(join(ROOT, relative))])),
  command_output_sha256: {
    focused: hash(focused.output),
    source_lock: hash(sourceLock.output),
    typecheck: hash(typecheck.output),
    build: hash(build.output)
  },
  infrastructure_freeze: {
    purpose: 'measurement',
    new_architecture: false,
    new_provider: false,
    new_binding: false,
    new_container: false,
    production_auto_deploy: false,
    gate_36_remains_manual: true
  },
  production_deployed: false,
  purchase_replayed: false,
  secret_values_recorded: false,
  decision: failedChecks.length === 0 ? 'PASS' : 'FAIL'
};
writeReceipt(receipt);

if (failedChecks.length) {
  console.error(JSON.stringify({
    ok: false,
    receipt: '.roadmap-autopilot/q5-commercial-measurement-receipt.json',
    decision: 'FAIL',
    failed_checks: failedChecks,
    production_deployed: false,
    purchase_replayed: false,
    secret_values_recorded: false
  }));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  receipt: '.roadmap-autopilot/q5-commercial-measurement-receipt.json',
  decision: 'PASS',
  checks,
  production_deployed: false,
  purchase_replayed: false,
  secret_values_recorded: false
}));
