import { describe, expect, it } from 'vitest';
import { formalCheckpointBranch } from '../src/lib/blueprintExecutionIntelligence';
import { deriveObservedExecutionMetrics } from '../src/lib/blueprintExecutionCompletion';
import {
  CHECKPOINT_DAYS,
  SPRINT_SCENARIOS,
  expectedBranchForDay,
  expectedRouteTrail,
  scenarioCheckpoint,
  scenarioEvidence
} from './e2e/sprintScenarios.mjs';

// Builds the saved progress the acceptance journey would have after completing
// `throughDay`, using the scenario's synthetic evidence and checkpoint reviews.
function progressThrough(name: string, throughDay: number) {
  const evidenceLog = Array.from({ length: throughDay }, (_, index) => {
    const day = index + 1;
    const evidence = scenarioEvidence(name, day);
    return {
      entryId: `e2e-${day}`,
      dayNumber: day,
      contactOrChannel: `SYNTHETIC ACCEPTANCE — Day ${day} record 1`,
      response: evidence.response,
      customerLanguage: evidence.customerLanguage,
      commitmentOffered: evidence.commitmentOffered,
      commitmentReceived: evidence.commitmentReceived,
      evidenceStrength: evidence.strength
    };
  });
  const checkpointReviews = CHECKPOINT_DAYS.filter(day => day <= throughDay).map(day => ({
    dayNumber: day,
    ...scenarioCheckpoint(name, day),
    evidenceSummary: 'AGENTIC QA — synthetic acceptance evidence is not market proof.',
    nextAction: 'Continue in acceptance.',
    completedAt: '2026-11-11T00:00:00.000Z'
  }));
  return {
    completedDays: Array.from({ length: throughDay }, (_, index) => index + 1),
    evidenceLog,
    checkpointReviews,
    metrics: deriveObservedExecutionMetrics(evidenceLog as never)
  };
}

describe('synthetic 30-day Sprint scenarios', () => {
  it('on_track keeps the plan unchanged for all 30 days', () => {
    expect(expectedRouteTrail('on_track').map(item => item.route)).toEqual(['continue', 'continue', 'continue', 'continue']);
    for (let day = 1; day <= 30; day += 1) {
      const branch = formalCheckpointBranch(progressThrough('on_track', day) as never, day);
      expect(branch.route, `on_track day ${day}`).toBe('continue');
      expect(branch.mayChange, `on_track day ${day}`).toEqual([]);
    }
    expect(progressThrough('on_track', 30).metrics.commitments).toBe(30);
  });

  it('plan_change moves the plan through a different revision at each checkpoint', () => {
    expect(expectedRouteTrail('plan_change').map(item => item.route))
      .toEqual(['revise_message', 'revise_price', 'revise_offer', 'revise_customer']);
    for (let day = 1; day <= 30; day += 1) {
      const branch = formalCheckpointBranch(progressThrough('plan_change', day) as never, day);
      const expected = expectedBranchForDay('plan_change', day);
      expect(branch.route, `plan_change day ${day}`).toBe(expected.route);
      expect(branch.mayChange, `plan_change day ${day}`).toEqual(expected.mayChange);
      expect(branch.checkpointDay, `plan_change day ${day}`).toBe(expected.checkpointDay);
    }
  });

  it('every scenario value is marked synthetic and names no real customer', () => {
    for (const name of SPRINT_SCENARIOS) {
      for (let day = 1; day <= 30; day += 1) {
        const evidence = scenarioEvidence(name, day);
        expect(evidence.customerLanguage).toContain('SYNTHETIC ACCEPTANCE DATA');
        expect(evidence.response).toMatch(/^SYNTHETIC:/);
      }
    }
  });

  it('rejects an unknown scenario name', () => {
    expect(() => scenarioEvidence('optimistic', 1)).toThrow(/Unknown Sprint scenario/);
  });
});
