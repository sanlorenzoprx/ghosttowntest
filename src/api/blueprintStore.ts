import type { Env } from './env';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { CustomerAccessResearchReceipt } from './customerAccessResearch';
import { buildBlueprintAssetZip } from './blueprintAssets';

export interface BlueprintProgress {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  metrics: {
    outreachSent: number;
    replies: number;
    interviews: number;
    qualifiedConversations: number;
    commitments: number;
    revenueCents: number;
  };
  finalDecision?: 'continue' | 'revise' | 'pivot' | 'stop';
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
    metrics: {
      outreachSent: 0,
      replies: 0,
      interviews: 0,
      qualifiedConversations: 0,
      commitments: 0,
      revenueCents: 0
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
  return row ? JSON.parse(row.progress_json) as BlueprintProgress : emptyBlueprintProgress();
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function normalizeBlueprintProgress(value: Partial<BlueprintProgress>): BlueprintProgress {
  const completedDays = Array.isArray(value.completedDays)
    ? [...new Set(value.completedDays.map(nonNegativeInteger).filter(day => day >= 1 && day <= 30))].sort((a, b) => a - b)
    : [];
  const evidenceNotes = value.evidenceNotes && typeof value.evidenceNotes === 'object'
    ? Object.fromEntries(Object.entries(value.evidenceNotes).slice(0, 100).map(([key, note]) => [key.slice(0, 80), String(note).slice(0, 4000)]))
    : {};
  const metrics = value.metrics || emptyBlueprintProgress().metrics;
  const finalDecision = value.finalDecision === 'continue' || value.finalDecision === 'revise' || value.finalDecision === 'pivot' || value.finalDecision === 'stop'
    ? value.finalDecision
    : undefined;
  return {
    completedDays,
    evidenceNotes,
    metrics: {
      outreachSent: nonNegativeInteger(metrics.outreachSent),
      replies: nonNegativeInteger(metrics.replies),
      interviews: nonNegativeInteger(metrics.interviews),
      qualifiedConversations: nonNegativeInteger(metrics.qualifiedConversations),
      commitments: nonNegativeInteger(metrics.commitments),
      revenueCents: nonNegativeInteger(metrics.revenueCents)
    },
    finalDecision,
    updatedAt: new Date().toISOString()
  };
}

export async function saveBlueprintProgress(env: Env, orderId: string, ownerId: string, value: Partial<BlueprintProgress>): Promise<BlueprintProgress> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  const progress = normalizeBlueprintProgress(value);
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
