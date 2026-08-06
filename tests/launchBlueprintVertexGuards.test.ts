import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { LaunchBlueprintVertexContext } from '../src/api/launchBlueprintVertexPipeline';
import {
  assertVertexEvidenceClassification,
  synchronizeVertexBlueprintSurfaces
} from '../src/api/launchBlueprintVertexGuards';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

function fixtureVerdict(): EvaluationResult {
  return {
    resultId: 'fixture-verdict',
    generatedAt: '2026-08-06T21:00:00.000Z',
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
      geography: 'United States and Puerto Rico'
    },
    createdAt: '2026-08-06T21:00:00.000Z',
    updatedAt: '2026-08-06T21:00:00.000Z'
  };
}

describe('Vertex Blueprint contract guards', () => {
  it('prevents an inferred or missing item from being promoted into verified facts', () => {
    const context = {
      evidenceCatalog: [
        {
          evidenceId: 'verified-1',
          statement: 'The founder supplied a target buyer.',
          truthLabel: 'Verified',
          source: 'customer_input',
          sourceIds: []
        },
        {
          evidenceId: 'inferred-1',
          statement: 'The lane appears manually testable.',
          truthLabel: 'Inferred',
          source: 'system_inference',
          sourceIds: []
        },
        {
          evidenceId: 'missing-1',
          statement: 'Payment evidence is missing.',
          truthLabel: 'Test',
          source: 'missing_input',
          sourceIds: []
        }
      ]
    } as unknown as LaunchBlueprintVertexContext;

    expect(() => assertVertexEvidenceClassification(context, {
      packetSummary: 'Fixture',
      verifiedEvidenceIds: ['inferred-1'],
      inferenceEvidenceIds: [],
      missingEvidence: ['Payment evidence is missing.'],
      criticalAssumptions: []
    })).toThrow('promote non-verified evidence');

    expect(() => assertVertexEvidenceClassification(context, {
      packetSummary: 'Fixture',
      verifiedEvidenceIds: ['verified-1'],
      inferenceEvidenceIds: ['missing-1'],
      missingEvidence: ['Payment evidence is missing.'],
      criticalAssumptions: []
    })).toThrow('must reference evidence already labeled Inferred');
  });

  it('derives every customer-facing surface from the same validated strategy record', () => {
    const blueprint = upgradeGhostTownLaunchBlueprintToV21(
      launchBlueprintFixture(),
      fixtureOrder(),
      fixtureVerdict()
    );
    blueprint.offer.offerName = 'Founding Family Fit Pilot';
    blueprint.offer.targetCustomer = 'Families with children who bought an unsuitable game recently';
    blueprint.offer.painfulProblem = 'Families pay for games that do not fit age, complexity, or available time.';
    blueprint.offer.initialTestPrice = '$49';
    blueprint.executiveDecision.recommendedInitialCustomer = blueprint.offer.targetCustomer;
    blueprint.manualFulfillmentPlan.expectedDeliveryTime = 'A first useful recommendation within three business days.';
    blueprint.firstRevenuePath.firstBuyer = 'stale buyer';
    blueprint.firstRevenuePath.firstPrice = '$1';
    blueprint.landingPageCopy.targetCustomerCallout = 'stale customer';
    blueprint.launchSite.offer.price = '$1';
    blueprint.launchSite.problem.summary = 'stale problem';

    const synchronized = synchronizeVertexBlueprintSurfaces(blueprint);

    expect(synchronized.firstRevenuePath.firstBuyer).toBe(
      synchronized.executiveDecision.recommendedInitialCustomer
    );
    expect(synchronized.firstRevenuePath.firstPrice).toBe(synchronized.offer.initialTestPrice);
    expect(synchronized.landingPageCopy.targetCustomerCallout).toBe(
      `For ${synchronized.offer.targetCustomer}`
    );
    expect(synchronized.launchSite.offer.offerName).toBe(synchronized.offer.offerName);
    expect(synchronized.launchSite.offer.price).toBe(synchronized.offer.initialTestPrice);
    expect(synchronized.launchSite.offer.timeToFirstValue).toBe(
      synchronized.manualFulfillmentPlan.expectedDeliveryTime
    );
    expect(synchronized.launchSite.problem.summary).toBe(synchronized.offer.painfulProblem);
    expect(synchronized.launchSite.solution.deliverables).toEqual(
      synchronized.landingPageCopy.deliverables
    );
    expect(synchronized.foundingCustomerPilotBrief.price).toBe(
      synchronized.offer.initialTestPrice
    );
    expect(synchronized.launchCard48Hour.firstCustomer).toBe(
      synchronized.executiveDecision.recommendedInitialCustomer
    );
    expect(synchronized.qualityGate.passed).toBe(true);
  });
});
