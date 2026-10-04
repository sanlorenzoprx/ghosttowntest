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
  .filter(scope => /^(Account Read|Pages Write|Pages Read|Zone Read|DNS Write)$/i.test(String(scope?.name || '')))
  .map(scope => ({ id: String(scope.id || ''), name: String(scope.name || ''), category: scope.category || null }))
  .filter(scope => scope.id);
const byName = new Map(interesting.map(scope => [scope.name.toLowerCase(), scope.id]));
const required = {
  accountRead: byName.get('account read') || null,
  pagesWrite: byName.get('pages write') || null
};
const passed = required.accountRead === 'account.read' && required.pagesWrite === 'pages.write';
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
if (!passed) throw new Error('Cloudflare live OAuth scope catalog does not match the expected account.read/pages.write IDs.');
