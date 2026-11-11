import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkoutAccessibilityBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';
import {
  buildExecutionRagContext,
  evaluateExecutionInteraction,
  executionLaneProfile,
  formalCheckpointBranch,
  routeExecutionCapability,
  type ExecutionProgressLike
} from '../src/lib/blueprintExecutionIntelligence';
import { generativeTaskForExecutionCapability } from '../src/api/executionAIService';

function progress(overrides: Partial<ExecutionProgressLike> = {}): ExecutionProgressLike {
  return {
    completedDays: [], evidenceNotes: {}, evidenceLedger: [], checkpointReviews: [],
    metrics: { outreachSent: 0, replies: 0, interviews: 0, qualifiedConversations: 0, commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0, leads: 0 },
    ...overrides
  };
}

describe('GhostTown execution intelligence', () => {
  it('keeps seven lane profiles commercially distinct while preserving one evidence spine', () => {
    expect(executionLaneProfile('saas').commitmentMechanism).toContain('design partner');
    expect(executionLaneProfile('physical_product').commitmentMechanism).toContain('preorder');
    expect(executionLaneProfile('marketplace').firstCommercialProof).toContain('buyer/provider');
    expect(executionLaneProfile('local_business').commitmentMechanism).toContain('appointment');
    expect(executionLaneProfile('creator_or_media').firstCommercialProof).toContain('commercial action');
    expect(executionLaneProfile('digital_product').commitmentMechanism).toContain('presale');
    expect(executionLaneProfile('service_or_consulting').fulfillmentProof).toContain('bounded service');
  });

  it('turns a checkpoint constraint into a formal one-variable branch', () => {
    const branch = formalCheckpointBranch(progress({
      completedDays: [1, 2, 3, 4, 5, 6, 7],
      checkpointReviews: [{
        dayNumber: 7,
        completedAt: '2026-08-18T12:00:00.000Z',
        evidenceSummary: 'Ten qualified messages produced no replies.',
        strongestEvidence: 'early',
        primaryConstraint: 'access',
        nextAction: 'Test a second verified access path.'
      }]
    }), 8);
    expect(branch.route).toBe('revise_access');
    expect(branch.mayChange).toEqual(['access']);
    expect(branch.mustKeep).toContain('customer');
    expect(branch.mustKeep).toContain('problem');
    expect(branch.mustKeep).toContain('offer');
    expect(branch.mustKeep).toContain('price');
  });

  it('uses the Day 30 named constraint for continue-with-revision instead of assuming an offer change', () => {
    const branch = formalCheckpointBranch(progress({
      finalDecision: 'continue_with_revision',
      metrics: { commitments: 2, revenueCents: 50000 },
      checkpointReviews: [{
        dayNumber: 30,
        completedAt: '2026-08-18T12:00:00.000Z',
        evidenceSummary: 'Buyers paid, but the current price produced repeated margin pressure.',
        strongestEvidence: 'strong',
        primaryConstraint: 'price',
        nextAction: 'Run one bounded price test while keeping the customer, problem, access path, and offer fixed.'
      }]
    }), 30);
    expect(branch.source).toBe('final_decision');
    expect(branch.route).toBe('revise_price');
    expect(branch.mayChange).toEqual(['price']);
    expect(branch.mustKeep).toContain('offer');
    expect(branch.mustKeep).toContain('customer');
  });

  it('pauses rather than fabricating a change when a checkpoint records no evidence', () => {
    const branch = formalCheckpointBranch(progress({
      checkpointReviews: [{
        dayNumber: 14,
        completedAt: '2026-08-18T12:00:00.000Z',
        evidenceSummary: 'The founder did not complete enough qualified conversations.',
        strongestEvidence: 'none',
        primaryConstraint: 'none',
        nextAction: 'Collect the missing conversation evidence.'
      }]
    }), 14);
    expect(branch.route).toBe('pause_missing_evidence');
    expect(branch.mayChange).toEqual([]);
  });

  it('retrieves the active daily packet, current-day evidence, lane, assets and checkpoint state', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const state = progress({
      completedDays: [1, 2, 3],
      evidenceLedger: [{
        entryId: 'day4-result', actionId: 'action-day-04-send-discovery-v1', date: '2026-08-18',
        contactOrChannel: 'Qualified ecommerce operator', action: 'Sent discovery message', response: 'Uses a generic scanner today.',
        customerLanguage: 'We still catch checkout issues late.', alternativeMentioned: 'Generic scanner', evidenceStrength: 'early'
      }]
    });
    const context = buildExecutionRagContext(blueprint, state, 4, 'What did the customer say about the current scanner?');
    expect(context.schemaVersion).toBe('ghosttown-execution-context-v1');
    expect(context.experiment.dayNumber).toBe(4);
    expect(context.experiment.assets[0].title).toContain('Discovery');
    expect(context.progress.relevantEvidence.some(entry => entry.entryId === 'day4-result')).toBe(true);
    expect(context.blueprint.laneProfile.lane).toBe(blueprint.businessModelLane.lane);
    expect(context.immutableRules.join(' ')).toContain('Recorded customer behavior outranks model opinion');
  });

  it('applies the same Sprint boundary to a founder who writes in Spanish', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const context = buildExecutionRagContext(blueprint, progress(), 1, '');

    for (const question of [
      '¿Qué exactamente debo hacer hoy?',
      '¿Qué pruebas me faltan por anotar?',
      'Explícame qué cuenta hoy como éxito y qué cuenta como fallo.',
      '¿Lo que encontré contradice el plan?',
      '¿Quiénes son mis competidores?'
    ]) {
      const gate = evaluateExecutionInteraction(question, context);
      expect(gate.allowed, question).toBe(true);
      expect(gate.externalResearchRequested, question).toBe(false);
    }

    const research = evaluateExecutionInteraction('Busca información actual del mercado solo si ayuda de forma directa a la decisión del Día 1 de mi Sprint.', context);
    expect(research.allowed).toBe(true);
    expect(research.externalResearchRequested).toBe(true);
    expect(research.externalResearchAllowed).toBe(true);
    expect(research.externalResearchReason).toBe('sprint_relevant');

    const unrelated = evaluateExecutionInteraction('Busca en la web lo último de los resultados de fútbol y el clima en Tokio.', context);
    expect(unrelated.allowed).toBe(false);
    expect(unrelated.externalResearchRequested).toBe(true);
    expect(unrelated.externalResearchAllowed).toBe(false);
    expect(unrelated.externalResearchReason).toBe('out_of_scope');

    const untethered = evaluateExecutionInteraction('Investiga fósiles de dinosaurios.', context);
    expect(untethered.externalResearchAllowed).toBe(false);
  });

  it('gives the Spanish Coach prompts the same boundary result as the English ones', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const context = buildExecutionRagContext(blueprint, progress(), 4, '');
    const read = (name: string) => readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8');
    const prompts = (source: string, key: string) => [...source.matchAll(new RegExp(`${key}: day => \`([^\`]+)\``, 'g'))]
      .map(match => match[1].replace('${day}', '4'));
    const cases: Array<[string, string]> = [
      ['LaunchBlueprintExecutionHomeV21.tsx', 'coachReviewPrompt'],
      ['LaunchBlueprintExecutionHomeV21.tsx', 'coachCheckpointPrompt'],
      ['LaunchBlueprintCopilotV21.tsx', 'marketPrompt'],
      ['LaunchBlueprintCopilotV21.tsx', 'reviewPrompt']
    ];
    for (const [file, key] of cases) {
      const [en, es] = prompts(read(file), key);
      expect(en, `${key} en`).toBeTruthy();
      expect(es, `${key} es`).toBeTruthy();
      expect(es).not.toBe(en);
      const enGate = evaluateExecutionInteraction(en, context);
      const esGate = evaluateExecutionInteraction(es, context);
      expect(enGate.allowed, key).toBe(true);
      expect({ allowed: esGate.allowed, requested: esGate.externalResearchRequested, researchAllowed: esGate.externalResearchAllowed }, key)
        .toEqual({ allowed: enGate.allowed, requested: enGate.externalResearchRequested, researchAllowed: enGate.externalResearchAllowed });
    }
  });

  it('writes the fixed Sprint boundary answers in the founder’s language', () => {
    const api = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
    expect(api).toContain("SPRINT_BOUNDARY_COPY[record.blueprint.languages?.founder === 'es' ? 'es' : 'en']");
    expect(api).toContain('Estoy aquí para ayudarte con tu Sprint de 30 días.');
    expect(api).toContain('Solo puedo buscar información de afuera cuando ayuda de forma directa');
    const copilot = readFileSync(new URL('../src/components/LaunchBlueprintCopilotV21.tsx', import.meta.url), 'utf8');
    expect(copilot).toContain('Búsqueda de afuera bloqueada');
    expect(copilot).toContain('Límite del Sprint');
    const home = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
    expect(home).toContain('Pídele a GhostTown que evalúe el chequeo');
    expect(home).toContain('Tu día está guardado.');
  });

  it('keeps Copilot questions inside the Sprint and permits web grounding only for an active Sprint decision', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const context = buildExecutionRagContext(blueprint, progress(), 1, '');

    const today = evaluateExecutionInteraction('What exactly do I do today?', context);
    expect(today.allowed).toBe(true);
    expect(today.externalResearchRequested).toBe(false);
    expect(routeExecutionCapability('What exactly do I do today?', 'current_experiment', context, today)).toBe('fast_assistant');

    const strategy = evaluateExecutionInteraction('Should I change the offer?', context);
    expect(strategy.allowed).toBe(true);
    expect(routeExecutionCapability('Should I change the offer?', 'current_experiment', context, strategy)).toBe('strategy_reasoner');

    const critic = evaluateExecutionInteraction('Challenge this evidence; are you sure?', context);
    expect(critic.allowed).toBe(true);
    expect(routeExecutionCapability('Challenge this evidence; are you sure?', 'current_experiment', context, critic)).toBe('critic');

    const competitorFromSprint = evaluateExecutionInteraction('Who are my competitors?', context);
    expect(competitorFromSprint.allowed).toBe(true);
    expect(competitorFromSprint.externalResearchRequested).toBe(false);
    expect(routeExecutionCapability('Who are my competitors?', 'current_experiment', context, competitorFromSprint)).toBe('fast_assistant');

    const relevantResearchQuestion = 'Search the web for current competitor information only if it directly helps this Day 1 Sprint decision.';
    const relevantResearch = evaluateExecutionInteraction(relevantResearchQuestion, context);
    expect(relevantResearch.allowed).toBe(true);
    expect(relevantResearch.externalResearchRequested).toBe(true);
    expect(relevantResearch.externalResearchAllowed).toBe(true);
    expect(relevantResearch.externalResearchReason).toBe('sprint_relevant');
    expect(routeExecutionCapability(relevantResearchQuestion, 'current_experiment', context, relevantResearch)).toBe('grounded_research');

    const unrelated = evaluateExecutionInteraction('Search the web for the latest football scores and weather in Tokyo.', context);
    expect(unrelated.allowed).toBe(false);
    expect(unrelated.externalResearchRequested).toBe(true);
    expect(unrelated.externalResearchAllowed).toBe(false);
    expect(unrelated.externalResearchReason).toBe('out_of_scope');

    const functionWordsOnly = evaluateExecutionInteraction('Search the web for the latest and the newest.', context);
    expect(functionWordsOnly.contextOverlap).toBe(0);
    expect(functionWordsOnly.allowed).toBe(false);
    expect(functionWordsOnly.externalResearchAllowed).toBe(false);

    const untetheredResearch = evaluateExecutionInteraction('Research dinosaur fossils on the web.', context);
    expect(untetheredResearch.externalResearchAllowed).toBe(false);

    expect(generativeTaskForExecutionCapability('fast_assistant')).toBe('candidate_selection');
    expect(generativeTaskForExecutionCapability('strategy_reasoner')).toBe('blueprint');
    expect(generativeTaskForExecutionCapability('grounded_research')).toBe('grounded_research');
  });
});
