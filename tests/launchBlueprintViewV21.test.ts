import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isBlueprintV21 } from '../src/components/LaunchBlueprintRouter';
import {
  upsertCheckpointReview,
  upsertEvidenceEntry,
  type CheckpointReviewV21,
  type EvidenceLedgerEntryV21
} from '../src/components/LaunchBlueprintViewV21';

const viewSource = readFileSync(new URL('../src/components/LaunchBlueprintViewV21.tsx', import.meta.url), 'utf8');
const routerSource = readFileSync(new URL('../src/components/LaunchBlueprintRouter.tsx', import.meta.url), 'utf8');

describe('executable Blueprint v2.1 account surface', () => {
  it('routes v2.1 records separately while preserving legacy v2 compatibility', () => {
    expect(isBlueprintV21({ blueprintVersion: '2.1' })).toBe(true);
    expect(isBlueprintV21({ blueprintVersion: '2.0' })).toBe(false);
    expect(routerSource).toContain('return <LaunchBlueprintViewV21');
    expect(routerSource).toContain('return <LaunchBlueprintView orderId={orderId}');
  });

  it('exposes the 48-hour card and first-revenue operating system', () => {
    expect(viewSource).toContain('48-hour Launch Card');
    expect(viewSource).toContain('Exact first message');
    expect(viewSource).toContain('First measurable commitment');
    expect(viewSource).toContain('Founder time boundary');
    expect(viewSource).toContain('Test cash boundary');
    expect(viewSource).toContain('Day-30 evidence requirement');
    expect(viewSource).toContain('Selected execution lane');
    expect(viewSource).toContain('Founding Customer Pilot Brief');
  });

  it('creates and edits version-attached evidence entries deterministically', () => {
    const base: EvidenceLedgerEntryV21 = {
      entryId: 'e1', blueprintId: 'bp1', blueprintVersion: '2.1', actionId: 'day-8', createdAt: '2026-08-07T10:00:00.000Z',
      contactOrChannel: 'Buyer A', date: '2026-08-07', action: 'Pilot ask', response: 'Interested', customerLanguage: 'Need this before Monday',
      alternativeMentioned: 'Spreadsheet', objection: '', commitmentOffered: 'Paid pilot', commitmentReceived: '', revenueCents: 0,
      founderMinutes: 15, variableCostCents: 0, followUpDate: '2026-08-08', evidenceStrength: 'early', sourceNote: 'Call note'
    };
    const edited = { ...base, commitmentReceived: 'Deposit', revenueCents: 5000, evidenceStrength: 'strong' as const };
    const entries = upsertEvidenceEntry([base], edited);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ entryId: 'e1', blueprintVersion: '2.1', commitmentReceived: 'Deposit', revenueCents: 5000 });
  });

  it('stores checkpoint review saves as explicit version-linked records', () => {
    const day7: CheckpointReviewV21 = {
      dayNumber: 7, completedAt: '2026-08-07T10:00:00.000Z', answers: {}, evidenceSummary: 'No replies yet', strongestEvidence: 'weak',
      primaryConstraint: 'access', nextAction: 'Change the access path', blueprintVersionId: 'bp1'
    };
    const day7Revision = { ...day7, evidenceSummary: 'Two qualified replies', strongestEvidence: 'early' as const };
    const reviews = upsertCheckpointReview([day7], day7Revision);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ dayNumber: 7, evidenceSummary: 'Two qualified replies', blueprintVersionId: 'bp1' });
  });

  it('keeps branch rules visible in the daily calendar and exposes fulfillment economics', () => {
    expect(viewSource).toContain('Branch rule');
    expect(viewSource).toContain('<strong>IF</strong>');
    expect(viewSource).toContain('<strong>THEN</strong>');
    expect(viewSource).toContain('Founder-hours guardrail');
    expect(viewSource).toContain('Variable-cost field');
    expect(viewSource).toContain('Gross-margin guardrail');
    expect(viewSource).toContain('Intentionally manual');
  });

  it('provides mobile navigation and resilient save states', () => {
    expect(viewSource).toContain('id="blueprint-mobile-nav"');
    expect(viewSource).toContain('md:hidden');
    expect(viewSource).toContain('Retry save');
    expect(viewSource).toContain('Unsaved local changes were restored');
    expect(viewSource).toContain('window.setTimeout(() => void persist(next), 650)');
  });

  it('shows linked Get Me Live website evidence during checkpoint reviews without merging the products', () => {
    expect(viewSource).toContain('SprintWebsiteEvidence');
    expect(viewSource).toContain('<SprintWebsiteEvidence orderId={orderId} />');
  });

  it('integrates the Daily Execution Log as evidence rather than plan mutation', () => {
    expect(viewSource).toContain('GhostTown Daily Execution Log');
    expect(viewSource).toContain('It cannot silently rewrite the plan.');
    expect(viewSource).toContain('Any future regeneration must create a new Blueprint version');
    expect(viewSource).toContain('In-app reminders');
  });
});
