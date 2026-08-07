import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readWranglerConfig() {
  return readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
}

function section(config: string, start: string, next: RegExp) {
  const startIndex = config.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  const rest = config.slice(startIndex);
  const nextMatch = rest.slice(start.length).match(next);
  if (!nextMatch?.index) return rest;
  return rest.slice(0, start.length + nextMatch.index);
}

describe('acceptance Cloudflare environment', () => {
  it('uses isolated D1, private R2, KV, and Workflow bindings', async () => {
    const config = await readWranglerConfig();
    const acceptance = section(config, '[env.acceptance]', /\n\[env\.(production|development)\]/);
    expect(acceptance).toContain('workers_dev = true');
    expect(acceptance).toContain('binding = "KV"');
    expect(acceptance).toContain('id = "849e13521d454361aea286b8e1a5e4c7"');
    expect(acceptance).toContain('binding = "DB"');
    expect(acceptance).toContain('database_name = "ghosttowntest-blueprints-acceptance"');
    expect(acceptance).toContain('database_id = "9863d883-3c31-4268-9a98-8392fa3b9f8f"');
    expect(acceptance).toContain('migrations_dir = "migrations"');
    expect(acceptance).toContain('binding = "BLUEPRINTS"');
    expect(acceptance).toContain('bucket_name = "ghosttowntest-private-blueprints-acceptance"');
    expect(acceptance).toContain('binding = "LAUNCH_BLUEPRINT_WORKFLOW"');
    expect(acceptance).toContain('name = "ghosttown-launch-blueprint-acceptance"');
    expect(acceptance).toContain('class_name = "LaunchBlueprintWorkflow"');
    expect(acceptance).not.toContain('ghosttowntest-public-videos');
    expect(acceptance).not.toContain('ghosttowntest-blueprints"\n');
    expect(acceptance).not.toContain('api.ghosttowntest.com');
  });

  it('keeps paid research disabled until provider smoke tests pass', async () => {
    const config = await readWranglerConfig();
    const acceptanceVars = section(config, '[env.acceptance.vars]', /\n\[\[env\.acceptance\./);
    const productionVars = section(config, '[env.production.vars]', /\n\[\[env\.production\./);
    expect(acceptanceVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(productionVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(acceptanceVars).toContain('FRONTEND_URL = "https://acceptance.ghosttowntest.pages.dev"');
    expect(acceptanceVars).not.toContain('REPLACE_AFTER_FRONTEND_DEPLOY');
  });
});
