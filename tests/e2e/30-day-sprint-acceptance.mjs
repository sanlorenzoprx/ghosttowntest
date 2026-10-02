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
const proof = { schemaVersion: 'ghosttown-full-ui-sprint-acceptance-v3', orderId, days: [], recovery: [], websiteEvidence: [], surfaceAudit: [], contentReview: {}, recordedAt: new Date().toISOString() };

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
async function verifyWebsiteEvidence(page, dayNumber, checkpointDay) {
  const region = page.getByRole('region', { name: 'Website evidence from Get Me Live' });
  await region.waitFor({ state: 'visible', timeout: 15000 });
  await region.getByText('Get Me Live is a separate product.', { exact: false }).waitFor({ state: 'visible' });
  await region.getByRole('button', { name: 'Refresh website evidence', exact: true }).waitFor({ state: 'visible' });
  if (checkpointDay) {
    await region.getByText(`Day ${checkpointDay} reassessment`, { exact: false }).waitFor({ state: 'visible' });
  } else if (dayNumber) {
    await region.getByText(`Day ${dayNumber} can use these live-site signals`, { exact: false }).waitFor({ state: 'visible' });
  }
  const text = await region.innerText();
  proof.websiteEvidence.push({ dayNumber: dayNumber || null, checkpointDay: checkpointDay || null, rendered: true, text: text.slice(0, 1200) });
}

async function openWorkspaceSection(page, value, label) {
  const mobileNav = page.getByLabel('Blueprint section', { exact: true });
  await mobileNav.waitFor({ state: 'attached', timeout: 15000 });
  if (await mobileNav.isVisible().catch(() => false)) {
    await mobileNav.selectOption(value);
    await mobileNav.waitFor({ state: 'visible' });
    return;
  }
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function returnFromWorkspace(page) {
  await page.getByRole('button', { name: '← Dashboard', exact: true }).click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible' });
}
async function addEvidence(page, day, index) {
  await page.getByRole('button', { name: /Record structured evidence|Open structured evidence log/i }).click();
  await openWorkspaceSection(page, 'record', 'Record Results');
  const marker = `SYNTHETIC ACCEPTANCE — Day ${day.dayNumber} record ${index + 1}`;
  await page.getByLabel('Contact or channel').fill(marker);
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill(today);
  await page.getByLabel('Action').fill(day.title);
  await page.getByLabel('Response').fill('Synthetic acceptance response. No real person was contacted and no market claim is implied.');
  await page.getByLabel('Exact customer language').fill('SYNTHETIC ACCEPTANCE DATA — not a real customer quote.');
  await page.getByLabel('Commitment offered').fill('Synthetic acceptance commitment request');
  await page.getByLabel('Commitment received').fill('no commitment');
  await page.getByLabel('Founder minutes').fill('5');
  await page.getByLabel('Evidence strength').selectOption('weak');
  await page.getByLabel('Source note').fill('AUTOMATED PLAYWRIGHT ACCEPTANCE FIXTURE. Synthetic only; never market evidence.');
  await page.getByRole('button', { name: 'Save evidence entry', exact: true }).click();
  await page.getByText(/^Saved /).waitFor({ state: 'visible', timeout: 15000 });
  await returnFromWorkspace(page);
}
async function saveCheckpoint(page, dayNumber) {
  await page.getByRole('button', { name: /Complete checkpoint review|Review checkpoint evidence/i }).click();
  await openWorkspaceSection(page, 'review', 'Weekly Review');
  await verifyWebsiteEvidence(page, undefined, dayNumber);
  const section = page.locator(`#checkpoint-${dayNumber}`);
  await section.getByLabel('Strongest evidence').selectOption('weak');
  await section.getByLabel('Primary constraint').selectOption('missing_evidence');
  await section.getByLabel('Evidence summary').fill(`Synthetic Day ${dayNumber} acceptance evidence only; no real market conclusion.`);
  await section.getByLabel('Next action').fill(dayNumber === 30 ? 'Acceptance Sprint complete; continue to Get Me Live proof.' : `Continue to Day ${dayNumber + 1} in acceptance.`);
  await section.getByRole('button', { name: `Save Day ${dayNumber} review`, exact: true }).click();
  await page.getByText(/^Saved /).waitFor({ state: 'visible', timeout: 15000 });
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
  const pageErrors = [];
  const consoleErrors = [];
  page.on('response', response => { if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`); });
  page.on('pageerror', error => pageErrors.push(error instanceof Error ? error.message : String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

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
  const calendar = page.getByRole('region', { name: '30-day execution calendar' });
  try {
    await calendar.waitFor({ state: 'visible', timeout: 30000 });
  } catch (error) {
    const alertText = await page.getByRole('alert').allTextContents().catch(() => []);
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000);
    throw new Error([
      '30-day execution calendar did not render after Open Blueprint.',
      `url=${page.url()}`,
      `alerts=${JSON.stringify(alertText)}`,
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `consoleErrors=${JSON.stringify(consoleErrors.slice(-10))}`,
      `serverErrors=${JSON.stringify(serverErrors.slice(-10))}`,
      `body=${JSON.stringify(bodyText)}`,
      `waitError=${error instanceof Error ? error.message : String(error)}`,
    ].join(' '));
  }

  // Prove the primary navigation and durable exports before mutating execution progress.
  await page.getByRole('button', { name: 'Asset Library', exact: true }).click();
  await page.getByRole('heading', { name: 'Asset Library', exact: true }).waitFor({ state: 'visible' });
  proof.surfaceAudit.push({ surface: 'execution-home', control: 'Asset Library', result: 'passed' });

  await page.getByRole('button', { name: '30-Day Calendar', exact: true }).click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible' });
  proof.surfaceAudit.push({ surface: 'execution-home', control: '30-Day Calendar', result: 'passed' });

  for (const [name, path, expectedType] of [
    ['Download Blueprint PDF', `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`, 'application/pdf'],
    ['Export all assets', `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`, 'application/zip'],
  ]) {
    const artifactUrl = `${apiBase}${path}`;
    const responsePromise = page.waitForResponse(
      response => response.url() === artifactUrl && response.request().method() === 'GET',
      { timeout: 30000 },
    );
    await page.getByRole('button', { name, exact: true }).click();
    const response = await responsePromise;
    if (!response.ok()) {
      throw new Error(`${name} artifact request failed HTTP ${response.status()}`);
    }
    const contentType = String(response.headers()['content-type'] || '').toLowerCase();
    if (!contentType.includes(expectedType)) {
      throw new Error(`${name} returned ${contentType || 'no content type'} instead of ${expectedType}`);
    }
    const bytes = await response.body();
    if (bytes.byteLength < 100) {
      throw new Error(`${name} returned an unexpectedly small artifact (${bytes.byteLength} bytes)`);
    }
    proof.surfaceAudit.push({ surface: 'execution-home', control: name, result: 'artifact_fetched', bytes: bytes.byteLength, contentType });
  }

  await page.getByRole('button', { name: 'Evidence, reviews & site', exact: true }).click();
  const workspaceNav = page.getByLabel('Blueprint section', { exact: true });
  await workspaceNav.waitFor({ state: 'visible', timeout: 15000 });
  const workspaceTabs = [
    ['overview', 'Overview'],
    ['today', 'Today'],
    ['record', 'Record Results'],
    ['followups', 'Follow-ups'],
    ['evidence', 'Evidence'],
    ['review', 'Weekly Review'],
    ['reminders', 'Reminders'],
    ['audit', 'Starting State'],
    ['research', 'Research & Access'],
    ['revenue', 'First Revenue'],
    ['fulfillment', 'Fulfillment'],
    ['calendar', '30-Day Calendar'],
  ];
  for (const [value, label] of workspaceTabs) {
    await workspaceNav.selectOption(value);
    if ((await workspaceNav.inputValue()) !== value) throw new Error(`Workspace did not switch to ${label}`);
    await page.waitForTimeout(50);
    proof.surfaceAudit.push({ surface: 'structured-workspace', control: label, result: 'passed' });
  }
  await workspaceNav.selectOption('review');
  await verifyWebsiteEvidence(page, undefined, undefined);
  await page.getByRole('button', { name: /Dashboard/, exact: false }).first().click();
  await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible', timeout: 30000 });
  proof.surfaceAudit.push({ surface: 'structured-workspace', control: 'Return to execution home', result: 'passed' });

  const savedNotes = new Map();
  for (const day of blueprint.dailyCalendar) {
    await openDay(page, day.dayNumber);
    await verifyWebsiteEvidence(page, day.dayNumber, checkpoints.has(day.dayNumber) ? day.dayNumber : undefined);

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
    const noteSaveResponse = page.waitForResponse(response =>
      response.url() === progressUrl
      && response.request().method() === 'POST',
    { timeout: 15000 });
    await noteField.blur();
    const savedNoteResponse = await noteSaveResponse;
    if (!savedNoteResponse.ok()) {
      throw new Error(`Day ${day.dayNumber} execution note save failed HTTP ${savedNoteResponse.status()}.`);
    }
    await waitSaved(page);
    await page.getByText(`Before Day ${day.dayNumber} can be completed:`, { exact: true })
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => undefined);

    if (checkpoints.has(day.dayNumber)) {
      await saveCheckpoint(page, day.dayNumber);
      await openDay(page, day.dayNumber);
    }

    let complete = page.getByRole('button', { name: `Complete Day ${day.dayNumber}`, exact: true });
    try {
      // First allow the normal React state update to expose persisted readiness.
      await complete.click({ trial: true, timeout: 15000 });
    } catch (initialError) {
      // The note POST can be durably saved while the calendar still holds a stale
      // progress snapshot. Re-enter through the real UI so completion is evaluated
      // from server-persisted progress rather than weakening or bypassing the gate.
      await page.reload({ waitUntil: 'domcontentloaded' });
      const dashboardButton = page.getByRole('button', { name: 'Dashboard', exact: true });
      await dashboardButton.waitFor({ state: 'visible', timeout: 15000 });
      await dashboardButton.click();
      const openBlueprintButton = page.getByRole('button', { name: 'Open Blueprint', exact: true });
      await openBlueprintButton.waitFor({ state: 'visible', timeout: 15000 });
      await openBlueprintButton.click();
      await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible', timeout: 30000 });
      await verifyDayNote(page, day.dayNumber, savedNotes.get(day.dayNumber));
      complete = page.getByRole('button', { name: `Complete Day ${day.dayNumber}`, exact: true });
      try {
        await complete.click({ trial: true, timeout: 15000 });
      } catch (recoveryError) {
        const readiness = await page.getByRole('status').allTextContents().catch(() => []);
        throw new Error(`Day ${day.dayNumber} is not UI-ready after persisted-state re-entry. readiness=${JSON.stringify(readiness)} initialError=${initialError instanceof Error ? initialError.message : String(initialError)} recoveryError=${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
      }
      proof.recovery.push({ dayNumber: day.dayNumber, persistedStateReentry: true, exactNoteMatched: true });
    }
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
      const dashboardButton = page.getByRole('button', { name: 'Dashboard', exact: true });
      await dashboardButton.waitFor({ state: 'visible', timeout: 15000 });
      await dashboardButton.click();
      const openBlueprintButton = page.getByRole('button', { name: 'Open Blueprint', exact: true });
      await openBlueprintButton.waitFor({ state: 'visible', timeout: 15000 });
      await openBlueprintButton.click();
      await page.getByRole('region', { name: '30-day execution calendar' }).waitFor({ state: 'visible', timeout: 30000 });
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
