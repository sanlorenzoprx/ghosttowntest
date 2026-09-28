import { chromium } from 'playwright';

const baseUrl = String(process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '');
const orderId = String(process.env.GHOSTTOWN_E2E_SPRINT_ORDER_ID || '');
const mutate = process.env.GHOSTTOWN_E2E_SPRINT_MUTATE === '1';
const required = { GHOSTTOWN_E2E_BASE_URL: baseUrl, GHOSTTOWN_E2E_AUTH_TOKEN: authToken, GHOSTTOWN_E2E_SPRINT_ORDER_ID: orderId };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.log('[sprint-e2e] SKIP: runtime acceptance variables are not configured. Missing: ' + missing.join(', '));
  process.exit(0);
}
if (!mutate) {
  console.log('[sprint-e2e] SKIP: full Sprint mutates disposable acceptance progress. Set GHOSTTOWN_E2E_SPRINT_MUTATE=1 only for a disposable acceptance order.');
  process.exit(0);
}

const headers = { Authorization: `Bearer ${authToken}` };
const progressUrl = `${baseUrl}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`;
const blueprintUrl = `${baseUrl}/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint`;
const today = new Date().toISOString().slice(0, 10);
const checkpointDays = new Set([7, 14, 21, 30]);
const externalKinds = new Set(['verified_channel','qualified_buyer_batch','existing_contact','fulfillment_run']);
const preparationOnly = new Set([9, 15]);

function evidenceQuantity(quantity) {
  const match = String(quantity || '').match(/\b([1-9]\d?)\b/);
  return match ? Math.max(1, Number(match[1])) : 1;
}
function requiredEvidence(day) {
  if (preparationOnly.has(day.dayNumber)) return 0;
  if (!day.executionPacket?.targets?.some(target => externalKinds.has(target.kind))) return 0;
  return Math.max(1, ...(day.executionPacket?.actions || []).map(action => evidenceQuantity(action.quantity)));
}
function syntheticEntry(day, index) {
  return {
    entryId: `acceptance-day-${String(day.dayNumber).padStart(2,'0')}-${String(index + 1).padStart(2,'0')}`,
    actionId: `day-${day.dayNumber}`,
    contactOrChannel: `SYNTHETIC ACCEPTANCE — Day ${day.dayNumber} record ${index + 1}`,
    date: today,
    action: day.title,
    response: 'Synthetic acceptance response. No real person was contacted and no market claim is implied.',
    customerLanguage: 'SYNTHETIC ACCEPTANCE DATA — not a real customer quote.',
    alternativeMentioned: 'Synthetic test alternative',
    objection: index % 2 ? 'Synthetic timing objection' : '',
    commitmentOffered: 'Synthetic acceptance commitment request',
    commitmentReceived: 'no commitment',
    revenueCents: 0,
    founderMinutes: 5,
    variableCostCents: 0,
    followUpDate: '',
    evidenceStrength: 'weak',
    sourceNote: 'AUTOMATED PLAYWRIGHT ACCEPTANCE FIXTURE. Synthetic only; must never be treated as market evidence.'
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const serverErrors = [];
  page.on('response', r => { if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

  const bpResponse = await page.request.get(blueprintUrl, { headers });
  if (bpResponse.status() !== 200) throw new Error(`Blueprint expected HTTP 200, received ${bpResponse.status()}`);
  const payload = await bpResponse.json();
  const blueprint = payload.blueprint;
  if (!blueprint || blueprint.dailyCalendar?.length !== 30) throw new Error('Acceptance order does not expose the canonical 30-day Sprint.');

  let progress = payload.progress;
  // Acceptance orders must be disposable: normalize them before walking the sequence.
  progress = {
    ...progress,
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [],
    checkpointReviews: [],
    assetDrafts: [],
    metrics: { outreachSent:0,replies:0,interviews:0,qualifiedConversations:0,commitments:0,revenueCents:0,founderMinutes:0,variableCostCents:0,leads:0 },
    finalDecision: undefined
  };
  let reset = await page.request.post(progressUrl, { headers: { ...headers, 'Content-Type':'application/json' }, data: progress });
  if (reset.status() !== 200) throw new Error(`Could not reset disposable Sprint order (${reset.status()})`);
  progress = (await reset.json()).progress;

  for (const day of blueprint.dailyCalendar) {
    const count = requiredEvidence(day);
    const note = `SYNTHETIC ACCEPTANCE DAY ${day.dayNumber}: exercised "${day.title}". This is automated test evidence, not a real customer or market result.`;
    const evidence = Array.from({ length: count }, (_, index) => syntheticEntry(day, index));
    const next = {
      ...progress,
      evidenceNotes: { ...(progress.evidenceNotes || {}), [day.completionKey]: note },
      evidenceLedger: [...(progress.evidenceLedger || []).filter(e => e.actionId !== `day-${day.dayNumber}`), ...evidence],
      checkpointReviews: checkpointDays.has(day.dayNumber)
        ? [...(progress.checkpointReviews || []).filter(r => r.dayNumber !== day.dayNumber), {
            dayNumber: day.dayNumber,
            completedAt: new Date().toISOString(),
            answers: { acceptance: 'Synthetic Playwright acceptance review.' },
            evidenceSummary: `Synthetic Day ${day.dayNumber} acceptance evidence only; no real market conclusion.`,
            strongestEvidence: 'weak',
            primaryConstraint: 'missing_evidence',
            nextAction: day.dayNumber === 30 ? 'Acceptance Sprint complete; continue to Get Me Live proof.' : `Continue to Day ${day.dayNumber + 1} in acceptance.`
          }]
        : progress.checkpointReviews || []
    };

    const save = await page.request.post(progressUrl, { headers: { ...headers, 'Content-Type':'application/json' }, data: next });
    if (save.status() !== 200) throw new Error(`Day ${day.dayNumber} evidence save failed (${save.status()}): ${await save.text()}`);
    progress = (await save.json()).progress;

    const complete = await page.request.post(progressUrl, {
      headers: { ...headers, 'Content-Type':'application/json' },
      data: { ...progress, completedDays: [...new Set([...(progress.completedDays || []), day.dayNumber])].sort((a,b)=>a-b) }
    });
    if (complete.status() !== 200) throw new Error(`Day ${day.dayNumber} completion rejected (${complete.status()}): ${await complete.text()}`);
    progress = (await complete.json()).progress;
    if (!progress.completedDays.includes(day.dayNumber)) throw new Error(`Day ${day.dayNumber} did not persist as complete.`);

    // Browser-level proof at every checkpoint and final day: the real UI must recover server state.
    if (checkpointDays.has(day.dayNumber)) {
      await page.goto(`${baseUrl}/`, { waitUntil:'domcontentloaded', timeout:30000 });
      await page.evaluate(({ token }) => localStorage.setItem('ghosttown_token', token), { token: authToken });
      await page.reload({ waitUntil:'domcontentloaded' });
      const recovered = await page.request.get(progressUrl, { headers });
      const body = await recovered.json();
      if (recovered.status() !== 200 || !body.progress?.completedDays?.includes(day.dayNumber)) throw new Error(`Day ${day.dayNumber} failed reload/recovery proof.`);
      console.log(`[sprint-e2e] PASS checkpoint Day ${day.dayNumber}: saved, completed, recovered.`);
    }
  }

  const finalResponse = await page.request.get(progressUrl, { headers });
  const final = await finalResponse.json();
  const days = [...new Set(final.progress?.completedDays || [])].sort((a,b)=>a-b);
  if (days.length !== 30 || days.some((day,index)=>day !== index+1)) throw new Error(`Expected all 30 completed days; received ${days.join(',')}`);
  for (const day of [7,14,21,30]) {
    if (!final.progress.checkpointReviews?.some(r => r.dayNumber === day && r.completedAt && r.evidenceSummary && r.nextAction)) throw new Error(`Checkpoint Day ${day} did not persist.`);
  }
  if (serverErrors.length) throw new Error('Sprint produced server errors: ' + serverErrors.join(' | '));
  console.log('[sprint-e2e] PASS: all 30 days completed sequentially with synthetic evidence and four persisted checkpoint reviews.');
  await context.close();
} finally {
  await browser.close();
}
