import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const catalog = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'functional-discovery-intents.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(DIST, 'discovery-manifest.json'), 'utf8'));

const routes = catalog.intents.flatMap(intent => Object.values(intent.locales || {}));
if (manifest.schemaVersion !== 'ghosttown-functional-discovery-v2') throw new Error('Generated discovery manifest is not v2.');
if (manifest.semanticIntentCount !== catalog.intents.length) throw new Error('Generated intent count does not match catalog.');
if (manifest.localizedRouteCount !== routes.length) throw new Error('Generated route count does not match catalog.');
if (manifest.canonicalCapability !== '/api/v1/free-verdict') throw new Error('Generated discovery capability drifted from canonical verdict API.');

const sitemap = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const llms = await fs.readFile(path.join(DIST, 'llms.txt'), 'utf8');
for (const route of routes) {
  const htmlPath = path.join(DIST, route.slug, 'index.html');
  const mdPath = path.join(DIST, `${route.slug}.md`);
  const [html] = await Promise.all([fs.readFile(htmlPath, 'utf8'), fs.access(mdPath)]);
  const marker = '<script>(()=>{';
  const start = html.lastIndexOf(marker);
  const end = html.lastIndexOf('</script>');
  if (start < 0 || end <= start) throw new Error(`Generated inline script missing: ${route.slug}`);
  const js = html.slice(start + '<script>'.length, end);
  new Function(js);
  const url = `https://ghosttowntest.com/${route.slug}`;
  if (!sitemap.includes(url)) throw new Error(`Sitemap missing ${url}`);
  if (!llms.includes(url)) throw new Error(`llms.txt missing ${url}`);
}

if (manifest.keywordCorpus?.en < 50 || manifest.keywordCorpus?.es < 50) throw new Error('Generated keyword corpus is below 50 candidates per locale.');
console.log(`Verified ${manifest.localizedRouteCount} generated discovery routes across ${manifest.semanticIntentCount} intents; inline JavaScript, Markdown twins, sitemap and llms.txt are consistent.`);
