#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const PAGES_URL = 'https://ghosttown-acceptance.pages.dev';
const PRODUCTION_HOSTS = ['ghosttowntest.com', 'lit-ghosttown.app'];

async function fetchWithTimeout(url, init = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init = {}, timeoutMs = 60000) {
  const response = await fetchWithTimeout(url, init, timeoutMs);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${response.status}`);
  }
  return { response, body };
}

function acceptanceConfigChecks() {
  const wrangler = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
  const paidTest = readFileSync(join(ROOT, 'src', 'api', 'paidTest.ts'), 'utf8');
  const acceptanceStart = wrangler.indexOf('[env.acceptance]');
  const developmentStart = wrangler.indexOf('[env.development', acceptanceStart + 1);
  if (acceptanceStart < 0) throw new Error('Gate 18 could not find [env.acceptance] in wrangler.toml');
  const acceptance = wrangler.slice(acceptanceStart, developmentStart > acceptanceStart ? developmentStart : wrangler.length);

  if (!acceptance.includes(`FRONTEND_URL = "${PAGES_URL}"`)) {
    throw new Error(`Gate 18 acceptance FRONTEND_URL is not ${PAGES_URL}`);
  }
  for (const host of PRODUCTION_HOSTS) {
    if (acceptance.includes(host)) throw new Error(`Gate 18 acceptance config contains production host ${host}`);
  }
  if (!paidTest.includes("success_url: `${frontendUrl}/paid-test/success?order_id=${encodeURIComponent(order.orderId)}`")) {
    throw new Error('Gate 18 paid checkout success route no longer derives from FRONTEND_URL');
  }
  if (!paidTest.includes("cancel_url: `${frontendUrl}/`")) {
    throw new Error('Gate 18 paid checkout cancel route no longer derives from FRONTEND_URL');
  }
  if (!paidTest.includes("const frontendUrl = env.FRONTEND_URL?.replace(/\\/$/, '') || new URL(request.url).origin;")) {
    throw new Error('Gate 18 paid checkout no longer uses the configured FRONTEND_URL boundary');
  }

  return {
    frontendUrl: PAGES_URL,
    successRoute: '/paid-test/success?order_id=<order_id>',
    cancelRoute: '/',
    productionHostsExcluded: true
  };
}

const routing = acceptanceConfigChecks();
const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const email = `roadmap-gate18-${suffix}@example.com`;
const password = `Gt!${randomBytes(18).toString('base64url')}`;

const signup = await fetchJson(`${WORKER_URL}/api/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, usedAnonymousAssessment: false })
});
if (signup.response.status !== 201 || typeof signup.body?.token !== 'string') {
  throw new Error(`Gate 18 synthetic acceptance signup failed HTTP ${signup.response.status}`);
}
const token = signup.body.token;

const verdict = await fetchJson(`${WORKER_URL}/api/verdict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    idea: {
      ideaName: `Gate 18 checkout routing ${suffix}`,
      description: 'A fixed-scope customer acquisition planning service for small businesses.',
      targetUser: 'small business owners',
      painfulProblem: 'They struggle to choose a repeatable customer acquisition channel.',
      currentAlternative: 'Ad hoc referrals and social posting.',
      motivation: 'Acceptance checkout routing verification.'
    },
    answers: {},
    public_content_acknowledged: true,
    locale: 'en-US'
  })
}, 90000);
if (!verdict.response.ok || typeof verdict.body?.resultId !== 'string') {
  throw new Error(`Gate 18 synthetic verdict creation failed HTTP ${verdict.response.status}`);
}

const checkout = await fetchJson(`${WORKER_URL}/api/paid-test/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    verdictId: verdict.body.resultId,
    targetBuyer: 'Small business owners actively trying to acquire customers',
    problem: 'They do not know which acquisition channel deserves focused testing first',
    currentWorkaround: 'Referrals and irregular social posting',
    offerHypothesis: 'A fixed-scope 30-day acquisition validation blueprint',
    expectedPrice: '$97'
  })
}, 60000);
if (!checkout.response.ok) {
  throw new Error(`Gate 18 Stripe test checkout creation failed HTTP ${checkout.response.status}: ${checkout.body?.error || 'unknown error'}`);
}
if (typeof checkout.body?.sessionUrl !== 'string' || typeof checkout.body?.orderId !== 'string') {
  throw new Error('Gate 18 checkout response did not contain sessionUrl and orderId');
}

let stripeUrl;
try {
  stripeUrl = new URL(checkout.body.sessionUrl);
} catch {
  throw new Error('Gate 18 checkout sessionUrl is not a valid URL');
}
if (stripeUrl.protocol !== 'https:' || stripeUrl.hostname !== 'checkout.stripe.com') {
  throw new Error(`Gate 18 checkout did not return a Stripe-hosted HTTPS session: ${stripeUrl.hostname}`);
}
if (!checkout.body.sessionUrl.includes('cs_test_')) {
  throw new Error('Gate 18 checkout session URL does not identify a Stripe test-mode Checkout Session');
}
for (const host of PRODUCTION_HOSTS) {
  if (checkout.body.sessionUrl.includes(host)) throw new Error(`Gate 18 checkout session URL contains production host ${host}`);
}

const orders = await fetchJson(`${WORKER_URL}/api/paid-test/orders`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` }
});
if (!orders.response.ok || !Array.isArray(orders.body?.orders)) {
  throw new Error(`Gate 18 acceptance order lookup failed HTTP ${orders.response.status}`);
}
const created = orders.body.orders.find(item => item?.orderId === checkout.body.orderId);
if (!created || created.status !== 'checkout_created') {
  throw new Error('Gate 18 checkout order was not persisted in checkout_created state');
}
if (created.sourceVerdictId !== verdict.body.resultId || created.artifactType !== 'execution_plan_30day_v1') {
  throw new Error('Gate 18 checkout order is not bound to the expected verdict and 30-day artifact type');
}

console.log(JSON.stringify({
  ok: true,
  stripe_mode: 'test',
  stripe_checkout_host: stripeUrl.hostname,
  order_status: created.status,
  artifact_type: created.artifactType,
  acceptance_frontend: routing.frontendUrl,
  success_route: routing.successRoute,
  cancel_route: routing.cancelRoute,
  production_redirect_excluded: routing.productionHostsExcluded,
  secret_values_recorded: false
}));
