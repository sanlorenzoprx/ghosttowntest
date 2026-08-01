import { authenticateRequest } from './auth';
import type { Env } from './env';
import type {
  ResearchPreviewRequest,
  ResearchPreviewResponse,
  ResearchPreviewSuggestion,
  ResearchSignalType
} from '../types/researchSignals';

const DATAFORSEO_SERP_ENDPOINT = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
const PODCAST_INDEX_ENDPOINT = 'https://api.podcastindex.org/api/1.0/search/byterm';
const YOUTUBE_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const MAX_SUGGESTIONS = 6;
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json' };

interface DataForSeoSerpResponse {
  status_code?: number;
  tasks?: Array<{ status_code?: number; status_message?: string; result?: Array<{ items?: Array<{ type?: string; title?: string; url?: string; domain?: string }> }> }>;
}

interface PodcastIndexResponse {
  status?: string;
  description?: string;
  feeds?: Array<{ id?: number; title?: string; author?: string; link?: string; dead?: number }>;
}

interface YouTubeResponse {
  items?: Array<{ snippet?: { channelId?: string; channelTitle?: string } }>;
  error?: { message?: string };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: PRIVATE_HEADERS });

function clean(value: unknown, max = 240): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function signalType(value: unknown): value is ResearchSignalType {
  return value === 'commercial' || value === 'audience' || value === 'ecosystem';
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

export function safePublicHttpsUrl(value: string): URL | null {
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

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('Research preview timed out'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timeout);
  }
}

async function sha1Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function rateKey(request: Request, resultId: string): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'anonymous';
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${resultId}:${ip}`)));
  const hash = Array.from(digest.slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
  return `research_preview_rate_${resultId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}_${hash}`;
}

function candidateId(provider: ResearchPreviewSuggestion['provider'], publicUrl: string): string {
  let hash = 2166136261;
  const input = `${provider}:${publicUrl.toLowerCase()}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `preview_${provider}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function suggestion(provider: ResearchPreviewSuggestion['provider'], label: string, rawUrl: string): ResearchPreviewSuggestion | null {
  const publicUrl = safePublicHttpsUrl(rawUrl);
  const normalizedLabel = clean(label, 160);
  if (!publicUrl || !normalizedLabel) return null;
  return {
    candidateId: candidateId(provider, publicUrl.toString()),
    label: normalizedLabel,
    publicUrl: publicUrl.toString(),
    provider,
    verificationStatus: 'provider_candidate'
  };
}

async function dataForSeoSuggestions(env: Env, query: string, locale: 'en' | 'es'): Promise<ResearchPreviewSuggestion[]> {
  if (!env.DATAFORSEO_LOGIN?.trim() || !env.DATAFORSEO_PASSWORD?.trim()) throw new Error('DataForSEO is not configured');
  const response = await fetchWithTimeout(DATAFORSEO_SERP_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      keyword: query,
      location_name: 'United States',
      language_code: locale,
      depth: 10,
      device: 'desktop',
      os: 'windows'
    }])
  }, 12000);
  const body = await response.json() as DataForSeoSerpResponse;
  const task = body.tasks?.[0];
  if (!response.ok || body.status_code !== 20000 || task?.status_code !== 20000) throw new Error(task?.status_message || `DataForSEO returned HTTP ${response.status}`);
  return (task.result?.flatMap(result => result.items || []) || [])
    .filter(item => item.type === 'organic')
    .map(item => suggestion('dataforseo', item.title || item.domain || '', item.url || ''))
    .filter((item): item is ResearchPreviewSuggestion => Boolean(item));
}

async function podcastSuggestions(env: Env, query: string): Promise<ResearchPreviewSuggestion[]> {
  if (!env.PODCAST_INDEX_API_KEY?.trim() || !env.PODCAST_INDEX_API_SECRET?.trim()) throw new Error('Podcast Index is not configured');
  const authDate = Math.floor(Date.now() / 1000).toString();
  const authorization = await sha1Hex(`${env.PODCAST_INDEX_API_KEY}${env.PODCAST_INDEX_API_SECRET}${authDate}`);
  const url = new URL(PODCAST_INDEX_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('max', '8');
  url.searchParams.set('clean', 'true');
  const response = await fetchWithTimeout(url.toString(), { headers: { 'User-Agent': 'GhostTownResearchPreview/1.0', 'X-Auth-Key': env.PODCAST_INDEX_API_KEY, 'X-Auth-Date': authDate, Authorization: authorization } });
  const body = await response.json() as PodcastIndexResponse;
  if (!response.ok || body.status === 'false') throw new Error(body.description || `Podcast Index returned HTTP ${response.status}`);
  return (body.feeds || []).filter(feed => feed.dead !== 1).map(feed => suggestion('podcast_index', feed.title || feed.author || '', feed.link || '')).filter((item): item is ResearchPreviewSuggestion => Boolean(item));
}

async function youtubeSuggestions(env: Env, query: string, locale: 'en' | 'es'): Promise<ResearchPreviewSuggestion[]> {
  if (!env.YOUTUBE_API_KEY?.trim()) throw new Error('YouTube Data API is not configured');
  const url = new URL(YOUTUBE_ENDPOINT);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'channel');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '8');
  url.searchParams.set('relevanceLanguage', locale);
  url.searchParams.set('safeSearch', 'moderate');
  url.searchParams.set('key', env.YOUTUBE_API_KEY);
  const response = await fetchWithTimeout(url.toString());
  const body = await response.json() as YouTubeResponse;
  if (!response.ok) throw new Error(body.error?.message || `YouTube returned HTTP ${response.status}`);
  return (body.items || []).map(item => {
    const channelId = clean(item.snippet?.channelId, 100);
    return channelId ? suggestion('youtube_api', item.snippet?.channelTitle || 'YouTube creator', `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`) : null;
  }).filter((item): item is ResearchPreviewSuggestion => Boolean(item));
}

function insight(type: ResearchSignalType, subject: string, locale: 'en' | 'es'): string {
  const value = subject || (locale === 'es' ? 'Esta pista' : 'This clue');
  if (locale === 'es') {
    if (type === 'commercial') return `${value} puede revelar qué soluciones ya compran los clientes y qué canales envían atención a productos similares.`;
    if (type === 'audience') return `${value} puede mostrar dónde el cliente ya dedica tiempo y atención; la pista todavía debe verificarse.`;
    return `${value} puede ayudar a mapear asociaciones, eventos y publicaciones que ya tienen la confianza del cliente.`;
  }
  if (type === 'commercial') return `${value} can reveal what customers already buy and which channels send attention to comparable products.`;
  if (type === 'audience') return `${value} can show where customers already spend attention; the clue still needs verification.`;
  return `${value} can help map associations, events, and publications the customer already trusts.`;
}

function dedupe(items: ResearchPreviewSuggestion[]): ResearchPreviewSuggestion[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.publicUrl.toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_SUGGESTIONS);
}

export async function handleResearchPreviewSuggestions(request: Request, env: Env): Promise<Response> {
  let body: Partial<ResearchPreviewRequest>;
  try {
    body = await request.json<Partial<ResearchPreviewRequest>>();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const resultId = clean(body.resultId, 120);
  const ideaSummary = clean(body.ideaSummary, 500);
  const typedSeed = clean(body.typedSeed, 160);
  const locale = body.locale === 'es' ? 'es' : 'en';
  if (!resultId || !ideaSummary || !signalType(body.signalType)) return json({ error: 'resultId, ideaSummary, and signalType are required' }, 400);
  const verdictExists = await env.KV.get(`verdict_${resultId}`) ?? await env.KV.get(`verdict:${resultId}`);
  if (!verdictExists) return json({ error: 'Assessment result not found' }, 404);

  const auth = await authenticateRequest(request, env);
  const key = await rateKey(request, resultId);
  const prior = Number(await env.KV.get(key) || '0');
  const limit = auth ? 6 : 3;
  if (prior >= limit) return json({ error: 'Research preview limit reached for this result' }, 429);
  await env.KV.put(key, String(prior + 1), { expirationTtl: 86400 });

  const subject = typedSeed || ideaSummary;
  const requests: Array<Promise<ResearchPreviewSuggestion[]>> = body.signalType === 'audience'
    ? [podcastSuggestions(env, subject), youtubeSuggestions(env, subject, locale)]
    : [dataForSeoSuggestions(env, body.signalType === 'commercial' ? `${subject} products brands` : `${subject} association event newsletter publication community`, locale)];
  const settled = await Promise.allSettled(requests);
  const suggestions = dedupe(settled.flatMap(result => result.status === 'fulfilled' ? result.value : []));
  const failed = settled.filter(result => result.status === 'rejected').length;
  const response: ResearchPreviewResponse = {
    suggestions,
    insight: insight(body.signalType, typedSeed || suggestions[0]?.label || '', locale),
    warning: failed ? (locale === 'es' ? 'Una fuente no estuvo disponible. Puedes escribir tu propia pista y continuar.' : 'One research source was unavailable. You can type your own clue and continue.') : undefined
  };
  return json(response);
}
