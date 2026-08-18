#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withGate28RecoveryBindings } from './roadmap-gate28-recovery-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate28-artifact-rematerialization-receipt.json');
const BACKUP_DIR = join(STATE_DIR, 'gate28-rematerialization-backup');
const TEMP_DIR = join(STATE_DIR, 'gate28-rematerialization-v4-work');
const HELPER = 'scripts/roadmap-gate28-render-current-pdf.test.ts';
const ROOT_PREFIX = 'ghosttown-launch-blueprint/';
const EXPECTED_FILES = [
  'README.md','blueprint.json','launch-blueprint.pdf','executive-summary.md','offer-and-pricing.md','positioning.md',
  'media-and-distribution-network.csv','outreach-scripts.md','helpful-posts.md','landing-page-copy.md','launch-site-config.json',
  'thirty-day-calendar.csv','weekly-milestones.md','metrics-template.csv','decision-rules.md','sources.csv'
];
const PDF_REQUIRED = [
  '48-Hour Launch Card','First Customer','First Offer','First Revenue Path','Customer Access Network','Today: Day 1',
  'Starting-State and Evidence Audit','Manual Fulfillment and Economics','Prepared Content and Conversations','Launch Site',
  'Full 30-Day Plan','Behavioral Evidence Hierarchy','Adaptive Checkpoint Reviews','Sources and Receipt',
  'DECISION','WHY','EVIDENCE','READY-TO-USE ASSETS','MEASUREMENT','ADAPTATION RULE'
];

function packageBin(packageName, binName = packageName) {
  const dir = join(ROOT, 'node_modules', packageName);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Gate 28 v4 could not resolve ${packageName} CLI.`);
  return resolve(dir, bin);
}

const VITEST_CLI = packageBin('vitest', 'vitest');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function requireFile(path, label) {
  if (!existsSync(path) || statSync(path).size <= 0) throw new Error(`Gate 28 v4 requires ${label}: ${path}`);
}

function runRenderer(canonicalPath, orderId) {
  const pdfPath = join(TEMP_DIR, 'current-blueprint.pdf');
  const zipPath = join(TEMP_DIR, 'current-assets.zip');
  const documentReceiptPath = join(TEMP_DIR, 'current-document-receipt.json');
  for (const path of [pdfPath, zipPath, documentReceiptPath]) rmSync(path, { force: true });
  const result = spawnSync(process.execPath, [VITEST_CLI, 'run', HELPER], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      GHOSTTOWN_GATE28_BLUEPRINT_PATH: canonicalPath,
      GHOSTTOWN_GATE28_PDF_PATH: pdfPath,
      GHOSTTOWN_GATE28_ZIP_PATH: zipPath,
      GHOSTTOWN_GATE28_DOCUMENT_RECEIPT_PATH: documentReceiptPath
    }
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`Gate 28 v4 renderer failed (${result.status ?? 1}).\n${result.stderr || result.stdout || ''}`.trim());
  requireFile(pdfPath, 'current v2.1 PDF');
  requireFile(zipPath, 'current v2.1 ZIP');
  requireFile(documentReceiptPath, 'current deterministic document receipt');
  return { pdfPath, zipPath, documentReceiptPath };
}

function parseStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
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
    if (!(flags & 0x800) || compression !== 0 || size !== uncompressed || dataEnd > bytes.byteLength) throw new Error('Gate 28 v4 generated ZIP entry structure is invalid.');
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (entries.has(name)) throw new Error(`Gate 28 v4 generated duplicate ZIP entry ${name}.`);
    entries.set(name, bytes.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  return entries;
}

function assertRenderedArtifacts(pdf, zip, canonicalBytes) {
  const pdfText = new TextDecoder('latin1').decode(pdf)
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
  if (!pdfText.startsWith('%PDF-1.4')) throw new Error('Gate 28 v4 current PDF signature is invalid.');
  for (const token of PDF_REQUIRED) if (!pdfText.includes(token)) throw new Error(`Gate 28 v4 current PDF is missing ${token}.`);
  for (let day = 1; day <= 30; day += 1) if (!pdfText.includes(`Day ${day}:`)) throw new Error(`Gate 28 v4 current PDF is missing Day ${day}.`);

  const entries = parseStoredZip(zip);
  const expected = EXPECTED_FILES.map(name => `${ROOT_PREFIX}${name}`).sort();
  const actual = [...entries.keys()].sort();
  if (actual.length !== 16 || actual.join('\n') !== expected.join('\n')) throw new Error(`Gate 28 v4 ZIP manifest mismatch: ${actual.length} files.`);
  const bundledJson = entries.get(`${ROOT_PREFIX}blueprint.json`);
  const bundledPdf = entries.get(`${ROOT_PREFIX}launch-blueprint.pdf`);
  if (!bundledJson || !Buffer.from(bundledJson).equals(canonicalBytes)) throw new Error('Gate 28 v4 ZIP canonical JSON does not match D1 canonical bytes.');
  if (!bundledPdf || !Buffer.from(bundledPdf).equals(pdf)) throw new Error('Gate 28 v4 ZIP bundled PDF does not match the standalone PDF.');
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

for (const [path, label] of [
  [STATE_PATH, 'roadmap state'],
  [GATE20_RECEIPT_PATH, 'Gate 20 purchase receipt'],
  [GATE27_RECEIPT_PATH, 'Gate 27 integrity receipt'],
  [join(BACKUP_DIR, 'pre-rematerialization-blueprint.pdf'), 'pre-v3 PDF backup'],
  [join(BACKUP_DIR, 'pre-rematerialization-assets.zip'), 'pre-v3 ZIP backup'],
  [join(BACKUP_DIR, 'pre-rematerialization-research-receipt.json'), 'pre-v3 D1 receipt backup'],
  [join(BACKUP_DIR, 'pre-rematerialization-integrity-kv.json'), 'pre-v3 KV integrity backup'],
  [join(BACKUP_DIR, 'pre-rematerialization-pointer-kv.json'), 'pre-v3 KV pointer backup']
]) requireFile(path, label);

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
if (state?.gates?.['27']?.status !== 'PASS') throw new Error('Gate 28 v4 requires the prior Gate 27 state to remain PASS until recovery succeeds.');
const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
const gate27 = JSON.parse(readFileSync(GATE27_RECEIPT_PATH, 'utf8'));
if (purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string') throw new Error('Gate 28 v4 requires the existing Stripe test-mode purchase receipt.');
if (gate27?.schema_version !== 'roadmap-gate27-private-r2-artifacts-receipt-v1' || gate27?.decision !== 'PASS') throw new Error('Gate 28 v4 requires the prior passing Gate 27 receipt.');
const orderId = purchase.order_id;

const priorPdf = readFileSync(join(BACKUP_DIR, 'pre-rematerialization-blueprint.pdf'));
const priorZip = readFileSync(join(BACKUP_DIR, 'pre-rematerialization-assets.zip'));
const priorResearchReceipt = JSON.parse(readFileSync(join(BACKUP_DIR, 'pre-rematerialization-research-receipt.json'), 'utf8'));
const priorIntegrity = JSON.parse(readFileSync(join(BACKUP_DIR, 'pre-rematerialization-integrity-kv.json'), 'utf8'));
const priorPointer = JSON.parse(readFileSync(join(BACKUP_DIR, 'pre-rematerialization-pointer-kv.json'), 'utf8'));
const priorPdfSha = sha256(priorPdf);
const priorZipSha = sha256(priorZip);
if (priorPdfSha !== gate27.artifacts.pdf.sha256 || priorZipSha !== gate27.artifacts.zip.sha256) {
  throw new Error(`Gate 28 v4 backup bytes do not match Gate 27: pdf=${priorPdfSha}/${gate27.artifacts.pdf.sha256}, zip=${priorZipSha}/${gate27.artifacts.zip.sha256}.`);
}
if (priorResearchReceipt?.generationReceiptEvidence?.hashes?.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256
    || priorResearchReceipt?.generationReceiptEvidence?.hashes?.pdfSha256 !== priorPdfSha
    || priorResearchReceipt?.generationReceiptEvidence?.hashes?.zipSha256 !== priorZipSha) {
  throw new Error('Gate 28 v4 backup D1 receipt does not match Gate 27 baseline hashes.');
}

mkdirSync(TEMP_DIR, { recursive: true });
const canonical = await withGate28RecoveryBindings(client => client.canonical(orderId));
if (canonical?.canonicalBlueprintSha256 !== gate27.artifacts.json.sha256) {
  throw new Error(`Gate 28 v4 canonical JSON no longer matches Gate 27: current=${canonical?.canonicalBlueprintSha256}, gate27=${gate27.artifacts.json.sha256}.`);
}
const canonicalPath = join(TEMP_DIR, 'canonical-blueprint.json');
writeFileSync(canonicalPath, canonical.blueprintJson, 'utf8');
const canonicalBytes = readFileSync(canonicalPath);
if (sha256(canonicalBytes) !== gate27.artifacts.json.sha256) throw new Error('Gate 28 v4 local canonical Blueprint bytes do not match Gate 27.');

const { pdfPath, zipPath, documentReceiptPath } = runRenderer(canonicalPath, orderId);
const newPdf = readFileSync(pdfPath);
const newZip = readFileSync(zipPath);
const documentReceipt = JSON.parse(readFileSync(documentReceiptPath, 'utf8'));
assertRenderedArtifacts(newPdf, newZip, canonicalBytes);
const newPdfSha = sha256(newPdf);
const newZipSha = sha256(newZip);

const result = await withGate28RecoveryBindings(client => client.rematerialize({
  orderId,
  canonicalBlueprintSha256: gate27.artifacts.json.sha256,
  priorPdfSha256: priorPdfSha,
  priorZipSha256: priorZipSha,
  pdfSha256: newPdfSha,
  zipSha256: newZipSha,
  priorPdfBase64: priorPdf.toString('base64'),
  priorZipBase64: priorZip.toString('base64'),
  pdfBase64: newPdf.toString('base64'),
  zipBase64: newZip.toString('base64'),
  priorResearchReceipt,
  priorIntegrity,
  priorPointer,
  documentReceipt
}));

if (result?.decision !== 'REMATERIALIZED_REVERIFY' || result?.canonical_blueprint_unchanged !== true
    || result?.r2_exact_round_trip_verified !== true || result?.d1_integrity_receipt_verified !== true
    || result?.data_mutation_path !== 'single_worker_remote_bindings') {
  throw new Error(`Gate 28 v4 recovery returned an incomplete success receipt: ${JSON.stringify(result)}`);
}

const repairReceipt = {
  schema_version: 'roadmap-gate28-acceptance-artifact-rematerialization-receipt-v4',
  rematerialized_at: new Date().toISOString(),
  environment: 'acceptance',
  ...result,
  canonical_blueprint_regenerated: false,
  stripe_charge_created: false,
  gate27_reverification_required: true,
  gate28_reverification_required: true,
  secret_values_recorded: false
};
writeFileSync(RECEIPT_PATH, `${JSON.stringify(repairReceipt, null, 2)}\n`, 'utf8');
reopenAcceptanceGates('Gate 28 v4 finalized or recovered PDF/ZIP and integrity receipts through one authoritative remote DB/KV/R2 binding transaction; Gates 27 and 28 must reverify.');
rmSync(TEMP_DIR, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  decision: repairReceipt.decision,
  canonical_blueprint_unchanged: true,
  recovered_partial_state: repairReceipt.recovered_partial_state,
  data_mutation_path: repairReceipt.data_mutation_path,
  r2_exact_round_trip_verified: true,
  d1_integrity_receipt_verified: true,
  kv_writes_acknowledged: true,
  purchase_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  acceptance_only: true,
  production_mutated: false,
  next: 'npm run roadmap:autopilot',
  receipt: '.roadmap-autopilot/gate28-artifact-rematerialization-receipt.json'
}));
