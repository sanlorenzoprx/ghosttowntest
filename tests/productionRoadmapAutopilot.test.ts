import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('production roadmap autopilot contract', () => {
  it('decomposes the authoritative 25-step critical path into exactly 47 ordered executable gates', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      source: { source_critical_path_steps: number; executable_gate_decomposition: number };
      gates: Array<{ id: number; phase: number; mode: string; mutation_scope: string; requires_user_input: boolean; title: string }>;
    };

    expect(config.source.source_critical_path_steps).toBe(25);
    expect(config.source.executable_gate_decomposition).toBe(47);
    expect(config.gates).toHaveLength(47);
    expect(config.gates.map(gate => gate.id)).toEqual(Array.from({ length: 47 }, (_, index) => index + 1));

    const productionRelease = config.gates.find(gate => gate.id === 36);
    expect(productionRelease).toMatchObject({
      phase: 12,
      mode: 'manual',
      mutation_scope: 'production',
      requires_user_input: true
    });

    expect(config.gates.filter(gate => gate.id < 36 && gate.mutation_scope === 'production')).toEqual([]);
    expect(config.gates[0].title).toContain('v2.1.4 Cloudflare SPA template amendment');
    expect(config.gates[13].title).toContain('Vertex supplied-candidate-only selection via AI Gateway');
    expect(config.gates[14].title).toContain('Vertex OAuth plus AI Gateway seven-stage');
  });

  it('hard-blocks automatic production deployment and keeps local runtime evidence out of Git', async () => {
    const script = await readText('scripts/production-roadmap-autopilot.mjs');
    const gitignore = await readText('.gitignore');

    expect(script).toContain('SAFETY_STOP');
    expect(script).toContain('Production auto-deploy: DISABLED');
    expect(script).toContain('Gate ${config.safety.production_release_gate} is manual.');
    expect(script).not.toMatch(/run\(['"]npx['"],\s*\[[^\]]*['"]wrangler['"][^\]]*['"]deploy['"][^\]]*['"]production['"]/s);
    expect(gitignore).toContain('.roadmap-autopilot/');
  });

  it('records only secret names and never requires a Gemini API key for the Vertex runtime', async () => {
    const script = await readText('scripts/production-roadmap-autopilot.mjs');
    const preflight = await readText('scripts/roadmap-vertex-ai-gateway-preflight.mjs');

    expect(script).toContain("secret', 'list'");
    expect(script).toContain('secret_values_recorded: false');
    expect(script).toContain('[REDACTED_STRIPE_KEY]');
    expect(script).toContain('[REDACTED_WEBHOOK_SECRET]');
    expect(script).toContain('[REDACTED_PRIVATE_KEY]');
    expect(script).not.toContain('wrangler secret get');

    expect(preflight).toContain("'VERTEX_SERVICE_ACCOUNT_EMAIL'");
    expect(preflight).toContain("'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY'");
    expect(preflight).toContain('gemini_api_key_required: false');
    expect(preflight).not.toContain("'GEMINI_API_KEY'");
    expect(preflight).toContain('secret_values_recorded: false');
  });

  it('has built-in automation through live provider smokes and first-party Vertex, checkout, and webhook adapters', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; handler?: string; hook_env?: string }>;
    };
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    for (const id of Array.from({ length: 13 }, (_, index) => index + 1)) {
      expect(config.gates[id - 1].mode).toBe('auto');
      expect(config.gates[id - 1].handler).toEqual(expect.any(String));
    }
    expect(config.gates[13]).toMatchObject({ id: 14, mode: 'hook', hook_env: 'ROADMAP_GATE_14_COMMAND' });
    expect(config.gates[14]).toMatchObject({ id: 15, mode: 'hook', hook_env: 'ROADMAP_GATE_15_COMMAND' });
    expect(config.gates[17]).toMatchObject({ id: 18, mode: 'hook', hook_env: 'ROADMAP_GATE_18_COMMAND' });
    expect(config.gates[18]).toMatchObject({ id: 19, mode: 'hook', hook_env: 'ROADMAP_GATE_19_COMMAND' });
    expect(wrapper).toContain('roadmap-gate14-vertex-selection-smoke.mjs');
    expect(wrapper).toContain('roadmap-gate15-vertex-structured-smoke.mjs');
    expect(wrapper).toContain('roadmap-gate18-checkout-routing-smoke.mjs');
    expect(wrapper).toContain('roadmap-gate19-stripe-webhook-registration-smoke.mjs');
    expect(wrapper).toContain('roadmap-gate21-stripe-order-idempotency.mjs');
    expect(wrapper).toContain('roadmap-gate22-seed-confirmation-workflow.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_18_COMMAND: sanctionedGate18Command');
    expect(wrapper).toContain('ROADMAP_GATE_19_COMMAND: sanctionedGate19Command');
    expect(wrapper).toContain('ROADMAP_GATE_21_COMMAND: sanctionedGate21Command');
    expect(wrapper).toContain('ROADMAP_GATE_22_COMMAND: sanctionedGate22Command');
  });

  it('preserves argument boundaries for Windows shell execution used by remote D1 and bundle checks', async () => {
    const packageJson = JSON.parse(await readText('package.json')) as { scripts: Record<string, string> };
    const compat = await readText('scripts/roadmap-windows-spawn-compat.cjs');

    expect(packageJson.scripts['roadmap:autopilot']).toBe('node scripts/roadmap-autopilot-wrapper.mjs');
    expect(packageJson.scripts['roadmap:status']).toContain('--require ./scripts/roadmap-windows-spawn-compat.cjs');
    expect(packageJson.scripts['roadmap:reset']).toContain('--require ./scripts/roadmap-windows-spawn-compat.cjs');
    expect(compat).toContain("args.indexOf('--command')");
    expect(compat).toContain("normalized.splice(commandIndex, 2, '--file', file.relative)");
    expect(compat).toContain("args[0] === '-e'");
    expect(compat).toContain('syncBuiltinESMExports()');
  });

  it('proves Gate 10 with direct remote table probes and auto-resumes only that schema blocker', async () => {
    const repair = await readText('scripts/roadmap-acceptance-schema-repair.mjs');
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');

    expect(repair).toContain('function probeRequiredTables()');
    expect(repair).toContain('SELECT 1 AS table_exists FROM');
    expect(repair).toContain("state.gates['10']");
    expect(repair).toContain("status: 'PASS'");
    expect(repair).toContain("verification: 'per-table SELECT probe against remote acceptance D1'");
    expect(repair).toContain('production_mutated: false');

    expect(wrapper).toContain('stateNeedsGate10Repair');
    expect(wrapper).toContain("state?.gates?.['9']?.status === 'PASS'");
    expect(wrapper).toContain("state?.gates?.['10']?.status !== 'PASS'");
  });

  it('retries Gate 11 with fresh DataForSEO evidence instead of replaying a cached failure', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const prep = await readText('scripts/roadmap-gate11-retry-prep.mjs');

    expect(wrapper).toContain('stateNeedsGate11Retry');
    expect(wrapper).toContain('gate11Retries < 3');
    expect(wrapper).toContain('Gate 11 fresh live retry');
    expect(wrapper).toContain('Three fresh live DataForSEO retries failed');
    expect(wrapper).toContain('Do not paste credentials into chat.');

    expect(prep).toContain('delete state.runtime.commercial_provider_smoke');
    expect(prep).toContain('delete state.runtime.smoke_verdict_id');
    expect(prep).toContain("state.gates['11'].status = 'PENDING'");
  });

  it('migrates only capability-dependent persisted gates instead of resetting roadmap evidence', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const preflight = await readText('scripts/roadmap-vertex-ai-gateway-preflight.mjs');

    expect(wrapper).toContain("const PREVIOUS_GENERATIVE_ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1'");
    expect(wrapper).toContain("const GENERATIVE_ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1+cloudflare-spa-templates-v1'");
    expect(wrapper).toContain('if (priorArchitecture === PREVIOUS_GENERATIVE_ARCHITECTURE)');
    expect(wrapper).toContain("reopen(state, '1', message)");
    expect(wrapper).toContain("for (const id of ['1', '4', '8'])");
    expect(wrapper).toContain('without resetting unrelated acceptance evidence');
    expect(wrapper).toContain("generative_architecture: GENERATIVE_ARCHITECTURE");
    expect(wrapper).toContain('roadmap-vertex-ai-gateway-preflight.mjs');
    expect(preflight).toContain('Gates 1, 4, 7, and 8 revalidated');
    expect(preflight).toContain('GT-BP-2026-08-15-V2.1.4');
    expect(preflight).toContain('VERTEX_WEBSITE_MODEL = "gemini-3.5-flash"');
    expect(preflight).toContain("custom_website: 'gemini-3.5-flash'");
    expect(preflight).toContain("custom_website_runtime: 'cloudflare_spa'");
    expect(preflight).toContain("website_templates: ['ghosttown_conversion', 'memories_story_editorial']");
  });

  it('runs Gate 14 and 15 through Vertex AI Gateway and restores the canonical acceptance Worker', async () => {
    const gate14 = await readText('scripts/roadmap-gate14-vertex-selection-smoke.mjs');
    const gate15 = await readText('scripts/roadmap-gate15-vertex-structured-smoke.mjs');

    expect(gate14).toContain("task: 'candidate_selection'");
    expect(gate14).toContain("provider !== 'google_vertex_ai'");
    expect(gate14).toContain("gateway !== 'cloudflare_ai_gateway'");
    expect(gate14).toContain('allSelectedIdsSupplied');
    expect(gate14).toContain("runWrangler(['deploy', '--env', 'acceptance'])");
    expect(gate14).not.toContain('generativelanguage.googleapis.com');
    expect(gate14).not.toContain('GEMINI_API_KEY');
    expect(gate14).not.toContain("'npx.cmd'");

    expect(gate15).toContain('runVertexStructuredStage');
    expect(gate15).toContain('stageCount !== 7');
    expect(gate15).toContain("provider !== 'google_vertex_ai'");
    expect(gate15).toContain("gateway !== 'cloudflare_ai_gateway'");
    expect(gate15).toContain("runWrangler(['deploy', '--env', 'acceptance'])");
  });

  it('runs Gate 18 as a live Stripe test-mode checkout routing probe without paying or using production redirects', async () => {
    const gate18 = await readText('scripts/roadmap-gate18-checkout-routing-smoke.mjs');

    expect(gate18).toContain('/api/paid-test/checkout');
    expect(gate18).toContain("stripeUrl.hostname !== 'checkout.stripe.com'");
    expect(gate18).toContain("checkout.body.sessionUrl.includes('cs_test_')");
    expect(gate18).toContain("const PAGES_URL = 'https://ghosttown-acceptance.pages.dev'");
    expect(gate18).toContain("const PRODUCTION_HOSTS = ['ghosttowntest.com', 'lit-ghosttown.app']");
    expect(gate18).toContain("created.status !== 'checkout_created'");
    expect(gate18).toContain("secret_values_recorded: false");
    expect(gate18).not.toMatch(/card|payment_method_data|4242 4242/i);
  });

  it('runs Gate 19 as a read-only remote Stripe test-mode webhook registration probe', async () => {
    const gate19 = await readText('scripts/roadmap-gate19-stripe-webhook-registration-smoke.mjs');

    expect(gate19).toContain("const EXPECTED_WEBHOOK_URL = `${WORKER_URL}/api/webhook/stripe`");
    expect(gate19).toContain("const SIGNING_SECRET_NAME = 'STRIPE_WEBHOOK_SECRET'");
    expect(gate19).toContain("fetch('https://api.stripe.com/v1/webhook_endpoints?limit=100'");
    expect(gate19).toContain("endpoint.livemode !== false");
    expect(gate19).toContain("endpoint.status !== 'enabled'");
    expect(gate19).toContain("enabledEvents.includes('checkout.session.completed')");
    expect(gate19).toContain("secretValuesRecorded: false");
    expect(gate19).toContain("runWrangler(['deploy', '--env', 'acceptance'])");
    expect(gate19).not.toContain('POST /v1/webhook_endpoints');
    expect(gate19).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
  });
});
