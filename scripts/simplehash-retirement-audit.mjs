#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const WRANGLER_PATH = join(ROOT, 'wrangler.toml');
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const RECEIPT_PATH = join(STATE_DIR, 'simplehash-retirement-audit.json');
const TEMP_ENTRY = join(STATE_DIR, 'simplehash-retirement-audit-worker.ts');
const TEMP_CONFIG = join(ROOT, '.simplehash-retirement-audit.wrangler.toml');
const PASSWORD_ITERATIONS = 100_000;

const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const sleep = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));

function productionKvNamespaceId() {
  const source = readFileSync(WRANGLER_PATH, 'utf8');
  const match = source.match(/\[\[env\.production\.kv_namespaces\]\][\s\S]*?binding\s*=\s*"KV"[\s\S]*?id\s*=\s*"([^"]+)"/);
  if (!match?.[1]) throw new Error('Could not resolve the production KV namespace from wrangler.toml.');
  return match[1];
}

function wranglerCli() {
  const packageDir = join(ROOT, 'node_modules', 'wrangler');
  const packagePath = join(packageDir, 'package.json');
  if (!existsSync(packagePath)) throw new Error('Run npm ci before the simpleHash retirement audit.');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.wrangler;
  if (!bin) throw new Error('Could not resolve the Wrangler CLI.');
  return resolve(packageDir, bin);
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

function bridgeSource() {
  return `interface Env { KV: KVNamespace; }\n\n` +
`const PBKDF2 = /^pbkdf2\\$${PASSWORD_ITERATIONS}\\$[^$]+\\$[^$]+$/;\n` +
`const LEGACY = /^[0-9a-z]{1,7}$/;\n\n` +
`export default { async fetch(request: Request, env: Env): Promise<Response> {\n` +
`  const url = new URL(request.url);\n` +
`  if (url.pathname === '/health') return Response.json({ ok: true });\n` +
`  if (url.pathname !== '/audit' || request.method !== 'GET') return new Response('Not found', { status: 404 });\n` +
`  const counts = { accountRecords: 0, pbkdf2: 0, legacySimpleHash: 0, unsupportedHash: 0, missingPasswordHash: 0, keyIdentityMismatch: 0, migratedMarker: 0, nonAccountUserPrefixRecords: 0 };\n` +
`  let cursor: string | undefined;\n` +
`  do {\n` +
`    const page = await env.KV.list({ prefix: 'user_', limit: 1000, ...(cursor ? { cursor } : {}) });\n` +
`    for (const key of page.keys) {\n` +
`      const raw = await env.KV.get(key.name);\n` +
`      if (!raw) continue;\n` +
`      let value: any;\n` +
`      try { value = JSON.parse(raw); } catch { counts.nonAccountUserPrefixRecords += 1; continue; }\n` +
`      if (!value || typeof value !== 'object' || typeof value.email !== 'string') { counts.nonAccountUserPrefixRecords += 1; continue; }\n` +
`      const email = value.email.trim().toLowerCase();\n` +
`      if (!email || key.name !== 'user_' + email) { counts.keyIdentityMismatch += 1; continue; }\n` +
`      counts.accountRecords += 1;\n` +
`      if (typeof value.legacyPasswordMigratedAt === 'string' && value.legacyPasswordMigratedAt) counts.migratedMarker += 1;\n` +
`      if (typeof value.passwordHash !== 'string' || !value.passwordHash) { counts.missingPasswordHash += 1; continue; }\n` +
`      if (PBKDF2.test(value.passwordHash)) counts.pbkdf2 += 1;\n` +
`      else if (LEGACY.test(value.passwordHash)) counts.legacySimpleHash += 1;\n` +
`      else counts.unsupportedHash += 1;\n` +
`    }\n` +
`    cursor = page.list_complete ? undefined : page.cursor;\n` +
`  } while (cursor);\n` +
`  let decision = 'ELIGIBLE_FOR_SIMPLEHASH_REMOVAL';\n` +
`  if (counts.accountRecords === 0) decision = 'BLOCKED_NO_ACCOUNT_RECORDS_OBSERVED';\n` +
`  else if (counts.legacySimpleHash > 0) decision = 'BLOCKED_LEGACY_ACCOUNTS_PRESENT';\n` +
`  else if (counts.unsupportedHash > 0 || counts.missingPasswordHash > 0 || counts.keyIdentityMismatch > 0) decision = 'BLOCKED_ACCOUNT_HASH_ANOMALY';\n` +
`  return Response.json({ schemaVersion: 'simplehash-retirement-audit-v1', readOnly: true, counts, decision }, { headers: { 'Cache-Control': 'no-store' } });\n` +
`} };\n`;
}

async function runAudit() {
  const namespaceId = productionKvNamespaceId();
  const cli = wranglerCli();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(TEMP_ENTRY, bridgeSource(), 'utf8');
  writeFileSync(TEMP_CONFIG, [
    'name = "ghosttown-simplehash-retirement-audit"',
    'main = ".roadmap-autopilot/simplehash-retirement-audit-worker.ts"',
    'compatibility_date = "2024-01-01"',
    'workers_dev = false',
    '',
    '[[kv_namespaces]]',
    'binding = "KV"',
    `id = "${namespaceId}"`,
    'remote = true',
    ''
  ].join('\n'), 'utf8');

  let logs = '';
  const child = spawn(process.execPath, [cli, 'dev', '--config', TEMP_CONFIG, '--ip', '127.0.0.1', '--port', String(port)], {
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
      if (child.exitCode !== null) throw new Error(`Read-only production KV audit bridge exited before ready. ${logs.slice(-2000)}`);
      try {
        const response = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
        if (response.ok) { ready = true; break; }
      } catch {}
      await sleep(250);
    }
    if (!ready) throw new Error(`Read-only production KV audit bridge did not become ready. ${logs.slice(-2000)}`);

    const response = await fetch(`${baseUrl}/audit`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Production KV audit returned HTTP ${response.status}.`);
    const audit = await response.json();
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    const receipt = {
      ...audit,
      auditedAt: new Date().toISOString(),
      repositoryHead: /^[a-f0-9]{40}$/.test(head) ? head : null,
      productionKvNamespaceIdSha256: sha256(namespaceId),
      privacy: 'Counts only. No emails, password hashes, raw account values, credentials, or tokens are recorded.'
    };
    writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(receipt, null, 2));
    console.log(`\nReceipt: ${RECEIPT_PATH}`);
    if (receipt.decision !== 'ELIGIBLE_FOR_SIMPLEHASH_REMOVAL') process.exitCode = 2;
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(TEMP_ENTRY, { force: true });
    rmSync(TEMP_CONFIG, { force: true });
  }
}

runAudit().catch(error => {
  console.error(`[simplehash-retirement-audit] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
