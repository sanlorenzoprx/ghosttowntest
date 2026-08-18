import type { Env } from './env';
import { ownedLaunchBlueprintOrder } from './blueprintApi';
import { loadBlueprintProgress, loadBlueprintRecord } from './blueprintStore';
import { generativeAIConfigured } from './generativeAIService';
import { runExecutionCopilot, runExecutionCritic } from './executionAIService';
import {
  buildExecutionRagContext,
  routeExecutionCapability,
  type ExecutionCopilotMode,
  type ExecutionProgressLike
} from '../lib/blueprintExecutionIntelligence';
import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';

interface CopilotRequestBody {
  question?: string;
  dayNumber?: number;
  mode?: ExecutionCopilotMode;
  history?: Array<{ role?: string; content?: string }>;
}

const COPILOT_REQUESTS_PER_HOUR = 60;

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...headers }
});

function isV21(value: unknown): value is GhostTownLaunchBlueprintV21 {
  return Boolean(value && typeof value === 'object' && (value as { blueprintVersion?: unknown }).blueprintVersion === '2.1');
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function sanitizedHistory(value: CopilotRequestBody['history']): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap(item => {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
    const content = cleanText(item?.content, 2400);
    return role && content ? [{ role, content }] : [];
  });
}

function groundingSources(metadata: unknown): Array<{ title: string; url: string }> {
  if (!metadata || typeof metadata !== 'object') return [];
  const chunks = (metadata as { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }).groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  return chunks.flatMap(chunk => {
    const url = cleanText(chunk?.web?.uri, 1200);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ title: cleanText(chunk?.web?.title, 300) || 'Grounded web source', url }];
  }).slice(0, 8);
}

function secondsUntilNextUtcHour(now = new Date()): number {
  const next = new Date(now);
  next.setUTCMinutes(60, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

async function consumeCopilotRequestBudget(env: Env, orderId: string, now = new Date()): Promise<{ allowed: boolean; used: number; retryAfter: number }> {
  const hour = now.toISOString().slice(0, 13);
  // orderId is already owner-scoped by ownedLaunchBlueprintOrder. Avoid putting
  // email/PII into the rate key. KV is intentionally a soft cost guard rather
  // than an exact billing counter; concurrent requests can race by one or two.
  const key = `execution_copilot_rate:${orderId}:${hour}`;
  const used = Math.max(0, Number(await env.KV.get(key)) || 0);
  const retryAfter = secondsUntilNextUtcHour(now);
  if (used >= COPILOT_REQUESTS_PER_HOUR) return { allowed: false, used, retryAfter };
  await env.KV.put(key, String(used + 1), { expirationTtl: 7200 });
  return { allowed: true, used: used + 1, retryAfter };
}

export async function handleBlueprintExecutionCopilot(request: Request, env: Env, orderId: string): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, orderId);
  if (!record || !isV21(record.blueprint)) return json({ error: 'Executable Blueprint v2.1 is required' }, 409);

  let body: CopilotRequestBody;
  try {
    body = await request.json<CopilotRequestBody>();
  } catch {
    return json({ error: 'Invalid Copilot request JSON' }, 400);
  }
  const question = cleanText(body.question, 5000);
  if (!question) return json({ error: 'Ask a question about the current experiment or business strategy' }, 400);
  const mode: ExecutionCopilotMode = body.mode === 'strategy_room' ? 'strategy_room' : 'current_experiment';
  const progress = await loadBlueprintProgress(env, orderId, owned.email);
  const nextIncomplete = record.blueprint.dailyCalendar.find(day => !(progress.completedDays || []).includes(day.dayNumber))?.dayNumber || 30;
  const dayNumber = Number.isInteger(body.dayNumber) && Number(body.dayNumber) >= 1 && Number(body.dayNumber) <= 30
    ? Number(body.dayNumber)
    : nextIncomplete;
  const context = buildExecutionRagContext(record.blueprint, progress as unknown as ExecutionProgressLike, dayNumber, question);
  const capability = routeExecutionCapability(question, mode, context);

  if (!generativeAIConfigured(env)) {
    return json({
      error: 'Execution Copilot is not configured in this environment',
      context: {
        dayNumber: context.experiment.dayNumber,
        lane: context.blueprint.lane,
        branch: context.branch
      }
    }, 503);
  }

  const budget = await consumeCopilotRequestBudget(env, orderId);
  if (!budget.allowed) {
    return json({
      error: 'Execution Copilot hourly request limit reached. Your Blueprint, evidence, and progress are unchanged.',
      limit: COPILOT_REQUESTS_PER_HOUR,
      retryAfterSeconds: budget.retryAfter
    }, 429, { 'Retry-After': String(budget.retryAfter) });
  }

  try {
    const primary = await runExecutionCopilot(env, capability, mode, context, question, sanitizedHistory(body.history));
    const highImpact = capability === 'strategy_reasoner' && mode === 'current_experiment'
      && (context.branch.route !== 'continue' || /\b(pivot|change|price|offer|customer|stop|pause)\b/i.test(question));
    const critic = highImpact ? await runExecutionCritic(env, context, question, primary.output) : null;
    const internalRefs = {
      blueprint: `${context.blueprint.blueprintId}@${context.blueprint.blueprintVersion}`,
      day: `day-${context.experiment.dayNumber}`,
      evidenceEntryIds: context.progress.relevantEvidence.map(entry => entry.entryId).filter(Boolean),
      sourceIds: context.research.map(source => source.sourceId).filter(Boolean)
    };
    return json({
      mode,
      capability,
      answer: primary.output.answer,
      evidenceAssessment: primary.output.evidenceAssessment,
      contradictionDetected: primary.output.contradictionDetected,
      recommendedAction: primary.output.recommendedAction,
      evidenceToRecord: primary.output.evidenceToRecord,
      assumptions: primary.output.assumptions,
      critic: critic?.output || null,
      guardrails: {
        route: context.branch.route,
        checkpointDay: context.branch.checkpointDay,
        primaryConstraint: context.branch.primaryConstraint,
        mayChange: mode === 'strategy_room' ? [] : context.branch.mayChange,
        mustKeep: mode === 'strategy_room' ? [] : context.branch.mustKeep,
        branchReason: context.branch.reason,
        nextAction: context.branch.nextAction,
        strategyRoomDoesNotMutateLiveExperiment: mode === 'strategy_room'
      },
      lane: context.blueprint.laneProfile,
      today: {
        dayNumber: context.experiment.dayNumber,
        title: context.experiment.title,
        objective: context.experiment.objective,
        successThreshold: context.experiment.successThreshold,
        failureThreshold: context.experiment.failureThreshold,
        assets: context.experiment.assets.map(asset => ({ assetId: asset.assetId, title: asset.title }))
      },
      refs: internalRefs,
      groundedWebSources: groundingSources(primary.groundingMetadata),
      usage: {
        hourlyLimit: COPILOT_REQUESTS_PER_HOUR,
        requestNumberThisHour: budget.used
      },
      receipts: {
        primary: primary.receipt,
        critic: critic?.receipt || null
      }
    });
  } catch (error) {
    console.error('Execution Copilot failed', { orderId, dayNumber, capability, error });
    return json({ error: error instanceof Error ? error.message : 'Execution Copilot failed' }, 502);
  }
}
