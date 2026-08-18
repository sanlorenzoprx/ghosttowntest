#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const TEMP_SQL = join(STATE_DIR, 'gate26-canonical-d1-artifacts.sql');
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const D1_ID = '9863d883-3c31-4268-9a98-8392fa3b9f8f';
const CANONICAL_BLOB_SHA1 = '616c691e6b4c9cea93615963a07375d13ffba57f';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';
const EXPECTED_BLUEPRINT_VERSION = '2.1';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 26 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function normalizedEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`Gate 26 could not parse ${label} JSON from canonical D1 state.`);
  }
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {}
  const starts = [clean.indexOf('['), clean.indexOf('{')]
    .filter(index => index >= 0)
    .sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = clean.length; end > start; end -= 1) {
      const last = clean[end - 1];
      if (last !== ']' && last !== '}') continue;
      try {
        return JSON.parse(clean.slice(start, end));
      } catch {}
    }
  }
  return null;
}

function findInspectionRow(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInspectionRow(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, 'launch_blueprint_count')) return value;
  if (Array.isArray(value.results)) {
    for (const row of value.results) {
      const found = findInspectionRow(row);
      if (found) return found;
    }
  }
  for (const child of Object.values(value)) {
    const found = findInspectionRow(child);
    if (found) return found;
  }
  return null;
}

function purchaseReceipt() {
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 26 requires the existing Gate 20 purchase receipt; it will not create another purchase.');
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || receipt?.stripe_mode !== 'test'
    || typeof receipt?.order_id !== 'string'
    || !/^gtt_[A-Za-z0-9_-]+$/.test(receipt.order_id)) {
    throw new Error('Gate 26 found an incomplete or unexpected Gate 20 purchase receipt.');
  }
  return receipt;
}

function assertPrerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 26 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['25']?.status !== 'PASS') throw new Error('Gate 26 requires Gate 25 to be PASS.');

  const migration2 = readFileSync(join(ROOT, 'migrations', '0002_launch_blueprints.sql'), 'utf8');
  const migration4 = readFileSync(join(ROOT, 'migrations', '0004_blueprint_execution_log.sql'), 'utf8');
  const executionStore = readFileSync(join(ROOT, 'src', 'api', 'blueprintExecutionStore.ts'), 'utf8');
  const blueprintApi = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const required = [
    'CREATE TABLE IF NOT EXISTS launch_blueprints',
    'CREATE TABLE IF NOT EXISTS launch_blueprint_progress',
    'CREATE TABLE IF NOT EXISTS blueprints',
    'CREATE TABLE IF NOT EXISTS blueprint_actions',
    'CREATE TABLE IF NOT EXISTS action_progress',
    'CREATE TABLE IF NOT EXISTS journal_entries',
    'CREATE TABLE IF NOT EXISTS journal_evidence',
    'CREATE TABLE IF NOT EXISTS checkpoint_reviews',
    'persistBlueprintExecutionArchitecture',
    'INSERT OR IGNORE INTO blueprints',
    'INSERT OR IGNORE INTO blueprint_actions',
    'INSERT INTO action_progress',
    'INSERT OR IGNORE INTO journal_entries',
    'INSERT OR IGNORE INTO journal_evidence',
    'INSERT OR IGNORE INTO checkpoint_reviews',
    'saveBlueprintProgress',
    'attachCanonicalExecutionReferences'
  ];
  const combined = `${migration2}\n${migration4}\n${executionStore}\n${blueprintApi}`;
  if (required.some(token => !combined.includes(token))) {
    throw new Error('Gate 26 source contract no longer proves canonical D1 Blueprint/progress/evidence/checkpoint persistence.');
  }
}

function inspectionSql(orderId) {
  const order = sqlLiteral(orderId);
  return `SELECT
  (SELECT COUNT(*) FROM launch_blueprints WHERE order_id = ${order}) AS launch_blueprint_count,
  (SELECT owner_id FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS owner_id,
  (SELECT source_verdict_id FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS source_verdict_id,
  (SELECT schema_version FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS schema_version,
  (SELECT status FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS blueprint_status,
  (SELECT blueprint_json FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS blueprint_json,
  (SELECT research_receipt_json FROM launch_blueprints WHERE order_id = ${order} LIMIT 1) AS research_receipt_json,
  (SELECT COUNT(*) FROM launch_blueprint_progress WHERE order_id = ${order}) AS progress_count,
  (SELECT owner_id FROM launch_blueprint_progress WHERE order_id = ${order} LIMIT 1) AS progress_owner_id,
  (SELECT progress_json FROM launch_blueprint_progress WHERE order_id = ${order} LIMIT 1) AS progress_json,
  (SELECT COUNT(*) FROM blueprints WHERE order_id = ${order}) AS normalized_blueprint_count,
  (SELECT account_id FROM blueprints WHERE order_id = ${order} LIMIT 1) AS normalized_account_id,
  (SELECT blueprint_id FROM blueprints WHERE order_id = ${order} LIMIT 1) AS normalized_blueprint_id,
  (SELECT blueprint_version FROM blueprints WHERE order_id = ${order} LIMIT 1) AS normalized_blueprint_version,
  (SELECT canonical_source_hash FROM blueprints WHERE order_id = ${order} LIMIT 1) AS normalized_canonical_source_hash,
  (SELECT canonical_blueprint_sha256 FROM blueprints WHERE order_id = ${order} LIMIT 1) AS normalized_canonical_blueprint_sha256,
  (SELECT COUNT(*) FROM blueprint_actions a JOIN blueprints b ON b.blueprint_id = a.blueprint_id AND b.blueprint_version = a.blueprint_version WHERE b.order_id = ${order}) AS action_count,
  (SELECT COUNT(*) FROM blueprint_actions a JOIN blueprints b ON b.blueprint_id = a.blueprint_id AND b.blueprint_version = a.blueprint_version WHERE b.order_id = ${order} AND (a.day_number < 1 OR a.day_number > 30 OR a.action_id <> ('day-' || a.day_number))) AS action_identity_mismatch_count,
  (SELECT COUNT(*) FROM action_progress p JOIN blueprints b ON b.blueprint_id = p.blueprint_id AND b.blueprint_version = p.blueprint_version WHERE b.order_id = ${order}) AS action_progress_count,
  (SELECT COUNT(*) FROM action_progress p JOIN blueprints b ON b.blueprint_id = p.blueprint_id AND b.blueprint_version = p.blueprint_version WHERE b.order_id = ${order} AND p.account_id <> b.account_id) AS action_progress_account_mismatch_count,
  (SELECT COUNT(*) FROM action_progress p JOIN blueprint_actions a ON a.blueprint_id = p.blueprint_id AND a.blueprint_version = p.blueprint_version AND a.action_id = p.action_id JOIN blueprints b ON b.blueprint_id = p.blueprint_id AND b.blueprint_version = p.blueprint_version WHERE b.order_id = ${order} AND p.status = 'completed') AS completed_action_count,
  (SELECT COALESCE(json_group_array(day_number), '[]') FROM (SELECT a.day_number AS day_number FROM action_progress p JOIN blueprint_actions a ON a.blueprint_id = p.blueprint_id AND a.blueprint_version = p.blueprint_version AND a.action_id = p.action_id JOIN blueprints b ON b.blueprint_id = p.blueprint_id AND b.blueprint_version = p.blueprint_version WHERE b.order_id = ${order} AND p.status = 'completed' ORDER BY a.day_number)) AS completed_days_json,
  (SELECT COUNT(*) FROM journal_entries j JOIN blueprints b ON b.blueprint_id = j.blueprint_id AND b.blueprint_version = j.blueprint_version WHERE b.order_id = ${order}) AS journal_entry_count,
  (SELECT COUNT(*) FROM journal_evidence e JOIN blueprints b ON b.blueprint_id = e.blueprint_id AND b.blueprint_version = e.blueprint_version WHERE b.order_id = ${order}) AS journal_evidence_count,
  (SELECT COUNT(*) FROM journal_entries j JOIN blueprints b ON b.blueprint_id = j.blueprint_id AND b.blueprint_version = j.blueprint_version WHERE b.order_id = ${order} AND (j.account_id <> b.account_id OR j.action_id NOT GLOB 'day-[0-9]*' OR j.checkpoint_id <> CASE WHEN CAST(substr(j.action_id, 5) AS INTEGER) <= 7 THEN 'day-7' WHEN CAST(substr(j.action_id, 5) AS INTEGER) <= 14 THEN 'day-14' WHEN CAST(substr(j.action_id, 5) AS INTEGER) <= 21 THEN 'day-21' ELSE 'day-30' END)) AS journal_identity_mismatch_count,
  (SELECT COUNT(*) FROM journal_evidence e JOIN blueprints b ON b.blueprint_id = e.blueprint_id AND b.blueprint_version = e.blueprint_version WHERE b.order_id = ${order} AND e.account_id <> b.account_id) AS evidence_identity_mismatch_count,
  (SELECT COALESCE(json_group_array(entry_id), '[]') FROM (SELECT DISTINCT j.entry_id AS entry_id FROM journal_entries j JOIN blueprints b ON b.blueprint_id = j.blueprint_id AND b.blueprint_version = j.blueprint_version WHERE b.order_id = ${order} ORDER BY j.entry_id)) AS journal_entry_ids_json,
  (SELECT COUNT(*) FROM checkpoint_reviews c JOIN blueprints b ON b.blueprint_id = c.blueprint_id AND b.blueprint_version = c.blueprint_version WHERE b.order_id = ${order}) AS checkpoint_review_count,
  (SELECT COUNT(*) FROM checkpoint_reviews c JOIN blueprints b ON b.blueprint_id = c.blueprint_id AND b.blueprint_version = c.blueprint_version WHERE b.order_id = ${order} AND (c.account_id <> b.account_id OR c.day_number NOT IN (7,14,21,30) OR c.checkpoint_id <> ('day-' || c.day_number))) AS checkpoint_identity_mismatch_count,
  (SELECT COALESCE(json_group_array(day_number), '[]') FROM (SELECT DISTINCT c.day_number AS day_number FROM checkpoint_reviews c JOIN blueprints b ON b.blueprint_id = c.blueprint_id AND b.blueprint_version = c.blueprint_version WHERE b.order_id = ${order} ORDER BY c.day_number)) AS checkpoint_days_json;`;
}

function runReadOnlyD1(sql, orderId) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(TEMP_SQL, `${sql}\n`, 'utf8');
  try {
    const result = spawnSync(process.execPath, [
      WRANGLER_CLI, 'd1', 'execute', D1_NAME,
      '--remote', '--env', 'acceptance', '--file', TEMP_SQL, '--json'
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: false,
      maxBuffer: 32 * 1024 * 1024
    });
    if (result.error) throw result.error;
    if ((result.status ?? 1) !== 0) {
      const safe = String(result.stderr || result.stdout || '')
        .replaceAll(orderId, '[ORDER_ID_REDACTED]')
        .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]');
      throw new Error(`Gate 26 read-only acceptance D1 inspection failed (${result.status ?? 1}).\n${safe}`.trim());
    }
    const stdout = String(result.stdout || '');
    const stderr = String(result.stderr || '');
    const parsed = parseLooseJson(stdout) || parseLooseJson(`${stdout}\n${stderr}`);
    if (!parsed) {
      throw new Error(`Gate 26 could not parse Wrangler D1 JSON output (stdout_bytes=${Buffer.byteLength(stdout, 'utf8')}, stderr_bytes=${Buffer.byteLength(stderr, 'utf8')}).`);
    }
    const row = findInspectionRow(parsed);
    if (!row) throw new Error('Gate 26 D1 inspection returned no canonical inspection row.');
    return row;
  } finally {
    rmSync(TEMP_SQL, { force: true });
  }
}

function sortedUniqueDays(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(day => Number.isInteger(day) && day >= 1 && day <= 30))].sort((a, b) => a - b);
}

assertPrerequisites();
const purchase = purchaseReceipt();
const row = runReadOnlyD1(inspectionSql(purchase.order_id), purchase.order_id);

if (number(row.launch_blueprint_count) !== 1) throw new Error('Gate 26 requires exactly one canonical launch_blueprints row for the verified paid order.');
if (row.schema_version !== EXPECTED_SCHEMA || row.blueprint_status !== 'ready') {
  throw new Error('Gate 26 canonical Blueprint row is not ghosttown-launch-blueprint-v2 READY state.');
}
if (typeof row.blueprint_json !== 'string' || typeof row.research_receipt_json !== 'string') {
  throw new Error('Gate 26 canonical Blueprint or research receipt JSON is missing from D1.');
}

const blueprint = parseJson(row.blueprint_json, 'canonical Blueprint');
const researchReceipt = parseJson(row.research_receipt_json, 'research receipt');
const owner = normalizedEmail(row.owner_id);
const canonicalHash = sha256(row.blueprint_json);
const receiptHash = researchReceipt?.generationReceiptEvidence?.hashes?.canonicalBlueprintSha256;
const generationEvidence = researchReceipt?.generationReceiptEvidence;

if (!owner || normalizedEmail(blueprint?.ownerId) !== owner) throw new Error('Gate 26 canonical D1 owner does not match the Blueprint owner.');
if (blueprint?.orderId !== purchase.order_id || blueprint?.sourceVerdictId !== row.source_verdict_id) throw new Error('Gate 26 canonical order or source-verdict identity drifted inside D1.');
if (blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.blueprintVersion !== EXPECTED_BLUEPRINT_VERSION || blueprint?.status !== 'ready' || blueprint?.qualityGate?.passed !== true) {
  throw new Error('Gate 26 canonical Blueprint JSON is not a ready, quality-gated v2.1 artifact.');
}
if (!researchReceipt?.provider || !researchReceipt?.completedAt || !generationEvidence || !/^[a-f0-9]{64}$/i.test(String(receiptHash || ''))) {
  throw new Error('Gate 26 D1 research/generation receipt is incomplete.');
}
if (canonicalHash !== receiptHash) throw new Error('Gate 26 D1 canonical Blueprint bytes do not match the persisted generation-receipt SHA-256.');

const progressCount = number(row.progress_count);
if (![0, 1].includes(progressCount)) throw new Error('Gate 26 expected zero or one compatibility progress row for the paid order.');

let progress = null;
let executionMode = 'no_saved_progress_yet';
if (progressCount === 0) {
  const normalizedCounts = [
    row.normalized_blueprint_count, row.action_count, row.action_progress_count,
    row.journal_entry_count, row.journal_evidence_count, row.checkpoint_review_count
  ].map(number);
  if (normalizedCounts.some(count => count !== 0)) {
    throw new Error('Gate 26 found normalized execution rows without the corresponding canonical progress projection.');
  }
} else {
  executionMode = 'saved_progress_normalized';
  if (normalizedEmail(row.progress_owner_id) !== owner) throw new Error('Gate 26 progress owner does not match the canonical Blueprint owner.');
  if (typeof row.progress_json !== 'string') throw new Error('Gate 26 progress row is missing progress_json.');
  progress = parseJson(row.progress_json, 'Blueprint progress');

  if (number(row.normalized_blueprint_count) !== 1
    || normalizedEmail(row.normalized_account_id) !== owner
    || row.normalized_blueprint_id !== blueprint.blueprintId
    || row.normalized_blueprint_version !== blueprint.blueprintVersion
    || row.normalized_canonical_source_hash !== CANONICAL_BLOB_SHA1
    || row.normalized_canonical_blueprint_sha256 !== receiptHash) {
    throw new Error('Gate 26 normalized Blueprint identity/hash does not match the canonical paid Blueprint.');
  }
  if (number(row.action_count) !== 30 || number(row.action_identity_mismatch_count) !== 0) {
    throw new Error('Gate 26 normalized Blueprint action architecture is not exactly 30 canonical day actions.');
  }
  if (number(row.action_progress_count) !== 30 || number(row.action_progress_account_mismatch_count) !== 0) {
    throw new Error('Gate 26 action progress is not attached to all 30 actions under the canonical account.');
  }

  const projectedCompletedDays = sortedUniqueDays(progress?.completedDays);
  const normalizedCompletedDays = sortedUniqueDays(parseJson(row.completed_days_json || '[]', 'completed-day projection'));
  if (number(row.completed_action_count) !== projectedCompletedDays.length
    || JSON.stringify(normalizedCompletedDays) !== JSON.stringify(projectedCompletedDays)) {
    throw new Error('Gate 26 compatibility progress and normalized action completion state disagree.');
  }

  if (number(row.journal_identity_mismatch_count) !== 0 || number(row.evidence_identity_mismatch_count) !== 0) {
    throw new Error('Gate 26 found evidence/journal rows detached from canonical account/Blueprint/action/checkpoint identity.');
  }
  if (number(row.journal_entry_count) !== number(row.journal_evidence_count)) {
    throw new Error('Gate 26 journal revisions and normalized evidence rows are not one-to-one.');
  }
  const normalizedEntryIds = new Set(parseJson(row.journal_entry_ids_json || '[]', 'journal-entry identity projection').map(String));
  const projectedEntries = Array.isArray(progress?.evidenceLedger) ? progress.evidenceLedger : [];
  for (const entry of projectedEntries) {
    if (!entry?.entryId || !normalizedEntryIds.has(String(entry.entryId))) {
      throw new Error('Gate 26 current progress evidence ledger is missing its normalized immutable D1 revision.');
    }
  }

  if (number(row.checkpoint_identity_mismatch_count) !== 0) {
    throw new Error('Gate 26 found checkpoint review rows detached from canonical account/Blueprint/version/checkpoint identity.');
  }
  const normalizedCheckpointDays = new Set(parseJson(row.checkpoint_days_json || '[]', 'checkpoint-day projection').map(Number));
  const projectedCheckpoints = Array.isArray(progress?.checkpointReviews) ? progress.checkpointReviews : [];
  for (const review of projectedCheckpoints) {
    if (![7, 14, 21, 30].includes(Number(review?.dayNumber)) || !normalizedCheckpointDays.has(Number(review.dayNumber))) {
      throw new Error('Gate 26 current progress checkpoint review is missing its normalized immutable D1 revision.');
    }
  }
}

const evidence = {
  schema_version: 'roadmap-gate26-canonical-d1-artifacts-receipt-v1',
  verified_at: new Date().toISOString(),
  database: { name: D1_NAME, id: D1_ID, environment: 'acceptance', remote: true },
  source: {
    canonical_blob_sha1: CANONICAL_BLOB_SHA1,
    order_id_sha256: sha256(purchase.order_id),
    owner_id_sha256: sha256(owner),
    blueprint_id_sha256: sha256(String(blueprint.blueprintId || '')),
    source_verdict_id_sha256: sha256(String(blueprint.sourceVerdictId || ''))
  },
  canonical: {
    schema_version: blueprint.schemaVersion,
    blueprint_version: blueprint.blueprintVersion,
    status: blueprint.status,
    quality_gate_passed: blueprint.qualityGate?.passed === true,
    canonical_blueprint_sha256: canonicalHash,
    research_receipt_sha256: sha256(row.research_receipt_json),
    research_receipt_present: true
  },
  execution: {
    mode: executionMode,
    progress_rows: progressCount,
    normalized_blueprint_rows: number(row.normalized_blueprint_count),
    action_rows: number(row.action_count),
    action_progress_rows: number(row.action_progress_count),
    completed_action_rows: number(row.completed_action_count),
    journal_revision_rows: number(row.journal_entry_count),
    evidence_rows: number(row.journal_evidence_count),
    checkpoint_review_rows: number(row.checkpoint_review_count),
    identity_mismatches: {
      actions: number(row.action_identity_mismatch_count),
      action_progress_accounts: number(row.action_progress_account_mismatch_count),
      journal: number(row.journal_identity_mismatch_count),
      evidence: number(row.evidence_identity_mismatch_count),
      checkpoints: number(row.checkpoint_identity_mismatch_count)
    },
    compatibility_projection_hash: progress ? sha256(row.progress_json) : null
  },
  read_only: true,
  mutation_performed: false,
  workflow_replayed: false,
  purchase_replayed: false,
  production_deployed: false,
  secret_values_recorded: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  execution_mode: executionMode,
  canonical_blueprint_sha256: canonicalHash,
  progress_rows: progressCount,
  action_rows: number(row.action_count),
  journal_revision_rows: number(row.journal_entry_count),
  checkpoint_review_rows: number(row.checkpoint_review_count),
  receipt: '.roadmap-autopilot/gate26-canonical-d1-artifacts-receipt.json',
  read_only: true,
  mutation_performed: false,
  workflow_replayed: false,
  purchase_replayed: false,
  production_deployed: false,
  secret_values_recorded: false
}));
