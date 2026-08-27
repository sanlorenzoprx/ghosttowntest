import { authenticateRequest } from './auth';
import type { Env } from './env';
import { saveUserResult } from './resultHistory';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import type { EvaluationResult } from '../types/lit';
import type {
  AgentHandoffRecord,
  AgentProtocol,
  AgentPublicVerdictProjection
} from '../types/agentSurface';

const HANDOFF_PREFIX = 'agent_handoff_';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function token(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function ttlSeconds(env: Env): number {
  const configured = Number((env as Env & { ASC_HANDOFF_TTL_SECONDS?: string }).ASC_HANDOFF_TTL_SECONDS);
  return Number.isFinite(configured) && configured >= 300
    ? Math.floor(configured)
    : DEFAULT_TTL_SECONDS;
}

function frontendOrigin(env: Env): string {
  return (env.FRONTEND_URL?.trim() || 'https://ghosttowntest.com').replace(/\/$/, '');
}

export async function createAgentHandoff(
  env: Env,
  publicVerdict: AgentPublicVerdictProjection,
  context: { agentClient?: string; protocol: AgentProtocol; tool: string }
): Promise<{ token: string; record: AgentHandoffRecord; resultUrl: string }> {
  const handoffToken = token();
  const handoffId = crypto.randomUUID();
  const ttl = ttlSeconds(env);
  const now = new Date();
  const expires = new Date(now.getTime() + ttl * 1000);
  const record: AgentHandoffRecord = {
    schemaVersion: 'ghosttown-agent-handoff-v1',
    handoffId,
    verdictId: publicVerdict.verdict_id,
    publicVerdict,
    agentClient: context.agentClient?.trim().slice(0, 80) || undefined,
    protocol: context.protocol,
    tool: context.tool,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString()
  };
  await env.KV.put(`${HANDOFF_PREFIX}${handoffToken}`, JSON.stringify(record), { expirationTtl: ttl });
  return {
    token: handoffToken,
    record,
    resultUrl: `${frontendOrigin(env)}/agent/handoff/${handoffToken}`
  };
}

export async function readAgentHandoff(env: Env, handoffToken: string): Promise<AgentHandoffRecord | null> {
  if (!/^[a-f0-9]{64}$/i.test(handoffToken)) return null;
  const raw = await env.KV.get(`${HANDOFF_PREFIX}${handoffToken}`);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as AgentHandoffRecord;
    if (record.schemaVersion !== 'ghosttown-agent-handoff-v1') return null;
    if (Date.parse(record.expiresAt) <= Date.now()) return null;
    return record;
  } catch {
    return null;
  }
}

export async function handleAgentHandoffResolve(env: Env, handoffToken: string): Promise<Response> {
  const record = await readAgentHandoff(env, handoffToken);
  if (!record) return json({ error: 'Agent handoff not found or expired' }, 404);
  return json({
    handoff_id: record.handoffId,
    verdict_id: record.verdictId,
    public_verdict: record.publicVerdict,
    attribution: {
      source: 'agent',
      platform: record.agentClient || 'unknown-agent',
      campaign: `${record.protocol}:${record.tool}`,
      publication_id: record.handoffId,
      source_verdict_id: record.verdictId
    },
    expires_at: record.expiresAt
  });
}

export async function handleAgentHandoffClaim(
  request: Request,
  env: Env,
  handoffToken: string
): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);

  const record = await readAgentHandoff(env, handoffToken);
  if (!record) return json({ error: 'Agent handoff not found or expired' }, 404);

  const raw = await env.KV.get(`verdict_${record.verdictId}`);
  if (!raw) return json({ error: 'Assessment not found' }, 404);

  const authoritative = hydrateEvaluationResultDecisionV2(JSON.parse(raw) as EvaluationResult);
  if (authoritative.resultId !== record.verdictId) return json({ error: 'Assessment not found' }, 404);

  await saveUserResult(auth.email, authoritative, env);
  await env.KV.delete(`${HANDOFF_PREFIX}${handoffToken}`);

  return json({ saved: true, result: authoritative });
}
