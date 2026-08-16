#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const TEMP_ENTRY = join(STATE_DIR, 'gate15-vertex-structured-smoke-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate15-vertex-structured';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
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

async function fetchWithTimeout(url, init = {}, timeoutMs = 120000) {
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
  return `import app from '../src/api/worker.ts';
import { runVertexStructuredStage } from '../src/api/vertexStructuredGeneration.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${serializedToken};
const STAGES = [
  'evidence_normalization',
  'strategy_synthesis',
  'asset_generation',
  'red_team_review',
  'schema_validation',
  'delivery_synthesis',
  'release_receipt'
];
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ok: { type: 'BOOLEAN' },
    stage: { type: 'STRING' }
  },
  required: ['ok', 'stage']
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function runStructuredSmoke(env) {
  const receipts = [];
  try {
    for (const stage of STAGES) {
      const generated = await runVertexStructuredStage(env, {
        stage: 'roadmap_acceptance_' + stage,
        systemInstruction: 'Return only the requested schema. This is a synthetic acceptance probe; do not add facts.',
        prompt: 'Return {"ok":true,"stage":"' + stage + '"}.',
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 4096,
        timeoutMs: 30000
      });
      if (generated.data?.ok !== true || generated.data?.stage !== stage) {
        return json({ ok: false, error: 'Structured stage output mismatch', stage }, 502);
      }
      if (generated.receipt.provider !== 'google_vertex_ai' || generated.receipt.gateway !== 'cloudflare_ai_gateway') {
        return json({ ok: false, error: 'Structured stage did not route through Vertex AI Gateway', stage }, 502);
      }
      if (!generated.receipt.promptHash || !generated.receipt.responseHash || !generated.receipt.completedAt) {
        return json({ ok: false, error: 'Structured stage receipt incomplete', stage }, 502);
      }
      receipts.push({
        stage: generated.receipt.stage,
        model: generated.receipt.model,
        provider: generated.receipt.provider,
        gateway: generated.receipt.gateway,
        gatewayId: generated.receipt.gatewayId,
        promptHash: generated.receipt.promptHash,
        responseHash: generated.receipt.responseHash,
        completedAt: generated.receipt.completedAt
      });
    }
    return json({
      ok: true,
      stageCount: receipts.length,
      allStagesStructured: receipts.length === STAGES.length,
      provider: receipts[0]?.provider,
      gateway: receipts[0]?.gateway,
      model: receipts[0]?.model,
      receipts
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return runStructuredSmoke(env);
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
  runWrangler(['deploy', '.roadmap-autopilot/gate15-vertex-structured-smoke-entry.ts', '--env', 'acceptance']);
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
    throw new Error(`Gate 15 smoke endpoint returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || body?.ok !== true) {
    throw new Error(`Gate 15 Vertex structured smoke failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
  if (body.stageCount !== 7 || body.allStagesStructured !== true) {
    throw new Error(`Gate 15 produced ${body.stageCount ?? 0} valid stages; 7 are required.`);
  }
  if (body.provider !== 'google_vertex_ai' || body.gateway !== 'cloudflare_ai_gateway') {
    throw new Error('Gate 15 did not prove Vertex routing through Cloudflare AI Gateway.');
  }
  if (!Array.isArray(body.receipts) || body.receipts.length !== 7 || body.receipts.some(receipt => !receipt.promptHash || !receipt.responseHash)) {
    throw new Error('Gate 15 did not produce seven complete generation receipts.');
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
    throw new Error(`Gate 15 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 15 produced no evidence.');
console.log(`Gate 15 Vertex AI Gateway seven-stage structured smoke passed: model=${evidence.model}, stages=${evidence.stageCount}, receipts=${evidence.receipts.length}.`);
