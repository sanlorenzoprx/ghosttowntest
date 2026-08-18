import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21';
import { buildBlueprintAssetZipFromCanonicalBytesV21 } from '../src/api/blueprintStoreV21';
import type { GhostTownLaunchBlueprintV21 } from '../src/types/launchBlueprintV21';

const INPUT_ENV = 'GHOSTTOWN_GATE28_BLUEPRINT_PATH';
const PDF_ENV = 'GHOSTTOWN_GATE28_PDF_PATH';
const ZIP_ENV = 'GHOSTTOWN_GATE28_ZIP_PATH';

describe('Gate 28 current v2.1 artifact renderer adapter', () => {
  it('renders PDF and 16-file ZIP from the exact canonical JSON without mutating it', () => {
    const inputPath = process.env[INPUT_ENV];
    const pdfPath = process.env[PDF_ENV];
    const zipPath = process.env[ZIP_ENV];
    expect(inputPath, `${INPUT_ENV} is required`).toBeTruthy();
    expect(pdfPath, `${PDF_ENV} is required`).toBeTruthy();
    expect(zipPath, `${ZIP_ENV} is required`).toBeTruthy();

    const canonicalJsonBytes = new Uint8Array(readFileSync(inputPath!));
    const blueprint = JSON.parse(new TextDecoder().decode(canonicalJsonBytes)) as GhostTownLaunchBlueprintV21;
    expect(blueprint.blueprintVersion).toBe('2.1');
    expect(blueprint.schemaVersion).toBe('ghosttown-launch-blueprint-v2');
    expect(blueprint.status).toBe('ready');

    const before = JSON.stringify(blueprint);
    const pdf = renderLaunchBlueprintPdfV21(blueprint);
    const zip = buildBlueprintAssetZipFromCanonicalBytesV21(blueprint, pdf, canonicalJsonBytes);
    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(zip.byteLength).toBeGreaterThan(pdf.byteLength);
    expect(new TextDecoder('latin1').decode(pdf.subarray(0, 8))).toContain('%PDF-1.4');
    expect(JSON.stringify(blueprint)).toBe(before);

    writeFileSync(pdfPath!, Buffer.from(pdf));
    writeFileSync(zipPath!, Buffer.from(zip));
  });
});
