// Pre-live front-door acceptance: real Login UI -> free verdict -> First 30 email list,
// plus an API proof that the dormant Sprint checkout still reaches Stripe test mode.
// Uses the disposable self-provisioned acceptance owner and never completes payment.
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiUrl = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const email = String(process.env.GHOSTTOWN_E2E_FIXTURE_OWNER || '').trim();
const password = String(process.env.GHOSTTOWN_E2E_FIXTURE_PASSWORD || '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const envFile = String(process.env.GITHUB_ENV || '');
if (!baseUrl || !apiUrl || !email || !password || !authToken || !envFile) {
  throw new Error('Front-door acceptance requires base URL, API URL, fixture owner/password, auth token and GITHUB_ENV.');
}
if (/ghosttownverdict\.app|ghosttowntest\.com|lit-ghosttown\.app/i.test(new URL(baseUrl).hostname)) {
  throw new Error('Front-door acceptance refuses a production frontend.');
}

const proof = {
  schemaVersion: 'ghosttown-prelive-front-door-v1',
  baseUrl,
  login: false,
  intake: false,
  questionsAnswered: 0,
  verdictRendered: false,
  first30Waitlist: false,
  sprintCtaHidden: false,
  checkoutModal: false,
  stripeTestCheckout: false,
  controls: [],
  errors: [],
  recordedAt: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
const serverErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
let verdictBody = null;
page.on('response', response => {
  if (response.status() >= 500 && response.url().startsWith(apiUrl)) {
    serverErrors.push({ status: response.status(), url: response.url() });
  }
  if (response.url() === `${apiUrl}/api/verdict` && response.request().method() === 'POST' && response.ok()) {
    response.json().then(body => { verdictBody = body; }).catch(() => undefined);
  }
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });

  // Actual login surface, not token injection.
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const authDialog = page.getByRole('dialog');
  await authDialog.getByRole('heading', { name: 'Log In', exact: true }).waitFor({ state: 'visible' });
  await authDialog.getByLabel('Email Address').fill(email);
  await authDialog.getByLabel('Password').fill(password);
  await authDialog.getByRole('button', { name: 'Log In', exact: true }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  proof.login = true;
  proof.controls.push({ surface: 'auth', control: 'Log In', result: 'passed' });

  // Start a fresh free verdict from the authenticated landing page.
  await page.getByRole('button', { name: /Test My Idea Free/i }).first().click();
  await page.getByRole('heading', { name: 'Tell us about your idea', exact: true }).waitFor({ state: 'visible' });
  await page.getByLabel("What's your idea called?").fill('Pre-live customer journey test');
  await page.getByLabel('What does it do?').fill('A synthetic service that helps local service businesses turn missed inquiries into scheduled follow-up.');
  await page.getByLabel('Who is it for? (Be specific)').fill('Independent local service businesses with a small owner-led sales process');
  await page.getByLabel('What painful problem does it solve?').fill('Owners lose qualified inquiries because follow-up is inconsistent and slow.');
  await page.getByLabel('How do people solve this today?').fill('Spreadsheets, inbox reminders, and manual text follow-up.');
  await page.getByLabel('Why do you want to build this?').fill('Synthetic acceptance input used only to verify the GhostTown customer journey.');
  await page.getByRole('checkbox').check();
  await page.getByTestId('evaluate-button').click();
  proof.intake = true;
  proof.controls.push({ surface: 'free-test', control: 'Start Assessment · About 5 Minutes', result: 'passed' });

  // Answer the complete 17-question test through the UI.
  for (let index = 0; index < 17; index += 1) {
    const footer = page.getByText("There are no wrong answers. We're evaluating your idea objectively.", { exact: true });
    await footer.waitFor({ state: 'visible', timeout: 15000 });
    const card = footer.locator('..');
    const heading = card.locator('h3').first();
    const before = await heading.innerText();
    const options = card.getByRole('button');
    const count = await options.count();
    if (count < 4) throw new Error(`Question ${index + 1} exposed only ${count} answer buttons.`);
    await options.nth(Math.min(3, count - 1)).click();
    proof.questionsAnswered += 1;
    if (index < 16) {
      await page.waitForFunction(previous => {
        const h = document.querySelector('main h3');
        return Boolean(h && h.textContent && h.textContent.trim() !== previous);
      }, before, { timeout: 10000 }).catch(() => undefined);
    }
  }

  await page.getByTestId('verdict-card').waitFor({ state: 'visible', timeout: 180000 });
  await page.getByTestId('next-step').waitFor({ state: 'visible' });
  proof.verdictRendered = true;

  // Rollout phase 1: the verdict page offers the First 30 email list, not the Sprint.
  const waitlist = page.getByTestId('first-30-waitlist');
  await waitlist.waitFor({ state: 'visible', timeout: 20000 });
  if (await page.getByRole('button', { name: 'Start 30-Day Evidence Sprint checkout', exact: true }).count()) {
    throw new Error('Verdict page still shows the dormant Sprint checkout.');
  }
  proof.sprintCtaHidden = true;
  const waitlistEmail = `first30-acceptance-${Date.now()}@example.test`;
  await waitlist.getByLabel('Email address').fill(waitlistEmail);
  await waitlist.getByRole('checkbox').check();
  const joinResponsePromise = page.waitForResponse(
    response => response.url() === `${apiUrl}/api/first30/waitlist` && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await waitlist.getByRole('button', { name: 'Join the First 30 list', exact: true }).click();
  const joinResponse = await joinResponsePromise;
  if (![200, 201].includes(joinResponse.status())) {
    throw new Error(`First 30 signup failed HTTP ${joinResponse.status()}: ${(await joinResponse.text().catch(() => '')).slice(0, 300)}`);
  }
  await page.getByTestId('first-30-joined').waitFor({ state: 'visible', timeout: 10000 });
  proof.first30Waitlist = true;
  proof.controls.push({ surface: 'verdict', control: 'Join the First 30 list', result: 'passed' });

  // The Sprint stays dormant, not deleted: acceptance keeps proving that its
  // checkout still creates a Stripe TEST session for this owner's verdict.
  for (let attempt = 0; attempt < 20 && !verdictBody?.resultId; attempt += 1) await page.waitForTimeout(250);
  if (!verdictBody?.resultId) throw new Error('Free verdict response was not captured.');
  const authHeaders = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
  const claimResponse = await fetch(`${apiUrl}/api/results`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ result: verdictBody }) });
  if (!claimResponse.ok) throw new Error(`Saving the verdict before Sprint checkout failed HTTP ${claimResponse.status}`);
  const checkoutResponse = await fetch(`${apiUrl}/api/paid-test/checkout`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      verdictId: verdictBody.resultId,
      targetBuyer: 'Independent local service businesses',
      problem: 'Qualified inquiries are not followed up consistently.',
      currentWorkaround: 'Spreadsheets and inbox reminders.',
    }),
  });
  const checkoutBody = await checkoutResponse.json().catch(() => ({}));
  if (!checkoutResponse.ok || !checkoutBody?.sessionUrl) {
    throw new Error(`Dormant Sprint checkout creation failed HTTP ${checkoutResponse.status}: ${JSON.stringify(checkoutBody).slice(0, 500)}`);
  }
  const stripeUrl = String(checkoutBody.sessionUrl);
  if (!/^https:\/\/checkout\.stripe\.com\//.test(stripeUrl) || !/cs_test_/i.test(stripeUrl)) {
    throw new Error(`Checkout did not return a Stripe test session: ${stripeUrl}`);
  }

  // Prove the checkout side effect independently from the authenticated order projection.
  const ordersResponse = await fetch(`${apiUrl}/api/paid-test/orders`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const ordersBody = await ordersResponse.json().catch(() => ({}));
  const checkoutOrder = Array.isArray(ordersBody?.orders)
    ? ordersBody.orders.find(order => order?.status === 'checkout_created' && /^gtt_[A-Za-z0-9_-]+$/.test(String(order?.orderId || '')))
    : null;
  if (!ordersResponse.ok || !checkoutOrder?.orderId) {
    throw new Error(`Stripe test checkout opened but GhostTown did not expose the checkout_created order: HTTP ${ordersResponse.status}`);
  }
  await appendFile(envFile, `GHOSTTOWN_E2E_CHECKOUT_ORDER_ID=${checkoutOrder.orderId}\n`);
  proof.checkoutOrderId = checkoutOrder.orderId;
  proof.stripeTestCheckout = true;
  proof.controls.push({ surface: 'sprint-checkout-api', control: 'POST /api/paid-test/checkout (dormant Sprint)', result: 'passed_test_mode' });

  if (pageErrors.length || serverErrors.length) {
    throw new Error(`Front-door browser errors: page=${JSON.stringify(pageErrors)} server=${JSON.stringify(serverErrors)}`);
  }

  proof.passed = true;
} catch (error) {
  proof.passed = false;
  proof.errors.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  proof.pageErrors = pageErrors;
  proof.serverErrors = serverErrors;
  await mkdir('github-acceptance', { recursive: true });
  await writeFile('github-acceptance/front-door-proof.json', JSON.stringify(proof, null, 2) + '\n');
  await browser.close();
}

console.log('[ghosttown-front-door-e2e] PASS: login, free verdict, complete questionnaire, First 30 signup and dormant Sprint Stripe test checkout.');
