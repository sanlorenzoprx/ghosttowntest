import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 35 authoritative acceptance receipt adapter', () => {
  it('proves the configured roadmap contract and keeps the adapter explicit through the sanctioned hook', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');

    expect(config.gates[34]).toMatchObject({
      id: 35,
      mode: 'hook',
      mutation_scope: 'none',
      requires_user_input: false,
      hook_env: 'ROADMAP_GATE_35_COMMAND'
    });
    expect(adapter).toContain("const RECEIPT_PATH = join(STATE_DIR, 'gate35-ghosttown-acceptance-receipt.json')");
    expect(adapter).toContain("'ghosttown-authoritative-acceptance-receipt-v1'");
  });

  it('summarizes Gates 1-35 from actual roadmap state and references the canonical chain', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');

    expect(adapter).toContain('616c691e6b4c9cea93615963a07375d13ffba57f');
    expect(adapter).toContain("'2.1.1'");
    expect(adapter).toContain('gate31-cross-account-security-receipt.json');
    expect(adapter).toContain('gate32-provider-failure-retry-receipt.json');
    expect(adapter).toContain('gate33-r2-failure-retry-receipt.json');
    expect(adapter).toContain('gate34-visual-certification-receipt.json');
    expect(adapter).toContain('total_passed');
    expect(adapter).toContain("status: entry?.status || 'PENDING'");
  });

  it('fails closed, records secret names only, and never claims Story Studio ran', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');

    expect(adapter).toContain('fails closed');
    expect(adapter).toContain('secret_names_only');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain("'PENDING_HUMAN_DECISION'");
    expect(adapter).toContain('gates_37_47_run: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).not.toMatch(/secret\s*[:=]\s*['\"](?:sk_|whsec_|BEGIN [A-Z ]*PRIVATE KEY)/);
  });

  it('registers the sanctioned Gate 35 command in the autopilot wrapper without unsafe future hooks', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(wrapper).toContain('roadmap-gate35-authoritative-receipt.mjs');
    expect(wrapper).toContain('sanctionedGate35Command');
    expect(wrapper).toContain('ROADMAP_GATE_35_COMMAND: sanctionedGate35Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
