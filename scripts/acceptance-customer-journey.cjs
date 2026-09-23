const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.GHOSTTOWN_ACCEPTANCE_URL || 'https://ghosttown-acceptance.pages.dev/';
const out = process.env.JOURNEY_ARTIFACT_DIR || 'artifacts/customer-journey';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: path.join(out, 'video') }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  let step = 0;
  async function shot(label) {
    step += 1;
    await page.screenshot({ path: path.join(out, String(step).padStart(2,'0') + '-' + label + '.png'), timeout: 10000 });
  }

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await shot('home');
    await page.getByRole('button', { name: /Test My Idea Free/i }).first().click();
    await page.locator('#ideaName').fill('Cloud Acceptance Journey ' + Date.now());
    await page.locator('#description').fill('A service that helps neighborhood businesses test demand before spending money to launch.');
    await page.locator('#targetUser').fill('Independent neighborhood business owners');
    await page.locator('#painfulProblem').fill('They spend money launching before knowing what customers will buy.');
    await page.locator('#currentAlternative').fill('They ask customers, post on social media, and run small trials.');
    await page.locator('input[type=checkbox]').check();
    await shot('intake');
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

    await page.getByRole('button', { name: /Start 30-Day Evidence Sprint checkout/i }).first().waitFor({ state: 'visible', timeout: 60000 });
    await shot('free-verdict');
    await page.getByRole('button', { name: /Start 30-Day Evidence Sprint checkout/i }).first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10000 });
    await shot('account-gate');

    console.log(JSON.stringify({
      status: 'PASS_TO_ACCOUNT_GATE',
      url: page.url(),
      consoleErrors: errors
    }, null, 2));
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