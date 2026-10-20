import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { CommunityProblemResearch } from '../src/types/communityResearch';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const captured = vi.hoisted(() => ({ prompts: [] as string[] }));
vi.mock('../src/api/generativeAIService', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/api/generativeAIService')>()),
  generateAIJson: async (_env: unknown, options: { prompt: string }) => {
    captured.prompts.push(options.prompt);
    throw new Error('fixture stops after capturing the prompt');
  }
}));

const { upgradeGhostTownLaunchBlueprintToV21 } = await import('../src/api/launchBlueprintGeneratorV21');
const { buildBlueprintAssetFiles } = await import('../src/api/blueprintAssets');
const { composeBlueprintDocumentModel, validateBlueprintDocumentAgainstCanonical } = await import('../src/api/blueprintDocumentModel');
const { createLaunchBlueprintVertexContext, runVertexAssetGenerationStage } = await import('../src/api/launchBlueprintVertexPipeline');
const { default: CommunityResearchCards } = await import('../src/components/CommunityResearchCards');
const { COMMUNITY_RESEARCH_BOUNDARY } = await import('../src/api/communityProblemResearch');

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

function blueprintWithResearch() {
  const blueprint = upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), order, verdict);
  const channel = blueprint.customerAccessPack.channels[0];
  const communityResearch: CommunityProblemResearch = {
    version: 'ghosttown-community-problem-research-v1',
    researchedAt: '2026-10-20T00:00:00.000Z',
    status: 'partial',
    boundary: COMMUNITY_RESEARCH_BOUNDARY,
    problems: [{
      problemId: 'p1', title: 'Games nobody plays after one night', category: 'price', who: 'Parents of young kids', when: 'After buying a new game',
      currentWorkaround: 'Put a movie on instead', observationIds: ['obs_1'], contradictingObservationIds: ['obs_2'], channelIds: [channel.channelId],
      strength: 'one_mention', whatToAskNext: 'Ask a parent about the last game they bought that nobody played.',
      whatWouldChangePlan: 'If parents say one favorite game is enough, reconsider the offer.', evidenceLevel: 'problem_evidence'
    }],
    observations: [
      { observationId: 'obs_1', problemId: 'p1', stance: 'supports', channelId: channel.channelId, community: channel.community, url: channel.publicUrl, quote: 'We spent $60 last month on two games nobody plays.', kind: 'complaint' },
      { observationId: 'obs_2', problemId: 'p1', stance: 'contradicts', channelId: channel.channelId, community: channel.community, url: channel.publicUrl, quote: 'we just play Uno every week and the kids love it', kind: 'alternative' }
    ],
    styles: [{ channelId: channel.channelId, community: channel.community, url: channel.publicUrl, howPeopleTalk: 'Short and practical.', formatThatFits: 'A list of games by age.', promotionRule: 'not_allowed', promotionEvidence: 'No self-promotion.' }],
    gaps: [{ channelId: 'gap-1', community: 'Closed parents group', url: 'https://closed.example/group', reason: 'GhostTown could not read this page: Original source returned HTTP 403' }]
  };
  return { ...blueprint, communityResearch };
}

describe('customer problems reach the founder', () => {
  it('shows each problem with its quotes, what to ask, what we prepared, and what would change the plan', () => {
    const blueprint = blueprintWithResearch();
    const html = renderToStaticMarkup(<CommunityResearchCards blueprint={blueprint} onCopy={() => {}} />);
    expect(html).toContain('Games nobody plays after one night');
    expect(html).toContain('We spent $60 last month on two games nobody plays.');
    expect(html).toContain(`href="${blueprint.customerAccessPack.channels[0].publicUrl}"`);
    expect(html).toContain('What argues against it');
    expect(html).toContain('What to ask next');
    expect(html).toContain('What we prepared');
    expect(html).toContain('Interview guide');
    expect(html).toContain(blueprint.customerInterviewGuide.opening.replace(/'/g, '&#x27;').slice(0, 30));
    expect(html).toContain('What would change the plan');
    expect(html).toContain('No promotion');
    expect(html).toContain('Research gaps');
    expect(html).toContain('HTTP 403');
    expect(html).toContain('do not show that anyone will buy');
  });

  it('shows the card in Spanish', () => {
    const html = renderToStaticMarkup(<CommunityResearchCards blueprint={blueprintWithResearch()} onCopy={() => {}} locale="es" />);
    for (const label of ['Con qué batalla la gente', 'Qué preguntar ahora', 'Lo que preparamos', 'Guía de entrevistas', 'Qué cambiaría el plan', 'Vacíos de investigación', 'Sin promoción', 'Copiar']) {
      expect(html, label).toContain(label);
    }
    expect(html).not.toContain('What to ask next');
  });

  it('renders nothing for a Blueprint made before community research', () => {
    const blueprint = upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), order, verdict);
    expect(renderToStaticMarkup(<CommunityResearchCards blueprint={blueprint} onCopy={() => {}} />)).toBe('');
  });

  it('puts the same problems in the PDF document and the ZIP without changing the file list', () => {
    const blueprint = blueprintWithResearch();
    const model = composeBlueprintDocumentModel(blueprint);
    expect(validateBlueprintDocumentAgainstCanonical(model, blueprint)).toEqual([]);
    const section = model.supportingSections.find(item => item.sectionId === 'customer_problems')!;
    expect(section.content.join('\n')).toContain('"We spent $60 last month on two games nobody plays."');
    expect(section.content.join('\n')).toContain('Research gap: Closed parents group');

    const files = buildBlueprintAssetFiles(blueprint, new Uint8Array([37, 80, 68, 70]));
    expect(files).toHaveLength(16);
    const posts = new TextDecoder().decode(files.find(file => file.name.endsWith('helpful-posts.md'))!.data);
    expect(posts.startsWith('# What your likely customers are struggling with')).toBe(true);
    expect(posts).toContain('> "We spent $60 last month on two games nobody plays."');
    expect(posts).toContain('# Helpful posts');
  });

  it('gives the asset stage the customers\' words so posts, messages and website copy use them', async () => {
    const blueprint = blueprintWithResearch();
    const research = {
      research: { status: 'complete', researchDate: '2026-10-20', sources: blueprint.sources, channels: blueprint.customerAccessPack.channels, publicExpertsAndPartners: blueprint.customerAccessPack.publicExpertsAndPartners },
      receipt: {}
    } as unknown as Parameters<typeof createLaunchBlueprintVertexContext>[2];
    const context = createLaunchBlueprintVertexContext(order, verdict, research, blueprint);
    captured.prompts = [];
    await expect(runVertexAssetGenerationStage({} as never, context, {} as never)).rejects.toThrow();
    const prompt = JSON.parse(captured.prompts[0]);
    expect(prompt.customerResearch.problems[0].customerWords).toEqual(['We spent $60 last month on two games nobody plays.']);
    expect(prompt.customerResearch.communities[0].promotionRule).toBe('not_allowed');
  });
});
