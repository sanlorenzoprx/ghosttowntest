import type { Env } from './env';
import type {
  BlueprintGenerationEvidenceReceipt,
  GhostTownLaunchBlueprintV21
} from '../types/launchBlueprintV21';
import type { BlueprintDeliveryStateV21 } from './blueprintReleaseQualityGateV21';

function validHash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function objectBytes(object: R2ObjectBody | null): Promise<Uint8Array | null> {
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
}

/**
 * Verify persisted Blueprint delivery artifacts using one read per first-pass R2
 * object. R2ObjectBody bodies are single-consumption streams; hashing a JSON
 * object and then calling text() on the same body can produce a false-negative
 * JSON persistence result even when the stored object is correct.
 */
export async function verifyBlueprintDeliveryStateExactV21(
  env: Env,
  blueprint: GhostTownLaunchBlueprintV21,
  receipt: BlueprintGenerationEvidenceReceipt
): Promise<BlueprintDeliveryStateV21> {
  const hashesPresent = validHash(receipt.hashes.canonicalBlueprintSha256)
    && validHash(receipt.hashes.pdfSha256)
    && validHash(receipt.hashes.zipSha256)
    && validHash(receipt.hashes.normalizedInputSha256);

  if (!env.DB || !env.BLUEPRINTS) {
    return {
      d1Persisted: false,
      pdfPersisted: false,
      jsonPersisted: false,
      zipPersisted: false,
      artifactHashesPresent: hashesPresent,
      ownershipBoundaryEstablished: false,
      repeatDownloadAvailable: false
    };
  }

  const row = await env.DB.prepare(
    'SELECT owner_id, blueprint_json, pdf_r2_key FROM launch_blueprints WHERE order_id = ?'
  ).bind(blueprint.orderId).first<{ owner_id: string; blueprint_json: string; pdf_r2_key: string }>().catch(() => null);

  const [pdfFirst, jsonFirst, zipFirst] = await Promise.all([
    env.BLUEPRINTS.get(receipt.artifactKeys.pdf).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.json).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.zip).catch(() => null)
  ]);

  const [pdfBytes, jsonBytes, zipBytes] = await Promise.all([
    objectBytes(pdfFirst).catch(() => null),
    objectBytes(jsonFirst).catch(() => null),
    objectBytes(zipFirst).catch(() => null)
  ]);

  const [pdfHash, jsonHash, zipHash] = await Promise.all([
    pdfBytes ? sha256Hex(pdfBytes).catch(() => '') : Promise.resolve(''),
    jsonBytes ? sha256Hex(jsonBytes).catch(() => '') : Promise.resolve(''),
    zipBytes ? sha256Hex(zipBytes).catch(() => '') : Promise.resolve('')
  ]);

  const storedJson = jsonBytes ? new TextDecoder().decode(jsonBytes) : '';

  const [pdfSecond, jsonSecond, zipSecond] = await Promise.all([
    env.BLUEPRINTS.get(receipt.artifactKeys.pdf).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.json).catch(() => null),
    env.BLUEPRINTS.get(receipt.artifactKeys.zip).catch(() => null)
  ]);

  const owner = blueprint.ownerId.trim().toLowerCase();

  return {
    d1Persisted: Boolean(row?.blueprint_json && row.pdf_r2_key === receipt.artifactKeys.pdf),
    pdfPersisted: Boolean(pdfFirst && pdfHash === receipt.hashes.pdfSha256),
    jsonPersisted: Boolean(
      jsonFirst
      && row?.blueprint_json
      && storedJson === row.blueprint_json
      && jsonHash === receipt.hashes.canonicalBlueprintSha256
    ),
    zipPersisted: Boolean(zipFirst && zipHash === receipt.hashes.zipSha256),
    artifactHashesPresent: hashesPresent,
    ownershipBoundaryEstablished: Boolean(owner && row?.owner_id?.trim().toLowerCase() === owner),
    repeatDownloadAvailable: Boolean(pdfSecond && jsonSecond && zipSecond)
  };
}
