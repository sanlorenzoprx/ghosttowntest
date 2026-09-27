#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const CONTRACT_PATH = join(ROOT, 'config', 'sprint-generation-autopilot-v1.json');
const args = process.argv.slice(2);
const statusOnly = args.includes('--status');
const planOnly = args.includes('--plan');
const reset = args.includes('--reset');
const resumeExternal = args.includes('--resume-external') || process.env.AUTOPILOT_EXTERNAL_INPUT_ACK === 'true';
const maxStepsArg = args.find(value => value.startsWith('--max-steps='));
const maxSteps = Math.max(1, Math.min(17, Number(maxStepsArg?.split('=')[1] || '17')));

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function now() {
  return new Date().toISOString();
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error((result.stderr || result.stdout || 'git failed').trim());
  return String(result.stdout || '').trim();
}

function runCommand(command, stepId, phase) {
  const startedAt = now();
  const result = spawnSync(command, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      GHOSTTOWN_SPRINT_AUTOPILOT_STEP: String(stepId),
      GHOSTTOWN_SPRINT_AUTOPILOT_PHASE: phase
    }
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return {
    command,
    phase,
    startedAt,
    completedAt: now(),
    exitCode: result.status ?? 1,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    outputBytes: Buffer.byteLength(stdout) + Buffer.byteLength(stderr)
  };
}

function validateContract(contract) {
  if (contract.schemaVersion !== 'ghosttown-sprint-roadmap-autopilot-v1') {
    throw new Error('SAFETY_STOP: unexpected Sprint autopilot contract schema');
  }
  if (!Array.isArray(contract.steps) || contract.steps.length !== 17) {
    throw new Error('SAFETY_STOP: Sprint roadmap must contain exactly 17 steps (0-16)');
  }
  const ids = contract.steps.map(step => step.id);
  if (JSON.stringify(ids) !== JSON.stringify(Array.from({ length: 17 }, (_, index) => index))) {
    throw new Error('SAFETY_STOP: Sprint roadmap step ordering changed');
  }
  if (contract.safety?.productionAutoDeploy !== false) {
    throw new Error('SAFETY_STOP: production auto-deploy must remain disabled');
  }
  const sufficiency = contract.safety?.evidenceSufficiency;
  if (
    sufficiency?.minimumCurrentCustomerAccess !== 3 ||
    sufficiency?.minimumProblemLanguageObservations !== 3 ||
    sufficiency?.minimumCompetitiveAlternativeSources !== 2 ||
    JSON.stringify(sufficiency?.requiredEvidenceRoles) !== JSON.stringify([
      'customer_access',
      'problem_language',
      'competitive_alternative'
    ])
  ) {
    throw new Error('SAFETY_STOP: Step 11 role-based evidence sufficiency contract changed unexpectedly');
  }
  if (
    contract.safety?.providerDiversityIsReadinessGate !== false ||
    contract.safety?.providerAttemptCountIsReadinessGate !== false
  ) {
    throw new Error('SAFETY_STOP: provider health must remain separate from customer-readiness evidence');
  }
  if (contract.safety?.exactZipFileCount !== 16) {
    throw new Error('SAFETY_STOP: exact 16-file ZIP contract changed');
  }
  if (contract.safety?.recordSecretValues !== false) {
    throw new Error('SAFETY_STOP: secret-value recording must remain disabled');
  }
}

const contract = readJson(CONTRACT_PATH);
validateContract(contract);
const statePath = join(ROOT, contract.statePath);
const receiptDir = join(ROOT, contract.receiptDirectory);

function initialState() {
  return {
    schemaVersion: 'ghosttown-sprint-roadmap-autopilot-state-v1',
    roadmapId: contract.roadmapId,
    status: 'RUNNING',
    currentStep: 0,
    workingBranch: contract.workingBranch,
    lastGoodSha: null,
    startedAt: null,
    updatedAt: null,
    externalInput: null,
    steps: Object.fromEntries(contract.steps.map(step => [String(step.id), {
      status: 'PENDING',
      attempts: 0,
      startedAt: null,
      completedAt: null,
      lastSha: null,
      receipt: null,
      message: null
    }]))
  };
}

let state = existsSync(statePath) ? readJson(statePath) : initialState();
if (reset) {
  state = initialState();
  writeJson(statePath, state);
  console.log('Sprint autopilot state reset to Step 0.');
  process.exit(0);
}

function saveState() {
  state.updatedAt = now();
  writeJson(statePath, state);
}

function printStatus() {
  console.log(`GhostTown Sprint Roadmap Autopilot: ${state.status}`);
  console.log(`Current step: ${state.currentStep}/16`);
  for (const step of contract.steps) {
    const s = state.steps[String(step.id)] || { status: 'PENDING', attempts: 0 };
    console.log(`${String(step.id).padStart(2, '0')} ${String(s.status).padEnd(22)} ${step.title} (attempts=${s.attempts || 0})`);
  }
  if (state.externalInput) {
    console.log('External input required:');
    console.log(JSON.stringify(state.externalInput, null, 2));
  }
}

if (planOnly) {
  for (const step of contract.steps) {
    console.log(`${String(step.id).padStart(2, '0')} → ${step.title}`);
  }
  process.exit(0);
}
if (statusOnly) {
  printStatus();
  process.exit(0);
}

if (state.status === 'COMPLETE') {
  printStatus();
  process.exit(0);
}

if (state.status === 'WAITING_EXTERNAL_INPUT' && !resumeExternal) {
  printStatus();
  process.exit(2);
}
if (state.status === 'WAITING_EXTERNAL_INPUT' && resumeExternal) {
  state.status = 'RUNNING';
  state.externalInput = null;
  const current = state.steps[String(state.currentStep)];
  if (current) current.status = 'PENDING';
  saveState();
}

mkdirSync(receiptDir, { recursive: true });
if (!state.startedAt) {
  state.startedAt = now();
  saveState();
}

let executed = 0;
while (executed < maxSteps && state.currentStep <= 16) {
  const step = contract.steps.find(item => item.id === state.currentStep);
  if (!step) throw new Error(`Missing contract step ${state.currentStep}`);

  for (const dependency of step.dependsOn || []) {
    if (state.steps[String(dependency)]?.status !== 'PASS') {
      state.status = 'BLOCKED_INTERNAL';
      state.steps[String(step.id)].status = 'BLOCKED_INTERNAL';
      state.steps[String(step.id)].message = `Dependency ${dependency} is not PASS`;
      saveState();
      process.exit(3);
    }
  }

  const stepState = state.steps[String(step.id)];
  stepState.status = 'RUNNING';
  stepState.attempts = Number(stepState.attempts || 0) + 1;
  stepState.startedAt ||= now();
  stepState.message = null;
  state.status = 'RUNNING';
  saveState();

  if (stepState.attempts > Number(contract.execution?.maxStepAttempts || 5)) {
    stepState.status = 'BLOCKED_INTERNAL';
    stepState.message = 'Maximum automatic implementation attempts exceeded';
    state.status = 'BLOCKED_INTERNAL';
    saveState();
    process.exit(3);
  }

  const shaBefore = git(['rev-parse', 'HEAD']);
  const commands = [];
  console.log(`\n=== SPRINT AUTOPILOT STEP ${step.id}/16: ${step.title} ===`);

  if (!step.handler) {
    stepState.status = 'BLOCKED_INTERNAL';
    stepState.message = 'No implementation handler is defined';
    state.status = 'BLOCKED_INTERNAL';
    saveState();
    process.exit(3);
  }

  const handlerResult = runCommand(step.handler, step.id, 'handler');
  commands.push(handlerResult);

  if (handlerResult.exitCode !== 0) {
    const waiting = handlerResult.exitCode === Number(contract.handlerExitCodes?.waitingExternalInput || 2);
    stepState.status = waiting ? 'WAITING_EXTERNAL_INPUT' : 'BLOCKED_INTERNAL';
    stepState.message = waiting ? 'Handler requires an external input' : `Handler failed with exit code ${handlerResult.exitCode}`;
    state.status = stepState.status;
    if (waiting) {
      state.externalInput = {
        stepId: step.id,
        step: step.slug,
        requirements: step.externalInputs || [],
        requestedAt: now(),
        instruction: 'Complete only the named external account/credential/approval action, never paste secret values into logs or chat, then rerun with --resume-external.'
      };
    }
    const receiptPath = join(receiptDir, `step-${String(step.id).padStart(2, '0')}-attempt-${stepState.attempts}.json`);
    writeJson(receiptPath, {
      schemaVersion: 'ghosttown-sprint-autopilot-step-receipt-v1',
      roadmapId: contract.roadmapId,
      stepId: step.id,
      slug: step.slug,
      result: stepState.status,
      shaBefore,
      shaAfter: git(['rev-parse', 'HEAD']),
      commands,
      externalInput: state.externalInput,
      recordedAt: now()
    });
    stepState.receipt = receiptPath.replace(ROOT + '/', '');
    saveState();
    process.exit(waiting ? 2 : 3);
  }

  for (const command of step.verify || []) {
    const result = runCommand(command, step.id, 'verify');
    commands.push(result);
    if (result.exitCode !== 0) {
      // Verification tools such as TypeScript commonly use exit code 2 for
      // ordinary compile/test failures. Only step handlers may deliberately
      // request WAITING_EXTERNAL_INPUT; verification failures are internal.
      const waiting = false;
      stepState.status = 'BLOCKED_INTERNAL';
      stepState.message = `Verification failed: ${command}`;
      state.status = stepState.status;
      const receiptPath = join(receiptDir, `step-${String(step.id).padStart(2, '0')}-attempt-${stepState.attempts}.json`);
      writeJson(receiptPath, {
        schemaVersion: 'ghosttown-sprint-autopilot-step-receipt-v1',
        roadmapId: contract.roadmapId,
        stepId: step.id,
        slug: step.slug,
        result: stepState.status,
        shaBefore,
        shaAfter: git(['rev-parse', 'HEAD']),
        commands,
        externalInput: state.externalInput,
        recordedAt: now()
      });
      stepState.receipt = receiptPath.replace(ROOT + '/', '');
      saveState();
      process.exit(waiting ? 2 : 3);
    }
  }

  const shaAfter = git(['rev-parse', 'HEAD']);
  const receiptPath = join(receiptDir, `step-${String(step.id).padStart(2, '0')}-attempt-${stepState.attempts}.json`);
  writeJson(receiptPath, {
    schemaVersion: 'ghosttown-sprint-autopilot-step-receipt-v1',
    roadmapId: contract.roadmapId,
    stepId: step.id,
    slug: step.slug,
    result: 'PASS',
    shaBefore,
    shaAfter,
    commands,
    completion: step.completion || [],
    recordedAt: now()
  });

  stepState.status = 'PASS';
  stepState.completedAt = now();
  stepState.lastSha = shaAfter;
  stepState.receipt = receiptPath.replace(ROOT + '/', '');
  stepState.message = 'Completion gate passed';
  state.lastGoodSha = shaAfter;
  state.currentStep = step.id + 1;
  state.externalInput = null;
  executed += 1;

  if (step.id === 16) {
    state.status = 'COMPLETE';
    state.currentStep = 16;
    saveState();
    console.log('\n=== GHOSTTOWN SPRINT ROADMAP AUTOPILOT COMPLETE ===');
    process.exit(0);
  }
  saveState();
}

printStatus();
process.exit(0);
