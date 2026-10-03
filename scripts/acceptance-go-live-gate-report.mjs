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

const [frontDoor, sprint, getMeLive, ownerControls] = await Promise.all([
  jsonFile('front-door-proof.json'),
  jsonFile('30-day-sprint-ui-proof.json'),
  jsonFile('get-me-live-browser-proof.json'),
  jsonFile('get-me-live-owner-controls.json'),
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
const dailyGrounded = dailyAgentic.filter(item => item.capability === 'grounded_research' && item.receipt?.task === 'grounded_research');
add('sprint.agentic.daily', 'Agentic grounded research/guidance runs for Days 1-30',
  dailyAgentDays.size === 30 && dailyGrounded.length === 30,
  {
    count: dailyAgentDays.size,
    groundedResearchCount: dailyGrounded.length,
    days: [...dailyAgentDays].sort((a,b) => a-b),
    receiptTasks: [...new Set(dailyAgentic.map(item => item.receipt?.task).filter(Boolean))]
  });
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
  frontDoor.fullPaymentWebhookVerified === true,
  { currentProof: 'Front-door currently proves checkout handoff only; fixture entitlement is no-charge and must not be treated as Stripe webhook proof.' });
add('gml.cloudflare_oauth', 'Real Cloudflare authorization callback/refresh path is exercised',
  getMeLive.cloudflareOAuthVerified === true,
  { currentProof: 'Disposable fixture injects an acceptance Cloudflare token; this does not prove the customer OAuth consent/callback path.' });
add('sprint.without_gml', 'A runtime Sprint remains fully usable when no Get Me Live order exists',
  sprint.sprintWithoutGetMeLiveVerified === true,
  { currentProof: 'Current disposable fixture always links a Get Me Live order; component tests are not enough for this runtime gate.' });

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

This gate is intentionally strict. Agent-generated daily guidance may help drive the acceptance browser, but it is never counted as real customer evidence, customer language, commitment, revenue, or market proof. The disposable acceptance fixture must remain isolated from production and real charges.

Generated: ${report.recordedAt}
`;

await writeFile(`${dir}/go-live-gate.json`, JSON.stringify(report, null, 2) + '\n');
await writeFile(`${dir}/GO_LIVE_GATE.md`, markdown);
console.log(`[go-live-gate] ${result}: ${blockers.length} blocker(s), ${checks.length} checks.`);
if (result !== 'PASS') process.exitCode = 2;
