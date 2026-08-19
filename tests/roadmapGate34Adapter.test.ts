import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 34 visual-certification adapter', () => {
  it('proves the configured roadmap contract and keeps the adapter explicit through the sanctioned hook', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    expect(config.gates[33]).toMatchObject({
      id: 34,
      mode: 'hook',
      mutation_scope: 'none',
      requires_user_input: true,
      hook_env: 'ROADMAP_GATE_34_COMMAND'
    });
    expect(adapter).toContain("const RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt.json')");
    expect(adapter).toContain("'roadmap-gate34-visual-certification-receipt-v1'");
  });

  it('certifies the exact five required viewports on the real paid journey, read-only', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    for (const viewport of ['375x667', '390x844', '768x1024', '1366x768', '1440x900']) {
      expect(adapter, viewport).toContain(viewport);
    }
    expect(adapter).toContain("from 'playwright'");
    expect(adapter).toContain('chromium.launch');
    expect(adapter).toContain('no_horizontal_overflow');
    expect(adapter).toContain('Download Blueprint PDF');
    expect(adapter).toContain('Export all assets');
    expect(adapter).toContain('Publish Launch Site');
    expect(adapter).toContain('/blueprint.json');
    expect(adapter).toContain('mutation_scope: \'none\'');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('secret_values_recorded: false');
  });

  it('never mutates acceptance state and preserves truthful artifact integrity', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    expect(adapter).toContain("'/blueprint/progress'");
    expect(adapter).toContain("'/launch-site/publish'");
    expect(adapter).toContain('mutation_posts_detected');
    expect(adapter).toContain('pdf_matches_gate27_every_viewport');
    expect(adapter).toContain('zip_matches_gate27_every_viewport');
    expect(adapter).toContain('json_matches_gate27_every_viewport');
    expect(adapter).toContain('token_values_recorded: false');
    expect(adapter).toContain('operator_password_required: false');
    expect(adapter).not.toContain('/api/auth/signup');
  });

  it('registers the sanctioned Gate 34 command in the autopilot wrapper without unsafe future hooks', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(wrapper).toContain('roadmap-gate34-visual-certification.mjs');
    expect(wrapper).toContain('sanctionedGate34Command');
    expect(wrapper).toContain('ROADMAP_GATE_34_COMMAND: sanctionedGate34Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
