import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const apiBase = String(process.env.GHOSTTOWN_E2E_API_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const orderId = String(process.env.GHOSTTOWN_E2E_SPRINT_ORDER_ID || '');
const mutate = process.env.GHOSTTOWN_E2E_SPRINT_MUTATE === '1';
const required = { GHOSTTOWN_E2E_BASE_URL: baseUrl, GHOSTTOWN_E2E_API_URL: apiBase, GHOSTTOWN_E2E_AUTH_TOKEN: authToken, GHOSTTOWN_E2E_SPRINT_ORDER_ID: orderId };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error('Runtime Sprint acceptance is mandatory. Missing: ' + missing.join(', '));
if (!mutate) throw new Error('Runtime Sprint acceptance is mandatory. Set GHOSTTOWN_E2E_SPRINT_MUTATE=1 only for the disposable acceptance order.');

const productionApiHosts = new Set(['api.ghosttowntest.com', 'api.lit-ghosttown.app']);
const apiHost = new URL(apiBase).hostname;
if (productionApiHosts.has(apiHost)) throw new Error(`Acceptance API origin points to production: ${apiBase}`);

const headers = { Authorization: `Bearer ${authToken}` };
const progressUrl = `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`;
const blueprintUrl = `${apiBase}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`;
const today = new Date().toISOString().slice(0, 10);
const checkpoints = new Set([7, 14, 21, 30]);
const externalKinds = new Set(['verified_channel', 'qualified_buyer_batch', 'existing_contact', 'fulfillment_run']);
const preparationOnly = new Set([9, 15]);
const proof = { schemaVersion: 'ghosttown-full-ui-sprint-acceptance-v2', orderId, days: [], recovery: [], contentReview: {}, recordedAt: new Date().toISOString() };

function quantity(value) {
  const match = String(value || '').match(/\b([1-9]\d?)\b/);
  return match ? Math.max(1, Number(match[1])) : 1;
}
function evidenceRequired(day) {
  if (preparationOnly.has(day.dayNumber)) return 0;
  if (!day.executionPacket?.targets?.some(target => externalKinds.has(target.kind))) return 0;
  return Math.max(1, ...(day.executionPacket?.actions || []).map(action => quantity(action.quantity)));
}
function syllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const groups = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length || 1);
}
function readability(text) {
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);
  const grade = 0.39 * (words.length / sentences) + 11.8 * (syllableCount / Math.max(1, words.length)) - 15.59;
  return { grade: Math.max(0, Math.round(grade * 10) / 10), words: words.length, sentences };
}
function dayText(day) {
  return [
    day.title, day.primaryObjective, day.whyItMatters, day.executionPacket?.whyThisDayExists,
    ...(day.requiredActions || []), ...(day.evidenceToRecord || []),
    ...(day.executionPacket?.actions || []).map(item => item.instruction),
    ...(day.executionPacket?.evidenceToCapture || []),
    day.executionPacket?.successThreshold, day.executionPacket?.failureThreshold,
    day.executionPacket?.expectedOutcome, day.executionPacket?.completionDefinition
  ].filter(Boolean).join('. ');
}
async function apiJson(request, url, options = {}) {
  const response = await request.fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const type = response.headers()['content-type'] || '';
  const text = await response.text();
  if (!type.includes('application/json')) {
    throw new Error(`${options.method || 'GET'} ${url} returned non-JSON (${response.status()}, ${type}): ${text.slice(0, 120)}`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${options.method || 'GET'} ${url} returned invalid JSON (${response.status()}, ${type}): ${text.slice(0, 120)}`);
  }
  if (!response.ok()) throw new Error(`${options.method || 'GET'} ${url} failed (${response.status()}): ${JSON.stringify(body)}`);
  return body;
}
async function waitSaved(page) {
  await page.getByText('Progress saved to your account', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
}
async function openDay(page, dayNumber) {
  const calendar = page.getByRole('region', { name: '30-day execution calendar' });
  await calendar.getByRole('button', { name: new RegExp(`^Day ${dayNumber}\\b`) }).click();
  await page.getByText(`Today · Day ${dayNumber}`, { exact: true }).waitFor({ state: 'visible' });
}
async function openWorkspaceSection(page, value, label) {
  const mobileNav = page.getByLabel('Blueprint section');
  await mobileNav.waitFor({ state: 'attached', timeout: 15000 });
  if (await mobileNav.isVisible().catch(() => false)) {
    await mobileNav.selectOption(value);
    await mobileNav.waitFor({ state: 'visible' });
    return;
  }
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function returnFromWorkspace(page) {
  await page.getByRole('button', { name: /Dashboard/i }).first().click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible' });
}
async function addEvidence(page, day, index) {
  await page.getByRole('button', { name: /Record structured evidence|Open structured evidence log/i }).click();
  await openWorkspaceSection(page, 'record', 'Record Results');
  const marker = `SYNTHETIC ACCEPTANCE — Day ${day.dayNumber} record ${index + 1}`;
  await page.getByLabel('Contact or channel').fill(marker);
  await page.getByLabel('Date').fill(today);
  await page.getByLabel('Action').fill(day.title);
  await page.getByLabel('Response').fill('Synthetic acceptance response. No real person was contacted and no market claim is implied.');
  await page.getByLabel('Exact customer language').fill('SYNTHETIC ACCEPTANCE DATA — not a real customer quote.');
  await page.getByLabel('Commitment offered').fill('Synthetic acceptance commitment request');
  await page.getByLabel('Commitment received').fill('no commitment');
  await page.getByLabel('Founder minutes').fill('5');
  await page.getByLabel('Evidence strength').selectOption('weak');
  await page.getByLabel('Source note').fill('AUTOMATED PLAYWRIGHT ACCEPTANCE FIXTURE. Synthetic only; never market evidence.');
  await page.getByRole('button', { name: 'Save evidence entry', exact: true }).click();
  await page.getByText('Progress saved to your account', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await returnFromWorkspace(page);
}
async function saveCheckpoint(page, dayNumber) {
  await page.getByRole('button', { name: /Complete checkpoint review|Review checkpoint evidence/i }).click();
  await openWorkspaceSection(page, 'review', 'Weekly Review');
  const section = page.locator(`#checkpoint-${dayNumber}`);
  await section.getByLabel('Strongest evidence').selectOption('weak');
  await section.getByLabel('Primary constraint').selectOption('missing_evidence');
  await section.getByLabel('Evidence summary').fill(`Synthetic Day ${dayNumber} acceptance evidence only; no real market conclusion.`);
  await section.getByLabel('Next action').fill(dayNumber === 30 ? 'Acceptance Sprint complete; continue to Get Me Live proof.' : `Continue to Day ${dayNumber + 1} in acceptance.`);
  await section.getByRole('button', { name: `Save Day ${dayNumber} review`, exact: true }).click();
  await page.getByText('Progress saved to your account', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await returnFromWorkspace(page);
}
async function verifyDayNote(page, dayNumber, expected) {
  await openDay(page, dayNumber);
  const note = page.getByLabel('Execution note');
  const actual = await note.inputValue();
  if (actual !== expected) throw new Error(`Day ${dayNumber} recovery mismatch. Expected exact saved note.`);
}

await mkdir('github-acceptance', { recursive: true });
const browser = await chromium.launch({ headless: true });
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
  page.on('response', response => { if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`); });

  const payload = await apiJson(page.request, blueprintUrl);
  const blueprint = payload.blueprint;
  if (!blueprint || blueprint.dailyCalendar?.length !== 30) {
    throw new Error(`Acceptance order does not expose the canonical 30-day Sprint (keys=${Object.keys(payload).join(',') || 'none'}, days=${blueprint?.dailyCalendar?.length ?? 'none'}).`);
  }

  const reviews = blueprint.dailyCalendar.map(day => ({ dayNumber: day.dayNumber, title: day.title, ...readability(dayText(day)) }));
  proof.contentReview = {
    target: 'approximately grade 8 or easier',
    method: 'Flesch-Kincaid-style automated screen of customer-facing daily instructions; manual meaning review still required for final content approval',
    days: reviews,
    aboveGrade8: reviews.filter(item => item.grade > 8).map(item => ({ dayNumber: item.dayNumber, grade: item.grade }))
  };

  const resetProgress = {
    ...payload.progress, completedDays: [], evidenceNotes: {}, evidenceLedger: [], checkpointReviews: [], assetDrafts: [],
    metrics: { outreachSent: 0, replies: 0, interviews: 0, qualifiedConversations: 0, commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0, leads: 0 },
    finalDecision: undefined
  };
  await apiJson(page.request, progressUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: resetProgress });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(token => localStorage.setItem('lit_user_token_v1', token), authToken);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Blueprint', exact: true }).click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible' });

  const savedNotes = new Map();
  for (const day of blueprint.dailyCalendar) {
    await openDay(page, day.dayNumber);

    const assets = day.executionPacket?.assets || [];
    if (assets.length) {
      const assetRegion = page.getByRole('region', { name: 'Prepared assets for this day' });
      const open = assetRegion.getByRole('button', { name: 'Open', exact: true }).first();
      if (await open.count()) {
        await open.click();
        await assetRegion.getByText('Readable asset', { exact: true }).first().waitFor({ state: 'visible' });
        await assetRegion.getByRole('button', { name: 'Close', exact: true }).first().click();
      }
    }

    for (let index = 0; index < evidenceRequired(day); index += 1) {
      await addEvidence(page, day, index);
      await openDay(page, day.dayNumber);
    }

    const note = `SYNTHETIC ACCEPTANCE DAY ${day.dayNumber}: exercised "${day.title}". Automated UI test evidence only; not a real customer or market result.`;
    savedNotes.set(day.dayNumber, note);
    const noteField = page.getByLabel('Execution note');
    await noteField.fill(note);
    await noteField.blur();
    await waitSaved(page);

    if (checkpoints.has(day.dayNumber)) {
      await saveCheckpoint(page, day.dayNumber);
      await openDay(page, day.dayNumber);
    }

    const complete = page.getByRole('button', { name: `Complete Day ${day.dayNumber}`, exact: true });
    if (await complete.isDisabled()) throw new Error(`Day ${day.dayNumber} is not UI-ready after required visible inputs.`);
    await complete.click();
    await page.getByRole('button', { name: /Completed ✓ — reopen/ }).waitFor({ state: 'visible', timeout: 15000 });
    proof.days.push({ dayNumber: day.dayNumber, title: day.title, evidenceEntries: evidenceRequired(day), noteSaved: true, completedViaVisibleButton: true });

    if (day.dayNumber === 20) {
      await verifyDayNote(page, 5, savedNotes.get(5));
      proof.recovery.push({ atDay: 20, recoveredDay: 5, exactNoteMatched: true });
      await openDay(page, 20);
    }

    if (checkpoints.has(day.dayNumber)) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Dashboard', exact: true }).click().catch(() => {});
      if (await page.getByRole('button', { name: 'Open Blueprint', exact: true }).count()) await page.getByRole('button', { name: 'Open Blueprint', exact: true }).click();
      await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible' });
      await verifyDayNote(page, day.dayNumber, savedNotes.get(day.dayNumber));
      proof.recovery.push({ checkpointDay: day.dayNumber, reloadRecovered: true, exactNoteMatched: true });
    }
  }

  const final = await apiJson(page.request, progressUrl);
  const completed = [...new Set(final.progress?.completedDays || [])].sort((a, b) => a - b);
  if (completed.length !== 30 || completed.some((day, index) => day !== index + 1)) throw new Error(`Expected all 30 completed days; received ${completed.join(',')}`);
  for (const day of [7, 14, 21, 30]) {
    if (!final.progress.checkpointReviews?.some(review => review.dayNumber === day && review.completedAt && review.evidenceSummary && review.nextAction)) throw new Error(`Checkpoint Day ${day} did not persist.`);
  }
  if (serverErrors.length) throw new Error('Sprint produced server errors: ' + serverErrors.join(' | '));
  proof.completedDays = completed;
  proof.passed = true;
  await writeFile('github-acceptance/30-day-sprint-ui-proof.json', JSON.stringify(proof, null, 2) + '\n');
  console.log('[sprint-e2e] PASS: visible browser UI completed Days 1-30, persisted checkpoints, and recovered historical data.');
  await context.close();
} catch (error) {
  const effectiveError = productionApiRequests.length
    ? new Error(`Acceptance browser attempted production API: ${productionApiRequests[0]}`)
    : error;
  proof.passed = false;
  proof.productionApiRequests = productionApiRequests;
  proof.error = effectiveError instanceof Error ? effectiveError.message : String(effectiveError);
  await writeFile('github-acceptance/30-day-sprint-ui-proof.json', JSON.stringify(proof, null, 2) + '\n');
  throw effectiveError;
} finally {
  await browser.close();
}
