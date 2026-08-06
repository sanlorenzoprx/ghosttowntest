import { createGhostTownLaunchBlueprint, type CustomerAccessResearchInput } from '../../src/api/launchBlueprintGenerator';
import type { EvaluationResult } from '../../src/types/lit';
import type { PaidTestOrder } from '../../src/types/paidTest';

export function launchBlueprintFixture() {
  const verdict = {
    resultId: 'fixture-verdict', generatedAt: '2026-07-31T12:00:00.000Z',
    idea: { ideaName: 'Family Game Night', description: 'Curated family game nights.', targetUser: 'Families with children', painfulProblem: 'Choosing games is difficult.', currentAlternative: 'Buying random games', motivation: 'Firsthand experience' },
    deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'subscription', businessDnaTrap: 'Inventory risk', businessDnaWinStrategy: 'Concierge pilot', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Demand is not yet proven.', recommendedNextTest: 'Sell a pilot.', doNotBuildUntil: 'A family pays.', oneSentenceAdvice: 'Sell before stocking.' }, usedAI: false, cacheHit: false, answers: {}
  } as EvaluationResult;
  const order = {
    orderId: 'gtt_fixture_12345678', email: 'founder@fixture.test', verdictId: verdict.resultId, status: 'generating', artifactType: 'launch_blueprint_v2', reportVersion: '1.0', planVersion: '2.0',
    intake: { verdictId: verdict.resultId, targetBuyer: 'Families with children', problem: 'Choosing games is difficult.', currentWorkaround: 'Buying random games' },
    createdAt: verdict.generatedAt, updatedAt: verdict.generatedAt
  } as PaidTestOrder;
  const researchDate = '2026-07-31';
  const research: CustomerAccessResearchInput = {
    status: 'complete', researchDate,
    sources: Array.from({ length: 10 }, (_, index) => ({ sourceId: `source-${index}`, title: `Source ${index}, "quoted"`, url: `https://example.com/source-${index}`, publisher: 'Fixture', accessedAt: `${researchDate}T12:00:00.000Z`, supports: [`channel-${index}`] })),
    channels: Array.from({ length: 10 }, (_, index) => ({ channelId: `channel-${index}`, community: `Community ${index}`, platform: index < 3 ? 'Podcast' : index < 6 ? 'YouTube' : 'Publication', publicUrl: `https://example.com/channel-${index}`, relevance: 'Families discuss game selection and purchases.', activity: 'active', participationRules: 'Read current rules.', recommendedApproach: 'Contribute before pitching.', usefulTopic: 'Choosing a family game.', risk: 'Rules can change.', firstAction: 'Read recent discussions.', confidence: 'high', researchDate, sourceIds: [`source-${index}`], targetType: index < 3 ? 'podcast' : index < 6 ? 'youtube_creator' : 'newsletter_or_publication' })) as CustomerAccessResearchInput['channels'],
    publicExpertsAndPartners: [{ name: 'Fixture organizer', role: 'Organizer', publicUrl: 'https://example.com/organizer', relevance: 'Runs family game events.', sourceIds: ['source-0'] }]
  };
  const blueprint = createGhostTownLaunchBlueprint(order, verdict, research);
  blueprint.status = 'ready';
  blueprint.qualityGate = { passed: true, failures: [], warnings: [] };
  return blueprint;
}