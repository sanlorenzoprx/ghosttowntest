import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { CustomerAccessResearchResult } from '../src/api/customerAccessResearch';
import { createGhostTownLaunchBlueprintV21 } from '../src/api/launchBlueprintGeneratorV21';
import {
  BLUEPRINT_RELEASE_BLOCKER_CODES_V21,
  evaluateBlueprintReleaseQualityGateV21,
  researchVerificationDimensionsV21,
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
  const channels = Array.from({ length: 10 }, (_, index) => {
    const targetType = index < 5 ? 'community' as const
      : index < 7 ? 'review_site' as const
        : index < 9 ? 'youtube_creator' as const
          : 'complementary_partner' as const;
    const evidenceRole = index < 5 ? 'customer_access' as const
      : index < 7 ? 'market_evidence' as const
        : index < 9 ? 'media_pr' as const
          : 'partnership' as const;
    return {
      channelId: 'channel-' + (index + 1),
      community: 'Channel ' + (index + 1),
      platform: index < 5 ? 'Community' : index < 7 ? 'Review site' : index < 9 ? 'YouTube' : 'Partner',
      publicUrl: 'https://example.com/channel-' + (index + 1),
      relevance: 'Relevant audience.',
      activity: 'active' as const,
      participationRules: 'Use public rules.',
      recommendedApproach: 'Contribute usefully.',
      usefulTopic: 'Family game choice.',
      risk: 'Access can change.',
      firstAction: 'Review the public route.',
      confidence: 'high' as const,
      researchDate,
      evidenceDate: '2026-08-01T12:00:00.000Z',
      evidenceDateSource: 'provider_activity' as const,
      evidenceRecency: 'current' as const,
      currentActivityStatus: 'verified_current' as const,
      currentActivityVerifiedAt: generatedAt,
      currentActivityEvidence: 'Fixture provider independently observed current activity on 2026-08-01.',
      sourceIds: ['source-' + (index + 1)],
      targetType,
      evidenceRole,
      competitorEvidence: evidenceRole === 'market_evidence' ? ['Observed competitor or current-alternative evidence.'] : [],
      accessPath: 'Public contact route',
      preparedAsset: 'Prepared educational asset',
      outreachScriptId: evidenceRole === 'partnership' ? 'script-06-referral_partner' : evidenceRole === 'customer_access' ? 'script-03-community_member' : 'script-07-interview_invitation'
    };
  });
  const reviewSources = Array.from({ length: 3 }, (_, index) => ({
    sourceId: 'review-source-' + (index + 1),
    title: 'First-person review ' + (index + 1),
    url: 'https://reviews.example/review-' + (index + 1),
    publisher: 'Review Fixture',
    accessedAt: generatedAt,
    evidenceDate: '2026-08-01T12:00:00.000Z',
    evidenceDateSource: 'published_metadata' as const,
    evidenceRecency: 'current' as const,
    supports: ['Observed first-person problem language.']
  }));
  const sources = [
    ...channels.map((channel, index) => ({ sourceId: 'source-' + (index + 1), title: 'Source ' + (index + 1), url: 'https://example.com/source-' + (index + 1), publisher: 'Fixture', accessedAt: generatedAt, evidenceDate: '2026-08-01T12:00:00.000Z', evidenceDateSource: 'provider_activity' as const, evidenceRecency: 'current' as const, supports: [channel.channelId] })),
    ...reviewSources
  ];
  const competitorReviewIntelligence = {
    schemaVersion: 'competitor-review-intelligence-v1' as const,
    orderId: 'step5-order',
    sourceVerdictId: 'step5-verdict',
    productSpecific: true as const,
    generatedAt,
    status: 'complete' as const,
    competitorSeedIds: ['s1', 's2'],
    observations: reviewSources.map((source, index) => ({
      observationId: 'review-observation-' + (index + 1),
      competitorSeedId: index % 2 ? 's2' : 's1',
      competitorName: index % 2 ? 'Seed Two' : 'Seed One',
      sourceId: source.sourceId,
      sourceUrl: source.url,
      sourceTitle: source.title,
      accessedAt: generatedAt,
      evidenceDate: source.evidenceDate,
      customerLanguage: ['I had difficulty choosing a family game that worked for everyone.']
    })),
    patterns: [],
    customerLanguagePhrases: ['difficulty choosing a family game'],
    productImplications: [],
    sources: reviewSources,
    limitations: []
  };
  return {
    research: { status: 'complete', researchDate, sources, channels, publicExpertsAndPartners: [], competitorReviewIntelligence },
    receipt: {
      provider: 'distribution_footprint', model: 'gemini-2.5-flash', requestedAt: generatedAt, completedAt: generatedAt, packs: ['customer_access'], webSearchQueries: [], attemptedSourceCount: 6, successfulSourceCount: 6, sourceTypeCount: 1, candidateChannelCount: 5, verifiedChannelCount: 10, rejectedUrls: [], failedSources: [], sourceDefinitionIds: ['web:1'], seedDomains: ['seed-one.example','seed-two.example'], targetTypeCounts: { community: 5, review_site: 2, youtube_creator: 2, complementary_partner: 1 }, responseHash: 'fixture',
      evidenceSufficiency: { currentCustomerAccessCount: 5, problemLanguageObservationCount: 3, competitiveAlternativeSourceCount: 2, coveredRoles: ['customer_access','problem_language','competitive_alternative'], missingRoles: [], independentEvidenceUrls: 10, sufficient: true }
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

  it('does not promote media-only research into customer access', () => {
    const input = fixture();
    input.research.receipt.sourceTypeCount = 1;
    input.research.receipt.targetTypeCounts = { podcast: 10 };
    input.blueprint.customerAccessPack.channels.forEach(channel => {
      channel.targetType = 'podcast';
      channel.evidenceRole = 'media_pr';
    });

    const dimensions = researchVerificationDimensionsV21(input.blueprint, input.research);
    expect(dimensions).not.toContain('customer_access');
    expect(dimensions).toContain('audience_reach');

    const codes = evaluateBlueprintReleaseQualityGateV21(input).blockers.map(blocker => blocker.code);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.research.fewerThanThreeCustomerAccessTargets);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.strategy.firstRevenueUsesNonCustomerAccess);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.strategy.launchCardUsesNonCustomerAccess);
  });

  it('does not let a current research date make stale customer-access evidence current', () => {
    const input = fixture();
    const customerAccess = input.blueprint.customerAccessPack.channels.filter(channel => channel.evidenceRole === 'customer_access');
    customerAccess.forEach(channel => {
      channel.researchDate = '2026-09-26';
      channel.evidenceDate = '2015-06-10T00:00:00.000Z';
      channel.evidenceDateSource = 'published_metadata';
      channel.evidenceRecency = 'stale';
      channel.activity = 'uncertain';
      channel.currentActivityStatus = 'verified_inactive';
      channel.currentActivityVerifiedAt = '2026-09-26T12:00:00.000Z';
      channel.currentActivityEvidence = 'The underlying evidence is from 2015; current activity was not established.';
    });

    const codes = evaluateBlueprintReleaseQualityGateV21(input).blockers.map(blocker => blocker.code);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.research.fewerThanThreeCustomerAccessTargets);
    expect(researchVerificationDimensionsV21(input.blueprint, input.research)).not.toContain('customer_access');
  });

  it('blocks an active or recent label when current activity is not independently verified', () => {
    const input = fixture();
    const channel = input.blueprint.customerAccessPack.channels[0];
    channel.activity = 'active';
    channel.currentActivityStatus = 'unverified';
    channel.currentActivityVerifiedAt = undefined;
    channel.currentActivityEvidence = 'The source was accessed today, but no dated current activity was established.';

    const codes = evaluateBlueprintReleaseQualityGateV21(input).blockers.map(blocker => blocker.code);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.research.inconsistentCurrentActivityClaim);
  });

  it('blocks new release records that omit recency metadata', () => {
    const input = fixture();
    const channel = input.blueprint.customerAccessPack.channels[0];
    channel.evidenceRecency = undefined;
    channel.currentActivityStatus = undefined;
    channel.currentActivityEvidence = undefined;

    const codes = evaluateBlueprintReleaseQualityGateV21(input).blockers.map(blocker => blocker.code);
    expect(codes).toContain(BLUEPRINT_RELEASE_BLOCKER_CODES_V21.research.missingRecencyMetadata);
  });

  const C = BLUEPRINT_RELEASE_BLOCKER_CODES_V21;
  const cases: Array<[string, (input: ReturnType<typeof fixture>) => void, string]> = [
    ['no first customer', i => { i.blueprint.executiveDecision.recommendedInitialCustomer = ''; i.blueprint.firstRevenuePath.firstBuyer = ''; }, C.strategy.noFirstCustomer],
    ['no primary problem', i => { i.blueprint.offer.painfulProblem = ''; }, C.strategy.noPrimaryProblem],
    ['no selected lane', i => { (i.blueprint.businessModelLane as { lane: string }).lane = ''; }, C.strategy.noSelectedLane],
    ['no testable offer', i => { i.blueprint.offer.offerName = ''; }, C.strategy.noTestableOffer],
    ['no first commitment', i => { i.blueprint.firstRevenuePath.commitmentMethod = ''; }, C.strategy.noFirstMeaningfulCommitment],
    ['no price', i => { i.blueprint.offer.initialTestPrice = ''; i.blueprint.firstRevenuePath.firstPrice = ''; }, C.strategy.noInitialPrice],
    ['no first revenue path', i => { i.blueprint.firstRevenuePath.firstAsk = ''; }, C.strategy.noFirstRevenuePath],
    ['first revenue uses media instead of customer access', i => { const media = i.blueprint.customerAccessPack.channels.find(channel => channel.evidenceRole === 'media_pr')!; i.blueprint.firstRevenuePath.firstChannel = media.community + ' via ' + media.platform; }, C.strategy.firstRevenueUsesNonCustomerAccess],
    ['launch card uses media instead of customer access', i => { const media = i.blueprint.customerAccessPack.channels.find(channel => channel.evidenceRole === 'media_pr')!; i.blueprint.launchCard48Hour.firstThreeApproaches[0] = { name: media.community, channelId: media.channelId, publicUrl: media.publicUrl, firstAction: media.firstAction }; }, C.strategy.launchCardUsesNonCustomerAccess],
    ['no manual fulfillment', i => { i.blueprint.manualFulfillmentPlan.onboardingSteps = []; }, C.strategy.noManualFulfillmentMethod],
    ['missing risk boundary', i => { i.blueprint.executiveDecision.founderTimeRiskHours = 0; }, C.strategy.missingTimeOrCashBoundary],
    ['too few seeds', i => { i.research.receipt.seedDomains = ['one.example']; }, C.research.fewerThanTwoConfirmedSeeds],
    ['missing provider attempts', i => { i.research.receipt.attemptedSourceCount = 5; }, C.research.requiredProviderAttemptsNotExecuted],
    ['insufficient verification dimensions', i => {
      i.blueprint.startingStateAudit.verifiedFacts = [];
      i.blueprint.customerAccessPack.channels.forEach(channel => {
        channel.targetType = 'association';
        channel.evidenceRole = 'partnership';
        channel.competitorEvidence = [];
      });
      i.research.research.publicExpertsAndPartners = [];
    }, C.research.insufficientVerificationDimensions],
    ['too few candidates', i => { i.research.receipt.candidateChannelCount = 9; }, C.research.fewerThanTenVerifiedCandidates],
    ['too few direct customer-access targets', i => { i.blueprint.customerAccessPack.channels.filter(channel => channel.evidenceRole === 'customer_access').slice(2).forEach(channel => { channel.targetType = 'podcast'; channel.evidenceRole = 'media_pr'; }); }, C.research.fewerThanThreeCustomerAccessTargets],
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
