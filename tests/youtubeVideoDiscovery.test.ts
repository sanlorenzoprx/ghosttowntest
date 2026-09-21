import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/api/index';

function createEnv(overrides: Record<string, unknown> = {}) {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
    FRONTEND_URL: 'https://acceptance.ghosttowntest.pages.dev',
    SHORTS_FACTORY_RESEARCH_API_KEY: 'research-secret',
    YOUTUBE_API_KEY: 'youtube-secret',
    JWT_SECRET: 'jwt-secret',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
    ...overrides
  } as any;
}

function request(
  body: unknown = { query: 'vibe coding', market: 'US', limit: 2 },
  authorization = 'Bearer research-secret'
): Request {
  return new Request(
    'https://example.test/api/integrations/shorts-factory/youtube-discovery',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify(body)
    }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Shorts Factory YouTube discovery integration', () => {
  it('fails closed when research auth is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(
      request(),
      createEnv({ SHORTS_FACTORY_RESEARCH_API_KEY: undefined })
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'research_auth_not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the dedicated ShortsFactory research bearer token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(request(undefined, 'Bearer wrong'), createEnv());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the YouTube provider key is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(
      request(),
      createEnv({ YOUTUBE_API_KEY: undefined })
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'youtube_not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses search.list type=video then videos.list and returns normalized evidence', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          { id: { videoId: 'video-b' } },
          { id: { videoId: 'video-a' } }
        ]
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            id: 'video-a',
            snippet: {
              title: 'Build an AI app',
              description: 'Validate demand before scaling.',
              channelId: 'channel-a',
              channelTitle: 'Founder Lab',
              publishedAt: '2026-09-01T12:00:00Z',
              tags: ['vibe coding', 'startup']
            },
            statistics: {
              viewCount: '12000',
              likeCount: '600',
              commentCount: '42'
            },
            contentDetails: { duration: 'PT47S' }
          },
          {
            id: 'video-b',
            snippet: {
              title: 'Vibe coding launch',
              description: 'Ship, test, learn.',
              channelId: 'channel-b',
              channelTitle: 'Builder',
              publishedAt: '2026-09-02T12:00:00Z'
            },
            statistics: {
              viewCount: '50000',
              likeCount: '4200',
              commentCount: '180'
            },
            contentDetails: { duration: 'PT31S' }
          }
        ]
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(request(), createEnv());
    const body = await response.json<any>();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      contract_version: 'shortsfactory-youtube-discovery-v1',
      provider_id: 'youtube-data-api-v3',
      query: 'vibe coding',
      market: 'US',
      result_count: 2,
      provider_calls: { search_list: 1, videos_list: 1 }
    });
    expect(body.videos[0]).toMatchObject({
      video_id: 'video-b',
      provider_rank: 1,
      views: 50000,
      likes: 4200,
      comments: 180,
      duration_iso8601: 'PT31S'
    });
    expect(body.videos[1]).toMatchObject({
      video_id: 'video-a',
      provider_rank: 2,
      tags: ['vibe coding', 'startup']
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const searchUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(searchUrl.pathname).toBe('/youtube/v3/search');
    expect(searchUrl.searchParams.get('type')).toBe('video');
    expect(searchUrl.searchParams.get('q')).toBe('vibe coding');
    expect(searchUrl.searchParams.get('regionCode')).toBe('US');
    expect(searchUrl.searchParams.get('maxResults')).toBe('2');

    const videosUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(videosUrl.pathname).toBe('/youtube/v3/videos');
    expect(videosUrl.searchParams.get('part')).toBe('snippet,statistics,contentDetails');
    expect(videosUrl.searchParams.get('id')).toBe('video-b,video-a');

    const encoded = JSON.stringify(body);
    expect(encoded).not.toContain('research-secret');
    expect(encoded).not.toContain('youtube-secret');
  });

  it('returns an empty verified result without calling videos.list', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(request(), createEnv());
    const body = await response.json<any>();

    expect(response.status).toBe(200);
    expect(body.result_count).toBe(0);
    expect(body.videos).toEqual([]);
    expect(body.provider_calls).toEqual({ search_list: 1, videos_list: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ market: 'USA', query: 'vibe coding' }, 'market must be a two-letter region code'],
    [{ market: 'US', query: '', limit: 2 }, 'query is required'],
    [{ market: 'US', query: 'vibe coding', limit: 51 }, 'limit must be an integer from 1 to 50']
  ])('rejects invalid input %#', async (body, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(request(body), createEnv());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_request', message });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a bounded provider error without leaking Google credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), {
        status: 403
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await worker.fetch(request(), createEnv());
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({
      error: 'youtube_provider_error',
      reason: 'youtube_http_403'
    });
    expect(text).not.toContain('youtube-secret');
    expect(text).not.toContain('quota exceeded');
  });
});
