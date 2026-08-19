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
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE26_RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const GATE29_RECEIPT_PATH = join(STATE_DIR, 'gate29-launch-site-lead-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate30-second-device-recovery-receipt.json');
const AUTH_BRIDGE_ENTRY = join(STATE_DIR, 'gate30-auth-state-worker.ts');
const AUTH_BRIDGE_CONFIG = join(ROOT, '.roadmap-gate30-auth-state.wrangler.toml');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const KV_NAMESPACE_ID = '849e13521d454361aea286b8e1a5e4c7';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';
const EXPECTED_VERSION = '2.1';
const EXECUTION_LOG_SCHEMA = 'ghosttown-daily-execution-log-v1';
const OWNER_PASSWORD_ENV = 'ROADMAP_GATE_30_OWNER_PASSWORD';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 30 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function requireJson(path, schemaVersion, label) {
  if (!existsSync(path)) throw new Error(`Gate 30 requires ${label}.`);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema_version !== schemaVersion || value?.decision !== 'PASS') {
    throw new Error(`Gate 30 found an invalid ${label}.`);
  }
  return value;
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 30 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['17', '26', '27', '28', '29']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 30 requires Gate ${id} to be PASS.`);
  }

  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 30 requires the existing Gate 20 purchase receipt.');
  const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
      || purchase?.stripe_mode !== 'test'
      || typeof purchase?.order_id !== 'string'
      || !/^gtt_[A-Za-z0-9_-]+$/.test(purchase.order_id)) {
    throw new Error('Gate 30 found an invalid Gate 20 purchase receipt.');
  }

  const gate26 = requireJson(GATE26_RECEIPT_PATH, 'roadmap-gate26-canonical-d1-artifacts-receipt-v1', 'Gate 26 receipt');
  const gate27 = requireJson(GATE27_RECEIPT_PATH, 'roadmap-gate27-private-r2-artifacts-receipt-v1', 'Gate 27 receipt');
  const gate29 = requireJson(GATE29_RECEIPT_PATH, 'roadmap-gate29-launch-site-lead-receipt-v1', 'Gate 29 receipt');
  if (gate29?.final_owner_status !== 'unpublished' || gate29?.unpublish_verified !== true) {
    throw new Error('Gate 30 requires Gate 29 to have left the Launch Site unpublished.');
  }

  const authSource = readFileSync(join(ROOT, 'src', 'api', 'auth.ts'), 'utf8');
  if (!authSource.includes("if (!user.passwordHash.startsWith('pbkdf2$'))")) {
    throw new Error('Gate 30 cannot prove that a current PBKDF2 login is read-only in the authentication implementation.');
  }

  const password = String(process.env[OWNER_PASSWORD_ENV] || '');
  if (!password) {
    throw new Error(`INPUT_REQUIRED: set ${OWNER_PASSWORD_ENV} locally to the password for the Gate 20 purchasing account, then rerun npm run roadmap:autopilot. Do not paste the password into chat or place it in the command text.`);
  }
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

function bounded(current, chunk) {
  const next = `${current}${chunk}`;
  return next.length > 24000 ? next.slice(-24000) : next;
}

async function readAuthState(ownerEmail) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(AUTH_BRIDGE_ENTRY, `interface Env { KV: KVNamespace; }\n\nfunction json(body: unknown, status = 200) {\n  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });\n}\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    const url = new URL(request.url);\n    if (url.pathname === '/health') return json({ ok: true, mode: 'local-read-only-remote-kv' });\n    if (url.pathname === '/auth-state') {\n      const email = String(url.searchParams.get('email') || '').trim().toLowerCase();\n      if (!email || email.length > 320) return json({ error: 'Invalid email' }, 400);\n      const raw = await env.KV.get('user_' + email);\n      if (!raw) return json({ exists: false, passwordScheme: 'missing' });\n      let user: any;\n      try { user = JSON.parse(raw); } catch { return json({ exists: true, passwordScheme: 'invalid' }); }\n      const hash = String(user?.passwordHash || '');\n      const passwordScheme = hash.startsWith('pbkdf2$100000$') ? 'pbkdf2-100000' : hash.startsWith('pbkdf2$') ? 'pbkdf2-other' : 'legacy';\n      return json({ exists: true, passwordScheme });\n    }\n    return new Response('Not found', { status: 404 });\n  }\n};\n`, 'utf8');
  writeFileSync(AUTH_BRIDGE_CONFIG, [
    'name = "ghosttown-gate30-auth-state"',
    'main = ".roadmap-autopilot/gate30-auth-state-worker.ts"',
    'compatibility_date = "2024-01-01"',
    'workers_dev = false',
    '',
    '[[kv_namespaces]]',
    'binding = "KV"',
    `id = "${KV_NAMESPACE_ID}"`,
    'remote = true',
    ''
  ].join('\n'), 'utf8');

  let stdout = '';
  let stderr = '';
  const child = spawn(process.execPath, [WRANGLER_CLI, 'dev', '--config', AUTH_BRIDGE_CONFIG, '--ip', '127.0.0.1', '--port', String(port)], {
    cwd: ROOT,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  child.stdout?.on('data', chunk => { stdout = bounded(stdout, String(chunk)); });
  child.stderr?.on('data', chunk => { stderr = bounded(stderr, String(chunk)); });

  const safeLogs = () => `${stdout}\n${stderr}`.replaceAll(ownerEmail, '[OWNER_EMAIL_REDACTED]').trim();
  try {
    let ready = false;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Gate 30 local auth-state bridge exited before ready.\n${safeLogs()}`);
      try {
        const health = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
        if (health.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolveWait => setTimeout(resolveWait, 250));
    }
    if (!ready) throw new Error(`Gate 30 local auth-state bridge did not become ready.\n${safeLogs()}`);
    const response = await fetch(`${baseUrl}/auth-state?email=${encodeURIComponent(ownerEmail)}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(`Gate 30 auth-state probe failed HTTP ${response.status}.`);
    return body;
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(AUTH_BRIDGE_ENTRY, { force: true });
    rmSync(AUTH_BRIDGE_CONFIG, { force: true });
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson(url, init, expectedStatus, label) {
  const response = await fetchWithTimeout(url, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (response.status !== expectedStatus || body === null) {
    throw new Error(`Gate 30 ${label} expected JSON HTTP ${expectedStatus}, received ${response.status}.`);
  }
  return { response, body, text };
}

async function login(ownerEmail, password, label) {
  const result = await requestJson(`${WORKER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password })
  }, 200, `${label} login`);
  if (typeof result.body?.token !== 'string' || normalizedEmail(result.body?.user?.email) !== ownerEmail) {
    throw new Error(`Gate 30 ${label} login did not return the paid owner identity.`);
  }
  return result.body.token;
}

async function verifyToken(token, ownerEmail, label) {
  const result = await requestJson(`${WORKER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, 200, `${label} token verification`);
  if (normalizedEmail(result.body?.user?.email) !== ownerEmail) {
    throw new Error(`Gate 30 ${label} token verification did not resolve the paid owner.`);
  }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function requirePrivateNoStore(response, label) {
  if (String(response.headers.get('cache-control') || '').toLowerCase() !== 'private, no-store') {
    throw new Error(`Gate 30 ${label} cache policy is not private, no-store.`);
  }
}

async function artifact(url, token, kind, expectedHash) {
  const response = await fetchWithTimeout(url, { method: 'GET', headers: bearer(token) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200) throw new Error(`Gate 30 ${kind} recovery expected HTTP 200, received ${response.status}.`);
  requirePrivateNoStore(response, `${kind} recovery`);
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash) throw new Error(`Gate 30 ${kind} recovery hash does not match the Gate 27 certified artifact.`);
  const receiptHeader = String(response.headers.get('x-ghosttown-sha256') || '').toLowerCase();
  if (receiptHeader && receiptHeader !== expectedHash.toLowerCase()) throw new Error(`Gate 30 ${kind} integrity header drifted.`);
  if (kind === 'JSON') {
    if (!String(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new Error('Gate 30 JSON recovery content type drifted.');
    JSON.parse(bytes.toString('utf8'));
  }
  if (kind === 'PDF' && bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Gate 30 recovered PDF signature is invalid.');
  if (kind === 'ZIP') {
    const signature = bytes.byteLength >= 4 ? bytes.readUInt32LE(0) : 0;
    if (![0x04034b50, 0x06054b50, 0x08074b50].includes(signature)) throw new Error('Gate 30 recovered ZIP signature is invalid.');
  }
  return { sha256: actualHash, bytes: bytes.byteLength };
}

function validateExecutionProjection(progress, gate26) {
  if (!Array.isArray(progress?.completedDays) || !Array.isArray(progress?.evidenceLedger) || !Array.isArray(progress?.checkpointReviews)) {
    throw new Error('Gate 30 recovered progress is missing completedDays, evidenceLedger, or checkpointReviews.');
  }
  const completedRows = Number(gate26?.execution?.completed_action_rows || 0);
  const evidenceRows = Number(gate26?.execution?.evidence_rows || 0);
  const checkpointRows = Number(gate26?.execution?.checkpoint_review_rows || 0);
  if ((completedRows === 0) !== (progress.completedDays.length === 0)) throw new Error('Gate 30 recovered completed-day projection disagrees with Gate 26 D1 evidence.');
  if ((evidenceRows === 0) !== (progress.evidenceLedger.length === 0)) throw new Error('Gate 30 recovered evidence projection disagrees with Gate 26 D1 evidence.');
  if ((checkpointRows === 0) !== (progress.checkpointReviews.length === 0)) throw new Error('Gate 30 recovered checkpoint projection disagrees with Gate 26 D1 evidence.');
  for (const entry of progress.evidenceLedger) {
    if (!entry?.entryId || !entry?.blueprintId || entry?.blueprintVersion !== EXPECTED_VERSION || !entry?.actionId || !entry?.checkpointId) {
      throw new Error('Gate 30 recovered evidence lost canonical Blueprint/action/checkpoint identity.');
    }
  }
  for (const review of progress.checkpointReviews) {
    if (![7, 14, 21, 30].includes(Number(review?.dayNumber))) throw new Error('Gate 30 recovered an invalid checkpoint day.');
  }
}

async function recoverSession(label, token, ownerEmail, purchase, gate26, gate27, gate29) {
  const orderId = purchase.order_id;
  const root = `${WORKER_URL}/api/paid-test/orders/${encodeURIComponent(orderId)}`;
  const blueprintView = await requestJson(`${root}/blueprint`, { method: 'GET', headers: bearer(token) }, 200, `${label} Blueprint view`);
  const blueprint = blueprintView.body?.blueprint;
  if (blueprint?.orderId !== orderId
      || blueprint?.schemaVersion !== EXPECTED_SCHEMA
      || blueprint?.blueprintVersion !== EXPECTED_VERSION
      || blueprint?.status !== 'ready'
      || blueprint?.qualityGate?.passed !== true
      || normalizedEmail(blueprint?.ownerId) !== ownerEmail) {
    throw new Error(`Gate 30 ${label} Blueprint identity/status did not recover correctly.`);
  }

  const progressView = await requestJson(`${root}/blueprint/progress`, { method: 'GET', headers: bearer(token) }, 200, `${label} progress view`);
  requirePrivateNoStore(progressView.response, `${label} progress view`);
  if (progressView.body?.executionLog?.schemaVersion !== EXECUTION_LOG_SCHEMA) throw new Error(`Gate 30 ${label} execution-log schema did not recover.`);
  if (blueprintView.body?.executionLog?.schemaVersion !== EXECUTION_LOG_SCHEMA) throw new Error(`Gate 30 ${label} Blueprint execution metadata did not recover.`);
  if (JSON.stringify(blueprintView.body?.progress) !== JSON.stringify(progressView.body?.progress)) {
    throw new Error(`Gate 30 ${label} Blueprint and progress endpoints disagree on recovered progress.`);
  }
  validateExecutionProjection(progressView.body.progress, gate26);

  const jsonArtifact = await artifact(`${root}/blueprint.json`, token, 'JSON', gate27.artifacts.json.sha256);
  const pdfArtifact = await artifact(`${root}/blueprint.pdf`, token, 'PDF', gate27.artifacts.pdf.sha256);
  const zipArtifact = await artifact(`${root}/blueprint-assets.zip`, token, 'ZIP', gate27.artifacts.zip.sha256);
  if (jsonArtifact.sha256 !== gate26.canonical.canonical_blueprint_sha256) {
    throw new Error(`Gate 30 ${label} recovered JSON no longer matches the Gate 26 canonical Blueprint hash.`);
  }

  const siteView = await requestJson(`${root}/launch-site`, { method: 'GET', headers: bearer(token) }, 200, `${label} Launch Site view`);
  requirePrivateNoStore(siteView.response, `${label} Launch Site view`);
  const site = siteView.body?.site;
  if (site?.status !== 'unpublished'
      || sha256(Buffer.from(String(site?.siteId || ''), 'utf8')) !== gate29.site_id_sha256
      || sha256(Buffer.from(String(site?.publicSlug || ''), 'utf8')) !== gate29.public_slug_sha256
      || sha256(Buffer.from(String(siteView.body?.publicUrl || ''), 'utf8')) !== gate29.public_url_sha256) {
    throw new Error(`Gate 30 ${label} Launch Site identity/lifecycle did not recover from Gate 29.`);
  }

  return {
    blueprint_id_sha256: sha256(Buffer.from(String(blueprint.blueprintId || ''), 'utf8')),
    canonical_json_sha256: jsonArtifact.sha256,
    pdf_sha256: pdfArtifact.sha256,
    zip_sha256: zipArtifact.sha256,
    progress_sha256: sha256(Buffer.from(JSON.stringify(progressView.body.progress), 'utf8')),
    execution_log_sha256: sha256(Buffer.from(JSON.stringify(progressView.body.executionLog), 'utf8')),
    completed_days_count: progressView.body.progress.completedDays.length,
    evidence_count: progressView.body.progress.evidenceLedger.length,
    checkpoint_count: progressView.body.progress.checkpointReviews.length,
    launch_site_state_sha256: sha256(Buffer.from(JSON.stringify(siteView.body), 'utf8')),
    launch_site_status: site.status
  };
}

function identicalRecovery(left, right) {
  for (const key of [
    'blueprint_id_sha256', 'canonical_json_sha256', 'pdf_sha256', 'zip_sha256',
    'progress_sha256', 'execution_log_sha256', 'completed_days_count', 'evidence_count',
    'checkpoint_count', 'launch_site_state_sha256', 'launch_site_status'
  ]) {
    if (left[key] !== right[key]) throw new Error(`Gate 30 second-device recovery mismatch for ${key}.`);
  }
}

const { purchase, gate26, gate27, gate29, password } = prerequisites();
const snapshot = await withAcceptanceDataBindings(client => client.snapshot(purchase.order_id));
if (!snapshot?.blueprintJson || !snapshot?.hashes) throw new Error('Gate 30 could not read the canonical acceptance snapshot through remote bindings.');
const snapshotBlueprint = JSON.parse(snapshot.blueprintJson);
const ownerEmail = normalizedEmail(snapshotBlueprint?.ownerId);
if (!ownerEmail || snapshotBlueprint?.orderId !== purchase.order_id || snapshotBlueprint?.schemaVersion !== EXPECTED_SCHEMA) {
  throw new Error('Gate 30 canonical acceptance snapshot owner/order identity is incomplete.');
}
if (snapshot.hashes.json !== gate27.artifacts.json.sha256
    || snapshot.hashes.pdf !== gate27.artifacts.pdf.sha256
    || snapshot.hashes.zip !== gate27.artifacts.zip.sha256) {
  throw new Error('Gate 30 acceptance snapshot no longer matches Gate 27 certified artifact hashes.');
}

const authStateBefore = await readAuthState(ownerEmail);
if (authStateBefore?.exists !== true || authStateBefore?.passwordScheme !== 'pbkdf2-100000') {
  throw new Error('Gate 30 requires the existing paid owner account to already use the current PBKDF2-100000 password scheme so login remains read-only.');
}

const firstToken = await login(ownerEmail, password, 'first-device');
await verifyToken(firstToken, ownerEmail, 'first-device');
const first = await recoverSession('first-device', firstToken, ownerEmail, purchase, gate26, gate27, gate29);

await new Promise(resolveWait => setTimeout(resolveWait, 1200));
const secondToken = await login(ownerEmail, password, 'second-device');
if (secondToken === firstToken) throw new Error('Gate 30 did not obtain a distinct second-device authentication context.');
await verifyToken(secondToken, ownerEmail, 'second-device');
const second = await recoverSession('second-device', secondToken, ownerEmail, purchase, gate26, gate27, gate29);
identicalRecovery(first, second);

const authStateAfter = await readAuthState(ownerEmail);
if (authStateAfter?.exists !== true || authStateAfter?.passwordScheme !== authStateBefore.passwordScheme) {
  throw new Error('Gate 30 authentication state changed during the read-only recovery proof.');
}

const receipt = {
  schema_version: 'roadmap-gate30-second-device-recovery-receipt-v1',
  verified_at: new Date().toISOString(),
  environment: 'acceptance',
  order_id_sha256: sha256(Buffer.from(purchase.order_id, 'utf8')),
  owner_id_sha256: sha256(Buffer.from(ownerEmail, 'utf8')),
  authentication: {
    real_login_route_verified: true,
    real_verify_route_verified: true,
    fresh_authentication_contexts: 2,
    distinct_tokens_verified: true,
    password_scheme_preflight: 'pbkdf2-100000',
    password_input_source: 'local_process_environment',
    password_value_recorded: false,
    token_values_recorded: false
  },
  recovery: {
    blueprint_verified: true,
    canonical_json_verified: true,
    pdf_verified: true,
    zip_verified: true,
    progress_verified: true,
    evidence_verified: true,
    checkpoints_verified: true,
    launch_site_verified: true,
    launch_site_status: second.launch_site_status,
    canonical_json_sha256: second.canonical_json_sha256,
    pdf_sha256: second.pdf_sha256,
    zip_sha256: second.zip_sha256,
    progress_sha256: second.progress_sha256,
    execution_log_sha256: second.execution_log_sha256,
    launch_site_state_sha256: second.launch_site_state_sha256,
    completed_days_count: second.completed_days_count,
    evidence_count: second.evidence_count,
    checkpoint_count: second.checkpoint_count,
    second_context_matches_first: true
  },
  d1_r2_snapshot_read_path: 'local_worker_remote_bindings',
  auth_state_read_path: 'local_worker_remote_kv_binding',
  mutation_scope_verified: 'none',
  acceptance_resources_mutated: false,
  purchase_replayed: false,
  workflow_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  production_deployed: false,
  secret_values_recorded: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  environment: 'acceptance',
  real_login_route_verified: true,
  fresh_authentication_contexts: 2,
  blueprint_verified: true,
  artifacts_verified: true,
  progress_evidence_checkpoints_verified: true,
  launch_site_verified: true,
  second_context_matches_first: true,
  mutation_scope_verified: 'none',
  acceptance_resources_mutated: false,
  purchase_replayed: false,
  workflow_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  production_deployed: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate30-second-device-recovery-receipt.json'
}));
