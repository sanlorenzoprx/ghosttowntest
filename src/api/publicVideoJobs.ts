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

export async function queuePublicVideo(
  _result: EvaluationResult,
  _locale: string,
  _env: Env
): Promise<PublicVideoSummary> {
  throw new Error('LEGACY_PUBLIC_VIDEO_PIPELINE_RETIRED: submit an accepted StoryFactory production packet');
}

export async function handleNextPublicVideoJob(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  return json({ error: 'legacy_public_video_pipeline_retired', replacement: 'accepted StoryFactory production packets' }, 410);
}

export async function handlePublicVideoUpload(
  request: Request,
  env: Env,
  _jobIdValue: string
): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  return json({ error: 'legacy_public_video_upload_retired' }, 410);
}

export async function handlePublicVideoFailure(
  request: Request,
  env: Env,
  _jobIdValue: string
): Promise<Response> {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  return json({ error: 'legacy_public_video_failure_endpoint_retired' }, 410);
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
    status: job.status === 'complete' ? 'complete' : 'failed',
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


function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
