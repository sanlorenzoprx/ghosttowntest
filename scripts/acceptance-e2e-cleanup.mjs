#!/usr/bin/env node
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ownerId = String(process.env.GHOSTTOWN_E2E_FIXTURE_OWNER || '');
const orderId = String(process.env.GHOSTTOWN_E2E_SPRINT_ORDER_ID || '');
const gmlOrderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
if (!ownerId || !orderId || !gmlOrderId) {
  console.log('[acceptance-cleanup] No self-provisioned fixture was recorded; nothing to clean.');
  process.exit(0);
}
const projectName = ('ghosttown-e2e-' + gmlOrderId.replace(/^gml_e2e_/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 58);
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '');
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || '');
if (accountId && apiToken) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + apiToken }
  });
  if (!response.ok && response.status !== 404) console.warn('[acceptance-cleanup] Pages project cleanup returned HTTP ' + response.status);
}
const result = await withAcceptanceDataBindings(client => client.deleteE2eSprintFixture({ ownerId, orderId, gmlOrderId }));
if (result?.deleted !== true) throw new Error('Acceptance fixture cleanup did not confirm deletion.');
console.log(JSON.stringify({ ok: true, acceptanceOnly: true, fixtureDeleted: true, pagesProject: projectName, productionMutated: false }));
