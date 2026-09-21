import type { Env } from './env';

const YOUTUBE_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const PRIVATE_JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json'
};

interface DiscoveryRequest {
  query?: unknown;
  market?: unknown;
  limit?: unknown;
}

interface YouTubeSearchResponse {
  items?: Array<{ id?: { videoId?: string } }>;
  error?: { message?: string };
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      tags?: string[];
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: { duration?: string };
  }>;
  error?: { message?: string };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: PRIVATE_JSON_HEADERS
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function count(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function authorized(request: Request, env: Env): boolean {
  const key = env.SHORTS_FACTORY_RESEARCH_API_KEY?.trim();
  return Boolean(key) && request.headers.get('Authorization') === `Bearer ${key}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('YouTube discovery timed out'), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function youtubeJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString());
  } catch {
    throw new Error('youtube_network_error');
  }
  let body: T;
  try {
    body = await response.json() as T;
  } catch {
    throw new Error('youtube_invalid_json');
  }
  if (!response.ok) {
    throw new Error(`youtube_http_${response.status}`);
  }
  return body;
}

export async function handleShortsFactoryYouTubeDiscovery(
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.SHORTS_FACTORY_RESEARCH_API_KEY?.trim()) {
    return json({ error: 'research_auth_not_configured' }, 503);
  }
  if (!authorized(request, env)) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!env.YOUTUBE_API_KEY?.trim()) {
    return json({ error: 'youtube_not_configured' }, 503);
  }

  let input: DiscoveryRequest;
  try {
    input = await request.json<DiscoveryRequest>();
  } catch {
    return json({ error: 'invalid_request', message: 'JSON body is required' }, 400);
  }

  const query = clean(input.query, 160);
  const marketInput = clean(input.market, 16);
  const market = (marketInput || 'US').toUpperCase();
  const rawLimit = input.limit === undefined ? 20 : Number(input.limit);
  if (!query) {
    return json({ error: 'invalid_request', message: 'query is required' }, 400);
  }
  if (!/^[A-Z]{2}$/.test(market)) {
    return json({ error: 'invalid_request', message: 'market must be a two-letter region code' }, 400);
  }
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50) {
    return json({ error: 'invalid_request', message: 'limit must be an integer from 1 to 50' }, 400);
  }

  try {
    const searchUrl = new URL(YOUTUBE_SEARCH_ENDPOINT);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxResults', String(rawLimit));
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('regionCode', market);
    searchUrl.searchParams.set('safeSearch', 'moderate');
    searchUrl.searchParams.set('key', env.YOUTUBE_API_KEY);

    const search = await youtubeJson<YouTubeSearchResponse>(searchUrl);
    const videoIds = Array.from(new Set(
      (search.items || [])
        .map(item => clean(item.id?.videoId, 100))
        .filter(Boolean)
    ));

    if (videoIds.length === 0) {
      return json({
        contract_version: 'shortsfactory-youtube-discovery-v1',
        provider_id: 'youtube-data-api-v3',
        query,
        market,
        result_count: 0,
        videos: [],
        provider_calls: { search_list: 1, videos_list: 0 }
      });
    }

    const videosUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);
    videosUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', env.YOUTUBE_API_KEY);
    const details = await youtubeJson<YouTubeVideosResponse>(videosUrl);
    const rank = new Map(videoIds.map((id, index) => [id, index + 1]));

    const videos = (details.items || []).flatMap(item => {
      const videoId = clean(item.id, 100);
      if (!videoId) return [];
      const snippet = item.snippet || {};
      const statistics = item.statistics || {};
      return [{
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        provider_rank: rank.get(videoId) || null,
        title: clean(snippet.title, 240),
        description: clean(snippet.description, 2000),
        channel_id: clean(snippet.channelId, 120),
        channel_title: clean(snippet.channelTitle, 240),
        published_at: clean(snippet.publishedAt, 80),
        tags: Array.isArray(snippet.tags)
          ? snippet.tags.map(tag => clean(tag, 100)).filter(Boolean).slice(0, 40)
          : [],
        duration_iso8601: clean(item.contentDetails?.duration, 80),
        views: count(statistics.viewCount),
        likes: count(statistics.likeCount),
        comments: count(statistics.commentCount)
      }];
    });

    videos.sort((left, right) =>
      (left.provider_rank || Number.MAX_SAFE_INTEGER) -
      (right.provider_rank || Number.MAX_SAFE_INTEGER)
    );

    return json({
      contract_version: 'shortsfactory-youtube-discovery-v1',
      provider_id: 'youtube-data-api-v3',
      query,
      market,
      result_count: videos.length,
      videos,
      provider_calls: { search_list: 1, videos_list: 1 }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'youtube_provider_error';
    console.error('ShortsFactory YouTube discovery failed', reason);
    return json({ error: 'youtube_provider_error', reason }, 502);
  }
}
