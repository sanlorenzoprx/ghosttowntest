import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { withAcceptanceDataBindings } from '../../scripts/roadmap-r2-binding-bridge.mjs';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiBase = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const ownerId = String(process.env.GHOSTTOWN_E2E_FIXTURE_OWNER || '').trim().toLowerCase();
const orderId = String(process.env.GHOSTTOWN_E2E_SPRINT_ORDER_ID || '');
const gmlOrderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
const required = { baseUrl, apiBase, authToken, ownerId, orderId, gmlOrderId };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error('Sprint-without-GML acceptance missing runtime inputs: ' + missing.join(', '));

const productionApiHosts = new Set(['api.ghosttowntest.com', 'api.lit-ghosttown.app']);
if (productionApiHosts.has(new URL(apiBase).hostname)) throw new Error('Sprint-without-GML acceptance points to production API.');

const headers = { Authorization: `Bearer ${authToken}` };
const proof = {
  schemaVersion: 'ghosttown-sprint-without-gml-runtime-v1',
  orderId,
  gmlOrderId,
  detached: false,
  dashboard: {},
  blueprint: {},
  progress: {},
  coachMemory: {},
  artifacts: {},
  websiteEvidence: {},
  passed: false,
  recordedAt: new Date().toISOString()
};

async function jsonFetch(request, url, options = {}) {
  const response = await request.fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (!response.ok()) throw new Error(`${options.method || 'GET'} ${url} failed HTTP ${response.status()}: ${text.slice(0, 500)}`);
  if (!body) throw new Error(`${options.method || 'GET'} ${url} did not return JSON.`);
  return body;
}

await mkdir('github-acceptance', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const removed = await withAcceptanceDataBindings(client => client.removeE2eGetMeLiveFixture({
    ownerId,
    orderId,
    gmlOrderId
  }));
  if (removed?.ok !== true || removed?.removed !== true || removed?.sprintPreserved !== true || removed?.productionMutated !== false) {
    throw new Error('Disposable Get Me Live removal did not preserve the Sprint isolation contract.');
  }
  proof.detached = true;

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const gmlOrders = await jsonFetch(page.request, `${apiBase}/api/get-me-live/orders`);
  const stillLinked = (gmlOrders.orders || []).some(item => item?.sourceSprintOrderId === orderId || item?.orderId === gmlOrderId);
  if (stillLinked) throw new Error('Get Me Live order is still visible after disposable entitlement removal.');

  const blueprint = await jsonFetch(page.request, `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`);
  if (blueprint.blueprint?.dailyCalendar?.length !== 30) throw new Error('Sprint no longer exposes all 30 Blueprint days without Get Me Live.');
  proof.blueprint = { renderedDays: 30, status: blueprint.blueprint?.status || null };

  const websiteEvidence = await jsonFetch(page.request, `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/website-evidence`);
  if (websiteEvidence.websiteEvidence?.available !== false || websiteEvidence.websiteEvidence?.separateProduct !== true) {
    throw new Error('Sprint website-evidence endpoint did not fail open when Get Me Live was absent.');
  }
  proof.websiteEvidence = {
    available: false,
    separateProduct: true,
    gracefulAbsence: true
  };

  const progressUrl = `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`;
  const before = await jsonFetch(page.request, progressUrl);
  if ((before.progress?.completedDays || []).length !== 30) throw new Error('Completed Sprint progress disappeared after Get Me Live removal.');
  const marker = `SYNTHETIC ACCEPTANCE — Sprint remains writable without Get Me Live — ${process.env.GITHUB_RUN_ID || 'local'}`;
  await jsonFetch(page.request, progressUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: { evidenceNotes: { 'sprint-without-gml-runtime': marker } }
  });
  const after = await jsonFetch(page.request, progressUrl);
  if (after.progress?.evidenceNotes?.['sprint-without-gml-runtime'] !== marker) {
    throw new Error('Sprint progress did not round-trip after Get Me Live removal.');
  }
  proof.progress = { completedDays: 30, writeRoundTrip: true };

  const memory = await jsonFetch(page.request, `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/coach-memory`);
  if (memory.reviewCount !== 30) throw new Error(`Expected 30 persisted Learning Coach reviews without Get Me Live; received ${memory.reviewCount ?? 'unknown'}.`);
  proof.coachMemory = { reviewCount: memory.reviewCount, preserved: true };

  for (const [name, path] of [
    ['pdf', `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`],
    ['assets', `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`]
  ]) {
    const response = await page.request.get(apiBase + path, { headers });
    const bytes = await response.body();
    if (!response.ok() || bytes.length === 0) throw new Error(`Private Blueprint ${name} failed without Get Me Live (HTTP ${response.status()}, bytes=${bytes.length}).`);
    proof.artifacts[name] = { status: response.status(), bytes: bytes.length };
  }

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(token => localStorage.setItem('lit_user_token_v1', token), authToken);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByText('Your customer page and activity will appear here after you start Get Me Live.', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Open Blueprint', exact: true }).click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible', timeout: 30000 });
  const websiteRegion = page.getByRole('region', { name: 'Website evidence from Get Me Live' });
  await websiteRegion.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
  const websiteRegionCount = await websiteRegion.count();
  if (websiteRegionCount !== 0) throw new Error('Sprint rendered linked website evidence after Get Me Live entitlement was removed.');
  proof.dashboard = {
    sprintOpenedFromDashboard: true,
    getMeLiveEmptyStateVisible: true,
    calendarVisible: true,
    linkedWebsiteEvidenceHidden: true
  };

  proof.passed = true;
  await writeFile('github-acceptance/sprint-without-gml-proof.json', JSON.stringify(proof, null, 2) + '\n');
  console.log('[sprint-without-gml] PASS: Sprint, progress, Learning Coach memory and private artifacts remain usable after the disposable Get Me Live entitlement is removed.');
  await context.close();
} catch (error) {
  proof.error = error instanceof Error ? error.message : String(error);
  await writeFile('github-acceptance/sprint-without-gml-proof.json', JSON.stringify(proof, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
