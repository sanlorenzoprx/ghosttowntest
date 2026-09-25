import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const getMeLiveOrderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
const liveUrl = String(process.env.GHOSTTOWN_E2E_LIVE_URL || '').replace(/\/$/, '');
const submitLead = process.env.GHOSTTOWN_E2E_SUBMIT_LEAD === '1';

const required = { GHOSTTOWN_E2E_BASE_URL: baseUrl, GHOSTTOWN_E2E_AUTH_TOKEN: authToken, GHOSTTOWN_E2E_GML_ORDER_ID: getMeLiveOrderId, GHOSTTOWN_E2E_LIVE_URL: liveUrl };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.log('[ghosttown-e2e] SKIP: runtime acceptance variables are not configured.');
  console.log('[ghosttown-e2e] Missing: ' + missing.join(', '));
  process.exit(0);
}

const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === 'win32' && existsSync(windowsChrome) ? { executablePath: windowsChrome } : {})
});

const fail = message => { throw new Error(message); };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const serverErrors = [];
  page.on('response', response => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  const navigation = await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (navigation?.status() !== 200) fail(`Live page expected HTTP 200, received ${navigation?.status()}`);
  if (await page.locator('form').count() < 1) fail('Live page is missing its lead form.');
  if (await page.locator('input[name="email"]').count() < 1) fail('Live page is missing its email field.');
  if (serverErrors.length) fail('Live page produced server errors: ' + serverErrors.join(' | '));

  const receiptResponse = await page.request.get(
    `${baseUrl}/api/get-me-live/orders/${encodeURIComponent(getMeLiveOrderId)}/release-receipt`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  if (receiptResponse.status() !== 200) fail(`Release receipt expected HTTP 200, received ${receiptResponse.status()}`);
  const { receipt } = await receiptResponse.json();
  if (receipt?.schemaVersion !== 'ghosttown-get-me-live-release-receipt-v1') fail('Release receipt schema mismatch.');
  if (String(receipt?.liveUrl || '').replace(/\/$/, '') !== liveUrl) fail('Release receipt live URL does not match the tested customer page.');
  for (const [name, expected] of Object.entries({
    customerPageReachable: true,
    customerPageHttpStatus: 200,
    leadCaptureConfigured: true,
    activityTrackingConfigured: true
  })) {
    if (receipt?.checks?.[name] !== expected) fail(`Release receipt check ${name} expected ${expected}, received ${receipt?.checks?.[name]}`);
  }

  console.log('[ghosttown-e2e] PASS: live page + release receipt.');

  if (submitLead) {
    const marker = `e2e-${Date.now()}@example.test`;
    const form = page.locator('form').first();
    await form.locator('input[name="name"]').fill('GhostTown E2E');
    await form.locator('input[name="email"]').fill(marker);
    const message = form.locator('textarea[name="message"]');
    if (await message.count()) await message.fill('Durable GhostTown acceptance journey test.');
    const consent = form.locator('input[name="consent"]');
    if (await consent.count()) await consent.check();

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      form.locator('button[type="submit"],input[type="submit"]').first().click()
    ]);
    if (new URL(page.url()).searchParams.get('lead') !== 'received') fail('Lead submission did not return to the canonical success state.');

    const orderResponse = await page.request.get(
      `${baseUrl}/api/get-me-live/orders/${encodeURIComponent(getMeLiveOrderId)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (orderResponse.status() !== 200) fail(`Owner order expected HTTP 200, received ${orderResponse.status()}`);
    const orderBody = await orderResponse.json();
    if (!Array.isArray(orderBody.leads) || !orderBody.leads.some(lead => lead.email === marker)) fail('Submitted E2E lead did not return to the GhostTown owner view.');
    console.log('[ghosttown-e2e] PASS: disposable lead submitted and observed in GhostTown.');
  } else {
    console.log('[ghosttown-e2e] Lead mutation skipped. Set GHOSTTOWN_E2E_SUBMIT_LEAD=1 only in disposable acceptance runs.');
  }

  await context.close();
} finally {
  await browser.close();
}
