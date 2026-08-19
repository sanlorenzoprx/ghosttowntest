#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE31_RECEIPT_PATH = join(STATE_DIR, 'gate31-cross-account-security-receipt-v2.json');
const SETUP_RECEIPT_PATH = join(STATE_DIR, 'gate31-second-account-setup-receipt.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const TOKEN_ENV = 'ROADMAP_GATE_31_SECOND_ACCOUNT_TOKEN';
const CREATED_ENV = 'ROADMAP_GATE_31_ACCOUNT_CREATED_FOR_PROBE';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function stateGuard() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 31 setup requires existing roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['20', '30', '31', '32', '33', '34', '35']) {
    if (state?.gates?.[id]?.status !== 'PASS') throw new Error(`Gate 31 setup requires Gate ${id} to remain PASS.`);
  }
  const gate36 = state?.gates?.['36'];
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('HARD STOP: Gate 31 setup refuses to run after Gate 36 production release is authorized or executed.');
  }
}

function existingReceiptPasses() {
  if (!existsSync(GATE31_RECEIPT_PATH)) return false;
  try {
    const receipt = JSON.parse(readFileSync(GATE31_RECEIPT_PATH, 'utf8'));
    return receipt?.schema_version === 'roadmap-gate31-cross-account-security-receipt-v2'
      && receipt?.decision === 'PASS'
      && receipt?.authenticated_second_account === true
      && receipt?.all_operations_privacy_safe_404 === true;
  } catch {
    return false;
  }
}

async function createAcceptanceOnlySecondAccount() {
  const nonce = `${Date.now()}-${randomBytes(8).toString('hex')}`;
  const email = `roadmap-g31-${nonce}@example.test`;
  const password = randomBytes(32).toString('base64url');
  const response = await fetch(`${WORKER_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, usedAnonymousAssessment: false })
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  const token = typeof body?.token === 'string' ? body.token : '';
  if (response.status !== 201 || token.length < 40) {
    throw new Error(`Gate 31 acceptance-only second-account setup failed HTTP ${response.status}: ${body?.error || 'unknown error'}`);
  }
  const verify = await fetch(`${WORKER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const verifyText = await verify.text();
  let verifyBody = null;
  try { verifyBody = JSON.parse(verifyText); } catch {}
  const verifiedEmail = typeof verifyBody?.user?.email === 'string' ? verifyBody.user.email.trim().toLowerCase() : '';
  if (verify.status !== 200 || verifiedEmail !== email) {
    throw new Error(`Gate 31 acceptance-only second-account verification failed HTTP ${verify.status}.`);
  }
  return { token, identityHash: sha256(email), signupStatus: response.status, verifyStatus: verify.status };
}

function runGate31(token) {
  const child = spawnSync(process.execPath, ['scripts/roadmap-gate31-cross-account-security-v2.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 300000,
    env: { ...process.env, [TOKEN_ENV]: token, [CREATED_ENV]: '1' }
  });
  if ((child.status ?? 1) !== 0) throw new Error('Gate 31 authenticated cross-account verification failed after second-account setup.');
}

stateGuard();
if (existingReceiptPasses()) {
  console.log(JSON.stringify({ ok: true, decision: 'PASS', reused_existing_gate31_v2_receipt: true, account_created: false, production_deployed: false, gate_36_touched: false }));
  process.exit(0);
}

const account = await createAcceptanceOnlySecondAccount();
runGate31(account.token);
const gate31 = JSON.parse(readFileSync(GATE31_RECEIPT_PATH, 'utf8'));
if (gate31?.second_account_identity_sha256 !== account.identityHash || gate31?.decision !== 'PASS') {
  throw new Error('Gate 31 setup identity does not match the Gate 31 v2 receipt.');
}

const receipt = {
  schema_version: 'roadmap-gate31-second-account-setup-receipt-v1',
  created_at: new Date().toISOString(),
  environment: 'acceptance',
  purpose: 'literal Blueprint cross-account-security test setup',
  created_via_public_signup_endpoint: true,
  authenticated_second_account: true,
  second_account_identity_sha256: account.identityHash,
  signup_status: account.signupStatus,
  authentication_verify_status: account.verifyStatus,
  acceptance_auth_account_created: true,
  gate31_verification_mutation_scope: 'none',
  customer_data_mutations: 'none',
  order_mutations: 'none',
  artifact_mutations: 'none',
  launch_site_mutations: 'none',
  stripe_mutated: false,
  second_purchase_created: false,
  password_value_recorded: false,
  token_value_recorded: false,
  email_value_recorded: false,
  secret_values_recorded: false,
  production_deployed: false,
  gate_36_touched: false,
  decision: 'PASS'
};
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(SETUP_RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, decision: 'PASS', acceptance_auth_account_created: true, authenticated_second_account: true, second_purchase_created: false, production_deployed: false, secret_values_recorded: false, receipt: '.roadmap-autopilot/gate31-second-account-setup-receipt.json' }));
