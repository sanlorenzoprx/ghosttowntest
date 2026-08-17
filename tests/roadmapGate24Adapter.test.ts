import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 24 paid Vertex quality acceptance adapter', () => {
  it('is wired as the sanctioned default adapter after paid provider research', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate24-paid-vertex-quality.mjs');

    expect(wrapper).toContain('roadmap-gate24-paid-vertex-quality.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_24_COMMAND: sanctionedGate24Command');
    expect(adapter).toContain("state?.gates?.['23']?.status !== 'PASS'");
    expect(adapter).toContain('GATE24_RECEIPT_PATH');
  });

  it('checks only persisted paid-order evidence and preserves fail-closed Vertex quality requirements', async () => {
    const adapter = await readText('scripts/roadmap-gate24-paid-vertex-quality.mjs');

    expect(adapter).toContain("SELECT status, blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ?");
    expect(adapter).toContain("stage?.provider === 'google_vertex_ai'");
    expect(adapter).toContain("stage?.gateway === 'cloudflare_ai_gateway'");
    expect(adapter).toContain('immutableSuppliedCandidateIds');
    expect(adapter).toContain('researchCandidateCount < 10');
    expect(adapter).toContain('researchVerifiedCount < 10 || researchVerifiedCount > 25');
    expect(adapter).toContain('quality?.deterministicGatePassed === true');
    expect(adapter).toContain('quality?.v21GatePassed === true');
    expect(adapter).toContain('quality?.redTeamPassed === true');
    expect(adapter).toContain('quality?.sourceVerificationPassed === true');
    expect(adapter).toContain('quality?.candidateIdValidationPassed === true');
    expect(adapter).toContain('generationReplayed: false');
    expect(adapter).toContain('secretValuesRecorded: false');
    expect(adapter).not.toMatch(/payment_method_data|card_number|4242|GEMINI_API_KEY/);
  });
});
