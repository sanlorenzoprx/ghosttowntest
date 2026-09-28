import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const CONFIG_PATH = join(ROOT, '.roadmap-acceptance-data-binding-bridge.wrangler.toml');
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const D1_DATABASE_NAME = 'ghosttowntest-blueprints-acceptance';
const D1_DATABASE_ID = '9863d883-3c31-4268-9a98-8392fa3b9f8f';
const KV_NAMESPACE_ID = '849e13521d454361aea286b8e1a5e4c7';
// This local bridge uses only baseline Fetch/Web Crypto plus DB/KV/R2 binding APIs.
// Keep its runtime compatibility aligned with the repository's stable Worker
// baseline. Remote resource routing is controlled per binding by `remote = true`.
const BRIDGE_COMPATIBILITY_DATE = '2024-01-01';

function packageBin(packageName, binName = packageName) {
  const dir = join(ROOT, 'node_modules', packageName);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Could not resolve ${packageName} CLI.`);
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
  return next.length > 32000 ? next.slice(-32000) : next;
}

async function waitForHealth(baseUrl, child, logs) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Acceptance data binding bridge exited before ready.\n${logs()}`);
    try {
      const response = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // Wrangler dev is still starting.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  throw new Error(`Acceptance data binding bridge did not become ready.\n${logs()}`);
}

function bridgeFailure(label, error, child, logs) {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${label}: ${message}\nbridge_exit=${child.exitCode === null ? 'running' : child.exitCode}\n${logs()}`.trim());
}

export async function withAcceptanceDataBindings(callback) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(CONFIG_PATH, [
    'name = "ghosttown-roadmap-acceptance-data-binding-bridge"',
    'main = "scripts/roadmap-r2-binding-worker.ts"',
    `compatibility_date = "${BRIDGE_COMPATIBILITY_DATE}"`,
    'workers_dev = false',
    '',
    '[[d1_databases]]',
    'binding = "DB"',
    `database_name = "${D1_DATABASE_NAME}"`,
    `database_id = "${D1_DATABASE_ID}"`,
    'remote = true',
    '',
    '[[kv_namespaces]]',
    'binding = "KV"',
    `id = "${KV_NAMESPACE_ID}"`,
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

  const request = async (path, init = {}, label = 'Acceptance data binding request failed') => {
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { cache: 'no-store', ...init });
    } catch (error) {
      throw bridgeFailure(label, error, child, logs);
    }
    return response;
  };

  try {
    await waitForHealth(baseUrl, child, logs);
    const client = {
      async get(key) {
        const response = await request(`/object?key=${encodeURIComponent(key)}`, { method: 'GET' }, 'R2 binding GET transport failed');
        if (!response.ok) throw new Error(`R2 binding GET failed HTTP ${response.status}: ${await response.text()}`);
        return Buffer.from(await response.arrayBuffer());
      },
      async put(key, bytes, metadata) {
        const response = await request(`/object?key=${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: {
            'content-type': metadata.contentType,
            'content-disposition': metadata.contentDisposition,
            'x-ghosttown-order-id': metadata.orderId,
            'x-ghosttown-owner-id': metadata.ownerId,
            'x-ghosttown-schema-version': metadata.schemaVersion,
            'x-ghosttown-sha256': metadata.sha256
          },
          body: bytes
        }, 'R2 binding PUT transport failed');
        const text = await response.text();
        let body = null;
        try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`R2 binding PUT failed HTTP ${response.status}: ${text}`);
        return body;
      },
      async snapshot(orderId) {
        const response = await request(`/snapshot?orderId=${encodeURIComponent(orderId)}`, { method: 'GET' }, 'Acceptance snapshot transport failed');
        const text = await response.text();
        let body = null;
        try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`Acceptance snapshot failed HTTP ${response.status}: ${text}`);
        return body;
      },
      async createE2eSprintFixture(payload) {
        const response = await request('/e2e-sprint-fixture', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
        }, 'Acceptance E2E Sprint fixture transport failed');
        const text = await response.text(); let body = null; try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`Acceptance E2E Sprint fixture failed HTTP ${response.status}: ${text}`);
        return body;
      },
      async deleteE2eSprintFixture(payload) {
        const response = await request('/e2e-sprint-fixture', {
          method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
        }, 'Acceptance E2E Sprint fixture cleanup transport failed');
        const text = await response.text(); let body = null; try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`Acceptance E2E Sprint fixture cleanup failed HTTP ${response.status}: ${text}`);
        return body;
      },
      async rematerialize(payload) {
        const response = await request('/rematerialize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }, 'Acceptance rematerialization transport failed');
        const text = await response.text();
        let body = null;
        try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`Acceptance rematerialization failed HTTP ${response.status}: ${text}`);
        return body;
      }
    };
    return await callback(client);
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(CONFIG_PATH, { force: true });
  }
}

export async function withAcceptanceR2Binding(callback) {
  return withAcceptanceDataBindings(client => callback({ get: client.get, put: client.put }));
}

export const acceptanceR2BucketName = R2_BUCKET;
export const acceptanceD1DatabaseName = D1_DATABASE_NAME;
export const acceptanceD1DatabaseId = D1_DATABASE_ID;
export const acceptanceKvNamespaceId = KV_NAMESPACE_ID;
