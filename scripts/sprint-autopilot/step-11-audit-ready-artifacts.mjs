#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIR = resolve(process.env.STEP11_ARTIFACT_DIR || join(ROOT, 'github-acceptance', 'sprint-autopilot', 'step-11-ready'));

function assert(value, message) {
  if (!value) throw new Error(message);
}
function json(name) {
  const path = join(DIR, name);
  assert(existsSync(path), `Missing Step 11 artifact: ${name}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}
function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const receipt = json('final-acceptance-receipt.json');
const blueprint = json('blueprint.json');
const research = json('research-receipt.json');
const manifest = json('zip-manifest.json');

assert(receipt.finalOrderStatus === 'ready', 'Step 11 requires finalOrderStatus=ready');
assert(receipt.audit?.outcome === 'ready' && receipt.audit?.passed === true, 'READY acceptance audit did not pass');
assert(blueprint.status === 'ready', 'Blueprint status is not ready');
assert(blueprint.qualityGate?.passed === true, 'Blueprint quality gate did not pass');
assert(Array.isArray(blueprint.dailyCalendar) && blueprint.dailyCalendar.length === 30, 'READY Sprint must contain exactly 30 days');
assert(Array.isArray(manifest) && manifest.length === 16, 'READY ZIP must contain exactly 16 files');

const pdf = readFileSync(join(DIR, 'launch-blueprint.pdf'));
assert(pdf.subarray(0, 5).toString() === '%PDF-', 'READY PDF signature is invalid');
assert(pdf.byteLength > 10000, 'READY PDF is unexpectedly small');

const channels = blueprint.customerAccessPack?.channels || [];
const access = channels.filter(channel => channel.evidenceRole === 'customer_access');
assert(access.length >= 3, 'READY Sprint has fewer than 3 Customer Access paths');
assert(access.every(channel => channel.currentActivityStatus === 'verified_current' && channel.publicUrl && channel.accessPath), 'READY Customer Access path lacks current verification or usable access');

const review = blueprint.competitorReviewIntelligence;
assert(review?.productSpecific === true, 'Review intelligence is not product-specific');
assert(review.orderId === receipt.orderId, 'Review intelligence orderId does not match READY receipt');
assert(Array.isArray(review.observations), 'READY Sprint review observations must be an array');
const observationUrls = new Set(review.observations.map(observation => String(observation.sourceUrl || '').toLowerCase().replace(/\/$/, '')).filter(Boolean));
const observationSources = new Set(review.observations.map(observation => observation.sourceId));
assert(review.observations.every(observation => observation.sourceUrl && observation.customerLanguage?.length), 'Review observation lacks source URL or observed language');
assert((review.patterns || []).every(pattern => pattern.sourceIds?.length >= 2 && pattern.sourceIds.every(id => observationSources.has(id))), 'Review pattern lacks two-source provenance');
assert((review.productImplications || []).every(implication => implication.sourceIds?.length && implication.sourceIds.every(id => observationSources.has(id))), 'Review hypothesis lacks observed-source provenance');

const observationUrlBySourceId = new Map(
  review.observations.map(observation => [
    observation.sourceId,
    String(observation.sourceUrl || '').toLowerCase().replace(/\/$/, '')
  ])
);
const competitivePatternKinds = new Set(['strength', 'weakness', 'switching_signal', 'pricing_signal', 'support_signal', 'requested_improvement']);
const competitiveReviewUrls = (review.patterns || [])
  .filter(pattern => competitivePatternKinds.has(pattern.kind))
  .flatMap(pattern => pattern.sourceIds || [])
  .map(sourceId => observationUrlBySourceId.get(sourceId) || '')
  .filter(Boolean);
const competitiveAlternativeUrls = new Set([
  ...competitiveReviewUrls,
  ...channels
    .filter(channel => channel.competitorEvidence?.some(value => String(value || '').trim()))
    .map(channel => String(channel.publicUrl || '').toLowerCase().replace(/\/$/, ''))
    .filter(Boolean)
]);
assert(competitiveAlternativeUrls.size >= 2, 'READY Sprint has fewer than 2 independent competitive/alternative evidence sources');

const sufficiency = research?.evidenceSufficiency;
assert(sufficiency?.sufficient === true, 'READY research receipt did not pass role-based evidence sufficiency');
const coveredRoles = new Set(sufficiency?.coveredRoles || []);
for (const role of ['customer_access', 'problem_language', 'competitive_alternative']) {
  assert(coveredRoles.has(role), `READY research receipt is missing required evidence role: ${role}`);
}
assert(sufficiency.currentCustomerAccessCount >= 3, 'READY receipt has fewer than 3 current customer-access sources');
assert(sufficiency.problemLanguageObservationCount >= 3, 'READY receipt has fewer than 3 independent problem-language observations');
assert(new Set(sufficiency.problemLanguageSourceUrls || []).size >= 3, 'READY receipt lacks 3 independent problem-language source URLs');
assert(sufficiency.competitiveAlternativeSourceCount >= 2, 'READY receipt has fewer than 2 competitive/alternative sources');

const stages = blueprint.generationReceipt?.stages?.map(stage => stage.stage) || [];
assert(blueprint.generationReceipt?.pipelineVersion === 'vertex-blueprint-staged-v3', 'Missing staged Vertex v3 generation receipt');
assert(stages.includes('strategic_coherence_gate'), 'Missing Strategic Coherence receipt stage');
assert(blueprint.generationReceipt?.redTeam?.passed === true, 'Red-team receipt did not pass');
assert(research?.generationReceiptEvidence?.quality?.sourceVerificationPassed === true, 'Research source-verification quality receipt did not pass');

const allText = JSON.stringify(blueprint);
assert(!allText.includes('$119'), 'Retired $119 promise leaked into READY Sprint');
assert(!/30-Day Sprint[^]{0,180}(includes|comes with)[^]{0,100}(live website|Launch Site)/i.test(allText), 'READY Sprint improperly bundles Get Me Live/site work');

const fixtureTerms = ['ai', 'app', 'launch', 'deployment', 'authentication', 'payments', 'founder'];
const dayText = blueprint.dailyCalendar.map(day => normalized(JSON.stringify(day)));
const specificDays = dayText.filter(text => fixtureTerms.some(term => text.split(' ').includes(term))).length;
assert(specificDays >= 20, `Only ${specificDays}/30 days retain clear fixture-specific language; need at least 20`);

const outreach = blueprint.customerAccessPack?.outreachScripts || [];
assert(outreach.length > 0, 'READY Sprint has no outreach messages');
const messageText = normalized(JSON.stringify(outreach));
assert(fixtureTerms.some(term => messageText.split(' ').includes(term)), 'Outreach messages do not retain product-specific language');

const packet = {
  schemaVersion: 'ghosttown-step-11-semantic-review-packet-v1',
  recordedAt: new Date().toISOString(),
  orderId: receipt.orderId,
  verdictId: receipt.verdictId,
  mechanicalAuditPassed: true,
  counts: {
    days: blueprint.dailyCalendar.length,
    productSpecificDays: specificDays,
    customerAccess: access.length,
    outreachScripts: outreach.length,
    reviewObservations: review.observations.length,
    reviewPatterns: review.patterns?.length || 0,
    problemLanguageObservations: sufficiency.problemLanguageObservationCount,
    problemLanguageSources: sufficiency.problemLanguageSourceUrls || [],
    competitiveAlternativeSources: sufficiency.competitiveAlternativeSourceCount,
    evidenceRoles: sufficiency.coveredRoles,
    independentEvidenceUrls: sufficiency.independentEvidenceUrls,
    zipFiles: manifest.length
  },
  generationStages: stages,
  sampleDayTitles: blueprint.dailyCalendar.slice(0, 10).map(day => day.title),
  sampleAccessPaths: access.slice(0, 5).map(channel => ({
    community: channel.community,
    publicUrl: channel.publicUrl,
    accessPath: channel.accessPath
  })),
  sampleMessages: outreach.slice(0, 3).map(script => ({
    name: script.name || script.scriptId || 'message',
    purpose: script.purpose || null,
    body: script.body || script.message || null
  })),
  reviewThemes: (review.patterns || []).slice(0, 8).map(pattern => ({
    kind: pattern.kind,
    theme: pattern.theme,
    confidence: pattern.confidence,
    sourceCount: pattern.sourceIds.length
  })),
  humanReviewRequired: true
};
writeFileSync(join(DIR, 'semantic-review-packet.json'), JSON.stringify(packet, null, 2) + '\n');
console.log(JSON.stringify(packet, null, 2));
