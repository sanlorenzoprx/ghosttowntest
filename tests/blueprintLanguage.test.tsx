import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const captured = vi.hoisted(() => ({ instructions: [] as string[] }));
vi.mock('../src/api/generativeAIService', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/api/generativeAIService')>()),
  generateAIJson: async (_env: unknown, options: { systemInstruction?: string }) => {
    captured.instructions.push(options.systemInstruction || '');
    throw new Error('fixture stops after capturing the instruction');
  }
}));

const { blueprintLanguages, blueprintLanguageInstruction } = await import('../src/lib/blueprintLanguage');
const { upgradeGhostTownLaunchBlueprintToV21 } = await import('../src/api/launchBlueprintGeneratorV21');
const { createLaunchBlueprintVertexContext, runVertexAssetGenerationStage, runVertexStrategySynthesisStage } = await import('../src/api/launchBlueprintVertexPipeline');
const { default: LanguageChoices } = await import('../src/components/LanguageChoices');

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

function contextFor(intake: Partial<PaidTestOrder['intake']>) {
  const sprintOrder = { ...order, intake: { ...order.intake, ...intake } } as PaidTestOrder;
  const blueprint = upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), sprintOrder, verdict);
  const research = {
    research: { status: 'complete', researchDate: '2026-10-20', sources: blueprint.sources, channels: blueprint.customerAccessPack.channels, publicExpertsAndPartners: blueprint.customerAccessPack.publicExpertsAndPartners },
    receipt: {}
  } as unknown as Parameters<typeof createLaunchBlueprintVertexContext>[2];
  return { blueprint, context: createLaunchBlueprintVertexContext(sprintOrder, verdict as EvaluationResult, research, blueprint) };
}

describe('Sprint languages', () => {
  it('defaults to English for both the founder and the buyers', () => {
    expect(blueprintLanguages(undefined)).toEqual({ founder: 'en', buyer: 'en' });
    expect(blueprintLanguages({ founderLanguage: 'fr', buyerLanguage: 'es' })).toEqual({ founder: 'en', buyer: 'es' });
  });

  it('records both languages in the starting-state audit', () => {
    const { blueprint } = contextFor({ founderLanguage: 'es', buyerLanguage: 'en' });
    expect(blueprint.startingStateAudit.founderConstraints.language.statement).toBe('The founder reads the plan in Spanish. Messages, posts and pages for buyers are written in English.');
    expect(blueprint.startingStateAudit.founderConstraints.language.truthLabel).toBe('Verified');
    const legacy = contextFor({});
    expect(legacy.blueprint.startingStateAudit.founderConstraints.language.statement).toMatch(/not supplied/);
  });

  it('tells the strategy and asset stages which language each reader gets, and to explain why', async () => {
    const { context } = contextFor({ founderLanguage: 'es', buyerLanguage: 'en' });
    captured.instructions = [];
    await expect(runVertexStrategySynthesisStage({} as never, context, { verifiedEvidenceIds: [], inferenceEvidenceIds: [], missingEvidence: ['x'], criticalAssumptions: [], packetSummary: 'x' } as never)).rejects.toThrow();
    await expect(runVertexAssetGenerationStage({} as never, context, {} as never)).rejects.toThrow();
    expect(captured.instructions).toHaveLength(2);
    for (const instruction of captured.instructions) {
      expect(instruction).toContain('Write everything the founder reads (decisions, daily actions, why it matters, guidance, checkpoints, fulfillment notes) in Spanish');
      expect(instruction).toContain('posts, outreach messages, interview and offer questions, landing-page copy, emails) in English');
      expect(instruction).toContain('Explain why it matters.');
      // Written plans explain why without a chat-style offer inside a static field.
      expect(instruction).not.toContain('Want me to walk you through');
    }
  });

  it('describes Spanish as Puerto Rico–friendly and keeps quotes and facts unchanged', () => {
    const text = blueprintLanguageInstruction({ founder: 'en', buyer: 'es' });
    expect(text).toContain('Spanish (Puerto Rico–friendly, informal tú)');
    expect(text).toContain('Customer quotes stay in their original words.');
  });

  it('asks the founder for both languages, in their own language', () => {
    const es = renderToStaticMarkup(<LanguageChoices locale="es" founderLanguage="es" buyerLanguage="en" onFounderLanguage={() => {}} onBuyerLanguage={() => {}} />);
    expect(es).toContain('¿En qué idioma quieres tu plan?');
    expect(es).toContain('¿Qué idioma hablan tus clientes?');
    const en = renderToStaticMarkup(<LanguageChoices founderLanguage="en" buyerLanguage="es" onFounderLanguage={() => {}} onBuyerLanguage={() => {}} />);
    expect(en).toContain('Which language do your customers speak?');
  });
});
