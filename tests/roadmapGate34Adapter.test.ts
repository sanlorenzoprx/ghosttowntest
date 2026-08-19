import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 34 visual-certification adapter v2', () => {
  it('preserves the roadmap contract and supports an additive correction mode', async () => {
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
    expect(adapter).toContain("RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt-v2.json')");
    expect(adapter).toContain("'roadmap-gate34-visual-certification-receipt-v2'");
    expect(adapter).toContain("process.argv.includes('--correction')");
  });

  it('certifies the exact five paid-journey viewports with an existing owner session', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    for (const viewport of ['375x667', '390x844', '768x1024', '1366x768', '1440x900']) expect(adapter, viewport).toContain(viewport);
    expect(adapter).toContain("OWNER_TOKEN_ENV = 'ROADMAP_GATE_34_OWNER_TOKEN'");
    expect(adapter).toContain('/api/auth/verify');
    expect(adapter).toContain("method: 'existing owner acceptance JWT supplied locally'");
    expect(adapter).toContain('chromium.launch');
    expect(adapter).toContain('no_horizontal_overflow');
    expect(adapter).toContain('Download Blueprint PDF');
    expect(adapter).toContain('Export all assets');
    expect(adapter).toContain('Publish Launch Site');
    expect(adapter).toContain('/blueprint.json');
  });

  it('fails closed on stale acceptance pairing instead of deploying infrastructure', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    expect(adapter).toContain('ACCEPTANCE_PAIRING_STALE');
    expect(adapter).toContain('Run the established acceptance-pairing deployment outside Gate 34');
    expect(adapter).toContain("calendar_primary: js.includes('30-Day Launch Execution')");
    expect(adapter).toContain('acceptance_worker: js.includes(WORKER_URL)');
    expect(adapter).not.toContain("'pages', 'deploy'");
    expect(adapter).not.toContain('deployAcceptancePages');
    expect(adapter).not.toContain('runWrangler');
    expect(adapter).not.toContain('TEMP_ENTRY');
    expect(adapter).not.toContain('mintWorkerSource');
    expect(adapter).not.toContain('randomBytes');
  });

  it('makes the corrected run genuinely read-only and truthfully classifies original infrastructure mutations', async () => {
    const adapter = await readText('scripts/roadmap-gate34-visual-certification.mjs');

    expect(adapter).toContain("customer_data_mutations: 'none'");
    expect(adapter).toContain("order_mutations: 'none'");
    expect(adapter).toContain("artifact_mutations: 'none'");
    expect(adapter).toContain("launch_site_mutations: 'none'");
    expect(adapter).toContain("acceptance_infrastructure_mutations: 'none'");
    expect(adapter).toContain('acceptance_infrastructure_deployment_during_original_gate34: true');
    expect(adapter).toContain('temporary_acceptance_worker_mint_deployment: true');
    expect(adapter).toContain("production_infrastructure_mutation: 'none'");
    expect(adapter).toContain("analytics_network_mutations: 'blocked_in_browser'");
    expect(adapter).toContain("mutation_scope: 'none'");
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('gate_36_touched: false');
    expect(adapter).toContain('secret_values_recorded: false');
  });

  it('keeps Gate 36 outside the automated wrapper', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    expect(wrapper).toContain('roadmap-gate34-visual-certification.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_34_COMMAND: sanctionedGate34Command');
    expect(wrapper).not.toContain('sanctionedGate36Command');
    expect(wrapper).not.toContain('ROADMAP_GATE_36_COMMAND');
  });
});
