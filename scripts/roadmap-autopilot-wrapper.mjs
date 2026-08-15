#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_PATH = join(ROOT, '.roadmap-autopilot', 'state.json');
const COMPAT = './scripts/roadmap-windows-spawn-compat.cjs';
const REPAIR = 'scripts/roadmap-acceptance-schema-repair.mjs';
const RUNNER = 'scripts/production-roadmap-autopilot.mjs';
const forwarded = process.argv.slice(2);

function node(script, args = []) {
  return spawnSync(process.execPath, ['--require', COMPAT, script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false
  });
}

function stateNeedsGate10Repair() {
  if (!existsSync(STATE_PATH)) return false;
  try {
    const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    return state?.gates?.['9']?.status === 'PASS' && state?.gates?.['10']?.status !== 'PASS';
  } catch {
    return false;
  }
}

// Existing resumed state may already be positioned at Gate 10.
let repair = node(REPAIR);
if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);

let run = node(RUNNER, forwarded);
if ((run.status ?? 0) === 0) process.exit(0);

// On a fresh state, Gate 9 can become PASS during the first runner invocation.
// If Gate 10 then fails, reconcile/verify only that acceptance schema gate and
// immediately resume the same state once. No other failure is auto-retried.
if (stateNeedsGate10Repair()) {
  repair = node(REPAIR);
  if ((repair.status ?? 1) !== 0) process.exit(repair.status ?? 1);
  run = node(RUNNER, forwarded);
}

process.exit(run.status ?? 1);
