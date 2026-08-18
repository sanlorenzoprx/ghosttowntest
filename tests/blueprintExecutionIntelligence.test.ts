import { describe, expect, it } from 'vitest';
import { checkoutAccessibilityBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';
import {
  buildExecutionRagContext,
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

  it('routes cheap, strategic, critical, and current-research questions to stable capability slots', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const context = buildExecutionRagContext(blueprint, progress(), 1, '');
    expect(routeExecutionCapability('What exactly do I do today?', 'current_experiment', context)).toBe('fast_assistant');
    expect(routeExecutionCapability('Should I change the offer?', 'current_experiment', context)).toBe('strategy_reasoner');
    expect(routeExecutionCapability('Challenge this evidence; are you sure?', 'current_experiment', context)).toBe('critic');
    expect(routeExecutionCapability('Research the latest competitor information on the web', 'current_experiment', context)).toBe('grounded_research');
    expect(generativeTaskForExecutionCapability('fast_assistant')).toBe('candidate_selection');
    expect(generativeTaskForExecutionCapability('strategy_reasoner')).toBe('blueprint');
    expect(generativeTaskForExecutionCapability('grounded_research')).toBe('grounded_research');
  });
});
