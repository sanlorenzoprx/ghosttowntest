import type { EvaluationResult } from '../types/lit';
import type { Env } from './env';

export type PublicVideoStatus = 'queued' | 'processing' | 'complete' | 'failed';

export interface PublicVideoSummary {
  job_id: string;
  status: PublicVideoStatus;
  public: true;
  origin: 'user_submission';
  reused: boolean;
  status_url: string;
  video_url: string | null;
  distribution_status: 'pending' | 'eligible';
}

interface PublicVideoJob {
  schema_version: 'ghosttown-public-video-job-v1';
  job_id: string;
  status: PublicVideoStatus;
  public: true;
  origin: 'user_submission';
  result_id: string;
  locale: string;
  report: unknown;
  object_key: string;
  created_at: string;
  updated_at: string;
  failure_code: string | null;
}

const JOB_PREFIX = 'video-job:';
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function queuePublicVideo(
  result: EvaluationResult,
  locale: string,
  env: Env
): Promise<PublicVideoSummary> {
  const jobId = safeJobId(result.resultId);
  const key = jobKey(jobId);
  const existing = await env.KV.get<PublicVideoJob>(key, 'json');
  if (existing) return summary(existing, true);

  const now = new Date().toISOString();
  const job: PublicVideoJob = {
    schema_version: 'ghosttown-public-video-job-v1',
    job_id: jobId,
    status: 'queued',
    public: true,
    origin: 'user_submission',
    result_id: result.resultId,
    locale: normalizeLocale(locale),
    report: sanitizePublicData(result),
    object_key: `public-videos/${jobId}.mp4`,
    created_at: now,
    updated_at: now,
    failure_code: null
  };
  await env.KV.put(key, JSON.stringify(job), { expirationTtl: 86400 * 365 });
  return summary(job, false);
}

export async function handleNextPublicVideoJob(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  const listed = await env.KV.list({ prefix: JOB_PREFIX, limit: 100 });
  for (const entry of listed.keys) {
    const job = await env.KV.get<PublicVideoJob>(entry.name, 'json');
    if (!job || job.status !== 'queued') continue;
    const claimed = { ...job, status: 'processing' as const, updated_at: new Date().toISOString() };
    await env.KV.put(entry.name, JSON.stringify(claimed), { expirationTtl: 86400 * 365 });
    return json({
      schema_version: claimed.schema_version,
      job_id: claimed.job_id,
      origin: claimed.origin,
      public: claimed.public,
      locale: claimed.locale,
      report: claimed.report,
      upload_path: `/api/integrations/shorts-factory/video-jobs/${claimed.job_id}/video`
    });
  }
  return new Response(null, { status: 204 });
}

export async function handlePublicVideoUpload(
  request: Request,
  env: Env,
  jobIdValue: string
): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  if (!env.VIDEOS) return json({ error: 'video storage is not configured' }, 503);
  if (!request.body) return json({ error: 'video body is required' }, 400);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('video/mp4')) {
    return json({ error: 'content-type must be video/mp4' }, 415);
  }

  const length = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_VIDEO_BYTES) {
    return json({ error: 'invalid video size' }, 413);
  }
  const sha256 = request.headers.get('x-content-sha256')?.toLowerCase() ?? '';
  if (!/^[0-9a-f]{64}$/.test(sha256)) return json({ error: 'x-content-sha256 is required' }, 422);

  const jobId = safeJobId(jobIdValue);
  const key = jobKey(jobId);
  const job = await env.KV.get<PublicVideoJob>(key, 'json');
  if (!job) return json({ error: 'video job not found' }, 404);
  if (job.status === 'complete') return json(summary(job, true), 200);

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength !== length) return json({ error: 'content length mismatch' }, 422);
  const actualHash = await digest(bytes);
  if (actualHash !== sha256) return json({ error: 'video checksum mismatch' }, 422);

  await env.VIDEOS.put(job.object_key, bytes, {
    httpMetadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { sha256, public: 'true', origin: job.origin }
  });
  const completed: PublicVideoJob = {
    ...job,
    status: 'complete',
    updated_at: new Date().toISOString(),
    failure_code: null
  };
  await env.KV.put(key, JSON.stringify(completed), { expirationTtl: 86400 * 365 });
  return json(summary(completed, false), 201);
}

export async function handlePublicVideoFailure(
  request: Request,
  env: Env,
  jobIdValue: string
): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  const jobId = safeJobId(jobIdValue);
  const key = jobKey(jobId);
  const job = await env.KV.get<PublicVideoJob>(key, 'json');
  if (!job) return json({ error: 'video job not found' }, 404);
  const body = await request.json<{ failure_code?: unknown }>().catch(() => ({}));
  const failureCode = typeof body.failure_code === 'string'
    ? body.failure_code.replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'render_failed'
    : 'render_failed';
  const failed: PublicVideoJob = {
    ...job,
    status: 'failed',
    updated_at: new Date().toISOString(),
    failure_code: failureCode
  };
  await env.KV.put(key, JSON.stringify(failed), { expirationTtl: 86400 * 365 });
  return json(summary(failed, false));
}

export async function handlePublicVideoStatus(env: Env, jobIdValue: string): Promise<Response> {
  const jobId = safeJobId(jobIdValue);
  const job = await env.KV.get<PublicVideoJob>(jobKey(jobId), 'json');
  return job ? json(summary(job, true)) : json({ error: 'video job not found' }, 404);
}

export async function handlePublicVideo(env: Env, jobIdValue: string): Promise<Response> {
  if (!env.VIDEOS) return json({ error: 'video storage is not configured' }, 503);
  const jobId = safeJobId(jobIdValue);
  const job = await env.KV.get<PublicVideoJob>(jobKey(jobId), 'json');
  if (!job || job.status !== 'complete') return json({ error: 'video is not ready' }, 404);
  const object = await env.VIDEOS.get(job.object_key);
  if (!object) return json({ error: 'video object not found' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}

function summary(job: PublicVideoJob, reused: boolean): PublicVideoSummary {
  return {
    job_id: job.job_id,
    status: job.status,
    public: true,
    origin: 'user_submission',
    reused,
    status_url: `/api/videos/${job.job_id}/status`,
    video_url: job.status === 'complete' ? `/api/videos/${job.job_id}.mp4` : null,
    distribution_status: job.status === 'complete' ? 'eligible' : 'pending'
  };
}

function authorized(request: Request, env: Env): boolean {
  const key = env.LIT_API_KEY?.trim();
  return Boolean(key) && request.headers.get('authorization') === `Bearer ${key}`;
}

function safeJobId(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 96);
  if (!normalized) throw new Error('invalid video job id');
  return normalized;
}

function jobKey(jobId: string): string {
  return `${JOB_PREFIX}${jobId}`;
}

function normalizeLocale(value: string): string {
  const normalized = value.trim();
  return /^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized) ? normalized : 'en-US';
}

function sanitizePublicData(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted-phone]')
      .slice(0, 4000);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map(sanitizePublicData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [key, sanitizePublicData(item)])
    );
  }
  return value;
}

async function digest(value: ArrayBuffer): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', value);
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
