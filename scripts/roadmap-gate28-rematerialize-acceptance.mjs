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
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const REPAIR_RECEIPT_PATH = join(STATE_DIR, 'gate28-artifact-rematerialization-receipt.json');
const TEMP_DIR = join(STATE_DIR, 'gate28-rematerialization-work');
const BACKUP_DIR = join(STATE_DIR, 'gate28-rematerialization-backup');
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const KV_BINDING = 'KV';
const HELPER = 'scripts/roadmap-gate28-render-current-pdf.test.ts';
const ROOT_PREFIX = 'ghosttown-launch-blueprint/';
const EXPECTED_FILES = [
  'README.md', 'blueprint.json', 'launch-blueprint.pdf', 'executive-summary.md',
  'offer-and-pricing.md', 'positioning.md', 'media-and-distribution-network.csv',
  'outreach-scripts.md', 'helpful-posts.md', 'landing-page-copy.md',
  'launch-site-config.json', 'thirty-day-calendar.csv', 'weekly-milestones.md',
  'metrics-template.csv', 'decision-rules.md', 'sources.csv',
];
const PDF_REQUIRED = [
  '48-Hour Launch Card', 'First Customer', 'First Offer', 'First Revenue Path',
  'Customer Access Network', 'Today: Day 1', 'Starting-State and Evidence Audit',
  'Manual Fulfillment and Economics', 'Prepared Content and Conversations',
  'Launch Site', 'Full 30-Day Plan', 'Behavioral Evidence Hierarchy',
  'Adaptive Checkpoint Reviews', 'Sources and Receipt', 'DECISION', 'WHY',
  'EVIDENCE', 'READY-TO-USE ASSETS', 'MEASUREMENT', 'ADAPTATION RULE',
];

function packageBin(packageName, binName = packageName) {
  const dir = join(ROOT, 'node_modules', packageName);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Gate 28 repair could not resolve ${packageName} CLI.`);
  return resolve(dir, bin);
}

const WRANGLER_CLI = packageBin('wrangler', 'wrangler');
const VITEST_CLI = packageBin('vitest', 'vitest');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function redact(value, orderId = '') {
  let text = String(value ?? '');
  if (orderId) text = text.replaceAll(orderId, '[ORDER_ID_REDACTED]');
  return text
    .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|rk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[PRIVATE_KEY_REDACTED]');
}

function runNode(script, args = [], options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 28 repair command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', options.orderId || '')}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function runWrangler(args, orderId = '') {
  return runNode(WRANGLER_CLI, args, { orderId });
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  for (const start of [clean.indexOf('['), clean.indexOf('{')].filter(index => index >= 0).sort((a, b) => a - b)) {
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

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function requireFile(path, label) {
  if (!existsSync(path) || statSync(path).size <= 0) throw new Error(`Gate 28 repair is missing ${label}.`);
}

function downloadR2(orderId, key, filename) {
  const path = join(TEMP_DIR, filename);
  rmSync(path, { force: true });
  runWrangler(['r2', 'object', 'get', `${R2_BUCKET}/${key}`, '--file', path, '--remote', '--env', 'acceptance'], orderId);
  requireFile(path, filename);
  return path;
}

function parseStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map();
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true);
    const compression = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const uncompressed = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + size;
    if (compression !== 0 || size !== uncompressed || dataEnd > bytes.byteLength) throw new Error('Gate 28 repair generated a non-canonical ZIP entry.');
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (!(flags & 0x800) || entries.has(name)) throw new Error(`Gate 28 repair generated an invalid ZIP entry: ${name}.`);
    entries.set(name, bytes.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  return entries;
}

function assertCurrentArtifacts(pdfBytes, zipBytes, canonicalJsonBytes) {
  const pdfText = new TextDecoder('latin1').decode(pdfBytes)
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
  if (!pdfText.startsWith('%PDF-1.4')) throw new Error('Gate 28 repair current PDF signature is invalid.');
  for (const token of PDF_REQUIRED) if (!pdfText.includes(token)) throw new Error(`Gate 28 repair current PDF is missing ${token}.`);
  for (let day = 1; day <= 30; day += 1) if (!pdfText.includes(`Day ${day}:`)) throw new Error(`Gate 28 repair current PDF is missing Day ${day}.`);

  const entries = parseStoredZip(zipBytes);
  const expected = EXPECTED_FILES.map(name => `${ROOT_PREFIX}${name}`).sort();
  const names = [...entries.keys()].sort();
  if (names.length !== 16 || names.join('\n') !== expected.join('\n')) throw new Error('Gate 28 repair current ZIP manifest is not the exact 16-file contract.');
  const bundledJson = entries.get(`${ROOT_PREFIX}blueprint.json`);
  const bundledPdf = entries.get(`${ROOT_PREFIX}launch-blueprint.pdf`);
  if (!bundledJson || !Buffer.from(bundledJson).equals(Buffer.from(canonicalJsonBytes))) throw new Error('Gate 28 repair ZIP changed canonical blueprint.json bytes.');
  if (!bundledPdf || !Buffer.from(bundledPdf).equals(Buffer.from(pdfBytes))) throw new Error('Gate 28 repair ZIP PDF does not match the rematerialized standalone PDF.');
}

function renderCurrentArtifacts(blueprintPath, orderId) {
  const pdfPath = join(TEMP_DIR, 'current-blueprint.pdf');
  const zipPath = join(TEMP_DIR, 'current-assets.zip');
  rmSync(pdfPath, { force: true });
  rmSync(zipPath, { force: true });
  runNode(VITEST_CLI, ['run', HELPER], {
    orderId,
    env: {
      ...process.env,
      GHOSTTOWN_GATE28_BLUEPRINT_PATH: blueprintPath,
      GHOSTTOWN_GATE28_PDF_PATH: pdfPath,
      GHOSTTOWN_GATE28_ZIP_PATH: zipPath,
    },
  });
  requireFile(pdfPath, 'current v2.1 PDF');
  requireFile(zipPath, 'current v2.1 ZIP');
  return { pdfPath, zipPath };
}

function fetchD1Receipt(orderId) {
  const output = runWrangler([
    'd1', 'execute', D1_NAME, '--remote', '--env', 'acceptance',
    '--command', `SELECT research_receipt_json FROM launch_blueprints WHERE order_id = ${sqlLiteral(orderId)} LIMIT 1;`, '--json',
  ], orderId);
  const row = findObjectWithKey(parseLooseJson(output), 'research_receipt_json');
  if (!row || typeof row.research_receipt_json !== 'string') throw new Error('Gate 28 repair could not load the canonical D1 integrity receipt.');
  const researchReceipt = JSON.parse(row.research_receipt_json);
  if (!researchReceipt?.generationReceiptEvidence?.hashes) throw new Error('Gate 28 repair D1 generation receipt is incomplete.');
  return researchReceipt;
}

function fetchKvJson(key, orderId) {
  const output = runWrangler(['kv', 'key', 'get', key, '--binding', KV_BINDING, '--remote', '--env', 'acceptance', '--text'], orderId);
  const parsed = parseLooseJson(output);
  if (!parsed || typeof parsed !== 'object') throw new Error(`Gate 28 repair could not read KV key ${key}.`);
  return parsed;
}

function putKvJson(key, value, filename, orderId) {
  const path = join(TEMP_DIR, filename);
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf8');
  runWrangler(['kv', 'key', 'put', key, '--binding', KV_BINDING, '--path', path, '--remote', '--env', 'acceptance'], orderId);
}

function writeD1Receipt(orderId, researchReceipt) {
  const sqlPath = join(TEMP_DIR, 'update-research-receipt.sql');
  const now = new Date().toISOString();
  writeFileSync(sqlPath,
    `UPDATE launch_blueprints SET research_receipt_json = ${sqlLiteral(JSON.stringify(researchReceipt))}, updated_at = ${sqlLiteral(now)} WHERE order_id = ${sqlLiteral(orderId)};\n`,
    'utf8');
  runWrangler(['d1', 'execute', D1_NAME, '--remote', '--env', 'acceptance', '--file', sqlPath], orderId);
}

function putPresentationArtifacts(orderId, pdfPath, zipPath) {
  runWrangler([
    'r2', 'object', 'put', `${R2_BUCKET}/orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`,
    '--file', pdfPath, '--content-type', 'application/pdf',
    '--content-disposition', `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`,
    '--remote', '--env', 'acceptance',
  ], orderId);
  runWrangler([
    'r2', 'object', 'put', `${R2_BUCKET}/orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`,
    '--file', zipPath, '--content-type', 'application/zip',
    '--content-disposition', `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`,
    '--remote', '--env', 'acceptance',
  ], orderId);
}

function reopenAcceptanceGates(reason) {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  state.gates ||= {};
  for (const id of ['27', '28']) {
    const existing = state.gates[id] || { id: Number(id) };
    state.gates[id] = { ...existing, status: 'PENDING', checked_at: new Date().toISOString(), message: reason };
  }
  state.updated_at = new Date().toISOString();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

if (!existsSync(STATE_PATH) || !existsSync(GATE20_RECEIPT_PATH) || !existsSync(GATE27_RECEIPT_PATH)) {
  throw new Error('Gate 28 repair requires existing roadmap state plus Gate 20 and Gate 27 receipts.');
}
const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
if (state?.gates?.['27']?.status !== 'PASS') throw new Error('Gate 28 repair requires the previously accepted Gate 27 artifact identity.');
const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
const gate27 = JSON.parse(readFileSync(GATE27_RECEIPT_PATH, 'utf8'));
if (purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string') throw new Error('Gate 28 repair requires the existing Stripe test-mode purchase receipt.');
if (gate27?.decision !== 'PASS') throw new Error('Gate 28 repair requires a passing Gate 27 receipt.');

const orderId = purchase.order_id;
mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(BACKUP_DIR, { recursive: true });

const jsonPath = downloadR2(orderId, `orders/${orderId}/ghosttown-launch-blueprint-v2.json`, 'canonical-blueprint.json');
const oldPdfPath = downloadR2(orderId, `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`, 'stored-blueprint.pdf');
const oldZipPath = downloadR2(orderId, `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`, 'stored-assets.zip');
const canonicalJsonBytes = readFileSync(jsonPath);
const oldPdfBytes = readFileSync(oldPdfPath);
const oldZipBytes = readFileSync(oldZipPath);

if (sha256(canonicalJsonBytes) !== gate27.artifacts.json.sha256) throw new Error('Gate 28 repair refuses to continue: canonical JSON no longer matches Gate 27.');
if (sha256(oldPdfBytes) !== gate27.artifacts.pdf.sha256 || sha256(oldZipBytes) !== gate27.artifacts.zip.sha256) {
  throw new Error('Gate 28 repair refuses to continue: stored PDF/ZIP no longer match Gate 27.');
}
const blueprint = JSON.parse(canonicalJsonBytes.toString('utf8'));
if (blueprint?.blueprintVersion !== '2.1' || blueprint?.status !== 'ready') throw new Error('Gate 28 repair requires a ready canonical v2.1 Blueprint.');

copyFileSync(oldPdfPath, join(BACKUP_DIR, 'pre-rematerialization-blueprint.pdf'));
copyFileSync(oldZipPath, join(BACKUP_DIR, 'pre-rematerialization-assets.zip'));
copyFileSync(GATE27_RECEIPT_PATH, join(BACKUP_DIR, 'pre-rematerialization-gate27-receipt.json'));

const { pdfPath, zipPath } = renderCurrentArtifacts(jsonPath, orderId);
const newPdfBytes = readFileSync(pdfPath);
const newZipBytes = readFileSync(zipPath);
assertCurrentArtifacts(newPdfBytes, newZipBytes, canonicalJsonBytes);
const newPdfSha256 = sha256(newPdfBytes);
const newZipSha256 = sha256(newZipBytes);

if (newPdfSha256 === gate27.artifacts.pdf.sha256 && newZipSha256 === gate27.artifacts.zip.sha256) {
  throw new Error('Gate 28 repair found no artifact-byte change; rerun Gate 28 because the stored artifacts already match the current renderer.');
}

const researchReceipt = fetchD1Receipt(orderId);
const previousEvidence = JSON.parse(JSON.stringify(researchReceipt.generationReceiptEvidence));
if (previousEvidence.hashes.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256) {
  throw new Error('Gate 28 repair refuses to continue: D1 canonical Blueprint hash does not match Gate 27.');
}
researchReceipt.generationReceiptEvidence.hashes.pdfSha256 = newPdfSha256;
researchReceipt.generationReceiptEvidence.hashes.zipSha256 = newZipSha256;
researchReceipt.artifactRematerialization = {
  schemaVersion: 'ghosttown-acceptance-artifact-rematerialization-v1',
  reason: 'Gate 28 premium-document renderer contract postdates the preserved Gate 20 acceptance purchase.',
  canonicalBlueprintSha256: gate27.artifacts.json.sha256,
  priorPdfSha256: gate27.artifacts.pdf.sha256,
  priorZipSha256: gate27.artifacts.zip.sha256,
  pdfSha256: newPdfSha256,
  zipSha256: newZipSha256,
  renderer: 'renderLaunchBlueprintPdfV21',
  purchaseReplayed: false,
  researchReplayed: false,
  modelInvoked: false,
  acceptanceOnly: true,
  productionDeployed: false,
  rematerializedAt: new Date().toISOString(),
};

putPresentationArtifacts(orderId, pdfPath, zipPath);
writeD1Receipt(orderId, researchReceipt);
putKvJson(`paid_test_blueprint_integrity_${orderId}`, researchReceipt.generationReceiptEvidence, 'integrity-receipt.json', orderId);
const pointerKey = `paid_test_blueprint_pointer_${orderId}`;
const pointer = fetchKvJson(pointerKey, orderId);
pointer.hashes = researchReceipt.generationReceiptEvidence.hashes;
pointer.updatedAt = new Date().toISOString();
putKvJson(pointerKey, pointer, 'blueprint-pointer.json', orderId);

const verifyPdfPath = downloadR2(orderId, `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`, 'verify-blueprint.pdf');
const verifyZipPath = downloadR2(orderId, `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`, 'verify-assets.zip');
if (sha256(readFileSync(verifyPdfPath)) !== newPdfSha256 || sha256(readFileSync(verifyZipPath)) !== newZipSha256) {
  throw new Error('Gate 28 repair post-write R2 verification failed.');
}
const verifyD1 = fetchD1Receipt(orderId).generationReceiptEvidence;
if (verifyD1.hashes.pdfSha256 !== newPdfSha256 || verifyD1.hashes.zipSha256 !== newZipSha256 || verifyD1.hashes.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256) {
  throw new Error('Gate 28 repair post-write D1 integrity verification failed.');
}

const repairReceipt = {
  schema_version: 'roadmap-gate28-acceptance-artifact-rematerialization-receipt-v1',
  rematerialized_at: new Date().toISOString(),
  environment: 'acceptance',
  reason: 'Bring deterministic PDF/ZIP presentation bytes up to the current v2.1 premium renderer without replaying purchase, research, or generation.',
  canonical_blueprint_sha256: gate27.artifacts.json.sha256,
  canonical_blueprint_unchanged: true,
  prior: { pdf_sha256: gate27.artifacts.pdf.sha256, zip_sha256: gate27.artifacts.zip.sha256 },
  current: { pdf_sha256: newPdfSha256, zip_sha256: newZipSha256 },
  purchase_replayed: false,
  stripe_charge_created: false,
  research_replayed: false,
  vertex_invoked: false,
  canonical_blueprint_regenerated: false,
  acceptance_r2_mutated: true,
  acceptance_d1_integrity_receipt_updated: true,
  acceptance_kv_integrity_pointer_updated: true,
  historical_artifacts_backed_up_locally: true,
  production_mutated: false,
  production_deployed: false,
  gate27_reverification_required: true,
  gate28_reverification_required: true,
  secret_values_recorded: false,
  decision: 'REMATERIALIZED_REVERIFY',
};
writeFileSync(REPAIR_RECEIPT_PATH, `${JSON.stringify(repairReceipt, null, 2)}\n`, 'utf8');
reopenAcceptanceGates('Deterministic v2.1 PDF/ZIP presentation artifacts were rematerialized from unchanged canonical JSON; Gate 27 and Gate 28 must reverify exact bytes.');
rmSync(TEMP_DIR, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  decision: repairReceipt.decision,
  canonical_blueprint_unchanged: true,
  purchase_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  acceptance_only: true,
  production_mutated: false,
  next: 'npm run roadmap:autopilot',
  receipt: '.roadmap-autopilot/gate28-artifact-rematerialization-receipt.json',
}));
