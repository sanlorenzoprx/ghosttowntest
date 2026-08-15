#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_PATH = join(ROOT, '.roadmap-autopilot', 'state.json');

if (!existsSync(STATE_PATH)) process.exit(0);

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
if (state?.gates?.['10']?.status !== 'PASS' || state?.gates?.['11']?.status === 'PASS') process.exit(0);

state.runtime ||= {};
delete state.runtime.commercial_provider_smoke;
delete state.runtime.smoke_verdict_id;

if (state.gates?.['11']) {
  state.gates['11'].status = 'PENDING';
  state.gates['11'].message = 'Transient DataForSEO smoke state cleared for a fresh live retry.';
}
state.updated_at = new Date().toISOString();
writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
console.log('Gate 11 retry prep: cleared cached failed provider evidence and smoke verdict so the next attempt is a fresh live DataForSEO request.');
