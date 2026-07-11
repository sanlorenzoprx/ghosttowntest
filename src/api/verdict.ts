/**
 * POST /api/verdict
 * Main endpoint: Hybrid AI verdict engine
 * 
 * Request: { idea: IdeaIntake, answers: EvaluationAnswers }
 * Response: EvaluationResult (AI verdict + deterministic fallback + caching)
 * 
 * Flow:
 * 1. Check cache (KV): if ideaHash exists, return cached verdict
 * 2. Try AI pipeline:
 *    - Step 1: Analyze (extract signals)
 *    - Step 2: Score (LIT framework)
 *    - Step 3: Verdict (generate judgment)
 * 3. Validate AI output (must pass schema + quality checks)
 * 4. If AI fails: Use deterministic scoring
 * 5. Cache result in KV (30 days)
 * 6. Return complete result
 */

import { IdeaIntake, EvaluationAnswers, IdeaAnalysis, IdeaScores, VerdictData, EvaluationResult } from '../types/lit';
import { calculateDeterministicScores } from '../lib/scoring';
import { buildAnalyzePrompt, buildScorePrompt, buildVerdictPrompt } from '../lib/prompts';
import { validateVerdict, extractJSONFromText } from '../lib/verdictValidator';
import { hashObject } from '../lib/utils';
import type { VerdictRequest } from '../types/verdict';
import type { Env } from './env';
import { authenticateRequest } from './auth';
import type { UserData } from '../types/auth';
import { handleShortsFactoryVerdict, isShortsFactoryVerdictRequest } from './shortsFactoryVerdict';

const DEFAULT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

interface TextGenerationBinding {
  run(model: string, input: {
    prompt: string;
    max_tokens: number;
    temperature: number;
  }): Promise<unknown>;
}

function runTextModel(env: Env, prompt: string, maxTokens: number): Promise<unknown> {
  const model = env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const ai = env.AI as unknown as TextGenerationBinding;
  return ai.run(model, { prompt, max_tokens: maxTokens, temperature: 0.3 });
}

async function handleVerdict(request: Request, env: Env): Promise<Response> {
  try {
    let payload: Partial<VerdictRequest> & Record<string, unknown>;
    try {
      payload = await request.json<Partial<VerdictRequest> & Record<string, unknown>>();
    } catch {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        message: 'Request body must be valid JSON',
        warnings: ['Invalid JSON request body']
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (isShortsFactoryVerdictRequest(payload)) {
      return await handleShortsFactoryVerdict(payload, request, env);
    }

    const { idea, answers } = payload;

    // Validate input
    if (!isIdeaIntake(idea) || !answers || typeof answers !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing idea or answers' }),
        { status: 400 }
      );
    }

    const authorizationProvided = request.headers.has('Authorization');
    const authenticated = await authenticateRequest(request, env);
    if (authorizationProvided && !authenticated) {
      return new Response(JSON.stringify({ error: 'Invalid or expired login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (authenticated && getAvailableTests(authenticated.user) <= 0) {
      return new Response(JSON.stringify({ error: 'No tests remaining' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. CHECK CACHE
    const ideaHash = hashObject({ idea, answers });
    const cacheKey = `verdict:${ideaHash}`;
    const cached = await env.KV.get(cacheKey);
    if (cached) {
      try {
        const cachedResult = JSON.parse(cached);
        if (authenticated) await recordTestUse(authenticated.user, env);
        return new Response(JSON.stringify({ ...cachedResult, resultId: cachedResult.resultId ?? ideaHash, cacheHit: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        console.error('Failed to parse cached verdict:', e);
      }
    }

    // 2. TRY AI PIPELINE
    let analysis: IdeaAnalysis | undefined;
    let scores: IdeaScores | undefined;
    let verdict: VerdictData | undefined;
    let usedAI = false;

    try {
      // Step 1: Analyze
      analysis = await analyzeIdea(idea, answers, env);
      if (!analysis) throw new Error('Analysis failed');

      // Step 2: Score
      scores = await scoreIdea(analysis, env);
      if (!scores) throw new Error('Scoring failed');

      // Step 3: Verdict
      verdict = await generateVerdict(scores, env);
      if (!verdict) throw new Error('Verdict generation failed');

      // Validate
      const validation = validateVerdict(verdict);
      if (!validation.valid) {
        throw new Error(`Verdict validation failed: ${validation.errors.join(', ')}`);
      }

      usedAI = true;
    } catch (error) {
      console.warn('AI pipeline failed, falling back to deterministic:', error);
      usedAI = false;
    }

    // 3. GET DETERMINISTIC SCORES (fallback or supplement)
    const deterministicResult = calculateDeterministicScores(answers);

    // 4. BUILD RESULT
    const result: EvaluationResult = {
      resultId: ideaHash,
      idea,
      answers,
      analysis,
      scores,
      verdict: usedAI ? verdict : undefined,
      deterministicScores: deterministicResult,
      usedAI,
      generatedAt: new Date().toISOString(),
      cacheHit: false
    };

    // 5. CACHE
    try {
      await env.KV.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 86400 * 30 // 30 days
      });
    } catch (error) {
      console.error('Failed to cache verdict:', error);
    }

    if (authenticated) await recordTestUse(authenticated.user, env);

    // 6. RETURN
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Verdict endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate verdict' }),
      { status: 500 }
    );
  }
}

function getAvailableTests(user: UserData): number {
  return Math.max(0, 1 + user.testsPurchased + Math.min(user.shareCredits || 0, 4) - user.testsUsed);
}

async function recordTestUse(user: UserData, env: Env): Promise<void> {
  user.testsUsed += 1;
  user.lastTestAt = new Date().toISOString();
  await env.KV.put(`user_${user.email}`, JSON.stringify(user));
}

function isIdeaIntake(value: unknown): value is IdeaIntake {
  if (!value || typeof value !== 'object') return false;
  const idea = value as Record<string, unknown>;
  return ['ideaName', 'description', 'targetUser', 'painfulProblem', 'currentAlternative', 'motivation']
    .every(key => typeof idea[key] === 'string');
}

function getAiText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';
  const text = (response as { response?: unknown }).response;
  return typeof text === 'string' ? text : '';
}

async function analyzeIdea(
  idea: IdeaIntake,
  answers: EvaluationAnswers,
  env: Env
): Promise<IdeaAnalysis | undefined> {
  try {
    const prompt = buildAnalyzePrompt(idea, answers);

    const response = await runTextModel(env, prompt, 800);
    const text = getAiText(response);
    const json = extractJSONFromText(text);

    return json ? json as IdeaAnalysis : undefined;
  } catch (error) {
    console.error('Analysis step failed:', error);
    return undefined;
  }
}

async function scoreIdea(analysis: IdeaAnalysis, env: Env): Promise<IdeaScores | undefined> {
  try {
    const prompt = buildScorePrompt(analysis);

    const response = await runTextModel(env, prompt, 1000);
    const text = getAiText(response);
    const json = extractJSONFromText(text);

    return json ? json as IdeaScores : undefined;
  } catch (error) {
    console.error('Scoring step failed:', error);
    return undefined;
  }
}

async function generateVerdict(scores: IdeaScores, env: Env): Promise<VerdictData | undefined> {
  try {
    const prompt = buildVerdictPrompt(scores);

    const response = await runTextModel(env, prompt, 600);
    const text = getAiText(response);
    const json = extractJSONFromText(text);

    return json ? json as VerdictData : undefined;
  } catch (error) {
    console.error('Verdict generation step failed:', error);
    return undefined;
  }
}

export default handleVerdict;
