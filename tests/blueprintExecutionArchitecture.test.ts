import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GhostTownLaunchBlueprint } from '../src/types/launchBlueprint';
import {
  CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
  assertBlueprintRegenerationGovernance,
  attachCanonicalExecutionReferences,
  checkpointIdForExecutionDay,
  deriveAcsReadinessAssessment,
  type ExecutionProgressSnapshot
} from '../src/api/blueprintExecutionStore';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const migration = readFileSync(new URL('../migrations/0004_blueprint_execution_log.sql', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../src/api/blueprintExecutionStore.ts', import.meta.url), 'utf8');

function v21Blueprint(): GhostTownLaunchBlueprint {
  const base = launchBlueprintFixture();
  return {
    ...base,
    blueprintVersion: '2.1',
    contractVersion: '2.1.1',
    generationReceipt: {
      ...base.generationReceipt,
      canonicalContract: {
        version: '2.1.1',
        gitBlobSha1: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
        sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md',
        changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md',
        evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json',
        verifiedAt: base.createdAt
      }
    }
  } as unknown as GhostTownLaunchBlueprint;
}

function progress(): ExecutionProgressSnapshot {
  return {
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [],
    checkpointReviews: [],
    reminderPreferences: { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 },
    scheduledReminders: [],
    metrics: {
      outreachSent: 0,
      replies: 0,
      interviews: 0,
      qualifiedConversations: 0,
      commitments: 0,
      revenueCents: 0,
      founderMinutes: 0,
      variableCostCents: 0,
      leads: 0
    },
    updatedAt: '2026-08-07T10:00:00.000Z'
  };
}

describe('GhostTown Daily Execution Log normalized architecture', () => {
  it('creates the complete version-attached table set', () => {
    for (const table of [
      'accounts',
      'blueprints',
      'blueprint_actions',
      'action_progress',
      'journal_entries',
      'journal_evidence',
      'reminder_preferences',
      'scheduled_reminders',
      'checkpoint_reviews',
      'acs_readiness_assessments'
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(migration).toContain('account_id TEXT NOT NULL');
    expect(migration).toContain('blueprint_id TEXT NOT NULL');
    expect(migration).toContain('blueprint_version TEXT NOT NULL');
    expect(migration).toContain('action_id TEXT NOT NULL');
    expect(migration).toContain('checkpoint_id TEXT NOT NULL');
    expect(migration).toContain('created_at TEXT NOT NULL');
  });

  it('attaches every journal entry to the canonical account, Blueprint version, action and checkpoint', () => {
    const blueprint = v21Blueprint();
    const current = progress();
    current.evidenceLedger = [{
      entryId: 'entry-1',
      contactOrChannel: 'Maria',
      date: '2026-08-08',
      action: 'Asked for a paid pilot',
      response: 'Interested',
      customerLanguage: 'Can we start Monday?',
      alternativeMentioned: 'Spreadsheet',
      objection: '',
      commitmentOffered: 'Paid pilot',
      commitmentReceived: 'Deposit promised',
      revenueCents: 0,
      founderMinutes: 20,
      variableCostCents: 0,
      followUpDate: '2026-08-09',
      evidenceStrength: 'moderate',
      sourceNote: 'Call notes',
      actionId: 'day-8'
    }];
    const attached = attachCanonicalExecutionReferences(blueprint, 'FOUNDER@EXAMPLE.COM', current);
    expect(attached.evidenceLedger[0]).toMatchObject({
      accountId: 'founder@example.com',
      blueprintId: blueprint.blueprintId,
      blueprintVersion: '2.1',
      actionId: 'day-8',
      checkpointId: 'day-14'
    });
  });

  it('uses canonical checkpoint windows for execution evidence', () => {
    expect(checkpointIdForExecutionDay(1)).toBe('day-7');
    expect(checkpointIdForExecutionDay(8)).toBe('day-14');
    expect(checkpointIdForExecutionDay(15)).toBe('day-21');
    expect(checkpointIdForExecutionDay(22)).toBe('day-30');
  });

  it('does not make ACS eligible merely because a journal entry exists', () => {
    const current = progress();
    current.evidenceLedger.push({
      entryId: 'entry-1', contactOrChannel: 'Community', date: '2026-08-07', action: 'Posted', response: 'Viewed', customerLanguage: '',
      alternativeMentioned: '', objection: '', commitmentOffered: '', commitmentReceived: '', revenueCents: 0, founderMinutes: 5,
      variableCostCents: 0, followUpDate: '', evidenceStrength: 'weak', sourceNote: ''
    });
    expect(deriveAcsReadinessAssessment(current, '2026-08-07T12:00:00.000Z')).toMatchObject({
      eligible: false,
      reasonCodes: [],
      recommendationOnly: true
    });
  });

  it('marks ACS readiness only on meaningful evidence-led triggers', () => {
    const current = progress();
    current.completedDays = [1, 2, 3, 21];
    current.metrics.commitments = 1;
    current.finalDecision = 'continue_with_revision';
    const assessment = deriveAcsReadinessAssessment(current, '2026-08-07T12:00:00.000Z');
    expect(assessment.eligible).toBe(true);
    expect(assessment.reasonCodes).toContain('day_21_or_30_reached');
    expect(assessment.reasonCodes).toContain('commercial_commitment_recorded');
    expect(assessment.reasonCodes).toContain('continue_decision_recorded');
  });

  it('enforces new-version regeneration with preserved evidence, reason, evidence chain and canonical hash', () => {
    expect(() => assertBlueprintRegenerationGovernance({
      previousBlueprintId: 'bp-1',
      previousBlueprintVersion: '2.1',
      nextBlueprintId: 'bp-2',
      nextBlueprintVersion: '2.2',
      reason: 'Day 14 evidence invalidated the original channel recommendation.',
      preservedEvidenceReference: 'journal://bp-1/2.1/day-14',
      evidenceChainHash: 'sha256:evidence-chain-v2',
      canonicalSourceHash: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1
    })).not.toThrow();

    expect(() => assertBlueprintRegenerationGovernance({
      previousBlueprintId: 'bp-1',
      previousBlueprintVersion: '2.1',
      nextBlueprintId: 'bp-1',
      nextBlueprintVersion: '2.1',
      reason: 'Rewrite in place',
      preservedEvidenceReference: 'journal://bp-1/2.1',
      evidenceChainHash: 'sha256:evidence-chain-v2',
      canonicalSourceHash: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1
    })).toThrow('new Blueprint version');
  });

  it('keeps customer evidence and checkpoint history append-only', () => {
    expect(storeSource).toContain('INSERT OR IGNORE INTO journal_entries');
    expect(storeSource).toContain('INSERT OR IGNORE INTO journal_evidence');
    expect(storeSource).toContain('INSERT OR IGNORE INTO checkpoint_reviews');
    expect(storeSource).toContain('INSERT OR IGNORE INTO acs_readiness_assessments');
    expect(storeSource).toContain('recommendation_only');
  });
});
