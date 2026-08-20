import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import type {
  BlueprintGenerationEvidenceReceipt,
  BlueprintGenerationQualityReceipt,
  BlueprintGenerationVertexReceipt,
  GhostTownLaunchBlueprintV21
} from '../types/launchBlueprintV21';
import type {
  CustomerAccessResearchReceipt,
  CustomerAccessResearchResult
} from './customerAccessResearch';
import { buildBlueprintAssetFiles } from './blueprintAssets';
import {
  assertStoredBlueprintOwner,
  blueprintAssetsKey,
  blueprintJsonKey,
  blueprintPdfKey
} from './blueprintStore';
import { validateGhostTownLaunchBlueprint } from './launchBlueprintGenerator';
import { validateGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const INTEGRITY_POINTER_PREFIX = 'paid_test_blueprint_integrity_';
const DETACHED_HASH_RULE = 'detached:exact-byte-integrity-receipt';

export interface PreparedBlueprintGenerationReceiptV21 extends BlueprintGenerationEvidenceReceipt {
  hashes: BlueprintGenerationEvidenceReceipt['hashes'] & {
    canonicalBlueprintSha256: typeof DETACHED_HASH_RULE;
    pdfSha256: typeof DETACHED_HASH_RULE;
    zipSha256: typeof DETACHED_HASH_RULE;
  };
}

function ownedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', ownedArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => [key, stableValue(record[key])])
  );
}

export function normalizedBlueprintInputBytes(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  result: CustomerAccessResearchResult
): Uint8Array {
  return encoder.encode(JSON.stringify(stableValue({
    order: {
      orderId: order.orderId,
      verdictId: order.verdictId,
      paidAt: order.paidAt,
      intake: order.intake
    },
    verdict: {
      resultId: verdict.resultId,
      idea: verdict.idea,
      deterministicScores: verdict.deterministicScores
    },
    research: result.research,
    researchReceipt: {
      provider: result.receipt.provider,
      model: result.receipt.model,
      completedAt: result.receipt.completedAt,
      sourceDefinitionIds: result.receipt.sourceDefinitionIds,
      seedDomains: result.receipt.seedDomains,
      targetTypeCounts: result.receipt.targetTypeCounts,
      responseHash: result.receipt.responseHash
    }
  })));
}

function publicVertexReceipt(
  env: Env,
  blueprint: GhostTownLaunchBlueprintV21,
  required: boolean
): BlueprintGenerationVertexReceipt {
  const pipeline = blueprint.generationReceipt.vertexPipeline;
  return {
    required,
    projectId: env.VERTEX_PROJECT_ID?.trim() || '',
    location: env.VERTEX_LOCATION?.trim() || 'us-central1',
    configuredModel: env.VERTEX_BLUEPRINT_MODEL?.trim() || 'gemini-2.5-flash',
    stages: pipeline?.stages.map(stage => ({ ...stage })) || []
  };
}

function sourceAndCandidateQuality(blueprint: GhostTownLaunchBlueprintV21): {
  sourceVerificationPassed: boolean;
  candidateIdValidationPassed: boolean;
} {
  const sourceIds = new Set(blueprint.sources.map(source => source.sourceId));
  const sourceVerificationPassed = blueprint.sources.length > 0 && blueprint.sources.every(source =>
    Boolean(source.sourceId && source.url && source.accessedAt && Array.isArray(source.supports))
  );
  const candidateIds = blueprint.customerAccessPack.channels.map(channel => channel.channelId);
  const candidateIdValidationPassed = candidateIds.length > 0
    && new Set(candidateIds).size === candidateIds.length
    && blueprint.customerAccessPack.channels.every(channel =>
      Boolean(channel.channelId && channel.publicUrl)
      && channel.sourceIds.length > 0
      && channel.sourceIds.every(sourceId => sourceIds.has(sourceId))
    );
  return { sourceVerificationPassed, candidateIdValidationPassed };
}

function qualityReceipt(
  blueprint: GhostTownLaunchBlueprintV21,
  vertexRequired: boolean
): BlueprintGenerationQualityReceipt {
  const deterministicGatePassed = validateGhostTownLaunchBlueprint(blueprint).passed;
  const v21GatePassed = validateGhostTownLaunchBlueprintV21(blueprint).passed;
  const pipeline = blueprint.generationReceipt.vertexPipeline;
  const redTeamPassed = Boolean(
    pipeline?.status === 'complete'
    && pipeline.redTeam.passed
    && !pipeline.redTeam.findings.some(finding => finding.severity === 'blocking')
  );
  const integrity = sourceAndCandidateQuality(blueprint);
  if (!deterministicGatePassed) throw new Error('Launch Blueprint deterministic v2 gate did not pass before persistence');
  if (!v21GatePassed) throw new Error('Launch Blueprint v2.1 gate did not pass before persistence');
  if (!integrity.sourceVerificationPassed) throw new Error('Launch Blueprint source-verification receipt did not pass');
  if (!integrity.candidateIdValidationPassed) throw new Error('Launch Blueprint candidate-ID receipt did not pass');
  if (vertexRequired && !redTeamPassed) throw new Error('Launch Blueprint required Vertex red-team receipt did not pass');
  return {
    deterministicGatePassed,
    v21GatePassed,
    redTeamPassed,
    sourceVerificationPassed: integrity.sourceVerificationPassed,
    candidateIdValidationPassed: integrity.candidateIdValidationPassed
  };
}

export async function prepareBlueprintGenerationReceiptV21(
  env: Env,
  order: PaidTestOrder,
  verdict: EvaluationResult,
  result: CustomerAccessResearchResult,
  blueprint: GhostTownLaunchBlueprintV21,
  vertexRequired: boolean
): Promise<PreparedBlueprintGenerationReceiptV21> {
  const vertex = publicVertexReceipt(env, blueprint, vertexRequired);
  if (vertexRequired && (!vertex.projectId || !vertex.configuredModel || !vertex.stages.length)) {
    throw new Error('Required Vertex generation metadata is incomplete');
  }
  const normalizedInputSha256 = await sha256Hex(normalizedBlueprintInputBytes(order, verdict, result));
  const artifactKeys = {
    pdf: blueprintPdfKey(order.orderId),
    json: blueprintJsonKey(order.orderId),
    zip: blueprintAssetsKey(order.orderId)
  };
  const prepared: PreparedBlueprintGenerationReceiptV21 = {
    vertex,
    hashes: {
      normalizedInputSha256,
      canonicalBlueprintSha256: DETACHED_HASH_RULE,
      pdfSha256: DETACHED_HASH_RULE,
      zipSha256: DETACHED_HASH_RULE
    },
    quality: qualityReceipt(blueprint, vertexRequired),
    artifactKeys
  };
  blueprint.generationReceipt.vertex = prepared.vertex;
  blueprint.generationReceipt.hashes = prepared.hashes;
  blueprint.generationReceipt.quality = prepared.quality;
  blueprint.generationReceipt.artifactKeys = prepared.artifactKeys;
  return prepared;
}

function secretValues(env: Env): string[] {
  const bag = env as unknown as Record<string, unknown>;
  return [
    'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'JWT_SECRET',
    'SESSION_SECRET',
    'DATAFORSEO_PASSWORD',
    'PODCAST_INDEX_API_SECRET',
    'GEMINI_API_KEY',
    'YOUTUBE_API_KEY'
  ].map(key => bag[key]).filter((value): value is string => typeof value === 'string' && value.length >= 12);
}

export function assertNoSecretValues(value: string, env: Env): void {
  for (const secret of secretValues(env)) {
    if (value.includes(secret)) throw new Error('Launch Blueprint artifact contains a configured secret value');
  }
  if (/-----BEGIN PRIVATE KEY-----|"accessToken"\s*:|"access_token"\s*:|"systemInstruction"\s*:|"rawModelResponse"\s*:/i.test(value)) {
    throw new Error('Launch Blueprint artifact contains prohibited private generation material');
  }
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function join(items: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(items.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}

function createStoredZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, file.data);

    const entry = new Uint8Array(46 + name.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(6, 20, true);
    entryView.setUint16(8, 0x800, true);
    entryView.setUint32(16, crc, true);
    entryView.setUint32(20, file.data.length, true);
    entryView.setUint32(24, file.data.length, true);
    entryView.setUint16(28, name.length, true);
    entryView.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length + file.data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return join([...chunks, ...central, end]);
}

export function buildBlueprintAssetZipFromCanonicalBytesV21(
  blueprint: GhostTownLaunchBlueprintV21,
  pdfBytes: Uint8Array,
  canonicalJsonBytes: Uint8Array
): Uint8Array {
  const files = buildBlueprintAssetFiles(blueprint, pdfBytes).map(file =>
    file.name.endsWith('/blueprint.json') ? { ...file, data: canonicalJsonBytes } : file
  );
  return createStoredZip(files);
}

function integrityPointerKey(orderId: string): string {
  return `${INTEGRITY_POINTER_PREFIX}${orderId}`;
}

export async function saveBlueprintRecordV21(
  env: Env,
  blueprint: GhostTownLaunchBlueprintV21,
  researchReceipt: CustomerAccessResearchReceipt,
  pdfBytes: Uint8Array,
  document?: BlueprintGenerationEvidenceReceipt['document']
): Promise<BlueprintGenerationEvidenceReceipt> {
  if (!env.DB) throw new Error('Launch Blueprint D1 binding is not configured');
  if (!env.BLUEPRINTS) throw new Error('Private Launch Blueprint R2 binding is not configured');
  if (!blueprint.generationReceipt.vertex || !blueprint.generationReceipt.hashes
      || !blueprint.generationReceipt.quality || !blueprint.generationReceipt.artifactKeys) {
    throw new Error('Launch Blueprint v2.1 generation receipt was not prepared before persistence');
  }

  const ownerId = blueprint.ownerId.trim().toLowerCase();
  // D1 is the canonical owner boundary. Check it before R2 writes so an
  // attempted owner transfer cannot overwrite private artifacts.
  await assertStoredBlueprintOwner(env.DB, blueprint.orderId, ownerId, true);

  const canonicalJson = JSON.stringify(blueprint, null, 2);
  const canonicalJsonBytes = encoder.encode(canonicalJson);
  assertNoSecretValues(canonicalJson, env);

  const zipBytes = buildBlueprintAssetZipFromCanonicalBytesV21(blueprint, pdfBytes, canonicalJsonBytes);
  assertNoSecretValues(decoder.decode(zipBytes), env);

  const exactReceipt: BlueprintGenerationEvidenceReceipt = {
    vertex: blueprint.generationReceipt.vertex,
    hashes: {
      normalizedInputSha256: blueprint.generationReceipt.hashes.normalizedInputSha256,
      canonicalBlueprintSha256: await sha256Hex(canonicalJsonBytes),
      pdfSha256: await sha256Hex(pdfBytes),
      zipSha256: await sha256Hex(zipBytes)
    },
    quality: blueprint.generationReceipt.quality,
    artifactKeys: blueprint.generationReceipt.artifactKeys,
    document
  };
  assertNoSecretValues(JSON.stringify(exactReceipt), env);

  const receiptJson = JSON.stringify({
    ...researchReceipt,
    generationReceiptEvidence: exactReceipt
  });
  const now = new Date().toISOString();
  const { pdf, json, zip } = exactReceipt.artifactKeys;

  // Gate 33 acceptance-only failpoint. When the roadmap sets the
  // roadmap_gate33_force_r2_failure KV flag in the acceptance environment, the
  // R2 persistence step fails closed so the roadmap can prove bounded retry and
  // recovery behavior without rewriting accepted artifact bytes. The flag is
  // absent in production and outside the acceptance environment this check is
  // inert, so the product contract is unchanged.
  if (env.DEPLOYMENT_ENV === 'acceptance' && (await env.KV?.get('roadmap_gate33_force_r2_failure'))) {
    throw new Error('Acceptance failpoint: forced Launch Blueprint R2 persistence failure (roadmap_gate33_force_r2_failure)');
  }

  await Promise.all([
    env.BLUEPRINTS.put(pdf, pdfBytes, {
      httpMetadata: { contentType: 'application/pdf', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}.pdf"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion, sha256: exactReceipt.hashes.pdfSha256 }
    }),
    env.BLUEPRINTS.put(json, canonicalJsonBytes, {
      httpMetadata: { contentType: 'application/json', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}.json"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion, sha256: exactReceipt.hashes.canonicalBlueprintSha256 }
    }),
    env.BLUEPRINTS.put(zip, zipBytes, {
      httpMetadata: { contentType: 'application/zip', contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${blueprint.orderId}-assets.zip"` },
      customMetadata: { orderId: blueprint.orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion, sha256: exactReceipt.hashes.zipSha256 }
    })
  ]);

  const write = await env.DB.prepare(`
    INSERT INTO launch_blueprints (
      order_id, owner_id, source_verdict_id, schema_version, status,
      blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      source_verdict_id = excluded.source_verdict_id,
      schema_version = excluded.schema_version,
      status = excluded.status,
      blueprint_json = excluded.blueprint_json,
      research_receipt_json = excluded.research_receipt_json,
      pdf_r2_key = excluded.pdf_r2_key,
      updated_at = excluded.updated_at
    WHERE launch_blueprints.owner_id = excluded.owner_id
  `).bind(
    blueprint.orderId,
    ownerId,
    blueprint.sourceVerdictId,
    blueprint.schemaVersion,
    blueprint.status,
    canonicalJson,
    receiptJson,
    pdf,
    blueprint.createdAt,
    now
  ).run();
  if ((write.meta?.changes ?? 0) !== 1) {
    throw new Error('Launch Blueprint owner is immutable');
  }

  await env.KV.put(`paid_test_blueprint_pointer_${blueprint.orderId}`, JSON.stringify({
    orderId: blueprint.orderId,
    ownerId,
    schemaVersion: blueprint.schemaVersion,
    pdfR2Key: pdf,
    jsonR2Key: json,
    assetsR2Key: zip,
    integrityReceiptKey: integrityPointerKey(blueprint.orderId),
    hashes: exactReceipt.hashes,
    updatedAt: now
  }));
  await env.KV.put(integrityPointerKey(blueprint.orderId), JSON.stringify(exactReceipt));
  return exactReceipt;
}

function parseIntegrityReceipt(value: unknown): BlueprintGenerationEvidenceReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BlueprintGenerationEvidenceReceipt>;
  if (!candidate.vertex || !candidate.hashes || !candidate.quality || !candidate.artifactKeys) return null;
  return candidate as BlueprintGenerationEvidenceReceipt;
}

export async function loadBlueprintIntegrityReceiptV21(
  env: Env,
  orderId: string
): Promise<BlueprintGenerationEvidenceReceipt | null> {
  if (env.DB) {
    const row = await env.DB.prepare(`
      SELECT research_receipt_json
      FROM launch_blueprints
      WHERE order_id = ?
    `).bind(orderId).first<{ research_receipt_json: string }>();
    if (row?.research_receipt_json) {
      try {
        const stored = JSON.parse(row.research_receipt_json) as Record<string, unknown>;
        const receipt = parseIntegrityReceipt(stored.generationReceiptEvidence);
        if (receipt) return receipt;
      } catch {
        // Fall through to the compatibility pointer.
      }
    }
  }
  const raw = await env.KV.get(integrityPointerKey(orderId));
  if (!raw) return null;
  try {
    return parseIntegrityReceipt(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function applyBlueprintIntegrityReceiptV21(
  blueprint: GhostTownLaunchBlueprintV21,
  receipt: BlueprintGenerationEvidenceReceipt
): GhostTownLaunchBlueprintV21 {
  const next = JSON.parse(JSON.stringify(blueprint)) as GhostTownLaunchBlueprintV21;
  next.generationReceipt.vertex = receipt.vertex;
  next.generationReceipt.hashes = receipt.hashes;
  next.generationReceipt.quality = receipt.quality;
  next.generationReceipt.artifactKeys = receipt.artifactKeys;
  return next;
}

export async function loadCanonicalBlueprintJsonV21(env: Env, orderId: string): Promise<string | null> {
  if (!env.BLUEPRINTS) throw new Error('Private Launch Blueprint R2 binding is not configured');
  const object = await env.BLUEPRINTS.get(blueprintJsonKey(orderId));
  return object ? object.text() : null;
}
