import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const payloadDir = resolve(process.cwd(), 'scripts/.blueprint-correction-payload');
const payload = readdirSync(payloadDir).filter(name => name.startsWith('part-')).sort()
  .map(name => readFileSync(resolve(payloadDir, name), 'utf8').trim()).join('');
const files = JSON.parse(gunzipSync(Buffer.from(payload, 'base64')).toString('utf8'));
for (const [path, content] of Object.entries(files)) {
  if (path.startsWith('/') || path.includes('..')) throw new Error(`Unsafe correction path: ${path}`);
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  console.log(`[blueprint-correction] wrote ${path}`);
}
rmSync(payloadDir, { recursive: true, force: true });
rmSync(resolve(process.cwd(), 'scripts/apply-blueprint-v211-correction.mjs'), { force: true });
console.log(`[blueprint-correction] applied ${Object.keys(files).length} files`);
