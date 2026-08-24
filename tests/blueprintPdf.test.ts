import { describe, expect, it } from 'vitest';
import { renderLaunchBlueprintPdf } from '../src/api/blueprintPdf';
import { createGhostTownLaunchBlueprint } from '../src/api/launchBlueprintGenerator';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { BlueprintSource, CustomerAccessChannel } from '../src/types/launchBlueprint';

const order = {
  orderId: 'gtt_pdf_1',
  email: 'buyer@example.com',
  verdictId: 'verdict_pdf',
  status: 'generating',
  intake: {
    verdictId: 'verdict_pdf',
    targetBuyer: 'Families with children ages 5-15',
    problem: 'Parents buy games their children do not enjoy',
    currentWorkaround: 'Retail stores and recommendations',
    expectedPrice: '$39'
  },
  createdAt: '2026-07-31T12:00:00.000Z',
  updatedAt: '2026-07-31T12:00:00.000Z'
} as PaidTestOrder;

const verdict = {
  resultId: 'verdict_pdf',
  generatedAt: '2026-07-31T12:00:00.000Z',
  idea: {
    ideaName: 'Board Game Subscription for Families',
    description: 'A curated family board-game subscription.',
    targetUser: 'Families with children ages 5-15',
    painfulProblem: 'Parents buy games their children do not enjoy.',
    currentAlternative: 'Retail stores and recommendations.',
    motivation: 'Family game-night experience.'
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
    businessDnaWinStrategy: 'Validate curation first',
    finalVerdict: 'test_first',
    verdictHeadline: 'Test before inventory',
    verdictExplanation: 'Prove the curation promise with founding families.',
    recommendedNextTest: 'Recruit founding families.',
    doNotBuildUntil: 'Families pay for a manual curated pilot.',
    oneSentenceAdvice: 'Sell the outcome first.'
  },
  usedAI: false,
  cacheHit: false,
  answers: {}
} as EvaluationResult;

function research() {
  const channels: CustomerAccessChannel[] = Array.from({ length: 10 }, (_, index) => ({
    channelId: `channel_${index}`,
    community: `Family Game Community ${index + 1}`,
    platform: 'Public forum',
    publicUrl: `https://community${index + 1}.example.com/family-games`,
    relevance: 'Parents discuss family game selection.',
    activity: 'active',
    participationRules: "Rules not confirmed publicly; read the channel's current rules before participating.",
    recommendedApproach: 'Contribute a useful selection checklist.',
    usefulTopic: 'Choosing games for mixed ages.',
    risk: 'Promotion may be restricted.',
    firstAction: 'Read rules and record recurring questions.',
    confidence: 'high',
    researchDate: '2026-07-31',
    sourceIds: [`source_${index}`]
  }));
  const sources: BlueprintSource[] = channels.map((channel, index) => ({
    sourceId: `source_${index}`,
    title: channel.community,
    url: channel.publicUrl,
    publisher: 'example.com',
    accessedAt: '2026-07-31T12:00:00.000Z',
    supports: [`Customer access channel: ${channel.community}`]
  }));
  return { status: 'complete' as const, researchDate: '2026-07-31', channels, sources, publicExpertsAndPartners: [] };
}

describe('Launch Blueprint PDF', () => {
  it('renders a styled multi-page PDF from the canonical Blueprint', () => {
    const blueprint = createGhostTownLaunchBlueprint(order, verdict, research());
    expect(blueprint.qualityGate.passed).toBe(true);

    const bytes = renderLaunchBlueprintPdf(blueprint);
    const text = new TextDecoder().decode(bytes);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('GHOSTTOWN LAUNCH BLUEPRINT');
    expect(text).toContain('Customer Access Pack');
    expect(text).toContain('Day 1:');
    expect(text).toContain('Public research sources');
    expect(bytes.byteLength).toBeGreaterThan(25_000);
    expect(text.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(10);
  });
});
