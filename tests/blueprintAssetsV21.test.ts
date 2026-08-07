import { describe, expect, it } from 'vitest';
import { BLUEPRINT_ASSET_FILENAMES, buildBlueprintAssetFiles } from '../src/api/blueprintAssets';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const verdict = {
  resultId: 'fixture-verdict-assets-v21',
  generatedAt: '2026-08-07T11:00:00.000Z',
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
  orderId: 'gtt_assets_v21_12345678',
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

function text(files: ReturnType<typeof buildBlueprintAssetFiles>, suffix: string) {
  const file = files.find(item => item.name.endsWith(suffix));
  expect(file, suffix).toBeTruthy();
  return new TextDecoder().decode(file!.data);
}

describe('stable v2.1.1 asset package', () => {
  it('keeps all sixteen files enriched with the current v2.1 operating system', () => {
    const blueprint = upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), order, verdict);
    expect(blueprint.contractVersion).toBe('2.1.1');

    const files = buildBlueprintAssetFiles(blueprint, new Uint8Array([37, 80, 68, 70]));
    expect(files).toHaveLength(16);
    expect(files.map(file => file.name.replace('ghosttown-launch-blueprint/', ''))).toEqual(BLUEPRINT_ASSET_FILENAMES);

    expect(text(files, 'README.md')).toContain('contract 2.1.1');
    expect(text(files, 'executive-summary.md')).toContain('48-Hour Launch Card');
    expect(text(files, 'executive-summary.md')).toContain('Contract version: 2.1.1');
    expect(text(files, 'offer-and-pricing.md')).toContain('First-Revenue Path');
    expect(text(files, 'offer-and-pricing.md')).toContain('Manual Fulfillment and Economics');
    expect(text(files, 'weekly-milestones.md')).toContain('Adaptive Evidence Checkpoints');
    expect(text(files, 'decision-rules.md')).toContain('Behavioral Evidence Hierarchy');

    const canonical = JSON.parse(text(files, 'blueprint.json')) as { contractVersion?: string; blueprintVersion?: string };
    expect(canonical).toMatchObject({ blueprintVersion: '2.1', contractVersion: '2.1.1' });
  });
});
