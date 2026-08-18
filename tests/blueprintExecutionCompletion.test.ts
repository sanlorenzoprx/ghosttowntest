import { describe, expect, it } from 'vitest';
import { checkoutAccessibilityBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';
import {
  completionTransitionFailures,
  dayCompletionReadiness,
  deriveObservedExecutionMetrics,
  executionProgressWithObservedMetrics,
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

function dayEvidence(dayNumber: number, index = 1) {
  return {
    entryId: `day-${dayNumber}-evidence-${index}`,
    actionId: dayNumber === 4 ? 'action-day-04-send-discovery-v1' : `action-day-${String(dayNumber).padStart(2, '0')}-v1`,
    contactOrChannel: `Qualified target ${index} for day ${dayNumber}`,
    date: '2026-08-18',
    action: 'Completed the declared action with the canonical target.',
    response: 'Recorded the observed outcome and next step.',
    customerLanguage: '',
    commitmentOffered: '',
    commitmentReceived: '',
    revenueCents: 0,
    founderMinutes: 0,
    variableCostCents: 0,
    sourceNote: 'Dated execution evidence.',
  };
}

function requiredEvidenceForDay(blueprint: ReturnType<typeof checkoutAccessibilityBlueprintFixture>, dayNumber: number) {
  const packet = blueprint.dailyCalendar[dayNumber - 1].executionPacket!;
  const match = packet.actions[0].quantity.match(/\b([1-9]\d?)\b/);
  const count = match ? Number(match[1]) : 1;
  return Array.from({ length: count }, (_, index) => dayEvidence(dayNumber, index + 1));
}

describe('30-day execution completion integrity', () => {
  it('blocks an external-action day until the packet-declared structured evidence quantity is recorded', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const empty = progress();
    const readiness = dayCompletionReadiness(blueprint, empty, 1);
    expect(readiness.requiresStructuredEvidence).toBe(true);
    expect(readiness.ready).toBe(false);
    expect(readiness.requiredEvidenceCount).toBeGreaterThan(1);

    const noteOnly = progress({ evidenceNotes: { [blueprint.dailyCalendar[0].completionKey]: 'Sent the batch.' } });
    expect(dayCompletionReadiness(blueprint, noteOnly, 1).ready).toBe(false);

    const oneEvidence = progress({ evidenceLedger: [dayEvidence(1)] });
    expect(dayCompletionReadiness(blueprint, oneEvidence, 1).ready).toBe(false);

    const withEvidence = progress({ evidenceLedger: requiredEvidenceForDay(blueprint, 1) });
    expect(dayCompletionReadiness(blueprint, withEvidence, 1).ready).toBe(true);
  });

  it('keeps future days previewable but blocks out-of-sequence completion', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const day = blueprint.dailyCalendar[8];
    const withNote = progress({ evidenceNotes: { [day.completionKey]: 'Pilot brief prepared, checked against scope, price, and proof boundary.' } });
    const blocked = dayCompletionReadiness(blueprint, withNote, 9);
    expect(blocked.ready).toBe(false);
    expect(blocked.missingPriorDays).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const inSequence = progress({
      completedDays: [1, 2, 3, 4, 5, 6, 7, 8],
      evidenceNotes: { [day.completionKey]: 'Pilot brief prepared, checked against scope, price, and proof boundary.' },
    });
    expect(dayCompletionReadiness(blueprint, inSequence, 9).ready).toBe(true);
  });

  it('requires a completed checkpoint review before a checkpoint day can advance', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const beforeCheckpoint = [1, 2, 3, 4, 5, 6];
    const withoutReview = progress({
      completedDays: beforeCheckpoint,
      evidenceNotes: { [blueprint.dailyCalendar[6].completionKey]: 'Week 1 memo records the batch counts and constraint.' },
    });
    const blocked = dayCompletionReadiness(blueprint, withoutReview, 7);
    expect(blocked.checkpointRequired).toBe(true);
    expect(blocked.ready).toBe(false);

    const withReview = progress({
      completedDays: beforeCheckpoint,
      evidenceNotes: { [blueprint.dailyCalendar[6].completionKey]: 'Week 1 memo records the batch counts and constraint.' },
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

  it('allows an explicit no-evidence checkpoint conclusion when the founder records the implication and next action', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const withNoEvidenceConclusion = progress({
      completedDays: [1, 2, 3, 4, 5, 6],
      evidenceNotes: { [blueprint.dailyCalendar[6].completionKey]: 'The Week 1 memo records zero reliable buyer signal.' },
      checkpointReviews: [{
        dayNumber: 7,
        completedAt: '2026-08-18T14:00:00.000Z',
        strongestEvidence: 'none',
        evidenceSummary: 'No reliable buyer signal was produced by the completed batch; do not manufacture a positive interpretation.',
        nextAction: 'Pause volume and revise the access path before the next bounded test.',
      }],
    });
    expect(dayCompletionReadiness(blueprint, withNoEvidenceConclusion, 7).ready).toBe(true);
  });

  it('rejects a newly completed day transition when its execution contract is not satisfied', () => {
    const blueprint = checkoutAccessibilityBlueprintFixture();
    const failures = completionTransitionFailures(blueprint, progress(), { completedDays: [1] });
    expect(failures).toHaveLength(1);
    expect(failures[0].dayNumber).toBe(1);

    const validRequest = {
      completedDays: [1],
      evidenceLedger: requiredEvidenceForDay(blueprint, 1),
    };
    expect(completionTransitionFailures(blueprint, progress(), validRequest)).toEqual([]);
  });

  it('rolls up only objective ledger totals without inventing outreach or interview counts', () => {
    const entries = [
      { ...dayEvidence(16, 1), commitmentReceived: 'Paid pilot accepted', revenueCents: 50000, founderMinutes: 45, variableCostCents: 1200 },
      { ...dayEvidence(16, 2), commitmentReceived: 'declined', revenueCents: 0, founderMinutes: 20, variableCostCents: 0 },
      { ...dayEvidence(21, 1), commitmentReceived: 'Deposit received', revenueCents: 25000, founderMinutes: 90, variableCostCents: 800 },
    ];
    expect(deriveObservedExecutionMetrics(entries)).toEqual({
      commitments: 2,
      revenueCents: 75000,
      founderMinutes: 155,
      variableCostCents: 2000,
    });

    const next = executionProgressWithObservedMetrics(
      progress({ metrics: { outreachSent: 12, replies: 4, interviews: 2, qualifiedConversations: 2, commitments: 0, revenueCents: 0, founderMinutes: 0, variableCostCents: 0, leads: 1 } }),
      { evidenceLedger: entries },
    );
    expect(next.metrics).toMatchObject({
      outreachSent: 12,
      replies: 4,
      interviews: 2,
      qualifiedConversations: 2,
      leads: 1,
      commitments: 2,
      revenueCents: 75000,
      founderMinutes: 155,
      variableCostCents: 2000,
    });
  });
});
