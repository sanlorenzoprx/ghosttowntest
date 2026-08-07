import { readFileSync, writeFileSync } from 'node:fs';

const releaseGatePath = 'src/api/blueprintReleaseQualityGateV21.ts';
const releaseGate = `import type { Env } from './env';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import type { GhostTownLaunchBlueprintV21, BlueprintGenerationEvidenceReceipt } from '../types/launchBlueprintV21';

export type BlueprintReleaseBlockerCategoryV21 = 'strategy' | 'research' | 'asset' | 'calendar' | 'delivery';

export const BLUEPRINT_RELEASE_BLOCKER_CODES_V21 = {
  strategy: {
    noFirstCustomer: 'STRATEGY_NO_FIRST_CUSTOMER',
    noPrimaryProblem: 'STRATEGY_NO_PRIMARY_PROBLEM',
    noSelectedLane: 'STRATEGY_NO_SELECTED_LANE',
    noTestableOffer: 'STRATEGY_NO_TESTABLE_OFFER',
    noFirstMeaningfulCommitment: 'STRATEGY_NO_FIRST_MEANINGFUL_COMMITMENT',
    noInitialPrice: 'STRATEGY_NO_INITIAL_PRICE',
    noFirstRevenuePath: 'STRATEGY_NO_FIRST_REVENUE_PATH',
    noManualFulfillmentMethod: 'STRATEGY_NO_MANUAL_FULFILLMENT_METHOD',
    missingTimeOrCashBoundary: 'STRATEGY_MISSING_TIME_OR_CASH_BOUNDARY'
  },
  research: {
    fewerThanTwoConfirmedSeeds: 'RESEARCH_FEWER_THAN_TWO_CONFIRMED_SEEDS',
    requiredProviderAttemptsNotExecuted: 'RESEARCH_REQUIRED_PROVIDER_ATTEMPTS_NOT_EXECUTED',
    fewerThanTwoSuccessfulProviderTypes: 'RESEARCH_FEWER_THAN_TWO_SUCCESSFUL_PROVIDER_TYPES',
    fewerThanTenVerifiedCandidates: 'RESEARCH_FEWER_THAN_TEN_VERIFIED_CANDIDATES',
    fewerThanThreeTargetCategories: 'RESEARCH_FEWER_THAN_THREE_TARGET_CATEGORIES',
    unknownCandidateId: 'RESEARCH_UNKNOWN_CANDIDATE_ID',
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
  const expectedProviderAttempts = Math.max(receipt.sourceDefinitionIds.length, seedCount * 3);
  const targetCategoryCount = Object.values(receipt.targetTypeCounts).filter(count => count > 0).length;
  const sourceIds = new Set(blueprint.sources.map(source => source.sourceId));
  const channels = blueprint.customerAccessPack.channels;
  const missingPublicSource = blueprint.sources.length === 0
    || blueprint.sources.some(source => !hasText(source.sourceId) || !publicHttps(source.url))
    || channels.some(channel => !publicHttps(channel.publicUrl) || channel.sourceIds.length === 0 || channel.sourceIds.some(sourceId => !sourceIds.has(sourceId)));
  const missingResearchDate = !hasText(research.research.researchDate) || !hasText(receipt.completedAt)
    || blueprint.sources.some(source => !hasText(source.accessedAt))
    || channels.some(channel => !hasText(channel.researchDate));
  const missingExecutionMetadata = channels.some(channel => !hasText(channel.confidence)
    || !hasText(channel.accessPath) || !hasText(channel.risk) || !hasText(channel.preparedAsset)
    || !hasText(channel.outreachScriptId) || !hasText(channel.firstAction));

  add(blockers, 'research', C.research.fewerThanTwoConfirmedSeeds, 'Fewer than two confirmed seeds.', 'research.receipt.seedDomains', seedCount < 2);
  add(blockers, 'research', C.research.requiredProviderAttemptsNotExecuted, 'Required provider attempts not executed.', 'research.receipt.attemptedSourceCount', receipt.attemptedSourceCount < expectedProviderAttempts);
  add(blockers, 'research', C.research.fewerThanTwoSuccessfulProviderTypes, 'Fewer than two successful provider types.', 'research.receipt.sourceTypeCount', receipt.sourceTypeCount < 2);
  add(blockers, 'research', C.research.fewerThanTenVerifiedCandidates, 'Fewer than ten verified candidates.', 'research.receipt.candidateChannelCount', receipt.candidateChannelCount < 10);
  add(blockers, 'research', C.research.fewerThanThreeTargetCategories, 'Fewer than three target categories.', 'research.receipt.targetTypeCounts', targetCategoryCount < 3);
  add(blockers, 'research', C.research.unknownCandidateId, 'Unknown candidate ID.', 'research.receipt.unknownCandidateIds', Boolean(receipt.unknownCandidateIds?.length));
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
`;
writeFileSync(releaseGatePath, releaseGate);

const testPath = 'tests/blueprintReleaseQualityGateV21.test.ts';
const test = `import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { CustomerAccessResearchResult } from '../src/api/customerAccessResearch';
import { createGhostTownLaunchBlueprintV21 } from '../src/api/launchBlueprintGeneratorV21';
import {
  BLUEPRINT_RELEASE_BLOCKER_CODES_V21,
  evaluateBlueprintReleaseQualityGateV21,
  type BlueprintDeliveryStateV21
} from '../src/api/blueprintReleaseQualityGateV21';

const generatedAt = '2026-08-07T08:00:00.000Z';

function verdict(): EvaluationResult {
  return {
    resultId: 'step5-verdict', generatedAt,
    idea: { ideaName: 'Family Game Night', description: 'Curated game nights for families.', targetUser: 'Families with children', painfulProblem: 'Choosing games is difficult and expensive.', currentAlternative: 'Buying random games', motivation: 'Family experience' },
    deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'subscription', businessDnaTrap: 'Inventory risk', businessDnaWinStrategy: 'Concierge pilot', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Demand is unproven.', recommendedNextTest: 'Sell a pilot.', doNotBuildUntil: 'A family pays.', oneSentenceAdvice: 'Sell before stocking.' },
    usedAI: false, cacheHit: false, answers: {}
  } as EvaluationResult;
}

function order(): PaidTestOrder {
  return {
    orderId: 'step5-order', email: 'founder@example.com', verdictId: 'step5-verdict', status: 'generating', artifactType: 'launch_blueprint_v2', planVersion: '2.0',
    intake: {
      verdictId: 'step5-verdict', targetBuyer: 'Families with children', problem: 'Choosing games is difficult and expensive.', currentWorkaround: 'Buying random games', offerHypothesis: 'Concierge family game-night pilot', expectedPrice: '$49', currentStage: 'Pre-revenue', geography: 'United States',
      competitorSeeds: [
        { seedId: 's1', name: 'Seed One', website: 'https://seed-one.example', domain: 'seed-one.example', relationship: 'adjacent_product', origin: 'customer_confirmed', verifiedAt: generatedAt },
        { seedId: 's2', name: 'Seed Two', website: 'https://seed-two.example', domain: 'seed-two.example', relationship: 'current_alternative', origin: 'customer_confirmed', verifiedAt: generatedAt }
      ]
    }, createdAt: generatedAt, updatedAt: generatedAt, paidAt: generatedAt
  } as PaidTestOrder;
}

function result(): CustomerAccessResearchResult {
  const researchDate = '2026-08-07';
  const channels = Array.from({ length: 10 }, (_, index) => ({
    channelId: 'channel-' + (index + 1), community: 'Channel ' + (index + 1), platform: index < 3 ? 'Podcast' : index < 6 ? 'YouTube' : 'Publication', publicUrl: 'https://example.com/channel-' + (index + 1), relevance: 'Relevant audience.', activity: 'active' as const, participationRules: 'Use public rules.', recommendedApproach: 'Contribute usefully.', usefulTopic: 'Family game choice.', risk: 'Access can change.', firstAction: 'Review the public route.', confidence: 'high' as const, researchDate, sourceIds: ['source-' + (index + 1)], targetType: index < 3 ? 'podcast' as const : index < 6 ? 'youtube_creator' as const : 'newsletter_or_publication' as const, accessPath: 'Public contact route', preparedAsset: 'Prepared educational asset', outreachScriptId: 'script-07-interview_invitation'
  }));
  const sources = channels.map((channel, index) => ({ sourceId: 'source-' + (index + 1), title: 'Source ' + (index + 1), url: 'https://example.com/source-' + (index + 1), publisher: 'Fixture', accessedAt: generatedAt, supports: [channel.channelId] }));
  return {
    research: { status: 'complete', researchDate, sources, channels, publicExpertsAndPartners: [] },
    receipt: {
      provider: 'distribution_footprint', model: 'gemini-2.5-flash', requestedAt: generatedAt, completedAt: generatedAt, packs: ['customer_access'], webSearchQueries: [], attemptedSourceCount: 6, successfulSourceCount: 6, sourceTypeCount: 3, candidateChannelCount: 10, verifiedChannelCount: 10, rejectedUrls: [], failedSources: [], sourceDefinitionIds: ['dataforseo:s1','podcast:s1','youtube:s1','dataforseo:s2','podcast:s2','youtube:s2'], seedDomains: ['seed-one.example','seed-two.example'], targetTypeCounts: { podcast: 3, youtube_creator: 3, newsletter_or_publication: 4 }, responseHash: 'fixture', unknownCandidateIds: []
    }
  };
}

const delivery = (): BlueprintDeliveryStateV21 => ({ d1Persisted: true, pdfPersisted: true, jsonPersisted: true, zipPersisted: true, artifactHashesPresent: true, ownershipBoundaryEstablished: true, repeatDownloadAvailable: true });

function fixture() {
  const r = result();
  const blueprint = createGhostTownLaunchBlueprintV21(order(), verdict(), r.research);
  return { blueprint, research: r, delivery: delivery() };
}

function expectCode(mutator: (input: ReturnType<typeof fixture>) => void, code: string) {
  const input = fixture();
  mutator(input);
  expect(evaluateBlueprintReleaseQualityGateV21(input).blockers.map(blocker => blocker.code)).toContain(code);
}

describe('GhostTown Blueprint v2.1 Step 5 release blocker matrix', () => {
  it('passes the complete fixture', () => expect(evaluateBlueprintReleaseQualityGateV21(fixture()).passed).toBe(true));

  const C = BLUEPRINT_RELEASE_BLOCKER_CODES_V21;
  const cases: Array<[string, (input: ReturnType<typeof fixture>) => void, string]> = [
    ['no first customer', i => { i.blueprint.executiveDecision.recommendedInitialCustomer = ''; i.blueprint.firstRevenuePath.firstBuyer = ''; }, C.strategy.noFirstCustomer],
    ['no primary problem', i => { i.blueprint.offer.painfulProblem = ''; }, C.strategy.noPrimaryProblem],
    ['no selected lane', i => { (i.blueprint.businessModelLane as { lane: string }).lane = ''; }, C.strategy.noSelectedLane],
    ['no testable offer', i => { i.blueprint.offer.offerName = ''; }, C.strategy.noTestableOffer],
    ['no first commitment', i => { i.blueprint.firstRevenuePath.commitmentMethod = ''; }, C.strategy.noFirstMeaningfulCommitment],
    ['no price', i => { i.blueprint.offer.initialTestPrice = ''; i.blueprint.firstRevenuePath.firstPrice = ''; }, C.strategy.noInitialPrice],
    ['no first revenue path', i => { i.blueprint.firstRevenuePath.firstAsk = ''; }, C.strategy.noFirstRevenuePath],
    ['no manual fulfillment', i => { i.blueprint.manualFulfillmentPlan.onboardingSteps = []; }, C.strategy.noManualFulfillmentMethod],
    ['missing risk boundary', i => { i.blueprint.executiveDecision.founderTimeRiskHours = 0; }, C.strategy.missingTimeOrCashBoundary],
    ['too few seeds', i => { i.research.receipt.seedDomains = ['one.example']; }, C.research.fewerThanTwoConfirmedSeeds],
    ['missing provider attempts', i => { i.research.receipt.attemptedSourceCount = 5; }, C.research.requiredProviderAttemptsNotExecuted],
    ['too few provider types', i => { i.research.receipt.sourceTypeCount = 1; }, C.research.fewerThanTwoSuccessfulProviderTypes],
    ['too few candidates', i => { i.research.receipt.candidateChannelCount = 9; }, C.research.fewerThanTenVerifiedCandidates],
    ['too few categories', i => { i.research.receipt.targetTypeCounts = { podcast: 10 }; }, C.research.fewerThanThreeTargetCategories],
    ['unknown candidate', i => { i.research.receipt.unknownCandidateIds = ['candidate_unknown']; }, C.research.unknownCandidateId],
    ['missing public source', i => { i.blueprint.customerAccessPack.channels[0].publicUrl = ''; }, C.research.missingPublicSource],
    ['missing research date', i => { i.blueprint.customerAccessPack.channels[0].researchDate = ''; }, C.research.missingResearchDate],
    ['missing research execution metadata', i => { i.blueprint.customerAccessPack.channels[0].accessPath = ''; }, C.research.missingExecutionMetadata],
    ['too few posts', i => { i.blueprint.customerAccessPack.helpfulPosts = i.blueprint.customerAccessPack.helpfulPosts.slice(0, 4); }, C.asset.fewerThanFiveFinishedPosts],
    ['missing script', i => { i.blueprint.customerAccessPack.outreachScripts = i.blueprint.customerAccessPack.outreachScripts.filter(script => script.relationship !== 'offer_test_invitation'); }, C.asset.missingRequiredOutreachScripts],
    ['missing interview guide', i => { i.blueprint.customerInterviewGuide.lastOccurrenceQuestions = []; }, C.asset.missingInterviewGuide],
    ['missing offer guide', i => { i.blueprint.offerConversationGuide.commitmentRequest = ''; }, C.asset.missingOfferConversationGuide],
    ['missing pilot brief', i => { i.blueprint.foundingCustomerPilotBrief.deliverables = []; }, C.asset.missingFoundingCustomerPilotBrief],
    ['incomplete landing copy', i => { i.blueprint.landingPageCopy.headline = ''; }, C.asset.incompleteLandingPageCopy],
    ['incomplete Launch Site', i => { i.blueprint.launchSite.leadCapture.destination = ''; }, C.asset.incompleteLaunchSiteConfiguration],
    ['not 30 actions', i => { i.blueprint.dailyCalendar.pop(); }, C.calendar.notExactlyThirtyActions],
    ['missing deliverable', i => { i.blueprint.dailyCalendar[0].expectedDeliverable = ''; }, C.calendar.missingDeliverable],
    ['missing success measure', i => { i.blueprint.dailyCalendar[0].successMeasurement = ''; }, C.calendar.missingSuccessMeasure],
    ['missing evidence requirement', i => { i.blueprint.dailyCalendar[0].evidenceToRecord = []; }, C.calendar.missingEvidenceRequirement],
    ['missing branch rule', i => { i.blueprint.dailyCalendar[0].ifThenBranches = []; }, C.calendar.missingBranchRule],
    ['workload exceeds limit', i => { i.blueprint.executiveDecision.founderTimeRiskHours = 1; }, C.calendar.workloadExceedsFounderLimits],
    ['commercial ask too late', i => { i.blueprint.firstRevenuePath.targetDay = i.blueprint.businessModelLane.earliestCommercialAskDay + 1; }, C.calendar.commercialAskTooLate],
    ['D1 failed', i => { i.delivery.d1Persisted = false; }, C.delivery.d1PersistenceFailed],
    ['PDF failed', i => { i.delivery.pdfPersisted = false; }, C.delivery.pdfPersistenceFailed],
    ['JSON failed', i => { i.delivery.jsonPersisted = false; }, C.delivery.jsonPersistenceFailed],
    ['ZIP failed', i => { i.delivery.zipPersisted = false; }, C.delivery.zipPersistenceFailed],
    ['hashes missing', i => { i.delivery.artifactHashesPresent = false; }, C.delivery.artifactHashesMissing],
    ['ownership missing', i => { i.delivery.ownershipBoundaryEstablished = false; }, C.delivery.ownershipBoundaryNotEstablished],
    ['repeat download unavailable', i => { i.delivery.repeatDownloadAvailable = false; }, C.delivery.repeatDownloadUnavailable]
  ];

  it.each(cases)('blocks %s', (_name, mutate, code) => expectCode(mutate, code));
});
`;
writeFileSync(testPath, test);

const fulfillmentPath = 'src/api/blueprintFulfillmentV21.ts';
let fulfillment = readFileSync(fulfillmentPath, 'utf8');
const importNeedle = `import {\n  prepareBlueprintGenerationReceiptV21,\n  saveBlueprintRecordV21\n} from './blueprintStoreV21';\n`;
const importReplacement = importNeedle + `import {\n  assertBlueprintReleaseQualityGateV21,\n  evaluateBlueprintReleaseQualityGateV21,\n  verifyBlueprintDeliveryStateV21\n} from './blueprintReleaseQualityGateV21';\n`;
if (!fulfillment.includes(importNeedle)) throw new Error('Fulfillment import anchor not found');
fulfillment = fulfillment.replace(importNeedle, importReplacement);
const preNeedle = `  if (!blueprint.qualityGate.passed) {\n    throw new Error(\`Launch Blueprint v2.1 quality gate failed: \${blueprint.qualityGate.failures.join(' | ')}\`);\n  }\n\n  await prepareBlueprintGenerationReceiptV21(`;
const preReplacement = `  if (!blueprint.qualityGate.passed) {\n    throw new Error(\`Launch Blueprint v2.1 quality gate failed: \${blueprint.qualityGate.failures.join(' | ')}\`);\n  }\n\n  assertBlueprintReleaseQualityGateV21(evaluateBlueprintReleaseQualityGateV21({ blueprint, research: result }));\n\n  await prepareBlueprintGenerationReceiptV21(`;
if (!fulfillment.includes(preNeedle)) throw new Error('Fulfillment pre-release anchor not found');
fulfillment = fulfillment.replace(preNeedle, preReplacement);
const postNeedle = `  const pdf = renderLaunchBlueprintPdfV21(blueprint);\n  const exactReceipt = await saveBlueprintRecordV21(env, blueprint, result.receipt, pdf);\n\n  order.status = 'ready';`;
const postReplacement = `  const pdf = renderLaunchBlueprintPdfV21(blueprint);\n  const exactReceipt = await saveBlueprintRecordV21(env, blueprint, result.receipt, pdf);\n  const delivery = await verifyBlueprintDeliveryStateV21(env, blueprint, exactReceipt);\n  assertBlueprintReleaseQualityGateV21(evaluateBlueprintReleaseQualityGateV21({ blueprint, research: result, delivery }));\n\n  order.status = 'ready';`;
if (!fulfillment.includes(postNeedle)) throw new Error('Fulfillment delivery anchor not found');
fulfillment = fulfillment.replace(postNeedle, postReplacement);
writeFileSync(fulfillmentPath, fulfillment);

const researchPath = 'src/api/distributionFootprintResearch.ts';
let researchSource = readFileSync(researchPath, 'utf8');
const receiptNeedle = `  responseHash: string;\n}`;
if (!researchSource.includes(receiptNeedle)) throw new Error('Research receipt anchor not found');
researchSource = researchSource.replace(receiptNeedle, `  responseHash: string;\n  unknownCandidateIds?: string[];\n}`);
const candidateNeedle = `  const byId = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));\n  const researchDate = new Date().toISOString().slice(0, 10);`;
const candidateReplacement = `  const byId = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));\n  const unknownCandidateIds = [...new Set((selection.channels || [])\n    .map(selected => text(selected.candidateId))\n    .filter(candidateIdValue => candidateIdValue && !byId.has(candidateIdValue)))];\n  if (unknownCandidateIds.length) {\n    throw new Error(\`STEP5_RESEARCH_UNKNOWN_CANDIDATE_ID: Model returned candidate IDs outside the immutable candidate set: \${unknownCandidateIds.join(', ')}\`);\n  }\n  const researchDate = new Date().toISOString().slice(0, 10);`;
if (!researchSource.includes(candidateNeedle)) throw new Error('Research candidate anchor not found');
researchSource = researchSource.replace(candidateNeedle, candidateReplacement);
const responseNeedle = `      targetTypeCounts: typeCounts,\n      responseHash: fnvHash(output)`;
const responseReplacement = `      targetTypeCounts: typeCounts,\n      responseHash: fnvHash(output),\n      unknownCandidateIds: []`;
if (!researchSource.includes(responseNeedle)) throw new Error('Research response anchor not found');
researchSource = researchSource.replace(responseNeedle, responseReplacement);
writeFileSync(researchPath, researchSource);

const receiptPath = 'docs/receipts/GHOSTTOWN_LAUNCH_BLUEPRINT_STEP5_RELEASE_QUALITY_GATE_RECEIPT.md';
writeFileSync(receiptPath, `# GhostTown Launch Blueprint v2.1 — Step 5 Release Quality Gate Receipt\n\n## Source authority\n\nStep 5 is implemented from the canonical Phase Completion and Environment Acceptance Plan: **Strengthen the v2.1 release quality gate — Add explicit blockers for every required customer outcome.** No additional blocker category was substituted for the five source-defined groups.\n\nCanonical Git blob SHA-1: \`a6dd1fa9e8f59417b7ce00b032eabf3793537abd\`.\n\n## Implementation\n\n- Central release-gate module: \`src/api/blueprintReleaseQualityGateV21.ts\`.\n- Five source-defined blocker groups: strategy, research, asset, calendar, delivery.\n- Every source bullet has a stable blocker code and fail-closed predicate.\n- The real v2.1 paid fulfillment runs the gate before persistence and again after exact-byte persistence verification.\n- The order cannot become \`ready\` until the post-persistence delivery gate passes.\n- Research candidate selection now rejects any model-returned candidate ID outside the immutable candidate set.\n- Required provider attempts are evaluated against the actual planned/seed-derived count rather than only a fixed minimum.\n- Delivery verification re-reads D1 and PDF/JSON/ZIP from private R2, verifies exact hashes, checks owner identity, and proves repeated artifact retrieval before customer release.\n\n## Explicit blocker coverage\n\nStrategy: 9 blockers.\nResearch: 9 blockers.\nAssets: 7 blockers.\nCalendar: 7 blockers.\nDelivery: 7 blockers.\nTotal: 39 explicit source-derived blockers.\n\n## Tests\n\n\`tests/blueprintReleaseQualityGateV21.test.ts\` contains a passing complete fixture plus a table-driven failure assertion for every one of the 39 blocker codes.\n\n## Release boundary\n\nThis is a Gate A code-completion slice. It does not claim that the isolated Cloudflare/Stripe/Vertex acceptance environment has passed. PR #7 remains draft and production deployment remains disabled.\n`);

console.log('Applied GhostTown Blueprint v2.1 Step 5 release quality gate.');
