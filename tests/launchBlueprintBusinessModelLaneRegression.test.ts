import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const generatedAt = '2026-08-17T11:45:00.000Z';

describe('Launch Blueprint business-model lane precedence', () => {
  it('treats media language as distribution when explicit SaaS mechanics are present', () => {
    const verdict = {
      resultId: 'hybrid-newsletter-saas',
      generatedAt,
      idea: {
        ideaName: 'Longevity AI',
        description: 'Newsletter educating women 40+ using AI and the developing field of longevity, with a backend SaaS product once the workflow niche is validated.',
        targetUser: 'Women 40+',
        painfulProblem: 'A glut of longevity information makes it difficult to separate actionable guidance from fluff.',
        currentAlternative: 'General search',
        motivation: 'Make longevity research more actionable.'
      },
      deterministicScores: {
        ghostTownScore: 4,
        ghostTownRisk: 'medium',
        leverageScore: 4,
        insightScore: 4,
        timingScore: 4,
        litScore: 4,
        litBand: 'promising',
        highWallsScore: 3,
        highWallsBand: 'moderate',
        businessDnaType: 'saas',
        businessDnaTrap: 'Building software before validating the workflow.',
        businessDnaWinStrategy: 'Validate one assisted workflow before productizing it.',
        finalVerdict: 'test_first',
        verdictHeadline: 'Test the workflow before building the backend.',
        verdictExplanation: 'The newsletter can attract attention, but the commercial product is a SaaS workflow.',
        recommendedNextTest: 'Sell one manually assisted workflow pilot.',
        doNotBuildUntil: 'A qualified buyer commits to the workflow.',
        oneSentenceAdvice: 'Use content for access, but validate the SaaS workflow as the commercial model.'
      },
      usedAI: false,
      cacheHit: false,
      answers: {}
    } as EvaluationResult;

    const order = {
      orderId: 'gtt-hybrid-newsletter-saas',
      email: 'fixture@example.org',
      verdictId: verdict.resultId,
      status: 'generating',
      artifactType: 'launch_blueprint_v2',
      planVersion: '2.0',
      intake: {
        verdictId: verdict.resultId,
        targetBuyer: 'Women 40+',
        problem: 'A glut of longevity information makes it difficult to separate actionable guidance from fluff.',
        currentWorkaround: 'General search',
        offerHypothesis: '',
        competitorSeeds: []
      },
      createdAt: generatedAt,
      updatedAt: generatedAt,
      paidAt: generatedAt
    } as PaidTestOrder;

    const blueprint = upgradeGhostTownLaunchBlueprintToV21(
      launchBlueprintFixture(),
      order,
      verdict
    );

    expect(blueprint.businessModelLane.lane).toBe('saas');
    expect(blueprint.businessModelLane.firstMeaningfulTest).toContain('concierge workflow');
    expect(blueprint.firstRevenuePath.firstOfferFormat).toBe(blueprint.businessModelLane.firstMeaningfulTest);
    expect(blueprint.startingStateAudit.inferences.some(item => item.statement.includes('recommended execution lane is saas'))).toBe(true);
  });

  it('still uses creator/media when no more specific commercial model is present', () => {
    const verdict = {
      resultId: 'pure-newsletter',
      generatedAt,
      idea: {
        ideaName: 'Longevity Brief',
        description: 'A paid newsletter and podcast for women 40+ with curated longevity analysis and sponsor-supported media.',
        targetUser: 'Women 40+',
        painfulProblem: 'Longevity information is noisy and hard to prioritize.',
        currentAlternative: 'General search',
        motivation: 'Curate trustworthy media.'
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
        businessDnaType: 'creator',
        businessDnaTrap: 'Chasing views instead of buyer commitment.',
        businessDnaWinStrategy: 'Test subscriber or sponsor commitment.',
        finalVerdict: 'test_first',
        verdictHeadline: 'Test audience quality.',
        verdictExplanation: 'Audience monetization is not yet proven.',
        recommendedNextTest: 'Ask for a paid subscriber or sponsor action.',
        doNotBuildUntil: 'A qualified audience takes a meaningful action.',
        oneSentenceAdvice: 'Test audience commitment before increasing publishing volume.'
      },
      usedAI: false,
      cacheHit: false,
      answers: {}
    } as EvaluationResult;

    const order = {
      orderId: 'gtt-pure-newsletter',
      email: 'fixture@example.org',
      verdictId: verdict.resultId,
      status: 'generating',
      artifactType: 'launch_blueprint_v2',
      planVersion: '2.0',
      intake: {
        verdictId: verdict.resultId,
        targetBuyer: 'Women 40+',
        problem: 'Longevity information is noisy and hard to prioritize.',
        currentWorkaround: 'General search',
        offerHypothesis: '',
        competitorSeeds: []
      },
      createdAt: generatedAt,
      updatedAt: generatedAt,
      paidAt: generatedAt
    } as PaidTestOrder;

    const blueprint = upgradeGhostTownLaunchBlueprintToV21(
      launchBlueprintFixture(),
      order,
      verdict
    );

    expect(blueprint.businessModelLane.lane).toBe('creator_or_media');
    expect(blueprint.businessModelLane.firstMeaningfulTest).toContain('subscriber action');
  });
});
