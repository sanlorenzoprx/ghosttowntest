#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const PROD_CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const PROD_STATE_PATH = join(ROOT, '.roadmap-autopilot', 'state.json');
const QUALITY_CONFIG_PATH = join(ROOT, 'config', 'commercial-quality-roadmap-v1.json');
const QUALITY_STATE_PATH = join(ROOT, '.roadmap-autopilot', 'commercial-quality-state.json');
const QUALITY_REPORT_PATH = join(ROOT, '.roadmap-autopilot', 'commercial-quality-latest-report.json');
const PROD_RUNNER = join(ROOT, 'scripts', 'production-roadmap-autopilot.mjs');
const QUALITY_RUNNER = join(ROOT, 'scripts', 'commercial-quality-roadmap-autopilot.mjs');
const FREEZE = join(ROOT, 'scripts', 'roadmap-infrastructure-freeze.mjs');
const COMPAT = join(ROOT, 'scripts', 'roadmap-windows-spawn-compat.cjs');

const args = process.argv.slice(2);
const statusOnly = args.includes('--status');
const reset = args.includes('--reset');
const planOnly = args.includes('--plan');

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}
function runNode(script, scriptArgs = [], env = process.env, inherit = true) {
  return spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    shell: false,
    env
  });
}
function runProduction(scriptArgs = [], env = process.env) {
  return spawnSync(process.execPath, ['--require', COMPAT, PROD_RUNNER, ...scriptArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    env
  });
}
function productionPass(state, from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
    .every(id => state?.gates?.[String(id)]?.status === 'PASS');
}
function qualityPass(config, state) {
  return config.quality_gates.every(gate => state?.quality_gates?.[gate.id]?.status === 'PASS');
}
function plan() {
  console.log(`MASTER ROADMAP
Production Gates 1-25
→ Infrastructure Freeze
→ Q1 Verdict Decision v2
→ Q2 Daily Execution Assets
→ Q3 Blueprint Quality + Document
→ Q4 Direct-Response Launch Site
→ Q5 Commercial Measurement
→ Production Gates 26-35
→ Gate 36 HUMAN RELEASE
→ Story Studio Slices A/B/C
→ Show/Treatment Portfolio Lock
→ Baseline 001: 100 x 10 = 1,000
→ 1h/24h/72h/7d observations
→ winner + segment discovery
→ ~80% exploit / ~20% explore
→ winner mutation
→ predictive routing
→ attributable $97 sales
→ repeatable acquisition economics`);
}
function combinedStatus() {
  const prodConfig = readJson(PROD_CONFIG_PATH);
  const prodState = readJson(PROD_STATE_PATH, { gates: {} });
  const qualityConfig = readJson(QUALITY_CONFIG_PATH);
  const qualityState = readJson(QUALITY_STATE_PATH, { quality_gates: {} });
  const count = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .filter(id => prodState.gates?.[String(id)]?.status === 'PASS').length;

  console.log('GHOSTTOWN + STORY STUDIO MASTER ROADMAP');
  console.log(`Production mechanics 01-25: ${count(1,25)}/25 PASS`);
  console.log('Infrastructure Freeze: ENFORCED before Commercial Quality execution');
  console.log('Commercial Quality:');
  for (const gate of qualityConfig.quality_gates) {
    console.log(`  ${gate.id} ${(qualityState.quality_gates?.[gate.id]?.status || 'PENDING').padEnd(18)} ${gate.title}`);
  }
  console.log(`Final GhostTown acceptance 26-35: ${count(26,35)}/10 PASS`);
  console.log(`Gate 36: ${prodState.gates?.['36']?.status || 'PENDING'} — HUMAN PRODUCTION RELEASE`);
  console.log(`Story Studio 37-47: ${count(37,47)}/11 PASS`);
  if (prodConfig.safety?.production_auto_deploy !== false) {
    console.error('SAFETY ERROR: production_auto_deploy must remain false.');
    process.exitCode = 4;
  }
}

function main() {
  const prodConfig = readJson(PROD_CONFIG_PATH);
  const qualityConfig = readJson(QUALITY_CONFIG_PATH);
  if (!prodConfig || !qualityConfig) throw new Error('Master roadmap configuration is incomplete.');
  const gate36 = prodConfig.gates.find(gate => gate.id === 36);
  if (prodConfig.gates.length !== 47 || gate36?.mode !== 'manual' || prodConfig.safety?.production_auto_deploy !== false) {
    throw new Error('SAFETY_STOP: Production Roadmap invariants changed; Gate 36 must remain manual and auto-deploy disabled.');
  }

  if (planOnly) return plan();
  if (statusOnly) return combinedStatus();

  if (reset) {
    rmSync(QUALITY_STATE_PATH, { force: true });
    rmSync(QUALITY_REPORT_PATH, { force: true });
    const result = runProduction(['--reset']);
    process.exitCode = result.status ?? 0;
    return;
  }

  let prodState = readJson(PROD_STATE_PATH, { gates: {} });
  if (!productionPass(prodState, 1, 25)) {
    // Before Commercial Quality passes, force Gate 26 to remain an adapter boundary
    // even if the operator shell happens to contain later-gate hook variables.
    const preQualityEnv = { ...process.env, ROADMAP_GATE_26_COMMAND: '' };
    const result = runProduction([], preQualityEnv);
    prodState = readJson(PROD_STATE_PATH, { gates: {} });
    if (!productionPass(prodState, 1, 25)) {
      process.exitCode = result.status ?? 1;
      return;
    }
    console.log('\nProduction Gates 1-25 are PASS. Entering Commercial Quality lane before Gate 26.');
  }

  const freeze = runNode(FREEZE);
  if ((freeze.status ?? 1) !== 0) {
    process.exitCode = freeze.status ?? 4;
    return;
  }

  let qualityState = readJson(QUALITY_STATE_PATH, { quality_gates: {} });
  if (!qualityPass(qualityConfig, qualityState)) {
    const result = runNode(QUALITY_RUNNER);
    qualityState = readJson(QUALITY_STATE_PATH, { quality_gates: {} });
    if (!qualityPass(qualityConfig, qualityState)) {
      process.exitCode = result.status ?? 3;
      return;
    }
    console.log('\nCommercial Quality Q1-Q5 are PASS. Resuming Production Roadmap at Gate 26.');
  }

  const result = runProduction();
  process.exitCode = result.status ?? 0;
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
