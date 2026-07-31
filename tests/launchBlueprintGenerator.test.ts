import { describe, expect, it } from 'vitest';
import { createGhostTownLaunchBlueprint, validateGhostTownLaunchBlueprint, type CustomerAccessResearchInput } from '../src/api/launchBlueprintGenerator';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const verdict = {
  resultId: 'jq4vtc',
  generatedAt: '2026-07-31T12:00:00.000Z',
  idea: {
    ideaName: 'Board Game Subscription for Families',
    description: 'Monthly delivery of new board games tailored to family size, age range, and preferences. Games handpicked by experts.',
    targetUser: 'Families with kids aged 5-15',
    painfulProblem: 'Buying board games is expensive. You do not know which ones your kids will like.',
    currentAlternative: 'Buying games at stores, renting from local libraries, and visiting board game cafes.',
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
    verdictHeadline: 'Promising family-use case, but repeat demand and fulfillment must be tested',
    verdictExplanation: 'The problem is understandable, but preference fit, recurring use, inventory, shipping, and willingness to pay remain unproven.',
    recommendedNextTest: 'Recruit founding families and ask for a paid first-month commitment before buying broad inventory.',
    doNotBuildUntil: 'Do not buy broad inventory until qualified families pay for a concierge first-month pilot.',
    oneSentenceAdvice: 'Test a manually curated founding-family month before building subscription operations.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

const order: PaidTestOrder = {
  orderId: 'gtt_b7948842-65f2-4604-a347-f511277a9377',
  email: 'founder@example.org',
  verdictId: verdict.resultId,
  status: 'generating',
  artifactType: 'execution_plan_30day_v1',
  reportVersion: '1.0',
  planVersion: '1.0',
  intake: {
    verdictId: verdict.resultId,
    targetBuyer: 'Families with kids aged 5-15',
    problem: 'Buying board games is expensive. You do not know which ones your kids will like.',
    currentWorkaround: 'Buying games at stores, renting from local libraries, and visiting board game cafes.'
  },
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z'
};

function completeResearch(): CustomerAccessResearchInput {
  const researchDate = '2026-07-31';
  const sources = Array.from({ length: 10 }, (_, index) => ({
    sourceId: `source-${index + 1}`,
    title: `Public customer channel ${index + 1}`,
    url: `https://example.org/source-${index + 1}`,
    publisher: 'Fixture publisher',
    accessedAt: `${researchDate}T12:00:00.000Z`,
    supports: [`channel-${index + 1}`]
  }));
  const channels = Array.from({ length: 10 }, (_, index) => ({
    channelId: `channel-${index + 1}`,
    community: `Family board-game community ${index + 1}`,
    platform: index < 3 ? 'Reddit' : index < 6 ? 'Facebook' : index < 8 ? 'Association' : 'YouTube',
    publicUrl: `https://example.org/channel-${index + 1}`,
    relevance: 'Public discussions include families evaluating age-appropriate games and recurring game-night ideas.',
    activity: 'active' as const,
    participationRules: 'Read current rules and avoid unsolicited promotion.',
    recommendedApproach: 'Observe, answer questions, and share one helpful resource before requesting interviews.',
    usefulTopic: 'How families choose games that match age, player count, complexity, and play time.',
    risk: 'Spam-sensitive; membership or posting permissions may change.',
    firstAction: 'Review the latest discussions and record repeated questions.',
    confidence: 'high' as const,
    researchDate,
    sourceIds: [`source-${index + 1}`]
  }));
  return {
    status: 'complete',
    researchDate,
    sources,
    channels,
    publicExpertsAndPartners: [
      {
        name: 'Public family gaming organizer',
        role: 'Community organizer',
        publicUrl: 'https://example.org/organizer',
        relevance: 'Publicly discusses family game selection and events.',
        sourceIds: ['source-1']
      }
    ]
  };
}

describe('GhostTown Launch Blueprint v2 generator', () => {
  it('creates a complete business-model-aware Blueprint instead of the old generic task dump', () => {
    const blueprint = createGhostTownLaunchBlueprint(order, verdict, completeResearch());

    expect(blueprint.schemaVersion).toBe('ghosttown-launch-blueprint-v2');
    expect(blueprint.blueprintVersion).toBe('2.0');
    expect(blueprint.status).toBe('ready');
    expect(blueprint.qualityGate).toEqual({ passed: true, failures: [], warnings: [] });
    expect(blueprint.offer.offerName).toContain('Founding Member Pilot');
    expect(blueprint.offer.deliverables.map(item => item.name)).toEqual(expect.arrayContaining([
      'Preference profile',
      'Curated first selection',
      'Use guide',
      'Fit review'
    ]));
    expect(blueprint.offer.initialTestPrice).toBe('$39 founding-member month');
    expect(blueprint.offer.oneSentencePromise).not.toMatch(/a narrow manual pilot that helps/i);
    expect(blueprint.customerAccessPack.channels).toHaveLength(10);
    expect(blueprint.customerAccessPack.helpfulPosts).toHaveLength(5);
    expect(blueprint.customerAccessPack.helpfulPosts.every(post => post.body.length > 180)).toBe(true);
    expect(blueprint.customerAccessPack.outreachScripts).toHaveLength(12);
    expect(blueprint.landingPageCopy.faq.length).toBeGreaterThanOrEqual(6);
    expect(blueprint.launchSite.offer.headline).toBeTruthy();
    expect(blueprint.dailyCalendar).toHaveLength(30);
    expect(blueprint.dailyCalendar[0]).toMatchObject({
      dayNumber: 1,
      title: 'Activate your website draft',
      expectedDeliverable: 'Launch Site Starter version 1.'
    });
    expect(blueprint.dailyCalendar[0].preparedAssets).toEqual(expect.arrayContaining(['Populated Launch Site Starter', 'Landing-page copy']));
    expect(blueprint.dailyCalendar[28].title).toBe('Make the business decision');
    expect(blueprint.dailyCalendar[29].title).toBe('Prepare the next plan');
  });

  it('fails closed when current sourced customer-access research is absent', () => {
    const blueprint = createGhostTownLaunchBlueprint(order, verdict, {
      status: 'not_run',
      sources: [],
      channels: [],
      publicExpertsAndPartners: []
    });

    expect(blueprint.status).toBe('failed_quality_gate');
    expect(blueprint.qualityGate.passed).toBe(false);
    expect(blueprint.qualityGate.failures).toEqual(expect.arrayContaining([
      'Customer Access Pack must contain 10–25 prioritized channels.',
      'Current customer-access research is incomplete.',
      'Research date is missing.',
      'No public research sources were stored.'
    ]));
  });

  it('rejects placeholders and incomplete assets even when the structure exists', () => {
    const blueprint = createGhostTownLaunchBlueprint(order, verdict, completeResearch());
    blueprint.offer.oneSentencePromise = 'A narrow manual pilot that helps the buyer.';
    blueprint.landingPageCopy.faq = [];
    blueprint.dailyCalendar[0].preparedAssets = [];

    const gate = validateGhostTownLaunchBlueprint(blueprint);
    expect(gate.passed).toBe(false);
    expect(gate.failures).toEqual(expect.arrayContaining([
      'Landing-page copy must include at least six objection FAQs.',
      'Every day must include actions, prepared assets, deliverable, measurement, and evidence.',
      'Contains the old generic offer placeholder.'
    ]));
  });
});
