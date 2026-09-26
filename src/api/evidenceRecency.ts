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
