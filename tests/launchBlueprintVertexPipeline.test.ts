import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { CustomerAccessResearchResult } from '../src/api/customerAccessResearch';
import type { VertexStructuredStageResult } from '../src/api/vertexStructuredGeneration';
import {
  applyVertexPipelineDraft,
  assertStrategicCoherenceGate,
  createLaunchBlueprintVertexContext,
  validateStrategicCoherenceGate,
  validateCustomerCopyEdit,
  finalizeLaunchBlueprintVertexPipeline,
  type VertexAssetGeneration,
  type VertexCustomerCopyEdit,
  type VertexEvidenceNormalization,
  type VertexRedTeamReview,
  type VertexStrategicCoherenceGate,
  type VertexStrategySynthesis
} from '../src/api/launchBlueprintVertexPipeline';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';
import { correctCustomerSurfaceSpelling } from '../src/api/customerCopyLanguage';

const generatedAt = '2026-08-06T21:00:00.000Z';

function fixtureVerdict(): EvaluationResult {
  return {
    resultId: 'fixture-verdict',
    generatedAt,
    idea: {
      ideaName: 'Family Game Night',
      description: 'Curated family game nights.',
      targetUser: 'Families with children',
      painfulProblem: 'Choosing games is difficult.',
      currentAlternative: 'Buying random games',
      motivation: 'Firsthand experience'
    },
    deterministicScores: {
      ghostTownScore: 3,
      ghostTownRisk: 'medium',
      leverageScore: 3,
      insightScore: 3,
      timingScore: 3,
      litScore: 3,
      litBand: 'unclear',
      highWallsScore: 2,
      highWallsBand: 'weak',
      businessDnaType: 'subscription',
      businessDnaTrap: 'Inventory risk',
      businessDnaWinStrategy: 'Concierge pilot',
      finalVerdict: 'test_first',
      verdictHeadline: 'Test first',
      verdictExplanation: 'Demand is not yet proven.',
      recommendedNextTest: 'Sell a pilot.',
      doNotBuildUntil: 'A family pays.',
      oneSentenceAdvice: 'Sell before stocking.'
    },
    usedAI: false,
    cacheHit: false,
    answers: {}
  } as EvaluationResult;
}

function fixtureOrder(): PaidTestOrder {
  return {
    orderId: 'gtt_fixture_12345678',
    email: 'founder@familygamenight.co',
    verdictId: 'fixture-verdict',
    status: 'generating',
    artifactType: 'launch_blueprint_v2',
    planVersion: '2.0',
    intake: {
      verdictId: 'fixture-verdict',
      targetBuyer: 'Families with children',
      problem: 'Choosing games is difficult.',
      currentWorkaround: 'Buying random games',
      offerHypothesis: 'A concierge family game-night pilot.',
      expectedPrice: '$49',
      currentStage: 'Idea with interviews but no paid pilot',
      geography: 'United States and Puerto Rico',
      competitorSeeds: [
        {
          seedId: 'seed-1',
          name: 'Fixture company',
          website: 'https://example.com',
          domain: 'example.com',
          relationship: 'current_alternative',
          origin: 'customer_confirmed',
          verifiedAt: generatedAt
        },
        {
          seedId: 'seed-2',
          name: 'Fixture adjacent company',
          website: 'https://example.org',
          domain: 'example.org',
          relationship: 'adjacent_product',
          origin: 'customer_confirmed',
          verifiedAt: generatedAt
        }
      ]
    },
    createdAt: generatedAt,
    updatedAt: generatedAt,
    paidAt: generatedAt
  };
}

function fixtureContext() {
  const order = fixtureOrder();
  const verdict = fixtureVerdict();
  const draft = upgradeGhostTownLaunchBlueprintToV21(
    launchBlueprintFixture(),
    order,
    verdict
  );
  const research: CustomerAccessResearchResult = {
    research: {
      status: 'complete',
      researchDate: '2026-08-06',
      sources: draft.sources,
      channels: draft.customerAccessPack.channels,
      publicExpertsAndPartners: draft.customerAccessPack.publicExpertsAndPartners
    },
    receipt: {
      provider: 'distribution_footprint',
      model: 'gemini-2.5-flash',
      requestedAt: generatedAt,
      completedAt: generatedAt,
      packs: ['customer_access'],
      webSearchQueries: [],
      attemptedSourceCount: 10,
      successfulSourceCount: 10,
      sourceTypeCount: 3,
      candidateChannelCount: 10,
      verifiedChannelCount: 10,
      rejectedUrls: [],
      failedSources: [],
      sourceDefinitionIds: draft.sources.map(source => source.sourceId),
      seedDomains: ['example.com', 'example.org'],
      targetTypeCounts: {
        podcast: 3,
        youtube_creator: 3,
        newsletter_or_publication: 4
      },
      responseHash: 'fixture-research-hash'
    }
  };
  return createLaunchBlueprintVertexContext(order, verdict, research, draft);
}

function evidenceStage(context = fixtureContext()): VertexEvidenceNormalization {
  const verified = context.evidenceCatalog
    .filter(item => item.truthLabel === 'Verified')
    .slice(0, 5)
    .map(item => item.evidenceId);
  const inferred = context.evidenceCatalog
    .filter(item => item.truthLabel === 'Inferred')
    .slice(0, 2)
    .map(item => item.evidenceId);
  return {
    packetSummary: 'The founder has a defined family customer and problem, while payment, repeat demand, and fulfillment economics remain tests.',
    verifiedEvidenceIds: verified,
    inferenceEvidenceIds: inferred,
    missingEvidence: [
      'No qualified buyer payment or deposit has been observed.',
      'Founder hours and direct fulfillment cost remain unmeasured.'
    ],
    criticalAssumptions: [
      {
        assumptionId: 'assumption-payment',
        assumption: 'Qualified families will pay for one concierge pilot.',
        failureConsequence: 'Narrow or stop the offer before buying inventory.',
        evidenceRequired: 'A payment, deposit, or accepted paid pilot scope.'
      },
      {
        assumptionId: 'assumption-fulfillment',
        assumption: 'The pilot can be delivered within the time and cost guardrails.',
        failureConsequence: 'Revise fulfillment before acquiring another customer.',
        evidenceRequired: 'Recorded founder hours, direct cost, defects, and buyer outcome.'
      }
    ]
  };
}

function strategyStage(context = fixtureContext()): VertexStrategySynthesis {
  return {
    executiveDecision: {
      strongestOpportunity: 'A concierge pilot can test selection value before inventory scale.',
      biggestRisk: 'Families may not pay enough to cover curation and fulfillment.',
      recommendedInitialCustomer: 'Families with children who bought an unsuitable game recently.',
      validationObjective: 'Earn one paid pilot and measure delivery economics.',
      continueEvidence: ['At least one paid pilot.', 'Delivery remains inside the stated time and cost guardrails.'],
      stopEvidence: ['No qualified buyer accepts a paid test after the bounded ask volume.', 'Delivery is unsafe or structurally unprofitable.']
    },
    offer: {
      offerName: 'Founding Family Game-Night Pilot',
      targetCustomer: 'Families with children who struggle to choose suitable games.',
      painfulProblem: 'Families spend money on games that do not fit age, complexity, or available time.',
      desiredOutcome: 'One game-night plan matched to the family before broader subscription operations exist.',
      oneSentencePromise: 'Get one manually curated family game-night plan without committing to a subscription.',
      initialTestPrice: '$49',
      pricingRationale: 'The price is a test of commitment and must be compared with real delivery cost.',
      riskReversal: 'If the written pilot deliverables are not completed, refund the pilot payment.'
    },
    firstRevenuePath: {
      firstOfferFormat: 'A fixed-scope concierge pilot.',
      firstBuyer: 'A qualified family with a recent failed game purchase.',
      firstAsk: 'Would you like to approve the written $49 founding-family pilot scope?',
      firstPrice: '$49',
      commitmentMethod: 'Use a real payment link or accepted written paid-pilot scope.',
      targetDay: 8,
      minimumQualifiedAsks: 5,
      successThreshold: 'One payment or multiple specific buying-process objections from qualified families.'
    },
    manualFulfillmentPlan: {
      expectedDeliveryTime: 'First useful recommendation within three business days.',
      successfulDeliveryDefinition: 'The promised plan is delivered and hours, direct cost, defects, and buyer feedback are recorded.',
      capacityPerWeek: 2,
      estimatedVariableCost: 'Record actual research, acquisition, packing, and delivery cost for the pilot.',
      estimatedFounderHours: 'No more than six founder hours per pilot.',
      grossMarginGuardrail: 'Do not scale when variable cost plus founder labor exceeds 70% of pilot revenue.'
    },
    channelPriorities: context.draft.customerAccessPack.channels.slice(0, 5).map(channel => channel.channelId),
    decisionThresholds: [
      { decision: 'continue', condition: 'Strong commitment and viable fulfillment exist.', nextAction: 'Run one more bounded pilot.' },
      { decision: 'revise', condition: 'One correctable offer or access constraint is supported.', nextAction: 'Change one variable and retest.' },
      { decision: 'pivot', condition: 'Evidence supports a different customer, problem, or offer.', nextAction: 'Preserve evidence and test the new focus.' },
      { decision: 'stop', condition: 'Qualified buyers show no meaningful problem or commitment.', nextAction: 'Stop and archive the evidence.' }
    ]
  };
}

function passingCoherenceGate(context = fixtureContext()): VertexStrategicCoherenceGate {
  const evidenceId = context.evidenceCatalog[0]?.evidenceId || 'evidence-001';
  const channelId = context.draft.customerAccessPack.channels[0]?.channelId || 'channel-1';
  return {
    passed: true,
    chainSummary: 'The family customer, buyer, recent selection problem, paid concierge test, fulfillment, and reachable channel form one bounded validation chain.',
    links: [
      { link: 'customer', value: 'Families with children who recently bought an unsuitable game.', status: 'coherent', reason: 'The beneficiary and target segment are explicit.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'problem', value: 'Poor-fit game purchases waste money and undermine family game night.', status: 'coherent', reason: 'The problem is concrete and tied to recent behavior.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'buyer_payer', value: 'The parent or guardian making the family game purchase.', status: 'testable_hypothesis', reason: 'The proposed buyer can authorize the same purchase decision being tested.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'current_alternative', value: 'Buying random games without a structured fit check.', status: 'coherent', reason: 'The workaround is explicitly supplied in the source idea.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'test', value: 'A fixed-scope concierge game-night recommendation pilot.', status: 'testable_hypothesis', reason: 'The manual pilot tests selection value without changing the buyer or core outcome.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'commitment', value: 'A $49 payment or accepted written paid-pilot scope.', status: 'testable_hypothesis', reason: 'The commitment is observable and tied to the proposed buyer and test.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'fulfillment', value: 'Deliver one curated recommendation within three business days and record cost and labor.', status: 'testable_hypothesis', reason: 'The scope is bounded and measurable inside the stated guardrails.', evidenceIds: [evidenceId], channelIds: [] },
      { link: 'access_path', value: 'Use the first verified family-relevant channel to reach qualified parent buyers.', status: 'testable_hypothesis', reason: 'The path is source-linked and can be tested for buyer reach.', evidenceIds: [evidenceId], channelIds: [channelId] }
    ],
    blockers: []
  };
}

function assetStage(context = fixtureContext()): VertexAssetGeneration {
  return {
    helpfulPosts: context.draft.customerAccessPack.helpfulPosts.slice(0, 3).map((post, index) => ({
      postId: post.postId,
      title: `Useful family game-selection lesson ${index + 1}`,
      body: `Before buying another family game, write down the players' ages, the time available, the reading level, how much conflict the group enjoys, and what failed during the last game night. Compare each option against those constraints, choose the smallest complete test, and record whether everyone actually played rather than relying on a general opinion. This keeps the decision practical without promoting the pilot.`,
      closingQuestion: 'What makes a game work for your family?'
    })),
    outreachScripts: context.draft.customerAccessPack.outreachScripts.slice(0, 4).map(script => ({
      scriptId: script.scriptId,
      message: `I am testing a fixed-scope family game-night pilot. ${script.purpose} Would you be open to the stated next step?`
    })),
    landingPageCopy: {
      headline: 'Choose one family game night before buying another unused game',
      subheadline: 'A fixed-scope founding-family pilot for families who want a better-fit game-night plan.',
      offerDescription: 'GhostTown helps the founder deliver one manual, written game-night recommendation and record real buying and fulfillment evidence.',
      primaryCallToAction: 'Review the founding-family pilot',
      confirmationEmailSubject: 'Your founding-family pilot request',
      confirmationEmailBody: 'Thank you. We will confirm fit, written scope, payment, and the three-business-day first-result timeline before work begins.'
    },
    customerInterviewGuide: {
      opening: 'I am researching the most recent time choosing a family game went poorly; this is not a sales call.',
      lastOccurrenceQuestions: ['What happened the last time?', 'What triggered the purchase?', 'What happened after the game was opened?'],
      currentWorkaroundQuestions: ['How do you choose today?', 'Who helps with the choice?', 'Where does that process fail?'],
      costAndConsequenceQuestions: ['What did the last poor choice cost?', 'What happens when game night fails?'],
      buyingProcessQuestions: ['Who decides to buy?', 'What must be true before paying for help?'],
      closingAndReferralQuestions: ['What did I fail to ask?', 'Who else had this problem recently?']
    },
    offerConversationGuide: {
      opening: 'Confirm the recent problem, buyer, and written scope before discussing price.',
      offerExplanation: 'The pilot delivers one manually curated game-night plan and records the evidence needed for the next decision.',
      pricePresentation: 'The founding-family test price is $49 and remains an unproven pricing hypothesis.',
      commitmentRequest: 'Would you like to approve the written scope and use the payment link for the pilot?',
      followUpAgreement: 'Agree on one dated next step or close the opportunity respectfully.'
    },
    dailyActions: context.draft.dailyCalendar.map(day => ({
      dayNumber: day.dayNumber,
      title: day.title,
      requiredActions: [`Complete the bounded Day ${day.dayNumber} action.`],
      preparedAssets: day.preparedAssets.slice(0, 2),
      successMeasurement: `Record the measurable Day ${day.dayNumber} result.`,
      evidenceToRecord: [`Observed Day ${day.dayNumber} behavior or explicit missing evidence.`],
      whyItMatters: `Day ${day.dayNumber} reduces one named validation uncertainty.`,
      estimatedMinutes: 45
    }))
  };
}

function stageResult<T>(stage: string, data: T): VertexStructuredStageResult<T> {
  return {
    data,
    receipt: {
      stage,
      model: 'gemini-2.5-flash',
      modelVersion: 'gemini-2.5-flash-001',
      responseId: `response-${stage}`,
      promptHash: `prompt-${stage}`,
      responseHash: `response-hash-${stage}`,
      totalTokenCount: 100,
      completedAt: generatedAt
    }
  };
}

function passingRedTeam(): VertexRedTeamReview {
  return {
    passed: true,
    checks: {
      unsupportedClaims: 'pass',
      inventedSources: 'pass',
      contradictions: 'pass',
      genericLanguage: 'pass',
      businessModelMismatch: 'pass',
      impossibleWorkload: 'pass',
      missingDailyAssets: 'pass',
      unclearMeasurements: 'pass',
      softenedStopCriteria: 'pass',
      pricingFulfillmentMismatch: 'pass'
    },
    findings: [{
      code: 'WARN_PRICE_TEST',
      severity: 'warning',
      field: 'offer.initialTestPrice',
      message: 'The $49 price remains a test until qualified buyer behavior is observed.'
    }]
  };
}

describe('staged Vertex Launch Blueprint pipeline', () => {
  it('applies only allowed strategy and asset fields, preserves immutable evidence, and records all stages', () => {
    const context = fixtureContext();
    const evidence = evidenceStage(context);
    const strategy = strategyStage(context);
    const assets = assetStage(context);
    const originalSources = JSON.stringify(context.draft.sources);
    const originalChannelLedger = JSON.stringify(context.draft.customerAccessPack.channels
      .map(channel => ({ channelId: channel.channelId, publicUrl: channel.publicUrl, sourceIds: channel.sourceIds }))
      .sort((left, right) => left.channelId.localeCompare(right.channelId)));

    const candidate = applyVertexPipelineDraft(context, evidence, strategy, assets);
    expect(candidate.landingPageCopy.headline).toContain('Choose one family game night');
    expect(candidate.launchSite.offer.headline).toBe(candidate.landingPageCopy.headline);
    expect(candidate.dailyCalendar).toHaveLength(30);
    expect(candidate.dailyCalendar.map(day => day.dayNumber)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(JSON.stringify(candidate.sources)).toBe(originalSources);
    expect(JSON.stringify(candidate.customerAccessPack.channels
      .map(channel => ({ channelId: channel.channelId, publicUrl: channel.publicUrl, sourceIds: channel.sourceIds }))
      .sort((left, right) => left.channelId.localeCompare(right.channelId)))).toBe(originalChannelLedger);

    const finalized = finalizeLaunchBlueprintVertexPipeline(
      context,
      stageResult('evidence_normalization', evidence),
      stageResult('strategy_synthesis', strategy),
      stageResult('strategic_coherence_gate', passingCoherenceGate(context)),
      stageResult('asset_generation', assets),
      stageResult('customer_copy_edit', assets),
      stageResult('red_team_review', passingRedTeam())
    );

    expect(finalized.status).toBe('ready');
    expect(finalized.qualityGate.passed).toBe(true);
    expect(finalized.generationReceipt.vertexPipeline?.status).toBe('complete');
    expect(finalized.generationReceipt.vertexPipeline?.pipelineVersion).toBe('vertex-blueprint-staged-v3');
    expect(finalized.generationReceipt.vertexPipeline?.stages.map(item => item.stage)).toEqual([
      'evidence_normalization',
      'strategy_synthesis',
      'strategic_coherence_gate',
      'asset_generation',
      'customer_copy_edit',
      'red_team_review'
    ]);
    expect(finalized.qualityGate.warnings.some(warning => warning.includes('WARN_PRICE_TEST'))).toBe(true);
  });

  it('overwrites obvious founder spelling errors in customer-facing copy', () => {
    const rawTypos = ['Car' + 'giver', 'mem' + 'eory', 'requir' + 'ment', 'does' + 'nt'].join(' ');
    expect(correctCustomerSurfaceSpelling(`${rawTypos} work`))
      .toBe("Caregiver memory requirement doesn't work");

    const context = fixtureContext();
    const source = assetStage(context);
    const edited = JSON.parse(JSON.stringify(source)) as VertexCustomerCopyEdit;
    edited.helpfulPosts[0].title = `A ${'car' + 'giver'} ${'mem' + 'eory'} ${'requir' + 'ment'} checklist 1`;

    const result = validateCustomerCopyEdit(context, strategyStage(context), source, edited);
    expect(result.helpfulPosts[0].title).toBe('A caregiver memory requirement checklist 1');
  });

  it('blocks B2B template leakage in consumer-facing discovery copy', () => {
    const context = fixtureContext();
    const source = assetStage(context);
    const edited = JSON.parse(JSON.stringify(source)) as VertexCustomerCopyEdit;
    edited.customerInterviewGuide.lastOccurrenceQuestions[0] =
      'When did this last affect your work, and what did your team use to catch it?';

    expect(() => validateCustomerCopyEdit(context, strategyStage(context), source, edited))
      .toThrow('B2B language in consumer-facing copy');
  });

  it('blocks known generic customer-facing template leakage', () => {
    const context = fixtureContext();
    const source = assetStage(context);
    const edited = JSON.parse(JSON.stringify(source)) as VertexCustomerCopyEdit;
    edited.helpfulPosts[0].body = 'Use this before buying or building a larger solution.';

    expect(() => validateCustomerCopyEdit(context, strategyStage(context), source, edited))
      .toThrow('generic template leakage');
  });

  it('blocks copy edits that change protected prices or numbers', () => {
    const context = fixtureContext();
    const source = assetStage(context);
    const edited = JSON.parse(JSON.stringify(source)) as VertexCustomerCopyEdit;
    edited.offerConversationGuide.pricePresentation =
      edited.offerConversationGuide.pricePresentation.replace('$49', '$59');

    expect(() => validateCustomerCopyEdit(context, strategyStage(context), source, edited))
      .toThrow('changed a protected number');
  });

  it('keeps the exact eight-link contract after relaxing Vertex transport bounds', () => {
    const context = fixtureContext();
    const gate = passingCoherenceGate(context);
    gate.links = gate.links.filter(item => item.link !== 'fulfillment');

    expect(() => validateStrategicCoherenceGate(context, gate))
      .toThrow('must return each of the eight chain links exactly once');
  });

  it('blocks Sprint generation when the buyer or payer link is unresolved', () => {
    const gate = passingCoherenceGate();
    gate.passed = false;
    const buyerPayer = gate.links.find(item => item.link === 'buyer_payer');
    if (!buyerPayer) throw new Error('fixture is missing buyer_payer link');
    buyerPayer.status = 'unresolved';
    buyerPayer.reason = 'The end user is named, but the person who can authorize or pay for the test is not established.';
    gate.blockers.push({
      code: 'BUYER_PAYER_UNRESOLVED',
      link: 'buyer_payer',
      message: 'Do not assume the medication user, caregiver, provider, or family member is the payer.',
      requiredEvidence: 'Name the buyer/payer and the observable commitment that person can authorize.'
    });

    expect(() => assertStrategicCoherenceGate(gate)).toThrow('BUYER_PAYER_UNRESOLVED');
  });

  it('blocks Sprint generation when the proposed test changes the value mechanism', () => {
    const gate = passingCoherenceGate();
    gate.passed = false;
    const test = gate.links.find(item => item.link === 'test');
    if (!test) throw new Error('fixture is missing test link');
    test.status = 'contradictory';
    test.reason = 'The manual proxy introduces a materially different responsibility from the product hypothesis.';
    gate.blockers.push({
      code: 'TEST_VALUE_MECHANISM_MISMATCH',
      link: 'test',
      message: 'The proposed manual service is not a faithful proxy for the product value being tested.',
      requiredEvidence: 'Define a bounded test that exercises the same buyer, value mechanism, and outcome as the proposed product.'
    });

    expect(() => assertStrategicCoherenceGate(gate)).toThrow('TEST_VALUE_MECHANISM_MISMATCH');
  });

  it('rejects a strategy that references an invented channel ID', () => {
    const context = fixtureContext();
    const strategy = strategyStage(context);
    strategy.channelPriorities[0] = 'invented-channel';

    expect(() => applyVertexPipelineDraft(
      context,
      evidenceStage(context),
      strategy,
      assetStage(context)
    )).toThrow('unknown immutable IDs');
  });

  it('fails closed when the independent red-team review reports a blocking defect', () => {
    const context = fixtureContext();
    const redTeam = passingRedTeam();
    redTeam.passed = false;
    redTeam.checks.unsupportedClaims = 'fail';
    redTeam.findings.push({
      code: 'BLOCK_UNSUPPORTED_CLAIM',
      severity: 'blocking',
      field: 'landingPageCopy.headline',
      message: 'The candidate contains an unsupported result claim.'
    });

    expect(() => finalizeLaunchBlueprintVertexPipeline(
      context,
      stageResult('evidence_normalization', evidenceStage(context)),
      stageResult('strategy_synthesis', strategyStage(context)),
      stageResult('strategic_coherence_gate', passingCoherenceGate(context)),
      stageResult('asset_generation', assetStage(context)),
      stageResult('customer_copy_edit', assetStage(context)),
      stageResult('red_team_review', redTeam)
    )).toThrow('red-team gate failed');
  });
});
