import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = String(process.env.PCJ_BASE_URL || 'https://ghosttowntest.com').replace(/\/$/, '');
const API_URL = String(process.env.PCJ_API_URL || 'https://api.ghosttowntest.com').replace(/\/$/, '');
const EXPECTED_WORKER_VERSION = String(process.env.PCJ_EXPECTED_WORKER_VERSION || '').trim();
const CONFIRM = String(process.env.PCJ_CONFIRM || '');
const SCOPE = String(process.env.PCJ_SCOPE || 'surface');
const CANARY_EMAIL = String(process.env.PCJ_CANARY_EMAIL || '').trim().toLowerCase();
const CANARY_PASSWORD = String(process.env.PCJ_CANARY_PASSWORD || '');
const SPRINT_ORDER_ID_OVERRIDE = String(process.env.PCJ_SPRINT_ORDER_ID || '').trim();
const GML_ORDER_ID_OVERRIDE = String(process.env.PCJ_GML_ORDER_ID || '').trim();
const LIVE_URL_OVERRIDE = String(process.env.PCJ_LIVE_URL || '').replace(/\/$/, '');
const ARTIFACT_DIR = String(process.env.PCJ_ARTIFACT_DIR || 'production-customer-journey-artifacts');

const allowedScopes = new Set(['surface', 'full']);
if (!allowedScopes.has(SCOPE)) throw new Error(`PCJ_SCOPE must be surface or full; received ${SCOPE}`);
if (CONFIRM !== 'RUN PRODUCTION CUSTOMER JOURNEY') throw new Error('Confirmation phrase mismatch.');
if (!EXPECTED_WORKER_VERSION) throw new Error('PCJ_EXPECTED_WORKER_VERSION is required.');
if (new URL(BASE_URL).hostname !== 'ghosttowntest.com') throw new Error(`Refusing non-canonical production frontend: ${BASE_URL}`);
if (new URL(API_URL).hostname !== 'api.ghosttowntest.com') throw new Error(`Refusing non-canonical production API: ${API_URL}`);
if (SCOPE === 'full') {
  const required = { PCJ_CANARY_EMAIL: CANARY_EMAIL, PCJ_CANARY_PASSWORD: CANARY_PASSWORD };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error('Full production journey requires: ' + missing.join(', '));
}

const forbiddenCustomerTerms = [
  /\bD1\b/i,
  /\bKV\b/,
  /\bR2\b/,
  /\bRAG\b/i,
  /\bVertex\b/i,
  /\bdeterministic\b/i,
  /\bOAuth\b/i,
  /authVersion/i,
  /workflow execution/i,
  /stack trace/i,
  /provider routing/i,
];

const proof = {
  schemaVersion: 'ghosttown-production-customer-journey-v1',
  scope: SCOPE,
  baseUrl: BASE_URL,
  apiUrl: API_URL,
  expectedWorkerVersion: EXPECTED_WORKER_VERSION,
  safety: {
    realPurchasesCompleted: false,
    providerMutationsAllowed: false,
    sprintProgressWritesAllowed: false,
    domainMutationsAllowed: false,
    publishMutationsAllowed: false,
    syntheticLeadSubmitted: false,
  },
  stages: [],
  controlsInventoried: [],
  classifiedNotClicked: [],
  blockedDangerousRequests: [],
  pageErrors: [],
  serverErrors: [],
  startedAt: new Date().toISOString(),
};

const fail = message => { throw new Error(message); };
const record = (name, data = {}) => proof.stages.push({ name, status: 'passed', at: new Date().toISOString(), ...data });
const skip = (name, reason) => proof.stages.push({ name, status: 'skipped', reason, at: new Date().toISOString() });

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Cache-Control': 'no-cache', ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body, text };
}

async function assertNoInternalLanguage(page, label) {
  const text = await page.locator('body').innerText().catch(() => '');
  const matches = forbiddenCustomerTerms.filter(pattern => pattern.test(text)).map(pattern => String(pattern));
  if (matches.length) fail(`${label} exposes internal product language: ${matches.join(', ')}`);
}

function installSafetyRoutes(context) {
  return context.route('**/*', async route => {
    const req = route.request();
    let url;
    try { url = new URL(req.url()); } catch { await route.continue(); return; }
    const method = req.method().toUpperCase();
    if (url.origin === API_URL && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const p = url.pathname;
      const dangerous =
        p === '/api/paid-test/checkout'
        || p === '/api/get-me-live/checkout'
        || /\/api\/paid-test\/orders\/[^/]+\/blueprint\/progress$/.test(p)
        || /\/api\/get-me-live\/orders\/[^/]+\/(?:publish|publish\/verify|config|assets|email-setup|stripe|custom-domain)/.test(p)
        || /\/api\/get-me-live\/orders\/[^/]+\/custom-domain/.test(p)
        || p.includes('/cloudflare/connect')
        || p.includes('/cloudflare/disconnect');
      if (dangerous) {
        proof.blockedDangerousRequests.push({ method, url: req.url() });
        await route.abort('blockedbyclient');
        return;
      }
    }
    await route.continue();
  });
}

async function runHealth() {
  const { response, body, text } = await jsonFetch(`${API_URL}/api/integrations/shorts-factory/health?pcj=${Date.now()}`);
  if (!response.ok) fail(`Production health HTTP ${response.status}: ${text.slice(0, 300)}`);
  if (body?.status !== 'ok' || body?.service !== 'ghosttowntest') fail('Production health contract mismatch.');
  if (body?.version_id !== EXPECTED_WORKER_VERSION) {
    fail(`Production Worker mismatch. Expected ${EXPECTED_WORKER_VERSION}, received ${body?.version_id}`);
  }
  record('production-health', { workerVersion: body.version_id, livePublishingEnabled: body.live_publishing_enabled });
}

async function runProtectedRouteNegative() {
  const { response, body } = await jsonFetch(`${API_URL}/api/results`, {
    headers: { Authorization: 'Bearer pcj-invalid-token' },
  });
  if (response.status !== 401) fail(`Invalid-token protected route expected 401, received ${response.status}`);
  const serialized = JSON.stringify(body || {});
  if (/stack|trace|exception|d1|kv|r2|vertex/i.test(serialized)) fail('Protected-route error leaks internal details.');
  record('negative-auth-boundary', { httpStatus: response.status });
}

async function runSurfaceJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installSafetyRoutes(context);
  const page = await context.newPage();
  page.on('pageerror', error => proof.pageErrors.push(String(error)));
  page.on('response', response => {
    if (response.status() >= 500 && response.url().startsWith(API_URL)) {
      proof.serverErrors.push({ status: response.status(), method: response.request().method(), url: response.url() });
    }
  });

  const nav = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (nav?.status() !== 200) fail(`Production frontend expected HTTP 200, received ${nav?.status()}`);
  await page.getByRole('heading', { name: 'Don’t build the wrong idea.', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: /Test My Idea Free/i }).first().waitFor({ state: 'visible' });
  await assertNoInternalLanguage(page, 'English landing');
  record('landing-english', { httpStatus: nav?.status(), primaryCta: 'Test My Idea Free' });

  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  await page.getByRole('heading', { name: 'No construyas la idea equivocada.', exact: true }).waitFor({ state: 'visible' });
  if (await page.evaluate(() => document.documentElement.lang) !== 'es') fail('Spanish toggle did not set document language to es.');
  await page.getByRole('button', { name: /Probar mi idea gratis/i }).first().waitFor({ state: 'visible' });
  await assertNoInternalLanguage(page, 'Spanish landing');
  record('landing-spanish', { documentLang: 'es', primaryCta: 'Probar mi idea gratis' });

  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: /Test My Idea Free/i }).first().click();
  await page.getByRole('heading', { name: 'Tell us about your idea', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  const nonce = String(Date.now()).slice(-8);
  await page.getByLabel("What's your idea called?").fill(`Production Journey Canary ${nonce}`);
  await page.getByLabel('What does it do?').fill('A synthetic service used only to verify the live GhostTown customer journey without making a real purchase.');
  await page.getByLabel('Who is it for? (Be specific)').fill('Independent local service business owners testing follow-up ideas');
  await page.getByLabel('What painful problem does it solve?').fill('Qualified inquiries are lost when follow-up is slow or inconsistent.');
  await page.getByLabel('How do people solve this today?').fill('Spreadsheets, inbox reminders, and manual text messages.');
  await page.getByLabel('Why do you want to build this?').fill('Production journey verification only.');
  await page.getByRole('checkbox').check();
  await page.getByTestId('evaluate-button').click();

  for (let index = 0; index < 17; index += 1) {
    const footer = page.getByText("There are no wrong answers. We're evaluating your idea objectively.", { exact: true });
    await footer.waitFor({ state: 'visible', timeout: 20000 });
    const card = footer.locator('..');
    const options = card.getByRole('button');
    const count = await options.count();
    if (count < 4) fail(`Question ${index + 1} exposed only ${count} answer buttons.`);
    await options.nth(Math.min(2, count - 1)).click();
  }

  await page.getByTestId('verdict-card').waitFor({ state: 'visible', timeout: 180000 });
  await page.getByTestId('next-step').waitFor({ state: 'visible', timeout: 15000 });
  await assertNoInternalLanguage(page, 'Free verdict');
  record('anonymous-free-verdict', { questionsAnswered: 17, verdictRendered: true });

  await page.getByRole('button', { name: 'Start 30-Day Evidence Sprint checkout', exact: true }).first().click();
  // Anonymous customers must cross the account boundary before the paid intake
  // is shown. Surface scope proves that gate without creating a production
  // account or checkout session.
  const authDialog = page.getByRole('dialog');
  await authDialog.getByRole('heading', { name: 'Create Account', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  const emailField = authDialog.locator('input[type="email"]');
  const passwordField = authDialog.locator('input[type="password"]');
  if (await emailField.count() < 1 || await passwordField.count() < 1) {
    const dialogText = (await authDialog.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 500);
    fail(`Account gate opened without expected email/password fields. Dialog text: ${dialogText}`);
  }
  await emailField.first().waitFor({ state: 'visible', timeout: 10000 });
  await passwordField.first().waitFor({ state: 'visible', timeout: 10000 });
  proof.controlsInventoried.push({ surface: 'paid-offer', control: 'Create Account before Sprint checkout', action: 'observed' });
  proof.classifiedNotClicked.push({ control: 'Create Account', reason: 'surface scope does not create persistent production accounts' });
  await authDialog.getByRole('button', { name: 'Close registration form', exact: true }).click();
  record('paid-offer-auth-gate', { registrationRequired: true, realCheckoutCreated: false });

  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await installSafetyRoutes(mobile);
  const mobilePage = await mobile.newPage();
  const mobileNav = await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (mobileNav?.status() !== 200) fail(`Mobile production frontend expected 200, received ${mobileNav?.status()}`);
  await mobilePage.getByRole('button', { name: /Test My Idea Free/i }).first().waitFor({ state: 'visible' });
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 4) fail(`Mobile landing has horizontal overflow of ${overflow}px.`);
  record('mobile-landing', { width: 390, height: 844, horizontalOverflowPx: overflow });
  await mobile.close();
}

async function runFullCanary(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
  await installSafetyRoutes(context);
  const page = await context.newPage();
  page.on('pageerror', error => proof.pageErrors.push(String(error)));
  page.on('response', response => {
    if (response.status() >= 500 && response.url().startsWith(API_URL)) {
      proof.serverErrors.push({ status: response.status(), method: response.request().method(), url: response.url() });
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const auth = page.getByRole('dialog');
  await auth.getByRole('heading', { name: 'Log In', exact: true }).waitFor({ state: 'visible' });
  const loginEmail = auth.locator('input[type="email"]').first();
  const loginPassword = auth.locator('input[type="password"]').first();
  await loginEmail.waitFor({ state: 'visible', timeout: 10000 });
  await loginPassword.waitFor({ state: 'visible', timeout: 10000 });
  await loginEmail.fill(CANARY_EMAIL);
  await loginPassword.fill(CANARY_PASSWORD);
  await auth.getByRole('button', { name: 'Log In', exact: true }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  const token = await page.evaluate(() => localStorage.getItem('lit_user_token_v1'));
  if (!token) fail('Canary login succeeded visually but no auth token was stored.');

  const ownerGet = async path => jsonFetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const verified = await jsonFetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!verified.response.ok || verified.body?.user?.email?.toLowerCase() !== CANARY_EMAIL) fail('Canary auth verification failed.');
  record('canary-login', { emailMatched: true });

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('heading', { name: 'Previous Assessments', exact: true }).waitFor({ state: 'visible', timeout: 15000 });

  const results = await ownerGet('/api/results');
  if (!results.response.ok || !Array.isArray(results.body?.results) || results.body.results.length < 1) fail('Canary has no saved assessment available for persistence proof.');
  const savedResult = results.body.results[0];
  const resultArticle = page.locator('article').filter({ hasText: savedResult.ideaName }).first();
  await resultArticle.getByRole('button', { name: 'View Report', exact: true }).click();
  await page.getByTestId('verdict-card').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByTestId('next-step').waitFor({ state: 'visible' });
  await assertNoInternalLanguage(page, 'Saved verdict');
  record('saved-verdict-persistence', { count: results.body.results.length, reopenedViaUi: true });

  // In full scope the canary is authenticated, so the same CTA must expose the
  // real paid Sprint intake. Stop before submit so no production checkout is
  // created and no money path is exercised.
  await page.getByRole('button', { name: 'Start 30-Day Evidence Sprint checkout', exact: true }).first().click();
  const paidDialog = page.getByRole('dialog');
  await paidDialog.getByRole('heading', { name: /You tested your idea/i }).waitFor({ state: 'visible', timeout: 10000 });
  await paidDialog.getByText('The PDF shows the full plan. GhostTown shows your next step.', { exact: true }).waitFor({ state: 'visible' });
  proof.controlsInventoried.push({ surface: 'paid-offer-authenticated', control: 'Start My 30-Day Evidence Sprint', action: 'intake_rendered_submit_not_clicked' });
  proof.classifiedNotClicked.push({ control: 'Start My 30-Day Evidence Sprint submit', reason: 'reusable production harness never creates a real Stripe checkout session' });
  await paidDialog.getByRole('button', { name: 'Close checkout', exact: true }).click();
  record('paid-offer-boundary', { authenticatedIntakeRendered: true, realCheckoutCreated: false });

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('heading', { name: 'Previous Assessments', exact: true }).waitFor({ state: 'visible', timeout: 15000 });

  const plans = await ownerGet('/api/paid-test/orders');
  if (!plans.response.ok || !Array.isArray(plans.body?.orders)) fail('Canary paid-order list is unavailable.');
  const readySprints = plans.body.orders.filter(item =>
    item?.status === 'ready'
    && item?.artifactType === 'launch_blueprint_v2'
    && (!SPRINT_ORDER_ID_OVERRIDE || item.orderId === SPRINT_ORDER_ID_OVERRIDE)
  );

  const gmlOrders = await ownerGet('/api/get-me-live/orders');
  if (!gmlOrders.response.ok || !Array.isArray(gmlOrders.body?.orders)) fail('Canary Get Me Live order list is unavailable.');
  const eligiblePairs = [];
  for (const gmlCandidate of gmlOrders.body.orders) {
    if (gmlCandidate?.status !== 'live') continue;
    if (GML_ORDER_ID_OVERRIDE && gmlCandidate.orderId !== GML_ORDER_ID_OVERRIDE) continue;
    const projected = String(gmlCandidate.customDomain ? `https://${gmlCandidate.customDomain}` : gmlCandidate.publicUrl || '').replace(/\/$/, '');
    if (!projected) continue;
    if (LIVE_URL_OVERRIDE && projected !== LIVE_URL_OVERRIDE) continue;
    const sprintCandidate = readySprints.find(item => item.orderId === gmlCandidate.sourceSprintOrderId);
    if (sprintCandidate) eligiblePairs.push({ sprint: sprintCandidate, gml: gmlCandidate, liveUrl: projected });
  }
  if (eligiblePairs.length !== 1) {
    fail(`Full canary discovery requires exactly one ready Sprint → live Get Me Live pair after optional overrides; found ${eligiblePairs.length}. Set PCJ_SPRINT_ORDER_ID / PCJ_GML_ORDER_ID / PCJ_LIVE_URL only when disambiguation is needed.`);
  }

  const [{ sprint, gml, liveUrl }] = eligiblePairs;
  const sprintOrderId = sprint.orderId;
  const gmlOrderId = gml.orderId;

  const releaseReceipt = await ownerGet(`/api/get-me-live/orders/${encodeURIComponent(gmlOrderId)}/release-receipt`);
  if (!releaseReceipt.response.ok || !releaseReceipt.body?.receipt) fail('Canary Get Me Live release receipt is unavailable.');
  const receiptUrl = String(releaseReceipt.body.receipt.pagesUrl || releaseReceipt.body.receipt.liveUrl || '').replace(/\/$/, '');
  if (receiptUrl !== liveUrl) fail(`Release receipt live URL does not match owner projection: ${receiptUrl}`);

  const sprintArticle = page.locator('article').filter({ hasText: sprint.ideaName }).first();
  await sprintArticle.getByRole('button', { name: 'Open Blueprint', exact: true }).click();
  const calendar = page.getByRole('region', { name: '30-day execution calendar' });
  await calendar.waitFor({ state: 'visible', timeout: 30000 });
  const dayButtons = calendar.getByRole('button', { name: /^Day \d+\b/ });
  const dayCount = await dayButtons.count();
  if (dayCount < 30) fail(`Ready Sprint exposes only ${dayCount} day controls.`);
  await dayButtons.first().click();
  await page.getByText(/Today · Day 1/, { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  proof.classifiedNotClicked.push({ surface: '30-Day Sprint', reason: 'production canary progress is read-only; evidence, notes, checkpoints, and completion are not mutated' });
  record('ready-sprint-readonly', { orderId: sprintOrderId, daysVisible: dayCount });

  await page.goto(`${BASE_URL}/get-me-live/setup?order_id=${encodeURIComponent(gmlOrderId)}&step=review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'Get Me Live', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  const checklist = page.getByRole('navigation', { name: 'Launch checklist' });
  await checklist.waitFor({ state: 'visible' });
  const steps = [
    ['Your starting page', 'Your page is already mostly done.'],
    ['Where your page lives', 'Put the page in an account you own.'],
    ['Business name', 'Choose your business name.'],
    ['Look and logo', 'Choose the look.'],
    ['Photos', 'Add photos.'],
    ['Offer and button', 'What are you offering?'],
    ['Free PDF', 'Give visitors a free PDF.'],
    ['Where leads go', 'Where should new leads go?'],
    ['Payments', 'Let people pay.'],
    ['Review and go live', 'Your website is ready.'],
  ];
  for (const [label, heading] of steps) {
    await checklist.getByRole('button', { name: label, exact: false }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    const controls = await page.locator('main button:visible:not([disabled]), main a:visible').evaluateAll(nodes =>
      nodes.map(node => (node.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    proof.controlsInventoried.push({ surface: `Get Me Live: ${label}`, controls });
  }
  await assertNoInternalLanguage(page, 'Get Me Live workspace');
  proof.classifiedNotClicked.push({
    surface: 'Get Me Live provider controls',
    reason: 'production journey inventories provider-changing controls but never publishes, attaches domains, connects payments, changes email routing, or edits provider state',
  });
  record('get-me-live-owner-workspace', {
    orderId: gmlOrderId,
    sourceSprintOrderId: sprintOrderId,
    checklistSteps: steps.length,
    releaseReceiptVerified: true,
  });

  const live = await context.newPage();
  const liveNav = await live.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (liveNav?.status() !== 200) fail(`Canary live page expected HTTP 200, received ${liveNav?.status()}`);
  if (await live.locator('form').count() < 1 || await live.locator('input[name="email"]').count() < 1) fail('Canary live page is missing lead capture.');
  proof.classifiedNotClicked.push({ surface: 'public lead form', reason: 'synthetic production leads are not submitted by the reusable harness' });
  record('published-canary-page', { liveUrl, httpStatus: liveNav?.status(), leadFormPresent: true });
  await live.close();

  await context.close();
}

await mkdir(ARTIFACT_DIR, { recursive: true });
let browser;
try {
  await runHealth();
  await runProtectedRouteNegative();
  browser = await chromium.launch({ headless: true });
  await runSurfaceJourney(browser);
  if (SCOPE === 'full') await runFullCanary(browser);
  else skip('full-canary-continuity', 'surface scope selected');
  if (proof.pageErrors.length) fail('Browser page errors: ' + JSON.stringify(proof.pageErrors));
  if (proof.serverErrors.length) fail('Production API 5xx responses: ' + JSON.stringify(proof.serverErrors));
  if (proof.blockedDangerousRequests.length) fail('Journey attempted a forbidden production mutation: ' + JSON.stringify(proof.blockedDangerousRequests));
  proof.passed = true;
} catch (error) {
  proof.passed = false;
  proof.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  proof.finishedAt = new Date().toISOString();
  await writeFile(`${ARTIFACT_DIR}/execution-receipt.json`, JSON.stringify(proof, null, 2) + '\n');
  if (browser) await browser.close();
}

console.log(`[production-customer-journey] PASS scope=${SCOPE} worker=${EXPECTED_WORKER_VERSION}`);
