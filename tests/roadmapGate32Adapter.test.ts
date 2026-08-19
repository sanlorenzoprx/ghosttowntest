import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 32 provider-failure retry adapter', () => {
  it('proves the configured roadmap contract and keeps the adapter explicit through the sanctioned hook', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const adapter = await readText('scripts/roadmap-gate32-provider-failure-retry.mjs');

    expect(config.gates[31]).toMatchObject({
      id: 32,
      mode: 'hook',
      mutation_scope: 'acceptance',
      requires_user_input: false,
      hook_env: 'ROADMAP_GATE_32_COMMAND'
    });
    expect(adapter).toContain("const RECEIPT_PATH = join(STATE_DIR, 'gate32-provider-failure-retry-receipt.json')");
    expect(adapter).toContain('BOGUS_GATEWAY_ID');
    expect(adapter).toContain("'roadmap-gate32-provider-failure-retry-receipt-v1'");
  });

  it('forces the provider failure in acceptance only and proves fail-closed retry without a second charge', async () => {
    const adapter = await readText('scripts/roadmap-gate32-provider-failure-retry.mjs');

    expect(adapter).toContain("'AI_GATEWAY_ID = \"default\"'");
    expect(adapter).toContain('VERTEX_BLUEPRINT_REQUIRED = "true"');
    expect(adapter).toContain('failLaunchBlueprintOrderV21(this.env, orderId, error)');
    expect(adapter).toContain('queueLaunchBlueprintOrder(env, orderId, session, retryEventId)');
    expect(adapter).toContain('expirationTtl: 900');
    expect(adapter).toContain('second_charge_occurred: false');
    expect(adapter).toContain('charge_ids_identical');
    expect(adapter).toContain('acceptance_restored_verified: true');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain('purchase_replayed: false');
  });

  it('restores every temporary acceptance mutation and keeps the retry bounded', async () => {
    const adapter = await readText('scripts/roadmap-gate32-provider-failure-retry.mjs');

    expect(adapter).toContain('wrangler.toml');
    expect(adapter).toContain("['deploy', '--env', 'acceptance']");
    expect(adapter).toContain('ACTIVE_WORKFLOW_STATUSES');
    expect(adapter).toContain('secondRetry?.status !== 409');
    expect(adapter).toContain('workflow_step_retries_bounded: true');
    expect(adapter).toContain('replayed: false');
    expect(adapter).not.toContain('/api/auth/signup');
    expect(adapter).toContain("retryZone.includes('payment_intents')");
  });

  it('registers the sanctioned Gate 32 command in the autopilot wrapper without unsafe future hooks', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(wrapper).toContain('roadmap-gate32-provider-failure-retry.mjs');
    expect(wrapper).toContain('sanctionedGate32Command');
    expect(wrapper).toContain('ROADMAP_GATE_32_COMMAND: sanctionedGate32Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
