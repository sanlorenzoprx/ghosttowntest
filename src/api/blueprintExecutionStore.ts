import type { Env } from './env';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';

export const DAILY_EXECUTION_LOG_SCHEMA_VERSION = 'ghosttown-daily-execution-log-v1' as const;
export const CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1 = '616c691e6b4c9cea93615963a07375d13ffba57f' as const;

export type ExecutionEvidenceStrength = 'strong' | 'moderate' | 'early' | 'weak';
export type ExecutionCheckpointId = 'day-7' | 'day-14' | 'day-21' | 'day-30';

export interface ExecutionJournalEntry {
  entryId: string;
  accountId?: string;
  blueprintId?: string;
  blueprintVersion?: string;
  actionId?: string;
  checkpointId?: string;
  createdAt?: string;
  contactOrChannel: string;
  date: string;
  action: string;
  response: string;
  customerLanguage: string;
  alternativeMentioned: string;
  objection: string;
  commitmentOffered: string;
  commitmentReceived: string;
  revenueCents: number;
  founderMinutes: number;
  variableCostCents: number;
  followUpDate: string;
  evidenceStrength: ExecutionEvidenceStrength;
  sourceNote: string;
}

export interface ExecutionCheckpointReview {
  dayNumber: 7 | 14 | 21 | 30;
  completedAt: string;
  answers: Record<string, string>;
  evidenceSummary: string;
  strongestEvidence: ExecutionEvidenceStrength | 'none';
  primaryConstraint: string;
  nextAction: string;
  blueprintVersionId?: string;
}

export interface ExecutionReminderPreferences {
  dailyAction: boolean;
  followUps: boolean;
  checkpoints: boolean;
  preferredHourLocal: number;
}

export interface ExecutionScheduledReminder {
  reminderId: string;
  blueprintId: string;
  blueprintVersion: string;
  kind: 'daily_action' | 'follow_up' | 'checkpoint';
  dueAt: string;
  actionId?: string;
  entryId?: string;
  checkpointId?: string;
  status: 'pending' | 'done' | 'dismissed';
}

export interface ExecutionProgressSnapshot {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  evidenceLedger: ExecutionJournalEntry[];
  checkpointReviews: ExecutionCheckpointReview[];
  reminderPreferences: ExecutionReminderPreferences;
  scheduledReminders: ExecutionScheduledReminder[];
  metrics: {
    outreachSent: number;
    replies: number;
    interviews: number;
    qualifiedConversations: number;
    commitments: number;
    revenueCents: number;
    founderMinutes: number;
    variableCostCents: number;
    leads: number;
  };
  finalDecision?: string;
  updatedAt: string;
}

export type AcsReadinessReason =
  | 'day_21_or_30_reached'
  | 'commercial_commitment_recorded'
  | 'repeated_follow_up_risk'
  | 'continue_decision_recorded';

export interface AcsReadinessAssessment {
  schemaVersion: 'acs-readiness-assessment-v1';
  eligible: boolean;
  reasonCodes: AcsReadinessReason[];
  recommendationOnly: true;
  assessedAt: string;
}

export interface BlueprintRegenerationGovernanceInput {
  previousBlueprintId: string;
  previousBlueprintVersion: string;
  nextBlueprintId: string;
  nextBlueprintVersion: string;
  reason: string;
  preservedEvidenceReference: string;
  evidenceChainHash: string;
  canonicalSourceHash: string;
}

function normalizedAccountId(ownerId: string): string {
  return ownerId.trim().toLowerCase();
}

function isV21(blueprint: GhostTownLaunchBlueprint): blueprint is GhostTownLaunchBlueprintV21 {
  return blueprint.blueprintVersion === '2.1' && 'contractVersion' in blueprint;
}

function parseActionDay(actionId: string | undefined): number | null {
  if (!actionId) return null;
  const match = /^day-(\d{1,2})$/.exec(actionId.trim());
  if (!match) return null;
  const day = Number(match[1]);
  return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null;
}

function dayFromEntryDate(date: string, blueprintCreatedAt: string): number | null {
  const entryDate = new Date(`${date}T00:00:00.000Z`);
  const blueprintDate = new Date(blueprintCreatedAt);
  if (Number.isNaN(entryDate.getTime()) || Number.isNaN(blueprintDate.getTime())) return null;
  const elapsed = Math.floor((entryDate.getTime() - blueprintDate.getTime()) / 86_400_000) + 1;
  return Math.min(30, Math.max(1, elapsed));
}

export function checkpointIdForExecutionDay(day: number): ExecutionCheckpointId {
  if (day <= 7) return 'day-7';
  if (day <= 14) return 'day-14';
  if (day <= 21) return 'day-21';
  return 'day-30';
}

function canonicalActionId(entry: ExecutionJournalEntry, blueprint: GhostTownLaunchBlueprint): string {
  const explicit = parseActionDay(entry.actionId);
  const inferred = explicit ?? dayFromEntryDate(entry.date, blueprint.createdAt) ?? 30;
  return `day-${inferred}`;
}

function stableEntryCreatedAt(entry: ExecutionJournalEntry, blueprint: GhostTownLaunchBlueprint): string {
  if (entry.createdAt && !Number.isNaN(new Date(entry.createdAt).getTime())) return new Date(entry.createdAt).toISOString();
  if (entry.date && !Number.isNaN(new Date(`${entry.date}T00:00:00.000Z`).getTime())) {
    return new Date(`${entry.date}T00:00:00.000Z`).toISOString();
  }
  return blueprint.createdAt;
}

export function attachCanonicalExecutionReferences(
  blueprint: GhostTownLaunchBlueprint,
  ownerId: string,
  progress: ExecutionProgressSnapshot
): ExecutionProgressSnapshot {
  if (!isV21(blueprint)) return progress;
  const accountId = normalizedAccountId(ownerId);
  const evidenceLedger = progress.evidenceLedger.map(entry => {
    const actionId = canonicalActionId(entry, blueprint);
    const day = parseActionDay(actionId) ?? 30;
    return {
      ...entry,
      accountId,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId,
      checkpointId: checkpointIdForExecutionDay(day),
      createdAt: stableEntryCreatedAt(entry, blueprint)
    };
  });
  const scheduledReminders = progress.scheduledReminders.map(reminder => ({
    ...reminder,
    blueprintId: blueprint.blueprintId,
    blueprintVersion: blueprint.blueprintVersion
  }));
  return {
    ...progress,
    evidenceLedger,
    scheduledReminders
  };
}

export function deriveAcsReadinessAssessment(
  progress: ExecutionProgressSnapshot,
  assessedAt = new Date().toISOString()
): AcsReadinessAssessment {
  const reasons = new Set<AcsReadinessReason>();
  if (progress.completedDays.some(day => day >= 21)) reasons.add('day_21_or_30_reached');
  if (progress.metrics.commitments > 0 || progress.metrics.revenueCents > 0 || progress.evidenceLedger.some(entry => entry.commitmentReceived.trim().length > 0)) {
    reasons.add('commercial_commitment_recorded');
  }
  const today = assessedAt.slice(0, 10);
  const overdueFollowUps = progress.evidenceLedger.filter(entry =>
    entry.followUpDate && entry.followUpDate < today && entry.commitmentReceived.trim().toLowerCase() !== 'closed'
  ).length;
  if (overdueFollowUps >= 2) reasons.add('repeated_follow_up_risk');
  if (progress.finalDecision === 'continue' || progress.finalDecision === 'continue_with_revision') {
    reasons.add('continue_decision_recorded');
  }
  return {
    schemaVersion: 'acs-readiness-assessment-v1',
    eligible: reasons.size > 0,
    reasonCodes: [...reasons],
    recommendationOnly: true,
    assessedAt
  };
}

export function assertBlueprintRegenerationGovernance(input: BlueprintRegenerationGovernanceInput): void {
  if (!input.previousBlueprintId || !input.previousBlueprintVersion) {
    throw new Error('Blueprint regeneration requires the original Blueprint identity');
  }
  if (!input.nextBlueprintId || !input.nextBlueprintVersion || input.nextBlueprintVersion === input.previousBlueprintVersion) {
    throw new Error('Blueprint regeneration must create a new Blueprint version');
  }
  if (!input.reason.trim()) throw new Error('Blueprint regeneration must record the reason for the change');
  if (!input.preservedEvidenceReference.trim()) throw new Error('Blueprint regeneration must preserve and reference the original evidence');
  if (!input.evidenceChainHash.trim()) throw new Error('Blueprint regeneration must regenerate the evidence chain');
  if (input.canonicalSourceHash !== CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1) {
    throw new Error('Blueprint regeneration must revalidate against the canonical Blueprint hash');
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function canonicalReceipt(blueprint: GhostTownLaunchBlueprintV21) {
  const receipt = blueprint.generationReceipt.canonicalContract;
  if (receipt.gitBlobSha1 !== CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1) {
    throw new Error('Daily Execution Log refused a Blueprint whose canonical source hash does not match v2.1');
  }
  return receipt;
}

async function runStatements(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  if (typeof db.batch === 'function') {
    await db.batch(statements);
    return;
  }
  for (const statement of statements) await statement.run();
}

/**
 * Write-through normalized persistence for the GhostTown Daily Execution Log.
 *
 * Immutable records (`blueprints`, `blueprint_actions`, journal/checkpoint
 * revisions and ACS assessments) use insert-or-ignore semantics so later saves
 * never rewrite earlier recommendations or customer evidence. Mutable operating
 * state (action completion, reminder preferences and reminder status) is updated
 * in place. `launch_blueprint_progress.progress_json` remains a compatibility
 * projection for the current account UI and is written by blueprintStore.ts.
 */
export async function persistBlueprintExecutionArchitecture(
  env: Env,
  blueprint: GhostTownLaunchBlueprint,
  ownerId: string,
  progress: ExecutionProgressSnapshot
): Promise<AcsReadinessAssessment | null> {
  if (!isV21(blueprint)) return null;
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');

  const receipt = canonicalReceipt(blueprint);
  const db = env.DB;
  const accountId = normalizedAccountId(ownerId);
  const now = progress.updatedAt || new Date().toISOString();
  const attached = attachCanonicalExecutionReferences(blueprint, ownerId, progress);
  const statements: D1PreparedStatement[] = [];

  statements.push(db.prepare(`
    INSERT INTO accounts (account_id, normalized_email, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET
      normalized_email = excluded.normalized_email,
      updated_at = excluded.updated_at
  `).bind(accountId, accountId, now, now));

  statements.push(db.prepare(`
    INSERT OR IGNORE INTO blueprints (
      blueprint_id, blueprint_version, account_id, order_id,
      canonical_source_hash, canonical_blueprint_sha256, evidence_chain_path,
      generation_receipt_json, parent_blueprint_id, parent_blueprint_version,
      regeneration_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
  `).bind(
    blueprint.blueprintId,
    blueprint.blueprintVersion,
    accountId,
    blueprint.orderId,
    receipt.gitBlobSha1,
    blueprint.generationReceipt.hashes?.canonicalBlueprintSha256 || null,
    receipt.evidenceManifestPath,
    JSON.stringify(blueprint.generationReceipt),
    blueprint.createdAt,
    now
  ));

  for (const action of blueprint.dailyCalendar) {
    const actionId = `day-${action.dayNumber}`;
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO blueprint_actions (
        blueprint_id, blueprint_version, action_id, day_number,
        completion_key, action_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      actionId,
      action.dayNumber,
      action.completionKey,
      JSON.stringify(action),
      blueprint.createdAt
    ));

    const completed = attached.completedDays.includes(action.dayNumber);
    const note = attached.evidenceNotes[actionId] || attached.evidenceNotes[action.completionKey] || '';
    statements.push(db.prepare(`
      INSERT INTO action_progress (
        account_id, blueprint_id, blueprint_version, action_id,
        status, note, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, blueprint_id, blueprint_version, action_id) DO UPDATE SET
        status = excluded.status,
        note = excluded.note,
        completed_at = CASE
          WHEN excluded.status = 'completed' THEN COALESCE(action_progress.completed_at, excluded.completed_at)
          ELSE NULL
        END,
        updated_at = excluded.updated_at
    `).bind(
      accountId,
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      actionId,
      completed ? 'completed' : 'pending',
      note,
      completed ? now : null,
      now
    ));
  }

  for (const entry of attached.evidenceLedger) {
    const actionId = entry.actionId || canonicalActionId(entry, blueprint);
    const checkpointId = entry.checkpointId || checkpointIdForExecutionDay(parseActionDay(actionId) ?? 30);
    const createdAt = entry.createdAt || stableEntryCreatedAt(entry, blueprint);
    const immutableContent = {
      entryId: entry.entryId,
      accountId,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId,
      checkpointId,
      createdAt,
      contactOrChannel: entry.contactOrChannel,
      date: entry.date,
      action: entry.action,
      response: entry.response,
      customerLanguage: entry.customerLanguage,
      alternativeMentioned: entry.alternativeMentioned,
      objection: entry.objection,
      commitmentOffered: entry.commitmentOffered,
      commitmentReceived: entry.commitmentReceived,
      revenueCents: entry.revenueCents,
      founderMinutes: entry.founderMinutes,
      variableCostCents: entry.variableCostCents,
      followUpDate: entry.followUpDate,
      evidenceStrength: entry.evidenceStrength,
      sourceNote: entry.sourceNote
    };
    const contentSha256 = await sha256Hex(JSON.stringify(immutableContent));
    const revisionId = `${entry.entryId}:${contentSha256}`;

    statements.push(db.prepare(`
      INSERT OR IGNORE INTO journal_entries (
        entry_revision_id, entry_id, content_sha256, account_id,
        blueprint_id, blueprint_version, action_id, checkpoint_id,
        created_at, recorded_at, contact_or_channel, action_text,
        response_text, customer_language, alternative_mentioned, objection,
        commitment_offered, commitment_received, revenue_cents, founder_minutes,
        variable_cost_cents, follow_up_date, source_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      revisionId,
      entry.entryId,
      contentSha256,
      accountId,
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      actionId,
      checkpointId,
      createdAt,
      now,
      entry.contactOrChannel,
      entry.action,
      entry.response,
      entry.customerLanguage,
      entry.alternativeMentioned,
      entry.objection,
      entry.commitmentOffered,
      entry.commitmentReceived,
      entry.revenueCents,
      entry.founderMinutes,
      entry.variableCostCents,
      entry.followUpDate || null,
      entry.sourceNote
    ));

    statements.push(db.prepare(`
      INSERT OR IGNORE INTO journal_evidence (
        evidence_id, entry_revision_id, account_id, blueprint_id,
        blueprint_version, action_id, checkpoint_id, evidence_strength,
        evidence_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `evidence:${revisionId}`,
      revisionId,
      accountId,
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      actionId,
      checkpointId,
      entry.evidenceStrength,
      JSON.stringify({
        response: entry.response,
        customerLanguage: entry.customerLanguage,
        alternativeMentioned: entry.alternativeMentioned,
        objection: entry.objection,
        commitmentOffered: entry.commitmentOffered,
        commitmentReceived: entry.commitmentReceived,
        revenueCents: entry.revenueCents,
        followUpDate: entry.followUpDate,
        sourceNote: entry.sourceNote
      }),
      createdAt
    ));
  }

  statements.push(db.prepare(`
    INSERT INTO reminder_preferences (
      account_id, blueprint_id, blueprint_version, daily_action,
      follow_ups, checkpoints, preferred_hour_local, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, blueprint_id, blueprint_version) DO UPDATE SET
      daily_action = excluded.daily_action,
      follow_ups = excluded.follow_ups,
      checkpoints = excluded.checkpoints,
      preferred_hour_local = excluded.preferred_hour_local,
      updated_at = excluded.updated_at
  `).bind(
    accountId,
    blueprint.blueprintId,
    blueprint.blueprintVersion,
    attached.reminderPreferences.dailyAction ? 1 : 0,
    attached.reminderPreferences.followUps ? 1 : 0,
    attached.reminderPreferences.checkpoints ? 1 : 0,
    attached.reminderPreferences.preferredHourLocal,
    now
  ));

  for (const reminder of attached.scheduledReminders) {
    statements.push(db.prepare(`
      INSERT INTO scheduled_reminders (
        reminder_id, account_id, blueprint_id, blueprint_version, kind,
        due_at, action_id, entry_id, checkpoint_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(reminder_id) DO UPDATE SET
        due_at = excluded.due_at,
        action_id = excluded.action_id,
        entry_id = excluded.entry_id,
        checkpoint_id = excluded.checkpoint_id,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).bind(
      reminder.reminderId,
      accountId,
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      reminder.kind,
      reminder.dueAt,
      reminder.actionId || null,
      reminder.entryId || null,
      reminder.checkpointId || null,
      reminder.status,
      now,
      now
    ));
  }

  for (const review of attached.checkpointReviews) {
    const checkpointId = checkpointIdForExecutionDay(review.dayNumber);
    const reviewContent = {
      ...review,
      accountId,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      checkpointId
    };
    const contentSha256 = await sha256Hex(JSON.stringify(reviewContent));
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO checkpoint_reviews (
        review_revision_id, content_sha256, account_id, blueprint_id,
        blueprint_version, checkpoint_id, day_number, completed_at,
        review_json, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `checkpoint:${blueprint.blueprintId}:${blueprint.blueprintVersion}:${checkpointId}:${contentSha256}`,
      contentSha256,
      accountId,
      blueprint.blueprintId,
      blueprint.blueprintVersion,
      checkpointId,
      review.dayNumber,
      review.completedAt,
      JSON.stringify(reviewContent),
      now
    ));
  }

  const acsReadiness = deriveAcsReadinessAssessment(attached, now);
  const acsContent = {
    ...acsReadiness,
    accountId,
    blueprintId: blueprint.blueprintId,
    blueprintVersion: blueprint.blueprintVersion,
    metrics: attached.metrics,
    completedDays: attached.completedDays,
    finalDecision: attached.finalDecision || null
  };
  const acsHash = await sha256Hex(JSON.stringify(acsContent));
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO acs_readiness_assessments (
      assessment_id, content_sha256, account_id, blueprint_id,
      blueprint_version, eligible, reason_codes_json, assessment_json,
      governance_status, assessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'recommendation_only', ?)
  `).bind(
    `acs:${blueprint.blueprintId}:${blueprint.blueprintVersion}:${acsHash}`,
    acsHash,
    accountId,
    blueprint.blueprintId,
    blueprint.blueprintVersion,
    acsReadiness.eligible ? 1 : 0,
    JSON.stringify(acsReadiness.reasonCodes),
    JSON.stringify(acsContent),
    now
  ));

  await runStatements(db, statements);
  return acsReadiness;
}
