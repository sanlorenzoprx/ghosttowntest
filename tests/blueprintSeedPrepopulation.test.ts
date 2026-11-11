import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const api = readFileSync(new URL('../src/api/blueprintSeeds.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/components/CompetitorSeedStep.tsx', import.meta.url), 'utf8');

describe('Blueprint starting research set', () => {
  it('uses the production Vertex AI path instead of the retired Gemini API-key path', () => {
    expect(api).toContain("import { generateAIJson");
    expect(api).toContain("task: 'candidate_selection'");
    expect(api).toContain('responseSchema: SEED_SUGGESTION_SCHEMA');
    expect(api).not.toContain('generativelanguage.googleapis.com');
    expect(api).not.toContain('env.GEMINI_API_KEY');
  });

  it('asks Vertex for enough candidates to prepopulate the customer choice', () => {
    expect(api).toContain('minItems: 3');
    expect(api).toContain('maxItems: 8');
    expect(api).toContain('Never invent a company, brand, product, publication, marketplace, or domain.');
    expect(api).toContain('verifyWebsite(candidate.website)');
    expect(api).toContain('At least two verified resources are required before the Blueprint can start.');
  });

  it('preselects generated verified resources while preserving customer replacement choice', () => {
    expect(ui).toContain('setSelected(defaultSuggestionSelection(generatedSuggestions));');
    expect(ui).toContain('setSelected(defaultSuggestionSelection(loadedSuggestions));');
    expect(ui).toContain('Want to replace one?');
    expect(ui).toContain('The three GhostTown selections are ready to use as-is.');
    expect(ui).toContain('Use These Resources and Build My Blueprint');
  });
});
