#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20 = join(STATE_DIR, 'gate20-purchase.json');
const GATE27 = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const RECEIPT = join(STATE_DIR, 'gate28-artifact-rematerialization-receipt.json');
const WORK = join(STATE_DIR, 'gate28-rematerialization-v2-work');
const BACKUP = join(STATE_DIR, 'gate28-rematerialization-backup');
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const KV_BINDING = 'KV';
const HELPER = 'scripts/roadmap-gate28-render-current-pdf.test.ts';

function packageBin(name, binName = name) {
  const dir = join(ROOT, 'node_modules', name);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Gate 28 v2 repair could not resolve ${name} CLI.`);
  return resolve(dir, bin);
}

const WRANGLER = packageBin('wrangler', 'wrangler');
const VITEST = packageBin('vitest', 'vitest');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sqlLiteral = value => `'${String(value).replace(/'/g, "''")}'`;

function redact(value, orderId = '') {
  let text = String(value ?? '');
  if (orderId) text = text.replaceAll(orderId, '[ORDER_ID_REDACTED]');
  return text
    .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|rk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[PRIVATE_KEY_REDACTED]');
}

function run(script, args, { orderId = '', input, env = process.env } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    input,
    env,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 28 v2 repair command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', orderId)}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

const wrangler = (args, orderId = '', input) => run(WRANGLER, args, { orderId, input });

function requireFile(path, label) {
  if (!existsSync(path) || statSync(path).size <= 0) throw new Error(`Gate 28 v2 repair is missing ${label}.`);
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function parseLooseJson(value) {
  const clean = stripAnsi(value).trim();
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  for (const start of [clean.indexOf('['), clean.indexOf('{')].filter(i => i >= 0).sort((a, b) => a - b)) {
    for (let end = clean.length; end > start; end -= 1) {
      if (!['}', ']'].includes(clean[end - 1])) continue;
      try { return JSON.parse(clean.slice(start, end)); } catch {}
    }
  }
  return null;
}

function findObjectWithKey(value, key) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObjectWithKey(item, key);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, key)) return value;
  for (const child of Object.values(value)) {
    const found = findObjectWithKey(child, key);
    if (found) return found;
  }
  return null;
}

function r2Key(orderId, kind) {
  const suffix = kind === 'pdf'
    ? 'ghosttown-launch-blueprint-v2.pdf'
    : kind === 'zip'
      ? 'ghosttown-launch-blueprint-v2-assets.zip'
      : 'ghosttown-launch-blueprint-v2.json';
  return `orders/${orderId}/${suffix}`;
}

function downloadR2(orderId, key, filename) {
  const path = join(WORK, filename);
  rmSync(path, { force: true });
  wrangler(['r2', 'object', 'get', `${R2_BUCKET}/${key}`, '--file', path, '--remote', '--env', 'acceptance'], orderId);
  requireFile(path, filename);
  return path;
}

function putR2Pipe(orderId, key, path, kind) {
  const bytes = readFileSync(path);
  const contentType = kind === 'pdf' ? 'application/pdf' : 'application/zip';
  const filename = kind === 'pdf'
    ? `ghosttown-launch-blueprint-${orderId}.pdf`
    : `ghosttown-launch-blueprint-${orderId}-assets.zip`;
  wrangler([
    'r2', 'object', 'put', `${R2_BUCKET}/${key}`,
    '--pipe', '--content-type', contentType,
    '--content-disposition', `attachment; filename="${filename}"`,
    '--remote', '--env', 'acceptance', '--force',
  ], orderId, bytes);
}

function verifyR2Exact(orderId, key, expectedPath, label, verifyFilename) {
  const expected = readFileSync(expectedPath);
  const downloadedPath = downloadR2(orderId, key, verifyFilename);
  const actual = readFileSync(downloadedPath);
  const expectedHash = sha256(expected);
  const actualHash = sha256(actual);
  if (expectedHash !== actualHash || expected.length !== actual.length || !expected.equals(actual)) {
    throw new Error(
      `Gate 28 v2 repair ${label} R2 round-trip mismatch: expected_sha256=${expectedHash}, actual_sha256=${actualHash}, expected_bytes=${expected.length}, actual_bytes=${actual.length}.`
    );
  }
  return { sha256: actualHash, bytes: actual.length };
}

function putAndVerifyR2(orderId, key, path, kind, label) {
  putR2Pipe(orderId, key, path, kind);
  return verifyR2Exact(orderId, key, path, label, `verify-${kind}-${Date.now()}.bin`);
}

function fetchD1Receipt(orderId) {
  const output = wrangler([
    'd1', 'execute', D1_NAME, '--remote', '--env', 'acceptance', '--json',
    '--command', `SELECT research_receipt_json FROM launch_blueprints WHERE order_id = ${sqlLiteral(orderId)} LIMIT 1;`,
  ], orderId);
  const row = findObjectWithKey(parseLooseJson(output), 'research_receipt_json');
  if (!row || typeof row.research_receipt_json !== 'string') throw new Error('Gate 28 v2 repair could not read D1 integrity receipt.');
  return JSON.parse(row.research_receipt_json);
}

function writeD1Receipt(orderId, receipt, filename) {
  const path = join(WORK, filename);
  writeFileSync(path,
    `UPDATE launch_blueprints SET research_receipt_json = ${sqlLiteral(JSON.stringify(receipt))}, updated_at = ${sqlLiteral(new Date().toISOString())} WHERE order_id = ${sqlLiteral(orderId)};\n`,
    'utf8');
  wrangler(['d1', 'execute', D1_NAME, '--remote', '--env', 'acceptance', '--file', path], orderId);
}

function fetchKvJson(key, orderId) {
  const output = wrangler(['kv', 'key', 'get', key, '--binding', KV_BINDING, '--remote', '--env', 'acceptance', '--text'], orderId);
  const parsed = parseLooseJson(output);
  if (!parsed || typeof parsed !== 'object') throw new Error(`Gate 28 v2 repair could not read KV key ${key}.`);
  return parsed;
}

function putKvJson(key, value, orderId, filename) {
  const path = join(WORK, filename);
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf8');
  wrangler(['kv', 'key', 'put', key, '--binding', KV_BINDING, '--path', path, '--remote', '--env', 'acceptance'], orderId);
}

function renderCurrent(canonicalPath, orderId) {
  const pdfPath = join(WORK, 'current-blueprint.pdf');
  const zipPath = join(WORK, 'current-assets.zip');
  const documentReceiptPath = join(WORK, 'current-document-receipt.json');
  for (const path of [pdfPath, zipPath, documentReceiptPath]) rmSync(path, { force: true });
  run(VITEST, ['run', HELPER], {
    orderId,
    env: {
      ...process.env,
      GHOSTTOWN_GATE28_BLUEPRINT_PATH: canonicalPath,
      GHOSTTOWN_GATE28_PDF_PATH: pdfPath,
      GHOSTTOWN_GATE28_ZIP_PATH: zipPath,
      GHOSTTOWN_GATE28_DOCUMENT_RECEIPT_PATH: documentReceiptPath,
    },
  });
  for (const [path, label] of [[pdfPath, 'current PDF'], [zipPath, 'current ZIP'], [documentReceiptPath, 'document receipt']]) requireFile(path, label);
  return { pdfPath, zipPath, documentReceiptPath };
}

function reopenGates() {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  for (const id of ['27', '28']) {
    const prior = state.gates?.[id] || { id: Number(id) };
    state.gates[id] = {
      ...prior,
      status: 'PENDING',
      checked_at: new Date().toISOString(),
      message: 'Acceptance PDF/ZIP were rematerialized from unchanged canonical v2.1 JSON; exact-byte re-verification required.',
    };
  }
  state.updated_at = new Date().toISOString();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

if (![STATE_PATH, GATE20, GATE27].every(existsSync)) throw new Error('Gate 28 v2 repair requires roadmap state plus Gate 20 and Gate 27 receipts.');
const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
if (state?.gates?.['27']?.status !== 'PASS') throw new Error('Gate 28 v2 repair requires Gate 27 to still be PASS before rematerialization.');
const purchase = JSON.parse(readFileSync(GATE20, 'utf8'));
const gate27 = JSON.parse(readFileSync(GATE27, 'utf8'));
if (purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string') throw new Error('Gate 28 v2 repair requires the existing Stripe test purchase.');
if (gate27?.decision !== 'PASS') throw new Error('Gate 28 v2 repair requires a passing Gate 27 receipt.');
const orderId = purchase.order_id;

mkdirSync(WORK, { recursive: true });
mkdirSync(BACKUP, { recursive: true });

const canonicalPath = downloadR2(orderId, r2Key(orderId, 'json'), 'canonical-blueprint.json');
const oldPdfPath = downloadR2(orderId, r2Key(orderId, 'pdf'), 'stored-blueprint.pdf');
const oldZipPath = downloadR2(orderId, r2Key(orderId, 'zip'), 'stored-assets.zip');
const canonicalBytes = readFileSync(canonicalPath);
const oldPdfBytes = readFileSync(oldPdfPath);
const oldZipBytes = readFileSync(oldZipPath);
if (sha256(canonicalBytes) !== gate27.artifacts.json.sha256) throw new Error('Gate 28 v2 repair refuses to continue: canonical JSON drifted from Gate 27.');
if (sha256(oldPdfBytes) !== gate27.artifacts.pdf.sha256 || sha256(oldZipBytes) !== gate27.artifacts.zip.sha256) {
  throw new Error('Gate 28 v2 repair refuses to continue: rollback did not restore the original Gate 27 PDF/ZIP bytes.');
}

copyFileSync(oldPdfPath, join(BACKUP, 'pre-rematerialization-blueprint.pdf'));
copyFileSync(oldZipPath, join(BACKUP, 'pre-rematerialization-assets.zip'));
copyFileSync(GATE27, join(BACKUP, 'pre-rematerialization-gate27-receipt.json'));

const { pdfPath, zipPath, documentReceiptPath } = renderCurrent(canonicalPath, orderId);
const newPdfSha = sha256(readFileSync(pdfPath));
const newZipSha = sha256(readFileSync(zipPath));
if (newPdfSha === gate27.artifacts.pdf.sha256 && newZipSha === gate27.artifacts.zip.sha256) {
  throw new Error('Gate 28 v2 repair found no presentation-byte change; rerun Gate 28 directly.');
}
const documentReceipt = JSON.parse(readFileSync(documentReceiptPath, 'utf8'));

const integrityKey = `paid_test_blueprint_integrity_${orderId}`;
const pointerKey = `paid_test_blueprint_pointer_${orderId}`;
const priorD1 = fetchD1Receipt(orderId);
const priorIntegrity = fetchKvJson(integrityKey, orderId);
const priorPointer = fetchKvJson(pointerKey, orderId);
for (const [name, value] of [
  ['pre-rematerialization-research-receipt.json', priorD1],
  ['pre-rematerialization-integrity-kv.json', priorIntegrity],
  ['pre-rematerialization-pointer-kv.json', priorPointer],
]) writeFileSync(join(BACKUP, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const nextD1 = JSON.parse(JSON.stringify(priorD1));
const evidence = nextD1?.generationReceiptEvidence;
if (!evidence?.hashes || evidence.hashes.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256) {
  throw new Error('Gate 28 v2 repair refuses to continue: D1 canonical hash does not match Gate 27.');
}
evidence.hashes.pdfSha256 = newPdfSha;
evidence.hashes.zipSha256 = newZipSha;
evidence.document = documentReceipt;
nextD1.artifactRematerialization = {
  schemaVersion: 'ghosttown-acceptance-artifact-rematerialization-v2',
  canonicalBlueprintSha256: gate27.artifacts.json.sha256,
  priorPdfSha256: gate27.artifacts.pdf.sha256,
  priorZipSha256: gate27.artifacts.zip.sha256,
  pdfSha256: newPdfSha,
  zipSha256: newZipSha,
  renderer: 'renderLaunchBlueprintPdfV21',
  transport: 'wrangler-r2-object-put-pipe',
  documentReceipt,
  purchaseReplayed: false,
  researchReplayed: false,
  modelInvoked: false,
  acceptanceOnly: true,
  productionDeployed: false,
  rematerializedAt: new Date().toISOString(),
};
const nextPointer = JSON.parse(JSON.stringify(priorPointer));
nextPointer.hashes = evidence.hashes;
nextPointer.updatedAt = new Date().toISOString();

let mutationStarted = false;
try {
  mutationStarted = true;
  const pdfRoundTrip = putAndVerifyR2(orderId, r2Key(orderId, 'pdf'), pdfPath, 'pdf', 'PDF');
  const zipRoundTrip = putAndVerifyR2(orderId, r2Key(orderId, 'zip'), zipPath, 'zip', 'ZIP');
  if (pdfRoundTrip.sha256 !== newPdfSha || zipRoundTrip.sha256 !== newZipSha) throw new Error('Gate 28 v2 repair internal round-trip hash mismatch.');

  writeD1Receipt(orderId, nextD1, 'update-research-receipt.sql');
  putKvJson(integrityKey, evidence, orderId, 'update-integrity.json');
  putKvJson(pointerKey, nextPointer, orderId, 'update-pointer.json');

  verifyR2Exact(orderId, r2Key(orderId, 'pdf'), pdfPath, 'final PDF', 'final-verify-pdf.bin');
  verifyR2Exact(orderId, r2Key(orderId, 'zip'), zipPath, 'final ZIP', 'final-verify-zip.bin');
  const verifyD1 = fetchD1Receipt(orderId).generationReceiptEvidence;
  const verifyIntegrity = fetchKvJson(integrityKey, orderId);
  const verifyPointer = fetchKvJson(pointerKey, orderId);
  if (verifyD1?.hashes?.pdfSha256 !== newPdfSha || verifyD1?.hashes?.zipSha256 !== newZipSha || verifyD1?.hashes?.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256) throw new Error('Gate 28 v2 repair D1 verification failed.');
  if (verifyIntegrity?.hashes?.pdfSha256 !== newPdfSha || verifyIntegrity?.hashes?.zipSha256 !== newZipSha) throw new Error('Gate 28 v2 repair KV integrity verification failed.');
  if (verifyPointer?.hashes?.pdfSha256 !== newPdfSha || verifyPointer?.hashes?.zipSha256 !== newZipSha) throw new Error('Gate 28 v2 repair KV pointer verification failed.');
} catch (error) {
  if (mutationStarted) {
    let rollbackError = null;
    try {
      putAndVerifyR2(orderId, r2Key(orderId, 'pdf'), oldPdfPath, 'pdf', 'rollback PDF');
      putAndVerifyR2(orderId, r2Key(orderId, 'zip'), oldZipPath, 'zip', 'rollback ZIP');
      writeD1Receipt(orderId, priorD1, 'rollback-research-receipt.sql');
      putKvJson(integrityKey, priorIntegrity, orderId, 'rollback-integrity.json');
      putKvJson(pointerKey, priorPointer, orderId, 'rollback-pointer.json');
      const rollbackD1 = fetchD1Receipt(orderId).generationReceiptEvidence;
      if (rollbackD1?.hashes?.pdfSha256 !== gate27.artifacts.pdf.sha256 || rollbackD1?.hashes?.zipSha256 !== gate27.artifacts.zip.sha256) throw new Error('rollback D1 hashes do not match Gate 27');
    } catch (caught) {
      rollbackError = caught;
    }
    if (rollbackError) {
      throw new Error(`Gate 28 v2 rematerialization failed and rollback also failed. Original: ${error instanceof Error ? error.message : String(error)}. Rollback: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
    }
  }
  throw error;
}

const repairReceipt = {
  schema_version: 'roadmap-gate28-acceptance-artifact-rematerialization-receipt-v2',
  rematerialized_at: new Date().toISOString(),
  environment: 'acceptance',
  canonical_blueprint_sha256: gate27.artifacts.json.sha256,
  canonical_blueprint_unchanged: true,
  prior: { pdf_sha256: gate27.artifacts.pdf.sha256, zip_sha256: gate27.artifacts.zip.sha256 },
  current: { pdf_sha256: newPdfSha, zip_sha256: newZipSha, document_receipt: documentReceipt },
  r2_transport: 'wrangler --pipe binary stdin',
  r2_exact_round_trip_verified: true,
  purchase_replayed: false,
  stripe_charge_created: false,
  research_replayed: false,
  vertex_invoked: false,
  canonical_blueprint_regenerated: false,
  acceptance_only: true,
  rollback_on_partial_failure: true,
  rollback_exact_bytes_verified: true,
  production_mutated: false,
  production_deployed: false,
  gate27_reverification_required: true,
  gate28_reverification_required: true,
  secret_values_recorded: false,
  decision: 'REMATERIALIZED_REVERIFY',
};
writeFileSync(RECEIPT, `${JSON.stringify(repairReceipt, null, 2)}\n`, 'utf8');
reopenGates();
rmSync(WORK, { recursive: true, force: true });
console.log(JSON.stringify({
  ok: true,
  decision: 'REMATERIALIZED_REVERIFY',
  canonical_blueprint_unchanged: true,
  r2_exact_round_trip_verified: true,
  purchase_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  acceptance_only: true,
  production_mutated: false,
  next: 'npm run roadmap:autopilot',
  receipt: '.roadmap-autopilot/gate28-artifact-rematerialization-receipt.json',
}));
