#!/usr/bin/env node
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate30-acceptance-password-reset-receipt.json');
const TEMP_ENTRY = join(STATE_DIR, 'gate30-password-reset-worker.ts');
const TEMP_CONFIG = join(ROOT, '.roadmap-gate30-password-reset.wrangler.toml');
const KV_NAMESPACE_ID = '849e13521d454361aea286b8e1a5e4c7';
const NEW_PASSWORD_ENV = 'ROADMAP_GATE_30_NEW_PASSWORD';
const PASSWORD_ITERATIONS = 100_000;

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Could not resolve Wrangler CLI.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, PASSWORD_ITERATIONS, 32, 'sha256');
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}
function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 30 password reset requires the existing Gate 20 purchase receipt.');
  const value = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (value?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || value?.stripe_mode !== 'test' || !/^gtt_[A-Za-z0-9_-]+$/.test(String(value?.order_id || ''))) {
    throw new Error('Gate 30 password reset found an invalid Gate 20 purchase receipt.');
  }
  return value;
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

async function resetAcceptanceUser(orderId, ownerEmail, passwordHash) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(TEMP_ENTRY, `interface Env { KV: KVNamespace; }\n\nfunction json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); }\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    const url = new URL(request.url);\n    if (url.pathname === '/health') return json({ ok: true, mode: 'acceptance-remote-kv-only' });\n    if (url.pathname !== '/reset' || request.method !== 'POST') return new Response('Not found', { status: 404 });\n    let body: any; try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }\n    const orderId = String(body?.orderId || '');\n    const ownerEmail = String(body?.ownerEmail || '').trim().toLowerCase();\n    const passwordHash = String(body?.passwordHash || '');\n    if (!/^gtt_[A-Za-z0-9_-]+$/.test(orderId) || !ownerEmail || !/^pbkdf2\\$100000\\$[^$]+\\$[^$]+$/.test(passwordHash)) return json({ error: 'Invalid reset payload' }, 400);\n    const [orderRaw, userRaw] = await Promise.all([env.KV.get('paid_test_order_' + orderId), env.KV.get('user_' + ownerEmail)]);\n    if (!orderRaw || !userRaw) return json({ error: 'Acceptance order or user not found' }, 404);\n    let order: any; let user: any; try { order = JSON.parse(orderRaw); user = JSON.parse(userRaw); } catch { return json({ error: 'Stored acceptance record is invalid' }, 500); }\n    if (String(order?.email || '').trim().toLowerCase() !== ownerEmail || order?.stripeMode !== 'test') return json({ error: 'Gate 20 order ownership mismatch' }, 409);\n    const beforeScheme = String(user?.passwordHash || '').startsWith('pbkdf2$100000$') ? 'pbkdf2-100000' : 'other';\n    user.passwordHash = passwordHash;\n    await env.KV.put('user_' + ownerEmail, JSON.stringify(user));\n    const verifyRaw = await env.KV.get('user_' + ownerEmail);\n    if (!verifyRaw) return json({ error: 'Password reset verification read failed' }, 500);\n    const verify = JSON.parse(verifyRaw);\n    if (verify.passwordHash !== passwordHash) return json({ error: 'Password reset verification mismatch' }, 500);\n    return json({ ok: true, beforeScheme, afterScheme: 'pbkdf2-100000', ownerMatchesOrder: true });\n  }\n};\n`, 'utf8');
  writeFileSync(TEMP_CONFIG, [
    'name = "ghosttown-gate30-password-reset"',
    'main = ".roadmap-autopilot/gate30-password-reset-worker.ts"',
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
  const child = spawn(process.execPath, [WRANGLER_CLI, 'dev', '--config', TEMP_CONFIG, '--ip', '127.0.0.1', '--port', String(port)], {
    cwd: ROOT, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env }
  });
  child.stdout?.on('data', chunk => { stdout = bounded(stdout, String(chunk)); });
  child.stderr?.on('data', chunk => { stderr = bounded(stderr, String(chunk)); });
  const safeLogs = () => `${stdout}\n${stderr}`.replaceAll(ownerEmail, '[OWNER_EMAIL_REDACTED]').replaceAll(orderId, '[ORDER_ID_REDACTED]').trim();
  try {
    let ready = false;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Gate 30 password-reset bridge exited before ready.\n${safeLogs()}`);
      try {
        const health = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
        if (health.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolveWait => setTimeout(resolveWait, 250));
    }
    if (!ready) throw new Error(`Gate 30 password-reset bridge did not become ready.\n${safeLogs()}`);
    const response = await fetch(`${baseUrl}/reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId, ownerEmail, passwordHash })
    });
    const text = await response.text();
    let body = null; try { body = JSON.parse(text); } catch {}
    if (!response.ok || body?.ok !== true) throw new Error(`Gate 30 acceptance password reset failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
    return body;
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(TEMP_ENTRY, { force: true });
    rmSync(TEMP_CONFIG, { force: true });
  }
}

const purchase = purchaseReceipt();
const newPassword = String(process.env[NEW_PASSWORD_ENV] || '');
if (newPassword.length < 10) {
  throw new Error(`INPUT_REQUIRED: set ${NEW_PASSWORD_ENV} locally to a new acceptance-only GhostTown password of at least 10 characters. Do not paste it into chat.`);
}
const snapshot = await withAcceptanceDataBindings(client => client.snapshot(purchase.order_id));
const blueprint = JSON.parse(String(snapshot?.blueprintJson || '{}'));
const ownerEmail = String(blueprint?.ownerId || '').trim().toLowerCase();
if (!ownerEmail || blueprint?.orderId !== purchase.order_id) throw new Error('Gate 30 password reset could not prove the canonical paid-order owner.');
const passwordHash = hashPassword(newPassword);
const result = await resetAcceptanceUser(purchase.order_id, ownerEmail, passwordHash);

const receipt = {
  schema_version: 'roadmap-gate30-acceptance-password-reset-receipt-v1',
  verified_at: new Date().toISOString(),
  environment: 'acceptance',
  order_id_sha256: sha256(purchase.order_id),
  owner_id_sha256: sha256(ownerEmail),
  gate20_owner_verified: result.ownerMatchesOrder === true,
  before_password_scheme: result.beforeScheme,
  after_password_scheme: result.afterScheme,
  password_value_recorded: false,
  password_hash_recorded: false,
  stripe_mutated: false,
  blueprint_mutated: false,
  r2_mutated: false,
  progress_mutated: false,
  launch_site_mutated: false,
  research_replayed: false,
  vertex_invoked: false,
  production_mutated: false,
  acceptance_auth_kv_mutated: true,
  decision: 'RESET_FOR_GATE30_RECOVERY_PROOF'
};
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'RESET_FOR_GATE30_RECOVERY_PROOF',
  environment: 'acceptance',
  gate20_owner_verified: true,
  after_password_scheme: 'pbkdf2-100000',
  acceptance_auth_kv_mutated: true,
  stripe_mutated: false,
  blueprint_mutated: false,
  r2_mutated: false,
  progress_mutated: false,
  launch_site_mutated: false,
  production_mutated: false,
  secret_values_recorded: false,
  receipt: '.roadmap-autopilot/gate30-acceptance-password-reset-receipt.json'
}));
