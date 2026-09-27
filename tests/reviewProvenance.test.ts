import { describe, expect, it } from 'vitest';
import type { CompetitorReviewObservation } from '../src/types/launchBlueprint';
import type { CompetitorSeed } from '../src/types/paidTest';
import {
  hasFirstPersonUserSignal,
  isEligibleReviewSource,
  phraseSupportedByObservations
} from '../src/api/competitorReviewIntelligence';

const seed: CompetitorSeed = {
  seedId: 'seed_cursor',
  name: 'Cursor',
  website: 'https://cursor.com',
  domain: 'cursor.com',
  relationship: 'adjacent_product',
  origin: 'customer_confirmed',
  verifiedAt: '2026-09-27T00:00:00.000Z'
};

const observations: CompetitorReviewObservation[] = [
  {
    observationId: 'obs_1',
    competitorSeedId: 'seed_cursor',
    competitorName: 'Cursor',
    sourceId: 'source_1',
    sourceUrl: 'https://reviews.example.com/cursor/1',
    sourceTitle: 'Cursor review',
    accessedAt: '2026-09-27T00:00:00.000Z',
    customerLanguage: [
      'Authentication setup was confusing when I tried to launch.',
      'I paid because I wanted to move faster.'
    ]
  },
  {
    observationId: 'obs_2',
    competitorSeedId: 'seed_cursor',
    competitorName: 'Cursor',
    sourceId: 'source_2',
    sourceUrl: 'https://community.example.com/cursor/2',
    sourceTitle: 'Cursor discussion',
    accessedAt: '2026-09-27T00:00:00.000Z',
    customerLanguage: [
      'I wish the deployment checklist was clearer.'
    ]
  }
];

describe('review provenance hardening', () => {
  it('requires a first-person experience signal before treating page text as customer language', () => {
    expect(hasFirstPersonUserSignal('I used Cursor and found authentication confusing.')).toBe(true);
    expect(hasFirstPersonUserSignal('Our platform makes teams faster with world-class AI.')).toBe(false);
  });

  it('rejects competitor-owned marketing pages while allowing competitor-owned review/community paths with user evidence', () => {
    const userText = 'I used Cursor for my app and I paid because I wanted to ship faster.';
    expect(isEligibleReviewSource(seed, 'https://cursor.com/features', userText)).toBe(false);
    expect(isEligibleReviewSource(seed, 'https://cursor.com/community/thread/123', userText)).toBe(true);
    expect(isEligibleReviewSource(seed, 'https://reviews.example.com/cursor', userText)).toBe(true);
  });

  it('keeps only phrases that are traceable to verified observation text', () => {
    expect(phraseSupportedByObservations('authentication setup was confusing', observations)).toBe(true);
    expect(phraseSupportedByObservations('deployment checklist was clearer', observations, ['source_2'])).toBe(true);
    expect(phraseSupportedByObservations('users love the pricing', observations)).toBe(false);
  });

  it('respects source provenance when validating model-returned language', () => {
    expect(phraseSupportedByObservations('authentication setup was confusing', observations, ['source_1'])).toBe(true);
    expect(phraseSupportedByObservations('authentication setup was confusing', observations, ['source_2'])).toBe(false);
  });
});
