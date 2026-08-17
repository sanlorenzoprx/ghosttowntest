/**
 * POST /api/verdict
 * Main endpoint: Hybrid AI verdict engine
 *
 * Request: { idea: IdeaIntake, answers: EvaluationAnswers }
 * Response: EvaluationResult (Vertex verdict + deterministic fallback + caching)
 *
 * Flow:
 * 1. Check cache (KV): if ideaHash exists, return cached verdict
 * 2. Try Vertex pipeline through GenerativeAIService + Cloudflare AI Gateway:
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
import { saveUserResult } from './resultHistory';
import { queuePublicVideo } from './publicVideoJobs';
import { generateAI } from './generativeAIService';
import { buildVerdictDecisionV2, hydrateVerdictDecisionV2 } from '../verdict/verdictDecisionV2';

async function runTextModel(env: Env, prompt: string, maxTokens: number): Promise<string> {
  const result = await generateAI(env, {
    task: 'verdict',
    prompt,
    maxOutputTokens: maxTokens,
    temperature: 0.3,
    timeoutMs: 30_000
  });
  return result.text;
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

    if (payload.public_content_acknowledged !== true) {
      return new Response(JSON.stringify({
        error: 'public_content_acknowledgement_required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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

    const ideaHash = hashObject({ idea, answers });
    const cacheKey = `verdict:${ideaHash}`;
    const cached = await env.KV.get(cacheKey);
    if (cached) {
      try {
        const cachedResult = JSON.parse(cached);
        const restoredResult = { ...cachedResult, resultId: cachedResult.resultId ?? ideaHash, cacheHit: true } as EvaluationResult;
        restoredResult.verdictDecisionV2 = hydrateVerdictDecisionV2(restoredResult.verdictDecisionV2, {
          idea: restoredResult.idea,
          scores: restoredResult.deterministicScores
        });
        restoredResult.video = await queuePublicVideo(
          restoredResult,
          typeof payload.locale === 'string' ? payload.locale : 'en-US',
          env
        );
        if (authenticated) {
          await recordTestUse(authenticated.user, env);
          await saveUserResult(authenticated.email, restoredResult, env);
        }
        return new Response(JSON.stringify(restoredResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        console.error('Failed to parse cached verdict:', e);
      }
    }

    let analysis: IdeaAnalysis | undefined;
    let scores: IdeaScores | undefined;
    let verdict: VerdictData | undefined;
    let usedAI = false;

    try {
      analysis = await analyzeIdea(idea, answers, env);
      if (!analysis) throw new Error('Analysis failed');

      scores = await scoreIdea(analysis, env);
      if (!scores) throw new Error('Scoring failed');

      verdict = await generateVerdict(idea, analysis, scores, env);
      if (!verdict) throw new Error('Verdict generation failed');

      const validation = validateVerdict(verdict);
      if (!validation.valid) {
        throw new Error(`Verdict validation failed: ${validation.errors.join(', ')}`);
      }

      usedAI = true;
    } catch (error) {
      console.warn('Vertex AI pipeline failed, falling back to deterministic:', error);
      usedAI = false;
    }

    const deterministicResult = calculateDeterministicScores(answers);

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
    result.verdictDecisionV2 = buildVerdictDecisionV2({ idea, scores: deterministicResult });

    result.video = await queuePublicVideo(
      result,
      typeof payload.locale === 'string' ? payload.locale : 'en-US',
      env
    );

    try {
      await Promise.all([
        env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 * 30 }),
        env.KV.put(`verdict_${result.resultId}`, JSON.stringify(result), { expirationTtl: 86400 * 90 })
      ]);
    } catch (error) {
      console.error('Failed to cache verdict:', error);
    }

    if (authenticated) {
      await recordTestUse(authenticated.user, env);
      await saveUserResult(authenticated.email, result, env);
    }

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
  return Math.max(0, 1 + user.testsPurchased + Math.min(user.shareCredits || 0, 1) - user.testsUsed);
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

async function analyzeIdea(
  idea: IdeaIntake,
  answers: EvaluationAnswers,
  env: Env
): Promise<IdeaAnalysis | undefined> {
  try {
    const text = await runTextModel(env, buildAnalyzePrompt(idea, answers), 800);
    const json = extractJSONFromText(text);
    return json ? json as IdeaAnalysis : undefined;
  } catch (error) {
    console.error('Analysis step failed:', error);
    return undefined;
  }
}

async function scoreIdea(analysis: IdeaAnalysis, env: Env): Promise<IdeaScores | undefined> {
  try {
    const text = await runTextModel(env, buildScorePrompt(analysis), 1000);
    const json = extractJSONFromText(text);
    return json ? json as IdeaScores : undefined;
  } catch (error) {
    console.error('Scoring step failed:', error);
    return undefined;
  }
}

async function generateVerdict(
  idea: IdeaIntake,
  analysis: IdeaAnalysis,
  scores: IdeaScores,
  env: Env
): Promise<VerdictData | undefined> {
  try {
    const text = await runTextModel(env, buildVerdictPrompt(idea, analysis, scores), 600);
    const json = extractJSONFromText(text);
    return json ? json as VerdictData : undefined;
  } catch (error) {
    console.error('Verdict generation step failed:', error);
    return undefined;
  }
}

export default handleVerdict;
