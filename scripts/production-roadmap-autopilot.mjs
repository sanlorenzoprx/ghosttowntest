#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const REPORT_PATH = join(STATE_DIR, 'latest-report.json');

const EXPECTED = Object.freeze({
  branch: 'feat/launch-blueprint-spa',
  canonicalVersion: '2.1.1',
  canonicalBlobSha1: '616c691e6b4c9cea93615963a07375d13ffba57f',
  canonicalId: 'GT-BP-2026-08-07-V2.1.1',
  workerUrl: 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev',
  pagesUrl: 'https://ghosttown-acceptance.pages.dev',
  pagesProject: 'ghosttown-acceptance',
  kvId: '849e13521d454361aea286b8e1a5e4c7',
  kvTitle: 'ghosttown-acceptance',
  d1Id: '9863d883-3c31-4268-9a98-8392fa3b9f8f',
  d1Name: 'ghosttowntest-blueprints-acceptance',
  r2Name: 'ghosttowntest-private-blueprints-acceptance',
  workflowName: 'ghosttown-launch-blueprint-acceptance',
  workflowClass: 'LaunchBlueprintWorkflow',
  workflowScript: 'lit-ghost-town-api-acceptance'
});

const REQUIRED = Object.freeze({
  stripeAuth: [
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID',
    'STRIPE_30_DAY_PLAN_PRICE_ID'
  ],
  providerSecrets: [
    'DATAFORSEO_LOGIN',
    'DATAFORSEO_PASSWORD',
    'PODCAST_INDEX_API_KEY',
    'PODCAST_INDEX_API_SECRET',
    'YOUTUBE_API_KEY',
    'GEMINI_API_KEY'
  ],
  vertexSecrets: [
    'VERTEX_SERVICE_ACCOUNT_EMAIL',
    'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY',
    'VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID'
  ],
  d1Tables: [
    'launch_blueprints',
    'launch_blueprint_progress',
    'launch_sites',
    'launch_site_leads',
    'accounts',
    'blueprints',
    'blueprint_actions',
    'action_progress',
    'journal_entries',
    'journal_evidence',
    'reminder_preferences',
    'scheduled_reminders',
    'checkpoint_reviews',
    'acs_readiness_assessments'
  ]
});

const argv = new Set(process.argv.slice(2));
const statusOnly = argv.has('--status');
const reset = argv.has('--reset');
const noResume = argv.has('--no-resume');

function now() {
  return new Date().toISOString();
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function redact(value) {
  return String(value ?? '')
    .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+)\b/g, '[REDACTED_STRIPE_KEY]')
    .replace(/\b(whsec_[A-Za-z0-9_-]+)\b/g, '[REDACTED_WEBHOOK_SECRET]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/("?(?:password|secret|private_key|api_key|token)"?\s*[:=]\s*)["']?[^"'\s,}]+["']?/gi, '$1[REDACTED]');
}

function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  ensureStateDir();
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadState(config) {
  if (noResume || !existsSync(STATE_PATH)) {
    return {
      schema_version: 'roadmap-autopilot-state-v1',
      created_at: now(),
      updated_at: now(),
      source_schema_version: config.schema_version,
      gates: {},
      runtime: {}
    };
  }
  const state = readJson(STATE_PATH);
  if (state.source_schema_version !== config.schema_version) {
    throw new Error(`State was created for ${state.source_schema_version}; run with --reset before using ${config.schema_version}.`);
  }
  state.gates ||= {};
  state.runtime ||= {};
  return state;
}

function saveState(state) {
  state.updated_at = now();
  writeJson(STATE_PATH, state);
}

function safetyCheckCommand(commandText) {
  const normalized = commandText.toLowerCase().replace(/\s+/g, ' ');
  const forbidden = [
    '--env production',
    '--environment production',
    '--project-name ghosttowntest ',
    '--project-name=ghosttowntest ',
    'wrangler deploy --env=production',
    'wrangler deploy --env production'
  ];
  const hit = forbidden.find(token => normalized.includes(token));
  if (hit) {
    throw new Error(`SAFETY_STOP: autopilot refuses production mutation command containing "${hit.trim()}". Gate 36 is always manual.`);
  }
}

function commandText(bin, args = []) {
  return [bin, ...args].join(' ');
}

function run(bin, args = [], options = {}) {
  const text = commandText(bin, args);
  safetyCheckCommand(text);
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: 32 * 1024 * 1024
  });
  const stdout = stripAnsi(result.stdout || '');
  const stderr = stripAnsi(result.stderr || '');
  if (result.error) {
    throw new Error(`${text} could not start: ${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${text} failed (${result.status}).\n${redact(stderr || stdout)}`.trim());
  }
  return { status: result.status ?? 0, stdout, stderr };
}

function runShellHook(hook, gate) {
  safetyCheckCommand(hook);
  const result = spawnSync(hook, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, ROADMAP_GATE_ID: String(gate.id), ROADMAP_GATE_SLUG: gate.slug },
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Gate ${gate.id} hook failed (${result.status}).\n${redact(result.stderr || result.stdout)}`.trim());
  }
  return {
    hook: gate.hook_env,
    exit_code: result.status ?? 0,
    output_sha256: createHash('sha256').update(String(result.stdout || '')).digest('hex')
  };
}

function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  try {
    return JSON.parse(clean);
  } catch {}
  const starts = [clean.indexOf('['), clean.indexOf('{')].filter(index => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = clean.length; end > start; end -= 1) {
      const last = clean[end - 1];
      if (last !== ']' && last !== '}') continue;
      try {
        return JSON.parse(clean.slice(start, end));
      } catch {}
    }
  }
  return null;
}

function tomlSection(text, startHeader, nextHeaderRegex) {
  const start = text.indexOf(startHeader);
  if (start < 0) throw new Error(`Missing TOML section ${startHeader}`);
  const tail = text.slice(start + startHeader.length);
  const match = tail.match(nextHeaderRegex);
  return match?.index === undefined ? text.slice(start) : text.slice(start, start + startHeader.length + match.index);
}

function tomlVariableNames(section) {
  const names = new Set();
  for (const match of section.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gm)) names.add(match[1]);
  return names;
}

function getHead() {
  return run('git', ['rev-parse', 'HEAD']).stdout.trim();
}

function getBranch() {
  return run('git', ['branch', '--show-current']).stdout.trim();
}

function getTrackedStatus() {
  return run('git', ['status', '--short', '--untracked-files=no']).stdout.trim();
}

function findAllObjectNames(value, names = []) {
  if (Array.isArray(value)) {
    for (const item of value) findAllObjectNames(item, names);
  } else if (value && typeof value === 'object') {
    if (typeof value.name === 'string') names.push(value.name);
    for (const child of Object.values(value)) findAllObjectNames(child, names);
  }
  return names;
}

function parseSecretNames(text) {
  const names = new Set();
  const parsed = parseLooseJson(text);
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item.name === 'string') names.add(item.name);
    }
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.secrets)) {
    for (const item of parsed.secrets) {
      if (item && typeof item.name === 'string') names.add(item.name);
    }
  }
  for (const match of stripAnsi(text).matchAll(/"name"\s*:\s*"([A-Z][A-Z0-9_]*)"/g)) names.add(match[1]);
  for (const line of stripAnsi(text).split(/\r?\n/)) {
    const cell = line.match(/[│|]\s*([A-Z][A-Z0-9_]*)\s*[│|]/);
    if (cell) names.add(cell[1]);
    const plain = line.trim().match(/^([A-Z][A-Z0-9_]{2,})$/);
    if (plain) names.add(plain[1]);
  }
  return [...names].sort();
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init = {}, timeoutMs = 20000) {
  const response = await fetchWithTimeout(url, init, timeoutMs);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${response.status}`);
  }
  return { response, body };
}

async function preflight(origin) {
  return fetchWithTimeout(`${EXPECTED.workerUrl}/api/verdict`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization'
    }
  });
}

async function verifyLivePairing() {
  const htmlResponse = await fetchWithTimeout(EXPECTED.pagesUrl);
  if (htmlResponse.status !== 200) throw new Error(`Acceptance Pages returned HTTP ${htmlResponse.status}`);
  const html = await htmlResponse.text();
  const scriptMatch = html.match(/<script[^>]+src=["']([^"']+\.js)["']/i);
  if (!scriptMatch) throw new Error('Acceptance Pages HTML did not expose a Vite JS asset.');
  const jsUrl = new URL(scriptMatch[1], EXPECTED.pagesUrl).toString();
  const jsResponse = await fetchWithTimeout(jsUrl);
  if (!jsResponse.ok) throw new Error(`Acceptance JS asset returned HTTP ${jsResponse.status}`);
  const js = await jsResponse.text();
  if (!js.includes(EXPECTED.workerUrl)) throw new Error('Live acceptance Pages bundle does not contain the exact acceptance Worker URL.');

  const allowed = await preflight(EXPECTED.pagesUrl);
  const allowedOrigin = allowed.headers.get('access-control-allow-origin');
  if (allowed.status !== 200 || allowedOrigin !== EXPECTED.pagesUrl) {
    throw new Error(`Acceptance CORS allow test failed: HTTP ${allowed.status}, origin=${allowedOrigin}`);
  }

  const denied = await preflight('https://ghosttowntest.com');
  if (denied.headers.get('access-control-allow-origin')) {
    throw new Error('Acceptance Worker still emits Access-Control-Allow-Origin for production ghosttowntest.com.');
  }
  return { js_url: jsUrl, acceptance_origin_allowed: true, production_origin_denied: true };
}

function acceptanceToml() {
  const config = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
  return {
    full: config,
    acceptance: tomlSection(config, '[env.acceptance]', /\n\[env\.development(?:\.vars)?\]/),
    production: tomlSection(config, '[env.production]', /\n\[env\.acceptance\]/),
    acceptanceVars: tomlSection(config, '[env.acceptance.vars]', /\n\[\[env\.acceptance\./),
    productionVars: tomlSection(config, '[env.production.vars]', /\n\[\[env\.production\./)
  };
}

function secretInventory() {
  let result = run('npx', ['wrangler', 'secret', 'list', '--env', 'acceptance', '--json'], { allowFailure: true });
  if (result.status !== 0) result = run('npx', ['wrangler', 'secret', 'list', '--env', 'acceptance']);
  const names = parseSecretNames(result.stdout || result.stderr);
  if (!names.length) throw new Error('Wrangler returned no parseable acceptance secret names.');
  return names;
}

function configuredNames(state) {
  const { acceptanceVars } = acceptanceToml();
  const vars = tomlVariableNames(acceptanceVars);
  const secrets = new Set(state.runtime.acceptance_secret_names || secretInventory());
  state.runtime.acceptance_secret_names = [...secrets].sort();
  return new Set([...vars, ...secrets]);
}

async function ensureSmokeVerdict(state) {
  if (state.runtime.smoke_verdict_id) return state.runtime.smoke_verdict_id;
  const payload = {
    idea: {
      ideaName: `Roadmap acceptance smoke ${Date.now()}`,
      description: 'A lightweight customer acquisition planning service for small businesses.',
      targetUser: 'small business owners',
      painfulProblem: 'They struggle to find repeatable customer acquisition channels.',
      currentAlternative: 'Ad hoc referrals and social posting.',
      motivation: 'Prove live provider authentication before a paid acceptance purchase.'
    },
    answers: {},
    public_content_acknowledged: true,
    locale: 'en-US'
  };
  const { response, body } = await fetchJson(`${EXPECTED.workerUrl}/api/verdict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, 60000);
  if (!response.ok || typeof body.resultId !== 'string') {
    throw new Error(`Could not create acceptance smoke verdict: HTTP ${response.status}`);
  }
  state.runtime.smoke_verdict_id = body.resultId;
  saveState(state);
  return body.resultId;
}

async function researchPreview(state, signalType) {
  const cacheKey = signalType === 'commercial' ? 'commercial_provider_smoke' : 'audience_provider_smoke';
  if (state.runtime[cacheKey]) return state.runtime[cacheKey];
  const resultId = await ensureSmokeVerdict(state);
  const body = {
    resultId,
    ideaSummary: 'small business customer acquisition and marketing software',
    typedSeed: signalType === 'commercial' ? 'small business customer acquisition software' : 'small business marketing podcasts and video channels',
    signalType,
    locale: 'en'
  };
  const { response, body: result } = await fetchJson(`${EXPECTED.workerUrl}/api/research-preview/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, 45000);
  if (!response.ok) throw new Error(`Research preview ${signalType} failed: HTTP ${response.status} ${redact(JSON.stringify(result))}`);
  const evidence = {
    suggestion_count: Array.isArray(result.suggestions) ? result.suggestions.length : 0,
    providers: [...new Set((result.suggestions || []).map(item => item?.provider).filter(Boolean))].sort(),
    warning_present: Boolean(result.warning)
  };
  state.runtime[cacheKey] = evidence;
  saveState(state);
  return evidence;
}

const handlers = {
  async freezeContract(_gate, state) {
    const branch = getBranch();
    if (branch !== EXPECTED.branch) throw new Error(`Expected branch ${EXPECTED.branch}; current branch is ${branch || '(detached)'}.`);
    const tracked = getTrackedStatus();
    if (tracked) throw new Error(`Tracked working tree changes exist. Commit/stash them before autopilot:\n${tracked}`);
    const verify = run('npm', ['run', 'verify:blueprint']);
    const output = `${verify.stdout}\n${verify.stderr}`;
    for (const required of [EXPECTED.canonicalVersion, EXPECTED.canonicalBlobSha1, EXPECTED.canonicalId]) {
      if (!output.includes(required)) throw new Error(`Blueprint verifier did not confirm ${required}.`);
    }
    return { head: getHead(), branch, canonical_version: EXPECTED.canonicalVersion, canonical_blob_sha1: EXPECTED.canonicalBlobSha1 };
  },

  async acceptanceReachability() {
    const health = await fetchJson(`${EXPECTED.workerUrl}/api/integrations/shorts-factory/health`);
    if (!health.response.ok || health.body.status !== 'ok') throw new Error(`Acceptance Worker health failed: HTTP ${health.response.status}`);
    const pages = await fetchWithTimeout(EXPECTED.pagesUrl);
    if (pages.status !== 200) throw new Error(`Acceptance Pages returned HTTP ${pages.status}`);
    return { worker_status: health.body.status, worker_service: health.body.service, pages_status: pages.status };
  },

  async acceptanceResourceIdentity() {
    const kvResult = run('npx', ['wrangler', 'kv', 'namespace', 'list']);
    const kv = parseLooseJson(kvResult.stdout);
    if (!Array.isArray(kv) || !kv.some(item => item?.id === EXPECTED.kvId && item?.title === EXPECTED.kvTitle)) {
      throw new Error('Acceptance KV namespace identity does not match the canonical acceptance config.');
    }
    const d1Result = run('npx', ['wrangler', 'd1', 'list', '--json']);
    const d1 = parseLooseJson(d1Result.stdout);
    if (!Array.isArray(d1) || !d1.some(item => item?.uuid === EXPECTED.d1Id && item?.name === EXPECTED.d1Name)) {
      throw new Error('Acceptance D1 identity does not match the canonical acceptance config.');
    }
    const r2 = run('npx', ['wrangler', 'r2', 'bucket', 'list']).stdout;
    if (!r2.includes(EXPECTED.r2Name)) throw new Error(`Missing acceptance R2 bucket ${EXPECTED.r2Name}.`);
    const workflows = run('npx', ['wrangler', 'workflows', 'list']).stdout;
    for (const token of [EXPECTED.workflowName, EXPECTED.workflowClass, EXPECTED.workflowScript]) {
      if (!workflows.includes(token)) throw new Error(`Workflow inventory is missing ${token}.`);
    }
    return {
      kv: { id: EXPECTED.kvId, title: EXPECTED.kvTitle },
      d1: { id: EXPECTED.d1Id, name: EXPECTED.d1Name },
      r2: EXPECTED.r2Name,
      workflow: EXPECTED.workflowName
    };
  },

  async acceptanceIsolation() {
    const { acceptance, acceptanceVars, productionVars } = acceptanceToml();
    const requiredAcceptance = [
      'workers_dev = true',
      'DEPLOYMENT_ENV = "acceptance"',
      'DISTRIBUTION_FOOTPRINT_ENABLED = "false"',
      'VERTEX_BLUEPRINT_REQUIRED = "true"',
      'VERTEX_PROJECT_ID = "ghosttowntest"',
      'VERTEX_LOCATION = "us-central1"',
      'VERTEX_BLUEPRINT_MODEL = "gemini-2.5-flash"',
      `FRONTEND_URL = "${EXPECTED.pagesUrl}"`,
      EXPECTED.kvId,
      EXPECTED.d1Id,
      EXPECTED.r2Name,
      EXPECTED.workflowName
    ];
    for (const token of requiredAcceptance) if (!acceptance.includes(token) && !acceptanceVars.includes(token)) throw new Error(`Acceptance config missing ${token}.`);
    for (const forbidden of ['api.ghosttowntest.com', 'api.lit-ghosttown.app', '289662c8981d421ba85a7ca588640650']) {
      if (acceptance.includes(forbidden)) throw new Error(`Acceptance config contains production binding/domain ${forbidden}.`);
    }
    if (!productionVars.includes('DISTRIBUTION_FOOTPRINT_ENABLED = "false"')) {
      throw new Error('Production paid research is not explicitly disabled.');
    }

    run('npm', ['run', 'acceptance:check']);
    const pairing = await verifyLivePairing();
    return { ...pairing, vertex_required: true, acceptance_research_disabled: true, production_research_disabled: true };
  },

  async acceptanceSecretInventory(_gate, state) {
    const names = secretInventory();
    state.runtime.acceptance_secret_names = names;
    saveState(state);
    return { secret_names: names, secret_values_recorded: false };
  },

  async stripeAuthConfig(_gate, state) {
    const names = configuredNames(state);
    const missing = REQUIRED.stripeAuth.filter(name => !names.has(name));
    if (missing.length) {
      const error = new Error(`INPUT_REQUIRED: acceptance is missing required Stripe/auth configuration names: ${missing.join(', ')}. Configure them with Cloudflare secret/variable mechanisms; never paste values into chat.`);
      error.code = 'INPUT_REQUIRED';
      throw error;
    }
    return { required_names_present: REQUIRED.stripeAuth, optional_legacy_name_present: names.has('STRIPE_PAID_TEST_PRICE_ID') };
  },

  async providerSecretConfig(_gate, state) {
    const names = configuredNames(state);
    const missing = REQUIRED.providerSecrets.filter(name => !names.has(name));
    if (missing.length) {
      const error = new Error(`INPUT_REQUIRED: acceptance is missing provider secret names: ${missing.join(', ')}. Configure them securely; do not paste values into chat.`);
      error.code = 'INPUT_REQUIRED';
      throw error;
    }
    return { required_names_present: REQUIRED.providerSecrets };
  },

  async vertexConfig(_gate, state) {
    const names = configuredNames(state);
    const missingSecrets = REQUIRED.vertexSecrets.filter(name => !names.has(name));
    const { acceptanceVars } = acceptanceToml();
    const vars = [
      'VERTEX_PROJECT_ID = "ghosttowntest"',
      'VERTEX_LOCATION = "us-central1"',
      'VERTEX_BLUEPRINT_MODEL = "gemini-2.5-flash"',
      'VERTEX_BLUEPRINT_REQUIRED = "true"'
    ];
    const missingVars = vars.filter(token => !acceptanceVars.includes(token));
    if (missingSecrets.length || missingVars.length) {
      const error = new Error(`INPUT_REQUIRED: Vertex acceptance config incomplete. Missing secret names: ${missingSecrets.join(', ') || 'none'}; missing vars: ${missingVars.join(', ') || 'none'}.`);
      error.code = 'INPUT_REQUIRED';
      throw error;
    }
    return { project: 'ghosttowntest', location: 'us-central1', model: 'gemini-2.5-flash', required: true, secret_names_present: REQUIRED.vertexSecrets };
  },

  async ghosttownMigrations() {
    const result = run('npx', ['wrangler', 'd1', 'migrations', 'list', EXPECTED.d1Name, '--remote', '--env', 'acceptance']);
    const text = `${result.stdout}\n${result.stderr}`;
    if (!/No migrations to apply/i.test(text)) throw new Error(`Acceptance D1 still has pending migrations.\n${redact(text)}`);
    return { database: EXPECTED.d1Name, pending_migrations: 0 };
  },

  async ghosttownSchema() {
    const sql = "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;";
    const result = run('npx', ['wrangler', 'd1', 'execute', EXPECTED.d1Name, '--remote', '--env', 'acceptance', '--command', sql, '--json']);
    const parsed = parseLooseJson(result.stdout);
    if (!parsed) throw new Error('Could not parse remote D1 schema response.');
    const names = new Set(findAllObjectNames(parsed));
    const missing = REQUIRED.d1Tables.filter(name => !names.has(name));
    if (missing.length) throw new Error(`Acceptance D1 schema missing tables: ${missing.join(', ')}`);
    return { database: EXPECTED.d1Name, required_tables: REQUIRED.d1Tables, missing_tables: [] };
  },

  async dataForSeoSmoke(_gate, state) {
    const result = await researchPreview(state, 'commercial');
    if (result.warning_present || result.suggestion_count < 1 || !result.providers.includes('dataforseo')) {
      throw new Error(`DataForSEO live smoke did not return clean provider candidates: ${JSON.stringify(result)}`);
    }
    return result;
  },

  async audienceProviderSmoke(gate, state) {
    const result = await researchPreview(state, 'audience');
    if (result.warning_present || result.suggestion_count < 1) {
      throw new Error(`Audience provider live smoke failed or returned no candidates: ${JSON.stringify(result)}`);
    }
    return { ...result, note: `No warning means both Podcast Index and YouTube provider promises fulfilled; gate ${gate.id} records the shared live audience-provider smoke.` };
  },

  async acceptanceDeployPairing() {
    run('npm', ['run', 'acceptance:check']);
    run('npx', ['wrangler', 'deploy', '--env', 'acceptance']);
    const head = getHead();
    run('npm', ['run', 'build'], { env: { VITE_API_URL: EXPECTED.workerUrl } });
    const jsFiles = run('node', ['-e', `const fs=require('fs');for(const f of fs.readdirSync('dist/assets'))if(f.endsWith('.js')){const t=fs.readFileSync('dist/assets/'+f,'utf8');if(t.includes(${JSON.stringify(EXPECTED.workerUrl)})){console.log(f);process.exit(0)}}process.exit(2)`]);
    if (!jsFiles.stdout.trim()) throw new Error('Acceptance build did not embed the exact acceptance Worker URL.');
    run('npx', [
      'wrangler', 'pages', 'deploy', './dist',
      '--project-name', EXPECTED.pagesProject,
      '--branch', EXPECTED.branch,
      '--commit-hash', head
    ]);
    const pairing = await verifyLivePairing();
    return { head, ...pairing };
  },

  async authSmoke() {
    const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    const email = `roadmap-autopilot-${suffix}@example.com`;
    const password = `Gt!${randomBytes(18).toString('base64url')}`;
    const signup = await fetchJson(`${EXPECTED.workerUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, usedAnonymousAssessment: false })
    }, 30000);
    if (signup.response.status !== 201 || typeof signup.body.token !== 'string') throw new Error(`Acceptance signup failed: HTTP ${signup.response.status}`);
    const login = await fetchJson(`${EXPECTED.workerUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 30000);
    if (login.response.status !== 200 || typeof login.body.token !== 'string') throw new Error(`Acceptance login failed: HTTP ${login.response.status}`);
    const verify = await fetchJson(`${EXPECTED.workerUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.body.token}` }
    }, 30000);
    if (!verify.response.ok) throw new Error(`Acceptance token verification failed: HTTP ${verify.response.status}`);
    return { signup_status: 201, login_status: 200, verify_status: verify.response.status, synthetic_account: email };
  }
};

function statusSummary(config, state) {
  const rows = config.gates.map(gate => ({
    id: gate.id,
    phase: gate.phase,
    status: state.gates[String(gate.id)]?.status || 'PENDING',
    title: gate.title
  }));
  const passed = rows.filter(row => row.status === 'PASS').length;
  const next = rows.find(row => row.status !== 'PASS');
  console.log(`Roadmap autopilot: ${passed}/${rows.length} gates PASS`);
  if (next) console.log(`Next gate: ${next.id} (Phase ${next.phase}) ${next.title} [${next.status}]`);
  else console.log('All 47 executable gates are PASS.');
  for (const row of rows) {
    if (row.status !== 'PENDING' || row.id <= (next?.id || rows.length)) {
      console.log(`${String(row.id).padStart(2, '0')}  P${String(row.phase).padStart(2, '0')}  ${row.status.padEnd(18)} ${row.title}`);
    }
  }
}

function recordGate(state, gate, status, evidence = {}, message = '') {
  state.gates[String(gate.id)] = {
    id: gate.id,
    phase: gate.phase,
    slug: gate.slug,
    title: gate.title,
    status,
    checked_at: now(),
    head: getHead(),
    evidence,
    message: redact(message)
  };
  saveState(state);
  writeJson(REPORT_PATH, {
    generated_at: now(),
    head: getHead(),
    passed_gate_count: Object.values(state.gates).filter(item => item.status === 'PASS').length,
    gates: state.gates
  });
}

function blockMessage(gate, kind, message) {
  console.error(`\n=== ROADMAP AUTOPILOT ${kind} ===`);
  console.error(`Gate ${gate.id} / Phase ${gate.phase}: ${gate.title}`);
  console.error(redact(message));
  console.error(`State saved to ${STATE_PATH}`);
  console.error('Fix only this blocker, then rerun: npm run roadmap:autopilot');
}

async function main() {
  if (!existsSync(CONFIG_PATH)) throw new Error(`Missing ${CONFIG_PATH}`);
  const config = readJson(CONFIG_PATH);
  if (!Array.isArray(config.gates) || config.gates.length !== 47) throw new Error('Roadmap config must contain exactly 47 executable gates.');

  if (reset) {
    rmSync(STATE_DIR, { recursive: true, force: true });
    console.log('Roadmap autopilot state reset.');
    if (process.argv.length === 3) return;
  }

  const state = loadState(config);
  if (statusOnly) {
    statusSummary(config, state);
    return;
  }

  console.log('GhostTown + Story Studio Production Roadmap Autopilot');
  console.log(`Source critical path: ${config.source.source_critical_path_steps} steps; executable decomposition: ${config.source.executable_gate_decomposition} gates.`);
  console.log(`Production auto-deploy: DISABLED. Gate ${config.safety.production_release_gate} is manual.`);
  console.log(`Resume state: ${STATE_PATH}\n`);

  for (const gate of config.gates) {
    const prior = state.gates[String(gate.id)];
    if (prior?.status === 'PASS') {
      console.log(`SKIP ${gate.id}: already PASS - ${gate.title}`);
      continue;
    }

    console.log(`\nRUN  ${gate.id}/47 | Phase ${gate.phase} | ${gate.title}`);

    if (gate.mode === 'manual') {
      const message = gate.id === 20
        ? 'USER INPUT REQUIRED: complete one Stripe TEST-mode $97 purchase using a new account/clean browser profile. Do not use live Stripe. Return the acceptance checkout/session result to continue automated verification.'
        : gate.id === 36
          ? 'USER DECISION REQUIRED: explicit production-release authorization is required by the roadmap. Autopilot will never deploy production or enable production research on its own.'
          : 'USER INPUT REQUIRED for this roadmap gate.';
      recordGate(state, gate, 'BLOCKED_INPUT', {}, message);
      blockMessage(gate, 'INPUT REQUIRED', message);
      process.exitCode = 2;
      return;
    }

    if (gate.mode === 'hook') {
      const hook = process.env[gate.hook_env];
      if (!hook?.trim()) {
        const message = `Automation adapter ${gate.hook_env} is not configured. This gate is not being waived or guessed. Supply a sanctioned command adapter when available; secret values must not be embedded in the command or logs.`;
        recordGate(state, gate, 'BLOCKED_ADAPTER', {}, message);
        blockMessage(gate, 'ADAPTER REQUIRED', message);
        process.exitCode = 3;
        return;
      }
      try {
        const evidence = runShellHook(hook, gate);
        recordGate(state, gate, 'PASS', evidence);
        console.log(`PASS ${gate.id}: ${gate.title}`);
        continue;
      } catch (error) {
        recordGate(state, gate, 'FAIL', {}, error instanceof Error ? error.message : String(error));
        blockMessage(gate, 'FAILED', error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
        return;
      }
    }

    const handler = handlers[gate.handler];
    if (!handler) {
      const message = `No handler registered for ${gate.handler || '(missing)'}.`;
      recordGate(state, gate, 'BLOCKED_ADAPTER', {}, message);
      blockMessage(gate, 'ADAPTER REQUIRED', message);
      process.exitCode = 3;
      return;
    }

    try {
      const evidence = await handler(gate, state);
      recordGate(state, gate, 'PASS', evidence);
      console.log(`PASS ${gate.id}: ${gate.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error?.code === 'INPUT_REQUIRED' || message.startsWith('INPUT_REQUIRED:')
        ? 'BLOCKED_INPUT'
        : 'FAIL';
      recordGate(state, gate, status, {}, message);
      blockMessage(gate, status === 'BLOCKED_INPUT' ? 'INPUT REQUIRED' : 'FAILED', message);
      process.exitCode = status === 'BLOCKED_INPUT' ? 2 : 1;
      return;
    }
  }

  statusSummary(config, state);
}

main().catch(error => {
  console.error(redact(error instanceof Error ? error.stack || error.message : String(error)));
  process.exitCode = 1;
});
