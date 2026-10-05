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
  it('hard-routes the acceptance Pages host to the acceptance Worker', async () => {
    const api = await readText('src/lib/api.ts');
    expect(api).toContain("hostname === 'main.ghosttown-acceptance.pages.dev'");
    expect(api).toContain("hostname.endsWith('.ghosttown-acceptance.pages.dev')");
    expect(api).toContain("return 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev'");
    const acceptanceRoute = api.indexOf("hostname === 'main.ghosttown-acceptance.pages.dev'");
    const genericPagesFallback = api.indexOf("hostname.endsWith('.pages.dev')");
    expect(acceptanceRoute).toBeGreaterThanOrEqual(0);
    expect(genericPagesFallback).toBeGreaterThan(acceptanceRoute);
  });

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
    expect(acceptance).toContain('[env.acceptance.ai]');
    expect(acceptance).toContain('binding = "AI"');

    expect(acceptance).not.toContain('ghosttowntest-public-videos');
    expect(acceptance).not.toContain('id = "289662c8981d421ba85a7ca588640650"');
    expect(acceptance).not.toContain('api.ghosttowntest.com');
    expect(acceptance).not.toContain('api.lit-ghosttown.app');
  });

  it('binds the authorized production Blueprint runtime only to production resources', async () => {
    const config = await readText('wrangler.toml');
    const production = section(config, '[env.production]', /\n\[env\.acceptance\]/);

    expect(production).toContain('api.ghosttowntest.com');
    expect(production).toContain('binding = "KV"');
    expect(production).toContain('id = "289662c8981d421ba85a7ca588640650"');
    expect(production).toContain('binding = "DB"');
    expect(production).toContain('database_name = "ghosttowntest-blueprints"');
    expect(production).toContain('database_id = "7d9dfed2-e25d-4a1d-b692-c60709287324"');
    expect(production).toContain('migrations_dir = "migrations"');
    expect(production).toContain('binding = "BLUEPRINTS"');
    expect(production).toContain('bucket_name = "ghosttowntest-private-blueprints"');
    expect(production).toContain('binding = "LAUNCH_BLUEPRINT_WORKFLOW"');
    expect(production).toContain('name = "ghosttown-launch-blueprint"');
    expect(production).toContain('class_name = "LaunchBlueprintWorkflow"');
    expect(production).not.toContain('ghosttowntest-private-blueprints-acceptance');
    expect(production).not.toContain('9863d883-3c31-4268-9a98-8392fa3b9f8f');
  });

  it('uses one Vertex AI platform while keeping general research off and enabling only paid release research', async () => {
    const config = await readText('wrangler.toml');
    const acceptanceVars = section(config, '[env.acceptance.vars]', /\n\[\[env\.acceptance\./);
    const productionVars = section(config, '[env.production.vars]', /\n\[\[env\.production\./);

    expect(acceptanceVars).toContain('DEPLOYMENT_ENV = "acceptance"');
    expect(productionVars).toContain('DEPLOYMENT_ENV = "production"');
    expect(acceptanceVars).toContain('AI_GATEWAY_ID = "default"');
    expect(acceptanceVars).toContain('VERTEX_BLUEPRINT_REQUIRED = "true"');
    expect(acceptanceVars).toContain('VERTEX_PROJECT_ID = "ghosttowntest"');
    expect(acceptanceVars).toContain('VERTEX_LOCATION = "us"');
    expect(acceptanceVars).toContain('VERTEX_VERDICT_MODEL = "gemini-3.5-flash-lite"');
    expect(acceptanceVars).toContain('VERTEX_SELECTION_MODEL = "gemini-3.5-flash-lite"');
    expect(acceptanceVars).toContain('VERTEX_RESEARCH_MODEL = "gemini-3.5-flash"');
    expect(acceptanceVars).toContain('VERTEX_BLUEPRINT_MODEL = "gemini-3.5-flash"');
    expect(acceptanceVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(acceptanceVars).toContain('PAID_BLUEPRINT_RESEARCH_ENABLED = "true"');

    expect(productionVars).toContain('VERTEX_PROJECT_ID = "ghosttowntest"');
    expect(productionVars).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(productionVars).toContain('PAID_BLUEPRINT_RESEARCH_ENABLED = "true"');

    for (const legacy of ['GEMINI_RESEARCH_MODEL', 'GEMINI_GOOGLE_SEARCH_MODEL', 'AI_MODEL =', 'ACTION_PLAN_AI_MODEL =']) {
      expect(acceptanceVars).not.toContain(legacy);
      expect(productionVars).not.toContain(legacy);
    }

    expect(acceptanceVars).toContain('FRONTEND_URL = "https://main.ghosttown-acceptance.pages.dev"');
    expect(acceptanceVars).not.toContain('https://ghosttowntest.com');
    expect(acceptanceVars).not.toContain('https://lit-ghosttown.app');
  });

  it('keeps the complete current D1 migration chain available to acceptance and production', async () => {
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
