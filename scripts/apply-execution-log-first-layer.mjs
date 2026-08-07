import { readFileSync, writeFileSync } from 'node:fs';

const viewPath = 'src/components/LaunchBlueprintViewV21.tsx';
let source = readFileSync(viewPath, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing expected ${label} anchor`);
  source = source.replace(before, after);
}

replaceOnce(
  '  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});\n',
  '  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});\n  const [selectedActionDay, setSelectedActionDay] = useState<number | null>(null);\n',
  'selected action state'
);

replaceOnce(
  '  const completed = new Set(progress.completedDays || []);\n  const todayAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];\n',
  '  const completed = new Set(progress.completedDays || []);\n  const nextIncompleteAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];\n  const todayAction = (selectedActionDay ? blueprint.dailyCalendar.find(day => day.dayNumber === selectedActionDay) : undefined) || nextIncompleteAction;\n',
  'today action selection'
);

replaceOnce(
  '  const completionPercent = Math.round(((progress.completedDays || []).length / 30) * 100);\n',
  `  const completionPercent = Math.round(((progress.completedDays || []).length / 30) * 100);\n\n  const reminderDueAt = (date: string, hour = prefs.preferredHourLocal): string => {\n    const [year, month, day] = date.split('-').map(Number);\n    const due = new Date();\n    due.setFullYear(year, month - 1, day);\n    due.setHours(hour, 0, 0, 0);\n    return due.toISOString();\n  };\n\n  const checkpointDueAt = (dayNumber: 7 | 14 | 21 | 30): string => {\n    const due = new Date(blueprint.createdAt);\n    due.setDate(due.getDate() + dayNumber - 1);\n    due.setHours(prefs.preferredHourLocal, 0, 0, 0);\n    return due.toISOString();\n  };\n`,
  'reminder time helpers'
);

replaceOnce(
  `  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {\n    const item: ScheduledReminderV21 = {\n      reminderId: \`reminder_\${crypto.randomUUID()}\`,\n      blueprintId: blueprint.blueprintId,\n      blueprintVersion: blueprint.blueprintVersion,\n      kind,\n      dueAt,\n      status: "pending",\n      ...refs,\n    };\n    void persist({ ...progress, scheduledReminders: [...reminders, item] });\n  };\n`,
  `  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {\n    const duplicate = reminders.some(item => item.kind === kind && item.status === "pending" && item.actionId === refs.actionId && item.entryId === refs.entryId && item.checkpointId === refs.checkpointId);\n    if (duplicate) return;\n    const item: ScheduledReminderV21 = {\n      reminderId: \`reminder_\${crypto.randomUUID()}\`,\n      blueprintId: blueprint.blueprintId,\n      blueprintVersion: blueprint.blueprintVersion,\n      kind,\n      dueAt,\n      status: "pending",\n      ...refs,\n    };\n    void persist({ ...progress, scheduledReminders: [...reminders, item] });\n  };\n\n  const openReminder = (item: ScheduledReminderV21) => {\n    if (item.kind === "daily_action" && item.actionId) {\n      const day = Number(item.actionId.replace(/^day-/, ""));\n      if (Number.isInteger(day) && day >= 1 && day <= 30) setSelectedActionDay(day);\n      setTab("today");\n      return;\n    }\n    if (item.kind === "follow_up" && item.entryId) {\n      const entry = progress.evidenceLedger.find(candidate => candidate.entryId === item.entryId);\n      if (entry) {\n        setEntryDraft(entry);\n        setTab("record");\n      } else {\n        setTab("followups");\n      }\n      return;\n    }\n    setTab("review");\n    if (item.checkpointId) window.setTimeout(() => document.getElementById(\`checkpoint-\${item.checkpointId}\`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);\n  };\n`,
  'reminder scheduling and deep-link behavior'
);

replaceOnce(
  '    void persist({ ...progress, evidenceLedger: upsertEvidenceEntry(progress.evidenceLedger || [], entry) });\n    setEntryDraft(emptyEntry());\n',
  `    const evidenceLedger = upsertEvidenceEntry(progress.evidenceLedger || [], entry);\n    const needsFollowUpReminder = prefs.followUps && Boolean(entry.followUpDate) && !reminders.some(item => item.kind === "follow_up" && item.entryId === entry.entryId && item.status === "pending");\n    const followUpReminder: ScheduledReminderV21 | null = needsFollowUpReminder ? {\n      reminderId: \`reminder_\${crypto.randomUUID()}\`,\n      blueprintId: blueprint.blueprintId,\n      blueprintVersion: blueprint.blueprintVersion,\n      kind: "follow_up",\n      dueAt: reminderDueAt(entry.followUpDate),\n      entryId: entry.entryId,\n      status: "pending",\n    } : null;\n    void persist({ ...progress, evidenceLedger, scheduledReminders: followUpReminder ? [...reminders, followUpReminder] : reminders });\n    setEntryDraft(emptyEntry());\n`,
  'automatic follow-up reminder'
);

replaceOnce(
  '<section key={checkpoint.checkpointId} className="rounded-xl border border-black/10 bg-white p-6">',
  '<section id={`checkpoint-${checkpoint.checkpointId}`} key={checkpoint.checkpointId} className="rounded-xl border border-black/10 bg-white p-6">',
  'checkpoint deep-link target'
);

replaceOnce(
  '<button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">Save Day {day} review</button>',
  '<div className="flex flex-wrap gap-2"><button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">Save Day {day} review</button><button onClick={() => scheduleReminder("checkpoint", checkpointDueAt(day), { checkpointId: checkpoint.checkpointId })} className="rounded-lg border border-ghost-rust px-4 py-3 font-black text-ghost-rust">Remind me for Day {day}</button></div>',
  'checkpoint reminder control'
);

replaceOnce(
  '<div className="mt-4 grid gap-3 sm:grid-cols-3">{[["dailyAction","Daily action"],["followUps","Follow-ups"],["checkpoints","Checkpoints"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}</div></section>',
  '<div className="mt-4 grid gap-3 sm:grid-cols-3">{[["dailyAction","Daily action"],["followUps","Follow-ups"],["checkpoints","Checkpoints"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}</div><label className="mt-4 block max-w-xs text-sm font-black">Preferred reminder hour (local)<input type="number" min="0" max="23" value={prefs.preferredHourLocal} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, preferredHourLocal: Math.max(0, Math.min(23, Number(e.target.value || 0))) } })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label></section>',
  'preferred reminder hour control'
);

replaceOnce(
  '<button onClick={() => void persist({ ...progress, scheduledReminders: reminders.map(current => current.reminderId === item.reminderId ? { ...current, status: "dismissed" } : current) })} className="rounded-lg border px-3 py-2 text-sm font-black">Dismiss</button>',
  '<div className="flex gap-2"><button onClick={() => openReminder(item)} className="rounded-lg bg-ghost-rust px-3 py-2 text-sm font-black text-white">Open</button><button onClick={() => void persist({ ...progress, scheduledReminders: reminders.map(current => current.reminderId === item.reminderId ? { ...current, status: "dismissed" } : current) })} className="rounded-lg border px-3 py-2 text-sm font-black">Dismiss</button></div>',
  'reminder open control'
);

writeFileSync(viewPath, source);

const testPath = 'tests/blueprintExecutionFirstLayer.test.ts';
writeFileSync(testPath, `import { readFileSync } from 'node:fs';\nimport { describe, expect, it } from 'vitest';\n\nconst viewSource = readFileSync(new URL('../src/components/LaunchBlueprintViewV21.tsx', import.meta.url), 'utf8');\n\ndescribe('GhostTown Daily Execution Log first-layer functions', () => {\n  it('covers the seven first-version functions from the Execution Journal recommendation', () => {\n    expect(viewSource).toContain('Reminder preferences');\n    expect(viewSource).toContain('Remind me later');\n    expect(viewSource).toContain('kind: "follow_up"');\n    expect(viewSource).toContain('Record results, not impressions.');\n    expect(viewSource).toContain('No evidence recorded yet. Use Record Results');\n    expect(viewSource).toContain('evidenceLedger: upsertEvidenceEntry');\n    for (const day of [7, 14, 21, 30]) expect(viewSource).toContain('Save Day {day} review');\n  });\n\n  it('deep-links reminders to exact execution context and supports checkpoint reminders', () => {\n    expect(viewSource).toContain('const openReminder = (item: ScheduledReminderV21)');\n    expect(viewSource).toContain('setSelectedActionDay(day)');\n    expect(viewSource).toContain('setEntryDraft(entry)');\n    expect(viewSource).toContain('checkpoint-${item.checkpointId}');\n    expect(viewSource).toContain('scheduleReminder("checkpoint"');\n    expect(viewSource).toContain('Preferred reminder hour (local)');\n  });\n\n  it('keeps deferred channels outside the first layer', () => {\n    expect(viewSource).toContain('Email, push, SMS, streaks, and calendar integrations remain deliberately deferred.');\n  });\n});\n`);

console.log('GhostTown Daily Execution Log first layer patched.');
