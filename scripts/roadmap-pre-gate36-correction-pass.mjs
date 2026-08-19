#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const BRANCH = 'feat/launch-blueprint-spa';
const REPOSITORY = 'sanlorenzoprx/ghosttowntest';
const PR_NUMBER = '7';
const OWNER_TOKEN_ENV = 'ROADMAP_GATE_34_OWNER_TOKEN';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32' && (command === 'npm' || command === 'npx'),
    stdio: options.capture ? 'pipe' : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout || 600000,
    env: process.env
  });
  if ((result.status ?? 1) !== 0) {
    const detail = options.capture ? `\n${result.stdout || ''}\n${result.stderr || ''}` : '';
    throw new Error(`Pre-Gate-36 correction pass failed: ${command} ${args.join(' ')}.${detail}`);
  }
  return options.capture ? String(result.stdout || '').trim() : '';
}

function stateGuard() {
  if (!existsSync(STATE_PATH)) throw new Error('Pre-Gate-36 correction pass requires existing roadmap state; do not reset it.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (let id = 1; id <= 35; id += 1) {
    if (state?.gates?.[String(id)]?.status !== 'PASS') throw new Error(`Pre-Gate-36 correction pass requires Gate ${id} to remain PASS.`);
  }
  const gate36 = state?.gates?.['36'];
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('HARD STOP: Gate 36 is already authorized/executed; this pre-release correction pass refuses to continue.');
  }
  return gate36?.status || 'PENDING_HUMAN_DECISION';
}

function gitAndPrGuard() {
  const branch = run('git', ['branch', '--show-current'], { capture: true });
  const localHead = run('git', ['rev-parse', 'HEAD'], { capture: true });
  const trackedStatus = run('git', ['status', '--porcelain', '--untracked-files=no'], { capture: true });
  if (branch !== BRANCH) throw new Error(`Pre-Gate-36 correction pass requires ${BRANCH}; found ${branch}.`);
  if (trackedStatus) throw new Error('Pre-Gate-36 correction pass requires a clean tracked working tree. Commit or restore tracked changes first.');
  const remoteRaw = run('git', ['ls-remote', 'origin', `refs/heads/${BRANCH}`], { capture: true });
  const originHead = remoteRaw.split(/\s+/)[0] || '';
  const prRaw = run('gh', ['pr', 'view', PR_NUMBER, '--repo', REPOSITORY, '--json', 'headRefOid,headRefName,baseRefName,isDraft,state,mergedAt'], { capture: true });
  const pr = JSON.parse(prRaw);
  if (localHead !== originHead || localHead !== pr.headRefOid || pr.headRefName !== BRANCH || pr.baseRefName !== 'main' || pr.isDraft !== true || pr.state !== 'OPEN' || pr.mergedAt != null) {
    throw new Error(`Pre-Gate-36 correction pass requires local/origin/PR #7 head equality and PR #7 draft/open/unmerged. local=${localHead} origin=${originHead} pr=${pr.headRefOid || 'unknown'}.`);
  }
  return localHead;
}

function receiptPasses(file, schema) {
  const path = join(STATE_DIR, file);
  if (!existsSync(path)) return false;
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value?.schema_version === schema && value?.decision === 'PASS';
  } catch {
    return false;
  }
}

function ownerCredentialGuard() {
  const value = String(process.env[OWNER_TOKEN_ENV] || '').trim();
  if (value.length < 40) throw new Error(`INPUT_REQUIRED: set ${OWNER_TOKEN_ENV} locally to the EXISTING Gate 20 owner acceptance token. Do not paste it into chat or store it in the repository.`);
}

const gate36Before = stateGuard();
const headBefore = gitAndPrGuard();
console.log(`Pre-Gate-36 correction validation starting at ${headBefore}; Gate 36 remains ${gate36Before}.`);

// Deterministic repository validation always runs before live acceptance requests.
for (const script of [
  'scripts/roadmap-gate31-second-account-setup.mjs',
  'scripts/roadmap-gate31-cross-account-security-v2.mjs',
  'scripts/roadmap-gate34-visual-certification.mjs',
  'scripts/roadmap-gate34-canonical-visual-matrix.mjs',
  'scripts/roadmap-gate35-authoritative-receipt.mjs'
]) run(process.execPath, ['--check', script]);
run('npx', ['vitest', 'run',
  'tests/roadmapGate31Adapter.test.ts',
  'tests/roadmapGate31AuthenticatedCrossAccountV2.test.ts',
  'tests/roadmapGate34Adapter.test.ts',
  'tests/roadmapGate34MobileNavigation.test.ts',
  'tests/roadmapGate34VisualMatrix.test.ts',
  'tests/roadmapGate35Adapter.test.ts',
  'tests/roadmapPreGate36CorrectionPass.test.ts',
  'tests/productionRoadmapAutopilot.test.ts'
], { timeout: 360000 });
run('npm', ['run', 'verify:blueprint']);
run('npm', ['run', 'type-check'], { timeout: 360000 });
run('npm', ['run', 'build'], { timeout: 360000 });
run('npm', ['run', 'worker:check:acceptance'], { timeout: 360000 });
run('git', ['diff', '--check']);

// Literal cross-account setup is acceptance-auth-only. The JWT/password/email stay inside the setup process.
if (!receiptPasses('gate31-cross-account-security-receipt-v2.json', 'roadmap-gate31-cross-account-security-receipt-v2')) {
  run(process.execPath, ['scripts/roadmap-gate31-second-account-setup.mjs'], { timeout: 360000 });
} else {
  console.log('Gate 31 v2 receipt already PASS; no additional second acceptance account will be created.');
}

// Gate 34 remains read-only and therefore uses an existing owner session supplied locally.
if (!receiptPasses('gate34-visual-certification-receipt-v2.json', 'roadmap-gate34-visual-certification-receipt-v2')) {
  ownerCredentialGuard();
  run(process.execPath, ['scripts/roadmap-gate34-visual-certification.mjs', '--correction'], { timeout: 360000 });
} else {
  console.log('Gate 34 v2 receipt already PASS; existing read-only evidence will be reused.');
}

if (!receiptPasses('gate34-visual-evidence-matrix.json', 'roadmap-gate34-visual-evidence-matrix-v1')) {
  run(process.execPath, ['scripts/roadmap-gate34-canonical-visual-matrix.mjs'], { timeout: 480000 });
} else {
  console.log('Gate 34 canonical visual matrix already PASS; existing evidence will be reused.');
}

const headAfterEvidence = gitAndPrGuard();
if (headAfterEvidence !== headBefore) throw new Error('Tracked Git HEAD changed during correction evidence generation; refusing final authority refresh.');
run(process.execPath, ['scripts/roadmap-gate35-authoritative-receipt.mjs', '--final-refresh']);
run('npm', ['run', 'roadmap:status']);

const gate36After = stateGuard();
if (gate36After !== gate36Before) throw new Error(`Gate 36 status changed during correction pass (${gate36Before} -> ${gate36After}); hard stop violated.`);

console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  head: headBefore,
  gates_1_35: '35/35 PASS',
  gate_36: gate36After,
  corrected_receipts: [
    '.roadmap-autopilot/gate31-second-account-setup-receipt.json',
    '.roadmap-autopilot/gate31-cross-account-security-receipt-v2.json',
    '.roadmap-autopilot/gate34-visual-certification-receipt-v2.json',
    '.roadmap-autopilot/gate34-visual-evidence-matrix.json',
    '.roadmap-autopilot/gate35-ghosttown-final-acceptance-receipt.json'
  ],
  acceptance_auth_account_setup_allowed: true,
  production_deployed: false,
  merge_performed: false,
  second_purchase_created: false,
  roadmap_autopilot_invoked: false,
  gate_36_touched: false
}));
