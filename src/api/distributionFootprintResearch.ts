import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder, CompetitorSeed } from '../types/paidTest';
import type {
  BlueprintSource,
  CurrentActivityStatus,
  CustomerAccessChannel,
  DistributionTargetType,
  EvidenceDateSource,
  EvidenceRecency
} from '../types/launchBlueprint';
import type { CustomerAccessResearchInput } from './launchBlueprintGenerator';
import { generateAI, type GenerativeAIResponseSchema } from './generativeAIService';
import { researchEvidenceRoleForTargetType, researchEvidenceRoleReason } from './researchEvidenceRole';
import {
  activityLevelFromDate,
  currentActivityStatusFromDate,
  evidenceRecencyFromDate,
  extractDiscussionActivityDateFromHtml,
  extractEvidenceDateFromHtml,
  normalizedEvidenceDate
} from './evidenceRecency';

const DATAFORSEO_ENDPOINT = 'https://api.dataforseo.com/v3/backlinks/backlinks/live';
const PODCAST_INDEX_ENDPOINT = 'https://api.podcastindex.org/api/1.0/search/byterm';
const YOUTUBE_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_COMMENTS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/commentThreads';
const MIN_ATTEMPTS = 6;
const MIN_SUCCESSES = 4;
const MIN_PROVIDER_TYPES = 2;
const MIN_CHANNELS = 10;
const MAX_CHANNELS = 25;
const MAX_CANDIDATES_FOR_MODEL = 80;
// Paid Workflows provide enough subrequest headroom to preserve the original
// research depth. Keep broad direct-source verification quality-first here;
// the discovery -> shortlist -> finalist verification optimization is tracked
// separately and must not be used to weaken the evidence standard.
const MAX_DATAFORSEO_PAGE_VERIFICATIONS_PER_QUERY = 16;
const MAX_PODCAST_PAGE_VERIFICATIONS_PER_QUERY = 12;

export type DistributionProvider = 'dataforseo_backlinks' | 'podcast_index' | 'youtube_api' | 'google_grounded_customer_access';

export interface CustomerAccessResearchReceipt {
  provider: 'distribution_footprint';
  model: string;
  requestedAt: string;
  completedAt: string;
  packs: string[];
  webSearchQueries: string[];
  attemptedSourceCount: number;
  successfulSourceCount: number;
  sourceTypeCount: number;
  candidateChannelCount: number;
  verifiedChannelCount: number;
  rejectedUrls: Array<{ url: string; reason: string }>;
  failedSources: Array<{ sourceId: string; reason: string }>;
  sourceDefinitionIds: string[];
  seedDomains: string[];
  targetTypeCounts: Record<string, number>;
  responseHash: string;
  unknownCandidateIds?: string[];
}

export interface CustomerAccessResearchResult {
  research: CustomerAccessResearchInput;
  receipt: CustomerAccessResearchReceipt;
}

export interface DistributionFootprintPlan {
  planVersion: 'distribution-footprint-plan-v1';
  createdAt: string;
  packs: string[];
  sourceIds: string[];
  queryBySourceId: Record<string, string>;
  seedDomains: string[];
  seedNames: string[];
  language: string;
  geography: string;
}

export interface FootprintCandidate {
  candidateId: string;
  provider: DistributionProvider;
  targetTypeHint: DistributionTargetType;
  title: string;
  publicUrl: string;
  publisher: string;
  platform: string;
  activity: CustomerAccessChannel['activity'];
  confidence: CustomerAccessChannel['confidence'];
  evidenceDate?: string;
  evidenceDateSource: EvidenceDateSource;
  evidenceRecency: EvidenceRecency;
  currentActivityStatus: CurrentActivityStatus;
  currentActivityVerifiedAt?: string;
  currentActivityEvidence: string;
  factualSignals: string[];
  competitorEvidence: string[];
  audienceOwner: string;
  observedAt: string;
}

export interface ResearchSourceAttempt {
  sourceId: string;
  sourceType: DistributionProvider;
  success: boolean;
  query: string;
  candidateCount: number;
  error?: string;
}

export interface ResearchBatchResult {
  batchId: string;
  completedAt: string;
  attempts: ResearchSourceAttempt[];
  candidates: FootprintCandidate[];
  rejectedUrls: Array<{ url: string; reason: string }>;
}

interface DataForSeoBacklink {
  url_from?: string;
  domain_from?: string;
  page_from_title?: string;
  rank?: number;
  page_from_rank?: number;
  first_seen?: string;
  last_seen?: string;
  dofollow?: boolean;
  item_type?: string;
  domain_from_platform_type?: string[];
  domain_from_is_ip?: boolean;
  backlink_spam_score?: number;
}

interface DataForSeoResponse {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{ items?: DataForSeoBacklink[] }>;
  }>;
}

interface PodcastIndexFeed {
  id?: number;
  title?: string;
  author?: string;
  link?: string;
  description?: string;
  language?: string;
  lastUpdateTime?: number;
  dead?: number;
}

interface PodcastIndexResponse {
  status?: string;
  description?: string;
  feeds?: PodcastIndexFeed[];
}

interface YouTubeResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
    };
  }>;
  error?: { message?: string };
}

interface YouTubeCommentThreadsResponse {
  items?: Array<{
    snippet?: {
      topLevelComment?: {
        snippet?: {
          textDisplay?: string;
          textOriginal?: string;
          publishedAt?: string;
          updatedAt?: string;
        };
      };
    };
  }>;
  error?: { message?: string };
}

interface SelectionPayload {
  channels?: Array<{
    candidateId?: unknown;
    targetType?: unknown;
    relevance?: unknown;
    participationRules?: unknown;
    recommendedApproach?: unknown;
    usefulTopic?: unknown;
    risk?: unknown;
    firstAction?: unknown;
    audienceOwner?: unknown;
    accessPath?: unknown;
    preparedAsset?: unknown;
    outreachScriptId?: unknown;
  }>;
}

interface VerifiedPage {
  finalUrl: string;
  title: string;
  publisher: string;
  description: string;
  visibleText: string;
  rawHtml: string;
  evidenceDate?: string;
  evidenceDateSource: EvidenceDateSource;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim()
    : fallback;
}

function fnvHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function candidateId(provider: DistributionProvider, url: string): string {
  return `candidate_${fnvHash(`${provider}:${url.toLowerCase()}`)}`;
}

function sourceId(url: string): string {
  return `source_${fnvHash(url.toLowerCase())}`;
}

function channelId(url: string): string {
  return `channel_${fnvHash(url.toLowerCase())}`;
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
    url.hash = '';
    return url;
  } catch {
    return null;
  }
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

function pageTitle(html: string): string {
  return stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function pageDescription(html: string): string {
  const match = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
  return stripHtml(match?.[1] || '').slice(0, 280);
}

export function sourcePageUsabilityFailure(
  finalUrl: URL,
  html: string,
  title: string,
  description: string
): string | undefined {
  const queryText = [...finalUrl.searchParams.values()].join(' ');
  if (/invalid\s+.*site|page\s+not\s+found|not\s+found|content\s+unavailable|page\s+unavailable|does\s+not\s+exist/i.test(queryText)) {
    return 'URL contains an explicit error/not-found state';
  }

  const titleText = title.trim();
  const summary = `${titleText} ${description}`.trim();
  const visible = stripHtml(html).slice(0, 12000);
  const strongError = /^(?:error\b|404\b|403\b|410\b|page not found\b|not found\b|site not found\b|invalid .* site\b|content unavailable\b|page unavailable\b|account suspended\b|domain (?:is )?for sale\b)/i;
  if (strongError.test(titleText) || strongError.test(summary)) {
    return 'Source title/description identifies an error or unavailable page';
  }

  const leadingVisible = visible.slice(0, 1400);
  if (/(?:the requested page could not be found|this page (?:could not be found|does not exist|is no longer available)|invalid podbean site|site has been suspended|content is unavailable|page is unavailable|domain is for sale)/i.test(leadingVisible)) {
    return 'Source body identifies an error, removed page, or unavailable site';
  }

  if (`${summary} ${visible}`.trim().length < 40) return 'Source page contains too little usable public content';
  return undefined;
}

const CLAIM_STOP_WORDS = new Set([
  'about', 'across', 'before', 'buyer', 'buyers', 'community', 'complete', 'current', 'discussion', 'each', 'first',
  'forum', 'founder', 'global', 'group', 'help', 'into', 'managing', 'more', 'multiple', 'need',
  'needs', 'online', 'people', 'problem', 'proof', 'public', 'required', 'states', 'support', 'than',
  'that', 'their', 'them', 'these', 'they', 'this', 'those', 'through', 'united', 'using',
  'what', 'when', 'where', 'which', 'with', 'without'
]);

function claimTokens(value: string): string[] {
  return [...new Set((value.toLowerCase().match(/[a-z0-9]{4,}/g) || [])
    .filter(token => !CLAIM_STOP_WORDS.has(token)))];
}

export function sourceClaimSupportFailure(claim: string, pageText: string): string | undefined {
  const tokens = claimTokens(claim);
  if (!tokens.length) return undefined;
  const haystack = pageText.toLowerCase();
  const matched = tokens.filter(token => haystack.includes(token));
  const required = tokens.length >= 7 ? 3 : tokens.length >= 3 ? 2 : 1;
  if (matched.length < required) {
    return `Source page supports only ${matched.length} of ${required} required claim terms`;
  }
  return undefined;
}

export function customerAccessUsabilityFailure(finalUrl: URL, visibleText: string): string | undefined {
  const urlSignal = /reddit\.com\/r\/|groups\.io\/g\/|\/(?:forum|forums|community|communities|discuss|discussion|thread|threads|topic|topics|question|questions)(?:\/|$)/i.test(finalUrl.toString());
  const participationSignal = /\b(?:join|reply|replies|comment|comments|post|posts|members|member|new topic|start a discussion|ask a question|create account|sign up)\b/i.test(visibleText.slice(0, 8000));
  if (!urlSignal && !participationSignal) {
    return 'Customer-access source has no visible participation or conversation path';
  }
  return undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('Request timed out'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
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

const SOURCE_ERROR_PATTERNS = [
  /\b404\b.{0,40}\b(not found|error)\b/i,
  /\b(page|site|content|resource)\s+(was\s+)?(not found|removed|unavailable|does not exist|doesn't exist)\b/i,
  /\bno longer available\b/i,
  /\binvalid\s+[^\n]{0,40}\bsite\b/i,
  /\bthis page (isn't|is not) available\b/i,
  /\bsite not found\b/i
];

const CLAIM_STOPWORDS = new Set([
  'about', 'after', 'again', 'against', 'being', 'between', 'could', 'family',
  'from', 'have', 'into', 'more', 'other', 'their', 'there', 'these', 'they',
  'this', 'those', 'through', 'using', 'with', 'your'
]);

function sourceLooksUsable(pageText: string): boolean {
  const normalized = pageText.replace(/\s+/g, ' ').trim();
  if (normalized.length < 40) return false;
  return !SOURCE_ERROR_PATTERNS.some(pattern => pattern.test(normalized));
}

function pageSupportsClaim(page: VerifiedPage, claim: string): boolean {
  const tokens = Array.from(new Set(
    claim.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter(token => !CLAIM_STOPWORDS.has(token)) || []
  ));
  if (!tokens.length) return true;
  const haystack = page.searchText.toLowerCase();
  const required = tokens.length >= 4 ? 2 : 1;
  return tokens.filter(token => haystack.includes(token)).length >= required;
}

async function verifyOriginalPage(rawUrl: string): Promise<VerifiedPage> {
  const safe = safePublicUrl(rawUrl);
  if (!safe) throw new Error('URL is not a public HTTPS address');
  const response = await fetchWithTimeout(safe.toString(), {
    headers: {
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2',
      'User-Agent': 'GhostTownDistributionResearch/1.0 (+https://ghosttowntest.com)'
    }
  });
  const final = safePublicUrl(response.url || safe.toString());
  if (!final || !response.ok) {
    await response.body?.cancel();
    throw new Error(`Original source returned HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Original source returned unsupported content type: ${contentType || 'unknown'}`);
  }
  const html = await readLimitedText(response);
  const publisher = final.hostname.replace(/^www\./, '');
  const title = pageTitle(html) || publisher;
  const description = pageDescription(html);
  const visibleText = stripHtml(html).slice(0, 12000);
  const unusable = sourcePageUsabilityFailure(final, html, title, description);
  if (unusable) throw new Error(`Original source is not commercially usable: ${unusable}`);
  const dated = extractEvidenceDateFromHtml(html, final.toString(), title);
  return {
    finalUrl: final.toString().replace(/\/$/, ''),
    title,
    publisher,
    description,
    visibleText,
    rawHtml: html,
    evidenceDate: dated.date,
    evidenceDateSource: dated.source
  };
}

function inferTargetType(value: string, provider: DistributionProvider): DistributionTargetType {
  if (provider === 'podcast_index') return 'podcast';
  if (provider === 'youtube_api') return 'youtube_creator';
  const haystack = value.toLowerCase();
  if (/reddit\.com|groups\.io|forum|community|discussion|support group|message board/.test(haystack)) return 'community';
  if (/podcast|radio|audio|listen/.test(haystack)) return 'podcast';
  if (/event|conference|summit|expo|festival|meetup|webinar/.test(haystack)) return 'event';
  if (/association|society|chamber|foundation|institute|council|alliance/.test(haystack)) return 'association';
  if (/review|reviews|tested|comparison|best of/.test(haystack)) return 'review_site';
  if (/newsletter|substack|publication|magazine|journal|news|blog|media/.test(haystack)) return 'newsletter_or_publication';
  if (/forum|community|discussion/.test(haystack)) return 'community';
  return 'complementary_partner';
}

function seedForTask(order: PaidTestOrder, taskId: string): CompetitorSeed | undefined {
  const seedId = taskId.split(':')[1];
  return order.intake.competitorSeeds?.find(seed => seed.seedId === seedId);
}

function coreTopic(order: PaidTestOrder, verdict: EvaluationResult): string {
  return `${verdict.idea.ideaName} ${order.intake.targetBuyer} ${order.intake.problem}`.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function directBuyerDiscussionQuery(order: PaidTestOrder): string {
  const buyerTokens = claimTokens(order.intake.targetBuyer).slice(0, 5);
  const buyerSet = new Set(buyerTokens);
  const problemTokens = claimTokens(order.intake.problem)
    .filter(token => !buyerSet.has(token))
    .slice(0, 5);
  return [...new Set([...buyerTokens, ...problemTokens])].slice(0, 8).join(' ');
}

export function planCustomerAccessResearch(order: PaidTestOrder, verdict: EvaluationResult): DistributionFootprintPlan {
  const seeds = order.intake.competitorSeeds || [];
  if (seeds.length < 2 || seeds.length > 3) throw new Error('Distribution Footprint requires two or three confirmed competitor seeds');
  const sourceIds: string[] = [];
  const queryBySourceId: Record<string, string> = {};
  for (const seed of seeds) {
    for (const provider of ['dataforseo', 'podcast', 'youtube'] as const) {
      const taskId = `${provider}:${seed.seedId}`;
      sourceIds.push(taskId);
      queryBySourceId[taskId] = seed.name;
    }
  }
  const topic = coreTopic(order, verdict);
  const buyerDiscussionQuery = directBuyerDiscussionQuery(order);
  sourceIds.push(
    'podcast:category',
    'youtube:category',
    'customer_access:problem',
    'customer_access:buyer',
    'youtube_access:problem',
    'youtube_access:buyer'
  );
  queryBySourceId['podcast:category'] = topic;
  queryBySourceId['youtube:category'] = `${topic} review interview`;
  queryBySourceId['customer_access:problem'] = `${buyerDiscussionQuery} forum discussion ${text(order.intake.geography, 'global')}`.slice(0, 180);
  queryBySourceId['customer_access:buyer'] = `${buyerDiscussionQuery} community question ${text(order.intake.geography, 'global')}`.slice(0, 180);
  queryBySourceId['youtube_access:problem'] = buyerDiscussionQuery;
  queryBySourceId['youtube_access:buyer'] = claimTokens(order.intake.targetBuyer).slice(0, 6).join(' ');
  const researchSignals = order.intake.researchSignals;
  for (const type of ['audience', 'ecosystem'] as const) {
    const signal = researchSignals?.[type];
    if (!signal || signal.source === 'not_sure' || !signal.value.trim()) continue;
    const podcastId = `podcast:${type}`;
    const youtubeId = `youtube:${type}`;
    sourceIds.push(podcastId, youtubeId);
    queryBySourceId[podcastId] = `${order.intake.targetBuyer} ${signal.value}`.slice(0, 220);
    queryBySourceId[youtubeId] = `${order.intake.targetBuyer} ${signal.value} review interview`.slice(0, 220);
  }
  return {
    planVersion: 'distribution-footprint-plan-v1',
    createdAt: new Date().toISOString(),
    packs: ['customer_access', 'market_evidence', 'media_distribution', 'partnerships'],
    sourceIds,
    queryBySourceId,
    seedDomains: seeds.map(seed => seed.domain),
    seedNames: seeds.map(seed => seed.name),
    language: 'en',
    geography: text(order.intake.geography, 'global')
  };
}

async function dataForSeoCandidates(env: Env, seed: CompetitorSeed): Promise<FootprintCandidate[]> {
  if (!env.DATAFORSEO_LOGIN?.trim() || !env.DATAFORSEO_PASSWORD?.trim()) throw new Error('DataForSEO credentials are not configured');
  const response = await fetchWithTimeout(DATAFORSEO_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      target: seed.domain,
      limit: 24,
      order_by: ['rank,desc'],
      exclude_internal_backlinks: true,
      backlinks_status_type: 'live'
    }])
  }, 20000);
  const body = await response.json() as DataForSeoResponse;
  const task = body.tasks?.[0];
  if (!response.ok || body.status_code !== 20000 || task?.status_code !== 20000) {
    throw new Error(task?.status_message || body.status_message || `DataForSEO returned HTTP ${response.status}`);
  }
  const rawItems = task.result?.flatMap(result => result.items || []) || [];
  const blocked = /(^|\.)(facebook|instagram|linkedin|reddit|x|twitter|pinterest|tiktok)\.com$/i;
  const eligible = rawItems.filter(item => {
    const domain = text(item.domain_from).replace(/^www\./, '');
    return Boolean(item.url_from && domain && !blocked.test(domain) && !item.domain_from_is_ip && (item.backlink_spam_score ?? 0) < 60);
  }).slice(0, MAX_DATAFORSEO_PAGE_VERIFICATIONS_PER_QUERY);
  const verified = await Promise.all(eligible.map(async item => {
    try {
      const page = await verifyOriginalPage(text(item.url_from));
      const claimedBacklink = [seed.name, seed.domain].filter(Boolean).join(' ');
      if (!pageSupportsClaim(page, claimedBacklink)) {
        throw new Error('Original source does not contain the claimed competitor/backlink evidence');
      }
      const evidence = [
        `${page.publisher} links to ${seed.name}.`,
        `DataForSEO referring-page rank: ${item.page_from_rank ?? item.rank ?? 'not reported'}.`,
        item.dofollow === true ? 'The observed backlink is dofollow.' : 'The observed backlink may be nofollow or unspecified.'
      ];
      const type = inferTargetType(`${page.title} ${page.description} ${item.item_type || ''} ${(item.domain_from_platform_type || []).join(' ')}`, 'dataforseo_backlinks');
      const observedAt = new Date().toISOString();
      const backlinkObservedDate = normalizedEvidenceDate(item.last_seen || item.first_seen);
      return {
        candidateId: candidateId('dataforseo_backlinks', page.finalUrl),
        provider: 'dataforseo_backlinks' as const,
        targetTypeHint: type,
        title: page.title,
        publicUrl: page.finalUrl,
        publisher: page.publisher,
        platform: type === 'newsletter_or_publication' ? 'Publication or newsletter' : type.replace(/_/g, ' '),
        activity: 'uncertain' as const,
        confidence: 'high' as const,
        evidenceDate: page.evidenceDate,
        evidenceDateSource: page.evidenceDateSource,
        evidenceRecency: evidenceRecencyFromDate(page.evidenceDate),
        currentActivityStatus: 'unverified' as const,
        currentActivityEvidence: backlinkObservedDate
          ? `DataForSEO observed the backlink on ${backlinkObservedDate.slice(0, 10)}, but backlink freshness does not prove the publication, event, or organization is currently active.`
          : 'The page is publicly reachable, but current publisher/channel activity was not independently verified.',
        factualSignals: [page.description, `Referring domain: ${text(item.domain_from)}`].filter(Boolean),
        competitorEvidence: evidence,
        audienceOwner: page.publisher,
        observedAt
      };
    } catch {
      return null;
    }
  }));
  return verified.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function sha1Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function podcastCandidates(env: Env, query: string, seedName?: string): Promise<FootprintCandidate[]> {
  if (!env.PODCAST_INDEX_API_KEY?.trim() || !env.PODCAST_INDEX_API_SECRET?.trim()) throw new Error('Podcast Index credentials are not configured');
  const authDate = Math.floor(Date.now() / 1000).toString();
  const authorization = await sha1Hex(`${env.PODCAST_INDEX_API_KEY}${env.PODCAST_INDEX_API_SECRET}${authDate}`);
  const url = new URL(PODCAST_INDEX_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('max', '14');
  url.searchParams.set('clean', 'true');
  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      'User-Agent': 'GhostTownLaunchBlueprint/1.0',
      'X-Auth-Key': env.PODCAST_INDEX_API_KEY,
      'X-Auth-Date': authDate,
      Authorization: authorization
    }
  });
  const body = await response.json() as PodcastIndexResponse;
  if (!response.ok || body.status === 'false') throw new Error(body.description || `Podcast Index returned HTTP ${response.status}`);
  const feeds = (body.feeds || []).filter(feed => feed.dead !== 1 && feed.link).slice(0, MAX_PODCAST_PAGE_VERIFICATIONS_PER_QUERY);
  const verified = await Promise.all(feeds.map(async feed => {
    try {
      const page = await verifyOriginalPage(text(feed.link));
      const podcastClaim = [text(feed.title), text(feed.author)].filter(Boolean).join(' ');
      if (!pageSupportsClaim(page, podcastClaim)) {
        throw new Error('Original source does not contain the claimed podcast identity evidence');
      }
      const title = text(feed.title, page.title);
      const observedAt = new Date().toISOString();
      const evidenceDate = normalizedEvidenceDate(feed.lastUpdateTime);
      const currentActivityStatus = currentActivityStatusFromDate(feed.lastUpdateTime);
      return {
        candidateId: candidateId('podcast_index', page.finalUrl),
        provider: 'podcast_index' as const,
        targetTypeHint: 'podcast' as const,
        title,
        publicUrl: page.finalUrl,
        publisher: text(feed.author, page.publisher),
        platform: 'Podcast',
        activity: activityLevelFromDate(feed.lastUpdateTime),
        confidence: 'high' as const,
        evidenceDate,
        evidenceDateSource: evidenceDate ? 'provider_activity' as const : 'unknown' as const,
        evidenceRecency: evidenceRecencyFromDate(feed.lastUpdateTime),
        currentActivityStatus,
        currentActivityVerifiedAt: currentActivityStatus === 'unverified' ? undefined : observedAt,
        currentActivityEvidence: evidenceDate
          ? `Podcast Index reports the feed last updated on ${evidenceDate.slice(0, 10)}.`
          : 'Podcast Index did not provide a usable last-update date.',
        factualSignals: [text(feed.author) ? `Host or publisher: ${text(feed.author)}` : '', text(feed.language) ? `Language: ${text(feed.language)}` : '', page.description].filter(Boolean),
        competitorEvidence: [seedName ? `Podcast Index matched this show to competitor seed ${seedName}.` : `Podcast Index matched this show to the customer category query: ${query}.`],
        audienceOwner: text(feed.author, page.publisher),
        observedAt
      };
    } catch {
      return null;
    }
  }));
  return verified.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function youtubeCandidates(env: Env, query: string, seedName?: string): Promise<FootprintCandidate[]> {
  if (!env.YOUTUBE_API_KEY?.trim()) throw new Error('YouTube Data API key is not configured');
  const url = new URL(YOUTUBE_ENDPOINT);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '18');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('safeSearch', 'moderate');
  url.searchParams.set('key', env.YOUTUBE_API_KEY);
  const response = await fetchWithTimeout(url.toString());
  const body = await response.json() as YouTubeResponse;
  if (!response.ok) throw new Error(body.error?.message || `YouTube returned HTTP ${response.status}`);
  const seen = new Set<string>();
  const candidates: FootprintCandidate[] = [];
  for (const item of body.items || []) {
    const channelIdValue = text(item.snippet?.channelId);
    if (!channelIdValue || seen.has(channelIdValue)) continue;
    seen.add(channelIdValue);
    const publicUrl = `https://www.youtube.com/channel/${encodeURIComponent(channelIdValue)}`;
    const channelTitle = text(item.snippet?.channelTitle, 'YouTube creator');
    try {
      const page = await verifyOriginalPage(publicUrl);
      const claimedIdentity = [channelTitle, text(item.snippet?.title)].filter(Boolean).join(' ');
      if (!pageSupportsClaim(page, claimedIdentity)) continue;
      const observedAt = new Date().toISOString();
      const evidenceDate = normalizedEvidenceDate(item.snippet?.publishedAt);
      const currentActivityStatus = currentActivityStatusFromDate(item.snippet?.publishedAt);
      candidates.push({
        candidateId: candidateId('youtube_api', page.finalUrl),
        provider: 'youtube_api',
        targetTypeHint: 'youtube_creator',
        title: channelTitle,
        publicUrl: page.finalUrl,
        publisher: channelTitle,
        platform: 'YouTube creator',
        activity: activityLevelFromDate(item.snippet?.publishedAt),
        confidence: 'high',
        evidenceDate,
        evidenceDateSource: evidenceDate ? 'provider_activity' : 'unknown',
        evidenceRecency: evidenceRecencyFromDate(item.snippet?.publishedAt),
        currentActivityStatus,
        currentActivityVerifiedAt: currentActivityStatus === 'unverified' ? undefined : observedAt,
        currentActivityEvidence: evidenceDate
          ? `YouTube returned a matching video published on ${evidenceDate.slice(0, 10)}, and GhostTown independently re-opened the public channel destination.`
          : 'GhostTown independently re-opened the public channel destination, but YouTube did not provide a usable matching-video publication date.',
        factualSignals: [text(item.snippet?.title) ? `Matching video: ${text(item.snippet?.title)}` : '', text(item.snippet?.description).slice(0, 240)].filter(Boolean),
        competitorEvidence: [seedName ? `YouTube returned a matching video from this creator for competitor seed ${seedName}.` : `YouTube returned a relevant video for category query: ${query}.`],
        audienceOwner: channelTitle,
        observedAt
      });
    } catch {
      continue;
    }
    if (candidates.length >= 12) break;
  }
  return candidates;
}

async function youtubeCustomerAccessCandidates(env: Env, query: string): Promise<FootprintCandidate[]> {
  if (!env.YOUTUBE_API_KEY?.trim()) throw new Error('YouTube Data API key is not configured');

  const verificationQuery = query;
  const tokens = claimTokens(query);
  const searchQueries = [...new Set([
    query,
    tokens.slice(0, 5).join(' '),
    [...tokens.slice(0, 4), ...tokens.slice(-2)].join(' ')
  ])].filter(value => value.trim().length >= 4);
  const candidates: FootprintCandidate[] = [];
  const seenVideoIds = new Set<string>();

  for (const searchQuery of searchQueries) {
    const searchUrl = new URL(YOUTUBE_ENDPOINT);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('maxResults', '8');
    searchUrl.searchParams.set('order', 'date');
    searchUrl.searchParams.set('relevanceLanguage', 'en');
    searchUrl.searchParams.set('safeSearch', 'moderate');
    searchUrl.searchParams.set('publishedAfter', new Date(Date.now() - (120 * 86_400_000)).toISOString());
    searchUrl.searchParams.set('key', env.YOUTUBE_API_KEY);

    const response = await fetchWithTimeout(searchUrl.toString());
    const body = await response.json() as YouTubeResponse;
    if (!response.ok) throw new Error(body.error?.message || `YouTube returned HTTP ${response.status}`);

    for (const item of body.items || []) {
      const videoId = text(item.id?.videoId);
      if (!videoId || seenVideoIds.has(videoId)) continue;
      seenVideoIds.add(videoId);

      const commentsUrl = new URL(YOUTUBE_COMMENTS_ENDPOINT);
      commentsUrl.searchParams.set('part', 'snippet');
      commentsUrl.searchParams.set('videoId', videoId);
      commentsUrl.searchParams.set('maxResults', '50');
      commentsUrl.searchParams.set('order', 'time');
      commentsUrl.searchParams.set('textFormat', 'plainText');
      commentsUrl.searchParams.set('key', env.YOUTUBE_API_KEY);

      try {
        const commentsResponse = await fetchWithTimeout(commentsUrl.toString());
        const commentsBody = await commentsResponse.json() as YouTubeCommentThreadsResponse;
        if (!commentsResponse.ok) continue;

        const videoContext = `${text(item.snippet?.title)} ${text(item.snippet?.description)}`.trim();
        const verificationTokens = claimTokens(verificationQuery);
        const qualifying = (commentsBody.items || []).map(comment => {
          const snippet = comment.snippet?.topLevelComment?.snippet;
          const commentText = text(snippet?.textOriginal || snippet?.textDisplay);
          const activityDate = normalizedEvidenceDate(snippet?.updatedAt || snippet?.publishedAt);
          return { commentText, activityDate };
        }).filter(comment => {
          if (!comment.commentText || !comment.activityDate || currentActivityStatusFromDate(comment.activityDate) !== 'verified_current') return false;
          const commentHaystack = comment.commentText.toLowerCase();
          const commentHasRelevantTerm = verificationTokens.some(token => commentHaystack.includes(token));
          return commentHasRelevantTerm && !sourceClaimSupportFailure(verificationQuery, `${videoContext} ${comment.commentText}`);
        });
        if (!qualifying.length) continue;

        const latestActivity = qualifying
          .map(comment => comment.activityDate as string)
          .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
        const observedAt = new Date().toISOString();
        const videoTitle = text(item.snippet?.title, 'YouTube discussion');
        const channelTitle = text(item.snippet?.channelTitle, 'YouTube channel');
        const publicUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

        candidates.push({
          candidateId: candidateId('youtube_api', `comments:${publicUrl}`),
          provider: 'youtube_api',
          targetTypeHint: 'community',
          title: `${videoTitle} — public discussion`,
          publicUrl,
          publisher: channelTitle,
          platform: 'YouTube public discussion',
          activity: activityLevelFromDate(latestActivity),
          confidence: 'high',
          evidenceDate: latestActivity,
          evidenceDateSource: 'provider_activity',
          evidenceRecency: evidenceRecencyFromDate(latestActivity),
          currentActivityStatus: 'verified_current',
          currentActivityVerifiedAt: observedAt,
          currentActivityEvidence: `YouTube API verified ${qualifying.length} recent public top-level comment(s) whose video/comment context supports the buyer/problem terms; latest qualifying activity was ${latestActivity.slice(0, 10)}.`,
          factualSignals: [
            `Matching current video: ${videoTitle}`,
            `${qualifying.length} recent public comments contained at least one buyer/problem term while the video/comment context supported the full access query.`,
            'The video has a public comment thread where a founder can participate subject to current channel moderation rules.'
          ],
          competitorEvidence: [],
          audienceOwner: `${channelTitle} public comment thread`,
          observedAt
        });
        if (candidates.length >= 6) return candidates;
      } catch {
        continue;
      }
    }
    if (candidates.length >= 3) break;
  }
  return candidates;
}

async function runGroundedCustomerAccessSearch(env: Env, query: string) {
  const cutoffDate = new Date(Date.now() - (120 * 86_400_000)).toISOString().slice(0, 10);
  const prompt = [
    'Search broadly for 8-12 candidate public discussion or community pages where people matching this buyer category discuss the problem area.',
    'Prioritize forums, discussion communities, support communities, message boards, public groups, and question/discussion pages that can be opened without logging in.',
    'Maximize candidate recall at this stage. Do not discard a plausible discussion page merely because you cannot prove its date or participation path from the search snippet; GhostTown will fetch and verify the destination itself.',
    'Prefer direct discussion/thread/community URLs over homepages, search-result pages, news articles, generic blogs, vendor pages, directories, podcasts, conferences, and associations.',
    'Do not claim that a source is current, buyer-accessible, or relevant unless the destination later proves it. Your job here is only to return grounded candidate URLs.',
    'Return a short grounded summary with a Google Search citation for every candidate page.',
    `Search need: ${query}`,
    `GhostTown will independently require visible activity on or after ${cutoffDate} before any candidate can count as current Customer Access.`
  ].join('\n');
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await generateAI(env, {
        task: 'grounded_research',
        googleSearch: true,
        temperature: 0,
        maxOutputTokens: attempt === 0 ? 1600 : 900,
        timeoutMs: attempt === 0 ? 60_000 : 90_000,
        prompt: attempt === 0
          ? prompt
          : `Find current public discussion pages for: ${query}. Return only a short grounded summary with Google Search citations. Prefer forums or community threads with visible recent dates and visible reply/comment/join paths.`
      });
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !/(?:MALFORMED_FUNCTION_CALL|timed out)/i.test(error.message) || attempt === 1) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Grounded customer-access search failed');
}

async function groundedCustomerAccessCandidates(env: Env, query: string): Promise<FootprintCandidate[]> {
  const generated = await runGroundedCustomerAccessSearch(env, query);
  const chunks = generated.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const candidates: FootprintCandidate[] = [];
  let reachableCount = 0;
  let communityCount = 0;
  let claimSupportedCount = 0;
  let usableAccessCount = 0;
  const rejectionDiagnostics: string[] = [];
  for (const chunk of chunks) {
    const rawUrl = text(chunk.web?.uri);
    if (!rawUrl) continue;
    const safe = safePublicUrl(rawUrl);
    if (!safe) continue;
    const key = safe.toString().toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);

    const groundedTitle = text(chunk.web?.title);

    try {
      // Vertex grounding URLs can be redirect URLs whose pre-fetch hostname/title
      // does not reveal that the destination is a forum or discussion page.
      // Classify only after following the redirect and inspecting the destination.
      const page = await verifyOriginalPage(safe.toString());
      reachableCount += 1;
      const type = inferTargetType(`${page.finalUrl} ${groundedTitle} ${page.title} ${page.description} ${page.visibleText.slice(0, 2200)}`, 'google_grounded_customer_access');
      if (type !== 'community') {
        rejectionDiagnostics.push(`type:${page.finalUrl}`);
        continue;
      }
      communityCount += 1;
      const claimFailure = sourceClaimSupportFailure(query, `${page.title} ${page.description} ${page.visibleText}`);
      if (claimFailure) {
        rejectionDiagnostics.push(`claim:${page.finalUrl}`);
        continue;
      }
      claimSupportedCount += 1;
      const accessFailure = customerAccessUsabilityFailure(new URL(page.finalUrl), page.visibleText);
      if (accessFailure) {
        rejectionDiagnostics.push(`access:${page.finalUrl}`);
        continue;
      }
      usableAccessCount += 1;

      const observedAt = new Date().toISOString();
      const discussionActivityDate = extractDiscussionActivityDateFromHtml(page.rawHtml, page.visibleText);
      const currentActivityDate = discussionActivityDate
        || (page.evidenceDateSource === 'published_metadata' ? page.evidenceDate : undefined);
      const currentActivityStatus = currentActivityStatusFromDate(currentActivityDate);
      const evidenceDate = page.evidenceDate || discussionActivityDate;
      const evidenceDateSource: EvidenceDateSource = page.evidenceDate
        ? page.evidenceDateSource
        : discussionActivityDate
          ? 'page_activity_text'
          : 'unknown';
      candidates.push({
        candidateId: candidateId('google_grounded_customer_access', page.finalUrl),
        provider: 'google_grounded_customer_access',
        targetTypeHint: 'community',
        title: groundedTitle || page.title,
        publicUrl: page.finalUrl,
        publisher: page.publisher,
        platform: 'Public buyer community',
        activity: activityLevelFromDate(currentActivityDate),
        confidence: currentActivityStatus === 'verified_current' ? 'high' : 'medium',
        evidenceDate,
        evidenceDateSource,
        evidenceRecency: evidenceRecencyFromDate(evidenceDate),
        currentActivityStatus,
        currentActivityVerifiedAt: currentActivityStatus === 'unverified' ? undefined : observedAt,
        currentActivityEvidence: currentActivityDate
          ? `The public discussion page is reachable now, has a visible participation path, and exposes discussion activity dated ${currentActivityDate.slice(0, 10)}.`
          : 'The public discussion page is reachable now and has a visible participation path, but GhostTown could not verify a dated recent activity signal.',
        factualSignals: [
          `Google-grounded search returned this public discussion/community source for the direct customer-access query: ${query}.`,
          page.description
        ].filter(Boolean),
        competitorEvidence: [],
        audienceOwner: page.publisher,
        observedAt
      });
      if (candidates.length >= 12) break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rejectionDiagnostics.push(`fetch:${safe.hostname}:${message.slice(0, 100)}`);
      continue;
    }
  }
  const currentCount = candidates.filter(candidate =>
    candidate.currentActivityStatus === 'verified_current' && Boolean(candidate.currentActivityVerifiedAt)
  ).length;
  if (chunks.length && currentCount === 0) {
    const sampleCandidates = candidates.slice(0, 3).map(candidate =>
      `${candidate.publicUrl}|${candidate.evidenceDateSource}|${candidate.evidenceDate || 'undated'}|${candidate.currentActivityStatus}`
    ).join(';');
    throw new Error(
      `Grounded customer-access found ${chunks.length} grounded sources but retained no currently usable buyer-access target ` +
      `(reachable=${reachableCount}, community=${communityCount}, claim_supported=${claimSupportedCount}, usable_access=${usableAccessCount}, candidates=${candidates.length}; ` +
      `samples=${sampleCandidates || 'none'}; rejects=${rejectionDiagnostics.slice(0, 5).join(';') || 'none'})`
    );
  }
  return candidates;
}

function providerForTask(taskId: string): DistributionProvider {
  if (taskId.startsWith('dataforseo:')) return 'dataforseo_backlinks';
  if (taskId.startsWith('podcast:')) return 'podcast_index';
  if (taskId.startsWith('customer_access:')) return 'google_grounded_customer_access';
  return 'youtube_api';
}

export async function runResearchBatch(
  env: Env,
  order: PaidTestOrder,
  plan: DistributionFootprintPlan,
  sourceIds: string[]
): Promise<ResearchBatchResult> {
  if (env.DISTRIBUTION_FOOTPRINT_ENABLED !== 'true') throw new Error('Distribution Footprint research is not enabled');
  const attempts: ResearchSourceAttempt[] = [];
  const candidates: FootprintCandidate[] = [];
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  for (const taskId of sourceIds) {
    const provider = providerForTask(taskId);
    const query = plan.queryBySourceId[taskId] || '';
    const seed = seedForTask(order, taskId);
    try {
      const result = taskId.startsWith('youtube_access:')
        ? await youtubeCustomerAccessCandidates(env, query)
        : provider === 'dataforseo_backlinks'
          ? seed ? await dataForSeoCandidates(env, seed) : []
          : provider === 'podcast_index'
            ? await podcastCandidates(env, query, seed?.name)
            : provider === 'google_grounded_customer_access'
              ? await groundedCustomerAccessCandidates(env, query)
              : await youtubeCandidates(env, query, seed?.name);
      candidates.push(...result);
      attempts.push({ sourceId: taskId, sourceType: provider, success: true, query, candidateCount: result.length });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Provider request failed';
      attempts.push({ sourceId: taskId, sourceType: provider, success: false, query, candidateCount: 0, error: reason });
      rejectedUrls.push({ url: taskId, reason });
    }
  }
  return {
    batchId: `distribution_batch_${crypto.randomUUID()}`,
    completedAt: new Date().toISOString(),
    attempts,
    candidates,
    rejectedUrls
  };
}

const SELECTION_RESPONSE_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    channels: {
      type: 'ARRAY',
      minItems: 10,
      maxItems: 25,
      items: {
        type: 'OBJECT',
        properties: {
          candidateId: { type: 'STRING' },
          targetType: { type: 'STRING', enum: ['podcast', 'youtube_creator', 'newsletter_or_publication', 'event', 'association', 'review_site', 'complementary_partner', 'community'] },
          relevance: { type: 'STRING' },
          participationRules: { type: 'STRING' },
          recommendedApproach: { type: 'STRING' },
          usefulTopic: { type: 'STRING' },
          risk: { type: 'STRING' },
          firstAction: { type: 'STRING' },
          audienceOwner: { type: 'STRING' },
          accessPath: { type: 'STRING' },
          preparedAsset: { type: 'STRING' },
          outreachScriptId: { type: 'STRING', enum: ['script-03-community_member', 'script-05-association_member', 'script-06-referral_partner', 'script-07-interview_invitation', 'script-08-offer_test_invitation'] }
        },
        required: ['candidateId', 'targetType', 'relevance', 'participationRules', 'recommendedApproach', 'usefulTopic', 'risk', 'firstAction', 'audienceOwner', 'accessPath', 'preparedAsset', 'outreachScriptId']
      }
    }
  },
  required: ['channels']
};

function selectionPrompt(order: PaidTestOrder, verdict: EvaluationResult, candidates: FootprintCandidate[]): string {
  const allowedScripts = [
    'script-03-community_member',
    'script-05-association_member',
    'script-06-referral_partner',
    'script-07-interview_invitation',
    'script-08-offer_test_invitation'
  ];
  return `You are structuring the paid GhostTown Media & Distribution Network.

Idea: ${verdict.idea.ideaName}
Description: ${verdict.idea.description}
Customer: ${order.intake.targetBuyer}
Problem: ${order.intake.problem}
Geography: ${order.intake.geography || 'not specified'}
Confirmed competitor seeds: ${(order.intake.competitorSeeds || []).map(seed => `${seed.name} (${seed.domain})`).join(', ')}

Select 10-25 high-signal evidence targets only from the immutable candidate IDs below. Keep four roles conceptually separate: direct customer access, market/competitor evidence, media/PR, and partnerships. A podcast, creator, publication, event, review site, backlink, association, or partner is not direct customer access merely because its audience appears relevant. Direct customer access requires a public community/discussion route where prospective buyers themselves may be approached. If at least three customer_access candidates exist, retain at least three of them, preferably five, before adding supporting media/market/partner targets. Do not relabel a media or partner candidate as a community to make it usable for sales. Preserve useful market/media/partner evidence even when it is not a sales channel. Do not invent a target, URL, metric, rule, contact, or claim. Treat factualSignals and competitorEvidence as the only evidence.

For each selected target:
- explain why its audience fits this exact buyer;
- state a realistic public access path without inventing private contact data;
- prepare one concrete asset GhostTown can provide, such as an interview outline, review brief, guest article outline, checklist, event talk proposal, or partner referral one-pager;
- choose one outreachScriptId from ${allowedScripts.join(', ')};
- use participationRules to state that current submission/contact rules must be checked unless evidence confirms more;
- keep firstAction immediately executable.

Return only JSON:
{"channels":[{"candidateId":"candidate id","targetType":"podcast|youtube_creator|newsletter_or_publication|event|association|review_site|complementary_partner|community","relevance":"audience fit","participationRules":"public rule or cautious instruction","recommendedApproach":"specific relationship-first strategy","usefulTopic":"specific angle","risk":"fit, timing, sponsorship, moderation, or access risk","firstAction":"one concrete action","audienceOwner":"host, creator, editor, organizer, or organization","accessPath":"public contact, submission, guest, review, sponsorship, speaker, partnership, or participation route","preparedAsset":"finished asset to use","outreachScriptId":"allowed script id"}]}

Candidates:
${JSON.stringify(candidates.map(candidate => ({
    candidateId: candidate.candidateId,
    provider: candidate.provider,
    targetTypeHint: candidate.targetTypeHint,
    title: candidate.title,
    publicUrl: candidate.publicUrl,
    publisher: candidate.publisher,
    platform: candidate.platform,
    activity: candidate.activity,
    evidenceDate: candidate.evidenceDate,
    evidenceDateSource: candidate.evidenceDateSource,
    evidenceRecency: candidate.evidenceRecency,
    currentActivityStatus: candidate.currentActivityStatus,
    currentActivityEvidence: candidate.currentActivityEvidence,
    factualSignals: candidate.factualSignals,
    competitorEvidence: candidate.competitorEvidence
  })))} `;
}

function parseSelection(value: string): SelectionPayload {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || value;
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('Distribution selection did not contain JSON');
  return JSON.parse(source.slice(first, last + 1)) as SelectionPayload;
}

function discoveredThrough(provider: DistributionProvider): NonNullable<CustomerAccessChannel['discoveredThrough']> {
  return provider === 'dataforseo_backlinks'
    ? 'competitor_backlink'
    : provider === 'podcast_index'
      ? 'podcast_search'
      : provider === 'google_grounded_customer_access'
        ? 'grounded_customer_access_search'
        : 'youtube_search';
}

function score(candidate: FootprintCandidate): number {
  const activity = { recent: 5, active: 4, occasional: 2, uncertain: 0 }[candidate.activity];
  const currentActivity = candidate.currentActivityStatus === 'verified_current' ? 6 : candidate.currentActivityStatus === 'verified_inactive' ? -2 : 0;
  const role = researchEvidenceRoleForTargetType(candidate.targetTypeHint);
  const rolePriority = role === 'customer_access' ? 7 : role === 'partnership' ? 3 : role === 'media_pr' ? 2 : 1;
  return activity + currentActivity + rolePriority + Math.min(4, candidate.competitorEvidence.length);
}

export async function finalizeCustomerAccessResearch(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  plan: DistributionFootprintPlan,
  batches: ResearchBatchResult[]
): Promise<CustomerAccessResearchResult> {
  const requestedAt = plan.createdAt;
  const attempts = batches.flatMap(batch => batch.attempts);
  const successful = attempts.filter(attempt => attempt.success);
  const sourceTypes = new Set(successful.map(attempt => attempt.sourceType));
  const rejectedUrls = batches.flatMap(batch => batch.rejectedUrls);
  if (attempts.length < MIN_ATTEMPTS) throw new Error(`Distribution Footprint attempted only ${attempts.length} tasks; ${MIN_ATTEMPTS} are required`);
  if (successful.length < MIN_SUCCESSES) throw new Error(`Distribution Footprint completed only ${successful.length} provider tasks; ${MIN_SUCCESSES} are required`);
  if (sourceTypes.size < MIN_PROVIDER_TYPES) throw new Error(`Distribution Footprint used only ${sourceTypes.size} provider types; ${MIN_PROVIDER_TYPES} are required`);

  const deduped = new Map<string, FootprintCandidate>();
  for (const candidate of batches.flatMap(batch => batch.candidates)) {
    const key = candidate.publicUrl.toLowerCase().replace(/\/$/, '');
    const existing = deduped.get(key);
    if (!existing || score(candidate) > score(existing)) deduped.set(key, candidate);
  }
  const candidates = [...deduped.values()].sort((left, right) => score(right) - score(left)).slice(0, MAX_CANDIDATES_FOR_MODEL);
  if (candidates.length < MIN_CHANNELS) throw new Error(`Distribution Footprint found only ${candidates.length} verified candidates; ${MIN_CHANNELS} are required`);

  const ai = await generateAI(env, {
    task: 'candidate_selection',
    prompt: selectionPrompt(order, verdict, candidates),
    temperature: 0.1,
    maxOutputTokens: 10000,
    timeoutMs: 30_000
  });
  const output = ai.text;
  const model = ai.receipt.model;
  const selection = parseSelection(output);
  const byId = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));
  const unknownCandidateIds = [...new Set((selection.channels || [])
    .map(selected => text(selected.candidateId))
    .filter(candidateIdValue => candidateIdValue && !byId.has(candidateIdValue)))];
  if (unknownCandidateIds.length) {
    throw new Error(`STEP5_RESEARCH_UNKNOWN_CANDIDATE_ID: Model returned candidate IDs outside the immutable candidate set: ${unknownCandidateIds.join(', ')}`);
  }
  const researchDate = new Date().toISOString().slice(0, 10);
  const channels: CustomerAccessChannel[] = [];
  const sources: BlueprintSource[] = [];
  const seen = new Set<string>();
  for (const selected of selection.channels || []) {
    const idValue = text(selected.candidateId);
    const candidate = byId.get(idValue);
    if (!candidate || seen.has(candidate.publicUrl)) continue;
    seen.add(candidate.publicUrl);
    // Candidate classification is provider/page-derived and immutable here. The
    // model may explain or rank a target, but it may not relabel media evidence
    // as a community/customer-access target.
    const type = candidate.targetTypeHint;
    const recordSourceId = sourceId(candidate.publicUrl);
    channels.push({
      channelId: channelId(candidate.publicUrl),
      community: candidate.title,
      platform: candidate.platform,
      publicUrl: candidate.publicUrl,
      relevance: text(selected.relevance, `This target has public evidence connecting it to the distribution footprint of a comparable product or the customer category.`),
      activity: candidate.activity,
      participationRules: text(selected.participationRules, 'Review the target’s current public contact, submission, sponsorship, review, guest, speaker, or participation rules before outreach.'),
      recommendedApproach: text(selected.recommendedApproach, 'Lead with a useful, audience-specific contribution and a transparent request rather than a mass promotional pitch.'),
      usefulTopic: text(selected.usefulTopic, order.intake.problem),
      risk: text(selected.risk, 'Audience fit, timing, commercial terms, and response are not guaranteed.'),
      firstAction: text(selected.firstAction, 'Open the public source, identify its current public access route, and personalize the prepared asset.'),
      confidence: candidate.confidence,
      researchDate,
      evidenceDate: candidate.evidenceDate,
      evidenceDateSource: candidate.evidenceDateSource,
      evidenceRecency: candidate.evidenceRecency,
      currentActivityStatus: candidate.currentActivityStatus,
      currentActivityVerifiedAt: candidate.currentActivityVerifiedAt,
      currentActivityEvidence: candidate.currentActivityEvidence,
      sourceIds: [recordSourceId],
      targetType: type,
      evidenceRole: researchEvidenceRoleForTargetType(type),
      evidenceRoleReason: researchEvidenceRoleReason(researchEvidenceRoleForTargetType(type)),
      discoveredThrough: discoveredThrough(candidate.provider),
      competitorEvidence: candidate.competitorEvidence,
      audienceOwner: text(selected.audienceOwner, candidate.audienceOwner),
      accessPath: text(selected.accessPath, 'Use the target’s current public contact or submission route.'),
      preparedAsset: text(selected.preparedAsset, 'Audience-specific interview or educational resource outline.'),
      outreachScriptId: text(selected.outreachScriptId, type === 'association' ? 'script-05-association_member' : type === 'complementary_partner' ? 'script-06-referral_partner' : 'script-07-interview_invitation')
    });
    sources.push({
      sourceId: recordSourceId,
      title: candidate.title,
      url: candidate.publicUrl,
      publisher: candidate.publisher,
      accessedAt: candidate.observedAt,
      evidenceDate: candidate.evidenceDate,
      evidenceDateSource: candidate.evidenceDateSource,
      evidenceRecency: candidate.evidenceRecency,
      supports: [...candidate.competitorEvidence, ...candidate.factualSignals].slice(0, 8)
    });
    if (channels.length >= MAX_CHANNELS) break;
  }

  const typeCounts = channels.reduce<Record<string, number>>((counts, channel) => {
    const key = channel.targetType || 'community';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const mediaTypes = new Set(channels.map(channel => channel.targetType).filter(Boolean));
  const customerAccessCount = channels.filter(channel => channel.evidenceRole === 'customer_access' && channel.currentActivityStatus === 'verified_current' && channel.currentActivityVerifiedAt).length;
  const complete = channels.length >= MIN_CHANNELS && mediaTypes.size >= 3 && customerAccessCount >= 3;
  if (!complete) throw new Error(`Research & Customer Access failed its quality gate: ${channels.length} targets across ${mediaTypes.size} target types, with ${customerAccessCount} direct customer-access targets; at least 3 are required`);

  const publicExpertsAndPartners = channels
    .filter(channel => channel.evidenceRole === 'partnership')
    .slice(0, 8)
    .map(channel => ({
      name: channel.community,
      role: channel.targetType?.replace(/_/g, ' ') || channel.platform,
      publicUrl: channel.publicUrl,
      relevance: channel.relevance,
      sourceIds: channel.sourceIds
    }));

  return {
    research: {
      status: 'complete',
      researchDate,
      sources,
      channels,
      publicExpertsAndPartners
    },
    receipt: {
      provider: 'distribution_footprint',
      model,
      requestedAt,
      completedAt: new Date().toISOString(),
      packs: plan.packs,
      webSearchQueries: [...new Set(Object.values(plan.queryBySourceId))],
      attemptedSourceCount: attempts.length,
      successfulSourceCount: successful.length,
      sourceTypeCount: sourceTypes.size,
      candidateChannelCount: candidates.length,
      verifiedChannelCount: channels.length,
      rejectedUrls,
      failedSources: attempts.filter(attempt => !attempt.success).map(attempt => ({ sourceId: attempt.sourceId, reason: attempt.error || 'Provider task failed' })),
      sourceDefinitionIds: attempts.map(attempt => attempt.sourceId),
      seedDomains: plan.seedDomains,
      targetTypeCounts: typeCounts,
      responseHash: ai.receipt.responseHash,
      unknownCandidateIds: []
    }
  };
}

export async function researchCustomerAccess(env: Env, order: PaidTestOrder, verdict: EvaluationResult): Promise<CustomerAccessResearchResult> {
  const plan = planCustomerAccessResearch(order, verdict);
  const batch = await runResearchBatch(env, order, plan, plan.sourceIds);
  return finalizeCustomerAccessResearch(env, order, verdict, plan, [batch]);
}
