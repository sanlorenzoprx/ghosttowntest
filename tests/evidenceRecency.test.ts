import { describe, expect, it } from 'vitest';
import {
  activityLevelFromDate,
  currentActivityStatusFromDate,
  evidenceRecencyFromDate,
  extractEvidenceDateFromHtml
} from '../src/api/evidenceRecency';

const NOW = Date.parse('2026-09-26T16:00:00.000Z');

describe('evidence recency integrity', () => {
  it('does not turn a 2015 article into current evidence because it was researched in 2026', () => {
    const dated = extractEvidenceDateFromHtml(
      '<html><head><meta property="article:published_time" content="2015-06-10T00:00:00.000Z"></head></html>',
      'https://example.com/dosecast',
      'Dosecast article'
    );

    expect(dated.date).toBe('2015-06-10T00:00:00.000Z');
    expect(dated.source).toBe('published_metadata');
    expect(evidenceRecencyFromDate(dated.date, NOW)).toBe('stale');
    expect(currentActivityStatusFromDate(dated.date, NOW)).toBe('verified_inactive');
    expect(activityLevelFromDate(dated.date, NOW)).toBe('uncertain');
  });

  it('treats a year in an event URL/title as evidence date, not research-access date', () => {
    const dated = extractEvidenceDateFromHtml(
      '<html><head><title>CES 2022 medication technology</title></head></html>',
      'https://example.com/ces-2022',
      'CES 2022 medication technology'
    );

    expect(dated.date).toBe('2022-01-01T00:00:00.000Z');
    expect(dated.source).toBe('page_year');
    expect(evidenceRecencyFromDate(dated.date, NOW)).toBe('stale');
  });

  it('fails closed when the underlying evidence date is unknown', () => {
    const dated = extractEvidenceDateFromHtml(
      '<html><head><title>Medication conference</title></head></html>',
      'https://example.com/conference',
      'Medication conference'
    );

    expect(dated.date).toBeUndefined();
    expect(dated.source).toBe('unknown');
    expect(evidenceRecencyFromDate(dated.date, NOW)).toBe('unknown');
    expect(currentActivityStatusFromDate(dated.date, NOW)).toBe('unverified');
    expect(activityLevelFromDate(dated.date, NOW)).toBe('uncertain');
  });

  it('recognizes genuinely current dated activity independently of the research date', () => {
    const activityDate = '2026-09-01T12:00:00.000Z';

    expect(evidenceRecencyFromDate(activityDate, NOW)).toBe('current');
    expect(currentActivityStatusFromDate(activityDate, NOW)).toBe('verified_current');
    expect(activityLevelFromDate(activityDate, NOW)).toBe('recent');
  });
});
