import { readFileSync, writeFileSync, rmSync } from 'node:fs';

function replace(path, before, after) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`Step 4 patch anchor missing in ${path}: ${before.slice(0, 80)}`);
  writeFileSync(path, source.replace(before, after), 'utf8');
  console.log(`[step4] updated ${path}`);
}

replace(
  'src/components/UserDashboard.tsx',
  'import LaunchBlueprintView from "./LaunchBlueprintView";',
  'import LaunchBlueprintRouter from "./LaunchBlueprintRouter";'
);
replace(
  'src/components/UserDashboard.tsx',
  '<LaunchBlueprintView\n        orderId={openBlueprintOrderId}',
  '<LaunchBlueprintRouter\n        orderId={openBlueprintOrderId}'
);

replace(
  'src/types/launchBlueprintV21.ts',
  "  'dailyCalendar' | 'generationReceipt' | 'qualityGate'\n> & {\n  contractVersion: '2.1.0';",
  "  'blueprintVersion' | 'dailyCalendar' | 'generationReceipt' | 'qualityGate'\n> & {\n  blueprintVersion: '2.1';\n  contractVersion: '2.1.0';"
);

replace(
  'src/api/launchBlueprintGeneratorV21.ts',
  '  const baseGate = validateGhostTownLaunchBlueprint(blueprint);',
  "  const baseGate = validateGhostTownLaunchBlueprint({ ...blueprint, blueprintVersion: '2.0' } as GhostTownLaunchBlueprint);\n  const failures = [...baseGate.failures];\n  const warnings = [...baseGate.warnings];\n\n  if (blueprint.blueprintVersion !== '2.1') failures.push('Executable Blueprint version must be 2.1.');"
);
replace(
  'src/api/launchBlueprintGeneratorV21.ts',
  "  const failures = [...baseGate.failures];\n  const warnings = [...baseGate.warnings];\n\n  if (blueprint.contractVersion !== '2.1.0')",
  "  if (blueprint.contractVersion !== '2.1.0')"
);
replace(
  'src/api/launchBlueprintGeneratorV21.ts',
  "    ...base,\n    contractVersion: '2.1.0' as const,",
  "    ...base,\n    blueprintVersion: '2.1' as const,\n    contractVersion: '2.1.0' as const,"
);

replace(
  'src/api/blueprintStore.ts',
  "export interface BlueprintEvidenceLedgerEntry {\n  entryId: string;\n  contactOrChannel: string;",
  "export interface BlueprintEvidenceLedgerEntry {\n  entryId: string;\n  blueprintId?: string;\n  blueprintVersion?: string;\n  actionId?: string;\n  checkpointId?: string;\n  createdAt?: string;\n  contactOrChannel: string;"
);
replace(
  'src/api/blueprintStore.ts',
  "export interface BlueprintProgress {\n  completedDays: number[];\n  evidenceNotes: Record<string, string>;\n  evidenceLedger: BlueprintEvidenceLedgerEntry[];\n  checkpointReviews: BlueprintCheckpointReview[];\n  metrics:",
  "export interface BlueprintReminderPreferences {\n  dailyAction: boolean;\n  followUps: boolean;\n  checkpoints: boolean;\n  preferredHourLocal: number;\n}\n\nexport interface BlueprintScheduledReminder {\n  reminderId: string;\n  blueprintId: string;\n  blueprintVersion: string;\n  kind: 'daily_action' | 'follow_up' | 'checkpoint';\n  dueAt: string;\n  actionId?: string;\n  entryId?: string;\n  checkpointId?: string;\n  status: 'pending' | 'done' | 'dismissed';\n}\n\nexport interface BlueprintProgress {\n  completedDays: number[];\n  evidenceNotes: Record<string, string>;\n  evidenceLedger: BlueprintEvidenceLedgerEntry[];\n  checkpointReviews: BlueprintCheckpointReview[];\n  reminderPreferences: BlueprintReminderPreferences;\n  scheduledReminders: BlueprintScheduledReminder[];\n  metrics:"
);
replace(
  'src/api/blueprintStore.ts',
  "    evidenceLedger: [],\n    checkpointReviews: [],\n    metrics:",
  "    evidenceLedger: [],\n    checkpointReviews: [],\n    reminderPreferences: { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 },\n    scheduledReminders: [],\n    metrics:"
);
replace(
  'src/api/blueprintStore.ts',
  "    rows.push({\n      entryId,\n      contactOrChannel:",
  "    rows.push({\n      entryId,\n      blueprintId: limitedText(source.blueprintId, 120) || undefined,\n      blueprintVersion: limitedText(source.blueprintVersion, 40) || undefined,\n      actionId: limitedText(source.actionId, 120) || undefined,\n      checkpointId: limitedText(source.checkpointId, 120) || undefined,\n      createdAt: isoDate(source.createdAt, true) || undefined,\n      contactOrChannel:"
);
replace(
  'src/api/blueprintStore.ts',
  "function finalDecision(value: unknown): BlueprintFinalDecision | undefined {",
  "function normalizeReminderPreferences(value: unknown): BlueprintReminderPreferences {\n  const source = value && typeof value === 'object' ? value as Partial<BlueprintReminderPreferences> : {};\n  const preferredHourLocal = Math.min(23, nonNegativeInteger(source.preferredHourLocal));\n  return {\n    dailyAction: source.dailyAction !== false,\n    followUps: source.followUps !== false,\n    checkpoints: source.checkpoints !== false,\n    preferredHourLocal\n  };\n}\n\nfunction normalizeScheduledReminders(value: unknown): BlueprintScheduledReminder[] {\n  if (!Array.isArray(value)) return [];\n  const seen = new Set<string>();\n  const reminders: BlueprintScheduledReminder[] = [];\n  for (const item of value.slice(0, 250)) {\n    if (!item || typeof item !== 'object') continue;\n    const source = item as Partial<BlueprintScheduledReminder>;\n    const reminderId = limitedText(source.reminderId, 100);\n    const blueprintId = limitedText(source.blueprintId, 120);\n    const blueprintVersion = limitedText(source.blueprintVersion, 40);\n    const dueAt = isoDate(source.dueAt, true);\n    if (!reminderId || !blueprintId || !blueprintVersion || !dueAt || seen.has(reminderId)) continue;\n    const kind = source.kind === 'follow_up' || source.kind === 'checkpoint' ? source.kind : 'daily_action';\n    const status = source.status === 'done' || source.status === 'dismissed' ? source.status : 'pending';\n    seen.add(reminderId);\n    reminders.push({\n      reminderId, blueprintId, blueprintVersion, kind, dueAt, status,\n      actionId: limitedText(source.actionId, 120) || undefined,\n      entryId: limitedText(source.entryId, 120) || undefined,\n      checkpointId: limitedText(source.checkpointId, 120) || undefined\n    });\n  }\n  return reminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));\n}\n\nfunction finalDecision(value: unknown): BlueprintFinalDecision | undefined {"
);
replace(
  'src/api/blueprintStore.ts',
  "    evidenceLedger: normalizeLedger(value.evidenceLedger),\n    checkpointReviews: normalizeCheckpoints(value.checkpointReviews),\n    metrics:",
  "    evidenceLedger: normalizeLedger(value.evidenceLedger),\n    checkpointReviews: normalizeCheckpoints(value.checkpointReviews),\n    reminderPreferences: normalizeReminderPreferences(value.reminderPreferences),\n    scheduledReminders: normalizeScheduledReminders(value.scheduledReminders),\n    metrics:"
);
replace(
  'src/api/blueprintStore.ts',
  "    evidenceLedger: value.evidenceLedger ?? existing.evidenceLedger,\n    checkpointReviews: value.checkpointReviews ?? existing.checkpointReviews,\n    metrics:",
  "    evidenceLedger: value.evidenceLedger ?? existing.evidenceLedger,\n    checkpointReviews: value.checkpointReviews ?? existing.checkpointReviews,\n    reminderPreferences: value.reminderPreferences ?? existing.reminderPreferences,\n    scheduledReminders: value.scheduledReminders ?? existing.scheduledReminders,\n    metrics:"
);

replace(
  'src/api/blueprintApi.ts',
  "  if (request.method === 'GET') return json({ progress: await loadBlueprintProgress(env, orderId, owned.email) });",
  "  if (request.method === 'GET') return json({ progress: await loadBlueprintProgress(env, orderId, owned.email) }, 200, { 'Cache-Control': 'private, no-store' });"
);
replace(
  'src/api/blueprintApi.ts',
  "  return json({ progress });\n}",
  "  return json({ progress }, 200, { 'Cache-Control': 'private, no-store' });\n}"
);

rmSync('scripts/apply-step4-executable-blueprint.mjs', { force: true });
rmSync('.github/workflows/apply-step4-executable-blueprint.yml', { force: true });
console.log('[step4] executable Blueprint patch complete');
