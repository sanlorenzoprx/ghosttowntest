#!/usr/bin/env node
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE30_PASSWORD_RECEIPT_PATH = join(STATE_DIR, 'gate30-acceptance-password-reset-receipt.json');
const HISTORICAL_GATE34_RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate34-owner-session-setup-receipt.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate34-owner-session-worker.ts');
const TEMP_CONFIG = join(ROOT, '.roadmap-gate34-owner-session.wrangler.toml');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const KV_NAMESPACE_ID = '849e13521d454361aea286b8e1a5e4c7';
const PASSWORD_ITERATIONS = 100_000;

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 34 owner-session setup could not resolve Wrangler.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const sleep = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, PASSWORD_ITERATIONS, 32, 'sha256');
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
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

function stateGuard() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 34 owner-session setup requires existing roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['20', '30', '31', '32', '33', '34', '35']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 34 owner-session setup requires Gate ${id} to remain PASS.`);
  }
  const gate36 = state?.gates?.['36'];
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('HARD STOP: Gate 34 owner-session setup refuses to run after Gate 36 production release is authorized or executed.');
  }
}

function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 34 owner-session setup requires the Gate 20 purchase receipt.');
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || receipt?.stripe_mode !== 'test' || !/^gtt_[A-Za-z0-9_-]+$/.test(String(receipt?.order_id || ''))) {
    throw new Error('Gate 34 owner-session setup found an invalid Gate 20 purchase receipt.');
  }
  return receipt;
}

function acceptedOwnerHash() {
  for (const path of [HISTORICAL_GATE34_RECEIPT_PATH, GATE30_PASSWORD_RECEIPT_PATH]) {
    if (!existsSync(path)) continue;
    const receipt = JSON.parse(readFileSync(path, 'utf8'));
    if (/^[a-f0-9]{64}$/.test(String(receipt?.owner_id_sha256 || ''))) return receipt.owner_id_sha256;
  }
  throw new Error('Gate 34 owner-session setup cannot prove the accepted Gate 20 owner identity hash.');
}

function bridgeSource() {
  return `interface Env { KV: KVNamespace; }\n\nfunction json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); }\nasync function sha(value: string) { const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''); }\nexport default { async fetch(request: Request, env: Env): Promise<Response> {\n  const url = new URL(request.url);\n  if (url.pathname === '/health') return json({ ok: true, mode: 'local-dev-remote-acceptance-kv' });\n  if (url.pathname === '/snapshot' && request.method === 'GET') {\n    const orderId = String(url.searchParams.get('orderId') || '');\n    if (!/^gtt_[A-Za-z0-9_-]+$/.test(orderId)) return json({ error: 'Invalid order ID' }, 400);\n    const orderRaw = await env.KV.get('paid_test_order_' + orderId);\n    if (!orderRaw) return json({ error: 'Acceptance order not found' }, 404);\n    let order: any; try { order = JSON.parse(orderRaw); } catch { return json({ error: 'Acceptance order invalid' }, 500); }\n    const ownerEmail = String(order?.email || '').trim().toLowerCase();\n    if (!ownerEmail || order?.stripeMode !== 'test') return json({ error: 'Acceptance order owner mismatch' }, 409);\n    const userRaw = await env.KV.get('user_' + ownerEmail);\n    if (!userRaw) return json({ error: 'Acceptance owner user not found' }, 404);\n    return json({ ok: true, ownerEmail, originalUserRaw: userRaw, originalUserSha256: await sha(userRaw) });\n  }\n  if (url.pathname === '/apply' && request.method === 'POST') {\n    let body: any; try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }\n    const ownerEmail = String(body?.ownerEmail || '').trim().toLowerCase();\n    const expectedSha = String(body?.expectedOriginalSha256 || '');\n    const passwordHash = String(body?.passwordHash || '');\n    if (!ownerEmail || !/^[a-f0-9]{64}$/.test(expectedSha) || !/^pbkdf2\\$100000\\$[^$]+\\$[^$]+$/.test(passwordHash)) return json({ error: 'Invalid apply payload' }, 400);\n    const currentRaw = await env.KV.get('user_' + ownerEmail);\n    if (!currentRaw || await sha(currentRaw) !== expectedSha) return json({ error: 'Owner user changed before temporary auth setup' }, 409);\n    let user: any; try { user = JSON.parse(currentRaw); } catch { return json({ error: 'Owner user invalid' }, 500); }\n    user.passwordHash = passwordHash;\n    const nextRaw = JSON.stringify(user);\n    await env.KV.put('user_' + ownerEmail, nextRaw);\n    const verifyRaw = await env.KV.get('user_' + ownerEmail);\n    if (!verifyRaw || verifyRaw !== nextRaw) return json({ error: 'Temporary owner auth write verification failed' }, 500);\n    return json({ ok: true, temporaryUserSha256: await sha(verifyRaw) });\n  }\n  if (url.pathname === '/restore' && request.method === 'POST') {\n    let body: any; try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }\n    const ownerEmail = String(body?.ownerEmail || '').trim().toLowerCase();\n    const originalUserRaw = String(body?.originalUserRaw || '');\n    const expectedSha = String(body?.expectedOriginalSha256 || '');\n    if (!ownerEmail || !originalUserRaw || !/^[a-f0-9]{64}$/.test(expectedSha) || await sha(originalUserRaw) !== expectedSha) return json({ error: 'Invalid restore payload' }, 400);\n    await env.KV.put('user_' + ownerEmail, originalUserRaw);\n    const verifyRaw = await env.KV.get('user_' + ownerEmail);\n    if (!verifyRaw || verifyRaw !== originalUserRaw) return json({ error: 'Owner auth rollback exact-byte verification failed' }, 500);\n    return json({ ok: true, restoredExactly: true, restoredUserSha256: await sha(verifyRaw) });\n  }\n  return new Response('Not found', { status: 404 });\n} };\n`;
}

async function jsonRequest(url, init, expectedStatus, label) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (response.status !== expectedStatus || body === null) throw new Error(`${label} expected JSON HTTP ${expectedStatus}, got ${response.status}.`);
  return body;
}

async function withKvBridge(callback) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(TEMP_ENTRY, bridgeSource(), 'utf8');
  writeFileSync(TEMP_CONFIG, [
    'name = "ghosttown-gate34-owner-session"',
    'main = ".roadmap-autopilot/gate34-owner-session-worker.ts"',
    'compatibility_date = "2024-01-01"',
    'workers_dev = false',
    '',
    '[[kv_namespaces]]',
    'binding = "KV"',
    `id = "${KV_NAMESPACE_ID}"`,
    'remote = true',
    ''
  ].join('\n'), 'utf8');

  let logs = '';
  const child = spawn(process.execPath, [WRANGLER_CLI, 'dev', '--config', TEMP_CONFIG, '--ip', '127.0.0.1', '--port', String(port)], {
    cwd: ROOT,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  child.stdout?.on('data', chunk => { logs = `${logs}${chunk}`.slice(-24000); });
  child.stderr?.on('data', chunk => { logs = `${logs}${chunk}`.slice(-24000); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Gate 34 owner-session local KV bridge exited before ready.');
      try { if ((await fetch(`${baseUrl}/health`, { cache: 'no-store' })).ok) { ready = true; break; } } catch {}
      await sleep(250);
    }
    if (!ready) throw new Error(`Gate 34 owner-session local KV bridge did not become ready. ${logs.slice(-2000)}`);
    return await callback(baseUrl);
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(TEMP_ENTRY, { force: true });
    rmSync(TEMP_CONFIG, { force: true });
  }
}

export async function prepareAcceptanceOwnerSession() {
  stateGuard();
  const purchase = purchaseReceipt();
  const expectedOwnerHash = acceptedOwnerHash();
  const temporaryPassword = `${randomBytes(32).toString('base64url')}Aa1!`;
  const temporaryPasswordHash = hashPassword(temporaryPassword);
  let token = '';
  let ownerIdentityHash = '';
  let originalUserSha256 = '';
  let restoredUserSha256 = '';
  let loginStatus = 0;
  let verifyStatus = 0;

  await withKvBridge(async baseUrl => {
    const snapshot = await jsonRequest(`${baseUrl}/snapshot?orderId=${encodeURIComponent(purchase.order_id)}`, { method: 'GET' }, 200, 'Gate 34 owner-session snapshot');
    const ownerEmail = String(snapshot?.ownerEmail || '').trim().toLowerCase();
    const originalUserRaw = String(snapshot?.originalUserRaw || '');
    originalUserSha256 = String(snapshot?.originalUserSha256 || '');
    ownerIdentityHash = sha256(ownerEmail);
    if (!ownerEmail || !originalUserRaw || !/^[a-f0-9]{64}$/.test(originalUserSha256) || ownerIdentityHash !== expectedOwnerHash) {
      throw new Error('Gate 34 owner-session setup could not prove the accepted owner before auth preparation.');
    }

    let temporaryApplied = false;
    try {
      await jsonRequest(`${baseUrl}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail, expectedOriginalSha256: originalUserSha256, passwordHash: temporaryPasswordHash })
      }, 200, 'Gate 34 owner-session temporary auth apply');
      temporaryApplied = true;

      const loginResponse = await fetch(`${WORKER_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password: temporaryPassword })
      });
      loginStatus = loginResponse.status;
      const loginText = await loginResponse.text();
      let loginBody = null;
      try { loginBody = JSON.parse(loginText); } catch {}
      token = typeof loginBody?.token === 'string' ? loginBody.token : '';
      if (loginResponse.status !== 200 || token.length < 40 || sha256(String(loginBody?.user?.email || '').trim().toLowerCase()) !== expectedOwnerHash) {
        throw new Error(`Gate 34 owner-session login failed HTTP ${loginResponse.status}.`);
      }
    } finally {
      if (temporaryApplied) {
        const restored = await jsonRequest(`${baseUrl}/restore`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerEmail, originalUserRaw, expectedOriginalSha256: originalUserSha256 })
        }, 200, 'Gate 34 owner-session rollback');
        if (restored?.restoredExactly !== true || restored?.restoredUserSha256 !== originalUserSha256) {
          throw new Error('Gate 34 owner-session rollback did not restore the acceptance owner user exactly.');
        }
        restoredUserSha256 = restored.restoredUserSha256;
      }
    }
  });

  if (!token || restoredUserSha256 !== originalUserSha256) {
    throw new Error('Gate 34 owner-session setup refuses to return a token without exact acceptance-auth restoration.');
  }
  const verifyResponse = await fetch(`${WORKER_URL}/api/auth/verify`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}'
  });
  verifyStatus = verifyResponse.status;
  const verifyText = await verifyResponse.text();
  let verifyBody = null;
  try { verifyBody = JSON.parse(verifyText); } catch {}
  if (verifyResponse.status !== 200 || sha256(String(verifyBody?.user?.email || '').trim().toLowerCase()) !== expectedOwnerHash) {
    throw new Error(`Gate 34 owner-session token failed after exact auth rollback HTTP ${verifyResponse.status}.`);
  }

  const receipt = {
    schema_version: 'roadmap-gate34-owner-session-setup-receipt-v1',
    verified_at: new Date().toISOString(),
    environment: 'acceptance',
    purpose: 'obtain an owner JWT before read-only Gate 34 without retaining a changed owner credential',
    local_dev_remote_kv_bridge: true,
    infrastructure_deployed: false,
    acceptance_auth_temporary_mutation: true,
    acceptance_auth_restored_before_gate34: true,
    owner_user_record_restored_exactly: true,
    owner_identity_sha256: ownerIdentityHash,
    owner_user_before_sha256: originalUserSha256,
    owner_user_after_restore_sha256: restoredUserSha256,
    login_status: loginStatus,
    post_restore_token_verify_status: verifyStatus,
    password_value_recorded: false,
    password_hash_recorded: false,
    token_value_recorded: false,
    email_value_recorded: false,
    secret_values_recorded: false,
    purchase_replayed: false,
    order_mutations: 'none',
    artifact_mutations: 'none',
    progress_mutations: 'none',
    launch_site_mutations: 'none',
    stripe_mutated: false,
    production_deployed: false,
    gate_36_touched: false,
    decision: 'PASS'
  };
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    decision: 'PASS',
    acceptance_auth_temporary_mutation: true,
    acceptance_auth_restored_before_gate34: true,
    owner_user_record_restored_exactly: true,
    infrastructure_deployed: false,
    production_deployed: false,
    secret_values_recorded: false,
    receipt: '.roadmap-autopilot/gate34-owner-session-setup-receipt.json'
  }));
  return token;
}
