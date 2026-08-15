#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const TEMP_ENTRY = join(STATE_DIR, 'gate14-gemini-smoke-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate14-gemini-selection';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string'
  ? wranglerPackage.bin
  : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function runWrangler(args) {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function temporaryWorkerSource(token) {
  const serializedToken = JSON.stringify(token);
  return `import app from '../src/api/index.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${serializedToken};
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';
const FIXTURE = [
  { candidateId: 'candidate_alpha', label: 'Independent trade publication', targetType: 'newsletter_or_publication' },
  { candidateId: 'candidate_bravo', label: 'Industry association', targetType: 'association' },
  { candidateId: 'candidate_charlie', label: 'Founder interview podcast', targetType: 'podcast' },
  { candidateId: 'candidate_delta', label: 'Educational YouTube creator', targetType: 'youtube_creator' }
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function parseModelJson(value) {
  const clean = String(value || '').trim().replace(/^\\x60\\x60\\x60(?:json)?/i, '').replace(/\\x60\\x60\\x60$/, '').trim();
  return JSON.parse(clean);
}

async function runGeminiSmoke(env) {
  if (!env.GEMINI_API_KEY?.trim()) return json({ ok: false, error: 'GEMINI_API_KEY is not configured' }, 500);
  const model = env.GEMINI_RESEARCH_MODEL?.trim() || DEFAULT_MODEL;
  const allowed = new Set(FIXTURE.map(item => item.candidateId));
  const prompt = [
    'You are performing a production acceptance smoke test for a constrained candidate selector.',
    'Select exactly two candidate IDs from the supplied immutable candidate list.',
    'Never create, modify, abbreviate, or infer a candidate ID.',
    'Return JSON only with this exact shape: {"selectedCandidateIds":["candidate_id","candidate_id"]}.',
    'Business context: choose useful customer-access channels for a small-business acquisition planning product.',
    'Immutable candidates:',
    JSON.stringify(FIXTURE)
  ].join('\\n');
  const response = await fetch(GEMINI_ENDPOINT + '/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 512, responseMimeType: 'application/json' }
    })
  });
  const body = await response.json();
  if (!response.ok) return json({ ok: false, error: body?.error?.message || ('Gemini HTTP ' + response.status) }, 502);
  const output = body?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('\\n').trim() || '';
  if (!output) return json({ ok: false, error: 'Gemini returned no content' }, 502);
  let parsed;
  try {
    parsed = parseModelJson(output);
  } catch {
    return json({ ok: false, error: 'Gemini returned invalid JSON' }, 502);
  }
  const selected = Array.isArray(parsed?.selectedCandidateIds)
    ? parsed.selectedCandidateIds.filter(value => typeof value === 'string')
    : [];
  const unknown = [...new Set(selected.filter(id => !allowed.has(id)))];
  if (unknown.length) return json({ ok: false, error: 'Gemini returned IDs outside the immutable candidate set', unknownCandidateIds: unknown }, 502);
  if (selected.length !== 2 || new Set(selected).size !== 2) {
    return json({ ok: false, error: 'Gemini did not return exactly two distinct supplied candidate IDs', selectedCount: selected.length }, 502);
  }
  return json({
    ok: true,
    model,
    suppliedCandidateCount: FIXTURE.length,
    selectedCandidateIds: selected,
    selectedCount: selected.length,
    allSelectedIdsSupplied: true,
    unknownCandidateIds: []
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return runGeminiSmoke(env);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token), 'utf8');

let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate14-gemini-smoke-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;

  const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
    method: 'POST',
    headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Gate 14 smoke endpoint returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || body?.ok !== true) {
    throw new Error(`Gate 14 Gemini smoke failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
  if (body.allSelectedIdsSupplied !== true || body.selectedCount !== 2 || body.unknownCandidateIds?.length) {
    throw new Error('Gate 14 Gemini smoke did not prove supplied-candidate-only selection.');
  }
  evidence = body;
} catch (error) {
  smokeError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try {
      runWrangler(['deploy', '--env', 'acceptance']);
    } catch (error) {
      restoreError = error;
    }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Gate 14 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 14 produced no evidence.');
console.log(`Gate 14 live Gemini selection smoke passed: model=${evidence.model}, supplied=${evidence.suppliedCandidateCount}, selected=${evidence.selectedCount}, all-selected-supplied=true.`);
