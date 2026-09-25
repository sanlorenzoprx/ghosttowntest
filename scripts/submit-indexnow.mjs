import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://ghosttowntest.com';
const HOST = 'ghosttowntest.com';
const KEY = '67fd4ba161fec63f38248051c548f077';
const KEY_LOCATION = `${SITE_ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const dryRun = process.argv.includes('--dry-run');

const catalog = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'functional-discovery-intents.json'), 'utf8'));
if (catalog?.schemaVersion !== 'ghosttown-functional-discovery-v2' || !Array.isArray(catalog.intents)) {
  throw new Error('IndexNow requires the functional discovery v2 catalog.');
}
const localized = catalog.intents.flatMap(intent =>
  Object.values(intent.locales || {}).flatMap(route => [
    `${SITE_ORIGIN}/${route.slug}`,
    `${SITE_ORIGIN}/${route.slug}.md`
  ])
);
const urls = Array.from(new Set([
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/llms.txt`,
  `${SITE_ORIGIN}/llms-full.txt`,
  `${SITE_ORIGIN}/openapi.json`,
  `${SITE_ORIGIN}/discovery-manifest.json`,
  `${SITE_ORIGIN}/distribution-channels.json`,
  `${SITE_ORIGIN}/agent/index.md`,
  `${SITE_ORIGIN}/agent/capabilities.md`,
  `${SITE_ORIGIN}/agent/evidence.md`,
  `${SITE_ORIGIN}/agent/privacy.md`,
  ...localized
]));

const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls };
if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}
const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
});
if (![200, 202].includes(response.status)) {
  const body = await response.text().catch(() => '');
  throw new Error(`IndexNow submission failed HTTP ${response.status}${body ? `: ${body.slice(0, 500)}` : ''}`);
}
console.log(`IndexNow accepted ${urls.length} GhostTown URLs with HTTP ${response.status}.`);
