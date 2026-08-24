#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20 = join(STATE_DIR, 'gate20-purchase.json');
const GATE26 = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const GATE27 = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const GATE29 = join(STATE_DIR, 'gate29-launch-site-lead-receipt.json');
const RECEIPT = join(STATE_DIR, 'gate30-second-device-recovery-receipt.json');
const AUTH_ENTRY = join(STATE_DIR, 'gate30-auth-state-worker.ts');
const AUTH_CONFIG = join(ROOT, '.roadmap-gate30-auth-state.wrangler.toml');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const KV_NAMESPACE_ID = '849e13521d454361aea286b8e1a5e4c7';
const PASSWORD_ENV = 'ROADMAP_GATE_30_OWNER_PASSWORD';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';
const EXPECTED_VERSION = '2.1';
const EXECUTION_SCHEMA = 'ghosttown-daily-execution-log-v1';

const WRANGLER_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPkg = JSON.parse(readFileSync(join(WRANGLER_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPkg.bin === 'string' ? wranglerPkg.bin : wranglerPkg.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 30 could not resolve Wrangler.');
const WRANGLER_CLI = resolve(WRANGLER_DIR, wranglerBin);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const email = value => String(value || '').trim().toLowerCase();
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function readReceipt(path, schema, label) {
  if (!existsSync(path)) throw new Error(`Gate 30 requires ${label}.`);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema_version !== schema || value?.decision !== 'PASS') throw new Error(`Gate 30 found invalid ${label}.`);
  return value;
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 30 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['17', '26', '27', '28', '29']) if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 30 requires Gate ${id} PASS.`);
  const purchase = JSON.parse(readFileSync(GATE20, 'utf8'));
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || purchase?.stripe_mode !== 'test' || !/^gtt_[A-Za-z0-9_-]+$/.test(String(purchase?.order_id || ''))) throw new Error('Gate 30 found invalid Gate 20 receipt.');
  const gate26 = readReceipt(GATE26, 'roadmap-gate26-canonical-d1-artifacts-receipt-v1', 'Gate 26 receipt');
  const gate27 = readReceipt(GATE27, 'roadmap-gate27-private-r2-artifacts-receipt-v1', 'Gate 27 receipt');
  const gate29 = readReceipt(GATE29, 'roadmap-gate29-launch-site-lead-receipt-v1', 'Gate 29 receipt');
  if (gate29.final_owner_status !== 'unpublished' || gate29.unpublish_verified !== true) throw new Error('Gate 30 requires Gate 29 to leave Launch Site unpublished.');
  const password = String(process.env[PASSWORD_ENV] || '');
  if (!password) throw new Error(`INPUT_REQUIRED: set ${PASSWORD_ENV} locally to the Gate 20 purchasing-account password. Do not paste it into chat.`);
  return { purchase, gate26, gate27, gate29, password };
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolvePort(port));
    });
  });
}

async function authState(ownerEmail) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  writeFileSync(AUTH_ENTRY, `interface Env { KV: KVNamespace }\nexport default { async fetch(request: Request, env: Env) { const u=new URL(request.url); if(u.pathname==='/health') return Response.json({ok:true}); if(u.pathname==='/auth-state'){ const e=String(u.searchParams.get('email')||'').trim().toLowerCase(); const raw=await env.KV.get('user_'+e); if(!raw) return Response.json({exists:false,passwordScheme:'missing'}); let user:any; try{user=JSON.parse(raw)}catch{return Response.json({exists:true,passwordScheme:'invalid'})}; const h=String(user?.passwordHash||''); return Response.json({exists:true,passwordScheme:h.startsWith('pbkdf2$100000$')?'pbkdf2-100000':h.startsWith('pbkdf2$')?'pbkdf2-other':'legacy'}); } return new Response('Not found',{status:404}); } };\n`, 'utf8');
  writeFileSync(AUTH_CONFIG, [
    'name = "ghosttown-gate30-auth-state"',
    'main = ".roadmap-autopilot/gate30-auth-state-worker.ts"',
    'compatibility_date = "2024-01-01"',
    'workers_dev = false', '',
    '[[kv_namespaces]]', 'binding = "KV"', `id = "${KV_NAMESPACE_ID}"`, 'remote = true', ''
  ].join('\n'), 'utf8');
  let logs = '';
  const child = spawn(process.execPath, [WRANGLER_CLI, 'dev', '--config', AUTH_CONFIG, '--ip', '127.0.0.1', '--port', String(port)], { cwd: ROOT, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } });
  child.stdout?.on('data', chunk => { logs = `${logs}${chunk}`.slice(-24000); });
  child.stderr?.on('data', chunk => { logs = `${logs}${chunk}`.slice(-24000); });
  try {
    let ready = false;
    for (let i = 0; i < 160; i += 1) {
      if (child.exitCode !== null) throw new Error(`Gate 30 auth-state bridge exited. ${logs.replaceAll(ownerEmail, '[OWNER_EMAIL_REDACTED]')}`);
      try { if ((await fetch(`${base}/health`)).ok) { ready = true; break; } } catch {}
      await sleep(250);
    }
    if (!ready) throw new Error('Gate 30 auth-state bridge did not become ready.');
    const response = await fetch(`${base}/auth-state?email=${encodeURIComponent(ownerEmail)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(`Gate 30 auth-state probe HTTP ${response.status}.`);
    return body;
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(AUTH_ENTRY, { force: true });
    rmSync(AUTH_CONFIG, { force: true });
  }
}

async function fetchTimeout(url, init = {}, timeout = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' }); }
  finally { clearTimeout(timer); }
}

async function jsonRequest(url, init, status, label) {
  const response = await fetchTimeout(url, init);
  const text = await response.text();
  let body = null; try { body = JSON.parse(text); } catch {}
  if (response.status !== status || body === null) throw new Error(`Gate 30 ${label} expected JSON HTTP ${status}, got ${response.status}.`);
  return { response, body };
}

async function login(ownerEmail, password, label) {
  const { body } = await jsonRequest(`${WORKER_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ownerEmail, password }) }, 200, `${label} login`);
  if (typeof body?.token !== 'string' || email(body?.user?.email) !== ownerEmail) throw new Error(`Gate 30 ${label} login owner mismatch.`);
  return body.token;
}

async function verify(token, ownerEmail, label) {
  const { body } = await jsonRequest(`${WORKER_URL}/api/auth/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, 200, `${label} verify`);
  if (email(body?.user?.email) !== ownerEmail) throw new Error(`Gate 30 ${label} verify owner mismatch.`);
}

const bearer = token => ({ Authorization: `Bearer ${token}` });
function privateNoStore(response, label) { if (String(response.headers.get('cache-control') || '').toLowerCase() !== 'private, no-store') throw new Error(`Gate 30 ${label} cache policy drifted.`); }

function materialProgress(progress, persisted) {
  const copy = JSON.parse(JSON.stringify(progress || {}));
  if (!persisted) delete copy.updatedAt;
  return copy;
}
function materialExecution(log) {
  const copy = JSON.parse(JSON.stringify(log || {}));
  if (copy?.acsReadiness && typeof copy.acsReadiness === 'object') delete copy.acsReadiness.assessedAt;
  return copy;
}

function validateExecution(progress, gate26) {
  if (!Array.isArray(progress?.completedDays) || !Array.isArray(progress?.evidenceLedger) || !Array.isArray(progress?.checkpointReviews)) throw new Error('Gate 30 recovered progress shape is incomplete.');
  if (progress.completedDays.length !== Number(gate26.execution.completed_action_rows || 0)) throw new Error('Gate 30 completed-day count disagrees with Gate 26.');
  if (progress.evidenceLedger.length !== Number(gate26.execution.evidence_rows || 0)) throw new Error('Gate 30 evidence count disagrees with Gate 26.');
  if (progress.checkpointReviews.length !== Number(gate26.execution.checkpoint_review_rows || 0)) throw new Error('Gate 30 checkpoint count disagrees with Gate 26.');
  for (const entry of progress.evidenceLedger) if (!entry?.entryId || !entry?.blueprintId || entry?.blueprintVersion !== EXPECTED_VERSION || !entry?.actionId || !entry?.checkpointId) throw new Error('Gate 30 recovered evidence identity drifted.');
  for (const review of progress.checkpointReviews) if (![7,14,21,30].includes(Number(review?.dayNumber))) throw new Error('Gate 30 recovered invalid checkpoint day.');
}

async function artifact(url, token, kind, expectedHash) {
  const response = await fetchTimeout(url, { headers: bearer(token) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200) throw new Error(`Gate 30 ${kind} HTTP ${response.status}.`);
  privateNoStore(response, kind);
  const hash = sha256(bytes);
  if (hash !== expectedHash) throw new Error(`Gate 30 ${kind} hash mismatch.`);
  if (kind === 'PDF' && bytes.subarray(0,5).toString('ascii') !== '%PDF-') throw new Error('Gate 30 PDF signature invalid.');
  if (kind === 'ZIP') { const sig = bytes.byteLength >= 4 ? bytes.readUInt32LE(0) : 0; if (![0x04034b50,0x06054b50,0x08074b50].includes(sig)) throw new Error('Gate 30 ZIP signature invalid.'); }
  if (kind === 'JSON') JSON.parse(bytes.toString('utf8'));
  return hash;
}

async function recover(label, token, ownerEmail, purchase, gate26, gate27, gate29) {
  const root = `${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(purchase.order_id)}`;
  const blueprintView = await jsonRequest(`${root}/blueprint`, { headers: bearer(token) }, 200, `${label} Blueprint`);
  const blueprint = blueprintView.body?.blueprint;
  if (blueprint?.orderId !== purchase.order_id || blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.blueprintVersion !== EXPECTED_VERSION || blueprint?.status !== 'ready' || blueprint?.qualityGate?.passed !== true || email(blueprint?.ownerId) !== ownerEmail) throw new Error(`Gate 30 ${label} Blueprint identity/status drifted.`);

  const progressView = await jsonRequest(`${root}/blueprint/progress`, { headers: bearer(token) }, 200, `${label} progress`);
  privateNoStore(progressView.response, `${label} progress`);
  if (blueprintView.body?.executionLog?.schemaVersion !== EXECUTION_SCHEMA || progressView.body?.executionLog?.schemaVersion !== EXECUTION_SCHEMA) throw new Error(`Gate 30 ${label} execution schema drifted.`);
  const persisted = Number(gate26.execution.progress_rows || 0) > 0;
  if (JSON.stringify(materialProgress(blueprintView.body?.progress, persisted)) !== JSON.stringify(materialProgress(progressView.body?.progress, persisted))) throw new Error(`Gate 30 ${label} Blueprint/progress durable state disagrees.`);
  if (JSON.stringify(materialExecution(blueprintView.body?.executionLog)) !== JSON.stringify(materialExecution(progressView.body?.executionLog))) throw new Error(`Gate 30 ${label} execution semantics disagree.`);
  validateExecution(progressView.body.progress, gate26);

  const jsonHash = await artifact(`${root}/blueprint.json`, token, 'JSON', gate27.artifacts.json.sha256);
  const pdfHash = await artifact(`${root}/blueprint.pdf`, token, 'PDF', gate27.artifacts.pdf.sha256);
  const zipHash = await artifact(`${root}/blueprint-assets.zip`, token, 'ZIP', gate27.artifacts.zip.sha256);
  if (jsonHash !== gate26.canonical.canonical_blueprint_sha256) throw new Error(`Gate 30 ${label} canonical JSON disagrees with Gate 26.`);

  const siteView = await jsonRequest(`${root}/launch-site`, { headers: bearer(token) }, 200, `${label} Launch Site`);
  privateNoStore(siteView.response, `${label} Launch Site`);
  const site = siteView.body?.site;
  if (site?.status !== 'unpublished' || sha256(Buffer.from(String(site?.siteId || ''))) !== gate29.site_id_sha256 || sha256(Buffer.from(String(site?.publicSlug || ''))) !== gate29.public_slug_sha256 || sha256(Buffer.from(String(siteView.body?.publicUrl || ''))) !== gate29.public_url_sha256) throw new Error(`Gate 30 ${label} Launch Site identity/state drifted.`);

  return {
    blueprint_id_sha256: sha256(Buffer.from(String(blueprint.blueprintId || ''))),
    json_sha256: jsonHash, pdf_sha256: pdfHash, zip_sha256: zipHash,
    progress_sha256: sha256(Buffer.from(JSON.stringify(materialProgress(progressView.body.progress, persisted)))),
    execution_sha256: sha256(Buffer.from(JSON.stringify(materialExecution(progressView.body.executionLog)))),
    completed_days_count: progressView.body.progress.completedDays.length,
    evidence_count: progressView.body.progress.evidenceLedger.length,
    checkpoint_count: progressView.body.progress.checkpointReviews.length,
    launch_site_sha256: sha256(Buffer.from(JSON.stringify(siteView.body))),
    launch_site_status: site.status,
    volatile_empty_progress_updated_at_ignored: !persisted,
    volatile_acs_assessed_at_ignored: true
  };
}

function identical(left, right) {
  for (const key of ['blueprint_id_sha256','json_sha256','pdf_sha256','zip_sha256','progress_sha256','execution_sha256','completed_days_count','evidence_count','checkpoint_count','launch_site_sha256','launch_site_status']) if (left[key] !== right[key]) throw new Error(`Gate 30 second-device mismatch for ${key}.`);
}

const { purchase, gate26, gate27, gate29, password } = prerequisites();
const snapshot = await withAcceptanceDataBindings(client => client.snapshot(purchase.order_id));
if (!snapshot?.blueprintJson || snapshot.hashes?.json !== gate27.artifacts.json.sha256 || snapshot.hashes?.pdf !== gate27.artifacts.pdf.sha256 || snapshot.hashes?.zip !== gate27.artifacts.zip.sha256) throw new Error('Gate 30 binding-visible snapshot disagrees with Gate 27.');
const canonical = JSON.parse(snapshot.blueprintJson);
const ownerEmail = email(canonical.ownerId);
if (!ownerEmail || canonical.orderId !== purchase.order_id || canonical.schemaVersion !== EXPECTED_SCHEMA) throw new Error('Gate 30 canonical owner/order identity incomplete.');

const before = await authState(ownerEmail);
if (before?.exists !== true || before?.passwordScheme !== 'pbkdf2-100000') throw new Error('Gate 30 requires current PBKDF2-100000 owner auth state to remain read-only.');
const token1 = await login(ownerEmail, password, 'first-device');
await verify(token1, ownerEmail, 'first-device');
const first = await recover('first-device', token1, ownerEmail, purchase, gate26, gate27, gate29);
await sleep(1200);
const token2 = await login(ownerEmail, password, 'second-device');
if (token2 === token1) throw new Error('Gate 30 did not obtain a distinct second-device auth context.');
await verify(token2, ownerEmail, 'second-device');
const second = await recover('second-device', token2, ownerEmail, purchase, gate26, gate27, gate29);
identical(first, second);
const after = await authState(ownerEmail);
if (after?.exists !== true || after.passwordScheme !== before.passwordScheme) throw new Error('Gate 30 auth state changed during read-only recovery proof.');

const receipt = {
  schema_version: 'roadmap-gate30-second-device-recovery-receipt-v2', verified_at: new Date().toISOString(), environment: 'acceptance',
  order_id_sha256: sha256(Buffer.from(purchase.order_id)), owner_id_sha256: sha256(Buffer.from(ownerEmail)),
  authentication: { real_login_route_verified: true, real_verify_route_verified: true, fresh_authentication_contexts: 2, distinct_tokens_verified: true, password_scheme_preflight: 'pbkdf2-100000', password_value_recorded: false, token_values_recorded: false },
  recovery: { blueprint_verified: true, canonical_json_verified: true, pdf_verified: true, zip_verified: true, progress_verified: true, evidence_verified: true, checkpoints_verified: true, launch_site_verified: true, launch_site_status: second.launch_site_status, second_context_matches_first: true, durable_progress_sha256: second.progress_sha256, durable_execution_sha256: second.execution_sha256, volatile_empty_progress_updated_at_ignored: second.volatile_empty_progress_updated_at_ignored, volatile_acs_assessed_at_ignored: true },
  mutation_scope_verified: 'none', acceptance_resources_mutated: false, purchase_replayed: false, workflow_replayed: false, research_replayed: false, vertex_invoked: false, production_deployed: false, secret_values_recorded: false, decision: 'PASS'
};
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, decision: 'PASS', fresh_authentication_contexts: 2, blueprint_verified: true, artifacts_verified: true, progress_evidence_checkpoints_verified: true, launch_site_verified: true, second_context_matches_first: true, volatile_empty_progress_updated_at_ignored: second.volatile_empty_progress_updated_at_ignored, volatile_acs_assessed_at_ignored: true, mutation_scope_verified: 'none', acceptance_resources_mutated: false, purchase_replayed: false, workflow_replayed: false, research_replayed: false, vertex_invoked: false, production_deployed: false, secret_values_recorded: false, receipt: '.roadmap-autopilot/gate30-second-device-recovery-receipt.json' }));
