#!/usr/bin/env node
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ownerId = String(process.env.GHOSTTOWN_E2E_FIXTURE_OWNER || '');
const orderId = String(process.env.GHOSTTOWN_E2E_SPRINT_ORDER_ID || '');
const gmlOrderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '');
const checkoutOrderId = String(process.env.GHOSTTOWN_E2E_CHECKOUT_ORDER_ID || '');
if (!ownerId || !orderId || !gmlOrderId) {
  console.log('[acceptance-cleanup] No self-provisioned fixture was recorded; nothing to clean.');
  process.exit(0);
}
// The order's Pages project is named by the real naming path (business-name
// slug, possibly with a suffix). Prefer the name the fixture recorded, then the
// name persisted on the order, then the pre-1c convention.
const legacyProjectName = ('ghosttown-e2e-' + gmlOrderId.replace(/^gml_e2e_/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 58);
const recordedProjectName = String(process.env.GHOSTTOWN_E2E_PAGES_PROJECT || '').trim();
const result = await withAcceptanceDataBindings(client => client.deleteE2eSprintFixture({ ownerId, orderId, gmlOrderId, checkoutOrderId }));
if (result?.deleted !== true) throw new Error('Acceptance fixture cleanup did not confirm deletion.');
const projectName = recordedProjectName || String(result?.pagesProjectName || '').trim() || legacyProjectName;
if (!/^[a-z0-9][a-z0-9-]{0,57}$/.test(projectName)) throw new Error(`Refusing to delete an unexpected Pages project name: ${projectName}`);
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '');
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || '');
if (accountId && apiToken) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + apiToken }
  });
  if (!response.ok && response.status !== 404) console.warn('[acceptance-cleanup] Pages project cleanup returned HTTP ' + response.status);
}
console.log(JSON.stringify({ ok: true, acceptanceOnly: true, fixtureDeleted: true, pagesProject: projectName, pagesProjectSource: recordedProjectName ? 'fixture' : result?.pagesProjectName ? 'order' : 'legacy_convention', productionMutated: false }));
