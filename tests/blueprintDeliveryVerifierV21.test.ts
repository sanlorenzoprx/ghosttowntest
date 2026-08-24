import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import type {
  BlueprintGenerationEvidenceReceipt,
  GhostTownLaunchBlueprintV21
} from '../src/types/launchBlueprintV21';
import { verifyBlueprintDeliveryStateExactV21 } from '../src/api/blueprintDeliveryVerifierV21';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function r2Body(bytes: Uint8Array): R2ObjectBody {
  let consumed = false;
  return {
    arrayBuffer: vi.fn(async () => {
      if (consumed) throw new Error('R2 body already consumed');
      consumed = true;
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return copy.buffer;
    }),
    text: vi.fn(async () => {
      if (consumed) throw new Error('R2 body already consumed');
      consumed = true;
      return new TextDecoder().decode(bytes);
    })
  } as unknown as R2ObjectBody;
}

describe('Blueprint v2.1 exact delivery verifier', () => {
  it('verifies JSON hash and D1 equality from a single R2 body read', async () => {
    const encoder = new TextEncoder();
    const canonicalJson = '{\n  "schemaVersion": "ghosttown-launch-blueprint-v2"\n}';
    const jsonBytes = encoder.encode(canonicalJson);
    const pdfBytes = encoder.encode('fixture-pdf');
    const zipBytes = encoder.encode('fixture-zip');

    const artifactKeys = {
      pdf: 'blueprints/order-1/blueprint.pdf',
      json: 'blueprints/order-1/blueprint.json',
      zip: 'blueprints/order-1/assets.zip'
    };

    const objects = new Map<string, Uint8Array>([
      [artifactKeys.pdf, pdfBytes],
      [artifactKeys.json, jsonBytes],
      [artifactKeys.zip, zipBytes]
    ]);

    const get = vi.fn(async (key: string) => {
      const bytes = objects.get(key);
      return bytes ? r2Body(bytes) : null;
    });

    const env = {
      BLUEPRINTS: { get },
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({
              owner_id: 'founder@example.com',
              blueprint_json: canonicalJson,
              pdf_r2_key: artifactKeys.pdf
            }))
          }))
        }))
      }
    } as unknown as Env;

    const blueprint = {
      orderId: 'order-1',
      ownerId: 'founder@example.com'
    } as GhostTownLaunchBlueprintV21;

    const receipt = {
      hashes: {
        normalizedInputSha256: 'a'.repeat(64),
        canonicalBlueprintSha256: await sha256Hex(jsonBytes),
        pdfSha256: await sha256Hex(pdfBytes),
        zipSha256: await sha256Hex(zipBytes)
      },
      artifactKeys
    } as BlueprintGenerationEvidenceReceipt;

    const state = await verifyBlueprintDeliveryStateExactV21(env, blueprint, receipt);

    expect(state).toEqual({
      d1Persisted: true,
      pdfPersisted: true,
      jsonPersisted: true,
      zipPersisted: true,
      artifactHashesPresent: true,
      ownershipBoundaryEstablished: true,
      repeatDownloadAvailable: true
    });
    expect(get).toHaveBeenCalledTimes(6);
  });
});
