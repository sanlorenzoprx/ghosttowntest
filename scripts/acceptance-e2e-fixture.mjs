#!/usr/bin/env node
import { randomBytes, randomUUID } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const apiUrl = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const frontendUrl = 'https://ghosttown-acceptance.pages.dev';
const runId = String(process.env.GITHUB_RUN_ID || Date.now());
const attempt = String(process.env.GITHUB_RUN_ATTEMPT || '1');
const nonce = randomUUID().replaceAll('-', '').slice(0, 10);
const ownerId = `ghosttown-e2e-${runId}-${attempt}-${nonce}@example.invalid`;
const orderId = `gtt_e2e_${runId}_${attempt}_${nonce}`;
const gmlOrderId = `gml_e2e_${runId}_${attempt}_${nonce}`;
const password = `E2e!${randomBytes(18).toString('base64url')}`;
const envFile = process.env.GITHUB_ENV;
if (!envFile) throw new Error('GITHUB_ENV is unavailable.');

console.log(`::add-mask::${password}`);
const signup = await fetch(apiUrl + '/api/auth/signup', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: ownerId, password })
});
const signupText = await signup.text();
let signupBody = null; try { signupBody = JSON.parse(signupText); } catch {}
if (!signup.ok || !signupBody?.token) throw new Error(`Acceptance E2E signup failed HTTP ${signup.status}: ${signupBody?.error || 'unknown error'}`);

const cloudflareAccountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
if (!cloudflareAccountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is unavailable.');
const fixture = await withAcceptanceDataBindings(client => client.createE2eSprintFixture({ ownerId, orderId, gmlOrderId, cloudflareAccountId }));
if (fixture?.ok !== true || fixture?.stripeChargeCreated !== false || fixture?.productionMutated !== false) {
  throw new Error('Acceptance E2E fixture did not prove isolation/no-charge invariants.');
}

await appendFile(envFile, [
  `GHOSTTOWN_E2E_FIXTURE_OWNER=${ownerId}`,
  `GHOSTTOWN_E2E_FIXTURE_PASSWORD=${password}`,
  `GHOSTTOWN_E2E_SPRINT_ORDER_ID=${orderId}`,
  `GHOSTTOWN_E2E_GML_ORDER_ID=${gmlOrderId}`
].join('\n') + '\n');

// Preview generation calls Vertex AI, which occasionally times out or returns
// malformed JSON even after its own retries. Retry only those provider stages
// (up to 3 attempts, 30 s apart); any other failure is a real failure.
async function postPreview(label) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(apiUrl + '/api/get-me-live/orders/' + encodeURIComponent(gmlOrderId) + '/preview', {
      method: 'POST', headers: { Authorization: 'Bearer ' + signupBody.token, 'content-type': 'application/json' }, body: '{}'
    });
    const text = await response.text();
    let body = null; try { body = JSON.parse(text); } catch {}
    if (response.ok && body?.buildId) return body;
    last = { status: response.status, body };
    const providerStage = /^website_manufacturing\.vertex_/.test(String(body?.stage || ''));
    if (!providerStage || attempt === 3) break;
    console.warn(`[acceptance-fixture] ${label} preview attempt ${attempt} hit ${body.stage}; retrying in 30 s`);
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  throw new Error(`Acceptance Get Me Live ${label} preview failed HTTP ${last?.status}: ${last?.body?.error || 'unknown error'}${last?.body?.stage ? ` (stage=${last.body.stage})` : ''}`);
}

await postPreview('fixture');

const gmlApi = path => apiUrl + '/api/get-me-live/orders/' + encodeURIComponent(gmlOrderId) + path;
const ownerHeaders = { Authorization: 'Bearer ' + signupBody.token, 'content-type': 'application/json' };
async function ownerJson(path, init = {}) {
  const response = await fetch(gmlApi(path), { ...init, headers: { ...ownerHeaders, ...(init.headers || {}) } });
  const text = await response.text();
  let body = null; try { body = JSON.parse(text); } catch {}
  return { response, body };
}

// Publish, then prove the stable Pages URL serves this exact release. A 202 means
// Cloudflare accepted the deploy but the marker was not observed yet; keep calling
// the explicit, idempotent verify step (every 5 s, up to 10 minutes).
async function publishAndVerify(label) {
  const { response, body } = await ownerJson('/publish', { method: 'POST', body: '{}' });
  if (![200, 202].includes(response.status) || !body?.releaseId || body?.duplicate) {
    throw new Error(`Acceptance Get Me Live ${label} publish failed HTTP ${response.status}: ${body?.error || (body?.duplicate ? 'duplicate attempt' : 'unknown error')}`);
  }
  const releaseId = body.releaseId;
  let pagesUrl = body.pagesUrl;
  const pagesProjectName = String(body.pagesProjectName || '');
  // Record the real project name immediately so cleanup can delete it even if a later step fails.
  if (pagesProjectName) await appendFile(envFile, `GHOSTTOWN_E2E_PAGES_PROJECT=${pagesProjectName}\n`);
  if (body.verified !== true) {
    const deadline = Date.now() + 10 * 60 * 1000;
    for (;;) {
      if (Date.now() > deadline) throw new Error(`Acceptance Get Me Live ${label} release ${releaseId} was not verified within 10 minutes.`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      const verify = await ownerJson('/publish/verify', { method: 'POST', body: '{}' });
      if (!verify.response.ok) throw new Error(`Acceptance Get Me Live ${label} verify failed HTTP ${verify.response.status}: ${verify.body?.error || 'unknown error'}`);
      if (verify.body?.pending) continue;
      if (verify.body?.verified !== true || verify.body?.releaseId !== releaseId) {
        throw new Error(`Acceptance Get Me Live ${label} release ${releaseId} did not verify: ${verify.body?.failure || JSON.stringify(verify.body)}`);
      }
      pagesUrl = verify.body.pagesUrl || pagesUrl;
      break;
    }
  }
  if (!/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(String(pagesUrl || ''))) throw new Error(`Acceptance Get Me Live ${label} pagesUrl is not a stable pages.dev URL: ${pagesUrl}`);
  // Independent cross-check from the runner. A freshly created pages.dev host can
  // answer transient 5xx (e.g. 522) at the edge for a short while after the Worker
  // has already observed the marker, so retry (5 s, up to 3 minutes) before failing.
  const marker = `<meta name="ghosttown-release-id" content="${releaseId}">`;
  const crossCheckDeadline = Date.now() + 3 * 60 * 1000;
  let lastServed = 'no response';
  for (;;) {
    try {
      const served = await fetch(`${pagesUrl}/?gt_verify=${encodeURIComponent(releaseId)}`, { headers: { 'Cache-Control': 'no-cache' } });
      const servedHtml = await served.text();
      if (served.status === 200 && servedHtml.includes(marker)) break;
      lastServed = served.status === 200 ? 'HTTP 200 without this release marker' : `HTTP ${served.status}`;
    } catch (error) {
      lastServed = error instanceof Error ? error.message : String(error);
    }
    if (Date.now() > crossCheckDeadline) {
      throw new Error(`Acceptance Get Me Live ${label} pagesUrl does not serve release ${releaseId} (${lastServed}).`);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return { releaseId, pagesUrl, pagesProjectName };
}

const launch = await publishAndVerify('launch');
if (!launch.pagesProjectName.startsWith('ghosttown-e2e-')) {
  throw new Error(`Acceptance Get Me Live project was not named from the business name: ${launch.pagesProjectName}`);
}

// Republish proof: an edit followed by publish creates a new releaseId that the
// same stable pagesUrl serves.
const currentConfig = await ownerJson('/config');
if (!currentConfig.response.ok || !currentConfig.body?.configuration) throw new Error(`Acceptance Get Me Live config read failed HTTP ${currentConfig.response.status}`);
const editedConfig = structuredClone(currentConfig.body.configuration);
editedConfig.offer.headline = `A simple test page for a synthetic acceptance journey ${nonce}`;
const saved = await ownerJson('/config', { method: 'PUT', body: JSON.stringify(editedConfig) });
if (!saved.response.ok) throw new Error(`Acceptance Get Me Live config save failed HTTP ${saved.response.status}: ${saved.body?.error || 'unknown error'}`);
await postPreview('republish');
const republish = await publishAndVerify('republish');
if (republish.pagesUrl !== launch.pagesUrl) throw new Error(`Acceptance Get Me Live republish moved the site: ${launch.pagesUrl} -> ${republish.pagesUrl}`);
if (republish.releaseId === launch.releaseId) throw new Error('Acceptance Get Me Live republish did not create a new releaseId.');
if (republish.pagesProjectName !== launch.pagesProjectName) throw new Error(`Acceptance Get Me Live republish changed project: ${launch.pagesProjectName} -> ${republish.pagesProjectName}`);

// Result check: before any browser journey, prove the disposable customer can
// see the canonical Sprint through the acceptance Worker.
const exposed = await fetch(apiUrl + '/api/paid-test/orders/' + encodeURIComponent(orderId) + '/blueprint', {
  headers: { Authorization: 'Bearer ' + signupBody.token }
});
const exposedType = exposed.headers.get('content-type') || '';
const exposedText = await exposed.text();
if (!exposedType.includes('application/json')) {
  throw new Error(`Acceptance Sprint exposure check got non-JSON (${exposed.status}, ${exposedType}) from ${apiUrl}`);
}
let exposedBody;
try {
  exposedBody = JSON.parse(exposedText);
} catch {
  throw new Error(`Acceptance Sprint exposure check got invalid JSON (${exposed.status}, ${exposedType}) from ${apiUrl}: ${exposedText.slice(0, 120)}`);
}
if (!exposed.ok || exposedBody?.blueprint?.dailyCalendar?.length !== 30) {
  throw new Error(`Acceptance Sprint fixture is not customer-visible: HTTP ${exposed.status}, days=${exposedBody?.blueprint?.dailyCalendar?.length ?? 'none'}, error=${exposedBody?.error || 'none'}`);
}

// The customer Dashboard reads the order-summary projection, not the Blueprint
// endpoint. Prove that projection exposes this disposable Sprint as a ready
// Launch Blueprint before Playwright depends on the Open Blueprint control.
const dashboardOrders = await fetch(apiUrl + '/api/paid-test/orders', {
  headers: { Authorization: 'Bearer ' + signupBody.token }
});
const dashboardType = dashboardOrders.headers.get('content-type') || '';
const dashboardText = await dashboardOrders.text();
if (!dashboardType.includes('application/json')) {
  throw new Error(`Acceptance Dashboard order check got non-JSON (${dashboardOrders.status}, ${dashboardType}) from ${apiUrl}`);
}
let dashboardBody;
try {
  dashboardBody = JSON.parse(dashboardText);
} catch {
  throw new Error(`Acceptance Dashboard order check got invalid JSON (${dashboardOrders.status}, ${dashboardType}) from ${apiUrl}: ${dashboardText.slice(0, 120)}`);
}
const dashboardOrder = Array.isArray(dashboardBody?.orders)
  ? dashboardBody.orders.find(item => item?.orderId === orderId)
  : null;
if (!dashboardOrders.ok || dashboardOrder?.status !== 'ready' || dashboardOrder?.artifactType !== 'launch_blueprint_v2') {
  throw new Error(`Acceptance Dashboard order projection mismatch: HTTP ${dashboardOrders.status}, status=${dashboardOrder?.status ?? 'missing'}, artifactType=${dashboardOrder?.artifactType ?? 'missing'}`);
}

await appendFile(envFile, [
  `GHOSTTOWN_E2E_BASE_URL=${frontendUrl}`,
  `GHOSTTOWN_E2E_API_URL=${apiUrl}`,
  `GHOSTTOWN_E2E_AUTH_TOKEN=${signupBody.token}`,
  `GHOSTTOWN_E2E_SPRINT_ORDER_ID=${orderId}`,
  `GHOSTTOWN_E2E_GML_ORDER_ID=${gmlOrderId}`,
  `GHOSTTOWN_E2E_LIVE_URL=${republish.pagesUrl}`,
  'GHOSTTOWN_E2E_SUBMIT_LEAD=1',
  'GHOSTTOWN_E2E_SPRINT_MUTATE=1',
  `GHOSTTOWN_E2E_FIXTURE_OWNER=${ownerId}`
].join('\n') + '\n');

console.log(JSON.stringify({
  ok: true, schemaVersion: 'ghosttown-acceptance-e2e-fixture-v1',
  environment: 'acceptance', orderId, gmlOrderId, sourceOrderId: fixture.sourceOrderId,
  freshOwner: true, stripeChargeCreated: false, productionMutated: false,
  authTokenRecorded: false, passwordRecorded: false, expiresInSeconds: fixture.expiresInSeconds,
  pagesUrl: republish.pagesUrl, pagesProjectName: launch.pagesProjectName, launchReleaseId: launch.releaseId, republishReleaseId: republish.releaseId
}));
