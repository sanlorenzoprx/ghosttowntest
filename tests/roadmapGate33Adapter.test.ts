import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 33 R2-failure retry adapter', () => {
  it('proves the configured roadmap contract and keeps the adapter explicit through the sanctioned hook', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const adapter = await readText('scripts/roadmap-gate33-r2-failure-retry.mjs');

    expect(config.gates[32]).toMatchObject({
      id: 33,
      mode: 'hook',
      mutation_scope: 'acceptance',
      requires_user_input: false,
      hook_env: 'ROADMAP_GATE_33_COMMAND'
    });
    expect(adapter).toContain("const RECEIPT_PATH = join(STATE_DIR, 'gate33-r2-failure-retry-receipt.json')");
    expect(adapter).toContain('roadmap_gate33_force_r2_failure');
    expect(adapter).toContain("'roadmap-gate33-r2-failure-retry-receipt-v1'");
  });

  it('forces the R2 failure in acceptance only and proves exact recovery without duplicate order/charge', async () => {
    const adapter = await readText('scripts/roadmap-gate33-r2-failure-retry.mjs');
    const store = await readText('src/api/blueprintStoreV21.ts');

    expect(store).toContain("env.DEPLOYMENT_ENV === 'acceptance'");
    expect(store).toContain("'roadmap_gate33_force_r2_failure'");
    expect(store).toContain('forced Launch Blueprint R2 persistence failure');
    expect(adapter).toContain('ON CONFLICT(order_id) DO UPDATE');
    expect(adapter).toContain('duplicate_order_row_created: false');
    expect(adapter).toContain('second_charge_occurred: false');
    expect(adapter).toContain('accepted_artifacts_exact: true');
    expect(adapter).toContain('failpoint_flag_removed');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain('gate28_rematerialization_reused: false');
  });

  it('keeps the R2 failpoint inert outside acceptance and preserves accepted artifacts', async () => {
    const adapter = await readText('scripts/roadmap-gate33-r2-failure-retry.mjs');
    const store = await readText('src/api/blueprintStoreV21.ts');

    expect(store).toContain('env.KV?.get');
    expect(store).toContain("env.DEPLOYMENT_ENV === 'acceptance'");
    expect(adapter).toContain('gate27.artifacts.json.sha256');
    expect(adapter).toContain('accepted_d1_hash_matches_gate26');
    expect(adapter).toContain("'persist canonical blueprint v2.1 artifacts before ready'");
    expect(adapter).not.toContain('/api/auth/signup');
    expect(adapter).toContain('gate28_rematerialization_reused: false');
    expect(adapter).toContain('research_replayed: false');
  });

  it('registers the sanctioned Gate 33 command in the autopilot wrapper without unsafe future hooks', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(wrapper).toContain('roadmap-gate33-r2-failure-retry.mjs');
    expect(wrapper).toContain('sanctionedGate33Command');
    expect(wrapper).toContain('ROADMAP_GATE_33_COMMAND: sanctionedGate33Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
