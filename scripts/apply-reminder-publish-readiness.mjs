import { readFileSync, writeFileSync } from 'node:fs';

const viewPath = 'src/components/LaunchBlueprintViewV21.tsx';
let source = readFileSync(viewPath, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing expected ${label} anchor`);
  source = source.replace(before, after);
}

replaceOnce(
`export interface ScheduledReminderV21 {
  reminderId: string;
  blueprintId: string;
  blueprintVersion: string;
  kind: "daily_action" | "follow_up" | "checkpoint";
  dueAt: string;
  actionId?: string;
  entryId?: string;
  checkpointId?: string;
  status: "pending" | "done" | "dismissed";
}
`,
`export interface ScheduledReminderV21 {
  reminderId: string;
  blueprintId: string;
  blueprintVersion: string;
  kind: "daily_action" | "follow_up" | "checkpoint";
  dueAt: string;
  actionId?: string;
  entryId?: string;
  checkpointId?: string;
  status: "pending" | "done" | "dismissed";
}

export type ReminderTargetV21 =
  | { kind: "action"; dayNumber: number }
  | { kind: "entry"; entryId: string }
  | { kind: "checkpoint"; dayNumber: 7 | 14 | 21 | 30 }
  | { kind: "unresolved" };

function actionDayFromId(actionId: string | undefined): number | null {
  const match = actionId?.match(/^day-(\\d{1,2})$/);
  const day = match ? Number(match[1]) : 0;
  return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null;
}

function checkpointDayFromId(checkpointId: string | undefined): 7 | 14 | 21 | 30 | null {
  const match = checkpointId?.match(/^day-(7|14|21|30)$/);
  return match ? Number(match[1]) as 7 | 14 | 21 | 30 : null;
}

export function resolveReminderTarget(reminder: ScheduledReminderV21): ReminderTargetV21 {
  if (reminder.kind === "follow_up" && reminder.entryId) return { kind: "entry", entryId: reminder.entryId };
  const checkpointDay = checkpointDayFromId(reminder.checkpointId);
  if (reminder.kind === "checkpoint" && checkpointDay) return { kind: "checkpoint", dayNumber: checkpointDay };
  const actionDay = actionDayFromId(reminder.actionId);
  if (actionDay) return { kind: "action", dayNumber: actionDay };
  if (reminder.entryId) return { kind: "entry", entryId: reminder.entryId };
  if (checkpointDay) return { kind: "checkpoint", dayNumber: checkpointDay };
  return { kind: "unresolved" };
}

export function describeReminderReference(reminder: ScheduledReminderV21): string {
  const target = resolveReminderTarget(reminder);
  if (target.kind === "action") return `Day ${target.dayNumber} action`;
  if (target.kind === "entry") return `Recorded result ${target.entryId}`;
  if (target.kind === "checkpoint") return `Day ${target.dayNumber} checkpoint review`;
  return "Reference unavailable";
}

export function checkpointReminderDueAt(blueprintCreatedAt: string, dayNumber: 7 | 14 | 21 | 30, preferredHourLocal: number, now = new Date()): string {
  const created = new Date(blueprintCreatedAt);
  if (Number.isNaN(created.getTime())) return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const due = new Date(created);
  due.setDate(created.getDate() + dayNumber - 1);
  due.setHours(Math.min(23, Math.max(0, Math.floor(preferredHourLocal))), 0, 0, 0);
  if (due.getTime() <= now.getTime()) return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  return due.toISOString();
}
`,
'reminder target helpers'
);

replaceOnce(
`  const [entryDraft, setEntryDraft] = useState<EvidenceLedgerEntryV21>(emptyEntry());
  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});
`,
`  const [entryDraft, setEntryDraft] = useState<EvidenceLedgerEntryV21>(emptyEntry());
  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});
  const [selectedActionDay, setSelectedActionDay] = useState<number | null>(null);
`,
'selected action state'
);

replaceOnce(
`  const completed = new Set(progress.completedDays || []);
  const todayAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];
`,
`  const completed = new Set(progress.completedDays || []);
  const nextIncompleteAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];
  const todayAction = (selectedActionDay ? blueprint.dailyCalendar.find(day => day.dayNumber === selectedActionDay) : undefined) || nextIncompleteAction;
`,
'action navigation selection'
);

replaceOnce(
`  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {
    const item: ScheduledReminderV21 = {
      reminderId: `reminder_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      kind,
      dueAt,
      status: "pending",
      ...refs,
    };
    void persist({ ...progress, scheduledReminders: [...reminders, item] });
  };
`,
`  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {
    const item: ScheduledReminderV21 = {
      reminderId: `reminder_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      kind,
      dueAt,
      status: "pending",
      ...refs,
    };
    void persist({ ...progress, scheduledReminders: [...reminders, item] });
  };

  const scheduleCheckpointReminder = (checkpointId: string, dayNumber: 7 | 14 | 21 | 30) => {
    if (reminders.some(item => item.kind === "checkpoint" && item.checkpointId === checkpointId && item.status === "pending")) return;
    scheduleReminder("checkpoint", checkpointReminderDueAt(blueprint.createdAt, dayNumber, prefs.preferredHourLocal), { checkpointId });
  };

  const scheduleAllCheckpointReminders = () => {
    const existing = new Set(reminders.filter(item => item.kind === "checkpoint" && item.status === "pending").map(item => item.checkpointId));
    const additions: ScheduledReminderV21[] = blueprint.adaptiveCheckpoints
      .filter(checkpoint => !existing.has(checkpoint.checkpointId))
      .map(checkpoint => ({
        reminderId: `reminder_${crypto.randomUUID()}`,
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        kind: "checkpoint" as const,
        dueAt: checkpointReminderDueAt(blueprint.createdAt, checkpoint.dayNumber, prefs.preferredHourLocal),
        checkpointId: checkpoint.checkpointId,
        status: "pending" as const,
      }));
    if (additions.length > 0) void persist({ ...progress, scheduledReminders: [...reminders, ...additions] });
  };

  const updateReminderStatus = (reminderId: string, status: ScheduledReminderV21["status"]) => {
    void persist({ ...progress, scheduledReminders: reminders.map(item => item.reminderId === reminderId ? { ...item, status } : item) });
  };

  const openReminder = (reminder: ScheduledReminderV21) => {
    const target = resolveReminderTarget(reminder);
    if (target.kind === "action") {
      setSelectedActionDay(target.dayNumber);
      setTab("today");
      return;
    }
    if (target.kind === "entry") {
      const entry = progress.evidenceLedger.find(item => item.entryId === target.entryId);
      if (entry) {
        setEntryDraft(entry);
        setTab("record");
      } else {
        setTab("evidence");
      }
      return;
    }
    if (target.kind === "checkpoint") {
      setTab("review");
      window.requestAnimationFrame(() => document.getElementById(`checkpoint-${target.dayNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };
`,
'reminder behaviors'
);

replaceOnce(
`<section key={checkpoint.checkpointId} className="rounded-xl border border-black/10 bg-white p-6">`,
`<section id={\`checkpoint-${day}\`} key={checkpoint.checkpointId} className="scroll-mt-32 rounded-xl border border-black/10 bg-white p-6">`,
'checkpoint anchor'
);

replaceOnce(
`<button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">Save Day {day} review</button>`,
`<div className="flex flex-wrap gap-2"><button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">Save Day {day} review</button><button onClick={() => scheduleCheckpointReminder(checkpoint.checkpointId, day)} disabled={reminders.some(item => item.kind === "checkpoint" && item.checkpointId === checkpoint.checkpointId && item.status === "pending")} className="rounded-lg border border-ghost-rust px-4 py-3 font-black text-ghost-rust disabled:cursor-not-allowed disabled:opacity-50">{reminders.some(item => item.kind === "checkpoint" && item.checkpointId === checkpoint.checkpointId && item.status === "pending") ? "Reminder scheduled" : `Remind me for Day ${day}`}</button></div>`,
'checkpoint reminder control'
);

replaceOnce(
`<section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Reminder preferences</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["dailyAction","Daily action"],["followUps","Follow-ups"],["checkpoints","Checkpoints"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}</div></section>`,
`<section className="rounded-xl border border-black/10 bg-white p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Reminder preferences</h2><p className="mt-1 text-sm text-gray-600">Checkpoint reminders use your preferred local hour and always retain their exact Blueprint reference.</p></div><button onClick={scheduleAllCheckpointReminders} className="rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust">Schedule checkpoint reviews</button></div><div className="mt-4 grid gap-3 sm:grid-cols-4">{[["dailyAction","Daily action"],["followUps","Follow-ups"],["checkpoints","Checkpoints"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}<label className="rounded-lg border p-4 text-sm font-black">Preferred hour<input aria-label="Preferred reminder hour" type="number" min="0" max="23" value={prefs.preferredHourLocal} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, preferredHourLocal: Math.min(23, Math.max(0, Number(e.target.value || 0))) } })} className="mt-2 w-full rounded-md border p-2 font-normal" /></label></div></section>`,
'reminder preference controls'
);

replaceOnce(
`{reminders.length === 0 ? <p className="rounded-xl bg-white p-6">No reminders scheduled.</p> : reminders.map(item => <article key={item.reminderId} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">{item.kind.replace(/_/g," ")}</p><p className="mt-1 text-sm">{new Date(item.dueAt).toLocaleString()}</p><p className="mt-1 text-xs text-gray-500">Blueprint {item.blueprintVersion}</p></div><button onClick={() => void persist({ ...progress, scheduledReminders: reminders.map(current => current.reminderId === item.reminderId ? { ...current, status: "dismissed" } : current) })} className="rounded-lg border px-3 py-2 text-sm font-black">Dismiss</button></article>)}`,
`{reminders.length === 0 ? <p className="rounded-xl bg-white p-6">No reminders scheduled.</p> : reminders.map(item => <article key={item.reminderId} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase text-ghost-rust">{item.kind.replace(/_/g," ")}</p><span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-black uppercase text-gray-600">{item.status}</span></div><p className="mt-1 text-sm">{new Date(item.dueAt).toLocaleString()}</p><p className="mt-1 text-sm font-semibold text-gray-800">{describeReminderReference(item)}</p><p className="mt-1 text-xs text-gray-500">Blueprint {item.blueprintVersion}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openReminder(item)} disabled={resolveReminderTarget(item).kind === "unresolved"} className="rounded-lg bg-ghost-rust px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Open referenced item</button>{item.status === "pending" && <button onClick={() => updateReminderStatus(item.reminderId, "done")} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-black text-emerald-800">Mark done</button>}<button onClick={() => updateReminderStatus(item.reminderId, "dismissed")} className="rounded-lg border px-3 py-2 text-sm font-black">Dismiss</button></div></article>)}`,
'reminder navigation list'
);

writeFileSync(viewPath, source);

const testPath = 'tests/blueprintReminderNavigationV21.test.ts';
writeFileSync(testPath, `import { describe, expect, it } from 'vitest';
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

  it('resolves checkpoint reminders to Day 7, 14, 21 or 30 only', () => {
    const reminder = base({ kind: 'checkpoint', checkpointId: 'day-14' });
    expect(resolveReminderTarget(reminder)).toEqual({ kind: 'checkpoint', dayNumber: 14 });
    expect(describeReminderReference(reminder)).toBe('Day 14 checkpoint review');
    expect(resolveReminderTarget(base({ kind: 'checkpoint', checkpointId: 'day-9' }))).toEqual({ kind: 'unresolved' });
  });

  it('uses the preferred reminder hour for future checkpoint scheduling', () => {
    const dueAt = checkpointReminderDueAt('2026-08-01T12:00:00.000Z', 14, 9, new Date('2026-08-02T00:00:00.000Z'));
    const due = new Date(dueAt);
    expect(due.getDate()).toBe(new Date('2026-08-14T09:00:00.000Z').getDate());
    expect(due.getHours()).toBe(9);
  });

  it('moves already-due checkpoint reminders forward instead of scheduling them in the past', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    expect(new Date(checkpointReminderDueAt('2026-08-01T12:00:00.000Z', 7, 9, now)).getTime()).toBeGreaterThan(now.getTime());
  });
});
`);
