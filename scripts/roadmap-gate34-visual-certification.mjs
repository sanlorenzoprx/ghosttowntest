#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const GATE29_RECEIPT_PATH = join(STATE_DIR, 'gate29-launch-site-lead-receipt.json');
const GATE30_PASSWORD_RECEIPT_PATH = join(STATE_DIR, 'gate30-acceptance-password-reset-receipt.json');
const HISTORICAL_RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt-v2.json');
const SHOT_DIR = join(STATE_DIR, 'gate34-paid-journey-screenshots-v2');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const PAGES_URL = 'https://ghosttown-acceptance.pages.dev';
const OWNER_TOKEN_ENV = 'ROADMAP_GATE_34_OWNER_TOKEN';
const TOKEN_KEY = 'lit_user_token_v1';
const CORRECTION_MODE = process.argv.includes('--correction');
const VIEWPORTS = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];
const FORBIDDEN_MUTATION_MARKERS = [
  '/blueprint/progress',
  '/launch-site/publish',
  '/launch-site/unpublish',
  '/blueprint/retry',
  '/paid-test/checkout',
  '/blueprint/seeds'
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`Gate 34 requires ${label}.`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sourceContract() {
  const dashboard = readFileSync(join(ROOT, 'src', 'components', 'UserDashboard.tsx'), 'utf8');
  const execution = readFileSync(join(ROOT, 'src', 'components', 'LaunchBlueprintExecutionHomeV21.tsx'), 'utf8');
  const view = readFileSync(join(ROOT, 'src', 'components', 'LaunchBlueprintViewV21.tsx'), 'utf8');
  const sitePanel = readFileSync(join(ROOT, 'src', 'components', 'LaunchSitePanel.tsx'), 'utf8');
  const api = readFileSync(join(ROOT, 'src', 'lib', 'api.ts'), 'utf8');
  for (const token of ['Open Blueprint', 'GhostTown Launch Blueprint']) {
    if (!dashboard.includes(token)) throw new Error(`Gate 34 dashboard source contract is missing ${token}.`);
  }
  if (!api.includes(TOKEN_KEY)) throw new Error(`Gate 34 API source contract is missing ${TOKEN_KEY}.`);
  for (const token of ['30-Day Launch Execution', 'Download Blueprint PDF', 'Export all assets', 'Evidence, reviews & site']) {
    if (!execution.includes(token)) throw new Error(`Gate 34 execution source contract is missing ${token}.`);
  }
  for (const token of ['blueprint-mobile-nav', 'Blueprint sections', 'Launch Site']) {
    if (!view.includes(token)) throw new Error(`Gate 34 Blueprint workspace source contract is missing ${token}.`);
  }
  for (const token of ['Publish Launch Site', 'Unpublish', '/launch-site']) {
    if (!sitePanel.includes(token)) throw new Error(`Gate 34 Launch Site source contract is missing ${token}.`);
  }
  return { paid_journey_ui_wired: true, mobile_workspace_navigation_wired: true };
}

function prerequisites() {
  const state = readJson(STATE_PATH, 'roadmap state');
  for (const id of ['26', '27', '28', '29', '30', '31', '32', '33']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 34 requires Gate ${id} to be PASS.`);
  }
  if (CORRECTION_MODE) {
    for (const id of ['34', '35']) {
      if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 34 correction requires Gate ${id} to remain PASS.`);
    }
  } else if (state?.gates?.['34']?.status === 'PASS') {
    throw new Error('Gate 34 is already PASS; use --correction for the additive pre-Gate-36 correction run.');
  }
  const gate36 = state?.gates?.['36'];
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('Gate 34 refuses to run after Gate 36 production release is authorized or executed.');
  }
  const purchase = readJson(GATE20_RECEIPT_PATH, 'the Gate 20 purchase receipt');
  const gate27 = readJson(GATE27_RECEIPT_PATH, 'the Gate 27 artifact receipt');
  const gate29 = readJson(GATE29_RECEIPT_PATH, 'the Gate 29 Launch Site receipt');
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || purchase?.stripe_mode !== 'test' || !purchase?.order_id) {
    throw new Error('Gate 34 found an invalid Gate 20 purchase receipt.');
  }
  if (gate27?.schema_version !== 'roadmap-gate27-private-r2-artifacts-receipt-v1' || gate27?.decision !== 'PASS') {
    throw new Error('Gate 34 found an invalid Gate 27 artifact receipt.');
  }
  if (gate29?.schema_version !== 'roadmap-gate29-launch-site-lead-receipt-v1' || gate29?.decision !== 'PASS' || gate29?.final_owner_status !== 'unpublished') {
    throw new Error('Gate 34 requires Gate 29 evidence that the accepted Launch Site is unpublished.');
  }
  const historical = existsSync(HISTORICAL_RECEIPT_PATH) ? JSON.parse(readFileSync(HISTORICAL_RECEIPT_PATH, 'utf8')) : null;
  return { purchase, gate27, gate29, historical };
}

function acceptedOwnerHash(historical) {
  if (/^[a-f0-9]{64}$/.test(String(historical?.owner_id_sha256 || ''))) return historical.owner_id_sha256;
  if (existsSync(GATE30_PASSWORD_RECEIPT_PATH)) {
    const receipt = JSON.parse(readFileSync(GATE30_PASSWORD_RECEIPT_PATH, 'utf8'));
    if (/^[a-f0-9]{64}$/.test(String(receipt?.owner_id_sha256 || ''))) return receipt.owner_id_sha256;
  }
  throw new Error('Gate 34 cannot prove the accepted owner identity hash from existing receipts.');
}

async function verifyOwnerToken(token, ownerHash) {
  const response = await fetch(`${WORKER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  const email = typeof body?.user?.email === 'string' ? body.user.email.trim().toLowerCase() : '';
  if (response.status !== 200 || !email) {
    throw new Error(`INPUT_REQUIRED: ${OWNER_TOKEN_ENV} must be a valid token for the EXISTING Gate 20 owner acceptance account. Do not paste it into chat.`);
  }
  const identityHash = sha256(Buffer.from(email, 'utf8'));
  if (identityHash !== ownerHash) {
    throw new Error(`INPUT_REQUIRED: ${OWNER_TOKEN_ENV} is authenticated but does not belong to the accepted Gate 20 owner.`);
  }
  return { identityHash, verifyStatus: response.status };
}

async function verifyAcceptancePairing() {
  if (!PAGES_URL.includes('acceptance') || !WORKER_URL.includes('acceptance')) {
    throw new Error('Gate 34 refuses to certify a non-acceptance endpoint.');
  }
  const htmlResponse = await fetch(PAGES_URL, { cache: 'no-store' });
  if (!htmlResponse.ok) {
    throw new Error(`ACCEPTANCE_PAIRING_STALE: acceptance Pages returned HTTP ${htmlResponse.status}. Run the established acceptance-pairing deployment outside Gate 34.`);
  }
  const html = await htmlResponse.text();
  const match = html.match(/<script[^>]+src=["']([^"']+\.js)["']/i);
  if (!match) {
    throw new Error('ACCEPTANCE_PAIRING_STALE: acceptance Pages has no discoverable application bundle. Run the established acceptance-pairing deployment outside Gate 34.');
  }
  const bundleUrl = new URL(match[1], PAGES_URL).toString();
  const jsResponse = await fetch(bundleUrl, { cache: 'no-store' });
  if (!jsResponse.ok) {
    throw new Error(`ACCEPTANCE_PAIRING_STALE: acceptance bundle returned HTTP ${jsResponse.status}. Run the established acceptance-pairing deployment outside Gate 34.`);
  }
  const js = await jsResponse.text();
  const markers = {
    calendar_primary: js.includes('30-Day Launch Execution'),
    evidence_workspace: js.includes('Evidence, reviews'),
    acceptance_worker: js.includes(WORKER_URL)
  };
  if (!Object.values(markers).every(Boolean)) {
    throw new Error(`ACCEPTANCE_PAIRING_STALE: deployed acceptance Pages is not the current calendar-primary acceptance pairing (${JSON.stringify(markers)}). Run the established acceptance-pairing deployment outside Gate 34; this mutation_scope:none gate will not deploy it.`);
  }
  return { pages_url: PAGES_URL, worker_url: WORKER_URL, bundle_url: bundleUrl, markers };
}

async function selectWorkspaceTab(page, viewportWidth, label, value) {
  if (viewportWidth < 768) {
    const mobile = page.locator('#blueprint-mobile-nav');
    await mobile.waitFor({ state: 'visible', timeout: 45000 });
    await mobile.selectOption(value);
    return;
  }
  await page.getByRole('button', { name: label, exact: true }).click();
}

const { purchase, gate27, gate29, historical } = prerequisites();
const contract = sourceContract();
const pairing = await verifyAcceptancePairing();
const ownerHash = acceptedOwnerHash(historical);
const ownerToken = String(process.env[OWNER_TOKEN_ENV] || '').trim();
if (ownerToken.length < 40) {
  throw new Error(`INPUT_REQUIRED: set ${OWNER_TOKEN_ENV} locally to a valid token for the EXISTING Gate 20 owner acceptance account. Do not paste it into chat.`);
}
const owner = await verifyOwnerToken(ownerToken, ownerHash);

mkdirSync(SHOT_DIR, { recursive: true });
const orderId = String(purchase.order_id);
const viewportEvidence = [];
const mutationRequests = [];
let analyticsRequestsBlocked = 0;
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await page.addInitScript(({ tokenKey, tokenValue }) => localStorage.setItem(tokenKey, tokenValue), { tokenKey: TOKEN_KEY, tokenValue: ownerToken });
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname.includes('/api/analytics/')) {
        analyticsRequestsBlocked += 1;
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
    });
    page.on('request', request => {
      const method = request.method();
      const path = new URL(request.url()).pathname;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        && path !== '/api/auth/verify'
        && !path.includes('/api/analytics/')
        && FORBIDDEN_MUTATION_MARKERS.some(marker => path.includes(marker))) {
        mutationRequests.push(`${viewport.name}:${method} ${path}`);
      }
    });

    const entry = {
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      stages: [],
      passed: false,
      no_horizontal_overflow: true,
      downloaded_pdf_sha256: null,
      downloaded_zip_sha256: null,
      json_sha256: null
    };
    const overflowAt = async label => {
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      if (overflow.scrollWidth > overflow.clientWidth) {
        entry.no_horizontal_overflow = false;
        entry.overflow = { label, ...overflow };
      }
    };
    const stage = async (name, run) => {
      await run();
      entry.stages.push(name);
      await page.screenshot({ path: join(SHOT_DIR, `${viewport.name.replace('x', '_')}_${name}.png`), fullPage: false, animations: 'disabled' });
    };

    await stage('dashboard', async () => {
      await page.goto(PAGES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('button', { name: 'Dashboard' }).first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: 'Dashboard' }).first().click();
      await page.getByText('GhostTown Launch Blueprint').first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: /Open Blueprint/i }).first().waitFor({ timeout: 45000 });
      await overflowAt('dashboard');
    });

    await stage('open-blueprint', async () => {
      await page.getByRole('button', { name: /Open Blueprint/i }).first().click();
      await page.getByText('30-Day Launch Execution').first().waitFor({ timeout: 45000 });
      await page.locator('[aria-label="30-day execution calendar"]').first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: /Open Day 1/i }).first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: /Download Blueprint PDF/i }).first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: /Export all assets/i }).first().waitFor({ timeout: 45000 });
      await overflowAt('open-blueprint');
    });

    await stage('calendar-day', async () => {
      await page.getByRole('button', { name: /Open Day 1/i }).first().click();
      await page.locator('#daily-execution-detail').waitFor({ timeout: 45000 });
      await overflowAt('calendar-day');
    });

    await stage('download-pdf', async () => {
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
      await page.getByRole('button', { name: /Download Blueprint PDF/i }).first().click();
      const download = await downloadPromise;
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      entry.downloaded_pdf_sha256 = sha256(Buffer.concat(chunks));
    });

    await stage('export-zip', async () => {
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
      await page.getByRole('button', { name: /Export all assets/i }).first().click();
      const download = await downloadPromise;
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      entry.downloaded_zip_sha256 = sha256(Buffer.concat(chunks));
    });

    await stage('launch-site-panel', async () => {
      await page.getByRole('button', { name: /Evidence, reviews & site/i }).first().click();
      await selectWorkspaceTab(page, viewport.width, 'Launch Site', 'site');
      await page.getByText(/unpublished/i).first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: /Publish Launch Site/i }).first().waitFor({ timeout: 45000 });
      await overflowAt('launch-site-panel');
    });

    await stage('technical-json', async () => {
      const response = await page.request.get(`${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.json`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      entry.technical_json_http = response.status();
      if (response.ok()) entry.json_sha256 = sha256(Buffer.from(await response.body()));
    });

    entry.passed = entry.no_horizontal_overflow
      && entry.downloaded_pdf_sha256 === gate27.artifacts.pdf.sha256
      && entry.downloaded_zip_sha256 === gate27.artifacts.zip.sha256
      && entry.json_sha256 === gate27.artifacts.json.sha256
      && entry.technical_json_http === 200;
    viewportEvidence.push(entry);
    await context.close();
  }
} finally {
  await browser.close();
}

if (mutationRequests.length) throw new Error(`Gate 34 v2 detected forbidden acceptance state mutations: ${mutationRequests.join('; ')}`);
if (!viewportEvidence.every(item => item.passed)) throw new Error('Gate 34 v2 did not pass every required paid-journey viewport.');

const receipt = {
  schema_version: 'roadmap-gate34-visual-certification-receipt-v2',
  verified_at: new Date().toISOString(),
  correction_mode: CORRECTION_MODE,
  correction_of: '.roadmap-autopilot/gate34-visual-certification-receipt.json',
  environment: 'acceptance',
  gate: { id: 34, phase: 10, slug: 'visual-certification' },
  order_id_sha256: sha256(Buffer.from(orderId, 'utf8')),
  owner_id_sha256: owner.identityHash,
  authentication_verify_status: owner.verifyStatus,
  pairing,
  source_contract: contract,
  viewports: viewportEvidence,
  accepted_launch_site_status: gate29.final_owner_status,
  artifact_integrity: {
    pdf_matches_gate27_every_viewport: viewportEvidence.every(item => item.downloaded_pdf_sha256 === gate27.artifacts.pdf.sha256),
    zip_matches_gate27_every_viewport: viewportEvidence.every(item => item.downloaded_zip_sha256 === gate27.artifacts.zip.sha256),
    json_matches_gate27_every_viewport: viewportEvidence.every(item => item.json_sha256 === gate27.artifacts.json.sha256)
  },
  mutation_scope: 'none',
  current_correction: {
    customer_data_mutations: 'none',
    order_mutations: 'none',
    artifact_mutations: 'none',
    launch_site_mutations: 'none',
    acceptance_infrastructure_mutations: 'none',
    production_infrastructure_mutations: 'none',
    analytics_network_mutations: 'blocked_in_browser',
    analytics_requests_blocked: analyticsRequestsBlocked,
    forbidden_mutation_requests_detected: mutationRequests
  },
  historical_v1_classification: {
    acceptance_infrastructure_deployment_during_original_gate34: true,
    acceptance_pages_deployment: historical?.pages_bundle_deployed === true,
    temporary_acceptance_worker_mint_deployment: true,
    reason: 'The original Gate 34 run updated stale acceptance Pages to the current calendar-primary build and temporarily deployed a Worker mint endpoint. Those actions were acceptance-infrastructure mutations even though customer/order/artifact/site state remained read-only.',
    production_infrastructure_mutation: 'none'
  },
  authentication: {
    method: 'existing owner acceptance JWT supplied locally',
    operator_token_required: true,
    token_values_recorded: false,
    email_values_recorded: false,
    account_created: false
  },
  screenshots_dir: '.roadmap-autopilot/gate34-paid-journey-screenshots-v2',
  purchase_replayed: false,
  research_replayed: false,
  vertex_generation_replayed: false,
  production_deployed: false,
  gate_36_touched: false,
  secret_values_recorded: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  correction_mode: CORRECTION_MODE,
  viewports_passed: viewportEvidence.length,
  acceptance_pairing_read_only_verified: true,
  current_acceptance_infrastructure_mutations: 'none',
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate34-visual-certification-receipt-v2.json'
}));
