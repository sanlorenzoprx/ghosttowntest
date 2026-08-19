import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 30 second-device recovery adapter', () => {
  it('proves the configured roadmap contract and uses a sanctioned first-party adapter', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; mutation_scope: string; requires_user_input: boolean; hook_env?: string }>;
    };
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(config.gates[29]).toMatchObject({
      id: 30,
      mode: 'hook',
      mutation_scope: 'none',
      requires_user_input: true,
      hook_env: 'ROADMAP_GATE_30_COMMAND'
    });
    expect(wrapper).toContain('roadmap-gate30-second-device-recovery.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_30_COMMAND: sanctionedGate30Command');
  });

  it('requires the purchasing-account password only through local process environment and never records it', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery.mjs');

    expect(gate30).toContain("const OWNER_PASSWORD_ENV = 'ROADMAP_GATE_30_OWNER_PASSWORD'");
    expect(gate30).toContain('process.env[OWNER_PASSWORD_ENV]');
    expect(gate30).toContain('Do not paste the password into chat');
    expect(gate30).toContain("password_value_recorded: false");
    expect(gate30).toContain("token_values_recorded: false");
    expect(gate30).toContain("secret_values_recorded: false");
    expect(gate30).not.toMatch(/correct-horse|password\s*[:=]\s*['\"][^'\"]{6,}['\"]/i);
  });

  it('keeps Gate 30 read-only while exercising real login and owner recovery routes', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery.mjs');

    expect(gate30).toContain('/api/auth/login');
    expect(gate30).toContain('/api/auth/verify');
    expect(gate30).toContain('/blueprint`');
    expect(gate30).toContain('/blueprint/progress`');
    expect(gate30).toContain('/blueprint.json`');
    expect(gate30).toContain('/blueprint.pdf`');
    expect(gate30).toContain('/blueprint-assets.zip`');
    expect(gate30).toContain('/launch-site`');
    expect(gate30).toContain("passwordScheme !== 'pbkdf2-100000'");
    expect(gate30).toContain("mutation_scope_verified: 'none'");
    expect(gate30).toContain("acceptance_resources_mutated: false");

    expect(gate30).toContain("'remote = true'");
    expect(gate30).toContain("'wrangler', 'dev'").or.toContain("WRANGLER_CLI, 'dev'");
    expect(gate30).not.toContain("'deploy'");
    expect(gate30).not.toContain('/publish');
    expect(gate30).not.toContain('/unpublish');
    expect(gate30).not.toContain('/blueprint/retry');
    expect(gate30).not.toContain('/paid-test/checkout');
    expect(gate30).not.toContain('api.stripe.com');
    expect(gate30).not.toContain('/rematerialize');
    expect(gate30).not.toContain('env.KV.put');
  });

  it('ties both fresh sessions to prior certified D1, R2, execution, and Launch Site evidence', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery.mjs');

    expect(gate30).toContain('gate26-canonical-d1-artifacts-receipt.json');
    expect(gate30).toContain('gate27-private-r2-artifacts-receipt.json');
    expect(gate30).toContain('gate29-launch-site-lead-receipt.json');
    expect(gate30).toContain('gate27.artifacts.json.sha256');
    expect(gate30).toContain('gate27.artifacts.pdf.sha256');
    expect(gate30).toContain('gate27.artifacts.zip.sha256');
    expect(gate30).toContain('gate26.canonical.canonical_blueprint_sha256');
    expect(gate30).toContain('gate29.site_id_sha256');
    expect(gate30).toContain('gate29.public_slug_sha256');
    expect(gate30).toContain('gate29.public_url_sha256');
    expect(gate30).toContain('validateExecutionProjection');
    expect(gate30).toContain('identicalRecovery(first, second)');
    expect(gate30).toContain("fresh_authentication_contexts: 2");
    expect(gate30).toContain("second_context_matches_first: true");
    expect(gate30).toContain("purchase_replayed: false");
    expect(gate30).toContain("workflow_replayed: false");
    expect(gate30).toContain("research_replayed: false");
    expect(gate30).toContain("vertex_invoked: false");
    expect(gate30).toContain("production_deployed: false");
  });
});
