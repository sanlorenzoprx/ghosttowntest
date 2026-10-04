#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const TEMP_ENTRY = join(STATE_DIR, 'acceptance-cloudflare-oauth-proof-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SMOKE_PATH = '/__acceptance/cloudflare-oauth-proof';
const PROOF_PATH = join(ROOT, 'github-acceptance', 'cloudflare-oauth-proof.json');
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function runWrangler(args) {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function sleep(ms) { return new Promise(resolvePromise => setTimeout(resolvePromise, ms)); }

async function postWithPropagationRetry(token) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null; try { body = JSON.parse(text); } catch {}
    const canonicalWorkerStillServing = response.status === 404 && (body?.error === 'Endpoint not found' || !body);
    if (!canonicalWorkerStillServing || attempt === 8) return { response, body };
    console.log(`Cloudflare OAuth proof temporary Worker not propagated yet; retrying ${attempt}/8...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Cloudflare OAuth proof propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token) {
  return `import app from '../src/api/worker.ts';
import { cloudflareOAuthScopes, listCloudflareAccounts } from '../src/api/getMeLiveProviders.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${JSON.stringify(token)};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function verify(env) {
  if (env.DEPLOYMENT_ENV !== 'acceptance') return json({ ok: false, error: 'Not acceptance' }, 404);
  const pointerRaw = await env.KV.get('acceptance_cloudflare_oauth_fixture_v1');
  if (!pointerRaw) return json({ ok: false, inputRequired: true, stage: 'fixture', error: 'Cloudflare OAuth fixture is not prepared' }, 409);
  let pointer = null; try { pointer = JSON.parse(pointerRaw); } catch {}
  const orderId = String(pointer?.gmlOrderId || '');
  if (!orderId) return json({ ok: false, error: 'Cloudflare OAuth fixture pointer is invalid' }, 500);

  const row = await env.DB.prepare('SELECT owner_id, source_sprint_order_id, provider_state_json, paid_at FROM get_me_live_orders WHERE order_id = ?')
    .bind(orderId).first();
  if (!row || !row.paid_at) return json({ ok: false, error: 'OAuth Get Me Live fixture order is unavailable or unpaid' }, 409);
  let provider = null; try { provider = JSON.parse(row.provider_state_json || '{}'); } catch {}

  const tokenKey = 'get_me_live_cf_token_' + orderId;
  const rawToken = await env.KV.get(tokenKey);
  if (provider?.cloudflareConnected !== true || !rawToken) {
    return json({
      ok: false,
      inputRequired: true,
      stage: 'consent',
      orderId,
      ownerId: row.owner_id,
      providerStateConnected: provider?.cloudflareConnected === true,
      tokenPersisted: Boolean(rawToken),
      error: 'Authorize Cloudflare from the acceptance Get Me Live setup, then rerun this proof.'
    }, 409);
  }

  let before = null; try { before = JSON.parse(rawToken); } catch {}
  if (!before?.accessToken || !before?.refreshToken || !before?.expiresAt) {
    return json({ ok: false, error: 'Cloudflare OAuth callback did not persist a refresh-capable token envelope' }, 409);
  }

  const configuredScopes = cloudflareOAuthScopes(env.CLOUDFLARE_OAUTH_SCOPES);
  if (!configuredScopes.includes('account.read') || !configuredScopes.includes('pages.write')) {
    return json({ ok: false, error: 'Cloudflare OAuth scopes do not include account.read and pages.write', configuredScopes }, 409);
  }
  if (!env.CLOUDFLARE_OAUTH_CLIENT_ID || !env.CLOUDFLARE_OAUTH_CLIENT_SECRET) {
    return json({ ok: false, error: 'Cloudflare OAuth client credentials are not configured' }, 500);
  }

  let accountsBefore;
  try {
    accountsBefore = await listCloudflareAccounts(env, orderId);
  } catch (error) {
    return json({ ok: false, error: 'Stored Cloudflare OAuth access token could not list authorized accounts: ' + (error instanceof Error ? error.message : String(error)) }, 409);
  }
  if (!accountsBefore.length) return json({ ok: false, error: 'Cloudflare OAuth token returned no authorized accounts' }, 409);

  const forced = { ...before, expiresAt: new Date(Date.now() - 60_000).toISOString() };
  await env.KV.put(tokenKey, JSON.stringify(forced), { expirationTtl: 86400 * 30 });

  let accountsAfter;
  try {
    accountsAfter = await listCloudflareAccounts(env, orderId);
  } catch (error) {
    await env.KV.put(tokenKey, rawToken, { expirationTtl: 86400 * 30 });
    return json({ ok: false, error: 'Cloudflare OAuth refresh path failed: ' + (error instanceof Error ? error.message : String(error)) }, 409);
  }

  const afterRaw = await env.KV.get(tokenKey);
  let after = null; try { after = afterRaw ? JSON.parse(afterRaw) : null; } catch {}
  const refreshSucceeded = Boolean(
    after?.accessToken
    && after?.refreshToken
    && Date.parse(String(after.expiresAt || '')) > Date.now() + 60_000
    && accountsAfter.length > 0
  );
  if (!refreshSucceeded) {
    await env.KV.put(tokenKey, rawToken, { expirationTtl: 86400 * 30 });
    return json({ ok: false, error: 'Cloudflare OAuth refresh did not persist a fresh usable token' }, 409);
  }

  const proof = {
    ok: true,
    passed: true,
    environment: 'acceptance',
    orderId,
    ownerMatchesFixture: row.owner_id === pointer.ownerId,
    paidFixture: true,
    tokenInjected: false,
    consentCallbackPersisted: true,
    providerStateConnected: true,
    accessTokenStored: true,
    refreshTokenStored: true,
    configuredScopes,
    accountReadScopeConfigured: configuredScopes.includes('account.read'),
    pagesWriteScopeConfigured: configuredScopes.includes('pages.write'),
    grantedScopeFieldPresent: typeof before.scope === 'string' && before.scope.length > 0,
    accountListBeforeRefreshCount: accountsBefore.length,
    forcedExpiryApplied: true,
    refreshPathExercised: true,
    refreshSucceeded: true,
    accountListAfterRefreshCount: accountsAfter.length,
    refreshedTokenExpiresInFuture: true,
    clientIdConfigured: true,
    clientSecretConfigured: true,
    secretValuesRecorded: false,
    verifiedAt: new Date().toISOString()
  };
  await env.KV.put('acceptance_cloudflare_oauth_proof_v1', JSON.stringify(proof), { expirationTtl: 86400 * 7 });
  return json(proof);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return verify(env);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

mkdirSync(STATE_DIR, { recursive: true });
mkdirSync(join(ROOT, 'github-acceptance'), { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token), 'utf8');

let wrappedDeployed = false;
let proofBody = null;
let proofError = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/acceptance-cloudflare-oauth-proof-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;
  const { response, body } = await postWithPropagationRetry(token);
  proofBody = body;
  if (!response.ok || body?.passed !== true) {
    if (body?.inputRequired === true) {
      throw new Error(`INPUT_REQUIRED:${body.stage || 'oauth'}: ${body.error || 'Cloudflare OAuth user action is required'}`);
    }
    throw new Error(`Cloudflare OAuth proof failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
} catch (error) {
  proofError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try { runWrangler(['deploy', '--env', 'acceptance']); }
    catch (error) { restoreError = error; }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Cloudflare OAuth proof temporary Worker could not restore the canonical acceptance Worker: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

const output = proofBody?.passed === true ? {
  schemaVersion: 'ghosttown-cloudflare-oauth-proof-v1',
  ...proofBody,
  recordedAt: new Date().toISOString()
} : {
  schemaVersion: 'ghosttown-cloudflare-oauth-proof-v1',
  passed: false,
  inputRequired: proofBody?.inputRequired === true,
  stage: proofBody?.stage || null,
  providerStateConnected: proofBody?.providerStateConnected === true,
  tokenPersisted: proofBody?.tokenPersisted === true,
  error: proofError instanceof Error ? proofError.message : String(proofError || proofBody?.error || 'unknown failure'),
  secretValuesRecorded: false,
  recordedAt: new Date().toISOString()
};
writeFileSync(PROOF_PATH, JSON.stringify(output, null, 2) + '\n');

if (proofError) throw proofError;
if (proofBody?.passed !== true) throw new Error('Cloudflare OAuth proof produced no passing evidence.');
console.log('[acceptance-cloudflare-oauth] PASS: real consent callback persisted a refresh-capable token and the forced refresh path remained authorized.');
