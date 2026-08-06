import type { Env } from './env';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { CustomerAccessResearchReceipt } from './customerAccessResearch';
import { buildBlueprintAssetZip } from './blueprintAssets';

export type BlueprintEvidenceStrength = 'strong' | 'moderate' | 'early' | 'weak';
export type BlueprintCheckpointDay = 7 | 14 | 21 | 30;
export type BlueprintFinalDecision =
  | 'continue'
  | 'continue_with_revision'
  | 'revise'
  | 'pivot'
  | 'pivot_customer'
  | 'pivot_problem'
  | 'pivot_offer'
  | 'pause_missing_evidence'
  | 'stop';

export interface BlueprintEvidenceLedgerEntry {
  entryId: string;
  contactOrChannel: string;
  date: string;
  action: string;
  response: string;
  customerLanguage: string;
  alternativeMentioned: string;
  objection: string;
  commitmentOffered: string;
  commitmentReceived: string;
  revenueCents: number;
  founderMinutes: number;
  variableCostCents: number;
  followUpDate: string;
  evidenceStrength: BlueprintEvidenceStrength;
  sourceNote: string;
}

export interface BlueprintCheckpointReview {
  dayNumber: BlueprintCheckpointDay;
  completedAt: string;
  answers: Record<string, string>;
  evidenceSummary: string;
  strongestEvidence: BlueprintEvidenceStrength | 'none';
  primaryConstraint:
    | 'customer'
    | 'urgency'
    | 'access'
    | 'trust'
    | 'offer'
    | 'fulfillment'
    | 'price'
    | 'message'
    | 'missing_evidence'
    | 'none';
  nextAction: string;
  blueprintVersionId?: string;
}

export interface BlueprintProgress {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  evidenceLedger: BlueprintEvidenceLedgerEntry[];
  checkpointReviews: BlueprintCheckpointReview[];
  metrics: {
    outreachSent: number;
    replies: number;
    interviews: number;
    qualifiedConversations: number;
    commitments: number;
    revenueCents: number;
    founderMinutes: number;
    variableCostCents: number;
    leads: number;
  };
  finalDecision?: BlueprintFinalDecision;
  updatedAt: string;
}

export interface StoredBlueprintRecord {
  blueprint: GhostTownLaunchBlueprint;
  researchReceipt: CustomerAccessResearchReceipt;
  pdfR2Key: string;
}

function requireStorage(env: Env): { db: D1Database; bucket: R2Bucket } {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  if (!env.BLUEPRINTS) throw new Error('Private Launch Blueprint R2 binding is not configured');
  return { db: env.DB, bucket: env.BLUEPRINTS };
}

export function blueprintPdfKey(orderId: string): string {
  return `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`;
}

export function blueprintJsonKey(orderId: string): string {
  return `orders/${orderId}/ghosttown-launch-blueprint-v2.json`;
}

export function blueprintAssetsKey(orderId: string): string {
  return `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`;
}

export async function saveBlueprintRecord(
  env: Env,
  blueprint: GhostTownLaunchBlueprint,
  researchReceipt: CustomerAccessResearchReceipt,
  pdfBytes: Uint8Array
): Promise<void> {
  const { db, bucket } = requireStorage(env);
  const pdfKey = blueprintPdfKey(blueprint.orderId);
  const jsonKey = blueprintJsonKey(blueprint.orderId);
  const assetsKey = blueprintAssetsKey(blueprint.orderId);
  const assets = buildBlueprintAssetZip(blueprint, pdfBytes);
  const json = JSON.stringify(blueprint);
  const receiptJson = JSON.stringify(researchReceipt);
  const now = new Date().toISOString();

  await Promise.all([
    bucket.put(pdfKey, pdfBytes, {
      httpMetadata: { contentType: 'application/pdf', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}.pdf"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion }
    }),
    bucket.put(jsonKey, json, {
      httpMetadata: { contentType: 'application/json', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}.json"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion }
    }),
    bucket.put(assetsKey, assets, {
      httpMetadata: { contentType: 'application/zip', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}-assets.zip"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion }
    })
  ]);

  await db.prepare(`
    INSERT INTO launch_blueprints (
      order_id, owner_id, source_verdict_id, schema_version, status,
      blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      owner_id = excluded.owner_id,
      source_verdict_id = excluded.source_verdict_id,
      schema_version = excluded.schema_version,
      status = excluded.status,
      blueprint_json = excluded.blueprint_json,
      research_receipt_json = excluded.research_receipt_json,
      pdf_r2_key = excluded.pdf_r2_key,
      updated_at = excluded.updated_at
  `).bind(
    blueprint.orderId,
    blueprint.ownerId.trim().toLowerCase(),
    blueprint.sourceVerdictId,
    blueprint.schemaVersion,
    blueprint.status,
    json,
    receiptJson,
    pdfKey,
    blueprint.createdAt,
    now
  ).run();

  await env.KV.put(`paid_test_blueprint_pointer_${blueprint.orderId}`, JSON.stringify({
    orderId: blueprint.orderId,
    ownerId: blueprint.ownerId.trim().toLowerCase(),
    schemaVersion: blueprint.schemaVersion,
    pdfR2Key: pdfKey,
    jsonR2Key: jsonKey,
    assetsR2Key: assetsKey,
    updatedAt: now
  }));
}

export async function loadBlueprintRecord(env: Env, orderId: string): Promise<StoredBlueprintRecord | null> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const row = await env.DB.prepare(`
    SELECT blueprint_json, research_receipt_json, pdf_r2_key
    FROM launch_blueprints
    WHERE order_id = ?
  `).bind(orderId).first<{ blueprint_json: string; research_receipt_json: string; pdf_r2_key: string }>();
  if (!row) return null;
  return {
    blueprint: JSON.parse(row.blueprint_json) as GhostTownLaunchBlueprint,
    researchReceipt: JSON.parse(row.research_receipt_json) as CustomerAccessResearchReceipt,
    pdfR2Key: row.pdf_r2_key
  };
}

export async function loadBlueprintPdf(env: Env, orderId: string): Promise<R2ObjectBody | null> {
  if (!env.BLUEPRINTS) throw new Error('Private Launch Blueprint R2 binding is not configured');
  return env.BLUEPRINTS.get(blueprintPdfKey(orderId));
}

export async function loadBlueprintAssets(env: Env, orderId: string): Promise<R2ObjectBody | null> {
  if (!env.BLUEPRINTS) throw new Error('Private Launch Blueprint R2 binding is not configured');
  return env.BLUEPRINTS.get(blueprintAssetsKey(orderId));
}

export function emptyBlueprintProgress(): BlueprintProgress {
  return {
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [],
    checkpointReviews: [],
    metrics: {
      outreachSent: 0,
      replies: 0,
      interviews: 0,
      qualifiedConversations: 0,
      commitments: 0,
      revenueCents: 0,
      founderMinutes: 0,
      variableCostCents: 0,
      leads: 0
    },
    updatedAt: new Date().toISOString()
  };
}

export async function loadBlueprintProgress(env: Env, orderId: string, ownerId: string): Promise<BlueprintProgress> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const row = await env.DB.prepare(`
    SELECT progress_json
    FROM launch_blueprint_progress
    WHERE order_id = ? AND owner_id = ?
  `).bind(orderId, ownerId.trim().toLowerCase()).first<{ progress_json: string }>();
  return row ? normalizeBlueprintProgress(JSON.parse(row.progress_json) as Partial<BlueprintProgress>) : emptyBlueprintProgress();
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function limitedText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function isoDate(value: unknown, includeTime = false): string {
  const raw = limitedText(value, 40);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return includeTime ? parsed.toISOString() : parsed.toISOString().slice(0, 10);
}

function evidenceStrength(value: unknown): BlueprintEvidenceStrength {
  return value === 'strong' || value === 'moderate' || value === 'early' || value === 'weak'
    ? value
    : 'weak';
}

function normalizeLedger(value: unknown): BlueprintEvidenceLedgerEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const rows: BlueprintEvidenceLedgerEntry[] = [];
  for (const item of value.slice(0, 500)) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Partial<BlueprintEvidenceLedgerEntry>;
    const entryId = limitedText(source.entryId, 80) || `evidence_${rows.length + 1}`;
    if (seen.has(entryId)) continue;
    seen.add(entryId);
    rows.push({
      entryId,
      contactOrChannel: limitedText(source.contactOrChannel, 240),
      date: isoDate(source.date),
      action: limitedText(source.action, 2000),
      response: limitedText(source.response, 4000),
      customerLanguage: limitedText(source.customerLanguage, 4000),
      alternativeMentioned: limitedText(source.alternativeMentioned, 1000),
      objection: limitedText(source.objection, 2000),
      commitmentOffered: limitedText(source.commitmentOffered, 1000),
      commitmentReceived: limitedText(source.commitmentReceived, 1000),
      revenueCents: nonNegativeInteger(source.revenueCents),
      founderMinutes: nonNegativeInteger(source.founderMinutes),
      variableCostCents: nonNegativeInteger(source.variableCostCents),
      followUpDate: isoDate(source.followUpDate),
      evidenceStrength: evidenceStrength(source.evidenceStrength),
      sourceNote: limitedText(source.sourceNote, 4000)
    });
  }
  return rows;
}

function checkpointDay(value: unknown): BlueprintCheckpointDay | null {
  const day = nonNegativeInteger(value);
  return day === 7 || day === 14 || day === 21 || day === 30 ? day : null;
}

function normalizeCheckpoints(value: unknown): BlueprintCheckpointReview[] {
  if (!Array.isArray(value)) return [];
  const reviews = new Map<BlueprintCheckpointDay, BlueprintCheckpointReview>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Partial<BlueprintCheckpointReview>;
    const dayNumber = checkpointDay(source.dayNumber);
    if (!dayNumber) continue;
    const answers = source.answers && typeof source.answers === 'object'
      ? Object.fromEntries(Object.entries(source.answers).slice(0, 30).map(([key, answer]) => [key.slice(0, 160), limitedText(answer, 4000)]))
      : {};
    const constraint = source.primaryConstraint;
    const primaryConstraint = constraint === 'customer' || constraint === 'urgency' || constraint === 'access'
      || constraint === 'trust' || constraint === 'offer' || constraint === 'fulfillment'
      || constraint === 'price' || constraint === 'message' || constraint === 'missing_evidence'
      ? constraint
      : 'none';
    reviews.set(dayNumber, {
      dayNumber,
      completedAt: isoDate(source.completedAt, true),
      answers,
      evidenceSummary: limitedText(source.evidenceSummary, 8000),
      strongestEvidence: source.strongestEvidence === 'none' ? 'none' : evidenceStrength(source.strongestEvidence),
      primaryConstraint,
      nextAction: limitedText(source.nextAction, 4000),
      blueprintVersionId: limitedText(source.blueprintVersionId, 120) || undefined
    });
  }
  return [...reviews.values()].sort((left, right) => left.dayNumber - right.dayNumber);
}

function finalDecision(value: unknown): BlueprintFinalDecision | undefined {
  return value === 'continue' || value === 'continue_with_revision' || value === 'revise'
    || value === 'pivot' || value === 'pivot_customer' || value === 'pivot_problem'
    || value === 'pivot_offer' || value === 'pause_missing_evidence' || value === 'stop'
    ? value
    : undefined;
}

export function normalizeBlueprintProgress(value: Partial<BlueprintProgress>): BlueprintProgress {
  const completedDays = Array.isArray(value.completedDays)
    ? [...new Set(value.completedDays.map(nonNegativeInteger).filter(day => day >= 1 && day <= 30))].sort((a, b) => a - b)
    : [];
  const evidenceNotes = value.evidenceNotes && typeof value.evidenceNotes === 'object'
    ? Object.fromEntries(Object.entries(value.evidenceNotes).slice(0, 100).map(([key, note]) => [key.slice(0, 80), limitedText(note, 4000)]))
    : {};
  const metrics = (value.metrics || {}) as Partial<BlueprintProgress['metrics']>;
  return {
    completedDays,
    evidenceNotes,
    evidenceLedger: normalizeLedger(value.evidenceLedger),
    checkpointReviews: normalizeCheckpoints(value.checkpointReviews),
    metrics: {
      outreachSent: nonNegativeInteger(metrics.outreachSent),
      replies: nonNegativeInteger(metrics.replies),
      interviews: nonNegativeInteger(metrics.interviews),
      qualifiedConversations: nonNegativeInteger(metrics.qualifiedConversations),
      commitments: nonNegativeInteger(metrics.commitments),
      revenueCents: nonNegativeInteger(metrics.revenueCents),
      founderMinutes: nonNegativeInteger(metrics.founderMinutes),
      variableCostCents: nonNegativeInteger(metrics.variableCostCents),
      leads: nonNegativeInteger(metrics.leads)
    },
    finalDecision: finalDecision(value.finalDecision),
    updatedAt: new Date().toISOString()
  };
}

export async function saveBlueprintProgress(env: Env, orderId: string, ownerId: string, value: Partial<BlueprintProgress>): Promise<BlueprintProgress> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const existing = await loadBlueprintProgress(env, orderId, ownerId);
  const progress = normalizeBlueprintProgress({
    ...existing,
    ...value,
    completedDays: value.completedDays ?? existing.completedDays,
    evidenceNotes: value.evidenceNotes ? { ...existing.evidenceNotes, ...value.evidenceNotes } : existing.evidenceNotes,
    evidenceLedger: value.evidenceLedger ?? existing.evidenceLedger,
    checkpointReviews: value.checkpointReviews ?? existing.checkpointReviews,
    metrics: { ...existing.metrics, ...(value.metrics || {}) }
  });
  await env.DB.prepare(`
    INSERT INTO launch_blueprint_progress (order_id, owner_id, progress_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      owner_id = excluded.owner_id,
      progress_json = excluded.progress_json,
      updated_at = excluded.updated_at
  `).bind(orderId, ownerId.trim().toLowerCase(), JSON.stringify(progress), progress.updatedAt).run();
  return progress;
}
