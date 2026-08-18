import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const adapter = readFileSync(new URL('../scripts/roadmap-gate29-launch-site-lead.mjs', import.meta.url), 'utf8');
const wrapper = readFileSync(new URL('../scripts/roadmap-autopilot-wrapper.mjs', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../config/production-roadmap-47-gates.json', import.meta.url), 'utf8')) as {
  gates: Array<{ id: number; hook_env?: string; mutation_scope?: string; requires_user_input?: boolean }>;
};

describe('Roadmap Gate 29 sanctioned Launch Site adapter', () => {
  it('wires the repo-owned adapter into the existing hook contract', () => {
    const gate29 = config.gates.find(gate => gate.id === 29);
    expect(gate29).toMatchObject({
      hook_env: 'ROADMAP_GATE_29_COMMAND',
      mutation_scope: 'acceptance',
      requires_user_input: false,
    });
    expect(wrapper).toContain("const GATE29_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate29-launch-site-lead.mjs');");
    expect(wrapper).toContain('const sanctionedGate29Command = process.env.ROADMAP_GATE_29_COMMAND?.trim()');
    expect(wrapper).toContain('ROADMAP_GATE_29_COMMAND: sanctionedGate29Command');
  });

  it('exercises every Gate 29 customer-visible lifecycle boundary over acceptance HTTPS', () => {
    expect(adapter).toContain('/api/paid-test/orders/${encodeURIComponent(purchase.order_id)}/launch-site');
    expect(adapter).toContain("`${ownerUrl}/publish`");
    expect(adapter).toContain('publicUrl = publish.body.publicUrl');
    expect(adapter).toContain('publicPage.status !== 200');
    expect(adapter).toContain('/api/launch-sites/${encodeURIComponent(publicSlug)}/leads');
    expect(adapter).toContain("`${ownerUrl}/leads`");
    expect(adapter).toContain("`${ownerUrl}/leads.csv`");
    expect(adapter).toContain("`${ownerUrl}/unpublish`");
    expect(adapter).toContain('unavailable.status !== 404');
    expect(adapter).toContain("final_owner_status: 'unpublished'");
  });

  it('uses the already-paid Gate 20 order and never replays purchase, research, Vertex, R2 writes, or production', () => {
    expect(adapter).toContain("GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json')");
    expect(adapter).toContain("purchase?.stripe_mode !== 'test'");
    expect(adapter).toContain('purchase_replayed: false');
    expect(adapter).toContain('research_replayed: false');
    expect(adapter).toContain('vertex_invoked: false');
    expect(adapter).toContain('r2_artifacts_mutated: false');
    expect(adapter).toContain('acceptance_only: true');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).not.toContain('api.stripe.com');
    expect(adapter).not.toContain("'--env', 'production'");
    expect(adapter).not.toContain('env.BLUEPRINTS.put');
  });

  it('keeps credentials out of commands, output, and receipts while restoring canonical acceptance state', () => {
    expect(adapter).toContain("headers: bearer(ownerJwt)");
    expect(adapter).not.toContain('console.log(ownerJwt)');
    expect(adapter).not.toContain('owner_jwt:');
    expect(adapter).not.toContain('adapter_token:');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain("runWrangler(['deploy', '--env', 'acceptance'])");
    expect(adapter).toContain('waitForCanonicalRestore(adapterToken)');
    expect(adapter).toContain('if (wrappedDeployed && ownerJwt && published)');
    expect(adapter).toContain("`${ownerUrl}/unpublish`");
    expect(adapter).toContain("rmSync(TEMP_ENTRY, { force: true })");
  });
});
