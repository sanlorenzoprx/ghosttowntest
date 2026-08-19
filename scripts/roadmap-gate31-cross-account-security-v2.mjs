#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE30_PASSWORD_RECEIPT_PATH = join(STATE_DIR, 'gate30-acceptance-password-reset-receipt.json');
const GATE34_RECEIPT_PATH = join(STATE_DIR, 'gate34-visual-certification-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate31-cross-account-security-receipt-v2.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const SECOND_ACCOUNT_TOKEN_ENV = 'ROADMAP_GATE_31_SECOND_ACCOUNT_TOKEN';
const ACCOUNT_CREATED_ENV = 'ROADMAP_GATE_31_ACCOUNT_CREATED_FOR_PROBE';
const EXPECTED_DENIAL_STATUS = 404;

const REQUIRED_PROBES = [
  { id: 'blueprint_open', method: 'GET', path: '/api/paid-test/orders/{orderId}/blueprint' },
  { id: 'pdf_download', method: 'GET', path: '/api/paid-test/orders/{orderId}/blueprint.pdf' },
  { id: 'zip_download', method: 'GET', path: '/api/paid-test/orders/{orderId}/blueprint-assets.zip' },
  { id: 'technical_json', method: 'GET', path: '/api/paid-test/orders/{orderId}/blueprint.json' },
  { id: 'progress_read', method: 'GET', path: '/api/paid-test/orders/{orderId}/blueprint/progress' },
  { id: 'progress_save', method: 'POST', path: '/api/paid-test/orders/{orderId}/blueprint/progress' },
  { id: 'launch_site_publish', method: 'POST', path: '/api/paid-test/orders/{orderId}/launch-site/publish' },
  { id: 'launch_site_unpublish', method: 'POST', path: '/api/paid-test/orders/{orderId}/launch-site/unpublish' },
  { id: 'leads_view', method: 'GET', path: '/api/paid-test/orders/{orderId}/launch-site/leads' },
  { id: 'leads_csv_export', method: 'GET', path: '/api/paid-test/orders/{orderId}/launch-site/leads.csv' },
  { id: 'retry', method: 'POST', path: '/api/paid-test/orders/{orderId}/blueprint/retry' }
];

const SAFE_DENIALS = new Set(['Launch Blueprint not found', 'Launch Site not found']);
const FORBIDDEN_BODY_PATTERNS = [
  /stripe[_A-Za-z]*checkout/i,
  /checkout[_A-Za-z]*session/i,
  /r2[_A-Za-z]*key/i,
  /artifact[_A-Za-z]*key/i,
  /site_id/i,
  /lead_count/i,
  /source[_A-Za-z]*verdict/i,
  /private[_A-Za-z]*verdict/i,
  /owner[_A-Za-z]*email/i,
  /paid_test_order_/i
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`Gate 31 v2 requires ${label}.`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function prerequisites() {
  const state = readJson(STATE_PATH, 'roadmap state');
  for (const id of ['20', '30', '31', '32', '33', '34', '35']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 31 v2 correction requires Gate ${id} to remain PASS.`);
  }
  const gate36 = state?.gates?.['36'];
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('Gate 31 v2 refuses to run after Gate 36 production release is authorized or executed.');
  }
  const purchase = readJson(GATE20_RECEIPT_PATH, 'the existing Gate 20 purchase receipt');
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || !/^gtt_[A-Za-z0-9_-]+$/.test(String(purchase?.order_id || ''))) {
    throw new Error('Gate 31 v2 found an invalid Gate 20 purchase receipt.');
  }
  return { orderId: String(purchase.order_id) };
}

function acceptedOwnerHash() {
  if (existsSync(GATE34_RECEIPT_PATH)) {
    const receipt = JSON.parse(readFileSync(GATE34_RECEIPT_PATH, 'utf8'));
    if (/^[a-f0-9]{64}$/.test(String(receipt?.owner_id_sha256 || ''))) return receipt.owner_id_sha256;
  }
  if (existsSync(GATE30_PASSWORD_RECEIPT_PATH)) {
    const receipt = JSON.parse(readFileSync(GATE30_PASSWORD_RECEIPT_PATH, 'utf8'));
    if (/^[a-f0-9]{64}$/.test(String(receipt?.owner_id_sha256 || ''))) return receipt.owner_id_sha256;
  }
  throw new Error('Gate 31 v2 cannot prove the Gate 20 owner hash from existing accepted receipts.');
}

async function verifySecondAccount(token, ownerHash) {
  const response = await fetch(`${WORKER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  const email = typeof body?.user?.email === 'string' ? body.user.email.trim().toLowerCase() : '';
  if (response.status !== 200 || !email) throw new Error(`INPUT_REQUIRED: ${SECOND_ACCOUNT_TOKEN_ENV} must be a valid token for an authenticated acceptance account.`);
  const identityHash = sha256(email);
  if (identityHash === ownerHash) throw new Error(`INPUT_REQUIRED: ${SECOND_ACCOUNT_TOKEN_ENV} belongs to the Gate 20 owner; cross-account proof requires a different authenticated account.`);
  return { identityHash, verifyStatus: response.status };
}

function parseDenial(text) {
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return typeof parsed?.error === 'string' ? parsed.error : '';
}

function assertPrivacySafeDenial(probe, response, text, orderId) {
  if (response.status !== EXPECTED_DENIAL_STATUS) throw new Error(`Gate 31 v2 ${probe.id} returned HTTP ${response.status}; authenticated wrong-account access must be privacy-safe 404.`);
  const denial = parseDenial(text);
  if (!SAFE_DENIALS.has(denial)) throw new Error(`Gate 31 v2 ${probe.id} returned a non-canonical denial body.`);
  if (text.includes(orderId)) throw new Error(`Gate 31 v2 ${probe.id} leaked the protected order identifier.`);
  for (const pattern of FORBIDDEN_BODY_PATTERNS) if (pattern.test(text)) throw new Error(`Gate 31 v2 ${probe.id} leaked protected ownership/artifact metadata.`);
  return denial;
}

async function runWrongAccountMatrix(token, orderId) {
  const results = [];
  for (const probe of REQUIRED_PROBES) {
    const url = `${WORKER_URL}${probe.path.replace('{orderId}', encodeURIComponent(orderId))}`;
    const init = { method: probe.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    if (probe.method === 'POST') init.body = '{}';
    const response = await fetch(url, init);
    const text = await response.text();
    const denial = assertPrivacySafeDenial(probe, response, text, orderId);
    results.push({ id: probe.id, method: probe.method, route_template: probe.path, expected_status: EXPECTED_DENIAL_STATUS, actual_status: response.status, canonical_denial: denial, leakage_scan: 'PASS' });
  }
  return results;
}

const { orderId } = prerequisites();
const token = String(process.env[SECOND_ACCOUNT_TOKEN_ENV] || '').trim();
if (token.length < 40) throw new Error(`INPUT_REQUIRED: set ${SECOND_ACCOUNT_TOKEN_ENV} locally or run the pre-Gate-36 correction runner, which can create an acceptance-only second account without exposing its token.`);
const ownerHash = acceptedOwnerHash();
const secondAccount = await verifySecondAccount(token, ownerHash);
const probes = await runWrongAccountMatrix(token, orderId);
const accountCreatedForProbe = process.env[ACCOUNT_CREATED_ENV] === '1';

const receipt = {
  schema_version: 'roadmap-gate31-cross-account-security-receipt-v2',
  verified_at: new Date().toISOString(),
  correction_of: '.roadmap-autopilot/gate31-cross-account-security-receipt.json',
  environment: 'acceptance',
  worker_url: WORKER_URL,
  authenticated_second_account: true,
  authentication_verify_status: secondAccount.verifyStatus,
  second_account_identity_sha256: secondAccount.identityHash,
  protected_owner_identity_sha256: ownerHash,
  protected_order_id_sha256: sha256(orderId),
  identities_distinct: secondAccount.identityHash !== ownerHash,
  expected_denial_status: EXPECTED_DENIAL_STATUS,
  operation_count: probes.length,
  operations: probes,
  all_operations_privacy_safe_404: probes.length === REQUIRED_PROBES.length && probes.every(item => item.actual_status === 404 && item.leakage_scan === 'PASS'),
  leakage_guards: ['owner email', 'order metadata', 'Stripe checkout/session identifiers', 'R2/artifact keys', 'site_id', 'lead_count', 'private/source verdict identity', 'protected order identifier'],
  verification_mutation_scope: 'none',
  customer_data_mutations: 'none',
  order_mutations: 'none',
  artifact_mutations: 'none',
  launch_site_mutations: 'none',
  account_created_for_probe: accountCreatedForProbe,
  acceptance_auth_setup_mutation: accountCreatedForProbe ? 'second_account_created_before_verification' : 'none',
  token_value_recorded: false,
  email_value_recorded: false,
  secret_values_recorded: false,
  purchase_replayed: false,
  production_deployed: false,
  gate_36_touched: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, decision: 'PASS', authenticated_second_account: true, operations: probes.length, all_privacy_safe_404: receipt.all_operations_privacy_safe_404, verification_mutation_scope: 'none', acceptance_auth_setup_mutation: receipt.acceptance_auth_setup_mutation, production_deployed: false, secret_values_recorded: false, receipt: '.roadmap-autopilot/gate31-cross-account-security-receipt-v2.json' }));
