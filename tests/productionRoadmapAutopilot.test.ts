import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('production roadmap autopilot contract', () => {
  it('decomposes the authoritative 25-step critical path into exactly 47 ordered executable gates', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      source: { source_critical_path_steps: number; executable_gate_decomposition: number };
      gates: Array<{ id: number; phase: number; mode: string; mutation_scope: string; requires_user_input: boolean }>;
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

  it('records only secret names and redacts common credential shapes from persisted/logged evidence', async () => {
    const script = await readText('scripts/production-roadmap-autopilot.mjs');

    expect(script).toContain("secret', 'list'");
    expect(script).toContain('secret_values_recorded: false');
    expect(script).toContain('[REDACTED_STRIPE_KEY]');
    expect(script).toContain('[REDACTED_WEBHOOK_SECRET]');
    expect(script).toContain('[REDACTED_PRIVATE_KEY]');
    expect(script).not.toContain('wrangler secret get');
  });

  it('has built-in automation through live provider preview smokes before requiring external adapters', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; handler?: string; hook_env?: string }>;
    };

    for (const id of Array.from({ length: 13 }, (_, index) => index + 1)) {
      expect(config.gates[id - 1].mode).toBe('auto');
      expect(config.gates[id - 1].handler).toEqual(expect.any(String));
    }
    expect(config.gates[13]).toMatchObject({
      id: 14,
      mode: 'hook',
      hook_env: 'ROADMAP_GATE_14_COMMAND'
    });
  });

  it('preserves argument boundaries for Windows shell execution used by remote D1 and bundle checks', async () => {
    const packageJson = JSON.parse(await readText('package.json')) as { scripts: Record<string, string> };
    const compat = await readText('scripts/roadmap-windows-spawn-compat.cjs');

    expect(packageJson.scripts['roadmap:autopilot']).toContain('--require ./scripts/roadmap-windows-spawn-compat.cjs');
    expect(packageJson.scripts['roadmap:status']).toContain('--require ./scripts/roadmap-windows-spawn-compat.cjs');
    expect(packageJson.scripts['roadmap:reset']).toContain('--require ./scripts/roadmap-windows-spawn-compat.cjs');
    expect(compat).toContain("args.indexOf('--command')");
    expect(compat).toContain("normalized.splice(commandIndex, 2, '--file', file.relative)");
    expect(compat).toContain("args[0] === '-e'");
    expect(compat).toContain('syncBuiltinESMExports()');
  });

  it('auto-repairs acceptance-only D1 schema drift when the migration ledger is already complete', async () => {
    const packageJson = JSON.parse(await readText('package.json')) as { scripts: Record<string, string> };
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mutation_scope: string }>;
    };
    const repair = await readText('scripts/roadmap-acceptance-schema-repair.mjs');

    expect(packageJson.scripts['roadmap:autopilot']).toContain('scripts/roadmap-acceptance-schema-repair.mjs');
    expect(config.gates.find(gate => gate.id === 10)?.mutation_scope).toBe('acceptance');
    expect(repair).toContain("const DATABASE = 'ghosttowntest-blueprints-acceptance'");
    expect(repair).toContain("const ENVIRONMENT = 'acceptance'");
    expect(repair).toContain("state?.gates?.['9']?.status === 'PASS'");
    expect(repair).toContain('/No migrations to apply/i');
    expect(repair).toContain("'migrations/0002_launch_blueprints.sql'");
    expect(repair).toContain("'migrations/0003_launch_sites.sql'");
    expect(repair).toContain("'migrations/0004_blueprint_execution_log.sql'");
    expect(repair).not.toContain('--env production');
  });
});
