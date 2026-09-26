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
      sourceIds: ['source-' + (index + 1)],
      targetType,
      evidenceRole,
      accessPath: 'Public contact route',
      preparedAsset: 'Prepared educational asset',
      outreachScriptId: evidenceRole === 'partnership' ? 'script-06-referral_partner' : evidenceRole === 'customer_access' ? 'script-03-community_member' : 'script-07-interview_invitation'
    };
  });
  const sources = channels.map((channel, index) => ({ sourceId: 'source-' + (index + 1), title: 'Source ' + (index + 1), url: 'https://example.com/source-' + (index + 1), publisher: 'Fixture', accessedAt: generatedAt, supports: [channel.channelId] }));
  return {
    research: { status: 'complete', researchDate, sources, channels, publicExpertsAndPartners: [] },
    receipt: {
      provider: 'distribution_footprint', model: 'gemini-2.5-flash', requestedAt: generatedAt, completedAt: generatedAt, packs: ['customer_access'], webSearchQueries: [], attemptedSourceCount: 6, successfulSourceCount: 6, sourceTypeCount: 3, candidateChannelCount: 10, verifiedChannelCount: 10, rejectedUrls: [], failedSources: [], sourceDefinitionIds: ['dataforseo:s1','podcast:s1','youtube:s1','dataforseo:s2','podcast:s2','youtube:s2'], seedDomains: ['seed-one.example','seed-two.example'], targetTypeCounts: { podcast: 3, youtube_creator: 3, newsletter_or_publication: 4 }, responseHash: 'fixture'
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
