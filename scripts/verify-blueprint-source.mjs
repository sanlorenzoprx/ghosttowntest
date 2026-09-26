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
// tip to advance through the approved v2.1.5, v2.1.6, v2.1.7, v2.1.8, and v2.1.9 decisions.
if (manifest?.changeId !== 'GT-BP-2026-08-15-V2.1.4') {
  fail('Evidence manifest no longer preserves the v2.1.4 compatibility change ID.');
}
if (manifest?.previousChangeId !== 'GT-BP-2026-08-15-V2.1.3') {
  fail('Evidence manifest no longer preserves the v2.1.3 compatibility predecessor.');
}
if (manifest?.chainTip?.changeId !== 'GT-BP-2026-09-26-V2.1.9') {
  fail('Evidence chain tip is not the approved v2.1.9 Evidence Recency and Current-Activity Integrity change ID.');
}
if (manifest?.chainTip?.previousChangeId !== 'GT-BP-2026-09-26-V2.1.8') {
  fail('Evidence chain tip does not preserve the v2.1.8 Research Role and Customer Access predecessor.');
}
if (manifest?.chainTip?.version !== '2.1.9') fail('Evidence chain tip version must be 2.1.9.');

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
const coherenceAmendment = verifyTrackedSource(manifest.strategicCoherenceAmendment, 'v2.1.7 Strategic Coherence Gate amendment');
const coherenceChangeRecord = verifyTrackedSource(manifest.strategicCoherenceChangeRecord, 'v2.1.7 change record');
const coherenceEvidence = verifyTrackedSource(manifest.strategicCoherenceEvidence, 'v2.1.7 implementation evidence');
const researchRoleAmendment = verifyTrackedSource(manifest.researchRoleCustomerAccessAmendment, 'v2.1.8 Research Role and Customer Access amendment');
const researchRoleChangeRecord = verifyTrackedSource(manifest.researchRoleCustomerAccessChangeRecord, 'v2.1.8 change record');
const researchRoleEvidence = verifyTrackedSource(manifest.researchRoleCustomerAccessEvidence, 'v2.1.8 implementation evidence');
const recencyAmendment = verifyTrackedSource(manifest.evidenceRecencyCurrentActivityAmendment, 'v2.1.9 Evidence Recency and Current-Activity Integrity amendment');
const recencyChangeRecord = verifyTrackedSource(manifest.evidenceRecencyCurrentActivityChangeRecord, 'v2.1.9 change record');
const recencyEvidence = verifyTrackedSource(manifest.evidenceRecencyCurrentActivityEvidence, 'v2.1.9 implementation evidence');

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

const coherenceDecision = 'GhostTown must not generate the paid 30-Day Sprint until one coherent commercial chain exists:';
requireText(coherenceAmendment.source, coherenceDecision, 'v2.1.7 Strategic Coherence Gate product decision');
for (const required of [
  'Customer -> problem -> buyer/payer -> current alternative -> test -> commitment -> fulfillment -> access path',
  'A failed coherence gate may not be converted into a warning.',
  'A manual proxy fails the gate when it silently changes the business being tested.',
  'Research evidence and customer access are separate concepts.',
  'no 30-day customer assets are generated',
  'Weakening approved outcomes remains prohibited.'
]) requireText(coherenceAmendment.source, required, 'v2.1.7 Strategic Coherence Gate amendment');
requireText(coherenceChangeRecord.source, 'Customer -> problem -> buyer/payer -> current alternative -> test -> commitment -> fulfillment -> access path', 'v2.1.7 change record decision');
requireText(coherenceChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.7 change record outcome protection');

if (manifest?.executionIntelligenceEvidence?.path !== 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.6-execution-intelligence-evidence.json') {
  fail('Evidence chain does not reference the v2.1.6 implementation evidence manifest.');
}
try {
  const executionEvidence = JSON.parse(readFileSync(resolve(repositoryRoot, manifest.executionIntelligenceEvidence.path), 'utf8'));
  if (executionEvidence?.changeId !== manifest.executionIntelligenceAmendment.changeId) fail('v2.1.6 implementation evidence change ID does not match the v2.1.6 amendment.');
  if (executionEvidence?.canonical?.gitBlobSha1 !== manifest.canonical.gitBlobSha1) fail('v2.1.6 implementation evidence does not preserve the canonical Blueprint hash.');
  if (executionEvidence?.canonical?.sourceModified !== false) fail('v2.1.6 implementation evidence must state that the canonical source was not modified.');
  if (executionEvidence?.modelBoundary?.modelMayMarkDayComplete !== false) fail('v2.1.6 model boundary must prohibit AI-owned completion.');
  if (executionEvidence?.modelBoundary?.modelMayOverrideBranchPermissions !== false) fail('v2.1.6 model boundary must prohibit AI override of branch permissions.');
  if (executionEvidence?.preservedAcceptance?.gate36HumanReleasePreserved !== true) fail('v2.1.6 evidence must preserve the human Gate 36 release decision.');
} catch (error) {
  fail(`Unable to verify v2.1.6 implementation evidence: ${error.message}`);
}

if (manifest?.strategicCoherenceEvidence?.path !== 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.7-strategic-coherence-evidence.json') {
  fail('Evidence chain does not reference the v2.1.7 Strategic Coherence implementation evidence.');
}
try {
  const evidence = JSON.parse(coherenceEvidence.source);
  if (evidence?.changeId !== manifest.strategicCoherenceAmendment.changeId) fail('v2.1.7 implementation evidence change ID does not match the v2.1.7 amendment.');
  if (evidence?.canonical?.gitBlobSha1 !== manifest.canonical.gitBlobSha1) fail('v2.1.7 implementation evidence does not preserve the canonical Blueprint hash.');
  if (evidence?.canonical?.sourceModified !== false) fail('v2.1.7 implementation evidence must state that the canonical source was not modified.');
  if (evidence?.pipelineVersion !== 'vertex-blueprint-staged-v2') fail('v2.1.7 evidence must require strategic-coherence pipeline v2.');
  if (evidence?.pipelineOrder?.join(',') !== 'evidence_normalization,strategy_synthesis,strategic_coherence_gate,asset_generation,red_team_review') fail('v2.1.7 evidence must preserve the hard pre-asset gate ordering.');
  if (evidence?.gateLinks?.join(',') !== 'customer,problem,buyer_payer,current_alternative,test,commitment,fulfillment,access_path') fail('v2.1.7 evidence must preserve the eight-link strategic chain.');
  if (evidence?.validation?.focusedTests?.failed !== 0 || evidence?.validation?.focusedTests?.passed < 6) fail('v2.1.7 focused regression evidence is incomplete.');
  if (evidence?.validation?.liveHistoricalReplay?.longevity?.gatePassed !== false) fail('v2.1.7 evidence must prove the historical Longevity Sprint is blocked.');
  if (evidence?.validation?.liveHistoricalReplay?.suredose?.gatePassed !== false) fail('v2.1.7 evidence must prove the historical SureDose Sprint is blocked.');
  if (evidence?.validation?.typecheck?.passed !== true) fail('v2.1.7 typecheck evidence did not pass.');
  if (evidence?.validation?.productionDeploymentPerformed !== false) fail('v2.1.7 evidence must not claim a production deployment.');
} catch (error) {
  fail(`Unable to verify v2.1.7 implementation evidence: ${error.message}`);
}

const researchRoleDecision = 'Every retained research target has exactly one evidence role:';
requireText(researchRoleAmendment.source, researchRoleDecision, 'v2.1.8 Research Role and Customer Access product decision');
for (const required of [
  'at least **3 direct `customer_access` targets**.',
  'Only a target whose evidence role is `customer_access` may drive:',
  'The dashboard and PDF must show researched targets in four separate groups:',
  'Market evidence is not customer-access evidence. Customer-access evidence is not PR. PR is not partnership. Partnership is not a buyer.'
]) requireText(researchRoleAmendment.source, required, 'v2.1.8 Research Role and Customer Access amendment');
requireText(researchRoleChangeRecord.source, 'Direct Customer Access | Market Evidence | Media / PR | Partnership', 'v2.1.8 change record decision');
requireText(researchRoleChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.8 change record outcome protection');

if (manifest?.researchRoleCustomerAccessEvidence?.path !== 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.8-research-role-customer-access-evidence.json') {
  fail('Evidence chain does not reference the v2.1.8 Research Role and Customer Access implementation evidence.');
}
try {
  const evidence = JSON.parse(researchRoleEvidence.source);
  if (evidence?.changeId !== manifest.researchRoleCustomerAccessAmendment.changeId) fail('v2.1.8 implementation evidence change ID does not match the v2.1.8 amendment.');
  if (evidence?.canonical?.gitBlobSha1 !== manifest.canonical.gitBlobSha1) fail('v2.1.8 implementation evidence does not preserve the canonical Blueprint hash.');
  if (evidence?.canonical?.sourceModified !== false) fail('v2.1.8 implementation evidence must state that the canonical source was not modified.');
  const expectedBlockers = [
    'RESEARCH_FEWER_THAN_THREE_CUSTOMER_ACCESS_TARGETS',
    'STRATEGY_FIRST_REVENUE_USES_NON_CUSTOMER_ACCESS',
    'STRATEGY_LAUNCH_CARD_USES_NON_CUSTOMER_ACCESS'
  ];
  if (expectedBlockers.some(code => !evidence?.releaseBlockers?.includes(code))) fail('v2.1.8 evidence is missing a required customer-access release blocker.');
  if (evidence?.historicalFalsification?.longevity?.passesV218DirectAccessRequirement !== false) fail('v2.1.8 evidence must prove the historical Longevity Sprint fails direct-customer-access requirements.');
  if (evidence?.historicalFalsification?.suredose?.passesV218DirectAccessRequirement !== false) fail('v2.1.8 evidence must prove the historical SureDose Sprint fails direct-customer-access requirements.');
  if (evidence?.historicalFalsification?.longevity?.roleCounts?.customer_access !== 0) fail('v2.1.8 historical Longevity replay must preserve zero direct customer-access targets.');
  if (evidence?.historicalFalsification?.suredose?.roleCounts?.customer_access !== 0) fail('v2.1.8 historical SureDose replay must preserve zero direct customer-access targets.');
  if (evidence?.validation?.focusedTests?.failed !== 0 || evidence?.validation?.focusedTests?.passed < 63) fail('v2.1.8 focused regression evidence is incomplete.');
  if (evidence?.validation?.uiFocusedTests?.failed !== 0 || evidence?.validation?.uiFocusedTests?.passed < 53) fail('v2.1.8 dashboard regression evidence is incomplete.');
  if (evidence?.validation?.typecheck?.passed !== true) fail('v2.1.8 typecheck evidence did not pass.');
  if (evidence?.validation?.blueprintVerification?.passed !== true || evidence?.validation?.blueprintVerification?.chainTip !== '2.1.8') fail('v2.1.8 Blueprint verification evidence is incomplete.');
  if (evidence?.validation?.build?.passed !== true || evidence?.validation?.build?.generatedDiscoveryRoutes !== 40) fail('v2.1.8 build evidence is incomplete.');
  if (evidence?.validation?.productionDeploymentPerformed !== false) fail('v2.1.8 evidence must not claim a production deployment.');
} catch (error) {
  fail(`Unable to verify v2.1.8 implementation evidence: ${error.message}`);
}

const recencyDecision = 'Three clocks are authoritative and must remain separate:';
requireText(recencyAmendment.source, recencyDecision, 'v2.1.9 Evidence Recency and Current-Activity Integrity product decision');
for (const required of [
  '**Research/access date**',
  '**Evidence date**',
  '**Current-activity verification**',
  'A source accessed in September 2026 can still be evidence from 2015, 2018, 2022, or 2025.',
  'currentActivityStatus = verified_current',
  'RESEARCH_MISSING_EVIDENCE_RECENCY_METADATA',
  'RESEARCH_INCONSISTENT_CURRENT_ACTIVITY_CLAIM',
  'Never collapse those three facts.'
]) requireText(recencyAmendment.source, required, 'v2.1.9 Evidence Recency and Current-Activity Integrity amendment');
requireText(recencyChangeRecord.source, 'Research/access date | underlying evidence date | current-activity verification', 'v2.1.9 change record decision');
requireText(recencyChangeRecord.source, 'Weakening approved outcomes remains prohibited.', 'v2.1.9 change record outcome protection');

if (manifest?.evidenceRecencyCurrentActivityEvidence?.path !== 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.9-evidence-recency-current-activity-evidence.json') {
  fail('Evidence chain does not reference the v2.1.9 Evidence Recency and Current-Activity implementation evidence.');
}
try {
  const evidence = JSON.parse(recencyEvidence.source);
  if (evidence?.changeId !== manifest.chainTip.changeId) fail('v2.1.9 implementation evidence change ID does not match the chain tip.');
  if (evidence?.canonical?.gitBlobSha1 !== manifest.canonical.gitBlobSha1) fail('v2.1.9 implementation evidence does not preserve the canonical Blueprint hash.');
  if (evidence?.canonical?.sourceModified !== false) fail('v2.1.9 implementation evidence must state that the canonical source was not modified.');
  if (evidence?.policy?.researchDateMaySubstituteForEvidenceDate !== false) fail('v2.1.9 must prohibit research date from substituting for evidence date.');
  if (evidence?.policy?.backlinkLastSeenMayProvePublisherActivity !== false) fail('v2.1.9 must prohibit backlink freshness from proving publisher activity.');
  if (evidence?.policy?.unknownDateFailsClosed !== true) fail('v2.1.9 must fail closed on unknown current-activity dates.');
  if (evidence?.policy?.currentEvidenceMaxDays !== 90 || evidence?.policy?.recentEvidenceMaxDays !== 365 || evidence?.policy?.currentActivityMaxDays !== 120) fail('v2.1.9 deterministic recency thresholds changed without a versioned decision.');
  const expectedBlockers = [
    'RESEARCH_FEWER_THAN_THREE_CUSTOMER_ACCESS_TARGETS',
    'RESEARCH_MISSING_EVIDENCE_RECENCY_METADATA',
    'RESEARCH_INCONSISTENT_CURRENT_ACTIVITY_CLAIM',
    'STRATEGY_FIRST_REVENUE_USES_NON_CUSTOMER_ACCESS',
    'STRATEGY_LAUNCH_CARD_USES_NON_CUSTOMER_ACCESS'
  ];
  if (expectedBlockers.some(code => !evidence?.releaseBlockers?.includes(code))) fail('v2.1.9 evidence is missing a required recency/customer-access release blocker.');
  const historical = evidence?.historicalFalsification?.suredose?.examples || [];
  const old2018 = historical.find(item => item?.underlyingYear === 2018);
  const old2015 = historical.find(item => item?.underlyingYear === 2015);
  if (old2018?.originalActivity !== 'recent' || old2018?.originalConfidence !== 'high') fail('v2.1.9 evidence must preserve the historical 2018 recent/high falsification.');
  if (old2015?.originalActivity !== 'active' || old2015?.originalConfidence !== 'high') fail('v2.1.9 evidence must preserve the historical 2015 active/high falsification.');
  if (evidence?.validation?.focusedTests?.failed !== 0 || evidence?.validation?.focusedTests?.passed < 77) fail('v2.1.9 focused recency regression evidence is incomplete.');
  if (evidence?.validation?.typecheck?.passed !== true) fail('v2.1.9 typecheck evidence did not pass.');
  if (evidence?.validation?.productionBuildPayload?.passed !== true || evidence?.validation?.productionBuildPayload?.generatedDiscoveryRoutes !== 40 || evidence?.validation?.productionBuildPayload?.verifiedDiscoveryIntents !== 20) fail('v2.1.9 production build payload evidence is incomplete.');
  if (evidence?.validation?.guardedBuild?.passed !== true || evidence?.validation?.guardedBuild?.blueprintVerificationChainTip !== '2.1.9' || evidence?.validation?.guardedBuild?.generatedDiscoveryRoutes !== 40) fail('v2.1.9 guarded build evidence is incomplete.');
  if (evidence?.validation?.blueprintVerification?.passed !== true || evidence?.validation?.blueprintVerification?.chainTip !== '2.1.9') fail('v2.1.9 Blueprint verification evidence is incomplete.');
  if (evidence?.validation?.productionDeploymentPerformed !== false) fail('v2.1.9 evidence must not claim a production deployment.');
} catch (error) {
  fail(`Unable to verify v2.1.9 implementation evidence: ${error.message}`);
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
  `[blueprint-source] verified chain tip ${manifest.chainTip.version} ${recencyAmendment.actualHash} (${manifest.chainTip.changeId}); ` +
  `base ${manifest.canonical.version} ${canonical.actualHash}; platform ${manifest.platformAmendment.version} ${platformAmendment.actualHash}; ` +
  `website ${manifest.previousAmendment.version} ${websiteAmendment.actualHash}; spa ${manifest.amendment.version} ${spaAmendment.actualHash}; ` +
  `calendar ${manifest.calendarAmendment.version} ${calendarAmendment.actualHash}; execution ${manifest.executionIntelligenceAmendment.version} ${executionAmendment.actualHash}; ` +
  `coherence ${coherenceAmendment.actualHash}; research-role ${researchRoleAmendment.actualHash}; recency-change-record ${recencyChangeRecord.actualHash}`
);