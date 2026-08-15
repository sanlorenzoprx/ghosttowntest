#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
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
const RUNNER = 'scripts/production-roadmap-autopilot.mjs';
const GENERATIVE_ARCHITECTURE = 'vertex-ai-gateway-v1+custom-website-v1';
const forwarded = process.argv.slice(2);

function quoted(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

const sanctionedGate14Command = process.env.ROADMAP_GATE_14_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE14_ADAPTER)}`;
const sanctionedGate15Command = process.env.ROADMAP_GATE_15_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE15_ADAPTER)}`;

function node(script, args = []) {
  return spawnSync(process.execPath, ['--require', COMPAT, script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ROADMAP_GATE_14_COMMAND: sanctionedGate14Command,
      ROADMAP_GATE_15_COMMAND: sanctionedGate15Command
    }
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
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
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
    console.log('Roadmap state initialized for Vertex AI Gateway + Custom Website v1.');
    return;
  }
  if (state.runtime?.generative_architecture === GENERATIVE_ARCHITECTURE) return;
  state.runtime ||= {};
  state.gates ||= {};

  // Preserve unrelated live acceptance evidence. v2.1.3 adds a new website
  // model slot/capability but does not alter the existing Gate 14/15 Vertex
  // acceptance semantics or external evidence-provider contract.
  for (const id of ['1', '4', '8']) {
    if (!state.gates[id]) continue;
    state.gates[id] = {
      ...state.gates[id],
      status: 'PENDING',
      checked_at: new Date().toISOString(),
      message: 'Revalidation required by v2.1.3 Custom Website capability amendment.'
    };
  }
  state.runtime.generative_architecture = GENERATIVE_ARCHITECTURE;
  state.runtime.generative_architecture_migrated_at = new Date().toISOString();
  state.updated_at = new Date().toISOString();
  writeState(state);
  console.log('Roadmap state migrated to Vertex AI Gateway + Custom Website v1; only Gates 1, 4, and 8 were reopened for revalidation.');
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

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

migrateGenerativeArchitectureState();

const architecturePreflight = node(VERTEX_PREFLIGHT);
if ((architecturePreflight.status ?? 1) !== 0) process.exit(architecturePreflight.status ?? 1);

let repair = node(REPAIR);
if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);

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
