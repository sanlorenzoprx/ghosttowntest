import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const CONFIG_PATH = join(ROOT, '.roadmap-r2-binding-bridge.wrangler.toml');
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';

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
  return next.length > 24000 ? next.slice(-24000) : next;
}

async function waitForHealth(baseUrl, child, logs) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`R2 binding bridge exited before ready.\n${logs()}`);
    try {
      const response = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // Wrangler dev is still starting.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  throw new Error(`R2 binding bridge did not become ready.\n${logs()}`);
}

export async function withAcceptanceR2Binding(callback) {
  mkdirSync(STATE_DIR, { recursive: true });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeFileSync(CONFIG_PATH, `name = "ghosttown-roadmap-r2-binding-bridge"\nmain = "scripts/roadmap-r2-binding-worker.ts"\ncompatibility_date = "2026-08-18"\nworkers_dev = false\n\n[[r2_buckets]]\nbinding = "BLUEPRINTS"\nbucket_name = "${R2_BUCKET}"\nremote = true\n`, 'utf8');

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

  try {
    await waitForHealth(baseUrl, child, logs);
    const client = {
      async get(key) {
        const response = await fetch(`${baseUrl}/object?key=${encodeURIComponent(key)}`, { method: 'GET', cache: 'no-store' });
        if (!response.ok) throw new Error(`R2 binding GET failed HTTP ${response.status}: ${await response.text()}`);
        return Buffer.from(await response.arrayBuffer());
      },
      async put(key, bytes, metadata) {
        const response = await fetch(`${baseUrl}/object?key=${encodeURIComponent(key)}`, {
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
        });
        const text = await response.text();
        let body = null;
        try { body = JSON.parse(text); } catch {}
        if (!response.ok) throw new Error(`R2 binding PUT failed HTTP ${response.status}: ${text}`);
        return body;
      }
    };
    return await callback(client);
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(CONFIG_PATH, { force: true });
  }
}

export const acceptanceR2BucketName = R2_BUCKET;
