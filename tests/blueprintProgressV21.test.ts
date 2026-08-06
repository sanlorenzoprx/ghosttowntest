import { describe, expect, it } from 'vitest';
import {
  emptyBlueprintProgress,
  normalizeBlueprintProgress
} from '../src/api/blueprintStore';

describe('Blueprint v2.1 progress evidence contract', () => {
  it('keeps legacy progress compatible while adding empty evidence systems', () => {
    const progress = normalizeBlueprintProgress({
      completedDays: [3, 1, 3, 40],
      evidenceNotes: { day1: 'Interview notes' },
      metrics: {
        outreachSent: 10,
        replies: 2,
        interviews: 1,
        qualifiedConversations: 1,
        commitments: 0,
        revenueCents: 0,
        founderMinutes: 0,
        variableCostCents: 0,
        leads: 0
      },
      finalDecision: 'revise',
      updatedAt: 'ignored'
    });

    expect(progress.completedDays).toEqual([1, 3]);
    expect(progress.evidenceLedger).toEqual([]);
    expect(progress.checkpointReviews).toEqual([]);
    expect(progress.finalDecision).toBe('revise');
  });

  it('normalizes, bounds, and deduplicates evidence ledger entries', () => {
    const progress = normalizeBlueprintProgress({
      ...emptyBlueprintProgress(),
      evidenceLedger: [
        {
          entryId: 'reply-1',
          contactOrChannel: 'Priority Community',
          date: '2026-08-06',
          action: 'Sent a qualified interview request.',
          response: 'Buyer described a recent costly workaround.',
          customerLanguage: 'I lose a full afternoon every time this happens.',
          alternativeMentioned: 'Spreadsheet',
          objection: 'Needs manager approval',
          commitmentOffered: 'Twenty-minute follow-up',
          commitmentReceived: 'Meeting booked',
          revenueCents: -1,
          founderMinutes: 18.9,
          variableCostCents: 0,
          followUpDate: '2026-08-10',
          evidenceStrength: 'moderate',
          sourceNote: 'Email reply retained in the customer account.'
        },
        {
          entryId: 'reply-1',
          contactOrChannel: 'Duplicate must be removed',
          date: '',
          action: '',
          response: '',
          customerLanguage: '',
          alternativeMentioned: '',
          objection: '',
          commitmentOffered: '',
          commitmentReceived: '',
          revenueCents: 0,
          founderMinutes: 0,
          variableCostCents: 0,
          followUpDate: '',
          evidenceStrength: 'weak',
          sourceNote: ''
        }
      ]
    });

    expect(progress.evidenceLedger).toHaveLength(1);
    expect(progress.evidenceLedger[0]).toMatchObject({
      entryId: 'reply-1',
      revenueCents: 0,
      founderMinutes: 18,
      evidenceStrength: 'moderate',
      followUpDate: '2026-08-10'
    });
  });

  it('stores one ordered review for each canonical checkpoint day', () => {
    const progress = normalizeBlueprintProgress({
      ...emptyBlueprintProgress(),
      checkpointReviews: [
        {
          dayNumber: 21,
          completedAt: '2026-08-27T12:00:00Z',
          answers: { commitment: 'One paid pilot.' },
          evidenceSummary: 'Payment and accepted written scope.',
          strongestEvidence: 'strong',
          primaryConstraint: 'fulfillment',
          nextAction: 'Rehearse delivery before increasing acquisition.'
        },
        {
          dayNumber: 7,
          completedAt: '2026-08-13T12:00:00Z',
          answers: { access: 'Qualified buyers are reachable.' },
          evidenceSummary: 'Two qualified replies.',
          strongestEvidence: 'early',
          primaryConstraint: 'message',
          nextAction: 'Use exact buyer language in the opening.'
        },
        {
          dayNumber: 21,
          completedAt: '2026-08-27T13:00:00Z',
          answers: { replacement: 'Latest review replaces earlier Day 21 review.' },
          evidenceSummary: 'One paid pilot and one proposal request.',
          strongestEvidence: 'strong',
          primaryConstraint: 'fulfillment',
          nextAction: 'Measure actual founder time and variable cost.'
        }
      ]
    });

    expect(progress.checkpointReviews.map(item => item.dayNumber)).toEqual([7, 21]);
    expect(progress.checkpointReviews[1].answers.replacement).toContain('Latest review');
  });
});
