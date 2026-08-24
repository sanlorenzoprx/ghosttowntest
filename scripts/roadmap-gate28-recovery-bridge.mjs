import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const CONFIG_PATH = join(ROOT, '.roadmap-gate28-recovery.wrangler.toml');
const COMPATIBILITY_DATE = '2024-01-01';
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const D1_ID = '9863d883-3c31-4268-9a98-8392fa3b9f8f';
const KV_ID = '849e13521d454361aea286b8e1a5e4c7';
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';

function packageBin(packageName, binName = packageName) {
  const dir = join(ROOT, 'node_modules', packageName);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Gate 28 recovery could not resolve ${packageName} CLI.`);
  return resolve(dir, bin);
}

const WRANGLER_CLI = packageBin('wrangler', 'wrangler');

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

function appendBounded(current, chunk) {
  const next = `${current}${chunk}`;
  return next.length > 48000 ? next.slice(-48000) : next;
}

async function waitForHealth(baseUrl, child, logs) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Gate 28 recovery bridge exited before ready.\n${logs()}`);
    try {
      const response = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // local workerd is still starting
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  throw new Error(`Gate 28 recovery bridge did not become ready.\n${logs()}`);
}

function transportError(label, error, child, logs) {
  return new Error(`${label}: ${error instanceof Error ? error.message : String(error)}\nbridge_exit=${child.exitCode === null ? 'running' : child.exitCode}\n${logs()}`.trim());
}

export async function withGate28RecoveryBindings(callback) {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(CONFIG_PATH, [
    'name = "ghosttown-gate28-recovery"',
    'main = "scripts/roadmap-gate28-recovery-worker.ts"',
    `compatibility_date = "${COMPATIBILITY_DATE}"`,
    'workers_dev = false',
    '',
    '[[d1_databases]]',
    'binding = "DB"',
    `database_name = "${D1_NAME}"`,
    `database_id = "${D1_ID}"`,
    'remote = true',
    '',
    '[[kv_namespaces]]',
    'binding = "KV"',
    `id = "${KV_ID}"`,
    'remote = true',
    '',
    '[[r2_buckets]]',
    'binding = "BLUEPRINTS"',
    `bucket_name = "${R2_BUCKET}"`,
    'remote = true',
    ''
  ].join('\n'), 'utf8');

  let stdout = '';
  let stderr = '';
  const child = spawn(process.execPath, [WRANGLER_CLI, 'dev', '--config', CONFIG_PATH, '--ip', '127.0.0.1', '--port', String(port)], {
    cwd: ROOT,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  child.stdout?.on('data', chunk => { stdout = appendBounded(stdout, String(chunk)); });
  child.stderr?.on('data', chunk => { stderr = appendBounded(stderr, String(chunk)); });
  const logs = () => `${stdout}\n${stderr}`.trim();

  const requestJson = async (path, init, label) => {
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { cache: 'no-store', ...init });
    } catch (error) {
      throw transportError(label, error, child, logs);
    }
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${text}\n${logs()}`.trim());
    return body;
  };

  try {
    await waitForHealth(baseUrl, child, logs);
    return await callback({
      canonical(orderId) {
        return requestJson(`/canonical?orderId=${encodeURIComponent(orderId)}`, { method: 'GET' }, 'Gate 28 recovery canonical read failed');
      },
      rematerialize(payload) {
        return requestJson('/rematerialize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }, 'Gate 28 recovery transaction failed');
      }
    });
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(CONFIG_PATH, { force: true });
  }
}
