#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_PATH = join(ROOT, '.roadmap-autopilot', 'state.json');
const COMPAT = './scripts/roadmap-windows-spawn-compat.cjs';
const REPAIR = 'scripts/roadmap-acceptance-schema-repair.mjs';
const GATE11_RETRY_PREP = 'scripts/roadmap-gate11-retry-prep.mjs';
const GATE14_ADAPTER = join(ROOT, 'scripts', 'roadmap-gate14-gemini-smoke.mjs');
const RUNNER = 'scripts/production-roadmap-autopilot.mjs';
const forwarded = process.argv.slice(2);

function quoted(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

const sanctionedGate14Command = process.env.ROADMAP_GATE_14_COMMAND?.trim()
  || `${quoted(process.execPath)} ${quoted(GATE14_ADAPTER)}`;

function node(script, args = []) {
  return spawnSync(process.execPath, ['--require', COMPAT, script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ROADMAP_GATE_14_COMMAND: sanctionedGate14Command }
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

// Existing resumed state may already be positioned at Gate 10.
let repair = node(REPAIR);
if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);

let run = node(RUNNER, forwarded);
if ((run.status ?? 0) === 0) process.exit(0);

// On a fresh state, Gate 9 can become PASS during the first runner invocation.
// If Gate 10 then fails, reconcile/verify only that acceptance schema gate and
// immediately resume the same state once.
if (stateNeedsGate10Repair()) {
  repair = node(REPAIR);
  if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);
  run = node(RUNNER, forwarded);
  if ((run.status ?? 0) === 0) process.exit(0);
}

// Gate 11 previously cached a failed research-preview result, which meant a
// resumed run could fail forever without making another provider request.
// Clear only that transient cache and create a fresh verdict for each retry.
// Three retries absorb provider/network transients while preserving the gate's
// requirement for a real DataForSEO candidate.
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
