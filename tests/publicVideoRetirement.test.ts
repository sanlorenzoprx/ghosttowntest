// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import {
  handleNextPublicVideoJob, handlePublicVideoUpload, handlePublicVideoFailure,
  handlePublicVideoStatus, handlePublicVideo, queuePublicVideo,
} from '../src/api/publicVideoJobs';

function fixture(status = 'processing') {
  const job = { job_id: 'old-job', status, public: true, origin: 'user_submission', object_key: 'public-videos/old-job.mp4' };
  const KV = { list: vi.fn(), put: vi.fn(), get: vi.fn(async () => job) };
  const VIDEOS = { put: vi.fn(), get: vi.fn(async () => ({ body: new Uint8Array([1, 2, 3]), httpEtag: 'existing', writeHttpMetadata: (headers: Headers) => headers.set('content-type', 'video/mp4') })) };
  const env = { KV, VIDEOS, LIT_API_KEY: 'fixture-key' } as unknown as Env;
  return { env, KV, VIDEOS };
}
const request = (path: string) => new Request(`https://example.com/${path}`, { headers: { authorization: 'Bearer fixture-key' } });

describe('legacy public video retirement', () => {
  it('refuses 10,000 old claims without scanning or changing the queue', async () => {
    const { env, KV } = fixture();
    for (let i = 0; i < 10_000; i++) expect((await handleNextPublicVideoJob(request('next'), env)).status).toBe(410);
    expect(KV.list).not.toHaveBeenCalled();
    expect(KV.get).not.toHaveBeenCalled();
    expect(KV.put).not.toHaveBeenCalled();
  });
  it('refuses stale uploads and failure callbacks before storage changes', async () => {
    const { env, KV, VIDEOS } = fixture('complete');
    expect((await handlePublicVideoUpload(request('upload'), env, 'old-job')).status).toBe(410);
    expect((await handlePublicVideoFailure(request('fail'), env, 'old-job')).status).toBe(410);
    expect(KV.put).not.toHaveBeenCalled();
    expect(VIDEOS.put).not.toHaveBeenCalled();
  });
  it('keeps endpoint authentication', async () => {
    const { env } = fixture();
    expect((await handleNextPublicVideoJob(new Request('https://example.com'), env)).status).toBe(401);
  });
  it('makes old direct enqueue calls fail without writing another job', async () => {
    const { env, KV } = fixture();
    await expect(queuePublicVideo({} as never, 'en-US', env)).rejects.toThrow('RETIRED');
    expect(KV.put).not.toHaveBeenCalled();
  });
  it('stops indefinite processing while retaining completed public videos', async () => {
    const pending = fixture();
    expect((await (await handlePublicVideoStatus(pending.env, 'old-job')).json()).status).toBe('failed');
    const complete = fixture('complete');
    expect((await (await handlePublicVideoStatus(complete.env, 'old-job')).json()).status).toBe('complete');
    const response = await handlePublicVideo(complete.env, 'old-job');
    expect(response.status).toBe(200);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(complete.VIDEOS.put).not.toHaveBeenCalled();
  });
});
