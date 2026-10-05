#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { withAcceptanceDataBindings } from './roadmap-r2-binding-bridge.mjs';

const ownerId = String(process.env.GHOSTTOWN_OAUTH_TEST_OWNER || '').trim().toLowerCase();
if (!ownerId.includes('@') || ownerId.endsWith('@example.invalid')) {
  throw new Error('GHOSTTOWN_OAUTH_TEST_OWNER must be the human acceptance test account, not an @example.invalid fixture.');
}
const runId = String(process.env.GITHUB_RUN_ID || 'manual').replace(/[^0-9A-Za-z_-]/g, '');
const orderId = `gtt_e2e_oauth_${runId}`;
const gmlOrderId = `gml_e2e_oauth_${runId}`;
const frontendUrl = 'https://main.ghosttown-acceptance.pages.dev';
const fixture = await withAcceptanceDataBindings(client => client.createE2eSprintFixture({
  ownerId,
  orderId,
  gmlOrderId,
  cloudflareMode: 'oauth'
}));
if (fixture?.ok !== true || fixture?.cloudflareMode !== 'oauth' || fixture?.productionMutated !== false || fixture?.stripeChargeCreated !== false) {
  throw new Error('Cloudflare OAuth acceptance fixture did not preserve token-free/no-charge isolation.');
}
const effectiveOrderId = String(fixture.orderId || orderId);
const effectiveGmlOrderId = String(fixture.gmlOrderId || gmlOrderId);
const setupUrl = `${frontendUrl}/get-me-live/setup?order_id=${encodeURIComponent(effectiveGmlOrderId)}&step=cloudflare`;

await mkdir('github-acceptance', { recursive: true });
const receipt = {
  schemaVersion: 'ghosttown-cloudflare-oauth-fixture-v1',
  environment: 'acceptance',
  ownerId,
  orderId: effectiveOrderId,
  gmlOrderId: effectiveGmlOrderId,
  setupUrl,
  tokenInjected: false,
  paidFixture: true,
  stripeChargeCreated: false,
  productionMutated: false,
  reused: fixture.reused === true,
  recordedAt: new Date().toISOString()
};
await writeFile('github-acceptance/cloudflare-oauth-fixture.json', JSON.stringify(receipt, null, 2) + '\n');

if (process.env.GITHUB_ENV) {
  await appendFile(process.env.GITHUB_ENV, [
    `GHOSTTOWN_OAUTH_SPRINT_ORDER_ID=${effectiveOrderId}`,
    `GHOSTTOWN_OAUTH_GML_ORDER_ID=${effectiveGmlOrderId}`,
    `GHOSTTOWN_OAUTH_SETUP_URL=${setupUrl}`
  ].join('\n') + '\n');
}
console.log(`[cloudflare-oauth-fixture] READY: ${setupUrl}`);
