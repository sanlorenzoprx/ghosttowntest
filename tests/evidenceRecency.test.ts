import { describe, expect, it } from 'vitest';
import {
  activityLevelFromDate,
  currentActivityStatusFromDate,
  evidenceRecencyFromDate,
  extractDiscussionActivityDateFromHtml,
  extractDiscussionActivityDateFromText,
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

  it('uses explicit forum post/reply dates as current-activity evidence without confusing membership dates', () => {
    const activityDate = extractDiscussionActivityDateFromText(
      'Member since September 25, 2025. Posted April 13, 2026 23:54. Replied September 18, 2026 16:02.',
      NOW
    );

    expect(activityDate).toBe('2026-09-18T00:00:00.000Z');
    expect(currentActivityStatusFromDate(activityDate, NOW)).toBe('verified_current');
  });

  it('ignores future-looking forum dates when verifying current activity', () => {
    const activityDate = extractDiscussionActivityDateFromText(
      'Posted October 20, 2026 12:00. Replied May 10, 2026 09:00.',
      NOW
    );

    expect(activityDate).toBe('2026-05-10T00:00:00.000Z');
  });

  it('uses structured forum timestamps and keeps the latest actual discussion activity', () => {
    const activityDate = extractDiscussionActivityDateFromHtml(
      '<article><time datetime="2026-04-02T10:00:00Z">April 2</time></article>' +
      '<div data-state="reply"><time datetime="2026-09-24T18:30:00Z">2 days ago</time></div>' +
      '<script type="application/ld+json">{"dateModified":"2026-09-23T12:00:00Z"}</script>',
      'Original post April 2. Latest reply 2 days ago.',
      NOW
    );

    expect(activityDate).toBe('2026-09-24T18:30:00.000Z');
    expect(currentActivityStatusFromDate(activityDate, NOW)).toBe('verified_current');
  });

  it('recognizes abbreviated and relative discussion dates without using unrelated membership dates', () => {
    const abbreviated = extractDiscussionActivityDateFromText(
      'Member since Sep 2023. Last reply: Sep. 20, 2026. Updated Sep 21, 2026.',
      NOW
    );
    const relative = extractDiscussionActivityDateFromText('Joined 2020. 3 days ago · Reply · Like', NOW);

    expect(abbreviated).toBe('2026-09-21T00:00:00.000Z');
    expect(relative).toBe('2026-09-23T16:00:00.000Z');
  });
});
