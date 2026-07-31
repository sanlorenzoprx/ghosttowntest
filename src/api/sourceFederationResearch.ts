import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import type { BlueprintSource, CustomerAccessChannel } from '../types/launchBlueprint';
import type { CustomerAccessResearchInput } from './launchBlueprintGenerator';
import {
  RESEARCH_SOURCE_REGISTRY,
  approvedResearchSources,
  type ResearchAccessMode,
  type ResearchPackId,
  type ResearchQueryStrategy,
  type ResearchSourceDefinition
} from './researchSourceRegistry';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BATCH_SIZE = 6;
const DEFAULT_MAX_SOURCES = 50;
const MIN_ATTEMPTED_SOURCES = 30;
const MIN_SUCCESSFUL_SOURCES = 15;
const MIN_SOURCE_TYPES = 3;
const MIN_CHANNELS = 10;
const MAX_CHANNELS = 25;
const MAX_CANDIDATES_PER_SOURCE = 3;
const MAX_CANDIDATES_FOR_MODEL = 70;

export interface CustomerAccessResearchReceipt {
  provider: 'source_federation';
  model: string;
  requestedAt: string;
  completedAt: string;
  packs: ResearchPackId[];
  webSearchQueries: string[];
  attemptedSourceCount: number;
  successfulSourceCount: number;
  sourceTypeCount: number;
  candidateChannelCount: number;
  verifiedChannelCount: number;
  rejectedUrls: Array<{ url: string; reason: string }>;
  failedSources: Array<{ sourceId: string; reason: string }>;
  sourceDefinitionIds: string[];
  responseHash: string;
}

export interface CustomerAccessResearchResult {
  research: CustomerAccessResearchInput;
  receipt: CustomerAccessResearchReceipt;
}

export interface SourceFederationPlan {
  planVersion: 'source-federation-plan-v1';
  createdAt: string;
  packs: ResearchPackId[];
  sourceIds: string[];
  queryBySourceId: Record<string, string>;
  language: string;
  geography: string;
}

export interface FederatedCandidate {
  candidateId: string;
  sourceDefinitionId: string;
  sourceName: string;
  sourceType: ResearchAccessMode;
  title: string;
  publicUrl: string;
  publisher: string;
  platform: string;
  activity: CustomerAccessChannel['activity'];
  confidence: CustomerAccessChannel['confidence'];
  factualSignals: string[];
  participationRuleEvidence?: string;
  observedAt: string;
}

export interface ResearchSourceAttempt {
  sourceId: string;
  sourceType: ResearchAccessMode;
  success: boolean;
  query: string;
  candidateCount: number;
  error?: string;
}

export interface ResearchBatchResult {
  batchId: string;
  completedAt: string;
  attempts: ResearchSourceAttempt[];
  candidates: FederatedCandidate[];
  rejectedUrls: Array<{ url: string; reason: string }>;
}

interface StackExchangeResponse {
  items?: Array<{ title?: string; link?: string; last_activity_date?: number; score?: number; tags?: string[] }>;
  error_message?: string;
}

interface YouTubeResponse {
  items?: Array<{
    id?: { channelId?: string };
    snippet?: { channelTitle?: string; title?: string; description?: string; publishedAt?: string };
  }>;
  error?: { message?: string };
}

interface GitHubResponse {
  items?: Array<{
    id?: number;
    full_name?: string;
    html_url?: string;
    description?: string | null;
    updated_at?: string;
    stargazers_count?: number;
    owner?: { login?: string };
  }>;
  message?: string;
}

interface HackerNewsItem {
  id?: number;
  title?: string;
  time?: number;
  descendants?: number;
  score?: number;
  type?: string;
}

interface DiscourseResponse {
  topics?: Array<{ id?: number; title?: string; slug?: string; last_posted_at?: string; posts_count?: number }>;
  grouped_search_result?: { topic_ids?: number[] };
}

interface SelectionPayload {
  channels?: Array<{
    candidateId?: unknown;
    relevance?: unknown;
    participationRules?: unknown;
    recommendedApproach?: unknown;
    usefulTopic?: unknown;
    risk?: unknown;
    firstAction?: unknown;
  }>;
  publicExpertsAndPartners?: Array<{
    candidateId?: unknown;
    name?: unknown;
    role?: unknown;
    relevance?: unknown;
  }>;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim()
    : fallback;
}

function clampInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.floor(parsed))) : fallback;
}

function fnvHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sourceRecordId(url: string): string {
  return `source_${fnvHash(url.toLowerCase())}`;
}

function channelRecordId(url: string): string {
  return `channel_${fnvHash(url.toLowerCase())}`;
}

function candidateRecordId(sourceId: string, url: string): string {
  return `candidate_${fnvHash(`${sourceId}:${url.toLowerCase()}`)}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordTokens(...values: Array<string | undefined>): string[] {
  const stopWords = new Set(['about', 'after', 'again', 'against', 'being', 'could', 'family', 'from', 'have', 'into', 'other', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'using', 'with', 'without', 'would']);
  return [...new Set(values
    .flatMap(value => stringValue(value).toLowerCase().split(/[^a-z0-9]+/))
    .filter(token => token.length >= 4 && !stopWords.has(token)))]
    .slice(0, 14);
}

function inferPacks(order: PaidTestOrder, verdict: EvaluationResult): ResearchPackId[] {
  const haystack = [
    verdict.idea.ideaName,
    verdict.idea.description,
    verdict.idea.targetUser,
    order.intake.targetBuyer,
    order.intake.problem,
    order.intake.currentWorkaround,
    order.intake.offerHypothesis
  ].join(' ').toLowerCase();
  const packs = new Set<ResearchPackId>(['universal']);
  const includes = (...terms: string[]) => terms.some(term => haystack.includes(term));
  if (includes('family', 'families', 'parent', 'child', 'children', 'game', 'hobby', 'toy')) packs.add('families_gaming');
  if (includes('saas', 'software', 'app', 'developer', 'api', 'automation', 'platform')) packs.add('saas_builders');
  if (includes('contractor', 'local service', 'home service', 'repair', 'plumb', 'electric', 'roof', 'hvac', 'cleaning')) packs.add('local_services');
  if (includes('creator', 'content', 'course', 'newsletter', 'podcast', 'digital product', 'template')) packs.add('creators_digital');
  if (includes('consult', 'agency', 'advisor', 'freelance', 'professional service')) packs.add('consulting_agencies');
  if (includes('retail', 'product', 'subscription box', 'inventory', 'store', 'ecommerce', 'physical')) packs.add('retail_products');
  if (includes('school', 'student', 'teacher', 'tutor', 'education', 'learning', 'training')) packs.add('education');
  if (includes('hotel', 'restaurant', 'tour', 'travel', 'event', 'experience', 'hospitality')) packs.add('hospitality_local');
  return [...packs];
}

function queryForStrategy(strategy: ResearchQueryStrategy, order: PaidTestOrder, verdict: EvaluationResult): string {
  const idea = stringValue(verdict.idea.ideaName, 'business idea');
  const buyer = stringValue(order.intake.targetBuyer || verdict.idea.targetUser, 'prospective customers');
  const problem = stringValue(order.intake.problem || verdict.idea.painfulProblem, 'customer problem');
  const alternative = stringValue(order.intake.currentWorkaround || verdict.idea.currentAlternative, 'current alternative');
  const geography = stringValue(order.intake.geography, 'United States');
  const query = strategy === 'idea'
    ? `${idea} ${buyer}`
    : strategy === 'buyer'
      ? `${buyer} discussions community`
      : strategy === 'problem'
        ? `${buyer} ${problem}`
        : strategy === 'alternative'
          ? `${buyer} ${alternative}`
          : strategy === 'community'
            ? `${buyer} association forum community`
            : strategy === 'how_to'
              ? `${buyer} how to ${problem}`
              : `${geography} ${buyer} ${problem}`;
  return query.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function sourceRelevanceScore(source: ResearchSourceDefinition, packs: ResearchPackId[]): number {
  const packScore = source.packs.reduce((score, pack) => score + (packs.includes(pack) ? (pack === 'universal' ? 3 : 10) : 0), 0);
  const modeScore = source.accessMode === 'customer_seed'
    ? 100
    : source.accessMode === 'youtube_api'
      ? 12
      : source.accessMode === 'stack_exchange_api'
        ? 10
        : source.accessMode === 'github_api'
          ? 7
          : source.accessMode === 'hacker_news_api'
            ? 5
            : 1;
  return packScore + modeScore;
}

export function planCustomerAccessResearch(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  maximumSources = DEFAULT_MAX_SOURCES
): SourceFederationPlan {
  const packs = inferPacks(order, verdict);
  const approved = approvedResearchSources()
    .sort((left, right) => sourceRelevanceScore(right, packs) - sourceRelevanceScore(left, packs) || left.sourceId.localeCompare(right.sourceId));
  const selected = approved.slice(0, Math.max(MIN_ATTEMPTED_SOURCES, maximumSources));
  if (selected.length < MIN_ATTEMPTED_SOURCES) {
    throw new Error(`Source Federation registry has only ${selected.length} approved sources; at least ${MIN_ATTEMPTED_SOURCES} are required`);
  }
  return {
    planVersion: 'source-federation-plan-v1',
    createdAt: new Date().toISOString(),
    packs,
    sourceIds: selected.map(source => source.sourceId),
    queryBySourceId: Object.fromEntries(selected.map(source => [source.sourceId, queryForStrategy(source.queryStrategy, order, verdict)])),
    language: 'en',
    geography: stringValue(order.intake.geography, 'global')
  };
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
}

function safePublicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
    if (hostname.includes(':') || privateIpv4(hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('Source request timed out'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedText(response: Response, limit = 65536): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = limit - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function activityFromDate(value: string | number | undefined): CustomerAccessChannel['activity'] {
  if (!value) return 'uncertain';
  const timestamp = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'uncertain';
  const ageDays = (Date.now() - timestamp) / 86400000;
  return ageDays <= 30 ? 'recent' : ageDays <= 120 ? 'active' : ageDays <= 365 ? 'occasional' : 'uncertain';
}

function confidenceForMode(mode: ResearchAccessMode): CustomerAccessChannel['confidence'] {
  return mode === 'customer_seed'
    ? 'high'
    : mode === 'stack_exchange_api' || mode === 'youtube_api' || mode === 'github_api' || mode === 'hacker_news_api'
      ? 'high'
      : mode === 'discourse_api' || mode === 'rss_atom'
        ? 'medium'
        : 'low';
}

function buildCandidate(
  source: ResearchSourceDefinition,
  url: string,
  title: string,
  platform: string,
  activity: CustomerAccessChannel['activity'],
  factualSignals: string[],
  publisher = source.name
): FederatedCandidate {
  const normalized = safePublicUrl(url)?.toString().replace(/\/$/, '') || url;
  return {
    candidateId: candidateRecordId(source.sourceId, normalized),
    sourceDefinitionId: source.sourceId,
    sourceName: source.name,
    sourceType: source.accessMode,
    title: stringValue(title, source.name),
    publicUrl: normalized,
    publisher,
    platform,
    activity,
    confidence: confidenceForMode(source.accessMode),
    factualSignals: factualSignals.map(signal => stringValue(signal)).filter(Boolean).slice(0, 8),
    observedAt: new Date().toISOString()
  };
}

async function queryStackExchange(source: ResearchSourceDefinition, query: string): Promise<FederatedCandidate[]> {
  if (!source.endpoint || !source.siteParameter) throw new Error('Stack Exchange source configuration is incomplete');
  const url = new URL(source.endpoint);
  url.searchParams.set('site', source.siteParameter);
  url.searchParams.set('q', query);
  url.searchParams.set('pagesize', '8');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('sort', 'activity');
  const response = await fetchWithTimeout(url.toString(), { headers: { Accept: 'application/json' } });
  const payload = await response.json() as StackExchangeResponse;
  if (!response.ok) throw new Error(payload.error_message || `Stack Exchange returned HTTP ${response.status}`);
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return [];
  const latest = Math.max(...items.map(item => Number(item.last_activity_date) || 0));
  const signals = items.slice(0, 5).map(item => `${stripHtml(item.title || '')}${item.tags?.length ? ` [${item.tags.slice(0, 4).join(', ')}]` : ''}`);
  return [buildCandidate(source, source.canonicalUrl, source.name, 'Public Q&A community', activityFromDate(latest), signals)];
}

async function queryYouTube(env: Env, source: ResearchSourceDefinition, query: string, language: string): Promise<FederatedCandidate[]> {
  if (!env.YOUTUBE_API_KEY?.trim()) throw new Error('YOUTUBE_API_KEY is not configured');
  if (!source.endpoint) throw new Error('YouTube source configuration is incomplete');
  const url = new URL(source.endpoint);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'channel');
  url.searchParams.set('maxResults', String(MAX_CANDIDATES_PER_SOURCE));
  url.searchParams.set('q', query);
  url.searchParams.set('relevanceLanguage', language);
  url.searchParams.set('key', env.YOUTUBE_API_KEY);
  const response = await fetchWithTimeout(url.toString(), { headers: { Accept: 'application/json' } });
  const payload = await response.json() as YouTubeResponse;
  if (!response.ok) throw new Error(payload.error?.message || `YouTube API returned HTTP ${response.status}`);
  return (payload.items || []).flatMap(item => {
    const channelId = stringValue(item.id?.channelId);
    if (!channelId) return [];
    const snippet = item.snippet;
    return [buildCandidate(
      source,
      `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`,
      stringValue(snippet?.channelTitle || snippet?.title, 'YouTube channel'),
      'YouTube public channel',
      activityFromDate(snippet?.publishedAt),
      [stringValue(snippet?.description), `Discovered for query: ${query}`]
    )];
  });
}

async function queryGitHub(env: Env, source: ResearchSourceDefinition, query: string): Promise<FederatedCandidate[]> {
  if (!source.endpoint) throw new Error('GitHub source configuration is incomplete');
  const url = new URL(source.endpoint);
  url.searchParams.set('q', `${query} in:name,description,readme`);
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(MAX_CANDIDATES_PER_SOURCE));
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GhostTown-Source-Federation',
    'X-GitHub-Api-Version': '2026-03-10'
  };
  if (env.GITHUB_RESEARCH_TOKEN?.trim()) headers.Authorization = `Bearer ${env.GITHUB_RESEARCH_TOKEN}`;
  const response = await fetchWithTimeout(url.toString(), { headers });
  const payload = await response.json() as GitHubResponse;
  if (!response.ok) throw new Error(payload.message || `GitHub API returned HTTP ${response.status}`);
  return (payload.items || []).flatMap(item => {
    const publicUrl = stringValue(item.html_url);
    if (!publicUrl) return [];
    return [buildCandidate(
      source,
      publicUrl,
      stringValue(item.full_name, 'GitHub public project'),
      'GitHub public project and community',
      activityFromDate(item.updated_at),
      [stringValue(item.description), `${Number(item.stargazers_count) || 0} stars`, `Owner: ${stringValue(item.owner?.login, 'unknown')}`],
      'GitHub'
    )];
  });
}

async function queryHackerNews(source: ResearchSourceDefinition, query: string): Promise<FederatedCandidate[]> {
  if (!source.endpoint) throw new Error('Hacker News source configuration is incomplete');
  const response = await fetchWithTimeout(source.endpoint, { headers: { Accept: 'application/json' } });
  const ids = await response.json() as number[];
  if (!response.ok || !Array.isArray(ids)) throw new Error(`Hacker News API returned HTTP ${response.status}`);
  const tokens = keywordTokens(query);
  const items = await Promise.all(ids.slice(0, 12).map(async id => {
    const itemResponse = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { headers: { Accept: 'application/json' } });
    return itemResponse.ok ? await itemResponse.json() as HackerNewsItem : null;
  }));
  return items
    .filter((item): item is HackerNewsItem => Boolean(item?.id && item.type === 'story' && item.title))
    .filter(item => tokens.length === 0 || tokens.some(token => item.title?.toLowerCase().includes(token)))
    .slice(0, MAX_CANDIDATES_PER_SOURCE)
    .map(item => buildCandidate(
      source,
      `https://news.ycombinator.com/item?id=${item.id}`,
      stringValue(item.title, 'Hacker News discussion'),
      'Hacker News public discussion',
      activityFromDate(item.time),
      [`${Number(item.score) || 0} points`, `${Number(item.descendants) || 0} comments`, `Discovered for query: ${query}`],
      'Hacker News'
    ));
}

async function queryDiscourse(source: ResearchSourceDefinition, query: string): Promise<FederatedCandidate[]> {
  if (!source.endpoint) throw new Error('Discourse source configuration is incomplete');
  const url = new URL(source.endpoint);
  url.searchParams.set('q', query);
  const response = await fetchWithTimeout(url.toString(), { headers: { Accept: 'application/json' } });
  const payload = await response.json() as DiscourseResponse;
  if (!response.ok) throw new Error(`Discourse source returned HTTP ${response.status}`);
  const topics = Array.isArray(payload.topics) ? payload.topics : [];
  if (!topics.length && !payload.grouped_search_result?.topic_ids?.length) return [];
  const latest = topics.map(topic => topic.last_posted_at).filter(Boolean).sort().at(-1);
  return [buildCandidate(
    source,
    source.canonicalUrl,
    source.name,
    'Public Discourse forum',
    activityFromDate(latest),
    topics.slice(0, 5).map(topic => stringValue(topic.title))
  )];
}

function extractFeedItems(xml: string): Array<{ title: string; link: string; published?: string }> {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return blocks.slice(0, 20).map(block => {
    const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
      || stripHtml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '');
    const published = stripHtml(block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] || '');
    return { title, link, published };
  }).filter(item => item.title || item.link);
}

async function queryFeed(source: ResearchSourceDefinition, query: string): Promise<FederatedCandidate[]> {
  if (!source.endpoint) throw new Error('Feed source configuration is incomplete');
  const response = await fetchWithTimeout(source.endpoint, { headers: { Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml' } });
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
  const xml = await readLimitedText(response, 180000);
  const tokens = keywordTokens(query);
  const items = extractFeedItems(xml);
  const matching = items.filter(item => tokens.length === 0 || tokens.some(token => item.title.toLowerCase().includes(token)));
  const selected = matching.length ? matching : items.slice(0, 5);
  if (!selected.length) return [];
  return [buildCandidate(
    source,
    source.canonicalUrl,
    source.name,
    'Public RSS or Atom publication',
    activityFromDate(selected.map(item => item.published).filter(Boolean).sort().at(-1)),
    selected.slice(0, 5).map(item => item.title)
  )];
}

function customerSeedUrls(order: PaidTestOrder): string[] {
  const notes = stringValue(order.intake.customerNotes);
  const noteUrls = notes.match(/https:\/\/[^\s<>()"']+/g) || [];
  return [...new Set([
    ...(order.intake.competitorLinks || []),
    order.intake.landingPageLink || '',
    ...noteUrls
  ].map(value => stringValue(value)).filter(Boolean))].slice(0, 12);
}

async function queryCustomerSeeds(source: ResearchSourceDefinition, order: PaidTestOrder): Promise<FederatedCandidate[]> {
  return customerSeedUrls(order).map((url, index) => buildCandidate(
    source,
    url,
    `Customer-supplied public source ${index + 1}`,
    'Customer-supplied public source',
    'uncertain',
    ['Supplied directly in the paid-order intake.'],
    safePublicUrl(url)?.hostname.replace(/^www\./, '') || 'Customer supplied'
  ));
}

async function querySource(
  env: Env,
  order: PaidTestOrder,
  source: ResearchSourceDefinition,
  query: string,
  language: string
): Promise<FederatedCandidate[]> {
  if (source.reviewStatus !== 'approved_for_customer_reports' || !source.customerReportUse) {
    throw new Error('Source is not approved for paid customer reports');
  }
  if (source.accessMode === 'stack_exchange_api') return queryStackExchange(source, query);
  if (source.accessMode === 'youtube_api') return queryYouTube(env, source, query, language);
  if (source.accessMode === 'github_api') return queryGitHub(env, source, query);
  if (source.accessMode === 'hacker_news_api') return queryHackerNews(source, query);
  if (source.accessMode === 'discourse_api') return queryDiscourse(source, query);
  if (source.accessMode === 'rss_atom') return queryFeed(source, query);
  if (source.accessMode === 'customer_seed') return queryCustomerSeeds(source, order);
  throw new Error(`No enabled adapter for ${source.accessMode}`);
}

async function verifyCandidate(candidate: FederatedCandidate): Promise<FederatedCandidate> {
  const safe = safePublicUrl(candidate.publicUrl);
  if (!safe) throw new Error('URL is not a public HTTPS address');
  const response = await fetchWithTimeout(safe.toString(), {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2',
      Range: 'bytes=0-65535',
      'User-Agent': 'GhostTownSourceFederation/1.0 (+https://ghosttowntest.com)'
    }
  });
  const finalUrl = safePublicUrl(response.url || safe.toString());
  if (!response.ok || !finalUrl) {
    await response.body?.cancel();
    throw new Error(`Public page returned HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(`Unsupported public page type: ${contentType}`);
  }
  const sample = await readLimitedText(response, 65536);
  const pageTitle = stripHtml(sample.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const normalizedUrl = finalUrl.toString().replace(/\/$/, '');
  return {
    ...candidate,
    candidateId: candidateRecordId(candidate.sourceDefinitionId, normalizedUrl),
    title: pageTitle || candidate.title,
    publicUrl: normalizedUrl,
    publisher: candidate.publisher || finalUrl.hostname.replace(/^www\./, '')
  };
}

export async function runResearchBatch(
  env: Env,
  order: PaidTestOrder,
  plan: SourceFederationPlan,
  sourceIds: string[]
): Promise<ResearchBatchResult> {
  const registry = new Map(RESEARCH_SOURCE_REGISTRY.map(source => [source.sourceId, source]));
  const attempts: ResearchSourceAttempt[] = [];
  const candidates: FederatedCandidate[] = [];
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  await Promise.all(sourceIds.map(async sourceId => {
    const source = registry.get(sourceId);
    const query = plan.queryBySourceId[sourceId] || '';
    if (!source) {
      attempts.push({ sourceId, sourceType: 'customer_seed', success: false, query, candidateCount: 0, error: 'Source definition not found' });
      return;
    }
    try {
      const rawCandidates = (await querySource(env, order, source, query, plan.language)).slice(0, MAX_CANDIDATES_PER_SOURCE);
      const verified = await Promise.all(rawCandidates.map(async candidate => {
        try {
          return await verifyCandidate(candidate);
        } catch (error) {
          rejectedUrls.push({ url: candidate.publicUrl, reason: error instanceof Error ? error.message : 'Verification failed' });
          return null;
        }
      }));
      const accepted = verified.filter((candidate): candidate is FederatedCandidate => Boolean(candidate));
      candidates.push(...accepted);
      attempts.push({ sourceId, sourceType: source.accessMode, success: true, query, candidateCount: accepted.length });
    } catch (error) {
      attempts.push({
        sourceId,
        sourceType: source.accessMode,
        success: false,
        query,
        candidateCount: 0,
        error: error instanceof Error ? error.message : 'Source query failed'
      });
    }
  }));
  return {
    batchId: `batch_${fnvHash(sourceIds.join('|'))}`,
    completedAt: new Date().toISOString(),
    attempts: attempts.sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    candidates,
    rejectedUrls
  };
}

function deduplicateCandidates(candidates: FederatedCandidate[]): FederatedCandidate[] {
  const byUrl = new Map<string, FederatedCandidate>();
  for (const candidate of candidates) {
    const key = candidate.publicUrl.replace(/\/$/, '').toLowerCase();
    const existing = byUrl.get(key);
    if (!existing || candidate.factualSignals.length > existing.factualSignals.length) byUrl.set(key, candidate);
  }
  return [...byUrl.values()]
    .sort((left, right) => {
      const confidence = { high: 3, medium: 2, low: 1, unverified: 0 };
      const activity = { recent: 3, active: 2, occasional: 1, uncertain: 0 };
      return confidence[right.confidence] - confidence[left.confidence]
        || activity[right.activity] - activity[left.activity]
        || right.factualSignals.length - left.factualSignals.length
        || left.title.localeCompare(right.title);
    })
    .slice(0, MAX_CANDIDATES_FOR_MODEL);
}

function selectionPrompt(order: PaidTestOrder, verdict: EvaluationResult, candidates: FederatedCandidate[]): string {
  const payload = candidates.map(candidate => ({
    candidateId: candidate.candidateId,
    sourceName: candidate.sourceName,
    sourceType: candidate.sourceType,
    title: candidate.title,
    publicUrl: candidate.publicUrl,
    platform: candidate.platform,
    activity: candidate.activity,
    confidence: candidate.confidence,
    factualSignals: candidate.factualSignals
  }));
  return `You are the selection and structuring stage for a paid GhostTown Launch Blueprint.

Business idea: ${verdict.idea.ideaName}
Description: ${verdict.idea.description}
Initial customer: ${order.intake.targetBuyer}
Painful problem: ${order.intake.problem}
Current alternative: ${order.intake.currentWorkaround}
Geography: ${stringValue(order.intake.geography, 'global')}

The candidate list below was collected from approved official APIs or customer-supplied public URLs and each URL was independently verified. You may only select candidateId values that appear in the list. Never invent a channel, person, organization, URL, rule, activity claim, or source. Do not repeat raw snippets. Write concise GhostTown analysis from the supplied factual signals.

Select 10-25 distinct channels where the initial customer is likely to gather, learn, ask questions, compare alternatives, or build relationships. Prefer useful communities and public channels over generic repositories or isolated posts. If a participation rule is not explicitly supported, write exactly: "Rules not confirmed publicly; read the channel's current rules before participating."

Return only valid JSON:
{
  "channels": [{
    "candidateId": "candidate id from the list",
    "relevance": "why the initial customer is plausibly present",
    "participationRules": "supported rule or the exact uncertainty sentence",
    "recommendedApproach": "relationship-first, non-spammy approach",
    "usefulTopic": "specific helpful topic for this channel",
    "risk": "fit, access, moderation, or promotion risk",
    "firstAction": "one concrete action"
  }],
  "publicExpertsAndPartners": [{
    "candidateId": "candidate id from the list",
    "name": "public name supported by the candidate",
    "role": "public channel, organization, project, or partner role",
    "relevance": "why it matters"
  }]
}

Candidates:
${JSON.stringify(payload)}`;
}

function extractJson(value: string): SelectionPayload {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || value;
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('Source Federation model response did not contain JSON');
  return JSON.parse(source.slice(first, last + 1)) as SelectionPayload;
}

async function selectChannelsWithGemini(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  candidates: FederatedCandidate[]
): Promise<{ payload: SelectionPayload; model: string; outputHash: string }> {
  if (!env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_API_KEY is not configured');
  const model = stringValue(env.GEMINI_RESEARCH_MODEL, DEFAULT_MODEL);
  const response = await fetchWithTimeout(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: selectionPrompt(order, verdict, candidates) }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 12000,
        responseMimeType: 'application/json'
      }
    })
  }, 30000);
  const body = await response.json() as GeminiResponse;
  if (!response.ok) throw new Error(`Gemini structuring request failed: ${body.error?.message || response.status}`);
  const outputText = body.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
  if (!outputText) throw new Error(`Gemini structuring returned no usable text${body.promptFeedback?.blockReason ? `: ${body.promptFeedback.blockReason}` : ''}`);
  return { payload: extractJson(outputText), model, outputHash: fnvHash(outputText) };
}

function selectedChannel(
  raw: NonNullable<SelectionPayload['channels']>[number],
  candidate: FederatedCandidate,
  researchDate: string
): CustomerAccessChannel {
  const fallbackRules = "Rules not confirmed publicly; read the channel's current rules before participating.";
  return {
    channelId: channelRecordId(candidate.publicUrl),
    community: candidate.title,
    platform: candidate.platform,
    publicUrl: candidate.publicUrl,
    relevance: stringValue(raw.relevance, `This verified public channel may be relevant to the initial customer; fit must be confirmed through observed responses.`),
    activity: candidate.activity,
    participationRules: stringValue(raw.participationRules, fallbackRules),
    recommendedApproach: stringValue(raw.recommendedApproach, 'Read current discussions, contribute useful context, and avoid unsolicited promotion.'),
    usefulTopic: stringValue(raw.usefulTopic, 'Share a practical resource that helps the initial customer make a better decision.'),
    risk: stringValue(raw.risk, 'Public access was verified, but audience fit and current moderation expectations still require confirmation.'),
    firstAction: stringValue(raw.firstAction, 'Open the public page, review current participation expectations, and record three recurring questions.'),
    confidence: candidate.confidence,
    researchDate,
    sourceIds: [sourceRecordId(candidate.publicUrl)]
  };
}

export async function finalizeCustomerAccessResearch(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  plan: SourceFederationPlan,
  batches: ResearchBatchResult[],
  requestedAt = plan.createdAt
): Promise<CustomerAccessResearchResult> {
  const attempts = batches.flatMap(batch => batch.attempts);
  const successfulAttempts = attempts.filter(attempt => attempt.success);
  const sourceTypes = new Set(successfulAttempts.map(attempt => attempt.sourceType));
  const candidates = deduplicateCandidates(batches.flatMap(batch => batch.candidates));
  const rejectedUrls = batches.flatMap(batch => batch.rejectedUrls);
  const failedSources = attempts.filter(attempt => !attempt.success).map(attempt => ({ sourceId: attempt.sourceId, reason: attempt.error || 'Source query failed' }));
  if (attempts.length < MIN_ATTEMPTED_SOURCES) throw new Error(`Source Federation attempted ${attempts.length} sources; at least ${MIN_ATTEMPTED_SOURCES} are required`);
  if (successfulAttempts.length < MIN_SUCCESSFUL_SOURCES) throw new Error(`Source Federation reached ${successfulAttempts.length} sources; at least ${MIN_SUCCESSFUL_SOURCES} must succeed`);
  if (sourceTypes.size < MIN_SOURCE_TYPES) throw new Error(`Source Federation produced ${sourceTypes.size} source types; at least ${MIN_SOURCE_TYPES} are required`);
  if (candidates.length < MIN_CHANNELS) throw new Error(`Source Federation verified only ${candidates.length} candidate channels; at least ${MIN_CHANNELS} are required`);

  const selection = await selectChannelsWithGemini(env, order, verdict, candidates);
  const candidateMap = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));
  const researchDate = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const channels: CustomerAccessChannel[] = [];
  for (const raw of selection.payload.channels || []) {
    const candidateId = stringValue(raw.candidateId);
    const candidate = candidateMap.get(candidateId);
    if (!candidate) continue;
    const key = candidate.publicUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    channels.push(selectedChannel(raw, candidate, researchDate));
    if (channels.length >= MAX_CHANNELS) break;
  }
  if (channels.length < MIN_CHANNELS) throw new Error(`Gemini selected only ${channels.length} verified channels; at least ${MIN_CHANNELS} are required`);

  const selectedCandidates = channels.map(channel => candidates.find(candidate => candidate.publicUrl === channel.publicUrl)).filter((candidate): candidate is FederatedCandidate => Boolean(candidate));
  const sources: BlueprintSource[] = selectedCandidates.map(candidate => ({
    sourceId: sourceRecordId(candidate.publicUrl),
    title: candidate.title,
    url: candidate.publicUrl,
    publisher: candidate.publisher,
    accessedAt: candidate.observedAt,
    supports: [`Customer access channel: ${candidate.title}`, ...candidate.factualSignals.slice(0, 3)]
  }));

  const expertSeen = new Set<string>();
  const publicExpertsAndPartners = (selection.payload.publicExpertsAndPartners || []).flatMap(raw => {
    const candidate = candidateMap.get(stringValue(raw.candidateId));
    if (!candidate || expertSeen.has(candidate.publicUrl.toLowerCase())) return [];
    expertSeen.add(candidate.publicUrl.toLowerCase());
    const sourceId = sourceRecordId(candidate.publicUrl);
    if (!sources.some(source => source.sourceId === sourceId)) {
      sources.push({
        sourceId,
        title: candidate.title,
        url: candidate.publicUrl,
        publisher: candidate.publisher,
        accessedAt: candidate.observedAt,
        supports: [`Public expert, organization, project, or partner: ${candidate.title}`]
      });
    }
    return [{
      name: stringValue(raw.name, candidate.title),
      role: stringValue(raw.role, candidate.platform),
      publicUrl: candidate.publicUrl,
      relevance: stringValue(raw.relevance, 'This verified public source may be a useful expert, organization, project, or complementary relationship.'),
      sourceIds: [sourceId]
    }];
  }).slice(0, 8);

  return {
    research: {
      status: 'complete',
      researchDate,
      sources,
      channels,
      publicExpertsAndPartners
    },
    receipt: {
      provider: 'source_federation',
      model: selection.model,
      requestedAt,
      completedAt: new Date().toISOString(),
      packs: plan.packs,
      webSearchQueries: [...new Set(Object.values(plan.queryBySourceId))],
      attemptedSourceCount: attempts.length,
      successfulSourceCount: successfulAttempts.length,
      sourceTypeCount: sourceTypes.size,
      candidateChannelCount: candidates.length,
      verifiedChannelCount: channels.length,
      rejectedUrls,
      failedSources,
      sourceDefinitionIds: plan.sourceIds,
      responseHash: selection.outputHash
    }
  };
}

export async function researchCustomerAccess(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult
): Promise<CustomerAccessResearchResult> {
  if (env.SOURCE_FEDERATION_ENABLED !== 'true') throw new Error('Source Federation research is not enabled');
  const maximumSources = clampInteger(env.SOURCE_FEDERATION_MAX_SOURCES, DEFAULT_MAX_SOURCES, MIN_ATTEMPTED_SOURCES, 60);
  const batchSize = clampInteger(env.SOURCE_FEDERATION_BATCH_SIZE, DEFAULT_BATCH_SIZE, 4, 8);
  const plan = planCustomerAccessResearch(order, verdict, maximumSources);
  const batches: ResearchBatchResult[] = [];
  for (let index = 0; index < plan.sourceIds.length; index += batchSize) {
    batches.push(await runResearchBatch(env, order, plan, plan.sourceIds.slice(index, index + batchSize)));
  }
  return finalizeCustomerAccessResearch(env, order, verdict, plan, batches);
}
