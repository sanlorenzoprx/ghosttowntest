#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate31-cross-account-security-receipt.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const EXPECTED_DENIAL_STATUS = 404;
const EXPECTED_AUTH_STATUS = 401;
const OWNERSHIP_TEST = 'tests/blueprintOwnershipV21.test.ts';

// Every customer artifact/state route that must be owner-guarded with a
// privacy-safe 404. The `handler` column is the first-party route handler and
// `ownerCheck` is the runtime ownership boundary it must route through.
const ORDER_ROUTES = [
  { path: '/api/paid-test/orders/{orderId}/blueprint', method: 'GET', handler: 'handleLaunchBlueprint', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint.json', method: 'GET', handler: 'handleLaunchBlueprintJson', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint.pdf', method: 'GET', handler: 'handleLaunchBlueprintPdf', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint-assets.zip', method: 'GET', handler: 'handleLaunchBlueprintAssets', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint/progress', method: 'GET', handler: 'handleLaunchBlueprintProgress', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint/progress', method: 'POST', handler: 'handleLaunchBlueprintProgress', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint/retry', method: 'POST', handler: 'handleLaunchBlueprintRetry', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/blueprintApi.ts' },
  { path: '/api/paid-test/orders/{orderId}/launch-site', method: 'GET', handler: 'handleLaunchSiteOwner', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/launchSite.ts' },
  { path: '/api/paid-test/orders/{orderId}/launch-site/publish', method: 'POST', handler: 'handleLaunchSiteOwner', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/launchSite.ts' },
  { path: '/api/paid-test/orders/{orderId}/launch-site/unpublish', method: 'POST', handler: 'handleLaunchSiteOwner', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/launchSite.ts' },
  { path: '/api/paid-test/orders/{orderId}/launch-site/leads', method: 'GET', handler: 'handleLaunchSiteOwner', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/launchSite.ts' },
  { path: '/api/paid-test/orders/{orderId}/launch-site/leads.csv', method: 'GET', handler: 'handleLaunchSiteOwner', ownerCheck: 'ownedLaunchBlueprintOrder', file: 'src/api/launchSite.ts' }
];

// Order-mutating seed routes are additionally covered as extended cross-account
// mutation-denial evidence beyond the required Gate-31 route list.
const SEED_ROUTES = [
  { path: '/api/paid-test/orders/{orderId}/blueprint/seeds', method: 'GET', handler: 'handleBlueprintSeeds', ownerCheck: 'ownedPaidOrder', file: 'src/api/blueprintSeeds.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint/seeds', method: 'POST', handler: 'handleBlueprintSeeds', ownerCheck: 'ownedPaidOrder', file: 'src/api/blueprintSeeds.ts' },
  { path: '/api/paid-test/orders/{orderId}/blueprint/seeds/suggest', method: 'POST', handler: 'handleBlueprintSeedSuggestions', ownerCheck: 'ownedPaidOrder', file: 'src/api/blueprintSeeds.ts' }
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function now() {
  return new Date().toISOString();
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function assertPrerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 31 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['26', '27', '28', '29', '30']) {
    if (state?.gates?.[id]?.status !== 'PASS') {
      throw new Error(`Gate 31 requires Gate ${id} to be PASS before cross-account security can be certified.`);
    }
  }
  if (state?.gates?.['31']?.status === 'PASS') {
    throw new Error('Gate 31 is already PASS; do not replay cross-account security evidence.');
  }
  if (!existsSync(GATE20_RECEIPT_PATH)) {
    throw new Error('Gate 31 requires the existing Gate 20 purchase receipt for read-only live probes; it will not create or replay a purchase.');
  }
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || typeof receipt?.order_id !== 'string'
    || !/^gtt_[A-Za-z0-9_-]+$/.test(receipt.order_id)) {
    throw new Error('Gate 31 found an incomplete or unexpected Gate 20 purchase receipt.');
  }
  return { state, orderId: receipt.order_id };
}

function runOwnershipBoundaryTest() {
  const result = spawnSync('npx', ['vitest', 'run', OWNERSHIP_TEST], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300000
  });
  const stdout = stripAnsi(result.stdout || '');
  const stderr = stripAnsi(result.stderr || '');
  const combined = `${stdout}\n${stderr}`;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 31 first-party ownership boundary test failed (${result.status ?? 1}).\n${combined}`.trim());
  }
  const filesMatch = stdout.match(/Test Files\s+(\d+) passed/);
  const testsMatch = stdout.match(/Tests\s+(\d+) passed/);
  const testFilesPassed = filesMatch ? Number(filesMatch[1]) : 0;
  const testsPassed = testsMatch ? Number(testsMatch[1]) : 0;
  if (testFilesPassed < 1 || testsPassed < 1 || /failed|FAIL/.test(stdout)) {
    throw new Error('Gate 31 ownership boundary test output did not confirm a passing deterministic cross-account suite.');
  }
  return {
    test_file: OWNERSHIP_TEST,
    exit_code: result.status,
    test_files_passed: testFilesPassed,
    tests_passed: testsPassed,
    expected_denial_status: EXPECTED_DENIAL_STATUS
  };
}

function readSource(path) {
  const file = join(ROOT, path.replace(/\//g, '\\'));
  if (!existsSync(file)) throw new Error(`Gate 31 source contract file missing: ${path}`);
  return readFileSync(file, 'utf8');
}

function handlerSource(file, handler) {
  const source = readSource(file);
  const marker = `export async function ${handler}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Gate 31 could not locate handler ${handler} in ${file}.`);
  return source.slice(start, start + 2600);
}

function sourceContract() {
  const index = readSource('src/api/index.ts');
  const blueprintApi = readSource('src/api/blueprintApi.ts');
  const launchSite = readSource('src/api/launchSite.ts');
  const blueprintSeeds = readSource('src/api/blueprintSeeds.ts');

  // Route table wiring: each customer route pattern must dispatch to the
  // owner-guarded handler. Patterns are the exact route-regex fragments that
  // appear in src/api/index.ts (including escaped dots), so a plain substring
  // check is the faithful source-contract assertion.
  // Regex escapes in index.ts (\/ and \.) are flattened so each route pattern
  // can be asserted as a plain substring of the actual route table source.
  const flattened = index.replace(/\\(.)/g, '$1');
  const wiring = [
    ['/blueprint.json', 'handleLaunchBlueprintJson'],
    ['/blueprint.pdf', 'handleLaunchBlueprintPdf'],
    ['/blueprint-assets.zip', 'handleLaunchBlueprintAssets'],
    ['/blueprint/progress', 'handleLaunchBlueprintProgress'],
    ['/blueprint/retry', 'handleLaunchBlueprintRetry'],
    ['/launch-site/(publish|unpublish)', 'handleLaunchSiteOwner'],
    ['/launch-site/leads(?:.csv)?', 'handleLaunchSiteOwner'],
    ['/launch-site$', 'handleLaunchSiteOwner'],
    ['/blueprint$', 'handleLaunchBlueprint'],
    ['/blueprint/seeds/suggest', 'handleBlueprintSeedSuggestions'],
    ['/blueprint/seeds', 'handleBlueprintSeeds']
  ];
  const routeTable = [];
  for (const [pattern, handler] of wiring) {
    if (!flattened.includes(pattern)) throw new Error(`Gate 31 route table is missing ${pattern}.`);
    routeTable.push({ pattern, handler });
  }

  // Every handler must begin with the owner boundary and return a static
  // privacy-safe 'not found' 404 without interpolating owner identity.
  const denialChecks = [
    { file: 'src/api/blueprintApi.ts', token: "json({ error: 'Launch Blueprint not found' }, 404)", source: blueprintApi },
    { file: 'src/api/launchSite.ts', token: 'privateJson({ error: "Launch Site not found" }, 404)', source: launchSite },
    { file: 'src/api/blueprintSeeds.ts', token: "json({ error: 'Launch Blueprint order not found' }, 404)", source: blueprintSeeds }
  ];
  for (const check of denialChecks) {
    if (!check.source.includes(check.token)) {
      throw new Error(`Gate 31 privacy-safe 404 denial string is missing from ${check.file}.`);
    }
  }

  const checked = [];
  for (const route of [...ORDER_ROUTES, ...SEED_ROUTES]) {
    const body = handlerSource(route.file, route.handler);
    if (!body.includes(`${route.ownerCheck}(request, env, orderId`)) {
      throw new Error(`Gate 31 handler ${route.handler} in ${route.file} is not routed through ${route.ownerCheck}.`);
    }
    checked.push({ path: route.path, method: route.method, handler: route.handler, ownerCheck: route.ownerCheck });
  }

  // Information-leak source proof: the 404 bodies are fixed 'not found' strings
  // and the owner checks must not embed email/order/checkout-session identity
  // into the denial response.
  const leakGuarded = [
    { file: 'src/api/blueprintApi.ts', source: blueprintApi },
    { file: 'src/api/launchSite.ts', source: launchSite },
    { file: 'src/api/blueprintSeeds.ts', source: blueprintSeeds }
  ];
  for (const { file, source } of leakGuarded) {
    const ownerCheckZone = source.slice(0, source.indexOf('export async function handleLaunchBlueprintJson') >= 0
      ? source.indexOf('export async function handleLaunchBlueprintJson')
      : source.length);
    const leakPatterns = [
      /\{ error: ['"][^'"]*(\$\{|auth\.email|order\.email|orderId|checkoutSession)/,
      /not found['"]\s*,\s*404[^}]*(\$\{|auth\.email|order\.email|orderId)/
    ];
    for (const pattern of leakPatterns) {
      if (pattern.test(ownerCheckZone)) {
        throw new Error(`Gate 31 source contract found a potential identity leak in ${file}.`);
      }
    }
  }

  return { routeTable, checked, denial_strings: denialChecks.map(check => check.token) };
}

async function liveFailClosedProbes(orderId) {
  const probes = [];
  for (const route of [...ORDER_ROUTES, ...SEED_ROUTES]) {
    const url = `${WORKER_URL}${route.path.replace('{orderId}', encodeURIComponent(orderId))}`;
    const common = { method: route.method, headers: { 'Content-Type': 'application/json' } };
    const unauth = await fetch(url, common);
    const invalidToken = await fetch(url, {
      ...common,
      headers: { ...common.headers, Authorization: 'Bearer gate31-invalid-token' }
    });
    const entry = {
      route: route.path,
      method: route.method,
      unauthenticated_status: unauth.status,
      invalid_token_status: invalidToken.status
    };
    probes.push(entry);
    if (entry.unauthenticated_status !== EXPECTED_AUTH_STATUS || entry.invalid_token_status !== EXPECTED_AUTH_STATUS) {
      throw new Error(`Gate 31 live probe did not fail closed on ${route.method} ${route.path} (got ${entry.unauthenticated_status}/${entry.invalid_token_status}, expected ${EXPECTED_AUTH_STATUS}).`);
    }
    await unauth.body?.cancel().catch(() => undefined);
    await invalidToken.body?.cancel().catch(() => undefined);
  }
  return probes;
}

const { state, orderId } = assertPrerequisites();
const boundary = runOwnershipBoundaryTest();
const contract = sourceContract();
const liveProbes = await liveFailClosedProbes(orderId);

const evidence = {
  schema_version: 'roadmap-gate31-cross-account-security-receipt-v1',
  verified_at: now(),
  gate: {
    id: 31,
    phase: 8,
    slug: 'cross-account-security',
    title: 'Verify cross-account access/mutation/download/export/retry denials'
  },
  expected_denial_status: EXPECTED_DENIAL_STATUS,
  mutation_scope_verified: 'none',
  deterministic_owner_boundary: boundary,
  information_leak_checks: {
    owner_email: 'not in denial body (deterministic test assertion)',
    order_id: 'not in denial body (deterministic test assertion)',
    stripe_checkout_session_id: 'not in denial body (deterministic test assertion)',
    r2_details: 'not in denial body (deterministic test assertion)',
    site_id: 'not in denial body (deterministic test assertion)',
    lead_count: 'not in denial body (deterministic test assertion)',
    source_verdict_identity: 'not in denial body (deterministic test assertion)',
    source_contract_static_404_strings: true
  },
  source_contract: {
    route_table_handlers: contract.routeTable,
    owner_guarded_routes: contract.checked,
    privacy_safe_denial_strings: contract.denial_strings
  },
  live_acceptance_probe: {
    worker_url: WORKER_URL,
    order_id_sha256: sha256(orderId),
    probes: liveProbes,
    all_fail_closed_401: true,
    cross_account_live_404: 'not_reproducible_read_only',
    limitation: 'Live cross-account 404 with two real acceptance accounts is not reproducible read-only: no second-account token exists in accepted state, and creating or mutating an acceptance account to manufacture a Gate-31 token would violate this gate mutation_scope none. The cross-account 404 contract is therefore proven by the first-party deterministic runtime boundary test plus source-contract wiring checks; unauthenticated and invalid-token live probes prove the routes fail closed before artifact access.'
  },
  mutation_performed: false,
  production_deployed: false,
  purchase_replayed: false,
  workflow_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  secret_values_recorded: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  expected_denial_status: EXPECTED_DENIAL_STATUS,
  owner_boundary_tests_passed: boundary.tests_passed,
  owner_guarded_route_count: contract.checked.length,
  live_probe_count: liveProbes.length,
  cross_account_live_404: 'not_reproducible_read_only',
  receipt: '.roadmap-autopilot/gate31-cross-account-security-receipt.json',
  mutation_performed: false,
  production_deployed: false,
  secret_values_recorded: false
}));
