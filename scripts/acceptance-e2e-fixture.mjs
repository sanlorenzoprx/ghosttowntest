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

const signup = await fetch(apiUrl + '/api/auth/signup', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: ownerId, password })
});
const signupText = await signup.text();
let signupBody = null; try { signupBody = JSON.parse(signupText); } catch {}
if (!signup.ok || !signupBody?.token) throw new Error(`Acceptance E2E signup failed HTTP ${signup.status}: ${signupBody?.error || 'unknown error'}`);

const fixture = await withAcceptanceDataBindings(client => client.createE2eSprintFixture({ ownerId, orderId, gmlOrderId }));
if (fixture?.ok !== true || fixture?.stripeChargeCreated !== false || fixture?.productionMutated !== false) {
  throw new Error('Acceptance E2E fixture did not prove isolation/no-charge invariants.');
}

await appendFile(envFile, [
  `GHOSTTOWN_E2E_FIXTURE_OWNER=${ownerId}`,
  `GHOSTTOWN_E2E_SPRINT_ORDER_ID=${orderId}`,
  `GHOSTTOWN_E2E_GML_ORDER_ID=${gmlOrderId}`
].join('\n') + '\n');

const publish = await fetch(apiUrl + '/api/get-me-live/orders/' + encodeURIComponent(gmlOrderId) + '/publish', {
  method: 'POST', headers: { Authorization: 'Bearer ' + signupBody.token, 'content-type': 'application/json' }, body: '{}'
});
const publishText = await publish.text();
let publishBody = null; try { publishBody = JSON.parse(publishText); } catch {}
if (!publish.ok || !publishBody?.publicUrl) throw new Error(`Acceptance Get Me Live fixture publish failed HTTP ${publish.status}: ${publishBody?.error || 'unknown error'}`);

await appendFile(envFile, [
  `GHOSTTOWN_E2E_BASE_URL=${frontendUrl}`,
  `GHOSTTOWN_E2E_AUTH_TOKEN=${signupBody.token}`,
  `GHOSTTOWN_E2E_SPRINT_ORDER_ID=${orderId}`,
  `GHOSTTOWN_E2E_GML_ORDER_ID=${gmlOrderId}`,
  `GHOSTTOWN_E2E_LIVE_URL=${publishBody.publicUrl}`,
  'GHOSTTOWN_E2E_SUBMIT_LEAD=1',
  'GHOSTTOWN_E2E_SPRINT_MUTATE=1',
  `GHOSTTOWN_E2E_FIXTURE_OWNER=${ownerId}`
].join('\n') + '\n');

console.log(JSON.stringify({
  ok: true, schemaVersion: 'ghosttown-acceptance-e2e-fixture-v1',
  environment: 'acceptance', orderId, gmlOrderId, sourceOrderId: fixture.sourceOrderId, sourceGmlOrderId: fixture.sourceGmlOrderId,
  freshOwner: true, stripeChargeCreated: false, productionMutated: false,
  authTokenRecorded: false, passwordRecorded: false, expiresInSeconds: fixture.expiresInSeconds
}));
