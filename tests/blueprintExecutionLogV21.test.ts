import { describe, expect, it } from 'vitest';
import { normalizeBlueprintProgress } from '../src/api/blueprintStore';

describe('GhostTown Daily Execution Log progress contract', () => {
  it('preserves Blueprint/version/action references while bounding evidence fields', () => {
    const progress = normalizeBlueprintProgress({
      evidenceLedger: [{
        entryId: 'e1',
        blueprintId: 'bp-v21',
        blueprintVersion: '2.1',
        actionId: 'day-8',
        checkpointId: 'day-7',
        createdAt: '2026-08-07T12:00:00.000Z',
        contactOrChannel: 'Customer A',
        date: '2026-08-07',
        action: 'Asked for a paid pilot',
        response: 'Requested a proposal',
        customerLanguage: 'Send the exact scope and price.',
        alternativeMentioned: 'Internal spreadsheet',
        objection: 'Needs manager approval',
        commitmentOffered: 'Paid pilot',
        commitmentReceived: 'Proposal request',
        revenueCents: 0,
        founderMinutes: 22,
        variableCostCents: 125,
        followUpDate: '2026-08-09',
        evidenceStrength: 'moderate',
        sourceNote: 'Call notes'
      }]
    });
    expect(progress.evidenceLedger[0]).toMatchObject({
      blueprintId: 'bp-v21',
      blueprintVersion: '2.1',
      actionId: 'day-8',
      checkpointId: 'day-7',
      evidenceStrength: 'moderate'
    });
  });

  it('normalizes in-app reminder preferences and version-attached reminders', () => {
    const progress = normalizeBlueprintProgress({
      reminderPreferences: { dailyAction: true, followUps: false, checkpoints: true, preferredHourLocal: 27 },
      scheduledReminders: [{
        reminderId: 'r1',
        blueprintId: 'bp-v21',
        blueprintVersion: '2.1',
        kind: 'follow_up',
        dueAt: '2026-08-09T13:00:00.000Z',
        entryId: 'e1',
        status: 'pending'
      }]
    });
    expect(progress.reminderPreferences).toEqual({ dailyAction: true, followUps: false, checkpoints: true, preferredHourLocal: 23 });
    expect(progress.scheduledReminders[0]).toMatchObject({ reminderId: 'r1', blueprintId: 'bp-v21', blueprintVersion: '2.1', kind: 'follow_up', entryId: 'e1', status: 'pending' });
  });
});
