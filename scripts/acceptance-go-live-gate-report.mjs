#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';

const dir = 'github-acceptance';

async function jsonFile(name) {
  const path = `${dir}/${name}`;
  try {
    await access(path);
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { __missing: true, __path: path, __error: error instanceof Error ? error.message : String(error) };
  }
}

const [frontDoor, sprint, getMeLive, ownerControls, sprintWithoutGml, stripePayment, cloudflareOAuth] = await Promise.all([
  jsonFile('front-door-proof.json'),
  jsonFile('30-day-sprint-ui-proof.json'),
  jsonFile('get-me-live-browser-proof.json'),
  jsonFile('get-me-live-owner-controls.json'),
  jsonFile('sprint-without-gml-proof.json'),
  jsonFile('stripe-payment-webhook-proof.json'),
  jsonFile('cloudflare-oauth-proof.json'),
]);

const checks = [];
const blockers = [];
const warnings = [];

function add(id, label, passed, evidence, blocker = true) {
  const status = passed ? 'PASS' : blocker ? 'BLOCKED' : 'WARNING';
  const item = { id, label, status, evidence };
  checks.push(item);
  if (!passed && blocker) blockers.push(item);
  if (!passed && !blocker) warnings.push(item);
}

function hasSurface(control) {
  return Array.isArray(sprint.surfaceAudit) && sprint.surfaceAudit.some(item => item.control === control && /passed|artifact_fetched/.test(String(item.result || '')));
}

const completedDays = Array.isArray(sprint.completedDays) ? sprint.completedDays : [];
const checkpointDays = new Set((sprint.agentic?.checkpoints || []).map(item => item.dayNumber));
const dailyAgentDays = new Set((sprint.agentic?.daily || []).map(item => item.dayNumber));
const viewportNames = new Set((sprint.viewports || []).map(item => item.name));
const gmlViewportNames = new Set((getMeLive.viewports || []).map(item => item.name));

add('sprint.checkout', '$97 Sprint checkout reaches Stripe test checkout', frontDoor.stripeTestCheckout === true,
  { proof: 'front-door-proof.json', checkoutOrderId: frontDoor.checkoutOrderId || null, checkoutModal: frontDoor.checkoutModal || false });
add('sprint.entitlement', '$97 Sprint entitlement exists for isolated customer fixture', sprint.passed === true && Boolean(sprint.orderId),
  { proof: '30-day-sprint-ui-proof.json', orderId: sprint.orderId || null });
add('sprint.blueprint', 'Canonical Blueprint renders all 30 days', sprint.passed === true && completedDays.length === 30,
  { proof: '30-day-sprint-ui-proof.json', completedDays });
const dailyAgentic = sprint.agentic?.daily || [];
const checkpointAgentic = sprint.agentic?.checkpoints || [];
const groundedDailyRequired = [1, 15, 30];
const groundedCheckpointRequired = [7, 14, 21, 30];
const dailyGrounded = dailyAgentic.filter(item => item.capability === 'grounded_research');
const checkpointGrounded = checkpointAgentic.filter(item => item.capability === 'grounded_research');
const groundedAttempts = [...dailyGrounded, ...checkpointGrounded];
const nativeGrounded = groundedAttempts.filter(item =>
  item.receipt?.task === 'grounded_research' && item.degraded?.active !== true
);
add('sprint.agentic.daily', 'Learning Coach automatically assesses and saves every completed Sprint day through the customer UI',
  dailyAgentDays.size === 30
    && dailyAgentic.every(item =>
      item.trigger === 'ui_completion'
      && item.phase === 'review'
      && item.memory?.saved === true
      && Boolean(item.cache?.responseId)
    ),
  {
    count: dailyAgentDays.size,
    days: [...dailyAgentDays].sort((a,b) => a-b),
    uiCompletionReviewCount: dailyAgentic.filter(item =>
      item.trigger === 'ui_completion'
      && item.phase === 'review'
      && item.memory?.saved === true
      && Boolean(item.cache?.responseId)
    ).length,
    receiptTasks: [...new Set(dailyAgentic.map(item => item.receipt?.task).filter(Boolean))]
  });
add('sprint.agentic.memory', 'All 30 daily Learning Coach assessments persist in owner-scoped memory',
  sprint.coachMemory?.persisted === true
    && sprint.coachMemory?.reviewCount === 30
    && Array.isArray(sprint.coachMemory?.days)
    && sprint.coachMemory.days.length === 30,
  { proof: sprint.coachMemory || null });
add('sprint.agentic.cache', 'Repeated Day 1 assessment reuses the exact-context cache',
  sprint.agentic?.cache?.hit === true && Boolean(sprint.agentic?.cache?.responseId),
  { proof: sprint.agentic?.cache || null });
add('sprint.agentic.grounded_samples', 'Grounded web research is exercised on representative days and all checkpoints',
  groundedDailyRequired.every(day => dailyGrounded.some(item => item.dayNumber === day))
    && groundedCheckpointRequired.every(day => checkpointGrounded.some(item => item.dayNumber === day)),
  {
    dailyRequired: groundedDailyRequired,
    dailyObserved: dailyGrounded.map(item => item.dayNumber),
    checkpointRequired: groundedCheckpointRequired,
    checkpointObserved: checkpointGrounded.map(item => item.dayNumber)
  });
add('sprint.agentic.grounded_native', 'At least one sampled grounded request returns a native provider result',
  nativeGrounded.length > 0,
  {
    nativeGroundedCount: nativeGrounded.length,
    nativeDays: nativeGrounded.map(item => item.dayNumber),
    degradedGroundedCount: groundedAttempts.filter(item => item.degraded?.active === true).length
  });
const degradedAgentic = [
  ...dailyAgentic,
  ...checkpointAgentic
].filter(item => item.degraded?.active === true);
add('sprint.agentic.degradation', 'Agentic guidance returns native structured output without provider-format degradation',
  degradedAgentic.length === 0,
  { count: degradedAgentic.length, samples: degradedAgentic.slice(0, 6).map(item => ({ dayNumber: item.dayNumber, degraded: item.degraded })) },
  false);
add('sprint.notes_evidence', 'Daily notes and structured evidence persist through reload/re-entry', sprint.passed === true && Array.isArray(sprint.recovery) && sprint.recovery.length > 0,
  { recovery: sprint.recovery || [], days: sprint.days || [] });
add('sprint.sequence', 'Days cannot be skipped through the API', sprint.sequencing?.serverRejectedSkippedDay === true,
  { proof: sprint.sequencing || null });
for (const day of [7, 14, 21, 30]) {
  add(`sprint.checkpoint.${day}`, `Day ${day} agentic reassessment persists`, checkpointDays.has(day),
    { proof: '30-day-sprint-ui-proof.json', checkpoint: (sprint.agentic?.checkpoints || []).find(item => item.dayNumber === day) || null });
}
add('sprint.reminders', 'Checkpoint reminders persist and navigate to the referenced review', sprint.reminders?.scheduled === 4 && sprint.reminders?.navigation === true,
  { proof: sprint.reminders || null });
add('sprint.pdf', 'Private Blueprint PDF downloads with non-empty bytes', hasSurface('Download Blueprint PDF'),
  { proof: '30-day-sprint-ui-proof.json', surfaceAudit: (sprint.surfaceAudit || []).filter(item => item.control === 'Download Blueprint PDF') });
add('sprint.assets', 'Private Blueprint asset ZIP downloads with non-empty bytes', hasSurface('Export all assets'),
  { proof: '30-day-sprint-ui-proof.json', surfaceAudit: (sprint.surfaceAudit || []).filter(item => item.control === 'Export all assets') });
add('sprint.viewports', 'Sprint works on mobile and desktop', viewportNames.has('mobile') && viewportNames.has('desktop'),
  { viewports: sprint.viewports || [] });
add('sprint.get_me_live_evidence', 'Linked Get Me Live evidence is visible inside Sprint', Array.isArray(sprint.websiteEvidence) && sprint.websiteEvidence.some(item => item.rendered === true),
  { samples: (sprint.websiteEvidence || []).slice(0, 4) });

add('gml.separate_entitlement', 'Get Me Live has a separate entitlement/order linked to the source Sprint',
  getMeLive.separateEntitlement?.distinctOrderId === true && getMeLive.separateEntitlement?.sourceSprintOrderId === sprint.orderId,
  { proof: getMeLive.separateEntitlement || null, sprintOrderId: sprint.orderId || null });
add('gml.publish', 'Get Me Live publishes to a stable Pages URL with release receipt', getMeLive.passed === true && /^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(String(getMeLive.liveUrl || '')),
  { liveUrl: getMeLive.liveUrl || null, releases: getMeLive.releases || null });
add('gml.lead', 'Visible lead form submits and the lead returns to the owner view', getMeLive.lead?.submittedThroughVisibleForm === true && getMeLive.lead?.recoveredInOwnerOrder === true,
  { lead: getMeLive.lead || null });
add('gml.viewports', 'Published Get Me Live site works on mobile and desktop', gmlViewportNames.has('mobile') && gmlViewportNames.has('desktop'),
  { viewports: getMeLive.viewports || [] });
add('gml.owner_controls', 'Authenticated Get Me Live owner controls pass interaction audit', ownerControls.passed === true,
  { exercised: ownerControls.exercised || [], classifiedNotClicked: ownerControls.classifiedNotClicked || [] });
add('interaction.sprint', 'Sprint tabs, downloads, refresh/recovery and back navigation are exercised', sprint.passed === true && (sprint.surfaceAudit || []).length >= 10,
  { surfaceAudit: sprint.surfaceAudit || [], recovery: sprint.recovery || [] });
add('interaction.errors', 'No 5xx responses or uncaught browser errors in audited runtime journeys',
  sprint.passed === true && getMeLive.passed === true && ownerControls.passed === true,
  { sprintPassed: sprint.passed || false, getMeLivePassed: getMeLive.passed || false, ownerControlsPassed: ownerControls.passed || false });

// Hard go-live gaps: these cannot be inferred from fixture state.
add('payments.full_webhook', 'Hosted Stripe test payment completes and webhook creates the Sprint entitlement',
  stripePayment.passed === true
    && stripePayment.stripeMode === 'test'
    && stripePayment.sessionStatus === 'complete'
    && stripePayment.paymentStatus === 'paid'
    && stripePayment.amountTotal === 9700
    && stripePayment.currency === 'usd'
    && stripePayment.artifactType === 'launch_blueprint_v2'
    && stripePayment.signedWebhookAccepted === true
    && stripePayment.webhookEventRecorded === true
    && stripePayment.eventReceiptMatchesOrder === true
    && stripePayment.dashboardProjectionPresent === true
    && stripePayment.matchingOrderCount === 1
    && stripePayment.successfulChargeCount === 1
    && stripePayment.idempotencyEventKeyPresent === true
    && stripePayment.duplicateReplayPerformed === true
    && stripePayment.duplicateReplayRejectedAsDuplicate === true
    && stripePayment.matchingOrderCountAfterReplay === 1
    && stripePayment.secretValuesRecorded === false,
  { proof: 'stripe-payment-webhook-proof.json', payment: stripePayment });
add('gml.cloudflare_oauth', 'Real Cloudflare authorization callback/refresh path is exercised',
  cloudflareOAuth.passed === true
    && cloudflareOAuth.environment === 'acceptance'
    && cloudflareOAuth.tokenInjected === false
    && cloudflareOAuth.consentCallbackPersisted === true
    && cloudflareOAuth.providerStateConnected === true
    && cloudflareOAuth.accessTokenStored === true
    && cloudflareOAuth.refreshTokenStored === true
    && cloudflareOAuth.membershipsReadScopeConfigured === true
    && cloudflareOAuth.pageWriteScopeConfigured === true
    && Number(cloudflareOAuth.accountListBeforeRefreshCount || 0) > 0
    && cloudflareOAuth.forcedExpiryApplied === true
    && cloudflareOAuth.refreshPathExercised === true
    && cloudflareOAuth.refreshSucceeded === true
    && Number(cloudflareOAuth.accountListAfterRefreshCount || 0) > 0
    && cloudflareOAuth.refreshedTokenExpiresInFuture === true
    && cloudflareOAuth.secretValuesRecorded === false,
  { proof: 'cloudflare-oauth-proof.json', oauth: cloudflareOAuth });
add('sprint.without_gml', 'A runtime Sprint remains fully usable when no Get Me Live order exists',
  sprintWithoutGml.passed === true
    && sprintWithoutGml.detached === true
    && sprintWithoutGml.dashboard?.sprintOpenedFromDashboard === true
    && sprintWithoutGml.progress?.writeRoundTrip === true
    && sprintWithoutGml.coachMemory?.reviewCount === 30
    && sprintWithoutGml.websiteEvidence?.available === false
    && Number(sprintWithoutGml.artifacts?.pdf?.bytes || 0) > 0
    && Number(sprintWithoutGml.artifacts?.assets?.bytes || 0) > 0,
  { proof: 'sprint-without-gml-proof.json', runtime: sprintWithoutGml });

const result = blockers.length === 0 ? 'PASS' : 'BLOCKED';
const report = {
  schemaVersion: 'ghosttown-agentic-go-live-gate-v1',
  result,
  checks,
  blockers,
  warnings,
  evidenceFiles: {
    frontDoor: 'github-acceptance/front-door-proof.json',
    sprint: 'github-acceptance/30-day-sprint-ui-proof.json',
    getMeLive: 'github-acceptance/get-me-live-browser-proof.json',
    ownerControls: 'github-acceptance/get-me-live-owner-controls.json',
    sprintWithoutGetMeLive: 'github-acceptance/sprint-without-gml-proof.json',
    stripePaymentWebhook: 'github-acceptance/stripe-payment-webhook-proof.json',
    cloudflareOAuth: 'github-acceptance/cloudflare-oauth-proof.json',
  },
  recordedAt: new Date().toISOString(),
};

const rows = checks.map(item => `| ${item.status} | ${item.label.replace(/\|/g, '\\|')} |`).join('\n');
const blockerText = blockers.length
  ? blockers.map((item, index) => `${index + 1}. **${item.label}** — ${JSON.stringify(item.evidence)}`).join('\n')
  : 'None.';
const markdown = `# GhostTown Agentic Go-Live Gate

**FINAL RESULT: ${result}**

| Result | Gate |
| --- | --- |
${rows}

## Exact blockers

${blockerText}

## Evidence

This gate is intentionally strict. The Learning Coach must assess and persist each day's recorded result, but agent-generated assessments are never counted as customer evidence, customer language, commitment, revenue, or market proof. The disposable acceptance fixture must remain isolated from production and real charges.

Generated: ${report.recordedAt}
`;

await writeFile(`${dir}/go-live-gate.json`, JSON.stringify(report, null, 2) + '\n');
await writeFile(`${dir}/GO_LIVE_GATE.md`, markdown);
console.log(`[go-live-gate] ${result}: ${blockers.length} blocker(s), ${checks.length} checks.`);
if (result !== 'PASS') process.exitCode = 2;
