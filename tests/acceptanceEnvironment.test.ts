import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

function section(config: string, start: string, next: RegExp) {
  const startIndex = config.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  const rest = config.slice(startIndex);
  const tail = rest.slice(start.length);
  const nextMatch = tail.match(next);
  if (!nextMatch || nextMatch.index === undefined) return rest;
  return rest.slice(0, start.length + nextMatch.index);
}

describe('acceptance Cloudflare environment', () => {
  it('uses isolated acceptance-only storage and Workflow bindings', async () => {
    const config = await readText('wrangler.toml');
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
    expect(acceptance).not.toContain('id = "289662c8981d421ba85a7ca588640650"');
    expect(acceptance).not.toContain('api.ghosttowntest.com');
    expect(acceptance).not.toContain('api.lit-ghosttown.app');
  });

  it('requires Vertex while keeping paid research disabled before live provider acceptance', async () => {
    const config = await readText('wrangler.toml');
    const acceptanceVars = section(config, '[env.acceptance.vars]', /\n\[\[env\.acceptance\./);
    const productionVars = section(config, '[env.production.vars]', /\n\[\[env\.production\./);

    expect(acceptanceVars).toContain('VERTEX_BLUEPRINT_REQUIRED = "true"');
    expect(acceptanceVars).toContain('VERTEX_PROJECT_ID = "ghosttowntest"');
    expect(acceptanceVars).toContain('VERTEX_LOCATION = "us-central1"');
    expect(acceptanceVars).toContain('VERTEX_BLUEPRINT_MODEL = "gemini-2.5-flash"');
    expect(acceptanceVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(productionVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');

    expect(acceptanceVars).toContain('FRONTEND_URL = "REPLACE_AFTER_ACCEPTANCE_FRONTEND_DEPLOY"');
    expect(acceptanceVars).not.toContain('https://ghosttowntest.com');
    expect(acceptanceVars).not.toContain('https://lit-ghosttown.app');
  });

  it('keeps the complete current D1 migration chain available to acceptance', async () => {
    const launchBlueprints = await readText('migrations/0002_launch_blueprints.sql');
    const launchSites = await readText('migrations/0003_launch_sites.sql');
    const executionLog = await readText('migrations/0004_blueprint_execution_log.sql');

    expect(launchBlueprints).toContain('launch_blueprints');
    expect(launchBlueprints).toContain('launch_blueprint_progress');
    expect(launchSites).toContain('launch_sites');
    expect(launchSites).toContain('launch_site_leads');
    expect(executionLog).toContain('blueprint_actions');
    expect(executionLog).toContain('journal_entries');
    expect(executionLog).toContain('checkpoint_reviews');
  });
});
