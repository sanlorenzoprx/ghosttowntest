#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const REPORT_PATH = join(STATE_DIR, 'latest-report.json');
const CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const PAGES_URL = 'https://ghosttown-acceptance.pages.dev';
const BRANCH = 'feat/launch-blueprint-spa';
const ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1+cloudflare-spa-templates-v1';
const AMENDMENT_VERSION = '2.1.4';
const AMENDMENT_SHA = 'e42d70aacef6f36f2f94f5a17dfe4bb58376799e';
const BASE_SHA = '616c691e6b4c9cea93615963a07375d13ffba57f';
const CHANGE_ID = 'GT-BP-2026-08-15-V2.1.4';
const PROVIDER_SECRETS = [
  'DATAFORSEO_LOGIN',
  'DATAFORSEO_PASSWORD',
  'PODCAST_INDEX_API_KEY',
  'PODCAST_INDEX_API_SECRET',
  'YOUTUBE_API_KEY'
];
const VERTEX_SECRETS = [
  'AI_GATEWAY_TOKEN',
  'VERTEX_SERVICE_ACCOUNT_EMAIL',
  'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY',
  'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID'
];

function now() {
  return new Date().toISOString();
}

function run(bin, args = [], allowFailure = false) {
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0 && !allowFailure) {
    throw new Error(`${bin} ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return { status: result.status ?? 0, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function parseSecretNames(value) {
  const names = new Set();
  try {
    const parsed = JSON.parse(value);
    const list = Array.isArray(parsed) ? parsed : parsed?.secrets;
    if (Array.isArray(list)) for (const item of list) if (typeof item?.name === 'string') names.add(item.name);
  } catch {}
  for (const match of value.matchAll(/"name"\s*:\s*"([A-Z][A-Z0-9_]*)"/g)) names.add(match[1]);
  for (const line of value.split(/\r?\n/)) {
    const cell = line.match(/[│|]\s*([A-Z][A-Z0-9_]*)\s*[│|]/);
    if (cell) names.add(cell[1]);
    const plain = line.trim().match(/^([A-Z][A-Z0-9_]{2,})$/);
    if (plain) names.add(plain[1]);
  }
  return [...names].sort();
}

function secretNames() {
  let result = run('npx', ['wrangler', 'secret', 'list', '--env', 'acceptance', '--json'], true);
  if (result.status !== 0) result = run('npx', ['wrangler', 'secret', 'list', '--env', 'acceptance']);
  const names = parseSecretNames(result.stdout || result.stderr);
  if (!names.length) throw new Error('Wrangler returned no parseable acceptance secret names.');
  return names;
}

function readState(config) {
  if (!existsSync(STATE_PATH)) {
    return {
      schema_version: 'roadmap-autopilot-state-v1',
      created_at: now(),
      updated_at: now(),
      source_schema_version: config.schema_version,
      gates: {},
      runtime: {}
    };
  }
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  state.gates ||= {};
  state.runtime ||= {};
  return state;
}

function save(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  state.updated_at = now();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  writeFileSync(REPORT_PATH, `${JSON.stringify({
    generated_at: now(),
    head: run('git', ['rev-parse', 'HEAD']).stdout.trim(),
    passed_gate_count: Object.values(state.gates).filter(item => item.status === 'PASS').length,
    gates: state.gates
  }, null, 2)}\n`, 'utf8');
}

function gate(config, id) {
  const found = config.gates.find(item => item.id === id);
  if (!found) throw new Error(`Roadmap gate ${id} is missing.`);
  return found;
}

function pass(state, config, id, evidence) {
  const definition = gate(config, id);
  state.gates[String(id)] = {
    id,
    phase: definition.phase,
    slug: definition.slug,
    title: definition.title,
    status: 'PASS',
    checked_at: now(),
    head: run('git', ['rev-parse', 'HEAD']).stdout.trim(),
    evidence,
    message: ''
  };
}

function section(text, header, next) {
  const start = text.indexOf(header);
  if (start < 0) throw new Error(`Missing ${header}`);
  const tail = text.slice(start + header.length);
  const match = tail.match(next);
  return match?.index === undefined ? text.slice(start) : text.slice(start, start + header.length + match.index);
}

async function livePairing() {
  const htmlResponse = await fetch(PAGES_URL);
  if (htmlResponse.status !== 200) throw new Error(`Acceptance Pages returned HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const scriptMatch = html.match(/<script[^>]+src=["']([^"']+\.js)["']/i);
  if (!scriptMatch) throw new Error('Acceptance Pages did not expose a Vite JS asset.');
  const jsUrl = new URL(scriptMatch[1], PAGES_URL).toString();
  const jsResponse = await fetch(jsUrl);
  if (!jsResponse.ok) throw new Error(`Acceptance JS asset returned HTTP ${jsResponse.status}`);
  const js = await jsResponse.text();
  if (!js.includes(WORKER_URL)) throw new Error('Acceptance Pages bundle is not paired to the exact acceptance Worker URL.');

  const preflight = async origin => fetch(`${WORKER_URL}/api/verdict`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization'
    }
  });
  const allowed = await preflight(PAGES_URL);
  if (allowed.status !== 200 || allowed.headers.get('access-control-allow-origin') !== PAGES_URL) {
    throw new Error('Acceptance CORS pairing failed.');
  }
  const denied = await preflight('https://ghosttowntest.com');
  if (denied.headers.get('access-control-allow-origin')) throw new Error('Acceptance Worker allows the production frontend origin.');
  return { js_url: jsUrl, acceptance_origin_allowed: true, production_origin_denied: true };
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const state = readState(config);
if (state.runtime.generative_architecture !== ARCHITECTURE) process.exit(0);

const branch = run('git', ['branch', '--show-current']).stdout.trim();
if (branch !== BRANCH) throw new Error(`Expected branch ${BRANCH}; current branch is ${branch || '(detached)'}.`);
const tracked = run('git', ['status', '--short', '--untracked-files=no']).stdout.trim();
if (tracked) throw new Error(`Tracked working tree changes exist. Commit/stash them before autopilot:\n${tracked}`);

const verified = run('npm', ['run', 'verify:blueprint']);
const verifyOutput = `${verified.stdout}\n${verified.stderr}`;
for (const token of [AMENDMENT_VERSION, AMENDMENT_SHA, BASE_SHA, CHANGE_ID]) {
  if (!verifyOutput.includes(token)) throw new Error(`Blueprint verifier did not confirm ${token}.`);
}
pass(state, config, 1, {
  branch,
  canonical_base_blob_sha1: BASE_SHA,
  amendment_version: AMENDMENT_VERSION,
  amendment_blob_sha1: AMENDMENT_SHA,
  change_id: CHANGE_ID,
  custom_website_runtime: 'cloudflare_spa',
  website_templates: ['ghosttown_conversion', 'memories_story_editorial']
});

const wrangler = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
const acceptance = section(wrangler, '[env.acceptance]', /\n\[env\.development(?:\.vars)?\]/);
const acceptanceVars = section(wrangler, '[env.acceptance.vars]', /\n\[\[env\.acceptance\./);
const productionVars = section(wrangler, '[env.production.vars]', /\n\[\[env\.production\./);
const requiredAcceptance = [
  'workers_dev = true',
  'DEPLOYMENT_ENV = "acceptance"',
  'AI_GATEWAY_ID = "default"',
  'VERTEX_PROJECT_ID = "ghosttowntest"',
  'VERTEX_LOCATION = "us"',
  'VERTEX_VERDICT_MODEL = "gemini-3.5-flash-lite"',
  'VERTEX_SELECTION_MODEL = "gemini-3.5-flash-lite"',
  'VERTEX_RESEARCH_MODEL = "gemini-3.5-flash"',
  'VERTEX_BLUEPRINT_MODEL = "gemini-3.5-flash"',
  'VERTEX_WEBSITE_MODEL = "gemini-3.5-flash"',
  'VERTEX_BLUEPRINT_REQUIRED = "true"',
  'DISTRIBUTION_FOOTPRINT_ENABLED = "false"',
  `FRONTEND_URL = "${PAGES_URL}"`,
  '849e13521d454361aea286b8e1a5e4c7',
  '9863d883-3c31-4268-9a98-8392fa3b9f8f',
  'ghosttowntest-private-blueprints-acceptance',
  'ghosttown-launch-blueprint-acceptance'
];
for (const token of requiredAcceptance) {
  if (!acceptance.includes(token) && !acceptanceVars.includes(token)) throw new Error(`Acceptance config missing ${token}.`);
}
for (const forbidden of ['GEMINI_RESEARCH_MODEL', 'GEMINI_GOOGLE_SEARCH_MODEL', 'AI_MODEL =', 'ACTION_PLAN_AI_MODEL =']) {
  if (acceptanceVars.includes(forbidden) || productionVars.includes(forbidden)) {
    throw new Error(`Legacy active generative config remains after v2.1.4: ${forbidden}`);
  }
}
if (!productionVars.includes('DISTRIBUTION_FOOTPRINT_ENABLED = "false"')) throw new Error('Production paid research is not explicitly disabled.');
run('npm', ['run', 'acceptance:check']);
const pairing = await livePairing();
pass(state, config, 4, {
  ...pairing,
  generative_platform: 'google_vertex_ai',
  routing: 'cloudflare_ai_gateway',
  gateway_id: 'default',
  vertex_location: 'us',
  custom_website_capability: 'separate_post_blueprint_service',
  custom_website_runtime: 'cloudflare_spa',
  website_templates: ['ghosttown_conversion', 'memories_story_editorial'],
  production_auto_deploy: false,
  acceptance_research_disabled: true,
  production_research_disabled: true
});

const names = secretNames();
state.runtime.acceptance_secret_names = names;
const nameSet = new Set(names);
const missingProviders = PROVIDER_SECRETS.filter(name => !nameSet.has(name));
if (missingProviders.length) throw new Error(`INPUT_REQUIRED: acceptance is missing provider secret names: ${missingProviders.join(', ')}.`);
pass(state, config, 7, {
  required_names_present: PROVIDER_SECRETS,
  gemini_api_key_required: false,
  secret_values_recorded: false
});

const missingVertex = VERTEX_SECRETS.filter(name => !nameSet.has(name));
if (missingVertex.length) throw new Error(`INPUT_REQUIRED: acceptance is missing Vertex service-account secret names: ${missingVertex.join(', ')}.`);
pass(state, config, 8, {
  project: 'ghosttowntest',
  location: 'us',
  gateway_id: 'default',
  models: {
    verdict: 'gemini-3.5-flash-lite',
    candidate_selection: 'gemini-3.5-flash-lite',
    grounded_research: 'gemini-3.5-flash',
    blueprint: 'gemini-3.5-flash',
    custom_website: 'gemini-3.5-flash'
  },
  website_capability_separate_from_blueprint: true,
  website_runtime: 'cloudflare_spa',
  website_templates: ['ghosttown_conversion', 'memories_story_editorial'],
  required: true,
  secret_names_present: VERTEX_SECRETS,
  secret_values_recorded: false
});

save(state);
console.log('Vertex AI Gateway + Custom Website Cloudflare SPA template preflight PASS: Gates 1, 4, 7, and 8 revalidated without exposing secret values.');
