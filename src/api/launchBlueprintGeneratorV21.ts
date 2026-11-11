import { blueprintLanguages } from '../lib/blueprintLanguage';
import {
  BLUEPRINT_GENERATOR_BUYER_COPY,
  BLUEPRINT_GENERATOR_FOUNDER_COPY,
  type BlueprintGeneratorBuyerCopy,
  type BlueprintGeneratorFounderCopy
} from '../lib/blueprintFixedCopy';
import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { PaidTestOrder, TruthLabel } from '../types/paidTest';
import type {
  AdaptiveCheckpoint,
  BlueprintDailyActionV21,
  BlueprintEvidenceStatement,
  BusinessModelExecutionLane,
  BusinessModelLane,
  CustomerInterviewGuide,
  EvidenceHierarchy,
  FirstRevenuePath,
  FoundingCustomerPilotBrief,
  GhostTownLaunchBlueprintV21,
  LaunchCard48Hour,
  ManualFulfillmentPlan,
  OfferConversationGuide,
  StartingStateAudit
} from '../types/launchBlueprintV21';
import {
  createGhostTownLaunchBlueprint,
  validateGhostTownLaunchBlueprint,
  type CustomerAccessResearchInput
} from './launchBlueprintGenerator';
import { synchronizeDailyExecutionPackets, validateDailyExecutionPackets } from './launchBlueprintDailyExecution';
import { currentCustomerAccessChannels } from './researchEvidenceRole';

export const CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1 = '616c691e6b4c9cea93615963a07375d13ffba57f' as const;

function clean(value: string | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() || '';
}

function evidence(
  value: string,
  truthLabel: TruthLabel,
  source: BlueprintEvidenceStatement['source']
): BlueprintEvidenceStatement {
  return { statement: value, truthLabel, source };
}

function supplied(value: string | undefined, missing: string): BlueprintEvidenceStatement {
  const normalized = clean(value);
  return normalized
    ? evidence(normalized, 'Verified', 'customer_input')
    : evidence(missing, 'Test', 'missing_input');
}

function classifyLane(order: PaidTestOrder, verdict: EvaluationResult): BusinessModelExecutionLane {
  const text = [
    verdict.deterministicScores.businessDnaType,
    verdict.idea.ideaName,
    verdict.idea.description,
    verdict.idea.targetUser,
    verdict.idea.painfulProblem,
    order.intake.currentStage,
    order.intake.offerHypothesis
  ].map(value => clean(value)).join(' ').toLowerCase();

  // Prefer explicit commercial/product mechanics over media or acquisition descriptors.
  // A hybrid concept such as "newsletter + backend SaaS" must execute in the SaaS lane;
  // creator/media remains the fallback only when no more specific business model is present.
  if (/marketplace|directory|match buyers|match customers|connect .* providers/.test(text)) return 'marketplace';
  if (/contractor|repair|installation|local service|home service|clinic|appointment|reservation/.test(text)) return 'local_business';
  if (/software|saas|app|platform|dashboard|automation|workflow tool/.test(text)) return 'saas';
  if (/course|template|guide|download|digital product|playbook|workshop/.test(text)) return 'digital_product';
  if (/physical product|device|kit|shipment|delivery|inventory|subscription box|monthly box/.test(text)) return 'physical_product';
  if (/creator|media|newsletter|podcast|youtube|sponsor|audience/.test(text)) return 'creator_or_media';
  return 'service_or_consulting';
}

function laneConfig(lane: BusinessModelExecutionLane, f: BlueprintGeneratorFounderCopy): Omit<BusinessModelLane, 'lane'> {
  const copy = f.lanes[lane];
  return {
    rationale: copy.rationale,
    firstMeaningfulTest: copy.firstMeaningfulTest,
    earliestCommercialAskDay: EARLIEST_COMMERCIAL_ASK_DAY[lane],
    intentionallyDeferred: [...copy.intentionallyDeferred]
  };
}

const EARLIEST_COMMERCIAL_ASK_DAY: Record<BusinessModelExecutionLane, number> = {
  service_or_consulting: 8,
  saas: 10,
  digital_product: 8,
  physical_product: 12,
  marketplace: 10,
  local_business: 7,
  creator_or_media: 10
};

function startingStateAudit(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  lane: BusinessModelExecutionLane,
  f: BlueprintGeneratorFounderCopy
): StartingStateAudit {
  const a = f.audit;
  const notes = clean(order.intake.customerNotes);
  const landingPage = clean(order.intake.landingPageLink);
  const price = clean(order.intake.expectedPrice);
  const signals = order.intake.researchSignals;
  const audienceSignals = [signals?.audience?.value, signals?.ecosystem?.value]
    .filter((value): value is string => Boolean(value));
  const targetBuyer = clean(order.intake.targetBuyer) || clean(verdict.verdictDecisionV2?.customer.initialCustomer) || clean(verdict.idea.targetUser) || 'not supplied';
  const problem = clean(order.intake.problem) || clean(verdict.idea.painfulProblem) || 'not supplied';
  const workaround = clean(order.intake.currentWorkaround) || clean(verdict.idea.currentAlternative) || 'not supplied';
  const laneLabel = f.laneLabel[lane];

  // These three statements stay in English in every language: the Step 5
  // release gate (blueprintReleaseQualityGateV21) recognises them by phrase.
  const verifiedFacts = [
    evidence(`Target buyer supplied by the founder: ${targetBuyer}.`, 'Verified', 'customer_input'),
    evidence(`Problem supplied by the founder: ${problem}.`, 'Verified', 'customer_input'),
    evidence(`Current workaround supplied by the founder: ${workaround}.`, 'Verified', 'customer_input')
  ];
  if (price) verifiedFacts.push(evidence(a.priceHypothesis(price), 'Verified', 'customer_input'));
  if (landingPage) verifiedFacts.push(evidence(a.landingPageFact(landingPage), 'Verified', 'customer_input'));

  return {
    currentStage: supplied(order.intake.currentStage, a.currentStageMissing),
    existingOffer: supplied(order.intake.offerHypothesis, a.existingOfferMissing),
    existingLandingPage: landingPage
      ? evidence(landingPage, 'Verified', 'customer_input')
      : evidence(a.noLandingPage, 'Verified', 'customer_input'),
    previousOutreach: notes
      ? evidence(a.customerNotes(notes), 'Verified', 'customer_input')
      : evidence(a.previousOutreachMissing, 'Test', 'missing_input'),
    existingCustomersAudienceOrPartners: audienceSignals.length
      ? evidence(a.audienceIdentified(audienceSignals.join(', ')), 'Verified', 'customer_input')
      : evidence(a.audienceMissing, 'Test', 'missing_input'),
    existingSkillsAndAssets: [
      supplied(order.intake.offerHypothesis, a.noOfferAsset),
      landingPage
        ? evidence(a.landingAsset(landingPage), 'Verified', 'customer_input')
        : evidence(a.noLandingAsset, 'Test', 'missing_input'),
      order.intake.competitorSeeds?.length
        ? evidence(a.seedDomains(order.intake.competitorSeeds.length), 'Verified', 'customer_input')
        : evidence(a.seedDomainsMissing, 'Test', 'missing_input')
    ],
    founderConstraints: {
      hoursPerWeek: evidence(a.hoursMissing, 'Test', 'missing_input'),
      testBudget: evidence(a.budgetMissing, 'Test', 'missing_input'),
      geography: supplied(order.intake.geography, a.geographyMissing),
      language: order.intake.founderLanguage || order.intake.buyerLanguage
        ? evidence(a.languageStatement(blueprintLanguages(order.intake), true), 'Verified', 'customer_input')
        : evidence(a.languageStatement(blueprintLanguages(order.intake), false), 'Test', 'missing_input'),
      technicalCapability: evidence(a.technicalMissing, 'Test', 'missing_input')
    },
    manualFulfillmentReadiness: evidence(
      a.manualReadiness(laneLabel),
      'Inferred',
      'system_inference'
    ),
    priorSignals: notes
      ? [evidence(a.priorSignals, 'Inferred', 'system_inference')]
      : [],
    priorNoSignals: notes
      ? [evidence(a.priorNoSignals, 'Inferred', 'system_inference')]
      : [],
    verifiedFacts,
    inferences: [
      evidence(a.recommendsCustomer(targetBuyer), 'Inferred', 'ghosttown_verdict'),
      evidence(a.recommendedLane(laneLabel), 'Inferred', 'system_inference'),
      evidence(clean(verdict.verdictDecisionV2?.confidence.rationale) || clean(verdict.deterministicScores.oneSentenceAdvice), 'Inferred', 'ghosttown_verdict')
    ].filter(item => item.statement),
    criticalTests: a.criticalTests.map(test => ({ ...test }))
  };
}

function evidenceHierarchy(f: BlueprintGeneratorFounderCopy): EvidenceHierarchy {
  const h = f.evidenceHierarchy;
  return {
    strong: [...h.strong],
    moderate: [...h.moderate],
    early: [...h.early],
    weak: [...h.weak],
    rankingRule: h.rankingRule
  };
}

function firstRevenuePath(
  base: GhostTownLaunchBlueprint,
  lane: BusinessModelLane,
  f: BlueprintGeneratorFounderCopy,
  b: BlueprintGeneratorBuyerCopy
): FirstRevenuePath {
  const channel = currentCustomerAccessChannels(base.customerAccessPack.channels)[0];
  const script = base.customerAccessPack.outreachScripts.find(item => item.relationship === 'offer_test_invitation');
  return {
    firstOfferFormat: lane.firstMeaningfulTest,
    firstBuyer: base.executiveDecision.recommendedInitialCustomer,
    // `community via platform` is a machine key: the release gate matches it.
    firstChannel: channel ? `${channel.community} via ${channel.platform}` : f.revenue.firstChannelFallback,
    firstAsk: script?.message || b.firstAskFallback(base.offer.offerName, base.offer.initialTestPrice),
    firstPrice: base.offer.initialTestPrice,
    requiredProof: [...f.revenue.requiredProof],
    commitmentMethod: f.revenue.commitmentMethod,
    targetDay: lane.earliestCommercialAskDay,
    minimumQualifiedAsks: 5,
    followUpSequence: [...f.revenue.followUpSequence],
    successThreshold: f.revenue.successThreshold
  };
}

function fulfillmentPlan(base: GhostTownLaunchBlueprint, lane: BusinessModelExecutionLane, f: BlueprintGeneratorFounderCopy): ManualFulfillmentPlan {
  const capacity = lane === 'physical_product' || lane === 'local_business' ? 1 : lane === 'digital_product' ? 3 : 2;
  const copy = f.fulfillment;
  return {
    onboardingSteps: [...copy.onboardingSteps],
    customerInputs: base.offer.buyerResponsibilities,
    founderWork: base.offer.deliverables.map(item => `${item.name}: ${item.description}`),
    expectedDeliveryTime: base.offer.timeToFirstUsefulResult,
    toolsRequired: [...copy.toolsRequired],
    customerCommunicationPoints: [...copy.customerCommunicationPoints],
    successfulDeliveryDefinition: copy.successfulDeliveryDefinition,
    qualityChecklist: [...copy.qualityChecklist],
    capacityPerWeek: capacity,
    estimatedVariableCost: copy.estimatedVariableCost,
    estimatedFounderHours: lane === 'physical_product' || lane === 'local_business' ? copy.founderHoursHeavy : copy.founderHoursLight,
    grossMarginGuardrail: copy.grossMarginGuardrail,
    intentionallyManual: [...copy.intentionallyManual]
  };
}

function checkpoints(f: BlueprintGeneratorFounderCopy): AdaptiveCheckpoint[] {
  return f.checkpoints.map(checkpoint => ({
    ...checkpoint,
    questions: [...checkpoint.questions],
    evidenceRequired: [...checkpoint.evidenceRequired],
    branches: checkpoint.branches.map(branch => ({ ...branch }))
  }));
}

function dailyCalendar(base: GhostTownLaunchBlueprint, f: BlueprintGeneratorFounderCopy): BlueprintDailyActionV21[] {
  const checkpointSet = checkpoints(f);
  return base.dailyCalendar.map(day => ({
    ...day,
    whyItMatters: day.primaryObjective,
    estimatedMinutes: day.estimatedEffort === 'light' ? 30 : day.estimatedEffort === 'moderate' ? 60 : 90,
    ifThenBranches: checkpointSet.find(item => item.dayNumber === day.dayNumber)?.branches || f.defaultBranches.map(branch => ({ ...branch }))
  }));
}

function interviewGuide(base: GhostTownLaunchBlueprint, b: BlueprintGeneratorBuyerCopy): CustomerInterviewGuide {
  return b.interviewGuide(base.offer.painfulProblem);
}

function offerGuide(base: GhostTownLaunchBlueprint, f: BlueprintGeneratorFounderCopy, b: BlueprintGeneratorBuyerCopy): OfferConversationGuide {
  return {
    opening: f.offerGuide.opening(base.offer.initialTestPrice),
    problemConfirmation: [...f.offerGuide.problemConfirmation],
    offerExplanation: b.offerExplanation(base.offer.oneSentencePromise),
    scopeConfirmation: [...base.offer.deliverables.map(item => item.name), ...base.offer.exclusions.map(item => b.notIncluded(item))],
    pricePresentation: b.pricePresentation(base.offer.initialTestPrice),
    objectionCapture: [...f.offerGuide.objectionCapture],
    commitmentRequest: b.commitmentRequest,
    followUpAgreement: f.offerGuide.followUpAgreement
  };
}

function pilotBrief(base: GhostTownLaunchBlueprint, b: BlueprintGeneratorBuyerCopy): FoundingCustomerPilotBrief {
  return {
    problem: base.offer.painfulProblem,
    scope: base.offer.deliveryMethod,
    deliverables: base.offer.deliverables.map(item => `${item.name}: ${item.description}`),
    timeline: base.offer.timeToFirstUsefulResult,
    price: base.offer.initialTestPrice,
    buyerResponsibilities: base.offer.buyerResponsibilities,
    proofBoundary: b.proofBoundary,
    nextStep: base.landingPageCopy.primaryCallToAction
  };
}

export function validateGhostTownLaunchBlueprintV21(
  blueprint: GhostTownLaunchBlueprintV21
): GhostTownLaunchBlueprintV21['qualityGate'] {
  const baseGate = validateGhostTownLaunchBlueprint({ ...blueprint, blueprintVersion: '2.0' } as GhostTownLaunchBlueprint);
  const failures = [...baseGate.failures];
  const warnings = [...baseGate.warnings];

  if (blueprint.blueprintVersion !== '2.1') failures.push('Executable Blueprint version must be 2.1.');
  if (blueprint.contractVersion !== '2.1.1') failures.push('Canonical Blueprint contract version must be 2.1.1.');
  if (blueprint.generationReceipt.canonicalContract.gitBlobSha1 !== CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1) failures.push('Canonical Blueprint hash does not match the approved v2.1 source.');
  if (blueprint.startingStateAudit.criticalTests.length < 1 || blueprint.startingStateAudit.criticalTests.length > 5) failures.push('Starting-state audit must identify between one and five critical tests.');
  if (!blueprint.businessModelLane.firstMeaningfulTest) failures.push('Business-model execution lane is missing its first meaningful test.');
  if (!blueprint.firstRevenuePath.firstAsk || blueprint.firstRevenuePath.minimumQualifiedAsks < 1) failures.push('First-revenue path is incomplete.');
  if (!blueprint.manualFulfillmentPlan.qualityChecklist.length || !blueprint.manualFulfillmentPlan.grossMarginGuardrail) failures.push('Manual fulfillment and economics guardrail are incomplete.');
  if (blueprint.launchCard48Hour.firstThreeApproaches.length !== 3) failures.push('48-hour Launch Card must include exactly three first approaches.');
  if (!blueprint.launchCard48Hour.exactFirstMessage || !blueprint.launchCard48Hour.firstCommitmentRequest) failures.push('48-hour Launch Card is missing the first message or commitment request.');
  if (!blueprint.evidenceHierarchy.strong.length || !blueprint.evidenceHierarchy.weak.length) failures.push('Behavioral evidence hierarchy is incomplete.');
  if (blueprint.adaptiveCheckpoints.map(item => item.dayNumber).join(',') !== '7,14,21,30') failures.push('Adaptive checkpoints must exist at Days 7, 14, 21, and 30.');
  if (blueprint.adaptiveCheckpoints.some(item => !item.questions.length || !item.branches.length || !item.evidenceRequired.length)) failures.push('Every adaptive checkpoint must include questions, evidence, and branches.');
  if (blueprint.dailyCalendar.some(day => !day.whyItMatters || day.estimatedMinutes <= 0 || !day.ifThenBranches.length)) failures.push('Every v2.1 daily action must include why it matters, time, and an if-then branch.');
  failures.push(...validateDailyExecutionPackets(blueprint));
  if (!blueprint.customerInterviewGuide.lastOccurrenceQuestions.length || !blueprint.offerConversationGuide.commitmentRequest) failures.push('Interview or offer-conversation guide is incomplete.');
  if (!blueprint.foundingCustomerPilotBrief.deliverables.length || !blueprint.foundingCustomerPilotBrief.proofBoundary) failures.push('Founding Customer Pilot Brief is incomplete.');
  if (blueprint.startingStateAudit.founderConstraints.hoursPerWeek.source === 'missing_input') warnings.push('Founder hours per week remain unconfirmed.');
  if (blueprint.startingStateAudit.founderConstraints.testBudget.source === 'missing_input') warnings.push('Founder test budget remains unconfirmed.');

  return { passed: failures.length === 0, failures: [...new Set(failures)], warnings: [...new Set(warnings)] };
}

export function upgradeGhostTownLaunchBlueprintToV21(
  base: GhostTownLaunchBlueprint,
  order: PaidTestOrder,
  verdict: EvaluationResult
): GhostTownLaunchBlueprintV21 {
  const lane = classifyLane(order, verdict);
  // Languages are recorded only when the order supplied them, so Blueprints
  // for orders without language fields stay byte-identical.
  const languagesSupplied = Boolean(order.intake.founderLanguage || order.intake.buyerLanguage);
  const languages = blueprintLanguages(order.intake);
  const f = BLUEPRINT_GENERATOR_FOUNDER_COPY[languages.founder];
  const b = BLUEPRINT_GENERATOR_BUYER_COPY[languages.buyer];
  const businessModelLane: BusinessModelLane = { lane, ...laneConfig(lane, f) };
  const revenue = firstRevenuePath(base, businessModelLane, f, b);
  const approaches = currentCustomerAccessChannels(base.customerAccessPack.channels).slice(0, 3).map(channel => ({
    name: channel.community,
    channelId: channel.channelId,
    publicUrl: channel.publicUrl,
    firstAction: channel.firstAction
  }));
  const launchCard: LaunchCard48Hour = {
    firstCustomer: base.executiveDecision.recommendedInitialCustomer,
    firstOffer: f.launchCardFirstOffer(base.offer.offerName, base.offer.initialTestPrice),
    firstThreeApproaches: approaches,
    exactFirstMessage: revenue.firstAsk,
    firstCommitmentRequest: revenue.commitmentMethod,
    launchSitePreviewReady: Boolean(base.launchSite.offer.headline && base.launchSite.leadCapture.destination),
    completionDeadlineHours: 48
  };

  const upgraded = {
    ...base,
    blueprintVersion: '2.1' as const,
    contractVersion: '2.1.1' as const,
    ...(languagesSupplied ? { languages } : {}),
    startingStateAudit: startingStateAudit(order, verdict, lane, f),
    businessModelLane,
    firstRevenuePath: revenue,
    manualFulfillmentPlan: fulfillmentPlan(base, lane, f),
    launchCard48Hour: launchCard,
    evidenceHierarchy: evidenceHierarchy(f),
    adaptiveCheckpoints: checkpoints(f),
    customerInterviewGuide: interviewGuide(base, b),
    offerConversationGuide: offerGuide(base, f, b),
    foundingCustomerPilotBrief: pilotBrief(base, b),
    dailyCalendar: dailyCalendar(base, f),
    generationReceipt: {
      ...base.generationReceipt,
      canonicalContract: {
        version: '2.1.1' as const,
        gitBlobSha1: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
        sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md' as const,
        changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md' as const,
        evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json' as const,
        verifiedAt: base.generationReceipt.generatedAt
      }
    },
    qualityGate: { passed: false, failures: [], warnings: [] }
  } as GhostTownLaunchBlueprintV21;
  const synchronized = synchronizeDailyExecutionPackets(upgraded, verdict);
  synchronized.qualityGate = validateGhostTownLaunchBlueprintV21(synchronized);
  synchronized.status = synchronized.qualityGate.passed ? 'ready' : 'failed_quality_gate';
  return synchronized;
}

export function createGhostTownLaunchBlueprintV21(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  research: CustomerAccessResearchInput,
  generatedAt = order.paidAt || order.updatedAt || order.createdAt
): GhostTownLaunchBlueprintV21 {
  hydrateEvaluationResultDecisionV2(verdict);
  return upgradeGhostTownLaunchBlueprintToV21(
    createGhostTownLaunchBlueprint(order, verdict, research, generatedAt),
    order,
    verdict
  );
}
