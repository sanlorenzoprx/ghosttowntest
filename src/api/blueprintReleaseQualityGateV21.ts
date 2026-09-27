import type { Env } from './env';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import type { GhostTownLaunchBlueprintV21, BlueprintGenerationEvidenceReceipt } from '../types/launchBlueprintV21';
import { currentCustomerAccessChannels, directCustomerAccessChannels, researchEvidenceRole } from './researchEvidenceRole';
import { RESEARCH_EVIDENCE_SUFFICIENCY_THRESHOLDS } from './researchEvidenceSufficiency';

export type BlueprintReleaseBlockerCategoryV21 = 'strategy' | 'research' | 'asset' | 'calendar' | 'delivery';
export type ResearchVerificationDimensionV21 =
  | 'customer_problem_definition'
  | 'competitor_alternative'
  | 'customer_access'
  | 'audience_reach'
  | 'ecosystem_partner'
  | 'prior_market_behavior';

export const BLUEPRINT_RELEASE_BLOCKER_CODES_V21 = {
  strategy: {
    noFirstCustomer: 'STRATEGY_NO_FIRST_CUSTOMER',
    noPrimaryProblem: 'STRATEGY_NO_PRIMARY_PROBLEM',
    noSelectedLane: 'STRATEGY_NO_SELECTED_LANE',
    noTestableOffer: 'STRATEGY_NO_TESTABLE_OFFER',
    noFirstMeaningfulCommitment: 'STRATEGY_NO_FIRST_MEANINGFUL_COMMITMENT',
    noInitialPrice: 'STRATEGY_NO_INITIAL_PRICE',
    noFirstRevenuePath: 'STRATEGY_NO_FIRST_REVENUE_PATH',
    firstRevenueUsesNonCustomerAccess: 'STRATEGY_FIRST_REVENUE_USES_NON_CUSTOMER_ACCESS',
    launchCardUsesNonCustomerAccess: 'STRATEGY_LAUNCH_CARD_USES_NON_CUSTOMER_ACCESS',
    noManualFulfillmentMethod: 'STRATEGY_NO_MANUAL_FULFILLMENT_METHOD',
    missingTimeOrCashBoundary: 'STRATEGY_MISSING_TIME_OR_CASH_BOUNDARY'
  },
  research: {
    fewerThanTwoConfirmedSeeds: 'RESEARCH_FEWER_THAN_TWO_CONFIRMED_SEEDS',
    requiredProviderAttemptsNotExecuted: 'RESEARCH_REQUIRED_PROVIDER_ATTEMPTS_NOT_EXECUTED',
    insufficientVerificationDimensions: 'RESEARCH_INSUFFICIENT_VERIFICATION_DIMENSIONS',
    fewerThanTenVerifiedCandidates: 'RESEARCH_FEWER_THAN_TEN_VERIFIED_CANDIDATES',
    fewerThanThreeCustomerAccessTargets: 'RESEARCH_FEWER_THAN_THREE_CUSTOMER_ACCESS_TARGETS',
    insufficientProblemLanguageEvidence: 'RESEARCH_INSUFFICIENT_PROBLEM_LANGUAGE_EVIDENCE',
    insufficientCompetitiveAlternativeEvidence: 'RESEARCH_INSUFFICIENT_COMPETITIVE_ALTERNATIVE_EVIDENCE',
    insufficientEvidenceRoleCoverage: 'RESEARCH_INSUFFICIENT_EVIDENCE_ROLE_COVERAGE',
    missingRecencyMetadata: 'RESEARCH_MISSING_EVIDENCE_RECENCY_METADATA',
    inconsistentCurrentActivityClaim: 'RESEARCH_INCONSISTENT_CURRENT_ACTIVITY_CLAIM',
    missingPublicSource: 'RESEARCH_MISSING_PUBLIC_SOURCE',
    missingResearchDate: 'RESEARCH_MISSING_RESEARCH_DATE',
    missingExecutionMetadata: 'RESEARCH_MISSING_CONFIDENCE_ACCESS_RISK_ASSET_SCRIPT_OR_FIRST_ACTION'
  },
  asset: {
    fewerThanFiveFinishedPosts: 'ASSET_FEWER_THAN_FIVE_FINISHED_POSTS',
    missingRequiredOutreachScripts: 'ASSET_MISSING_REQUIRED_OUTREACH_SCRIPTS',
    missingInterviewGuide: 'ASSET_MISSING_INTERVIEW_GUIDE',
    missingOfferConversationGuide: 'ASSET_MISSING_OFFER_CONVERSATION_GUIDE',
    missingFoundingCustomerPilotBrief: 'ASSET_MISSING_FOUNDING_CUSTOMER_PILOT_BRIEF',
    incompleteLandingPageCopy: 'ASSET_INCOMPLETE_LANDING_PAGE_COPY',
    incompleteLaunchSiteConfiguration: 'ASSET_INCOMPLETE_LAUNCH_SITE_CONFIGURATION'
  },
  calendar: {
    notExactlyThirtyActions: 'CALENDAR_NOT_EXACTLY_THIRTY_ACTIONS',
    missingDeliverable: 'CALENDAR_MISSING_DELIVERABLE',
    missingSuccessMeasure: 'CALENDAR_MISSING_SUCCESS_MEASURE',
    missingEvidenceRequirement: 'CALENDAR_MISSING_EVIDENCE_REQUIREMENT',
    missingBranchRule: 'CALENDAR_MISSING_BRANCH_RULE',
    workloadExceedsFounderLimits: 'CALENDAR_WORKLOAD_EXCEEDS_FOUNDER_LIMITS',
    commercialAskTooLate: 'CALENDAR_COMMERCIAL_ASK_TOO_LATE_FOR_SELECTED_LANE'
  },
  delivery: {
    d1PersistenceFailed: 'DELIVERY_D1_PERSISTENCE_FAILED',
    pdfPersistenceFailed: 'DELIVERY_PDF_PERSISTENCE_FAILED',
    jsonPersistenceFailed: 'DELIVERY_JSON_PERSISTENCE_FAILED',
    zipPersistenceFailed: 'DELIVERY_ZIP_PERSISTENCE_FAILED',
    artifactHashesMissing: 'DELIVERY_ARTIFACT_HASHES_MISSING',
    ownershipBoundaryNotEstablished: 'DELIVERY_OWNERSHIP_BOUNDARY_NOT_ESTABLISHED',
    repeatDownloadUnavailable: 'DELIVERY_REPEAT_DOWNLOAD_UNAVAILABLE'
  }
} as const;

type NestedValues<T> = T extends Record<string, infer V> ? V extends string ? V : NestedValues<V> : never;
export type BlueprintReleaseBlockerCodeV21 = NestedValues<typeof BLUEPRINT_RELEASE_BLOCKER_CODES_V21>;

export interface BlueprintReleaseBlockerV21 {
  category: BlueprintReleaseBlockerCategoryV21;
  code: BlueprintReleaseBlockerCodeV21;
  message: string;
  path: string;
}

export interface BlueprintDeliveryStateV21 {
  d1Persisted: boolean;
  pdfPersisted: boolean;
  jsonPersisted: boolean;
  zipPersisted: boolean;
  artifactHashesPresent: boolean;
  ownershipBoundaryEstablished: boolean;
  repeatDownloadAvailable: boolean;
}

export interface BlueprintReleaseGateInputV21 {
  blueprint: GhostTownLaunchBlueprintV21;
  research: CustomerAccessResearchResult;
  delivery?: BlueprintDeliveryStateV21;
}

export interface BlueprintReleaseQualityGateV21 {
  passed: boolean;
  blockers: BlueprintReleaseBlockerV21[];
}

const requiredRelationships = [
  'warm_contact',
  'former_colleague_or_customer',
  'community_member',
  'linkedin_connection',
  'association_member',
  'referral_partner',
  'interview_invitation',
  'offer_test_invitation',
  'follow_up_no_response',
  'follow_up_interest',
  'follow_up_rejection',
  'referral_request'
] as const;

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function publicHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function researchVerificationDimensionsV21(
  blueprint: GhostTownLaunchBlueprintV21,
  research: CustomerAccessResearchResult
): ResearchVerificationDimensionV21[] {
  const dimensions = new Set<ResearchVerificationDimensionV21>();
  const channels = blueprint.customerAccessPack.channels;
  const sourceIds = new Set(blueprint.sources.map(source => source.sourceId));
  const verifiedFacts = blueprint.startingStateAudit.verifiedFacts.filter(item => item.truthLabel === 'Verified');
  const hasCustomerDefinition = verifiedFacts.some(item => /target buyer/i.test(item.statement));
  const hasProblemDefinition = verifiedFacts.some(item => /problem supplied/i.test(item.statement));

  if (hasCustomerDefinition && hasProblemDefinition) dimensions.add('customer_problem_definition');

  const hasCompetitorEvidence = channels.some(channel =>
    researchEvidenceRole(channel) === 'market_evidence'
    || Boolean(channel.competitorEvidence?.length)
  );
  const hasAlternativeDefinition = verifiedFacts.some(item => /current workaround/i.test(item.statement));
  if (research.receipt.seedDomains.length >= 2 && (hasCompetitorEvidence || hasAlternativeDefinition)) {
    dimensions.add('competitor_alternative');
  }

  const sourcedCustomerAccessTargets = currentCustomerAccessChannels(channels).filter(channel =>
    publicHttps(channel.publicUrl)
    && channel.sourceIds.length > 0
    && channel.sourceIds.every(sourceId => sourceIds.has(sourceId))
    && hasText(channel.accessPath)
  );
  if (sourcedCustomerAccessTargets.length >= 3) dimensions.add('customer_access');

  if (channels.some(channel => researchEvidenceRole(channel) === 'media_pr')) {
    dimensions.add('audience_reach');
  }

  if (research.research.publicExpertsAndPartners.length > 0
    || channels.some(channel => researchEvidenceRole(channel) === 'partnership')) {
    dimensions.add('ecosystem_partner');
  }

  if ([...blueprint.startingStateAudit.priorSignals, ...blueprint.startingStateAudit.priorNoSignals]
    .some(item => item.truthLabel === 'Verified')) {
    dimensions.add('prior_market_behavior');
  }

  return [...dimensions];
}

function add(
  blockers: BlueprintReleaseBlockerV21[],
  category: BlueprintReleaseBlockerCategoryV21,
  code: BlueprintReleaseBlockerCodeV21,
  message: string,
  path: string,
  blocked: boolean
): void {
  if (blocked) blockers.push({ category, code, message, path });
}

function completeLandingPage(blueprint: GhostTownLaunchBlueprintV21): boolean {
  const copy = blueprint.landingPageCopy;
  return [
    copy.metadataTitle, copy.metadataDescription, copy.socialDescription, copy.targetCustomerCallout,
    copy.headline, copy.subheadline, copy.problemSection, copy.currentAlternativeSection,
    copy.offerDescription, copy.expectedTimeline, copy.pricePresentation, copy.riskReversal,
    copy.primaryCallToAction, copy.secondaryCallToAction, copy.thankYouPageCopy,
    copy.confirmationEmailSubject, copy.confirmationEmailBody
  ].every(hasText)
    && copy.deliverables.length > 0
    && copy.howItWorks.length > 0
    && copy.faq.length > 0;
}

function completeLaunchSite(blueprint: GhostTownLaunchBlueprintV21): boolean {
  const site = blueprint.launchSite;
  return site.schemaVersion === 'launch-site-config-v1'
    && [site.site.businessName, site.site.contactEmail, site.offer.offerName, site.offer.targetCustomer,
      site.offer.headline, site.offer.subheadline, site.offer.primaryOutcome, site.offer.price,
      site.offer.deliveryMethod, site.offer.timeToFirstValue, site.offer.callToAction,
      site.problem.summary, site.solution.summary, site.positioning.differentiator,
      site.riskReversal.text, site.leadCapture.destination, site.leadCapture.buttonLabel].every(hasText)
    && site.solution.deliverables.length > 0
    && site.faq.length > 0
    && Object.values(site.legal).every(Boolean);
}

function completeInterviewGuide(blueprint: GhostTownLaunchBlueprintV21): boolean {
  const guide = blueprint.customerInterviewGuide;
  return hasText(guide.opening)
    && guide.problemHistoryQuestions.length > 0
    && guide.lastOccurrenceQuestions.length > 0
    && guide.currentWorkaroundQuestions.length > 0
    && guide.costAndConsequenceQuestions.length > 0
    && guide.buyingProcessQuestions.length > 0
    && guide.existingSpendingQuestions.length > 0
    && guide.switchingFrictionQuestions.length > 0
    && guide.closingAndReferralQuestions.length > 0;
}

function completeOfferGuide(blueprint: GhostTownLaunchBlueprintV21): boolean {
  const guide = blueprint.offerConversationGuide;
  return [guide.opening, guide.offerExplanation, guide.pricePresentation, guide.commitmentRequest, guide.followUpAgreement].every(hasText)
    && guide.problemConfirmation.length > 0
    && guide.scopeConfirmation.length > 0
    && guide.objectionCapture.length > 0;
}

function completePilotBrief(blueprint: GhostTownLaunchBlueprintV21): boolean {
  const brief = blueprint.foundingCustomerPilotBrief;
  return [brief.problem, brief.scope, brief.timeline, brief.price, brief.proofBoundary, brief.nextStep].every(hasText)
    && brief.deliverables.length > 0
    && brief.buyerResponsibilities.length > 0;
}

export function evaluateBlueprintReleaseQualityGateV21(input: BlueprintReleaseGateInputV21): BlueprintReleaseQualityGateV21 {
  const { blueprint, research, delivery } = input;
  const blockers: BlueprintReleaseBlockerV21[] = [];
  const C = BLUEPRINT_RELEASE_BLOCKER_CODES_V21;

  add(blockers, 'strategy', C.strategy.noFirstCustomer, 'No first customer.', 'executiveDecision.recommendedInitialCustomer', !hasText(blueprint.executiveDecision.recommendedInitialCustomer) || !hasText(blueprint.firstRevenuePath.firstBuyer));
  add(blockers, 'strategy', C.strategy.noPrimaryProblem, 'No primary problem.', 'offer.painfulProblem', !hasText(blueprint.offer.painfulProblem));
  add(blockers, 'strategy', C.strategy.noSelectedLane, 'No selected lane.', 'businessModelLane.lane', !hasText(blueprint.businessModelLane.lane));
  add(blockers, 'strategy', C.strategy.noTestableOffer, 'No testable offer.', 'offer', !hasText(blueprint.offer.offerName) || !hasText(blueprint.offer.oneSentencePromise) || !hasText(blueprint.offer.targetCustomer) || blueprint.offer.deliverables.length === 0);
  add(blockers, 'strategy', C.strategy.noFirstMeaningfulCommitment, 'No first meaningful commitment.', 'firstRevenuePath.commitmentMethod', !hasText(blueprint.firstRevenuePath.commitmentMethod) || !hasText(blueprint.launchCard48Hour.firstCommitmentRequest));
  add(blockers, 'strategy', C.strategy.noInitialPrice, 'No initial price.', 'offer.initialTestPrice', !hasText(blueprint.offer.initialTestPrice) || !hasText(blueprint.firstRevenuePath.firstPrice));
  add(blockers, 'strategy', C.strategy.noFirstRevenuePath, 'No first-revenue path.', 'firstRevenuePath', !hasText(blueprint.firstRevenuePath.firstAsk) || !hasText(blueprint.firstRevenuePath.firstBuyer) || !hasText(blueprint.firstRevenuePath.firstChannel) || blueprint.firstRevenuePath.minimumQualifiedAsks < 1 || blueprint.firstRevenuePath.targetDay < 1 || !hasText(blueprint.firstRevenuePath.successThreshold));
  add(blockers, 'strategy', C.strategy.noManualFulfillmentMethod, 'No manual fulfillment method.', 'manualFulfillmentPlan', !hasText(blueprint.offer.deliveryMethod) || blueprint.manualFulfillmentPlan.onboardingSteps.length === 0 || blueprint.manualFulfillmentPlan.founderWork.length === 0 || !hasText(blueprint.manualFulfillmentPlan.successfulDeliveryDefinition));
  add(blockers, 'strategy', C.strategy.missingTimeOrCashBoundary, 'Missing time or cash boundary.', 'executiveDecision', blueprint.executiveDecision.founderTimeRiskHours <= 0 || blueprint.executiveDecision.founderCashRiskMaximum <= 0);

  const receipt = research.receipt;
  const seedCount = receipt.seedDomains.length;
  const verificationDimensions = researchVerificationDimensionsV21(blueprint, research);
  const sourceIds = new Set(blueprint.sources.map(source => source.sourceId));
  const channels = blueprint.customerAccessPack.channels;
  const roleEligibleCustomerAccess = directCustomerAccessChannels(channels);
  const customerAccess = currentCustomerAccessChannels(channels);
  const customerAccessLabels = new Set(customerAccess.map(channel => channel.community + ' via ' + channel.platform));
  const customerAccessIds = new Set(customerAccess.map(channel => channel.channelId));
  add(blockers, 'strategy', C.strategy.firstRevenueUsesNonCustomerAccess, 'First revenue channel is not a direct customer-access target.', 'firstRevenuePath.firstChannel', !customerAccessLabels.has(blueprint.firstRevenuePath.firstChannel));
  add(blockers, 'strategy', C.strategy.launchCardUsesNonCustomerAccess, '48-hour Launch Card approaches must all be direct customer-access targets.', 'launchCard48Hour.firstThreeApproaches', blueprint.launchCard48Hour.firstThreeApproaches.length !== 3 || blueprint.launchCard48Hour.firstThreeApproaches.some(approach => !customerAccessIds.has(approach.channelId)));

  const missingPublicSource = blueprint.sources.length === 0
    || blueprint.sources.some(source => !hasText(source.sourceId) || !publicHttps(source.url))
    || channels.some(channel => !publicHttps(channel.publicUrl) || channel.sourceIds.length === 0 || channel.sourceIds.some(sourceId => !sourceIds.has(sourceId)));
  const missingResearchDate = !hasText(research.research.researchDate) || !hasText(receipt.completedAt)
    || blueprint.sources.some(source => !hasText(source.accessedAt))
    || channels.some(channel => !hasText(channel.researchDate));
  const missingRecencyMetadata = channels.some(channel => !hasText(channel.evidenceRecency)
    || !hasText(channel.currentActivityStatus) || !hasText(channel.currentActivityEvidence))
    || blueprint.sources.some(source => !hasText(source.evidenceRecency));
  const inconsistentCurrentActivityClaim = channels.some(channel =>
    (channel.activity === 'recent' || channel.activity === 'active')
    && channel.currentActivityStatus !== 'verified_current'
  );
  const missingExecutionMetadata = channels.some(channel => !hasText(channel.confidence)
    || !hasText(channel.accessPath) || !hasText(channel.risk) || !hasText(channel.preparedAsset)
    || !hasText(channel.outreachScriptId) || !hasText(channel.firstAction));

  add(blockers, 'research', C.research.fewerThanTwoConfirmedSeeds, 'Fewer than two confirmed seeds.', 'research.receipt.seedDomains', seedCount < 2);
  add(blockers, 'research', C.research.requiredProviderAttemptsNotExecuted, 'Required provider attempts not executed.', 'research.receipt.attemptedSourceCount', receipt.attemptedSourceCount < expectedProviderAttempts);
  add(blockers, 'research', C.research.insufficientVerificationDimensions, 'Fewer than three independent idea-verification dimensions.', 'research.verificationDimensions', verificationDimensions.length < 3);
  add(blockers, 'research', C.research.fewerThanTenVerifiedCandidates, 'Fewer than ten verified candidates.', 'research.receipt.candidateChannelCount', receipt.candidateChannelCount < 10);
  add(blockers, 'research', C.research.fewerThanThreeCustomerAccessTargets, `Fewer than three currently verified direct customer-access targets. Found ${roleEligibleCustomerAccess.length} role-eligible targets but only ${customerAccess.length} with current activity verified.`, 'customerAccessPack.channels', customerAccess.length < 3);
  add(blockers, 'research', C.research.missingRecencyMetadata, 'Evidence recency and current-activity verification metadata must be explicit for every researched target and source.', 'customerAccessPack.channels', missingRecencyMetadata);
  add(blockers, 'research', C.research.inconsistentCurrentActivityClaim, 'A target cannot be labeled recent or active unless current activity was independently verified.', 'customerAccessPack.channels', inconsistentCurrentActivityClaim);
  add(blockers, 'research', C.research.missingPublicSource, 'Missing public source.', 'sources', missingPublicSource);
  add(blockers, 'research', C.research.missingResearchDate, 'Missing research date.', 'generationReceipt.researchDate', missingResearchDate);
  add(blockers, 'research', C.research.missingExecutionMetadata, 'Missing confidence, access path, risk, prepared asset, script, or first action.', 'customerAccessPack.channels', missingExecutionMetadata);

  const finishedPosts = blueprint.customerAccessPack.helpfulPosts.filter(post => hasText(post.title) && post.body.trim().length >= 180 && hasText(post.closingQuestion));
  const relationships = new Set(blueprint.customerAccessPack.outreachScripts.filter(script => hasText(script.message)).map(script => script.relationship));
  add(blockers, 'asset', C.asset.fewerThanFiveFinishedPosts, 'Fewer than five finished posts.', 'customerAccessPack.helpfulPosts', finishedPosts.length < 5);
  add(blockers, 'asset', C.asset.missingRequiredOutreachScripts, 'Missing required outreach scripts.', 'customerAccessPack.outreachScripts', requiredRelationships.some(relationship => !relationships.has(relationship)));
  add(blockers, 'asset', C.asset.missingInterviewGuide, 'Missing interview guide.', 'customerInterviewGuide', !completeInterviewGuide(blueprint));
  add(blockers, 'asset', C.asset.missingOfferConversationGuide, 'Missing offer-conversation guide.', 'offerConversationGuide', !completeOfferGuide(blueprint));
  add(blockers, 'asset', C.asset.missingFoundingCustomerPilotBrief, 'Missing Founding Customer Pilot Brief.', 'foundingCustomerPilotBrief', !completePilotBrief(blueprint));
  add(blockers, 'asset', C.asset.incompleteLandingPageCopy, 'Incomplete landing-page copy.', 'landingPageCopy', !completeLandingPage(blueprint));
  add(blockers, 'asset', C.asset.incompleteLaunchSiteConfiguration, 'Incomplete Launch Site configuration.', 'launchSite', !completeLaunchSite(blueprint));

  const totalCalendarMinutes = blueprint.dailyCalendar.reduce((sum, day) => sum + Math.max(0, day.estimatedMinutes || 0), 0);
  add(blockers, 'calendar', C.calendar.notExactlyThirtyActions, 'Not exactly thirty actions.', 'dailyCalendar', blueprint.dailyCalendar.length !== 30);
  add(blockers, 'calendar', C.calendar.missingDeliverable, 'Missing deliverable.', 'dailyCalendar.expectedDeliverable', blueprint.dailyCalendar.some(day => !hasText(day.expectedDeliverable)));
  add(blockers, 'calendar', C.calendar.missingSuccessMeasure, 'Missing success measure.', 'dailyCalendar.successMeasurement', blueprint.dailyCalendar.some(day => !hasText(day.successMeasurement)));
  add(blockers, 'calendar', C.calendar.missingEvidenceRequirement, 'Missing evidence requirement.', 'dailyCalendar.evidenceToRecord', blueprint.dailyCalendar.some(day => day.evidenceToRecord.length === 0));
  add(blockers, 'calendar', C.calendar.missingBranchRule, 'Missing branch rule.', 'dailyCalendar.ifThenBranches', blueprint.dailyCalendar.some(day => day.ifThenBranches.length === 0 || day.ifThenBranches.some(branch => !hasText(branch.condition) || !hasText(branch.action))));
  add(blockers, 'calendar', C.calendar.workloadExceedsFounderLimits, 'Workload exceeds founder limits.', 'dailyCalendar.estimatedMinutes', totalCalendarMinutes > blueprint.executiveDecision.founderTimeRiskHours * 60);
  add(blockers, 'calendar', C.calendar.commercialAskTooLate, 'Commercial ask occurs too late for the selected lane without justification.', 'firstRevenuePath.targetDay', blueprint.firstRevenuePath.targetDay > blueprint.businessModelLane.earliestCommercialAskDay);

  if (delivery) {
    add(blockers, 'delivery', C.delivery.d1PersistenceFailed, 'D1 persistence failed.', 'delivery.d1Persisted', !delivery.d1Persisted);
    add(blockers, 'delivery', C.delivery.pdfPersistenceFailed, 'PDF persistence failed.', 'delivery.pdfPersisted', !delivery.pdfPersisted);
    add(blockers, 'delivery', C.delivery.jsonPersistenceFailed, 'JSON persistence failed.', 'delivery.jsonPersisted', !delivery.jsonPersisted);
    add(blockers, 'delivery', C.delivery.zipPersistenceFailed, 'ZIP persistence failed.', 'delivery.zipPersisted', !delivery.zipPersisted);
    add(blockers, 'delivery', C.delivery.artifactHashesMissing, 'Artifact hashes missing.', 'delivery.artifactHashesPresent', !delivery.artifactHashesPresent);
    add(blockers, 'delivery', C.delivery.ownershipBoundaryNotEstablished, 'Ownership boundary not established.', 'delivery.ownershipBoundaryEstablished', !delivery.ownershipBoundaryEstablished);
    add(blockers, 'delivery', C.delivery.repeatDownloadUnavailable, 'Repeat download unavailable.', 'delivery.repeatDownloadAvailable', !delivery.repeatDownloadAvailable);
  }

  return { passed: blockers.length === 0, blockers };
}

export function assertBlueprintReleaseQualityGateV21(gate: BlueprintReleaseQualityGateV21): void {
  if (gate.passed) return;
  throw new Error('Launch Blueprint v2.1 Step 5 release gate failed: ' + gate.blockers.map(blocker => blocker.code + ': ' + blocker.message).join(' | '));
}

function validHash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

async function objectHash(object: R2ObjectBody | null): Promise<string> {
  if (!object) return '';
  return sha256Hex(new Uint8Array(await object.arrayBuffer()));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyBlueprintDeliveryStateV21(
  env: Env,
  blueprint: GhostTownLaunchBlueprintV21,
  receipt: BlueprintGenerationEvidenceReceipt
): Promise<BlueprintDeliveryStateV21> {
  const hashesPresent = validHash(receipt.hashes.canonicalBlueprintSha256)
    && validHash(receipt.hashes.pdfSha256)
    && validHash(receipt.hashes.zipSha256)
    && validHash(receipt.hashes.normalizedInputSha256);
  if (!env.DB || !env.BLUEPRINTS) {
    return {
      d1Persisted: false,
      pdfPersisted: false,
      jsonPersisted: false,
      zipPersisted: false,
      artifactHashesPresent: hashesPresent,
      ownershipBoundaryEstablished: false,
      repeatDownloadAvailable: false
    };
  }

  const row = await env.DB.prepare(
    'SELECT owner_id, blueprint_json, pdf_r2_key FROM launch_blueprints WHERE order_id = ?'
  ).bind(blueprint.orderId).first<{ owner_id: string; blueprint_json: string; pdf_r2_key: string }>().catch(() => null);

  const pdfFirst = await env.BLUEPRINTS.get(receipt.artifactKeys.pdf).catch(() => null);
  const jsonFirst = await env.BLUEPRINTS.get(receipt.artifactKeys.json).catch(() => null);
  const zipFirst = await env.BLUEPRINTS.get(receipt.artifactKeys.zip).catch(() => null);
  const [pdfHash, jsonHash, zipHash] = await Promise.all([
    objectHash(pdfFirst).catch(() => ''),
    objectHash(jsonFirst).catch(() => ''),
    objectHash(zipFirst).catch(() => '')
  ]);
  const [pdfSecond, jsonSecond, zipSecond] = await Promise.all([
    env.BLUEPRINTS.get(receipt.artifactKeys.pdf).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.json).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.zip).catch(() => null)
  ]);
  const storedJson = jsonFirst ? await jsonFirst.text().catch(() => '') : '';
  const owner = blueprint.ownerId.trim().toLowerCase();

  return {
    d1Persisted: Boolean(row?.blueprint_json && row.pdf_r2_key === receipt.artifactKeys.pdf),
    pdfPersisted: Boolean(pdfFirst && pdfHash === receipt.hashes.pdfSha256),
    jsonPersisted: Boolean(jsonFirst && row?.blueprint_json && storedJson === row.blueprint_json && jsonHash === receipt.hashes.canonicalBlueprintSha256),
    zipPersisted: Boolean(zipFirst && zipHash === receipt.hashes.zipSha256),
    artifactHashesPresent: hashesPresent,
    ownershipBoundaryEstablished: Boolean(owner && row?.owner_id?.trim().toLowerCase() === owner),
    repeatDownloadAvailable: Boolean(pdfSecond && jsonSecond && zipSecond)
  };
}
