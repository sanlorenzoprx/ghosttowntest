const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.GHOSTTOWN_ACCEPTANCE_URL || 'https://ghosttown-acceptance.pages.dev/';
const out = process.env.JOURNEY_ARTIFACT_DIR || 'artifacts/paid-customer-journey';
const stamp = Date.now();
const email = `ghosttown.acceptance+${stamp}@example.com`;
const password = `GtTest-${stamp}-A!`;
const testCardNumber = process.env.STRIPE_TEST_CARD_NUMBER || '4242424242424242';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: path.join(out, 'video') } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  let step = 0;
  async function shot(label) {
    step += 1;
    await page.screenshot({ path: path.join(out, String(step).padStart(2,'0') + '-' + label + '.png'), timeout: 15000 });
  }

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await shot('home');
    await page.getByRole('button', { name: /Test My Idea Free/i }).first().click();
    await page.locator('#ideaName').fill('Paid Cloud Acceptance ' + stamp);
    await page.locator('#description').fill('A service that helps neighborhood businesses test demand before spending money to launch.');
    await page.locator('#targetUser').fill('Independent neighborhood business owners');
    await page.locator('#painfulProblem').fill('They spend money launching before knowing what customers will buy.');
    await page.locator('#currentAlternative').fill('They ask customers, post on social media, and run small trials.');
    await page.locator('input[type=checkbox]').check();
    await page.getByTestId('evaluate-button').click();

    for (let i = 0; i < 25; i++) {
      const buttons = page.locator('main button');
      let pick = null;
      for (let j = 0; j < await buttons.count(); j++) {
        const b = buttons.nth(j);
        const t = (await b.innerText().catch(() => '')).trim();
        if (await b.isVisible().catch(() => false) && t && !/Back|Home|Contact|English|Spanish|Log In/i.test(t)) pick = b;
      }
      if (!pick) break;
      await pick.click();
      await page.waitForTimeout(150);
      if (await page.getByText('Prospecting for the truth', { exact: false }).isVisible().catch(() => false)) break;
    }

    const sprintCta = page.getByRole('button', { name: /Start 30-Day Evidence Sprint checkout/i }).first();
    await sprintCta.waitFor({ state: 'visible', timeout: 60000 });
    await shot('free-verdict');
    await sprintCta.click();

    let dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    await shot('account-gate');
    if (!/Create Account/i.test((await dialog.locator('h2').first().innerText()).trim())) {
      const signupSwitch = dialog.getByRole('button', { name: /Sign up/i });
      if (await signupSwitch.isVisible().catch(() => false)) await signupSwitch.click();
    }
    await dialog.locator('input[type=email]').fill(email);
    await dialog.locator('input[type=password]').fill(password);
    await dialog.getByRole('button', { name: /^Create Account$/i }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 20000 });
    await shot('account-created');

    await sprintCta.waitFor({ state: 'visible', timeout: 10000 });
    await sprintCta.click();
    dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    await shot('sprint-setup');
    await dialog.getByRole('button', { name: /Start My 30-Day Evidence Sprint/i }).click();

    await page.waitForURL(url => url.hostname === 'checkout.stripe.com', { timeout: 30000 });
    await shot('stripe-checkout');

    const bodyText = await page.locator('body').innerText();
    if (!/test/i.test(bodyText)) throw new Error('SAFETY: Stripe TEST mode was not visibly confirmed; payment was not attempted.');

    // Stripe Checkout initially presents payment-method choices. Select Card first,
    // then fill Stripe's current hosted card form using accessible labels.
    const cardMethod = page.getByText('Card', { exact: true }).first();
    if (await cardMethod.isVisible().catch(() => false)) await cardMethod.click();

    const cardNumber = page.getByLabel(/Card number/i).or(page.locator('input[autocomplete="cc-number"]')).first();
    await cardNumber.waitFor({ state: 'visible', timeout: 15000 });
    await cardNumber.fill(testCardNumber);
    await page.getByLabel(/Expiration|Expiry/i).or(page.locator('input[autocomplete="cc-exp"]')).first().fill(process.env.STRIPE_TEST_EXPIRY || '1234');
    await page.getByLabel(/CVC|Security code/i).or(page.locator('input[autocomplete="cc-csc"]')).first().fill(process.env.STRIPE_TEST_CVC || '123');
    const cardholder = page.getByLabel(/Cardholder name|Name on card/i).or(page.locator('input[autocomplete="cc-name"]')).first();
    if (await cardholder.isVisible().catch(() => false)) await cardholder.fill('John Brown');
    const postal = page.getByLabel(/ZIP|Postal/i).or(page.locator('input[autocomplete="postal-code"]')).first();
    if (await postal.isVisible().catch(() => false)) await postal.fill(process.env.STRIPE_TEST_POSTAL || '00745');
    await page.getByRole('button', { name: /Pay|Subscribe|Complete|Purchase/i }).last().click();

    await page.waitForURL(url => url.hostname !== 'checkout.stripe.com', { timeout: 60000 });
    await shot('paid-return');

    const seedButton = page.getByRole('button', { name: /Use These Resources and Build My Blueprint/i });
    if (await seedButton.waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false)) {
      await shot('research-seeds');
      await seedButton.click();
      await shot('research-started');
    }

    await page.getByText(/Launch Blueprint and professional PDF are ready/i).waitFor({ state: 'visible', timeout: 15 * 60 * 1000 });
    await shot('sprint-ready');
    const getMeLive = page.getByRole('button', { name: /See Get Me Live/i });
    await getMeLive.waitFor({ state: 'visible', timeout: 30000 });
    await shot('get-me-live-offer');
    await getMeLive.click();
    await page.waitForURL(/\/get-me-live/, { timeout: 20000 });
    await shot('get-me-live');

    console.log(JSON.stringify({ status: 'PASS_TO_GET_ME_LIVE', finalUrl: page.url(), customerEmail: email, consoleErrors: errors }, null, 2));
    if (errors.length) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    try { await shot('failure'); } catch {}
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
})();