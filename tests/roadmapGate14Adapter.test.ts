import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('roadmap Gate 14 Gemini adapter', () => {
  it('auto-wires the sanctioned Gate 14 adapter without exposing the Gemini secret locally', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate14-gemini-smoke.mjs');

    expect(wrapper).toContain('ROADMAP_GATE_14_COMMAND');
    expect(wrapper).toContain('roadmap-gate14-gemini-smoke.mjs');
    expect(wrapper).toContain('sanctionedGate14Command');

    expect(adapter).toContain("'.roadmap-autopilot/gate14-gemini-smoke-entry.ts'");
    expect(adapter).toContain("'--env', 'acceptance'");
    expect(adapter).toContain("'X-Roadmap-Acceptance-Token'");
    expect(adapter).toContain("env.GEMINI_API_KEY");
    expect(adapter).toContain("allSelectedIdsSupplied: true");
    expect(adapter).toContain("unknownCandidateIds: []");
    expect(adapter).toContain("selected.length !== 2");
    expect(adapter).toContain("runWrangler(['deploy', '--env', 'acceptance'])");
    expect(adapter).not.toContain('--env production');
    expect(adapter).not.toContain('wrangler secret get');
  });
});
