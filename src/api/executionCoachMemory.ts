import type { Env } from './env';
import { CURRENT_EVIDENCE_MAX_DAYS } from './evidenceRecency';
import type { ExecutionRagContext } from '../lib/blueprintExecutionIntelligence';
import type {
  ExecutionCoachMemoryContext,
  ExecutionCoachPhase,
  ExecutionLearningCandidate,
  ExecutionReusableKnowledgeItem
} from '../types/executionLearning';

interface CachedCoachRow {
  response_id: string;
  response_json: string;
  cache_expires_at: string | null;
  created_at: string;
  hit_count: number;
}

export interface ExecutionCoachCacheIdentity {
  contextSha256: string;
  questionSha256: string;
}

export interface CachedExecutionCoachResponse {
  responseId: string;
  payload: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  hitCount: number;
}

function normalizedAccountId(value: string): string {
  return value.trim().toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function cacheExpiry(capability: string, now = Date.now()): string | undefined {
  if (capability !== 'grounded_research') return undefined;
  return new Date(now + CURRENT_EVIDENCE_MAX_DAYS * 86_400_000).toISOString();
}

function marketValidUntil(candidate: ExecutionLearningCandidate, now = Date.now()): string | undefined {
  if (candidate.knowledgeClass !== 'market_research') return undefined;
  return new Date(now + CURRENT_EVIDENCE_MAX_DAYS * 86_400_000).toISOString();
}

function privacySafeLesson(candidate: ExecutionLearningCandidate): boolean {
  const value = candidate.lesson.trim();
  if (!value || value.length > 1200) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return false;
  if (/https?:\/\//i.test(value)) return false;
  if (/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(value)) return false;
  return true;
}

function validCandidate(value: unknown): value is ExecutionLearningCandidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExecutionLearningCandidate>;
  return (
    (candidate.knowledgeClass === 'human_behavior'
      || candidate.knowledgeClass === 'strategy'
      || candidate.knowledgeClass === 'tactic'
      || candidate.knowledgeClass === 'market_research')
    && (candidate.scope === 'universal'
      || candidate.scope === 'lane'
      || candidate.scope === 'market'
      || candidate.scope === 'customer_specific')
    && (candidate.confidence === 'low' || candidate.confidence === 'medium' || candidate.confidence === 'high')
    && Boolean(candidate.lesson?.trim())
    && Boolean(candidate.evidenceBasis?.trim())
  );
}

export async function executionCoachCacheIdentity(
  context: ExecutionRagContext,
  phase: ExecutionCoachPhase,
  question: string
): Promise<ExecutionCoachCacheIdentity> {
  const [contextSha256, questionSha256] = await Promise.all([
    sha256Hex(JSON.stringify({ phase, context })),
    sha256Hex(question.trim())
  ]);
  return { contextSha256, questionSha256 };
}

export async function loadExecutionCoachMemory(
  env: Env,
  accountId: string,
  orderId: string,
  lane: string,
  beforeDay: number
): Promise<ExecutionCoachMemoryContext> {
  if (!env.DB) return { priorDailyAssessments: [], reusableKnowledge: [] };
  const owner = normalizedAccountId(accountId);
  const now = new Date().toISOString();

  const [historyResult, knowledgeResult] = await Promise.all([
    env.DB.prepare(`
      SELECT day_number, response_json, created_at
      FROM execution_coach_responses
      WHERE account_id = ? AND order_id = ? AND phase = 'review' AND day_number < ?
      ORDER BY day_number DESC, created_at DESC
      LIMIT 7
    `).bind(owner, orderId, beforeDay).all<{ day_number: number; response_json: string; created_at: string }>(),
    env.DB.prepare(`
      SELECT knowledge_id, knowledge_class, scope, lesson_text, support_count,
             contradiction_count, valid_until, last_supported_at
      FROM execution_product_knowledge
      WHERE status = 'active'
        AND (valid_until IS NULL OR valid_until >= ?)
        AND (scope = 'universal' OR (scope = 'lane' AND lane = ?))
      ORDER BY support_count DESC, last_supported_at DESC
      LIMIT 12
    `).bind(now, lane).all<{
      knowledge_id: string;
      knowledge_class: ExecutionReusableKnowledgeItem['knowledgeClass'];
      scope: ExecutionReusableKnowledgeItem['scope'];
      lesson_text: string;
      support_count: number;
      contradiction_count: number;
      valid_until: string | null;
      last_supported_at: string;
    }>()
  ]);

  const priorDailyAssessments = historyResult.results.flatMap(row => {
    const payload = parseJsonObject(row.response_json);
    if (!payload) return [];
    return [{
      dayNumber: row.day_number,
      answer: cleanText(payload.answer, 1600),
      evidenceAssessment: cleanText(payload.evidenceAssessment, 1200),
      recommendedAction: cleanText(payload.recommendedAction, 1200),
      recordedAt: row.created_at
    }];
  }).reverse();

  const reusableKnowledge: ExecutionReusableKnowledgeItem[] = knowledgeResult.results.map(row => ({
    knowledgeId: row.knowledge_id,
    knowledgeClass: row.knowledge_class,
    scope: row.scope,
    lesson: row.lesson_text,
    supportCount: row.support_count,
    contradictionCount: row.contradiction_count,
    validUntil: row.valid_until || undefined,
    lastSupportedAt: row.last_supported_at
  }));

  return { priorDailyAssessments, reusableKnowledge };
}

export async function loadCachedExecutionCoachResponse(
  env: Env,
  input: {
    accountId: string;
    blueprintId: string;
    blueprintVersion: string;
    dayNumber: number;
    phase: ExecutionCoachPhase;
    identity: ExecutionCoachCacheIdentity;
  }
): Promise<CachedExecutionCoachResponse | null> {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare(`
    SELECT response_id, response_json, cache_expires_at, created_at, hit_count
    FROM execution_coach_responses
    WHERE account_id = ?
      AND blueprint_id = ?
      AND blueprint_version = ?
      AND day_number = ?
      AND phase = ?
      AND context_sha256 = ?
      AND question_sha256 = ?
      AND (cache_expires_at IS NULL OR cache_expires_at >= ?)
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(
    normalizedAccountId(input.accountId),
    input.blueprintId,
    input.blueprintVersion,
    input.dayNumber,
    input.phase,
    input.identity.contextSha256,
    input.identity.questionSha256,
    now
  ).first<CachedCoachRow>();

  if (!row) return null;
  const payload = parseJsonObject(row.response_json);
  if (!payload) return null;
  await env.DB.prepare(`
    UPDATE execution_coach_responses
    SET hit_count = hit_count + 1, last_used_at = ?
    WHERE response_id = ?
  `).bind(now, row.response_id).run();

  return {
    responseId: row.response_id,
    payload,
    expiresAt: row.cache_expires_at || undefined,
    createdAt: row.created_at,
    hitCount: row.hit_count + 1
  };
}

export async function saveExecutionCoachResponse(
  env: Env,
  input: {
    accountId: string;
    orderId: string;
    blueprintId: string;
    blueprintVersion: string;
    lane: string;
    dayNumber: number;
    phase: ExecutionCoachPhase;
    capability: string;
    identity: ExecutionCoachCacheIdentity;
    payload: Record<string, unknown>;
    receipt?: unknown;
    degradation?: unknown;
    learningCandidates?: unknown;
    allowGlobalLearning?: boolean;
  }
): Promise<{ responseId: string; expiresAt?: string; learningCandidateCount: number }> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const now = new Date().toISOString();
  const owner = normalizedAccountId(input.accountId);
  const expiresAt = cacheExpiry(input.capability);
  const responseId = `coach_${crypto.randomUUID()}`;

  await env.DB.prepare(`
    INSERT INTO execution_coach_responses (
      response_id, account_id, order_id, blueprint_id, blueprint_version,
      day_number, phase, capability, context_sha256, question_sha256,
      response_json, receipt_json, degradation_json, cache_expires_at,
      created_at, last_used_at, hit_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(account_id, blueprint_id, blueprint_version, day_number, phase, context_sha256, question_sha256)
    DO UPDATE SET
      last_used_at = excluded.last_used_at
  `).bind(
    responseId,
    owner,
    input.orderId,
    input.blueprintId,
    input.blueprintVersion,
    input.dayNumber,
    input.phase,
    input.capability,
    input.identity.contextSha256,
    input.identity.questionSha256,
    JSON.stringify(input.payload),
    input.receipt ? JSON.stringify(input.receipt) : null,
    input.degradation ? JSON.stringify(input.degradation) : null,
    expiresAt || null,
    now,
    now
  ).run();

  const stored = await env.DB.prepare(`
    SELECT response_id
    FROM execution_coach_responses
    WHERE account_id = ? AND blueprint_id = ? AND blueprint_version = ?
      AND day_number = ? AND phase = ? AND context_sha256 = ? AND question_sha256 = ?
    LIMIT 1
  `).bind(
    owner,
    input.blueprintId,
    input.blueprintVersion,
    input.dayNumber,
    input.phase,
    input.identity.contextSha256,
    input.identity.questionSha256
  ).first<{ response_id: string }>();
  const canonicalResponseId = stored?.response_id || responseId;

  const candidates = Array.isArray(input.learningCandidates)
    ? input.learningCandidates.filter(validCandidate).slice(0, 4)
    : [];

  for (const candidate of candidates) {
    const lesson = candidate.lesson.trim().slice(0, 1200);
    const evidenceBasis = candidate.evidenceBasis.trim().slice(0, 1200);
    const privacySafe = privacySafeLesson(candidate);
    const globalEligible = input.allowGlobalLearning === true
      && privacySafe
      && candidate.scope !== 'customer_specific'
      && input.phase === 'review';
    const candidateId = `learn_${await sha256Hex(JSON.stringify({
      sourceResponseId: canonicalResponseId,
      knowledgeClass: candidate.knowledgeClass,
      scope: candidate.scope,
      lesson
    }))}`;
    await env.DB.prepare(`
      INSERT OR IGNORE INTO execution_learning_candidates (
        candidate_id, source_response_id, account_id, blueprint_id,
        blueprint_version, day_number, knowledge_class, scope, lane,
        lesson_text, confidence, evidence_basis, privacy_safe, global_eligible,
        valid_until, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?)
    `).bind(
      candidateId,
      canonicalResponseId,
      owner,
      input.blueprintId,
      input.blueprintVersion,
      input.dayNumber,
      candidate.knowledgeClass,
      candidate.scope,
      candidate.scope === 'lane' ? input.lane : null,
      lesson,
      candidate.confidence,
      evidenceBasis,
      privacySafe ? 1 : 0,
      globalEligible ? 1 : 0,
      marketValidUntil(candidate) || null,
      now
    ).run();
  }

  return {
    responseId: canonicalResponseId,
    expiresAt,
    learningCandidateCount: candidates.length
  };
}

export async function listExecutionCoachReviews(
  env: Env,
  accountId: string,
  orderId: string
): Promise<Array<Record<string, unknown>>> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const result = await env.DB.prepare(`
    SELECT response_id, day_number, response_json, degradation_json,
           cache_expires_at, created_at, hit_count
    FROM execution_coach_responses
    WHERE account_id = ? AND order_id = ? AND phase = 'review'
    ORDER BY day_number ASC, created_at ASC
  `).bind(normalizedAccountId(accountId), orderId).all<{
    response_id: string;
    day_number: number;
    response_json: string;
    degradation_json: string | null;
    cache_expires_at: string | null;
    created_at: string;
    hit_count: number;
  }>();

  return result.results.flatMap(row => {
    const payload = parseJsonObject(row.response_json);
    if (!payload) return [];
    return [{
      responseId: row.response_id,
      dayNumber: row.day_number,
      phase: 'review',
      ...payload,
      degradation: row.degradation_json ? parseJsonObject(row.degradation_json) : null,
      cacheExpiresAt: row.cache_expires_at,
      createdAt: row.created_at,
      hitCount: row.hit_count
    }];
  });
}
