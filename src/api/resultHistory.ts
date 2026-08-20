import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';

export interface ResultSummary {
  resultId: string;
  ideaName: string;
  verdictHeadline: string;
  litScore: number;
  generatedAt: string;
}

const historyKey = (email: string) => `user_results_${email}`;
const userResultKey = (email: string, resultId: string) => `user_result_${email}_${resultId}`;
const serverVerdictKey = (resultId: string) => `verdict_${resultId}`;
const serverIssuedResultId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveUserResult(email: string, result: EvaluationResult, env: Env): Promise<void> {
  const canonical = hydrateEvaluationResultDecisionV2(result);
  const normalizedEmail = email.trim().toLowerCase();
  const summary: ResultSummary = {
    resultId: result.resultId,
    ideaName: result.idea.ideaName,
    verdictHeadline: canonical.verdictDecisionV2!.decision.replace(/_/g, ' '),
    litScore: result.deterministicScores.litScore,
    generatedAt: result.generatedAt
  };
  const raw = await env.KV.get(historyKey(normalizedEmail));
  const existing = raw ? JSON.parse(raw) as ResultSummary[] : [];
  const history = [summary, ...existing.filter(item => item.resultId !== result.resultId)].slice(0, 50);
  await Promise.all([
    env.KV.put(userResultKey(normalizedEmail, result.resultId), JSON.stringify(result)),
    env.KV.put(historyKey(normalizedEmail), JSON.stringify(history))
  ]);
}

export async function handleResultHistory(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(historyKey(auth.email));
  return json({ results: raw ? JSON.parse(raw) as ResultSummary[] : [] });
}

export async function handleSaveCurrentResult(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const body = await request.json<{ result?: EvaluationResult }>();
  const resultId = body.result?.resultId?.trim();
  if (!resultId) {
    return json({ error: 'A completed assessment is required' }, 400);
  }

  // Idempotent for verdicts this account already owns. This also allows older
  // owner-scoped results to remain purchasable after the 90-day claim-source
  // record has expired.
  const existingOwned = await env.KV.get(userResultKey(auth.email, resultId));
  if (existingOwned) return json({ saved: true });

  // Pre-Slice-B short deterministic IDs may remain readable for accounts that
  // already own them, but they can no longer cross the ownership-claim
  // boundary. New claims require the UUID issued by the verdict endpoint.
  if (!serverIssuedResultId.test(resultId)) {
    return json({ error: 'Assessment not found' }, 404);
  }

  // Ownership is established from the server-issued verdict instance, never
  // from client-supplied verdict content. The body contributes only resultId.
  const authoritativeRaw = await env.KV.get(serverVerdictKey(resultId));
  if (!authoritativeRaw) return json({ error: 'Assessment not found' }, 404);

  const authoritative = hydrateEvaluationResultDecisionV2(
    JSON.parse(authoritativeRaw) as EvaluationResult
  );
  if (authoritative.resultId !== resultId) {
    return json({ error: 'Assessment not found' }, 404);
  }

  await saveUserResult(auth.email, authoritative, env);
  return json({ saved: true });
}

export async function handleSavedResult(request: Request, env: Env, resultId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(userResultKey(auth.email, resultId));
  if (!raw) return json({ error: 'Assessment not found' }, 404);
  return json({ result: hydrateEvaluationResultDecisionV2(JSON.parse(raw) as EvaluationResult) });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
