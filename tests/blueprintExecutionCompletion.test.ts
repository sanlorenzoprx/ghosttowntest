import { describe, expect, it } from 'vitest';
import { checkoutAccessibilityBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';
import {
  completionTransitionFailures,
  dayCompletionReadiness,
  type ExecutionCompletionProgress,
} from '../src/lib/blueprintExecutionCompletion';

function progress(overrides: Partial<ExecutionCompletionProgress> = {}): ExecutionCompletionProgress {
  return {
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [],
    checkpointReviews: [],
    ...overrides,
  };
}

function dayEvidence(dayNumber: number) {
  return {
    actionId: dayNumber === 4 ? 'action-day-04-send-discovery-v1' : `action-day-${String(dayNumber).padStart(2, '0')}-v1`,
    contactOrChannel: `Qualified target for day ${dayNumber}`,
    date: '2026-08-18',
    action: 'Completed the declared action with the canonical target.',
    response: 'Recorded the observed outcome and next step.',
    customerLanguage: '',
    commitmentOffered: '',
    commitmentReceived: '',
    sourceNote: 'Dated execution evidence.',
  };
}

describe('30-day execution completion integrity', () => {
  it('blocks an external-action day until structured evidence is recorded', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const empty = progress();
    const readiness = dayCompletionReadiness(blueprint, empty, 1);
    expect(readiness.requiresStructuredEvidence).toBe(true);
    expect(readiness.ready).toBe(false);

    const noteOnly = progress({ evidenceNotes: { [blueprint.dailyCalendar[0].completionKey]: 'Sent the batch.' } });
    expect(dayCompletionReadiness(blueprint, noteOnly, 1).ready).toBe(false);

    const withEvidence = progress({ evidenceLedger: [dayEvidence(1)] });
    expect(dayCompletionReadiness(blueprint, withEvidence, 1).ready).toBe(true);
  });

  it('allows an internal preparation day to complete with a recorded execution note', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const day = blueprint.dailyCalendar[8];
    const withNote = progress({ evidenceNotes: { [day.completionKey]: 'Pilot brief prepared, checked against scope, price, and proof boundary.' } });
    expect(dayCompletionReadiness(blueprint, withNote, 9).ready).toBe(true);
  });

  it('requires a completed checkpoint review before a checkpoint day can advance', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const evidence = dayEvidence(7);
    const withoutReview = progress({ evidenceLedger: [evidence] });
    const blocked = dayCompletionReadiness(blueprint, withoutReview, 7);
    expect(blocked.checkpointRequired).toBe(true);
    expect(blocked.ready).toBe(false);

    const withReview = progress({
      evidenceLedger: [evidence],
      checkpointReviews: [{
        dayNumber: 7,
        completedAt: '2026-08-18T14:00:00.000Z',
        strongestEvidence: 'moderate',
        evidenceSummary: 'The first batch produced dated replies and one recurring access constraint.',
        nextAction: 'Revise only the access path before increasing volume.',
      }],
    });
    expect(dayCompletionReadiness(blueprint, withReview, 7).ready).toBe(true);
  });

  it('rejects a newly completed day transition when its execution contract is not satisfied', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const failures = completionTransitionFailures(blueprint, progress(), { completedDays: [1] });
    expect(failures).toHaveLength(1);
    expect(failures[0].dayNumber).toBe(1);

    const validRequest = {
      completedDays: [1],
      evidenceLedger: [dayEvidence(1)],
    };
    expect(completionTransitionFailures(blueprint, progress(), validRequest)).toEqual([]);
  });
});
