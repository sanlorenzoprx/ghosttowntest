import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 31 cross-account security adapter', () => {
  it('proves the configured roadmap contract and keeps the adapter explicit through the sanctioned hook', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security.mjs');

    expect(config.gates[30]).toMatchObject({
      id: 31,
      mode: 'hook',
      mutation_scope: 'none',
      requires_user_input: false,
      hook_env: 'ROADMAP_GATE_31_COMMAND'
    });
    expect(adapter).toContain("const OWNERSHIP_TEST = 'tests/blueprintOwnershipV21.test.ts'");
    expect(adapter).toContain("const EXPECTED_DENIAL_STATUS = 404");
    expect(adapter).toContain("['vitest', 'run', OWNERSHIP_TEST]");
  });

  it('covers every required customer artifact/state route with an owner-boundary check and no acceptance mutation', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security.mjs');

    for (const route of [
      '/api/paid-test/orders/{orderId}/blueprint',
      '/blueprint.json',
      '/blueprint.pdf',
      '/blueprint-assets.zip',
      '/blueprint/progress',
      '/blueprint/retry',
      '/api/paid-test/orders/{orderId}/launch-site',
      '/launch-site/publish',
      '/launch-site/unpublish',
      '/launch-site/leads',
      '/launch-site/leads.csv'
    ]) {
      expect(adapter, route).toContain(route);
    }
    expect(adapter).toContain("ownerCheck: 'ownedLaunchBlueprintOrder'");
    expect(adapter).toContain("'Launch Blueprint not found'");
    expect(adapter).toContain('"Launch Site not found"');
    expect(adapter).toContain('cross_account_live_404');
    expect(adapter).toContain('mutation_scope_verified: \'none\'');
    expect(adapter).toContain('mutation_performed: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain('purchase_replayed: false');
  });

  it('never waives the gate and never manufactures acceptance accounts', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security.mjs');

    expect(adapter).not.toMatch(/waive|waived/i);
    expect(adapter).not.toContain('/api/auth/signup');
    expect(adapter).not.toContain('process.exit(0)');
    expect(adapter).toContain('throw new Error(`Gate 31');
    expect(adapter).toContain('not_reproducible_read_only');
    expect(adapter).toContain('limitation:');
  });

  it('registers the sanctioned Gate 31 command in the autopilot wrapper without unsafe future hooks', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(wrapper).toContain('roadmap-gate31-cross-account-security.mjs');
    expect(wrapper).toContain('sanctionedGate31Command');
    expect(wrapper).toContain('ROADMAP_GATE_31_COMMAND: sanctionedGate31Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
