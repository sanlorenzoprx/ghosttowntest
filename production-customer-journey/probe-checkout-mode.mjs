import { mkdir, writeFile } from 'node:fs/promises';

const API_URL = 'https://api.ghosttowntest.com';
const EMAIL = String(process.env.PCJ_CANARY_EMAIL || '').trim().toLowerCase();
const PASSWORD = String(process.env.PCJ_CANARY_PASSWORD || '');
const EXPECTED_WORKER_VERSION = String(process.env.PCJ_EXPECTED_WORKER_VERSION || '').trim();
const CONFIRM = String(process.env.PCJ_CONFIRM || '');

if (!EMAIL || !PASSWORD) throw new Error('Production canary credentials are required.');
if (!EXPECTED_WORKER_VERSION) throw new Error('Expected Worker version is required.');
if (CONFIRM !== 'PROBE PRODUCTION STRIPE MODE') throw new Error('Confirmation phrase mismatch.');

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body, text };
}

const proof = {
  schemaVersion: 'ghosttown-production-checkout-mode-probe-v1',
  expectedWorkerVersion: EXPECTED_WORKER_VERSION,
  checkoutCreated: false,
  paymentAttempted: false,
  purchaseCompleted: false,
  startedAt: new Date().toISOString(),
};

const health = await request('/api/integrations/shorts-factory/health?checkout_probe=' + Date.now(), { headers: {} });
if (!health.response.ok || health.body?.version_id !== EXPECTED_WORKER_VERSION) {
  throw new Error('Production Worker identity mismatch.');
}

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!login.response.ok || !login.body?.token) throw new Error('Production canary login failed.');
const token = login.body.token;

const results = await request('/api/results', {
  headers: { Authorization: 'Bearer ' + token },
});
if (!results.response.ok || !Array.isArray(results.body?.results) || results.body.results.length < 1) {
  throw new Error('Production canary has no saved verdict for checkout probing.');
}

const verdict = results.body.results[0];
const idea = verdict.idea || {};
const checkout = await request('/api/paid-test/checkout', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token },
  body: JSON.stringify({
    verdictId: verdict.resultId,
    targetBuyer: String(idea.targetUser || 'Independent local service business owners'),
    problem: String(idea.painfulProblem || 'Potential customers are lost when follow-up is slow.'),
    currentWorkaround: String(idea.currentAlternative || 'Manual inbox follow-up and spreadsheets.'),
    offerHypothesis: 'Production canary checkout probe only',
    expectedPrice: '$250',
  }),
});

if (!checkout.response.ok || !checkout.body?.sessionUrl || !checkout.body?.orderId) {
  throw new Error('Production Sprint checkout probe failed HTTP ' + checkout.response.status + ': ' + (checkout.body?.error || 'unknown error'));
}

const sessionUrl = String(checkout.body.sessionUrl);
const stripeMode = sessionUrl.includes('cs_test_') ? 'test' : sessionUrl.includes('cs_live_') ? 'live' : 'unknown';

proof.checkoutCreated = true;
proof.orderId = checkout.body.orderId;
proof.stripeMode = stripeMode;
proof.sessionUrlStored = false;
proof.finishedAt = new Date().toISOString();

await mkdir('production-checkout-probe', { recursive: true });
await writeFile('production-checkout-probe/receipt.json', JSON.stringify(proof, null, 2) + '\n');

console.log(JSON.stringify({
  ok: true,
  orderId: proof.orderId,
  stripeMode,
  checkoutCreated: true,
  paymentAttempted: false,
  purchaseCompleted: false,
}, null, 2));
