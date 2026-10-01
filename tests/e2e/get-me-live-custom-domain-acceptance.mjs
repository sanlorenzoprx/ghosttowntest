// Custom-domain acceptance (plan §23.2, Slice 7). Runs after the fixture has
// published a Get Me Live order. Attaches a throwaway host inside a
// GhostTown-owned test zone through the real backend path, reconciles until the
// address is active, proves the activation release is served over HTTPS, checks
// the launch receipt did not change, then always disconnects the host.
import { mkdirSync, writeFileSync } from 'node:fs';

const apiBase = String(process.env.GHOSTTOWN_E2E_API_URL || process.env.GHOSTTOWN_E2E_BASE_URL || '').replace(/\/$/, '');
const authToken = String(process.env.GHOSTTOWN_E2E_AUTH_TOKEN || '').trim();
const orderId = String(process.env.GHOSTTOWN_E2E_GML_ORDER_ID || '').trim();
const testZone = String(process.env.GHOSTTOWN_E2E_TEST_ZONE || '').trim().toLowerCase();
const runId = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || 1}`;
const capMs = Number(process.env.GHOSTTOWN_E2E_DOMAIN_CAP_MS || 20 * 60 * 1000);
for (const [name, value] of Object.entries({ GHOSTTOWN_E2E_API_URL: apiBase, GHOSTTOWN_E2E_AUTH_TOKEN: authToken, GHOSTTOWN_E2E_GML_ORDER_ID: orderId, GHOSTTOWN_E2E_TEST_ZONE: testZone })) {
  if (!value) throw new Error(`${name} is required for custom-domain acceptance.`);
}

const hostname = `gml-accept-${runId}.${testZone}`.toLowerCase();
const orderPath = `${apiBase}/api/get-me-live/orders/${encodeURIComponent(orderId)}`;
const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const proof = { schemaVersion: 'ghosttown-custom-domain-acceptance-v1', orderId, hostname, steps: [], recordedAt: new Date().toISOString() };
const log = message => { console.log(`[ghosttown-domain-e2e] ${message}`); proof.steps.push({ at: new Date().toISOString(), message }); };
const fail = message => { throw new Error(message); };

async function api(path, init = {}) {
  const response = await fetch(`${orderPath}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
  return { status: response.status, body, text };
}

let connected = false;
try {
  const receiptBefore = await api('/release-receipt');
  if (receiptBefore.status !== 200) fail(`Launch receipt expected HTTP 200, received ${receiptBefore.status}`);

  const zones = await api(`/custom-domain/zones?name=${encodeURIComponent(testZone)}`);
  if (zones.status !== 200) fail(`Zone listing expected HTTP 200, received ${zones.status}: ${zones.text.slice(0, 300)}`);
  const zone = (zones.body.zones || []).find(item => item.name === testZone);
  if (!zone) fail(`Test zone ${testZone} is not visible in the acceptance Cloudflare account.`);
  log(`zone ${zone.name} (${zone.zoneId})`);

  const connect = await api('/custom-domain', { method: 'POST', body: JSON.stringify({ zoneId: zone.zoneId, hostname }) });
  if (connect.status !== 202) fail(`Connect expected HTTP 202, received ${connect.status}: ${connect.text.slice(0, 300)}`);
  connected = true;
  let record = connect.body.customDomain;
  if (record?.name !== hostname || record?.status !== 'connecting') fail(`Connect returned ${JSON.stringify(record)}`);
  log(`connecting ${hostname} (step ${record.step})`);

  const started = Date.now();
  let lastStep = record.step;
  while (record.status === 'connecting') {
    if (Date.now() - started > capMs) fail(`${hostname} did not become active within ${Math.round(capMs / 60000)} minutes (last step ${record.step}).`);
    await sleep(15_000);
    const reconciled = await api('/custom-domain/reconcile', { method: 'POST' });
    if (reconciled.status !== 200) { log(`reconcile HTTP ${reconciled.status}; retrying`); continue; }
    record = reconciled.body.customDomain;
    if (!record) fail('The custom-domain record disappeared during reconcile.');
    if (record.step !== lastStep) { log(`step ${lastStep} -> ${record.step}`); lastStep = record.step; }
  }
  if (record.status !== 'active') fail(`${hostname} ended ${record.status}: ${record.lastError || 'no error recorded'}`);
  log(`active after ${Math.round((Date.now() - started) / 1000)} s`);

  const releases = await api('/releases');
  const activation = (releases.body.releases || []).find(release => release.kind === 'domain_activation' && release.customDomain === hostname);
  if (!activation) fail('No domain_activation release row was recorded for the test host.');
  const page = await fetch(`https://${hostname}/?gt_verify=${encodeURIComponent(activation.releaseId)}`, { headers: { 'Cache-Control': 'no-cache' } });
  const html = await page.text();
  if (page.status !== 200) fail(`https://${hostname} answered HTTP ${page.status}`);
  if (!html.includes(`<meta name="ghosttown-release-id" content="${activation.releaseId}">`)) fail('The test host does not serve the domain_activation release marker.');
  if (!html.includes(`<link rel="canonical" href="https://${hostname}">`)) fail('The activation release does not use the custom domain as its canonical URL.');
  log(`https://${hostname} serves ${activation.releaseId} with canonical https://${hostname}`);

  const receiptAfter = await api('/release-receipt');
  if (receiptAfter.text !== receiptBefore.text) fail('The launch receipt changed after domain activation.');
  log('launch receipt byte-identical');
  Object.assign(proof, { activationReleaseId: activation.releaseId, launchReceiptUnchanged: true, passed: true });
} finally {
  if (connected) {
    const removed = await api('/custom-domain', { method: 'DELETE' }).catch(error => ({ status: 0, text: String(error) }));
    log(removed.status === 200 ? `disconnected ${hostname}` : `disconnect failed (HTTP ${removed.status}): ${String(removed.text).slice(0, 200)}`);
  }
  mkdirSync('github-acceptance', { recursive: true });
  writeFileSync('github-acceptance/custom-domain-proof.json', `${JSON.stringify(proof, null, 2)}\n`);
}
console.log('[ghosttown-domain-e2e] PASS: custom domain attached, activated, verified and removed.');
