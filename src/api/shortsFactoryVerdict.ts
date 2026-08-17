import { calculateDeterministicScores } from '../lib/scoring';
import type { EvaluationAnswers } from '../types/lit';
import { DeterministicVerdictProvider } from '../verdict/deterministicVerdictProvider';
import { generateValidatedVerdict } from '../verdict/verdictEngine';
import { VertexVerdictProvider } from '../verdict/vertexVerdictProvider';
import { buildVerdictDecisionV2, projectVerdictDecisionV2ToLegacy } from '../verdict/verdictDecisionV2';
import type { RichVerdict } from '../verdict/verdictSchema';
import type { Env } from './env';

export interface ShortsFactoryIdea {
  name: string;
  description: string;
  target_user: string;
  market: string;
}

interface ShortsFactoryRequest {
  idea?: unknown;
  answers?: unknown;
  source?: unknown;
  locale?: unknown;
}

const SCORE_KEYS = [
  'gt_1', 'gt_2', 'gt_3', 'gt_4',
  'lev_1', 'lev_2', 'lev_3',
  'ins_1', 'ins_2', 'ins_3',
  'tim_1', 'tim_2', 'tim_3',
  'pg_1', 'walls_1', 'walls_2'
] as const;

export function isShortsFactoryVerdictRequest(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.source === 'shorts_factory') return true;
  return isRecord(value.idea) && Object.prototype.hasOwnProperty.call(value.idea, 'name');
}

export async function handleShortsFactoryVerdict(
  payload: ShortsFactoryRequest,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    return await createShortsFactoryVerdict(payload, request, env);
  } catch (error) {
    console.error('Shorts Factory verdict error:', error);
    return jsonResponse({
      error: 'internal_error',
      message: 'Unable to generate LIT verdict',
      warnings: ['Server error while scoring idea']
    }, 500);
  }
}

async function createShortsFactoryVerdict(
  payload: ShortsFactoryRequest,
  request: Request,
  env: Env
): Promise<Response> {
  const configuredKey = env.LIT_API_KEY?.trim();
  if (configuredKey && request.headers.get('Authorization') !== `Bearer ${configuredKey}`) {
    return jsonResponse({
      error: 'unauthorized',
      message: 'Missing or invalid API key',
      warnings: []
    }, 401);
  }

  const ideaResult = normalizeIdea(payload.idea);
  if (!ideaResult.ok) {
    return jsonResponse({
      error: 'invalid_request',
      message: 'idea.name is required',
      warnings: ['Missing idea.name']
    }, 400);
  }

  if (payload.answers !== undefined && !isRecord(payload.answers)) {
    return jsonResponse({
      error: 'invalid_request',
      message: 'answers must be a JSON object',
      warnings: ['Invalid answers']
    }, 400);
  }

  const answers = normalizeAnswers(payload.answers);
  const scores = calculateDeterministicScores(answers);
  const normalizedScores = {
    clarity: toTwentyPointScore(scores.timingScore),
    pain: toTwentyPointScore(scores.ghostTownScore),
    reachability: toTwentyPointScore(scores.insightScore),
    willingness_to_pay: toTwentyPointScore(scores.ghostTownScore),
    advantage: toTwentyPointScore(scores.leverageScore)
  };
  const signals = {
    lit_score: Math.round(scores.litScore * 20),
    risk_level: scores.ghostTownRisk,
    top_reason: scores.verdictExplanation,
    next_step: scores.recommendedNextTest,
    pain_score: normalizedScores.pain,
    reachability_score: normalizedScores.reachability,
    willingness_to_pay_score: normalizedScores.willingness_to_pay,
    advantage_score: normalizedScores.advantage
  };
  const providerInput = {
    ...ideaResult.idea,
    responses: normalizeResponseContext(payload.answers)
  };
  const verdictDecisionV2 = buildVerdictDecisionV2({
    idea: {
      ideaName: ideaResult.idea.name,
      description: ideaResult.idea.description,
      targetUser: ideaResult.idea.target_user,
      painfulProblem: ideaResult.idea.description || `the stated problem behind ${ideaResult.idea.name}`,
      currentAlternative: 'the buyer\'s current workaround'
    },
    scores
  });

  let evaluationMode: 'vertex_ai' | 'deterministic_fallback' = 'vertex_ai';
  let verdict;
  try {
    verdict = await generateValidatedVerdict(
      new VertexVerdictProvider(env),
      providerInput,
      signals
    );
  } catch {
    evaluationMode = 'deterministic_fallback';
    console.warn('Vertex AI verdict unavailable; deterministic fallback used');
    verdict = await generateValidatedVerdict(
      new DeterministicVerdictProvider(),
      providerInput,
      signals
    );
  }

  return jsonResponse(createShortsFactoryVerdictResponse(
    ideaResult.idea,
    verdict,
    verdictDecisionV2,
    evaluationMode,
    normalizedScores
  ));
}

/** The external v1 fields are projections of canonical V2; V2 remains additive. */
export function createShortsFactoryVerdictResponse(
  idea: ShortsFactoryIdea,
  verdict: RichVerdict,
  decision: ReturnType<typeof buildVerdictDecisionV2>,
  evaluationMode: 'vertex_ai' | 'deterministic_fallback',
  deterministicScores: Record<string, number>
) {
  const legacy = projectVerdictDecisionV2ToLegacy(decision);
  return {
    idea,
    ...verdict,
    ...legacy,
    verdict_decision_v2: decision,
    legacy_decision_projection: legacy,
    evaluation_mode: evaluationMode,
    deterministic_scores: deterministicScores
  };
}

function normalizeIdea(value: unknown): { ok: true; idea: ShortsFactoryIdea } | { ok: false } {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) {
    return { ok: false };
  }

  return {
    ok: true,
    idea: {
      name: value.name.trim(),
      description: optionalString(value.description),
      target_user: optionalString(value.target_user),
      market: optionalString(value.market)
    }
  };
}

function normalizeAnswers(value: unknown): EvaluationAnswers {
  if (!isRecord(value)) return {};

  const nativeAnswers: EvaluationAnswers = {};
  for (const key of SCORE_KEYS) {
    const score = normalizeScore(value[key]);
    if (score !== undefined) nativeAnswers[key] = score;
  }
  if (Object.keys(nativeAnswers).length > 0) {
    if (typeof value.dna_1 === 'number' || typeof value.dna_1 === 'string') {
      nativeAnswers.dna_1 = value.dna_1;
    }
    return nativeAnswers;
  }

  const portableScores = Object.entries(value)
    .filter(([key]) => /^q\d+$/.test(key))
    .sort(([left], [right]) => Number(left.slice(1)) - Number(right.slice(1)))
    .map(([, answer]) => normalizeScore(answer))
    .filter((answer): answer is number => answer !== undefined);

  if (portableScores.length === 0) return {};

  const adapted: EvaluationAnswers = {};
  SCORE_KEYS.forEach((key, index) => {
    adapted[key] = portableScores[index % portableScores.length];
  });
  return adapted;
}

function normalizeResponseContext(value: unknown): Record<string, string | number | boolean> {
  if (!isRecord(value)) return {};
  const context: Record<string, string | number | boolean> = {};
  for (const [key, answer] of Object.entries(value).slice(0, 40)) {
    if (!/^(?:q\d+|gt_\d+|lev_\d+|ins_\d+|tim_\d+|pg_\d+|walls_\d+|dna_\d+)$/.test(key)) {
      continue;
    }
    if (typeof answer === 'string') context[key] = answer.trim().slice(0, 200);
    else if (typeof answer === 'number' && Number.isFinite(answer)) context[key] = answer;
    else if (typeof answer === 'boolean') context[key] = answer;
  }
  return context;
}

function normalizeScore(value: unknown): number | undefined {
  const score = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(score) || score < 1 || score > 5) return undefined;
  return score;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toTwentyPointScore(score: number): number {
  return Math.round(score * 4);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
