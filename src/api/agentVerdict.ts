import verdictHandler from './verdict';
import type { Env } from './env';
import { consumeHourlyRateLimit } from './runtimeControls';
import { litQuestions } from '../lib/litQuestions';
import { localizeAssessmentQuestion, localizedIdeaPrompt, normalizeAgentLocale, publicContentPrompt } from '../lib/agentQuestionLocalization';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import type { EvaluationAnswers, EvaluationResult, IdeaIntake } from '../types/lit';
import type {
  AgentCompleteVerdictResponse,
  AgentInputQuestion,
  AgentNeedsInputResponse,
  AgentProtocol,
  AgentPublicVerdictProjection,
  AgentVerdictInput
} from '../types/agentSurface';
import { createAgentHandoff } from './agentHandoff';

const MAX_REQUEST_BYTES = 24_000;
const DEFAULT_HOURLY_LIMIT = 20;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders }
  });
}

function text(value: unknown, max = 600): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function protocol(value: unknown, fallback: AgentProtocol): AgentProtocol {
  return value === 'api' || value === 'mcp' || value === 'search' || value === 'webmcp' || value === 'a2a'
    ? value
    : fallback;
}

function normalizeIdea(input: AgentVerdictInput): Partial<IdeaIntake> {
  const source = input.idea && typeof input.idea === 'object'
    ? input.idea as Partial<IdeaIntake> & Record<string, unknown>
    : {} as Partial<IdeaIntake> & Record<string, unknown>;
  const ideaText = typeof input.idea === 'string' ? text(input.idea, 1000) : undefined;
  const geography = text(input.geography, 120);
  const description = text(source.description, 1000) || ideaText;
  return {
    ideaName: text(source.ideaName ?? source.idea_name, 160) || ideaText?.slice(0, 160),
    description: geography && description ? `${description} Geography: ${geography}`.slice(0, 1000) : description,
    targetUser: text(source.targetUser ?? source.target_user, 320) || text(input.customer, 320),
    painfulProblem: text(source.painfulProblem ?? source.painful_problem, 500) || text(input.problem, 500),
    currentAlternative: text(source.currentAlternative ?? source.current_alternative, 500) || text(input.alternative, 500),
    motivation: text(source.motivation, 500) || text(input.motivation, 500),
    publicContentAcknowledged: input.public_content_acknowledged === true
  };
}

const IDEA_QUESTIONS: Record<keyof Pick<IdeaIntake, 'ideaName' | 'description' | 'targetUser' | 'painfulProblem' | 'currentAlternative' | 'motivation'>, string> = {
  ideaName: 'What short name should we use for this idea?',
  description: 'Describe the idea in one or two clear sentences.',
  targetUser: 'Who is the first specific customer or user you expect to buy or adopt this?',
  painfulProblem: 'What painful problem does this customer have?',
  currentAlternative: 'How does this customer solve the problem today?',
  motivation: 'Why are you considering this idea now?'
};

function validAnswer(questionId: string, answers: EvaluationAnswers): boolean {
  const question = litQuestions.find(item => item.id === questionId);
  if (!question) return false;
  const raw = answers[questionId];
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(numeric) && question.options.some(option => option.value === numeric);
}

function missingInputs(input: AgentVerdictInput, idea: Partial<IdeaIntake>): AgentNeedsInputResponse | null {
  const locale = normalizeAgentLocale(input.locale);
  const missing: string[] = [];
  const questions: AgentInputQuestion[] = [];
  for (const field of Object.keys(IDEA_QUESTIONS) as Array<keyof typeof IDEA_QUESTIONS>) {
    if (!text(idea[field])) {
      missing.push(field);
      questions.push({ field, prompt: localizedIdeaPrompt(field, IDEA_QUESTIONS[field], locale) });
    }
  }
  if (input.public_content_acknowledged !== true) {
    missing.push('public_content_acknowledged');
    questions.push({
      field: 'public_content_acknowledged',
      prompt: publicContentPrompt(locale)
    });
  }
  const answers = input.answers && typeof input.answers === 'object' ? input.answers : {};
  for (const question of litQuestions) {
    if (!validAnswer(question.id, answers)) {
      const localized = localizeAssessmentQuestion(question, locale);
      missing.push(question.id);
      questions.push({
        field: question.id,
        prompt: localized.question,
        helper: localized.helper,
        options: localized.options.map(option => ({ label: option.label, value: option.value }))
      });
    }
  }
  return missing.length ? {
    status: 'needs_input',
    missing,
    questions,
    continue_with: '/api/v1/free-verdict'
  } : null;
}

function publicProjection(result: EvaluationResult): AgentPublicVerdictProjection {
  const decision = result.verdictDecisionV2;
  const deterministic = result.deterministicScores;
  return {
    verdict_id: result.resultId,
    verdict: decision?.decision || deterministic.finalVerdict,
    summary: decision?.predictionTarget || deterministic.verdictExplanation,
    key_assumptions: decision
      ? [decision.largestUncertainty.assumption]
      : [deterministic.doNotBuildUntil],
    primary_risks: decision?.reasonsAgainst?.slice(0, 3).filter(Boolean) || [deterministic.businessDnaTrap],
    fastest_test: decision?.cheapestFalsification.test || deterministic.recommendedNextTest,
    next_actions: decision
      ? [decision.firstAction.action, ...decision.whatWouldChangeTheVerdict].filter(Boolean).slice(0, 4)
      : [deterministic.recommendedNextTest]
  };
}

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function enforceRateLimit(request: Request, env: Env): Promise<Response | null> {
  if (!env.DB) return null;
  const configured = Number((env as Env & { ASC_FREE_VERDICT_HOURLY_LIMIT?: string }).ASC_FREE_VERDICT_HOURLY_LIMIT);
  const limit = Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : DEFAULT_HOURLY_LIMIT;
  const identity = request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || request.headers.get('X-Agent-Client')
    || 'unknown';
  const bucket = await shortHash(identity);
  const state = await consumeHourlyRateLimit(env, `asc:free-verdict:${bucket}`, limit);
  if (state.allowed) return null;
  return json({
    status: 'rate_limited',
    error: 'GhostTown free-verdict agent capacity has been reached for this hour.',
    retry_after_seconds: state.retryAfter
  }, 429, { 'Retry-After': String(state.retryAfter) });
}

function offer(env: Env) {
  const frontend = (env.FRONTEND_URL?.trim() || 'https://ghosttowntest.com').replace(/\/$/, '');
  return {
    offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    name: GHOSTTOWN_30_DAY_PLAN_V1.name,
    price_usd: GHOSTTOWN_30_DAY_PLAN_V1.amountCents / 100,
    currency: GHOSTTOWN_30_DAY_PLAN_V1.currency,
    url: frontend,
    requires_user_action: true as const
  };
}

export function ghostTownProductMetadata(env: Env) {
  return {
    product: 'GhostTown',
    purpose: 'Business idea validation and next-test guidance before heavy build investment.',
    free_capability: 'GhostTown verdict',
    paid_offer: offer(env),
    openapi: `${(env.FRONTEND_URL?.trim() || 'https://ghosttowntest.com').replace(/\/$/, '')}/openapi.json`,
    mcp: 'https://api.ghosttowntest.com/mcp',
    limitations: [
      'GhostTown does not guarantee startup success.',
      'The verdict is bounded to the next evidence-seeking commitment test.',
      'Purchases always require explicit human action.'
    ]
  };
}

export async function runAgentVerdictPayload(
  input: AgentVerdictInput,
  request: Request,
  env: Env,
  options: { fallbackProtocol?: AgentProtocol; tool?: string } = {}
): Promise<Response> {
  const rateLimited = await enforceRateLimit(request, env);
  if (rateLimited) return rateLimited;

  const normalizedIdea = normalizeIdea(input);
  const needs = missingInputs(input, normalizedIdea);
  if (needs) return json(needs);

  const canonicalIdea = normalizedIdea as IdeaIntake;
  const canonicalRequest = new Request(new URL('/api/verdict', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea: canonicalIdea,
      answers: input.answers,
      public_content_acknowledged: true,
      locale: text(input.locale, 20) || 'en-US'
    })
  });
  const canonicalResponse = await verdictHandler(canonicalRequest, env);
  if (!canonicalResponse.ok) {
    const body = await canonicalResponse.text();
    return new Response(body, { status: canonicalResponse.status, headers: canonicalResponse.headers });
  }

  const canonicalBody = await canonicalResponse.json<EvaluationResult & { claimToken?: string }>();
  const projection = publicProjection(canonicalBody);
  const resolvedProtocol = protocol(input.agent?.protocol, options.fallbackProtocol || 'api');
  const agentClient = text(input.agent?.client, 80) || text(request.headers.get('X-Agent-Client'), 80);
  const tool = options.tool || 'ghosttown.validate_idea';
  const handoff = await createAgentHandoff(env, projection, { agentClient, protocol: resolvedProtocol, tool });
  const complete: AgentCompleteVerdictResponse = {
    status: 'complete',
    ...projection,
    handoff_id: handoff.record.handoffId,
    result_url: handoff.resultUrl,
    offer: offer(env)
  };
  return json(complete);
}

export async function handleAgentFreeVerdict(request: Request, env: Env): Promise<Response> {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: 'Request too large' }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json({ error: 'Request too large' }, 413);
  let input: AgentVerdictInput;
  try {
    input = JSON.parse(raw) as AgentVerdictInput;
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }
  if (!input || typeof input !== 'object') return json({ error: 'Request body must be a JSON object' }, 400);
  return runAgentVerdictPayload(input, request, env, { fallbackProtocol: 'api' });
}
