#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE24_RECEIPT_PATH = join(STATE_DIR, 'gate24-paid-vertex-quality.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate24-paid-vertex-quality-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__roadmap/acceptance/gate24-paid-vertex-quality';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);
const EXPECTED_STAGES = ['evidence_normalization', 'strategy_synthesis', 'asset_generation', 'red_team_review'];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

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

function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) {
    throw new Error('Gate 24 requires the existing Gate 20 purchase receipt; no new purchase will be created.');
  }
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || receipt?.stripe_mode !== 'test'
    || typeof receipt?.order_id !== 'string'
    || typeof receipt?.stripe_checkout_session_id !== 'string') {
    throw new Error('Gate 20 purchase receipt is incomplete.');
  }
  return receipt;
}

function assertPriorGatesAndVertexContract() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 24 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['23']?.status !== 'PASS') throw new Error('Gate 24 requires Gate 23 to be PASS.');

  const fulfillment = readFileSync(join(ROOT, 'src', 'api', 'blueprintFulfillmentV21.ts'), 'utf8');
  const pipeline = readFileSync(join(ROOT, 'src', 'api', 'launchBlueprintVertexPipeline.ts'), 'utf8');
  const persistence = readFileSync(join(ROOT, 'src', 'api', 'blueprintStoreV21.ts'), 'utf8');
  const required = [
    'function assertVertexPipelineComplete(',
    "'evidence_normalization'",
    "'strategy_synthesis'",
    "'asset_generation'",
    "'red_team_review'",
    'function assertKnownIds(',
    'referenced unknown immutable IDs',
    'function assertImmutableContract(',
    'deterministicGatePassed',
    'v21GatePassed',
    'redTeamPassed',
    'sourceVerificationPassed',
    'candidateIdValidationPassed',
    'generationReceiptEvidence'
  ];
  if (required.some(pattern => !(fulfillment + pipeline + persistence).includes(pattern))) {
    throw new Error('Gate 24 first-party Vertex pipeline, immutable-ID, quality, or persistence contract no longer proves the required acceptance semantics.');
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

async function postWithPropagationRetry(token) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const staleTemporaryWorker = response.status === 401 || (response.status === 404 && (body?.error === 'Endpoint not found' || !body));
    if (!staleTemporaryWorker || attempt === 8) return { response, body };
    console.log(`Gate 24 temporary Worker not propagated yet; retrying ${attempt}/8...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 24 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token, receipt) {
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
const AUTH_TOKEN = ${JSON.stringify(token)};
const ORDER_ID = ${JSON.stringify(receipt.order_id)};
const CHECKOUT_SESSION_ID = ${JSON.stringify(receipt.stripe_checkout_session_id)};
const EXPECTED_STAGES = ${JSON.stringify(EXPECTED_STAGES)};
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
async function sha256(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join(''); }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function validHash(value) { return /^[a-f0-9]{64}$/i.test(text(value)); }
async function verifyGate24(env) {
  const rawOrder = await env.KV.get('paid_test_order_' + ORDER_ID);
  let order = null;
  try { order = rawOrder ? JSON.parse(rawOrder) : null; } catch {}
  if (!order || order.orderId !== ORDER_ID || order.stripeCheckoutSessionId !== CHECKOUT_SESSION_ID || !order.paidAt || order.status !== 'ready') {
    return json({ ok: false, error: 'Durable READY paid order does not match the accepted Checkout Session' }, 409);
  }
  const row = await env.DB.prepare('SELECT status, blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(ORDER_ID).first();
  if (!row || row.status !== 'ready' || typeof row.blueprint_json !== 'string' || typeof row.research_receipt_json !== 'string') {
    return json({ ok: false, error: 'Persisted READY Blueprint or research evidence is unavailable for the accepted order' }, 409);
  }
  let blueprint = null;
  let researchReceipt = null;
  try { blueprint = JSON.parse(row.blueprint_json); researchReceipt = JSON.parse(row.research_receipt_json); } catch {}
  const evidence = researchReceipt?.generationReceiptEvidence;
  const pipeline = blueprint?.generationReceipt?.vertexPipeline;
  const vertex = evidence?.vertex;
  const quality = evidence?.quality;
  const stages = Array.isArray(pipeline?.stages) ? pipeline.stages : [];
  const stageNames = stages.map(stage => text(stage?.stage));
  const stageReceiptsComplete = stages.length === EXPECTED_STAGES.length
    && stageNames.join(',') === EXPECTED_STAGES.join(',')
    && stages.every(stage => text(stage?.model) && text(stage?.promptHash) && text(stage?.responseHash) && text(stage?.completedAt)
      && stage?.provider === 'google_vertex_ai' && stage?.gateway === 'cloudflare_ai_gateway');
  const evidenceStages = Array.isArray(vertex?.stages) ? vertex.stages : [];
  const evidenceStageReceiptsComplete = evidenceStages.length === EXPECTED_STAGES.length
    && evidenceStages.map(stage => text(stage?.stage)).join(',') === EXPECTED_STAGES.join(',')
    && evidenceStages.every(stage => text(stage?.model) && text(stage?.promptHash) && text(stage?.responseHash) && text(stage?.completedAt)
      && stage?.provider === 'google_vertex_ai' && stage?.gateway === 'cloudflare_ai_gateway');
  const researchCandidateCount = Number(researchReceipt?.candidateChannelCount || 0);
  const researchVerifiedCount = Number(researchReceipt?.verifiedChannelCount || 0);
  const channels = Array.isArray(blueprint?.customerAccessPack?.channels) ? blueprint.customerAccessPack.channels : [];
  const sources = Array.isArray(blueprint?.sources) ? blueprint.sources : [];
  const sourceIds = new Set(sources.map(source => text(source?.sourceId)).filter(Boolean));
  const channelIds = channels.map(channel => text(channel?.channelId)).filter(Boolean);
  const immutableSuppliedCandidateIds = channels.length >= 10 && channels.length <= 25
    && new Set(channelIds).size === channels.length
    && channels.every(channel => text(channel?.publicUrl) && Array.isArray(channel?.sourceIds)
      && channel.sourceIds.length > 0 && channel.sourceIds.every(sourceId => sourceIds.has(text(sourceId))));
  const qualityPassed = quality?.deterministicGatePassed === true
    && quality?.v21GatePassed === true
    && quality?.redTeamPassed === true
    && quality?.sourceVerificationPassed === true
    && quality?.candidateIdValidationPassed === true;
  const artifactHashesValid = validHash(evidence?.hashes?.normalizedInputSha256)
    && validHash(evidence?.hashes?.canonicalBlueprintSha256)
    && validHash(evidence?.hashes?.pdfSha256)
    && validHash(evidence?.hashes?.zipSha256);
  if (blueprint?.status !== 'ready' || blueprint?.orderId !== ORDER_ID || pipeline?.required !== true || pipeline?.status !== 'complete'
    || pipeline?.redTeam?.passed !== true || !Array.isArray(pipeline?.redTeam?.findings) || pipeline.redTeam.findings.some(finding => finding?.severity === 'blocking')
    || vertex?.required !== true || !text(vertex?.projectId) || !text(vertex?.configuredModel) || !stageReceiptsComplete || !evidenceStageReceiptsComplete
    || researchCandidateCount < 10 || researchVerifiedCount < 10 || researchVerifiedCount > 25
    || researchVerifiedCount !== channels.length || !immutableSuppliedCandidateIds || !qualityPassed || !artifactHashesValid) {
    return json({ ok: false, error: 'Persisted paid Vertex Blueprint evidence does not satisfy the staged AI Gateway, immutable candidate-ID, candidate-count, or fail-closed quality contract' }, 409);
  }
  return json({
    ok: true,
    orderIdSha256: await sha256(ORDER_ID),
    checkoutSessionSha256: await sha256(CHECKOUT_SESSION_ID),
    blueprintSha256: await sha256(row.blueprint_json),
    researchReceiptSha256: await sha256(row.research_receipt_json),
    blueprintStatus: blueprint.status,
    pipelineStageCount: stages.length,
    vertexAiGatewayStagesVerified: true,
    immutableSuppliedCandidateIds: true,
    candidateChannelCount: researchCandidateCount,
    verifiedChannelCount: researchVerifiedCount,
    deliveredTargetCount: channels.length,
    deterministicGatePassed: true,
    v21GatePassed: true,
    redTeamPassed: true,
    sourceVerificationPassed: true,
    candidateIdValidationPassed: true,
    artifactHashesValid: true,
    generationReplayed: false,
    secretValuesRecorded: false
  });
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '${SMOKE_PATH}') {
    if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
    return verifyGate24(env);
  }
  return app.fetch(request, env, ctx);
}};`;
}

assertPriorGatesAndVertexContract();
const receipt = purchaseReceipt();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token, receipt), 'utf8');
let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate24-paid-vertex-quality-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 24 verifier returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) throw new Error(`Gate 24 acceptance verification failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  if (body.pipelineStageCount !== EXPECTED_STAGES.length || body.vertexAiGatewayStagesVerified !== true || body.immutableSuppliedCandidateIds !== true
    || body.candidateChannelCount < 10 || body.verifiedChannelCount < 10 || body.verifiedChannelCount > 25
    || body.deliveredTargetCount !== body.verifiedChannelCount || body.deterministicGatePassed !== true || body.v21GatePassed !== true
    || body.redTeamPassed !== true || body.sourceVerificationPassed !== true || body.candidateIdValidationPassed !== true
    || body.artifactHashesValid !== true || body.generationReplayed !== false || body.secretValuesRecorded !== false) {
    throw new Error('Gate 24 evidence does not satisfy the persisted paid Vertex Blueprint quality contract.');
  }
  evidence = body;
} catch (error) {
  smokeError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try { runWrangler(['deploy', '--env', 'acceptance']); } catch (error) { restoreError = error; }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Gate 24 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}
if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 24 produced no acceptance evidence.');
writeFileSync(GATE24_RECEIPT_PATH, `${JSON.stringify({
  schema_version: 'roadmap-gate24-paid-vertex-quality-receipt-v1',
  verified_at: new Date().toISOString(),
  order_id_sha256: evidence.orderIdSha256,
  checkout_session_id_sha256: evidence.checkoutSessionSha256,
  blueprint_sha256: evidence.blueprintSha256,
  research_receipt_sha256: evidence.researchReceiptSha256,
  blueprint_status: evidence.blueprintStatus,
  pipeline_stage_count: evidence.pipelineStageCount,
  vertex_ai_gateway_stages_verified: true,
  immutable_supplied_candidate_ids: true,
  candidate_channel_count: evidence.candidateChannelCount,
  verified_channel_count: evidence.verifiedChannelCount,
  delivered_target_count: evidence.deliveredTargetCount,
  deterministic_gate_passed: true,
  v21_gate_passed: true,
  red_team_passed: true,
  source_verification_passed: true,
  candidate_id_validation_passed: true,
  artifact_hashes_valid: true,
  generation_replayed: false,
  secret_values_recorded: false
}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  pipeline_stage_count: evidence.pipelineStageCount,
  vertex_ai_gateway_stages_verified: true,
  immutable_supplied_candidate_ids: true,
  candidate_channel_count: evidence.candidateChannelCount,
  verified_channel_count: evidence.verifiedChannelCount,
  delivered_target_count: evidence.deliveredTargetCount,
  deterministic_gate_passed: true,
  v21_gate_passed: true,
  red_team_passed: true,
  source_verification_passed: true,
  candidate_id_validation_passed: true,
  artifact_hashes_valid: true,
  generation_replayed: false,
  local_receipt_written: true,
  secret_values_recorded: false
}));
