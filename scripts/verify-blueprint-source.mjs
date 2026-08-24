import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = process.cwd();
const manifestPath = resolve(
  repositoryRoot,
  'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json'
);

function fail(message) {
  console.error(`[blueprint-source] ${message}`);
  process.exit(1);
}

function normalizeCanonicalSource(content) {
  return content.replace(/\r\n?/g, '\n');
}

function gitBlobSha1(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

function verifyTrackedSource(entry, label) {
  if (!entry?.path || !entry?.version || !entry?.gitBlobSha1) {
    fail(`Evidence manifest is missing ${label} path, version, or expected hash.`);
  }
  const path = resolve(repositoryRoot, entry.path);
  let source;
  try {
    source = normalizeCanonicalSource(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Unable to read ${label} at ${path}: ${error.message}`);
  }
  const actualHash = gitBlobSha1(source);
  if (actualHash !== entry.gitBlobSha1) {
    fail(
      `${label} hash mismatch. Expected ${entry.gitBlobSha1}, received ${actualHash}. ` +
      'Create a versioned source update, explicit change record, and regenerated evidence chain before continuing.'
    );
  }
  return { source, actualHash };
}

function requireText(source, required, label) {
  if (!source.includes(required)) fail(`${label} is missing or altered: ${required}`);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Unable to read evidence manifest at ${manifestPath}: ${error.message}`);
}

// Keep the v2.1.4 compatibility fields for roadmap scripts that were built
// before the calendar/Copilot amendments, but require the actual source-chain
// tip to advance through the approved v2.1.5 and v2.1.6 decisions.
if (manifest?.changeId !== 'GT-BP-2026-08-15-V2.1.4') {
  fail('Evidence manifest no longer preserves the v2.1.4 compatibility change ID.');
}
if (manifest?.previousChangeId !== 'GT-BP-2026-08-15-V2.1.3') {
  fail('Evidence manifest no longer preserves the v2.1.3 compatibility predecessor.');
}
if (manifest?.chainTip?.changeId !== 'GT-BP-2026-08-18-V2.1.6') {
  fail('Evidence chain tip is not the approved v2.1.6 Execution Intelligence change ID.');
}
if (manifest?.chainTip?.previousChangeId !== 'GT-BP-2026-08-18-V2.1.5') {
  fail('Evidence chain tip does not preserve the v2.1.5 Calendar-Primary predecessor.');
}
if (manifest?.chainTip?.version !== '2.1.6') fail('Evidence chain tip version must be 2.1.6.');

const canonical = verifyTrackedSource(manifest.canonical, 'Canonical Blueprint');
const platformAmendment = verifyTrackedSource(manifest.platformAmendment, 'v2.1.2 Vertex AI platform amendment');
const platformChangeRecord = verifyTrackedSource(manifest.platformChangeRecord, 'v2.1.2 change record');
const websiteAmendment = verifyTrackedSource(manifest.previousAmendment, 'v2.1.3 Custom Website capability amendment');
const websiteChangeRecord = verifyTrackedSource(manifest.previousChangeRecord, 'v2.1.3 change record');
const spaAmendment = verifyTrackedSource(manifest.amendment, 'v2.1.4 Cloudflare SPA template amendment');
const spaChangeRecord = verifyTrackedSource(manifest.changeRecord, 'v2.1.4 change record');
const calendarAmendment = verifyTrackedSource(manifest.calendarAmendment, 'v2.1.5 Calendar-Primary Execution amendment');
const calendarChangeRecord = verifyTrackedSource(manifest.calendarChangeRecord, 'v2.1.5 change record');
const executionAmendment = verifyTrackedSource(manifest.executionIntelligenceAmendment, 'v2.1.6 Execution Intelligence amendment');
const executionChangeRecord = verifyTrackedSource(manifest.executionIntelligenceChangeRecord, 'v2.1.6 change record');

const authorityClause =
  'The canonical Blueprint is the authoritative product and implementation guide. Every Factory slice must revalidate its exact hash before execution.';
requireText(canonical.source, authorityClause, 'Canonical Blueprint authority clause');

const architectureDecision =
  "Cloudflare remains the application platform; Google Vertex AI becomes GhostTown's canonical generative-AI platform.";
requireText(platformAmendment.source, architectureDecision, 'v2.1.2 architecture decision');
requireText(platformAmendment.source, 'No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived', 'v2.1.2 outcome protection');
requireText(platformChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.2 change record outcome protection');

const websiteDecision =
  'Custom website creation is a separate post-Blueprint `WebsiteCreationService` capability and must not be folded into paid Blueprint generation.';
requireText(websiteAmendment.source, websiteDecision, 'v2.1.3 Custom Website product decision');
requireText(websiteAmendment.source, 'The existing Blueprint Launch Site remains the validation-stage microsite already included in the $97 product.', 'v2.1.3 Launch Site boundary');
requireText(websiteAmendment.source, 'No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived', 'v2.1.3 outcome protection');
requireText(websiteChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.3 change record outcome protection');

const spaDecision =
  'Custom Website output is a React/Vite single-page application deployed on Cloudflare. GhostTown and MemoriesMyStory are the first two governed template reference models.';
requireText(spaAmendment.source, spaDecision, 'v2.1.4 Cloudflare SPA/template product decision');
for (const required of [
  'ghosttown_conversion',
  'memories_story_editorial',
  '"not_found_handling": "single-page-application"',
  'The existing Blueprint Launch Site remains the validation-stage microsite already included in the $97 product.',
  'The Custom Website remains a separate post-Blueprint product capability.',
  'No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived by this amendment.'
]) requireText(spaAmendment.source, required, 'v2.1.4 SPA template amendment');
requireText(spaChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.4 change record outcome protection');

const calendarDecision = 'The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.';
requireText(calendarAmendment.source, calendarDecision, 'v2.1.5 Calendar-Primary product decision');
for (const required of [
  'record evidence',
  'complete day only when the execution contract is satisfied',
  'Day 7, 14, 21, and 30 are evidence checkpoints.',
  'The PDF and asset bundle remain durable exports and recovery artifacts',
  'No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment.',
  'Weakening approved outcomes remains prohibited.'
]) requireText(calendarAmendment.source, required, 'v2.1.5 Calendar-Primary amendment');
requireText(calendarChangeRecord.source, calendarDecision, 'v2.1.5 change record product decision');
requireText(calendarChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.5 change record outcome protection');

const executionDecision = "GhostTown's paid 30-Day Launch Blueprint is an evidence-aware execution system, not a generic business chatbot and not a static calendar.";
requireText(executionAmendment.source, executionDecision, 'v2.1.6 Execution Intelligence product decision');
for (const required of [
  'business-model lane semantics',
  'Deterministic execution-context retrieval',
  '`mayChange`',
  '`mustKeep`',
  'Current Experiment',
  'Strategy Room',
  'fast_assistant',
  'strategy_reasoner',
  'critic',
  'grounded_research',
  'AI is advisory. Deterministic software remains authoritative',
  'No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment.',
  'Weakening approved outcomes remains prohibited.'
]) requireText(executionAmendment.source, required, 'v2.1.6 Execution Intelligence amendment');
requireText(executionChangeRecord.source, 'The paid GhostTown 30-Day Launch Blueprint is extended', 'v2.1.6 change record decision');
requireText(executionChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.6 change record outcome protection');

if (manifest?.executionIntelligenceEvidence?.path !== 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.6-execution-intelligence-evidence.json') {
  fail('Evidence chain does not reference the v2.1.6 implementation evidence manifest.');
}
try {
  const executionEvidence = JSON.parse(readFileSync(resolve(repositoryRoot, manifest.executionIntelligenceEvidence.path), 'utf8'));
  if (executionEvidence?.changeId !== manifest.chainTip.changeId) fail('v2.1.6 implementation evidence change ID does not match the chain tip.');
  if (executionEvidence?.canonical?.gitBlobSha1 !== manifest.canonical.gitBlobSha1) fail('v2.1.6 implementation evidence does not preserve the canonical Blueprint hash.');
  if (executionEvidence?.canonical?.sourceModified !== false) fail('v2.1.6 implementation evidence must state that the canonical source was not modified.');
  if (executionEvidence?.modelBoundary?.modelMayMarkDayComplete !== false) fail('v2.1.6 model boundary must prohibit AI-owned completion.');
  if (executionEvidence?.modelBoundary?.modelMayOverrideBranchPermissions !== false) fail('v2.1.6 model boundary must prohibit AI override of branch permissions.');
  if (executionEvidence?.preservedAcceptance?.gate36HumanReleasePreserved !== true) fail('v2.1.6 evidence must preserve the human Gate 36 release decision.');
} catch (error) {
  fail(`Unable to verify v2.1.6 implementation evidence: ${error.message}`);
}

if (manifest?.outcomeProtection?.weakeningAllowed !== false) {
  fail('Evidence manifest must explicitly prohibit weakening the approved customer outcome.');
}
for (const required of [
  'requiresExplicitProductDecision',
  'requiresVersionedSourceUpdate',
  'requiresChangeRecord',
  'requiresRegeneratedEvidenceChain'
]) {
  if (manifest?.outcomeProtection?.[required] !== true) {
    fail(`Evidence manifest must require ${required}.`);
  }
}

console.log(
  `[blueprint-source] verified chain tip ${manifest.chainTip.version} ${executionAmendment.actualHash} (${manifest.chainTip.changeId}); ` +
  `base ${manifest.canonical.version} ${canonical.actualHash}; platform ${manifest.platformAmendment.version} ${platformAmendment.actualHash}; ` +
  `website ${manifest.previousAmendment.version} ${websiteAmendment.actualHash}; spa ${manifest.amendment.version} ${spaAmendment.actualHash}; ` +
  `calendar ${manifest.calendarAmendment.version} ${calendarAmendment.actualHash}; change-record ${executionChangeRecord.actualHash}`
);