// Pre-live front-door acceptance: real Login UI -> free verdict -> Sprint checkout handoff.
// Uses the disposable self-provisioned acceptance owner and never completes payment.
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiUrl = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const email = String(process.env.GHOSTTOWN_E2E_FIXTURE_OWNER || '').trim();
const password = String(process.env.GHOSTTOWN_E2E_FIXTURE_PASSWORD || '');
const envFile = String(process.env.GITHUB_ENV || '');
if (!baseUrl || !apiUrl || !email || !password || !envFile) {
  throw new Error('Front-door acceptance requires base URL, API URL, fixture owner/password and GITHUB_ENV.');
}
if (/ghosttowntest\.com|lit-ghosttown\.app/i.test(new URL(baseUrl).hostname)) {
  throw new Error('Front-door acceptance refuses a production frontend.');
}

const proof = {
  schemaVersion: 'ghosttown-prelive-front-door-v1',
  baseUrl,
  login: false,
  intake: false,
  questionsAnswered: 0,
  verdictRendered: false,
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
page.on('response', response => {
  if (response.status() >= 500 && response.url().startsWith(apiUrl)) {
    serverErrors.push({ status: response.status(), url: response.url() });
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

  // Open the real paid Sprint intake and create a real Stripe TEST checkout session.
  await page.getByRole('button', { name: 'Start 30-Day Evidence Sprint checkout', exact: true }).first().click();
  const checkoutDialog = page.getByRole('dialog');
  await checkoutDialog.getByRole('heading', { name: /You tested your idea/i }).waitFor({ state: 'visible' });
  await checkoutDialog.getByText('The PDF shows the full plan. GhostTown shows your next step.', { exact: true }).waitFor({ state: 'visible' });
  proof.checkoutModal = true;
  proof.controls.push({ surface: 'verdict', control: 'Start 30-Day Evidence Sprint checkout', result: 'passed' });

  // The required fields should be prefilled from the verdict. Fill defensively if not.
  const buyer = checkoutDialog.getByLabel('Who do you want to help first?');
  const problem = checkoutDialog.getByLabel('What problem do they have?');
  const workaround = checkoutDialog.getByLabel('What do they do now?');
  if (!(await buyer.inputValue()).trim()) await buyer.fill('Independent local service businesses');
  if (!(await problem.inputValue()).trim()) await problem.fill('Qualified inquiries are not followed up consistently.');
  if (!(await workaround.inputValue()).trim()) await workaround.fill('Spreadsheets and inbox reminders.');

  const checkoutResponsePromise = page.waitForResponse(
    response => response.url() === `${apiUrl}/api/paid-test/checkout` && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await checkoutDialog.getByRole('button', { name: /Start My 30-Day Evidence Sprint/i }).click();
  const checkoutResponse = await checkoutResponsePromise;
  const checkoutBody = await checkoutResponse.json().catch(() => ({}));
  if (!checkoutResponse.ok() || !/^gtt_[A-Za-z0-9_-]+$/.test(String(checkoutBody.orderId || ''))) {
    throw new Error(`Sprint checkout creation failed HTTP ${checkoutResponse.status()}: ${JSON.stringify(checkoutBody)}`);
  }
  await appendFile(envFile, `GHOSTTOWN_E2E_CHECKOUT_ORDER_ID=${checkoutBody.orderId}\n`);

  await page.waitForURL(url => url.hostname === 'checkout.stripe.com', { timeout: 30000 });
  const stripeUrl = page.url();
  if (!/checkout\.stripe\.com/.test(stripeUrl) || !/cs_test_/i.test(stripeUrl)) {
    throw new Error(`Checkout did not reach a Stripe test session: ${stripeUrl}`);
  }
  proof.stripeTestCheckout = true;
  proof.controls.push({ surface: 'sprint-checkout', control: 'Start My 30-Day Evidence Sprint', result: 'passed_test_mode' });

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

console.log('[ghosttown-front-door-e2e] PASS: login, free verdict, complete questionnaire and Stripe test checkout handoff.');
