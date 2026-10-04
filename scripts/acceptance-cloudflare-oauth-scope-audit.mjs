#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';

const token = String(process.env.CLOUDFLARE_API_TOKEN || '').trim();
if (!token) throw new Error('CLOUDFLARE_API_TOKEN is unavailable.');
const response = await fetch('https://api.cloudflare.com/client/v4/oauth/scopes?per_page=1000', {
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.success === false || !Array.isArray(body?.result)) {
  throw new Error(`Cloudflare OAuth scope catalog failed HTTP ${response.status}`);
}
const interesting = body.result
  .filter(scope => /(account|membership|member|user|pages|zone|dns)/i.test(String(scope?.name || '')))
  .map(scope => ({ id: String(scope.id || ''), name: String(scope.name || ''), category: scope.category || null }))
  .filter(scope => scope.id);
const byName = new Map(interesting.map(scope => [scope.name.toLowerCase(), scope.id]));
const membershipsRead = interesting.find(scope => /^memberships? read$/i.test(scope.name))?.id || null;
const required = {
  membershipsRead,
  pagesWrite: byName.get('pages write') || null
};
const passed = required.pagesWrite === 'page.write' && Boolean(required.membershipsRead);
await mkdir('github-acceptance', { recursive: true });
const receipt = {
  schemaVersion: 'ghosttown-cloudflare-oauth-scope-catalog-v1',
  passed,
  required,
  interesting,
  rawTokenRecorded: false,
  recordedAt: new Date().toISOString()
};
await writeFile('github-acceptance/cloudflare-oauth-scope-catalog.json', JSON.stringify(receipt, null, 2) + '\n');
console.log('[cloudflare-oauth-scopes]', JSON.stringify(receipt));
if (!passed) throw new Error('Cloudflare live OAuth scope catalog is missing Pages Write (page.write) or a Memberships Read scope.');
