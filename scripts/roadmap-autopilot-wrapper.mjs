#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_PATH = join(ROOT, '.roadmap-autopilot', 'state.json');
const CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const COMPAT = './scripts/roadmap-windows-spawn-compat.cjs';
const VERTEX_PREFLIGHT = 'scripts/roadmap-vertex-ai-gateway-preflight.mjs';
const REPAIR = 'scripts/roadmap-acceptance-schema-repair.mjs';
const GATE11_RETRY_PREP = 'scripts/roadmap-gate11-retry-prep.mjs';
const GATE14_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate14-vertex-selection-smoke.mjs');
const GATE15_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate15-vertex-structured-smoke.mjs');
const GATE18_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate18-checkout-routing-smoke.mjs');
const GATE19_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate19-stripe-webhook-registration-smoke.mjs');
const GATE20_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate20-manual-purchase-verifier.mjs');
const GATE21_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate21-stripe-order-idempotency.mjs');
const GATE22_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate22-seed-confirmation-workflow.mjs');
const GATE23_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate23-paid-provider-research.mjs');
const GATE24_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate24-paid-vertex-quality.mjs');
const GATE25_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate25-workflow-ready-receipt.mjs');
const QUALITY_Q1_ADAPTER = join(ROOT, 'scripts', 'roadmap-quality-q1-verdict-decision-v2.mjs');
const QUALITY_Q2_ADAPTER = join(ROOT, 'scripts', 'roadmap-quality-q2-daily-execution-assets.mjs');
const QUALITY_Q3_ADAPTER = join(ROOT, 'scripts', 'roadmap-quality-q3-blueprint-document.mjs');
const RUNNER = 'scripts/roadmap-master-autopilot.mjs';
const PREVIOUS_GENERATIVE_ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1';
const GENERATIVE_ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1+cloudflare-spa-templates-v1';
const forwarded = process.argv.slice(2);

function quoted(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

const sanctionedGate14Command = process.env.ROADMAP_GATE_14_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE14_ADAPTER)}`;
const sanctionedGate15Command = process.env.ROADMAP_GATE_15_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE15_ADAPTER)}`;
const sanctionedGate18Command = process.env.ROADMAP_GATE_18_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE18_ADAPTER)}`;
const sanctionedGate19Command = process.env.ROADMAP_GATE_19_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE19_ADAPTER)}`;
const sanctionedGate21Command = process.env.ROADMAP_GATE_21_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE21_ADAPTER)}`;
const sanctionedGate22Command = process.env.ROADMAP_GATE_22_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE22_ADAPTER)}`;
const sanctionedGate23Command = process.env.ROADMAP_GATE_23_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE23_ADAPTER)}`;
const sanctionedGate24Command = process.env.ROADMAP_GATE_24_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE24_ADAPTER)}`;
const sanctionedGate25Command = process.env.ROADMAP_GATE_25_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE25_ADAPTER)}`;
const sanctionedQualityQ1Command = process.env.ROADMAP_QUALITY_Q1_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(QUALITY_Q1_ADAPTER)}`;
const sanctionedQualityQ2Command = process.env.ROADMAP_QUALITY_Q2_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(QUALITY_Q2_ADAPTER)}`;
const sanctionedQualityQ3Command = process.env.ROADMAP_QUALITY_Q3_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(QUALITY_Q3_ADAPTER)}`;

function childEnv() {
  return {
    ...process.env,
    ROADMAP_GATE_14_COMMAND: sanctionedGate14Command,
    ROADMAP_GATE_15_COMMAND: sanctionedGate15Command,
    ROADMAP_GATE_18_COMMAND: sanctionedGate18Command,
    ROADMAP_GATE_19_COMMAND: sanctionedGate19Command,
    ROADMAP_GATE_21_COMMAND: sanctionedGate21Command,
    ROADMAP_GATE_22_COMMAND: sanctionedGate22Command,
    ROADMAP_GATE_23_COMMAND: sanctionedGate23Command,
    ROADMAP_GATE_24_COMMAND: sanctionedGate24Command,
    ROADMAP_GATE_25_COMMAND: sanctionedGate25Command,
    ROADMAP_QUALITY_Q1_COMMAND: sanctionedQualityQ1Command,
    ROADMAP_QUALITY_Q2_COMMAND: sanctionedQualityQ2Command,
    ROADMAP_QUALITY_Q3_COMMAND: sanctionedQualityQ3Command
  };
}

function node(script, args = []) {
  return spawnSync(process.execPath, ['--require', COMPAT, script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    env: childEnv()
  });
}

function readState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  state.updated_at = new Date().toISOString();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function currentHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false });
  return (result.stdout || '').trim();
}

function reopen(state, id, message) {
  if (!state.gates[id]) return;
  state.gates[id] = {
    ...state.gates[id],
    status: 'PENDING',
    checked_at: new Date().toISOString(),
    message
  };
}

function migrateGenerativeArchitectureState() {
  let state = readState();
  if (!state) {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    const timestamp = new Date().toISOString();
    state = {
      schema_version: 'roadmap-autopilot-state-v1',
      created_at: timestamp,
      updated_at: timestamp,
      source_schema_version: config.schema_version,
      gates: {},
      runtime: {
        generative_architecture: GENERATIVE_ARCHITECTURE,
        generative_architecture_migrated_at: timestamp
      }
    };
    writeState(state);
    console.log('Roadmap state initialized for Vertex AI Gateway + Custom Website Cloudflare SPA templates.');
    return;
  }
  if (state.runtime?.generative_architecture === GENERATIVE_ARCHITECTURE) return;
  state.runtime ||= {};
  state.gates ||= {};

  const priorArchitecture = state.runtime.generative_architecture;
  const message = 'Revalidation required by v2.1.4 Cloudflare SPA template amendment.';

  // A state that already passed the v2.1.3 Custom Website migration only needs
  // the governing contract reopened. Older states still need the v2.1.3
  // environment/model-slot revalidation as well. No unrelated roadmap evidence
  // is reset.
  if (priorArchitecture === PREVIOUS_GENERATIVE_ARCHITECTURE) {
    reopen(state, '1', message);
  } else {
    for (const id of ['1', '4', '8']) reopen(state, id, message);
  }

  state.runtime.generative_architecture = GENERATIVE_ARCHITECTURE;
  state.runtime.generative_architecture_migrated_at = new Date().toISOString();
  writeState(state);
  console.log('Roadmap state migrated to Vertex AI Gateway + Custom Website Cloudflare SPA templates without resetting unrelated acceptance evidence.');
}

function stateNeedsGate10Repair() {
  const state = readState();
  return state?.gates?.['9']?.status === 'PASS' && state?.gates?.['10']?.status !== 'PASS';
}

function stateNeedsGate11Retry() {
  const state = readState();
  return state?.gates?.['10']?.status === 'PASS'
    && state?.gates?.['11']?.status !== 'PASS'
    && ['FAIL', 'PENDING'].includes(state?.gates?.['11']?.status || '');
}

function verifyCompletedGate20Purchase() {
  const state = readState();
  if (state?.gates?.['19']?.status !== 'PASS' || state?.gates?.['20']?.status === 'PASS') return;

  const result = spawnSync(process.execPath, ['--require', COMPAT, GATE20_ADAPTER], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    env: childEnv(),
    maxBuffer: 32 * 1024 * 1024
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const combined = `${stdout}\n${stderr}`;

  if ((result.status ?? 1) === 0) {
    state.gates ||= {};
    state.gates['20'] = {
      id: 20,
      phase: 6,
      slug: 'real-test-purchase',
      title: 'Complete one real Stripe test purchase in a clean customer session',
      status: 'PASS',
      checked_at: new Date().toISOString(),
      head: currentHead(),
      evidence: {
        manual_action_verified: true,
        verifier: 'roadmap-gate20-manual-purchase-verifier.mjs',
        output_sha256: createHash('sha256').update(stdout).digest('hex'),
        local_purchase_receipt: '.roadmap-autopilot/gate20-purchase.json',
        secret_values_recorded: false
      },
      message: 'Human Stripe test-mode purchase verified against acceptance KV, webhook state, and Stripe Checkout Session.'
    };
    writeState(state);
    process.stdout.write(stdout);
    console.log('Gate 20 manual Stripe test purchase verified; roadmap state marked PASS.');
    return;
  }

  if (combined.includes('INPUT_REQUIRED:')) return;

  process.stderr.write(combined);
  console.error('Gate 20 purchase verifier failed before the roadmap runner could resume.');
  process.exit(result.status ?? 1);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

migrateGenerativeArchitectureState();

const architecturePreflight = node(VERTEX_PREFLIGHT);
if ((architecturePreflight.status ?? 1) !== 0) process.exit(architecturePreflight.status ?? 1);

let repair = node(REPAIR);
if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);

// Gate 20 remains a manual roadmap gate. This verifier only recognizes the
// externally completed human test purchase and records receipt-backed evidence
// so a rerun can continue rather than blocking forever.
verifyCompletedGate20Purchase();

let run = node(RUNNER, forwarded);
if ((run.status ?? 0) === 0) process.exit(0);

if (stateNeedsGate10Repair()) {
  repair = node(REPAIR);
  if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);
  run = node(RUNNER, forwarded);
  if ((run.status ?? 0) === 0) process.exit(0);
}

let gate11Retries = 0;
while ((run.status ?? 1) !== 0 && stateNeedsGate11Retry() && gate11Retries < 3) {
  gate11Retries += 1;
  const prep = node(GATE11_RETRY_PREP);
  if ((prep.status ?? 1) !== 0) process.exit(prep.status ?? 1);
  sleep(1000 * gate11Retries);
  console.log(`\nGate 11 fresh live retry ${gate11Retries}/3...`);
  run = node(RUNNER, forwarded);
  if ((run.status ?? 0) === 0) process.exit(0);
}

if (stateNeedsGate11Retry()) {
  console.error('\n=== ROADMAP AUTOPILOT INPUT REQUIRED ===');
  console.error('Gate 11 / Phase 4: Run DataForSEO live acceptance smoke');
  console.error('Three fresh live DataForSEO retries failed after the required secret names were already verified.');
  console.error('Next operator-controlled check: verify the DataForSEO API credential VALUES and account API/billing access in the DataForSEO dashboard. Do not paste credentials into chat.');
  console.error('If DataForSEO reports a provider outage, make no configuration change; rerun npm run roadmap:autopilot after service recovery.');
  console.error(`State saved to ${STATE_PATH}`);
  process.exit(2);
}

process.exit(run.status ?? 1);
