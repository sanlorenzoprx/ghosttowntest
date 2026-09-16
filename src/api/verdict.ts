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
import { issueResultClaimToken } from './resultClaim';
import { generateAI } from './generativeAIService';
import { buildVerdictDecisionV2, hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import { buildVerdictDecisionV3 } from '../verdict/verdictDecisionV3';
import { runEvidenceScanV1 } from './evidenceScan';
import type { GhostTownEvidenceScanV1 } from '../types/evidence';

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

async function loadOrRunEvidenceScan(
  request: Request,
  env: Env,
  idea: IdeaIntake,
  localeValue: unknown
): Promise<GhostTownEvidenceScanV1> {
  const locale: 'en' | 'es' = typeof localeValue === 'string' && localeValue.toLowerCase().startsWith('es') ? 'es' : 'en';
  const scanCacheKey = `evidence-scan:v1-seven-layer:${hashObject({ idea, locale })}`;
  const cached = await env.KV.get(scanCacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as GhostTownEvidenceScanV1;
      if (parsed?.schemaVersion === 'ghosttown-evidence-scan-v1' && parsed.modelVersion === 'seven-layer-v1' && parsed.fingerprint) return parsed;
    } catch (error) {
      console.warn('Evidence Scan cache parse failed; rescanning', error);
    }
  }

  const scan = await runEvidenceScanV1(request, env, idea, locale);
  try {
    await env.KV.put(scanCacheKey, JSON.stringify(scan), {
      expirationTtl: scan.status === 'unavailable' ? 300 : 3600
    });
  } catch (error) {
    console.warn('Evidence Scan cache write failed; continuing with live scan', error);
  }
  return scan;
}

function verdictResponse(result: EvaluationResult, claimToken?: string): Response {
  const body = claimToken ? { ...result, claimToken } : result;
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' }
  });
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

    // Evidence intentionally precedes the verdict and is part of verdict cache
    // identity. A materially different scan therefore cannot silently reuse an
    // older evidence-backed verdict.
    const evidenceScan = await loadOrRunEvidenceScan(request, env, idea, payload.locale);
    const ideaHash = hashObject({ idea, answers, evidenceFingerprint: evidenceScan.fingerprint });
    const cacheKey = `verdict:v3:${ideaHash}`;
    const cached = await env.KV.get(cacheKey);
    if (cached) {
      try {
        const cachedResult = JSON.parse(cached);
        // The idea hash is only a cache key. Every delivered verdict instance
        // receives an unguessable identifier so resultId is not a trust token.
        const restoredResult = {
          ...cachedResult,
          resultId: crypto.randomUUID(),
          cacheHit: true
        } as EvaluationResult;
        hydrateEvaluationResultDecisionV2(restoredResult);
        restoredResult.evidenceScan = restoredResult.evidenceScan ?? evidenceScan;
        restoredResult.verdictDecisionV3 = buildVerdictDecisionV3({
          idea: restoredResult.idea,
          scores: restoredResult.deterministicScores,
          evidenceScan: restoredResult.evidenceScan
        });
        restoredResult.video = await queuePublicVideo(
          restoredResult,
          typeof payload.locale === 'string' ? payload.locale : 'en-US',
          env
        );
        await env.KV.put(
          `verdict_${restoredResult.resultId}`,
          JSON.stringify(restoredResult),
          { expirationTtl: 86400 * 90 }
        );
        if (authenticated) {
          await recordTestUse(authenticated.user, env);
          await saveUserResult(authenticated.email, restoredResult, env);
          return verdictResponse(restoredResult);
        }
        const claimToken = await issueResultClaimToken(env, restoredResult.resultId);
        return verdictResponse(restoredResult, claimToken);
      } catch (e) {
        console.error('Failed to parse cached verdict:', e);
      }
    }

    let analysis: IdeaAnalysis | undefined;
    let scores: IdeaScores | undefined;
    let verdict: VerdictData | undefined;
    let usedAI = false;

    try {
      analysis = await analyzeIdea(idea, answers, evidenceScan, env);
      if (!analysis) throw new Error('Analysis failed');

      scores = await scoreIdea(analysis, evidenceScan, env);
      if (!scores) throw new Error('Scoring failed');

      verdict = await generateVerdict(idea, analysis, scores, evidenceScan, env);
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
      resultId: crypto.randomUUID(),
      idea,
      answers,
      analysis,
      scores,
      verdict: usedAI ? verdict : undefined,
      deterministicScores: deterministicResult,
      evidenceScan,
      usedAI,
      generatedAt: new Date().toISOString(),
      cacheHit: false
    };
    result.verdictDecisionV2 = buildVerdictDecisionV2({ idea, scores: deterministicResult });
    result.verdictDecisionV3 = buildVerdictDecisionV3({
      idea,
      scores: deterministicResult,
      evidenceScan
    });

    result.video = await queuePublicVideo(
      result,
      typeof payload.locale === 'string' ? payload.locale : 'en-US',
      env
    );

    let authoritativeStored = false;
    try {
      await Promise.all([
        env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 * 30 }),
        env.KV.put(`verdict_${result.resultId}`, JSON.stringify(result), { expirationTtl: 86400 * 90 })
      ]);
      authoritativeStored = true;
    } catch (error) {
      console.error('Failed to cache verdict:', error);
    }

    if (authenticated) {
      await recordTestUse(authenticated.user, env);
      await saveUserResult(authenticated.email, result, env);
      return verdictResponse(result);
    }

    // Anonymous ownership claims require a second secret capability that is not
    // copied into the authoritative verdict or public-video payload. A public
    // resultId by itself therefore cannot be used to claim this verdict later.
    const claimToken = authoritativeStored
      ? await issueResultClaimToken(env, result.resultId)
      : undefined;
    return verdictResponse(result, claimToken);
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
  evidenceScan: GhostTownEvidenceScanV1,
  env: Env
): Promise<IdeaAnalysis | undefined> {
  try {
    const text = await runTextModel(env, buildAnalyzePrompt(idea, answers, evidenceScan), 800);
    const json = extractJSONFromText(text);
    return json ? json as IdeaAnalysis : undefined;
  } catch (error) {
    console.error('Analysis step failed:', error);
    return undefined;
  }
}

async function scoreIdea(
  analysis: IdeaAnalysis,
  evidenceScan: GhostTownEvidenceScanV1,
  env: Env
): Promise<IdeaScores | undefined> {
  try {
    const text = await runTextModel(env, buildScorePrompt(analysis, evidenceScan), 1000);
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
  evidenceScan: GhostTownEvidenceScanV1,
  env: Env
): Promise<VerdictData | undefined> {
  try {
    const text = await runTextModel(env, buildVerdictPrompt(idea, analysis, scores, evidenceScan), 600);
    const json = extractJSONFromText(text);
    return json ? json as VerdictData : undefined;
  } catch (error) {
    console.error('Verdict generation step failed:', error);
    return undefined;
  }
}

export default handleVerdict;