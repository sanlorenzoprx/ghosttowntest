import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeBlueprintDocumentModel } from '../src/api/blueprintDocumentModel';
import { renderBlueprintDocumentHtml } from '../src/api/blueprintDocumentHtml';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21';
import { buildBlueprintAssetZipFromCanonicalBytesV21 } from '../src/api/blueprintStoreV21';
import type { GhostTownLaunchBlueprintV21 } from '../src/types/launchBlueprintV21';

const INPUT_ENV = 'GHOSTTOWN_GATE28_BLUEPRINT_PATH';
const PDF_ENV = 'GHOSTTOWN_GATE28_PDF_PATH';
const ZIP_ENV = 'GHOSTTOWN_GATE28_ZIP_PATH';
const DOCUMENT_RECEIPT_ENV = 'GHOSTTOWN_GATE28_DOCUMENT_RECEIPT_PATH';
const REQUIRED_ENV = [INPUT_ENV, PDF_ENV, ZIP_ENV, DOCUMENT_RECEIPT_ENV] as const;
const gate28AdapterConfigured = REQUIRED_ENV.every(name => Boolean(process.env[name]));

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// This file is an environment-driven Gate 28 adapter that intentionally uses
// Vitest so the existing renderer/import graph is exercised exactly as the
// application tests exercise it. Global `vitest run` also discovers *.test.ts
// under scripts/, so skip this adapter unless Gate 28 supplied all required
// paths. Gate 28 v4 supplies all four variables and therefore still executes
// the full deterministic PDF/ZIP render and mutation guards below.
describe.skipIf(!gate28AdapterConfigured)('Gate 28 current v2.1 artifact renderer adapter', () => {
  it('renders PDF and 16-file ZIP from the exact canonical JSON without mutating it', () => {
    const inputPath = process.env[INPUT_ENV];
    const pdfPath = process.env[PDF_ENV];
    const zipPath = process.env[ZIP_ENV];
    const documentReceiptPath = process.env[DOCUMENT_RECEIPT_ENV];
    expect(inputPath, `${INPUT_ENV} is required`).toBeTruthy();
    expect(pdfPath, `${PDF_ENV} is required`).toBeTruthy();
    expect(zipPath, `${ZIP_ENV} is required`).toBeTruthy();
    expect(documentReceiptPath, `${DOCUMENT_RECEIPT_ENV} is required`).toBeTruthy();

    const canonicalJsonBytes = new Uint8Array(readFileSync(inputPath!));
    const blueprint = JSON.parse(new TextDecoder().decode(canonicalJsonBytes)) as GhostTownLaunchBlueprintV21;
    expect(blueprint.blueprintVersion).toBe('2.1');
    expect(blueprint.schemaVersion).toBe('ghosttown-launch-blueprint-v2');
    expect(blueprint.status).toBe('ready');

    const before = JSON.stringify(blueprint);
    const documentModel = composeBlueprintDocumentModel(blueprint);
    const documentHtml = renderBlueprintDocumentHtml(documentModel);
    const css = documentHtml.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '';
    const pdf = renderLaunchBlueprintPdfV21(blueprint);
    const zip = buildBlueprintAssetZipFromCanonicalBytesV21(blueprint, pdf, canonicalJsonBytes);
    const documentReceipt = {
      modelVersion: 'ghosttown-blueprint-document-model-v1',
      renderMode: 'deterministic_fallback',
      modelSha256: sha256(JSON.stringify(documentModel)),
      htmlSha256: sha256(documentHtml),
      cssSha256: sha256(css),
    };

    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(zip.byteLength).toBeGreaterThan(pdf.byteLength);
    expect(new TextDecoder('latin1').decode(pdf.subarray(0, 8))).toContain('%PDF-1.4');
    expect(JSON.stringify(blueprint)).toBe(before);

    writeFileSync(pdfPath!, Buffer.from(pdf));
    writeFileSync(zipPath!, Buffer.from(zip));
    writeFileSync(documentReceiptPath!, `${JSON.stringify(documentReceipt, null, 2)}\n`, 'utf8');
  });
});
