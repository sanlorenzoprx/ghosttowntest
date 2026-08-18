import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderLaunchBlueprintPdfV21 } from '../src/api/blueprintPdfV21';
import type { GhostTownLaunchBlueprintV21 } from '../src/types/launchBlueprintV21';

const INPUT_ENV = 'GHOSTTOWN_GATE28_BLUEPRINT_PATH';
const OUTPUT_ENV = 'GHOSTTOWN_GATE28_PDF_PATH';

describe('Gate 28 current v2.1 PDF renderer adapter', () => {
  it('renders the supplied canonical Blueprint without mutating it', () => {
    const inputPath = process.env[INPUT_ENV];
    const outputPath = process.env[OUTPUT_ENV];
    expect(inputPath, `${INPUT_ENV} is required`).toBeTruthy();
    expect(outputPath, `${OUTPUT_ENV} is required`).toBeTruthy();

    const blueprint = JSON.parse(readFileSync(inputPath!, 'utf8')) as GhostTownLaunchBlueprintV21;
    expect(blueprint.blueprintVersion).toBe('2.1');
    expect(blueprint.schemaVersion).toBe('ghosttown-launch-blueprint-v2');
    expect(blueprint.status).toBe('ready');

    const before = JSON.stringify(blueprint);
    const pdf = renderLaunchBlueprintPdfV21(blueprint);
    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder('latin1').decode(pdf.subarray(0, 8))).toContain('%PDF-1.4');
    expect(JSON.stringify(blueprint)).toBe(before);

    writeFileSync(outputPath!, Buffer.from(pdf));
  });
});
