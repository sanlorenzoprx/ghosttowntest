import type {
  CurrentActivityStatus,
  EvidenceDateSource,
  EvidenceRecency
} from '../types/launchBlueprint';

export const CURRENT_EVIDENCE_MAX_DAYS = 90;
export const RECENT_EVIDENCE_MAX_DAYS = 365;
export const CURRENT_ACTIVITY_MAX_DAYS = 120;

function timestamp(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number'
    ? (value > 10_000_000_000 ? value : value * 1000)
    : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizedEvidenceDate(value: string | number | undefined): string | undefined {
  const parsed = timestamp(value);
  return parsed === undefined ? undefined : new Date(parsed).toISOString();
}

export function ageInDays(value: string | number | undefined, now = Date.now()): number | undefined {
  const parsed = timestamp(value);
  if (parsed === undefined) return undefined;
  return Math.max(0, (now - parsed) / 86_400_000);
}

export function evidenceRecencyFromDate(value: string | number | undefined, now = Date.now()): EvidenceRecency {
  const age = ageInDays(value, now);
  if (age === undefined) return 'unknown';
  if (age <= CURRENT_EVIDENCE_MAX_DAYS) return 'current';
  if (age <= RECENT_EVIDENCE_MAX_DAYS) return 'recent';
  return 'stale';
}

export function currentActivityStatusFromDate(
  value: string | number | undefined,
  now = Date.now()
): CurrentActivityStatus {
  const age = ageInDays(value, now);
  if (age === undefined) return 'unverified';
  return age <= CURRENT_ACTIVITY_MAX_DAYS ? 'verified_current' : 'verified_inactive';
}

export function activityLevelFromDate(
  value: string | number | undefined,
  now = Date.now()
): 'recent' | 'active' | 'occasional' | 'uncertain' {
  const age = ageInDays(value, now);
  if (age === undefined) return 'uncertain';
  if (age <= 45) return 'recent';
  if (age <= CURRENT_ACTIVITY_MAX_DAYS) return 'active';
  if (age <= RECENT_EVIDENCE_MAX_DAYS) return 'occasional';
  return 'uncertain';
}

function latestPlausibleDate(values: Array<string | number | undefined>, now: number): string | undefined {
  const dates = values
    .map(timestamp)
    .filter((value): value is number => value !== undefined && value <= now + 86_400_000);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
}

export function extractDiscussionActivityDateFromText(value: string, now = Date.now()): string | undefined {
  const dates: Array<string | number | undefined> = [];
  const monthPattern = /\b(?:Posted|Replied|Updated|Published|Last\s+(?:reply|post|activity)|Latest\s+(?:reply|post|activity))[:\s-]*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d{2})(?:\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*[AP]M)?)?/gi;
  for (const match of value.matchAll(monthPattern)) {
    dates.push(`${match[1]} ${match[2]}, ${match[3]} UTC`);
  }

  const isoPattern = /\b(?:Posted|Replied|Updated|Published|Last\s+(?:reply|post|activity)|Latest\s+(?:reply|post|activity))[:\s-]*(20\d{2}-\d{2}-\d{2})(?:[T\s][0-9:.+-Z]+)?/gi;
  for (const match of value.matchAll(isoPattern)) dates.push(match[1]);

  const relativePattern = /\b(?:(\d+)\s+)?(minute|hour|day|week)s?\s+ago\b/gi;
  for (const match of value.matchAll(relativePattern)) {
    const count = Number(match[1] || '1');
    const unitMs = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[match[2].toLowerCase() as 'minute' | 'hour' | 'day' | 'week'];
    if (Number.isFinite(count) && count >= 0 && count <= 120) dates.push(now - (count * unitMs));
  }

  return latestPlausibleDate(dates, now);
}

export function extractDiscussionActivityDateFromHtml(html: string, visibleText = '', now = Date.now()): string | undefined {
  const structuredDates: Array<string | number | undefined> = [
    ...Array.from(html.matchAll(/<time[^>]+datetime=["']([^"']+)["']/gi)).map(match => match[1]),
    ...Array.from(html.matchAll(/"(?:dateModified|dateCreated|datePublished|lastActivityAt|updatedAt|createdAt)"\s*:\s*"([^"]+)"/gi)).map(match => match[1]),
    ...Array.from(html.matchAll(/(?:data-(?:time|timestamp)|datetime)=["'](\d{10,13})["']/gi)).map(match => Number(match[1]))
  ];
  const textDate = extractDiscussionActivityDateFromText(visibleText, now);
  return latestPlausibleDate([...structuredDates, textDate], now);
}

export interface ExtractedEvidenceDate {
  date?: string;
  source: EvidenceDateSource;
}

function firstParsed(values: string[]): string | undefined {
  for (const value of values) {
    const normalized = normalizedEvidenceDate(value);
    if (normalized) return normalized;
  }
  return undefined;
}

export function extractEvidenceDateFromHtml(html: string, url = '', title = ''): ExtractedEvidenceDate {
  const candidates = [
    ...Array.from(html.matchAll(/<meta[^>]+(?:property|name|itemprop)=["'](?:article:published_time|datePublished|date|publish-date|pubdate)["'][^>]+content=["']([^"']+)["']/gi)).map(match => match[1]),
    ...Array.from(html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:article:published_time|datePublished|date|publish-date|pubdate)["']/gi)).map(match => match[1]),
    ...Array.from(html.matchAll(/<time[^>]+datetime=["']([^"']+)["']/gi)).map(match => match[1]),
    ...Array.from(html.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)).map(match => match[1])
  ];
  const exact = firstParsed(candidates);
  if (exact) return { date: exact, source: 'published_metadata' };

  const years = `${url} ${title}`.match(/\b(20\d{2})\b/g) || [];
  const plausibleYears = years
    .map(Number)
    .filter(year => year >= 2000 && year <= new Date().getUTCFullYear())
    .sort((a, b) => b - a);
  if (plausibleYears.length) {
    return { date: `${plausibleYears[0]}-01-01T00:00:00.000Z`, source: 'page_year' };
  }
  return { source: 'unknown' };
}
