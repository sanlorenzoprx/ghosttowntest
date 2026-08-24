#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd());
const POLICY_PATH = join(ROOT, 'config', 'infrastructure-freeze-policy-v1.json');
const PRODUCTION_CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const SOURCE_LOCK_PATH = join(ROOT, 'config', 'commercial-quality-source-lock-v1.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argValue(name) {
  const exact = process.argv.find(arg => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function gitBlobSha1(text) {
  const normalized = String(text).replace(/\r\n/g, '\n');
  const bytes = Buffer.from(normalized, 'utf8');
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`, 'utf8')
    .update(bytes)
    .digest('hex');
}

export function verifySourceLock(sourceLock) {
  const verified = [];
  for (const source of sourceLock.locked_sources || []) {
    const fullPath = resolve(ROOT, source.path);
    if (!existsSync(fullPath)) {
      throw new Error(`INFRASTRUCTURE_FREEZE_BLOCKED: locked source missing: ${source.path}`);
    }
    const actual = gitBlobSha1(readFileSync(fullPath, 'utf8'));
    if (actual !== source.git_blob_sha1) {
      throw new Error(`INFRASTRUCTURE_FREEZE_BLOCKED: source drift detected for ${source.path}. Expected ${source.git_blob_sha1}; got ${actual}. Use a versioned amendment and regenerate the source lock.`);
    }
    verified.push({ path: source.path, git_blob_sha1: actual });
  }
  return verified;
}

export function evaluateFreezePolicy({ policy, productionConfig, purpose = '', changeClass = '', exception = null }) {
  const ids = productionConfig.gates?.map(gate => gate.id) || [];
  if (ids.length !== 47 || ids.some((id, index) => id !== index + 1)) {
    throw new Error('INFRASTRUCTURE_FREEZE_BLOCKED: production roadmap must preserve gate IDs 1-47.');
  }
  const gate36 = productionConfig.gates.find(gate => gate.id === 36);
  if (!gate36 || gate36.mode !== 'manual' || gate36.mutation_scope !== 'production') {
    throw new Error('INFRASTRUCTURE_FREEZE_BLOCKED: Gate 36 must remain a manual production-release gate.');
  }
  if (productionConfig.safety?.production_auto_deploy !== false) {
    throw new Error('INFRASTRUCTURE_FREEZE_BLOCKED: production auto-deploy must remain disabled.');
  }

  const allowed = new Set(policy.policy.allowed_purposes || []);
  if (purpose && !allowed.has(purpose)) {
    throw new Error(`INFRASTRUCTURE_FREEZE_BLOCKED: purpose "${purpose}" is outside the allowed customer/commercial purposes.`);
  }

  const blocked = new Set(policy.policy.presumptively_blocked_change_classes || []);
  if (changeClass && blocked.has(changeClass)) {
    if (!exception) {
      throw new Error(`INFRASTRUCTURE_FREEZE_BLOCKED: change class "${changeClass}" requires an approved exception manifest.`);
    }
    const missing = (policy.policy.exception_required_fields || []).filter(field => {
      const value = exception[field];
      return value === undefined || value === null || String(value).trim() === '';
    });
    if (missing.length) {
      throw new Error(`INFRASTRUCTURE_FREEZE_BLOCKED: exception manifest missing ${missing.join(', ')}.`);
    }
  }

  return {
    status: 'PASS',
    policy: policy.schema_version,
    purpose: purpose || 'structural_preflight',
    change_class: changeClass || null,
    exception_id: exception?.exception_id || null,
    gate_36_manual: true,
    production_auto_deploy: false,
    production_gate_ids_preserved: true
  };
}

function main() {
  if (!existsSync(POLICY_PATH)) throw new Error(`Missing ${POLICY_PATH}`);
  if (!existsSync(PRODUCTION_CONFIG_PATH)) throw new Error(`Missing ${PRODUCTION_CONFIG_PATH}`);
  if (!existsSync(SOURCE_LOCK_PATH)) throw new Error(`Missing ${SOURCE_LOCK_PATH}`);

  const policy = readJson(POLICY_PATH);
  const productionConfig = readJson(PRODUCTION_CONFIG_PATH);
  const sourceLock = readJson(SOURCE_LOCK_PATH);
  const purpose = argValue('--purpose');
  const changeClass = argValue('--change-class');
  const exceptionPath = argValue('--exception');
  const exception = exceptionPath ? readJson(resolve(ROOT, exceptionPath)) : null;

  const lockedSources = verifySourceLock(sourceLock);
  const receipt = evaluateFreezePolicy({ policy, productionConfig, purpose, changeClass, exception });
  process.stdout.write(`${JSON.stringify({ ...receipt, source_lock: sourceLock.schema_version, locked_sources_verified: lockedSources }, null, 2)}\n`);
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 4;
  }
}
