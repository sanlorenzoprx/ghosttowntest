import { describe, expect, it } from 'vitest';
import {
  checkpointReminderDueAt,
  describeReminderReference,
  resolveReminderTarget,
  type ScheduledReminderV21
} from '../src/components/LaunchBlueprintViewV21';

const base = (overrides: Partial<ScheduledReminderV21>): ScheduledReminderV21 => ({
  reminderId: 'r1',
  blueprintId: 'bp-1',
  blueprintVersion: '2.1',
  kind: 'daily_action',
  dueAt: '2026-08-10T09:00:00.000Z',
  status: 'pending',
  ...overrides
});

describe('GhostTown reminder navigation', () => {
  it('resolves daily action reminders to the exact Blueprint day', () => {
    const reminder = base({ actionId: 'day-8' });
    expect(resolveReminderTarget(reminder)).toEqual({ kind: 'action', dayNumber: 8 });
    expect(describeReminderReference(reminder)).toBe('Day 8 action');
  });

  it('resolves follow-up reminders to the exact recorded result', () => {
    const reminder = base({ kind: 'follow_up', entryId: 'entry-42' });
    expect(resolveReminderTarget(reminder)).toEqual({ kind: 'entry', entryId: 'entry-42' });
    expect(describeReminderReference(reminder)).toBe('Recorded result entry-42');
  });

  it('resolves only canonical checkpoint reminder IDs', () => {
    const reminder = base({ kind: 'checkpoint', checkpointId: 'day-14' });
    expect(resolveReminderTarget(reminder)).toEqual({ kind: 'checkpoint', dayNumber: 14 });
    expect(describeReminderReference(reminder)).toBe('Day 14 checkpoint review');
    expect(resolveReminderTarget(base({ kind: 'checkpoint', checkpointId: 'day-9' }))).toEqual({ kind: 'unresolved' });
  });

  it('uses the preferred local reminder hour for a future checkpoint', () => {
    const dueAt = checkpointReminderDueAt('2026-08-01T12:00:00.000Z', 14, 9, new Date('2026-08-02T00:00:00.000Z'));
    const due = new Date(dueAt);
    expect(due.getDate()).toBe(14);
    expect(due.getHours()).toBe(9);
  });

  it('never schedules a newly requested checkpoint reminder in the past', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    expect(new Date(checkpointReminderDueAt('2026-08-01T12:00:00.000Z', 7, 9, now)).getTime()).toBeGreaterThan(now.getTime());
  });
});
