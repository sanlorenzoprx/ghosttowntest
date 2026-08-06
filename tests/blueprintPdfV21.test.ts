import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21';
import {
  CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
  upgradeGhostTownLaunchBlueprintToV21
} from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const verdict = {
  resultId: 'fixture-verdict',
  generatedAt: '2026-08-06T11:00:00.000Z',
  idea: {
    ideaName: 'Family Game Night',
    description: 'Curated family game nights delivered as a founding-customer subscription pilot.',
    targetUser: 'Families with children',
    painfulProblem: 'Choosing games is difficult and purchased games often go unused.',
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

const order = {
  orderId: 'gtt_fixture_12345678',
  email: 'owner@example.com',
  verdictId: verdict.resultId,
  status: 'generating',
  artifactType: 'launch_blueprint_v2',
  planVersion: '2.0',
  intake: {
    verdictId: verdict.resultId,
    targetBuyer: 'Families with children',
    problem: 'Choosing games is difficult and purchased games often go unused.',
    currentWorkaround: 'Buying random games',
    offerHypothesis: 'A manually curated first month.',
    expectedPrice: '$49',
    currentStage: 'Idea with interviews but no paid pilot',
    geography: 'United States and Puerto Rico',
    customerNotes: 'Parents described unused purchases; no paid ask has been made.'
  },
  createdAt: verdict.generatedAt,
  updatedAt: verdict.generatedAt
} as PaidTestOrder;

describe('Launch Blueprint canonical v2.1 PDF', () => {
  it('renders the decision-first v2.1 customer outcome and evidence chain', () => {
    const blueprint = upgradeGhostTownLaunchBlueprintToV21(
      launchBlueprintFixture(),
      order,
      verdict
    );
    expect(blueprint.qualityGate.passed).toBe(true);

    const bytes = renderLaunchBlueprintPdfV21(blueprint);
    const text = new TextDecoder().decode(bytes);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('CANONICAL V2.1');
    expect(text).toContain('48-Hour Launch Card');
    expect(text).toContain('Starting-State and Evidence Audit');
    expect(text).toContain('First-Revenue Path');
    expect(text).toContain('Manual Fulfillment and Economics');
    expect(text).toContain('Adaptive Checkpoint Reviews');
    expect(text).toContain('Behavioral Evidence Hierarchy');
    expect(text).toContain(CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1);
    expect(text).toContain('Every Factory slice must revalidate its exact hash');
    expect(text.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(12);
    expect(bytes.byteLength).toBeGreaterThan(35_000);
  });
});
