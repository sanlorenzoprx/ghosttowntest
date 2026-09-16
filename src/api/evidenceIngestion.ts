import type { Env } from './env';
import {
  loadBlueprintProgress,
  saveBlueprintProgress,
  type BlueprintEvidenceLedgerEntry
} from './blueprintStore';
import type {
  ObservedEvidenceClassification,
  ObservedEvidenceEventInput,
  ObservedEvidenceEventType
} from '../types/evidence';

interface StoredEventRow {
  event_id: string;
  order_id: string;
  payload_sha256: string;
  applied_at: string | null;
}

export interface EvidenceIngestionResult {
  eventId: string;
  orderId: string;
  duplicate: boolean;
  applied: boolean;
  classification: ObservedEvidenceClassification;
}

function requireDb(env: Env): D1Database {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  return env.DB;
}
function clean(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function validIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('occurredAt must be a valid timestamp');
  return parsed.toISOString();
}

export function classifyObservedEvidence(eventType: ObservedEvidenceEventType): ObservedEvidenceClassification {
  switch (eventType) {
    case 'qualified_click':
      return { evidenceClass: 'market', strength: 'weak' };
    case 'launch_site_lead':
    case 'customer_reply':
      return { evidenceClass: 'customer', strength: 'early' };
    case 'qualified_conversation':
    case 'proposal_request':
    case 'calendar_booking':
    case 'referral':
      return { evidenceClass: 'customer', strength: 'moderate' };
    case 'deposit':
    case 'payment':
      return { evidenceClass: 'commercial', strength: 'strong' };
  }
}
function normalizeEvent(input: ObservedEvidenceEventInput): ObservedEvidenceEventInput {
  const eventId = clean(input.eventId, 180);
  const orderId = clean(input.orderId, 180);
  const summary = clean(input.summary, 4000);
  if (!eventId || !orderId || !summary) throw new Error('eventId, orderId, and summary are required');
  return {
    eventId,
    orderId,
    eventType: input.eventType,
    occurredAt: validIso(input.occurredAt),
    source: input.source,
    contactOrChannel: clean(input.contactOrChannel, 240) || undefined,
    summary,
    customerLanguage: clean(input.customerLanguage, 4000) || undefined,
    alternativeMentioned: clean(input.alternativeMentioned, 1000) || undefined,
    objection: clean(input.objection, 2000) || undefined,
    commitmentOffered: clean(input.commitmentOffered, 1000) || undefined,
    commitmentReceived: clean(input.commitmentReceived, 1000) || undefined,
    revenueCents: nonNegativeInteger(input.revenueCents),
    sourceReference: clean(input.sourceReference, 1000) || undefined
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function ownerForOrder(db: D1Database, orderId: string): Promise<string> {
  const row = await db.prepare('SELECT owner_id FROM launch_blueprints WHERE order_id = ?')
    .bind(orderId)
    .first<{ owner_id: string }>();
  if (!row?.owner_id) throw new Error('Launch Blueprint not found');
  return row.owner_id.trim().toLowerCase();
}
async function ledgerEntry(
  event: ObservedEvidenceEventInput,
  classification: ObservedEvidenceClassification
): Promise<BlueprintEvidenceLedgerEntry> {
  const digest = await sha256(event.eventId);
  return {
    entryId: `observed_${digest.slice(0, 24)}`,
    createdAt: event.occurredAt,
    contactOrChannel: event.contactOrChannel || event.source,
    date: event.occurredAt.slice(0, 10),
    action: `Automatically observed ${event.eventType.replace(/_/g, ' ')}`,
    response: event.summary,
    customerLanguage: event.customerLanguage || '',
    alternativeMentioned: event.alternativeMentioned || '',
    objection: event.objection || '',
    commitmentOffered: event.commitmentOffered || '',
    commitmentReceived: event.commitmentReceived || '',
    revenueCents: event.revenueCents || 0,
    founderMinutes: 0,
    variableCostCents: 0,
    followUpDate: '',
    evidenceStrength: classification.strength,
    sourceNote: `Automatic ${classification.evidenceClass} evidence from ${event.source}. Event ${event.eventId}.${event.sourceReference ? ` Source: ${event.sourceReference}` : ''}`
  };
}

async function storedEvent(db: D1Database, eventId: string): Promise<StoredEventRow | null> {
  return db.prepare(`SELECT event_id, order_id, payload_sha256, applied_at FROM observed_evidence_events WHERE event_id = ?`)
    .bind(eventId)
    .first<StoredEventRow>();
}

function projectedMetrics(
  metrics: Awaited<ReturnType<typeof loadBlueprintProgress>>['metrics'],
  event: ObservedEvidenceEventInput
) {
  const next = { ...metrics };
  if (event.eventType === 'launch_site_lead' || event.eventType === 'referral') next.leads += 1;
  if (event.eventType === 'customer_reply') next.replies += 1;
  if (event.eventType === 'qualified_conversation' || event.eventType === 'proposal_request' || event.eventType === 'calendar_booking') next.qualifiedConversations += 1;
  if (event.eventType === 'deposit' || event.eventType === 'payment') {
    next.commitments += 1;
    next.revenueCents += event.revenueCents || 0;
  }
  return next;
}
export async function ingestObservedEvidenceEvent(
  env: Env,
  input: ObservedEvidenceEventInput
): Promise<EvidenceIngestionResult> {
  const db = requireDb(env);
  const event = normalizeEvent(input);
  const classification = classifyObservedEvidence(event.eventType);
  const ownerId = await ownerForOrder(db, event.orderId);
  const payloadJson = JSON.stringify(event);
  const payloadSha256 = await sha256(payloadJson);
  const now = new Date().toISOString();

  const write = await db.prepare(`
    INSERT INTO observed_evidence_events (
      event_id, order_id, event_type, source, evidence_class, evidence_strength,
      payload_sha256, payload_json, occurred_at, ingested_at, applied_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(event_id) DO NOTHING
  `).bind(
    event.eventId, event.orderId, event.eventType, event.source,
    classification.evidenceClass, classification.strength,
    payloadSha256, payloadJson, event.occurredAt, now
  ).run();

  const duplicate = (write.meta?.changes ?? 0) !== 1;
  const stored = await storedEvent(db, event.eventId);
  if (!stored) throw new Error('Observed evidence event could not be persisted');
  if (stored.order_id !== event.orderId || stored.payload_sha256 !== payloadSha256) {
    throw new Error('Observed evidence event ID is already bound to different evidence');
  }
  if (!stored.applied_at) {
    const progress = await loadBlueprintProgress(env, event.orderId, ownerId);
    const entry = await ledgerEntry(event, classification);
    const hasEntry = progress.evidenceLedger.some(existing => existing.entryId === entry.entryId);
    if (!hasEntry) {
      await saveBlueprintProgress(env, event.orderId, ownerId, {
        evidenceLedger: [...progress.evidenceLedger, entry],
        metrics: projectedMetrics(progress.metrics, event)
      });
    }
    await db.prepare(`
      UPDATE observed_evidence_events
      SET applied_at = ?
      WHERE event_id = ? AND applied_at IS NULL
    `).bind(new Date().toISOString(), event.eventId).run();
  }

  return {
    eventId: event.eventId,
    orderId: event.orderId,
    duplicate,
    applied: true,
    classification
  };
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function handleStoryStudioEvidence(request: Request, env: Env): Promise<Response> {
  const configuredKey = env.STORY_STUDIO_EVIDENCE_API_KEY?.trim();
  if (!configuredKey) return json({ error: 'Story Studio evidence ingestion is not configured' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${configuredKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: Partial<ObservedEvidenceEventInput> & { platform?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.eventId || !body.orderId || !body.occurredAt || !body.summary) {
    return json({ error: 'eventId, orderId, occurredAt, and summary are required' }, 400);
  }

  try {
    const result = await ingestObservedEvidenceEvent(env, {
      eventId: String(body.eventId),
      orderId: String(body.orderId),
      eventType: 'qualified_click',
      occurredAt: String(body.occurredAt),
      source: 'story_studio',
      contactOrChannel: clean(body.platform, 120) || clean(body.contactOrChannel, 240) || 'story_studio',
      summary: String(body.summary),
      sourceReference: clean(body.sourceReference, 1000) || undefined
    });
    return json(result, result.duplicate ? 200 : 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Evidence ingestion failed';
    return json({ error: message }, /not found/i.test(message) ? 404 : /different evidence/i.test(message) ? 409 : 400);
  }
}
