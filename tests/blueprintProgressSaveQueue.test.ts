import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createProgressSaveQueue, workspaceActionDay, type CompletedDayChange } from '../src/lib/blueprintProgressSaveQueue';

// Regression for Acceptance #72: "Complete Day 10" stayed disabled after a
// reload because Day 10's evidence was recorded against Day 9. The execution
// home sent unqueued whole-snapshot saves (an older response could land last)
// and opened the workspace without saying which day it was for.

interface Snapshot { completedDays: number[]; note?: string }

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('Sprint progress save queue', () => {
  it('reproduction: unqueued saves let an older response overwrite a newer completion', async () => {
    // The pre-fix pattern: each save posts immediately and applies its own response.
    let state: Snapshot = { completedDays: [1, 2, 3, 4, 5, 6, 7, 8] };
    const slow = deferred<Snapshot>();
    const fast = deferred<Snapshot>();
    const naiveSave = async (next: Snapshot, response: Promise<Snapshot>) => { state = next; state = await response; };
    const noteSave = naiveSave({ ...state, note: 'day 9 note' }, slow.promise);
    const completeDay9 = naiveSave({ ...state, completedDays: [...state.completedDays, 9] }, fast.promise);
    fast.resolve({ completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9], note: 'day 9 note' });
    await completeDay9;
    slow.resolve({ completedDays: [1, 2, 3, 4, 5, 6, 7, 8], note: 'day 9 note' });
    await noteSave;
    expect(state.completedDays).not.toContain(9);
    expect(workspaceActionDay(Array.from({ length: 30 }, (_, index) => index + 1), state.completedDays)).toBe(9);
  });

  it('sends one save at a time, coalesces to the latest snapshot, and applies only the newest response', async () => {
    const sent: Array<{ snapshot: Snapshot; dayChanges: CompletedDayChange[] }> = [];
    const gates: Array<ReturnType<typeof deferred<Snapshot>>> = [];
    let applied: Snapshot | null = null;
    const queue = createProgressSaveQueue<Snapshot>(async (snapshot, dayChanges) => {
      sent.push({ snapshot, dayChanges });
      const gate = deferred<Snapshot>();
      gates.push(gate);
      return gate.promise;
    }, { applied: saved => { applied = saved; }, failed: () => undefined });

    const first = queue.save({ completedDays: [1], note: 'a' });
    const second = queue.save({ completedDays: [1, 2], note: 'a' }, { dayNumber: 2, completed: true });
    const third = queue.save({ completedDays: [1, 2], note: 'b' });
    expect(sent).toHaveLength(1);
    gates[0].resolve({ completedDays: [1], note: 'a' });
    await first;
    expect(applied).toBeNull(); // a newer snapshot was waiting
    await Promise.resolve();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ snapshot: { completedDays: [1, 2], note: 'b' }, dayChanges: [{ dayNumber: 2, completed: true }] });
    gates[1].resolve({ completedDays: [1, 2], note: 'b' });
    expect(await second).toBe(true);
    expect(await third).toBe(true);
    expect(applied).toEqual({ completedDays: [1, 2], note: 'b' });
  });

  it('keeps unsent day changes after a failure so the retry still carries them', async () => {
    const sent: CompletedDayChange[][] = [];
    let fail = true;
    const errors: unknown[] = [];
    const queue = createProgressSaveQueue<Snapshot>(async (snapshot, dayChanges) => {
      sent.push(dayChanges);
      if (fail) throw new Error('offline');
      return snapshot;
    }, { applied: () => undefined, failed: error => errors.push(error) });
    expect(await queue.save({ completedDays: [1, 2] }, { dayNumber: 2, completed: true })).toBe(false);
    fail = false;
    expect(await queue.save({ completedDays: [1, 2] })).toBe(true);
    expect(sent).toEqual([[{ dayNumber: 2, completed: true }], [{ dayNumber: 2, completed: true }]]);
    expect(errors).toHaveLength(1);
  });

  it('the workspace uses the day it was opened for, whatever the completion snapshot says', () => {
    const days = Array.from({ length: 30 }, (_, index) => index + 1);
    expect(workspaceActionDay(days, [1, 2, 3, 4, 5, 6, 7, 8], 10)).toBe(10);
    expect(workspaceActionDay(days, [1, 2, 3, 4, 5, 6, 7, 8, 9], null)).toBe(10);
    expect(workspaceActionDay(days, days, null)).toBe(30);
    expect(workspaceActionDay(days, [], 31)).toBe(1);
  });

  it('the execution home queues its saves and opens the workspace for the active day', () => {
    const home = readFileSync(new URL('../src/components/LaunchBlueprintExecutionHomeV21.tsx', import.meta.url), 'utf8');
    const workspace = readFileSync(new URL('../src/components/LaunchBlueprintViewV21.tsx', import.meta.url), 'utf8');
    expect(home).toContain('createProgressSaveQueue<BlueprintProgressV21>(');
    expect(home).toContain('completedDayChanges: dayChanges');
    expect(home).toContain('initialActionDay={workspaceDay}');
    expect(home).not.toMatch(/method: 'POST',\s*headers: \{ \.\.\.authHeaders\(\), 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(next\)/);
    expect(workspace).toContain('initialActionDay?: number');
    expect(workspace).toContain('useState<number | null>(initialActionDay ?? null)');
  });
});
