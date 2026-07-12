import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';

export interface ResultSummary {
  resultId: string;
  ideaName: string;
  verdictHeadline: string;
  litScore: number;
  generatedAt: string;
}

const historyKey = (email: string) => `user_results_${email}`;
const userResultKey = (email: string, resultId: string) => `user_result_${email}_${resultId}`;

export async function saveUserResult(email: string, result: EvaluationResult, env: Env): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const summary: ResultSummary = {
    resultId: result.resultId,
    ideaName: result.idea.ideaName,
    verdictHeadline: result.verdict?.verdict_headline ?? result.deterministicScores.verdictHeadline,
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
  const result = body.result;
  if (!result?.resultId || !result.idea?.ideaName || !result.deterministicScores || !result.generatedAt) {
    return json({ error: 'A completed assessment is required' }, 400);
  }
  await saveUserResult(auth.email, result, env);
  return json({ saved: true });
}

export async function handleSavedResult(request: Request, env: Env, resultId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(userResultKey(auth.email, resultId));
  if (!raw) return json({ error: 'Assessment not found' }, 404);
  return json({ result: JSON.parse(raw) as EvaluationResult });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
