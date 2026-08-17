#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const CONFIG_PATH = join(ROOT, 'config', 'commercial-quality-roadmap-v1.json');
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'commercial-quality-state.json');
const REPORT_PATH = join(STATE_DIR, 'commercial-quality-latest-report.json');
const FREEZE = join(ROOT, 'scripts', 'roadmap-infrastructure-freeze.mjs');

const argv = new Set(process.argv.slice(2));
const statusOnly = argv.has('--status');
const reset = argv.has('--reset');

function now() { return new Date().toISOString(); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function writeJson(path, value) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function currentHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false });
  return String(result.stdout || '').trim();
}
function loadState(config) {
  if (!existsSync(STATE_PATH)) {
    return {
      schema_version: 'ghosttown-commercial-quality-state-v1',
      source_schema_version: config.schema_version,
      created_at: now(),
      updated_at: now(),
      quality_gates: {}
    };
  }
  const state = readJson(STATE_PATH);
  if (state.source_schema_version !== config.schema_version) {
    throw new Error(`Quality state targets ${state.source_schema_version}; expected ${config.schema_version}.`);
  }
  state.quality_gates ||= {};
  return state;
}
function saveState(state) {
  state.updated_at = now();
  writeJson(STATE_PATH, state);
  writeJson(REPORT_PATH, {
    generated_at: now(),
    head: currentHead(),
    quality_gates: state.quality_gates
  });
}
function record(state, gate, status, evidence = {}, message = '') {
  state.quality_gates[gate.id] = {
    id: gate.id,
    slug: gate.slug,
    title: gate.title,
    status,
    checked_at: now(),
    head: currentHead(),
    evidence,
    message
  };
  saveState(state);
}
function runFreeze(gate) {
  const args = [FREEZE, `--purpose=${gate.purpose}`];
  const changeClass = process.env.ROADMAP_QUALITY_CHANGE_CLASS?.trim();
  const exception = process.env.ROADMAP_QUALITY_FREEZE_EXCEPTION?.trim();
  if (changeClass) args.push(`--change-class=${changeClass}`);
  if (exception) args.push(`--exception=${exception}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || 'Infrastructure Freeze failed.').trim());
  return String(result.stdout || '').trim();
}
function runHook(gate) {
  const hook = process.env[gate.hook_env];
  if (!hook?.trim()) {
    const error = new Error(`Automation adapter ${gate.hook_env} is not configured. Implement the sanctioned ${gate.id} acceptance adapter; this quality gate is not waived.`);
    error.code = 'ADAPTER_REQUIRED';
    throw error;
  }
  const result = spawnSync(hook, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, ROADMAP_QUALITY_GATE_ID: gate.id, ROADMAP_QUALITY_GATE_SLUG: gate.slug },
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || `${gate.id} hook failed`).trim());
  const stdout = String(result.stdout || '');
  return {
    hook_env: gate.hook_env,
    exit_code: result.status ?? 0,
    output_sha256: createHash('sha256').update(stdout).digest('hex')
  };
}
function statusSummary(config, state) {
  const rows = config.quality_gates.map(gate => ({
    id: gate.id,
    status: state.quality_gates[gate.id]?.status || 'PENDING',
    title: gate.title
  }));
  const passed = rows.filter(row => row.status === 'PASS').length;
  console.log(`Commercial Quality: ${passed}/${rows.length} gates PASS`);
  for (const row of rows) console.log(`${row.id.padEnd(3)} ${row.status.padEnd(16)} ${row.title}`);
}
function prerequisitesPass(gate, state) {
  return (gate.requires || []).every(requirement =>
    requirement === 'infrastructure_freeze_pass' || state.quality_gates[requirement]?.status === 'PASS'
  );
}

function main() {
  if (!existsSync(CONFIG_PATH)) throw new Error(`Missing ${CONFIG_PATH}`);
  const config = readJson(CONFIG_PATH);
  if (!Array.isArray(config.quality_gates) || config.quality_gates.map(g => g.id).join(',') !== 'Q1,Q2,Q3,Q4,Q5') {
    throw new Error('Commercial Quality roadmap must preserve Q1-Q5 in order.');
  }

  if (reset) {
    rmSync(STATE_PATH, { force: true });
    rmSync(REPORT_PATH, { force: true });
    console.log('Commercial Quality state reset.');
    return;
  }

  const state = loadState(config);
  if (statusOnly) return statusSummary(config, state);

  for (const gate of config.quality_gates) {
    const prior = state.quality_gates[gate.id];
    if (prior?.status === 'PASS') {
      console.log(`SKIP ${gate.id}: already PASS - ${gate.title}`);
      continue;
    }
    if (!prerequisitesPass(gate, state)) {
      const message = `Prerequisites are not PASS: ${(gate.requires || []).join(', ')}`;
      record(state, gate, 'BLOCKED_PREREQUISITE', {}, message);
      console.error(`${gate.id} BLOCKED_PREREQUISITE: ${message}`);
      process.exitCode = 2;
      return;
    }

    console.log(`RUN ${gate.id}: ${gate.title}`);
    try {
      const freezeReceipt = runFreeze(gate);
      const evidence = runHook(gate);
      record(state, gate, 'PASS', { ...evidence, infrastructure_freeze_receipt_sha256: createHash('sha256').update(freezeReceipt).digest('hex') });
      console.log(`PASS ${gate.id}: ${gate.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error?.code === 'ADAPTER_REQUIRED' ? 'BLOCKED_ADAPTER' : message.includes('INFRASTRUCTURE_FREEZE_BLOCKED') ? 'BLOCKED_FREEZE' : 'FAIL';
      record(state, gate, status, {}, message);
      console.error(`${gate.id} ${status}: ${message}`);
      process.exitCode = status === 'FAIL' ? 1 : 3;
      return;
    }
  }
  statusSummary(config, state);
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
