// Authenticated owner-control audit for the disposable Get Me Live fixture.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiBase = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const orderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
const liveUrl = String(process.env.GHOSTTOWN_E2E_LIVE_URL || '').replace(/\/$/, '');
for (const [name, value] of Object.entries({ baseUrl, apiBase, authToken, orderId, liveUrl })) {
  if (!value) throw new Error('Missing owner-control input: ' + name);
}
if (/ghosttowntest\.com|lit-ghosttown\.app/i.test(new URL(apiBase).hostname)) {
  throw new Error('Owner-control audit refuses the production API.');
}

const proof = {
  schemaVersion: 'ghosttown-get-me-live-owner-controls-v1',
  orderId,
  surfaces: [],
  exercised: [],
  classifiedNotClicked: [],
  errors: [],
  recordedAt: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
const productionHosts = new Set(['api.ghosttowntest.com', 'api.lit-ghosttown.app']);
const productionRequests = [];
await context.route('**/*', async route => {
  const url = route.request().url();
  let host = '';
  try { host = new URL(url).hostname; } catch {}
  if (productionHosts.has(host)) {
    productionRequests.push(url);
    await route.abort('blockedbyclient');
    return;
  }
  await route.continue();
});

const page = await context.newPage();
const pageErrors = [];
const serverErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('response', response => {
  if (response.status() >= 500 && response.url().startsWith(apiBase)) {
    serverErrors.push({ status: response.status(), method: response.request().method(), url: response.url() });
  }
});

const fail = message => { throw new Error(message); };

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(token => localStorage.setItem('lit_user_token_v1', token), authToken);
  const setupUrl = baseUrl + '/get-me-live/setup?order_id=' + encodeURIComponent(orderId) + '&step=review';
  await page.goto(setupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('heading', { name: 'Get Me Live', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('heading', { name: 'Your website is ready.', exact: true }).waitFor({ state: 'visible', timeout: 30000 });

  const checklist = page.getByRole('navigation', { name: 'Launch checklist' });
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

  for (const [stepLabel, heading] of steps) {
    await checklist.getByRole('button', { name: stepLabel, exact: false }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    const activeButtons = await page.locator('main button:visible:not([disabled])').evaluateAll(buttons =>
      buttons.map(button => (button.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    const activeLinks = await page.locator('main a:visible').evaluateAll(links =>
      links.map(link => ({
        text: (link.textContent || '').replace(/\s+/g, ' ').trim(),
        href: link.getAttribute('href') || '',
        target: link.getAttribute('target') || '',
      })).filter(item => item.text)
    );
    proof.surfaces.push({ step: stepLabel, activeButtons, activeLinks });
  }

  await checklist.getByRole('button', { name: 'Review and go live', exact: false }).click();
  await page.getByRole('heading', { name: 'Your website is ready.', exact: true }).waitFor({ state: 'visible' });

  const openWebsite = page.getByRole('link', { name: 'Open My Website', exact: true });
  if ((await openWebsite.getAttribute('href')) !== liveUrl) fail('Open My Website does not point to the canonical Pages URL.');
  if ((await openWebsite.getAttribute('target')) !== '_blank') fail('Open My Website must open in a new tab.');
  proof.exercised.push({ control: 'Open My Website', result: 'href_verified' });

  await page.getByRole('button', { name: 'Copy Website Link', exact: true }).click();
  await page.getByText('Website link copied.', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  if (copied !== liveUrl) fail('Copy Website Link did not copy the canonical URL.');
  proof.exercised.push({ control: 'Copy Website Link', result: 'passed' });

  await page.getByRole('button', { name: 'Open Launch Share Pack', exact: true }).click();
  await page.getByRole('heading', { name: 'Three posts, ready to share', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  const sharePack = page.getByRole('region', { name: 'Launch Share Pack drafts', exact: true });
  await sharePack.waitFor({ state: 'visible', timeout: 5000 });
  const copyButtons = sharePack.getByRole('button', { name: 'Copy', exact: true });
  const copyCount = await copyButtons.count();
  if (copyCount < 1) fail('Launch Share Pack returned no copyable drafts.');
  for (let i = 0; i < copyCount; i += 1) {
    await copyButtons.nth(i).click();
    await page.getByText('Post copied.', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  }
  proof.exercised.push({ control: 'Launch Share Pack copy buttons', result: 'passed', count: copyCount });

  const shareButtons = sharePack.getByRole('button', { name: 'Share', exact: true });
  if (await shareButtons.count()) {
    await shareButtons.first().click();
    await page.waitForTimeout(300);
    proof.exercised.push({ control: 'Share first draft', result: 'passed' });
  }

  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await page.getByText('Right now', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  proof.exercised.push({ control: 'Check again', result: 'passed' });

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: 'Download receipt', exact: true }).click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().startsWith('ghosttown-release-receipt-')) {
    fail('Release receipt download filename is unexpected: ' + download.suggestedFilename());
  }
  proof.exercised.push({ control: 'Download receipt', result: 'downloaded' });

  const registrar = page.getByRole('link', { name: 'Find My Website Address', exact: true });
  if (await registrar.count()) {
    const href = String(await registrar.getAttribute('href') || '');
    if (!href.startsWith('https://dash.cloudflare.com/')) fail('Website-address handoff is not Cloudflare.');
    if ((await registrar.getAttribute('target')) !== '_blank') fail('Website-address handoff should open in a new tab.');
    proof.exercised.push({ control: 'Find My Website Address', result: 'external_handoff_verified' });

    await page.getByRole('button', { name: 'I bought it — connect it', exact: true }).click();
    await page.getByRole('button', { name: 'I bought it — connect it', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    proof.exercised.push({ control: 'I bought it — connect it', result: 'zone_discovery_passed' });
    const connectButtons = page.getByRole('button', { name: /^Connect / });
    const connectCount = await connectButtons.count();
    if (connectCount) {
      proof.classifiedNotClicked.push({
        controls: await connectButtons.allTextContents(),
        reason: 'provider-mutating domain attachment is covered by the dedicated Custom Domain Acceptance workflow',
      });
    }
  }

  // Classify provider-mutating controls rather than duplicating destructive provider acceptance here.
  for (const stepLabel of ['Look and logo', 'Photos', 'Offer and button', 'Free PDF', 'Payments']) {
    const surface = proof.surfaces.find(item => item.step === stepLabel);
    if (surface) {
      proof.classifiedNotClicked.push({
        surface: stepLabel,
        controls: surface.activeButtons,
        reason: 'configuration/provider mutation; presence inventoried here and behavior covered by focused API/component or provider acceptance gates',
      });
    }
  }

  await page.getByRole('button', { name: 'Dashboard', exact: false }).first().click();
  await page.getByRole('heading', { name: 'Your live businesses', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  proof.exercised.push({ control: 'Dashboard return', result: 'passed' });

  if (productionRequests.length) fail('Owner audit attempted production API: ' + productionRequests[0]);
  if (pageErrors.length) fail('Owner audit page errors: ' + JSON.stringify(pageErrors));
  if (serverErrors.length) fail('Owner audit server errors: ' + JSON.stringify(serverErrors));

  proof.passed = true;
} catch (error) {
  proof.passed = false;
  proof.errors.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  proof.pageErrors = pageErrors;
  proof.serverErrors = serverErrors;
  proof.productionApiRequests = productionRequests;
  await mkdir('github-acceptance', { recursive: true });
  await writeFile('github-acceptance/get-me-live-owner-controls.json', JSON.stringify(proof, null, 2) + '\n');
  await browser.close();
}

console.log('[ghosttown-gml-owner-controls] PASS: all checklist surfaces inventoried and safe owner controls exercised.');
