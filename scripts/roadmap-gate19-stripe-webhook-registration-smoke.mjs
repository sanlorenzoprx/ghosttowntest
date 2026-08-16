#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const TEMP_ENTRY = join(STATE_DIR, 'gate19-stripe-webhook-smoke-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const EXPECTED_WEBHOOK_URL = `${WORKER_URL}/api/webhook/stripe`;
const SMOKE_PATH = '/__roadmap/acceptance/gate19-stripe-webhook';
const SIGNING_SECRET_NAME = 'STRIPE_WEBHOOK_SECRET';
const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Unable to resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function runWrangler(args) {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function assertSigningSecretNameConfigured() {
  const output = runWrangler(['secret', 'list', '--env', 'acceptance', '--json']);
  if (!new RegExp(`\\"name\\"\\s*:\\s*\\"${SIGNING_SECRET_NAME}\\"`).test(output)) {
    throw new Error(`Gate 19 acceptance secret inventory does not contain ${SIGNING_SECRET_NAME}`);
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

async function postSmokeWithPropagationRetry(token) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchWithTimeout(`${WORKER_URL}${SMOKE_PATH}`, {
      method: 'POST',
      headers: { 'X-Roadmap-Acceptance-Token': token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}

    const canonicalWorkerStillServing = response.status === 404
      && (body?.error === 'Endpoint not found' || !body);
    if (!canonicalWorkerStillServing || attempt === maxAttempts) {
      return { response, body };
    }

    console.log(`Gate 19 temporary Worker not propagated yet; retrying ${attempt}/${maxAttempts}...`);
    await sleep(1500 * attempt);
  }
  throw new Error('Gate 19 temporary Worker propagation retry exhausted unexpectedly.');
}

function temporaryWorkerSource(token) {
  const serializedToken = JSON.stringify(token);
  const serializedExpectedUrl = JSON.stringify(EXPECTED_WEBHOOK_URL);
  return `import app from '../src/api/worker.ts';
export { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';

const AUTH_TOKEN = ${serializedToken};
const EXPECTED_WEBHOOK_URL = ${serializedExpectedUrl};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function verifyStripeWebhookRegistration(env) {
  const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
  const signingSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('rk_test_')) {
    return json({ ok: false, error: 'Acceptance Stripe credential is not test mode' }, 502);
  }
  if (!signingSecret.startsWith('whsec_')) {
    return json({ ok: false, error: 'Acceptance STRIPE_WEBHOOK_SECRET is not bound to a Stripe signing-secret-shaped value' }, 502);
  }

  const response = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + stripeKey }
  });
  if (!response.ok) {
    return json({ ok: false, error: 'Stripe webhook endpoint inventory request failed', stripeStatus: response.status }, 502);
  }

  const inventory = await response.json();
  const endpoints = Array.isArray(inventory?.data) ? inventory.data : [];
  const endpoint = endpoints.find(item => item?.url === EXPECTED_WEBHOOK_URL);
  if (!endpoint) {
    return json({
      ok: false,
      error: 'Expected acceptance Stripe test-mode webhook is not registered',
      expectedWebhookUrl: EXPECTED_WEBHOOK_URL,
      registeredEndpointCount: endpoints.length
    }, 502);
  }
  if (endpoint.livemode !== false) {
    return json({ ok: false, error: 'Expected acceptance webhook is not a Stripe test-mode endpoint' }, 502);
  }
  if (endpoint.status !== 'enabled') {
    return json({ ok: false, error: 'Expected acceptance webhook is not enabled', endpointStatus: endpoint.status }, 502);
  }

  const enabledEvents = Array.isArray(endpoint.enabled_events) ? endpoint.enabled_events : [];
  const checkoutCompletionEnabled = enabledEvents.includes('*') || enabledEvents.includes('checkout.session.completed');
  if (!checkoutCompletionEnabled) {
    return json({ ok: false, error: 'Acceptance webhook does not subscribe to checkout.session.completed', enabledEvents }, 502);
  }

  return json({
    ok: true,
    stripeMode: 'test',
    endpointId: endpoint.id,
    webhookUrl: endpoint.url,
    endpointStatus: endpoint.status,
    livemode: endpoint.livemode,
    enabledEvents,
    checkoutCompletionEnabled: true,
    signingSecretName: 'STRIPE_WEBHOOK_SECRET',
    signingSecretBound: true,
    secretValuesRecorded: false
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '${SMOKE_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (request.headers.get('X-Roadmap-Acceptance-Token') !== AUTH_TOKEN) return new Response('Unauthorized', { status: 401 });
      return verifyStripeWebhookRegistration(env);
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

assertSigningSecretNameConfigured();
mkdirSync(STATE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(TEMP_ENTRY, temporaryWorkerSource(token), 'utf8');

let wrappedDeployed = false;
let smokeError = null;
let evidence = null;
try {
  runWrangler(['deploy', '.roadmap-autopilot/gate19-stripe-webhook-smoke-entry.ts', '--env', 'acceptance']);
  wrappedDeployed = true;

  const { response, body } = await postSmokeWithPropagationRetry(token);
  if (!body) throw new Error(`Gate 19 smoke endpoint returned non-JSON HTTP ${response.status}`);
  if (!response.ok || body?.ok !== true) {
    throw new Error(`Gate 19 Stripe webhook registration smoke failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
  if (body.stripeMode !== 'test' || body.livemode !== false || body.endpointStatus !== 'enabled') {
    throw new Error('Gate 19 did not prove an enabled Stripe test-mode webhook endpoint.');
  }
  if (body.webhookUrl !== EXPECTED_WEBHOOK_URL || body.checkoutCompletionEnabled !== true) {
    throw new Error('Gate 19 webhook URL or checkout completion subscription does not match the acceptance contract.');
  }
  if (body.signingSecretName !== SIGNING_SECRET_NAME || body.signingSecretBound !== true || body.secretValuesRecorded !== false) {
    throw new Error('Gate 19 did not prove the required signing-secret binding without recording secret values.');
  }
  evidence = body;
} catch (error) {
  smokeError = error;
} finally {
  let restoreError = null;
  if (wrappedDeployed) {
    try {
      runWrangler(['deploy', '--env', 'acceptance']);
    } catch (error) {
      restoreError = error;
    }
  }
  rmSync(TEMP_ENTRY, { force: true });
  if (restoreError) {
    throw new Error(`Gate 19 temporary acceptance Worker could not be restored to the canonical application entrypoint: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
  }
}

if (smokeError) throw smokeError;
if (!evidence) throw new Error('Gate 19 produced no evidence.');
console.log(JSON.stringify({
  ok: true,
  stripe_mode: evidence.stripeMode,
  webhook_url: evidence.webhookUrl,
  endpoint_status: evidence.endpointStatus,
  checkout_session_completed_enabled: evidence.checkoutCompletionEnabled,
  signing_secret_name: evidence.signingSecretName,
  secret_values_recorded: false
}));
