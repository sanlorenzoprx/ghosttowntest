import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import {
  CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
  createGhostTownLaunchBlueprintV21,
  validateGhostTownLaunchBlueprintV21
} from '../src/api/launchBlueprintGeneratorV21';
import type { CustomerAccessResearchInput } from '../src/api/launchBlueprintGenerator';

const verdict = {
  resultId: 'v21-fixture',
  generatedAt: '2026-08-06T11:00:00.000Z',
  idea: {
    ideaName: 'Board Game Subscription for Families',
    description: 'Monthly delivery of board games tailored to family size, age range, and preferences.',
    targetUser: 'Families with kids aged 5-15',
    painfulProblem: 'Buying board games is expensive and families do not know which games their children will use.',
    currentAlternative: 'Buying games at stores, borrowing from libraries, and visiting board game cafes.',
    motivation: 'Families want easier game-night choices.'
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
    businessDnaTrap: 'Inventory and fulfillment risk',
    businessDnaWinStrategy: 'Start with a concierge founding-family pilot',
    finalVerdict: 'test_first',
    verdictHeadline: 'Promising family use case, but repeat demand and fulfillment must be tested',
    verdictExplanation: 'Preference fit, recurring use, inventory, shipping, and willingness to pay remain unproven.',
    recommendedNextTest: 'Recruit founding families and ask for a paid first-month commitment before buying broad inventory.',
    doNotBuildUntil: 'Do not buy broad inventory until qualified families pay for a concierge first-month pilot.',
    oneSentenceAdvice: 'Test a manually curated founding-family month before building subscription operations.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

const order: PaidTestOrder = {
  orderId: 'gtt-v21-fixture',
  email: 'founder@example.org',
  verdictId: verdict.resultId,
  status: 'generating',
  artifactType: 'launch_blueprint_v2',
  planVersion: '2.0',
  intake: {
    verdictId: verdict.resultId,
    targetBuyer: 'Families with kids aged 5-15',
    problem: 'Buying board games is expensive and families do not know which games their children will use.',
    currentWorkaround: 'Buying games at stores, borrowing from libraries, and visiting board game cafes.',
    offerHypothesis: 'A manually curated first month with a preference review.',
    expectedPrice: '$49',
    currentStage: 'Idea with customer interviews but no paid pilot',
    geography: 'United States and Puerto Rico',
    landingPageLink: 'https://example.org/family-games',
    customerNotes: 'Three parents described unused games, but no commercial ask has been made.',
    competitorSeeds: [
      {
        seedId: 'seed-1',
        name: 'Example games company',
        website: 'https://example.org',
        domain: 'example.org',
        relationship: 'adjacent_product',
        origin: 'customer_confirmed',
        verifiedAt: '2026-08-06T11:00:00.000Z'
      },
      {
        seedId: 'seed-2',
        name: 'Example game store',
        website: 'https://example.com',
        domain: 'example.com',
        relationship: 'current_alternative',
        origin: 'customer_confirmed',
        verifiedAt: '2026-08-06T11:00:00.000Z'
      }
    ]
  },
  createdAt: '2026-08-06T11:00:00.000Z',
  updatedAt: '2026-08-06T11:00:00.000Z'
};

function completeResearch(): CustomerAccessResearchInput {
  const researchDate = '2026-08-06';
  return {
    status: 'complete',
    researchDate,
    sources: Array.from({ length: 10 }, (_, index) => ({
      sourceId: `source-${index + 1}`,
      title: `Public source ${index + 1}`,
      url: `https://example.org/source-${index + 1}`,
      publisher: 'Fixture publisher',
      accessedAt: `${researchDate}T11:00:00.000Z`,
      supports: [`channel-${index + 1}`]
    })),
    channels: Array.from({ length: 10 }, (_, index) => ({
      channelId: `channel-${index + 1}`,
      community: `Family gaming channel ${index + 1}`,
      platform: index < 5 ? 'Community' : index < 7 ? 'Review site' : 'Creator',
      publicUrl: `https://example.org/channel-${index + 1}`,
      relevance: 'Families publicly discuss game selection, age fit, price, and recurring game-night needs.',
      activity: 'active' as const,
      participationRules: 'Read current rules and do not use unsolicited promotion.',
      recommendedApproach: 'Contribute a useful resource before requesting a customer interview.',
      usefulTopic: 'How families choose games that match age, complexity, and available time.',
      risk: 'Rules and access may change.',
      firstAction: 'Review current discussions and record repeated buyer language.',
      confidence: 'high' as const,
      researchDate,
      sourceIds: [`source-${index + 1}`],
      targetType: index < 5 ? 'community' as const : index < 7 ? 'review_site' as const : 'youtube_creator' as const,
      evidenceRole: index < 5 ? 'customer_access' as const : index < 7 ? 'market_evidence' as const : 'media_pr' as const
    })),
    publicExpertsAndPartners: []
  };
}

describe('GhostTown Launch Blueprint canonical v2.1 generator', () => {
  it('adds the execution and evidence systems required by the canonical contract', () => {
    const blueprint = createGhostTownLaunchBlueprintV21(order, verdict, completeResearch());

    expect(blueprint.status).toBe('ready');
    expect(blueprint.contractVersion).toBe('2.1.1');
    expect(blueprint.generationReceipt.canonicalContract.gitBlobSha1).toBe(CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1);
    expect(blueprint.startingStateAudit.criticalTests).toHaveLength(5);
    expect(blueprint.startingStateAudit.verifiedFacts.some(item => item.statement.includes('$49'))).toBe(true);
    expect(blueprint.businessModelLane.lane).toBe('physical_product');
    expect(blueprint.firstRevenuePath.minimumQualifiedAsks).toBe(5);
    expect(blueprint.firstRevenuePath.firstAsk).toContain('founding-customer');
    expect(blueprint.manualFulfillmentPlan.grossMarginGuardrail).toContain('70%');
    expect(blueprint.launchCard48Hour.firstThreeApproaches).toHaveLength(3);
    expect(blueprint.evidenceHierarchy.strong).toContain('Payment');
    expect(blueprint.evidenceHierarchy.weak).toContain('Likes');
    expect(blueprint.adaptiveCheckpoints.map(item => item.dayNumber)).toEqual([7, 14, 21, 30]);
    expect(blueprint.dailyCalendar).toHaveLength(30);
    expect(blueprint.dailyCalendar.every(day => day.whyItMatters && day.estimatedMinutes > 0 && day.ifThenBranches.length > 0)).toBe(true);
    expect(blueprint.customerInterviewGuide.lastOccurrenceQuestions.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.offerConversationGuide.commitmentRequest).toContain('payment or commitment');
    expect(blueprint.foundingCustomerPilotBrief.proofBoundary).toContain('No fabricated testimonial');
    expect(blueprint.qualityGate.passed).toBe(true);
  });

  it('fails closed when the canonical source hash is changed', () => {
    const blueprint = createGhostTownLaunchBlueprintV21(order, verdict, completeResearch());
    (blueprint.generationReceipt.canonicalContract as { gitBlobSha1: string }).gitBlobSha1 = 'changed-without-evidence-chain';

    const gate = validateGhostTownLaunchBlueprintV21(blueprint);
    expect(gate.passed).toBe(false);
    expect(gate.failures).toContain('Canonical Blueprint hash does not match the approved v2.1 source.');
  });

  it('preserves the existing fail-closed research gate', () => {
    const blueprint = createGhostTownLaunchBlueprintV21(order, verdict, {
      status: 'not_run',
      sources: [],
      channels: [],
      publicExpertsAndPartners: []
    });

    expect(blueprint.status).toBe('failed_quality_gate');
    expect(blueprint.qualityGate.failures).toEqual(expect.arrayContaining([
      'Customer Access Pack must contain 10–25 prioritized channels.',
      'Current customer-access research is incomplete.',
      '48-hour Launch Card must include exactly three first approaches.'
    ]));
  });
});
