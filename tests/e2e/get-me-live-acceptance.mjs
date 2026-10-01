import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiBase = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const getMeLiveOrderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
// Cross-check only: the URL under test comes from the stored launch receipt.
const fixtureLiveUrl = String(process.env.GHOSTTOWN_E2E_LIVE_URL || '').replace(/\/$/, '');
const submitLead = process.env.GHOSTTOWN_E2E_SUBMIT_LEAD === '1';

const required = { GHOSTTOWN_E2E_BASE_URL: baseUrl, GHOSTTOWN_E2E_API_URL: apiBase, GHOSTTOWN_E2E_AUTH_TOKEN: authToken, GHOSTTOWN_E2E_GML_ORDER_ID: getMeLiveOrderId, GHOSTTOWN_E2E_LIVE_URL: fixtureLiveUrl };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error('Runtime Get Me Live acceptance is mandatory. Missing: ' + missing.join(', '));
if (!submitLead) throw new Error('Runtime Get Me Live acceptance must submit a disposable lead. Set GHOSTTOWN_E2E_SUBMIT_LEAD=1.');

const productionApiHosts = new Set(['api.ghosttowntest.com', 'api.lit-ghosttown.app']);
const apiHost = new URL(apiBase).hostname;
if (productionApiHosts.has(apiHost)) throw new Error(`Acceptance API origin points to production: ${apiBase}`);

const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === 'win32' && existsSync(windowsChrome) ? { executablePath: windowsChrome } : {})
});

const fail = message => { throw new Error(message); };
const ownerGet = path => fetch(`${apiBase}/api/get-me-live/orders/${encodeURIComponent(getMeLiveOrderId)}${path}`, { headers: { Authorization: `Bearer ${authToken}` } });

// The stored launch receipt names the stable Pages URL to test (v2), or the
// computed liveUrl for receipts written before Slice 2 (v1).
const receiptResponse = await ownerGet('/release-receipt');
if (receiptResponse.status !== 200) fail(`Release receipt expected HTTP 200, received ${receiptResponse.status}`);
const receiptText = await receiptResponse.text();
const { receipt } = JSON.parse(receiptText);
const receiptVersion = receipt?.schemaVersion;
if (receiptVersion !== 'ghosttown-get-me-live-release-receipt-v1' && receiptVersion !== 'ghosttown-get-me-live-release-receipt-v2') fail(`Release receipt schema mismatch: ${receiptVersion}`);
const liveUrl = String(receiptVersion.endsWith('-v2') ? receipt.pagesUrl : receipt.liveUrl || '').replace(/\/$/, '');
if (!/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(liveUrl)) fail(`Release receipt URL is not a stable pages.dev URL (no deployment hash): ${liveUrl}`);
if (liveUrl !== fixtureLiveUrl) fail(`Release receipt URL ${liveUrl} does not match the fixture's verified URL ${fixtureLiveUrl}.`);
const repeatReceipt = await ownerGet('/release-receipt');
if ((await repeatReceipt.text()) !== receiptText) fail('Release receipt changed between two reads; the launch receipt must be byte-identical.');

const proof = { schemaVersion: 'ghosttown-get-me-live-browser-proof-v2', liveUrl, receiptSchema: receiptVersion, getMeLiveOrderId, viewports: [], lead: null, recordedAt: new Date().toISOString() };
await mkdir('github-acceptance', { recursive: true });
const productionApiRequests = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', async route => {
    const requestUrl = route.request().url();
    let host = '';
    try { host = new URL(requestUrl).hostname; } catch {}
    if (productionApiHosts.has(host)) {
      productionApiRequests.push(requestUrl);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
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
  proof.viewports.push({ name: 'mobile', width: 390, height: 844, httpStatus: navigation?.status(), leadFormVisible: true });

  const desktop = await context.newPage();
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  const desktopNavigation = await desktop.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (desktopNavigation?.status() !== 200) fail(`Desktop live page expected HTTP 200, received ${desktopNavigation?.status()}`);
  if (await desktop.locator('form').count() < 1 || await desktop.locator('input[name="email"]').count() < 1) fail('Desktop live page is missing its lead form or email field.');
  proof.viewports.push({ name: 'desktop', width: 1440, height: 1000, httpStatus: desktopNavigation?.status(), leadFormVisible: true });
  await desktop.close();

  if (receiptVersion.endsWith('-v2')) {
    if (receipt.kind !== 'launch') fail(`Release receipt kind expected launch, received ${receipt.kind}`);
    for (const [name, expected] of Object.entries({ customerPageHttpStatus: 200, leadCaptureConfigured: true, activityTrackingConfigured: true })) {
      if (receipt?.checks?.[name] !== expected) fail(`Release receipt check ${name} expected ${expected}, received ${receipt?.checks?.[name]}`);
    }
    if (receipt.backfilled !== true && receipt.checks.releaseMarkerServed !== true) fail('A non-backfilled launch receipt must record that its release marker was served.');
    // The site serves the latest verified release (a republish after launch is
    // expected), so the served marker is checked against the release list.
    const releasesResponse = await ownerGet('/releases');
    if (releasesResponse.status !== 200) fail(`Releases expected HTTP 200, received ${releasesResponse.status}`);
    const { releases } = await releasesResponse.json();
    if (!Array.isArray(releases) || !releases.some(release => release.releaseId === receipt.releaseId && release.kind === 'launch')) fail('Launch receipt is missing from the release list.');
    const latest = releases[releases.length - 1];
    const served = (await page.content()).match(/<meta name="ghosttown-release-id" content="([^"]+)">/)?.[1];
    if (!latest || served !== latest.releaseId) fail(`Live page serves release ${served}; latest verified release is ${latest?.releaseId}.`);
    proof.releases = { launch: receipt.releaseId, latest: latest.releaseId, served, count: releases.length };
  } else {
    for (const [name, expected] of Object.entries({ customerPageReachable: true, customerPageHttpStatus: 200, leadCaptureConfigured: true, activityTrackingConfigured: true })) {
      if (receipt?.checks?.[name] !== expected) fail(`Release receipt check ${name} expected ${expected}, received ${receipt?.checks?.[name]}`);
    }
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
      `${apiBase}/api/get-me-live/orders/${encodeURIComponent(getMeLiveOrderId)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (orderResponse.status() !== 200) fail(`Owner order expected HTTP 200, received ${orderResponse.status()}`);
    const orderBody = await orderResponse.json();
    if (!Array.isArray(orderBody.leads) || !orderBody.leads.some(lead => lead.email === marker)) fail('Submitted E2E lead did not return to the GhostTown owner view.');
    proof.lead = { email: marker, submittedThroughVisibleForm: true, canonicalSuccessState: true, recoveredInOwnerOrder: true };
    console.log('[ghosttown-e2e] PASS: disposable lead submitted and observed in GhostTown.');
  }

  proof.passed = true;
  await writeFile('github-acceptance/get-me-live-browser-proof.json', JSON.stringify(proof, null, 2) + '\n');
  await context.close();
} catch (error) {
  const effectiveError = productionApiRequests.length
    ? new Error(`Acceptance browser attempted production API: ${productionApiRequests[0]}`)
    : error;
  proof.passed = false;
  proof.productionApiRequests = productionApiRequests;
  proof.error = effectiveError instanceof Error ? effectiveError.message : String(effectiveError);
  await writeFile('github-acceptance/get-me-live-browser-proof.json', JSON.stringify(proof, null, 2) + '\n');
  throw effectiveError;
} finally {
  await browser.close();
}
