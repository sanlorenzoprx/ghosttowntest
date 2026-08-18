#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withAcceptanceR2Binding } from './roadmap-r2-binding-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate28-artifact-rematerialization-receipt.json');
const TEMP_DIR = join(STATE_DIR, 'gate28-rematerialization-v3-work');
const BACKUP_DIR = join(STATE_DIR, 'gate28-rematerialization-backup');
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const KV_BINDING = 'KV';
const HELPER = 'scripts/roadmap-gate28-render-current-pdf.test.ts';

function packageBin(packageName, binName = packageName) {
  const dir = join(ROOT, 'node_modules', packageName);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];
  if (!bin) throw new Error(`Gate 28 v3 repair could not resolve ${packageName} CLI.`);
  return resolve(dir, bin);
}

const WRANGLER_CLI = packageBin('wrangler', 'wrangler');
const VITEST_CLI = packageBin('vitest', 'vitest');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function redact(value, orderId = '') {
  let text = String(value ?? '');
  if (orderId) text = text.replaceAll(orderId, '[ORDER_ID_REDACTED]');
  return text
    .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|rk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[PRIVATE_KEY_REDACTED]');
}

function runNode(script, args = [], { orderId = '', ...options } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    ...options
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 28 v3 command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', orderId)}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function runWrangler(args, orderId = '') {
  return runNode(WRANGLER_CLI, args, { orderId });
}

function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  const starts = [clean.indexOf('['), clean.indexOf('{')].filter(index => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
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

function fetchCanonicalD1(orderId) {
  const output = runWrangler([
    'd1', 'execute', D1_NAME, '--remote', '--env', 'acceptance', '--json',
    '--command', `SELECT blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ${sqlLiteral(orderId)} LIMIT 1;`
  ], orderId);
  const row = findObjectWithKey(parseLooseJson(output), 'blueprint_json');
  if (!row || typeof row.blueprint_json !== 'string' || typeof row.research_receipt_json !== 'string') {
    throw new Error('Gate 28 v3 could not load canonical D1 Blueprint and integrity receipt.');
  }
  const researchReceipt = JSON.parse(row.research_receipt_json);
  const evidence = researchReceipt?.generationReceiptEvidence;
  if (!evidence?.hashes || !evidence?.artifactKeys) throw new Error('Gate 28 v3 D1 generation receipt is incomplete.');
  return { blueprintJson: row.blueprint_json, researchReceipt, evidence };
}

function writeD1Receipt(orderId, researchReceipt, filename) {
  const path = join(TEMP_DIR, filename);
  writeFileSync(path, `UPDATE launch_blueprints SET research_receipt_json = ${sqlLiteral(JSON.stringify(researchReceipt))}, updated_at = ${sqlLiteral(new Date().toISOString())} WHERE order_id = ${sqlLiteral(orderId)};\n`, 'utf8');
  runWrangler(['d1', 'execute', D1_NAME, '--remote', '--env', 'acceptance', '--file', path], orderId);
}

function fetchKvJson(key, orderId) {
  const output = runWrangler(['kv', 'key', 'get', key, '--binding', KV_BINDING, '--remote', '--env', 'acceptance', '--text'], orderId);
  const parsed = parseLooseJson(output);
  if (!parsed || typeof parsed !== 'object') throw new Error(`Gate 28 v3 could not read KV key ${key}.`);
  return parsed;
}

function putKvJson(key, value, filename, orderId) {
  const path = join(TEMP_DIR, filename);
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf8');
  runWrangler(['kv', 'key', 'put', key, '--binding', KV_BINDING, '--remote', '--env', 'acceptance', '--path', path], orderId);
}

async function waitForKvHash(key, expectedPdf, expectedZip, orderId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const value = fetchKvJson(key, orderId);
    if (value?.hashes?.pdfSha256 === expectedPdf && value?.hashes?.zipSha256 === expectedZip) return value;
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  throw new Error(`Gate 28 v3 KV verification did not observe updated hashes for ${key}.`);
}

function renderCurrentArtifacts(blueprintPath, orderId) {
  const pdfPath = join(TEMP_DIR, 'current-blueprint.pdf');
  const zipPath = join(TEMP_DIR, 'current-assets.zip');
  const documentReceiptPath = join(TEMP_DIR, 'current-document-receipt.json');
  for (const path of [pdfPath, zipPath, documentReceiptPath]) rmSync(path, { force: true });
  runNode(VITEST_CLI, ['run', HELPER], {
    orderId,
    env: {
      ...process.env,
      GHOSTTOWN_GATE28_BLUEPRINT_PATH: blueprintPath,
      GHOSTTOWN_GATE28_PDF_PATH: pdfPath,
      GHOSTTOWN_GATE28_ZIP_PATH: zipPath,
      GHOSTTOWN_GATE28_DOCUMENT_RECEIPT_PATH: documentReceiptPath
    }
  });
  for (const [path, label] of [[pdfPath, 'PDF'], [zipPath, 'ZIP'], [documentReceiptPath, 'document receipt']]) {
    if (!existsSync(path) || statSync(path).size <= 0) throw new Error(`Gate 28 v3 renderer did not create ${label}.`);
  }
  return { pdfPath, zipPath, documentReceiptPath };
}

function artifactKeys(orderId) {
  return {
    json: `orders/${orderId}/ghosttown-launch-blueprint-v2.json`,
    pdf: `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`,
    zip: `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`
  };
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
  throw new Error('Gate 28 v3 requires roadmap state plus Gate 20 and prior Gate 27 receipts.');
}
const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
if (state?.gates?.['27']?.status !== 'PASS') throw new Error('Gate 28 v3 requires the previously accepted Gate 27 state.');
const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
if (purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string') throw new Error('Gate 28 v3 requires the existing Stripe test-mode purchase receipt.');
const orderId = purchase.order_id;
const keys = artifactKeys(orderId);

mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(BACKUP_DIR, { recursive: true });
const canonical = fetchCanonicalD1(orderId);
const blueprint = JSON.parse(canonical.blueprintJson);
if (blueprint?.blueprintVersion !== '2.1' || blueprint?.schemaVersion !== 'ghosttown-launch-blueprint-v2' || blueprint?.status !== 'ready') {
  throw new Error('Gate 28 v3 requires a ready canonical v2.1 Blueprint in D1.');
}
if (canonical.evidence.artifactKeys.json !== keys.json || canonical.evidence.artifactKeys.pdf !== keys.pdf || canonical.evidence.artifactKeys.zip !== keys.zip) {
  throw new Error('Gate 28 v3 D1 artifact-key contract drifted.');
}

const canonicalPath = join(TEMP_DIR, 'canonical-blueprint.json');
writeFileSync(canonicalPath, canonical.blueprintJson, 'utf8');
const canonicalBytes = readFileSync(canonicalPath);
if (sha256(canonicalBytes) !== canonical.evidence.hashes.canonicalBlueprintSha256) {
  throw new Error('Gate 28 v3 canonical D1 JSON hash does not match its integrity receipt.');
}

const priorIntegrityKey = `paid_test_blueprint_integrity_${orderId}`;
const pointerKey = `paid_test_blueprint_pointer_${orderId}`;
const priorIntegrity = fetchKvJson(priorIntegrityKey, orderId);
const priorPointer = fetchKvJson(pointerKey, orderId);
writeFileSync(join(BACKUP_DIR, 'pre-rematerialization-research-receipt.json'), `${JSON.stringify(canonical.researchReceipt, null, 2)}\n`, 'utf8');
writeFileSync(join(BACKUP_DIR, 'pre-rematerialization-integrity-kv.json'), `${JSON.stringify(priorIntegrity, null, 2)}\n`, 'utf8');
writeFileSync(join(BACKUP_DIR, 'pre-rematerialization-pointer-kv.json'), `${JSON.stringify(priorPointer, null, 2)}\n`, 'utf8');
copyFileSync(GATE27_RECEIPT_PATH, join(BACKUP_DIR, 'pre-rematerialization-gate27-receipt.json'));

const { pdfPath, zipPath, documentReceiptPath } = renderCurrentArtifacts(canonicalPath, orderId);
const newPdf = readFileSync(pdfPath);
const newZip = readFileSync(zipPath);
const documentReceipt = JSON.parse(readFileSync(documentReceiptPath, 'utf8'));
const newPdfSha = sha256(newPdf);
const newZipSha = sha256(newZip);

let repairReceipt;
await withAcceptanceR2Binding(async r2 => {
  const oldJson = await r2.get(keys.json);
  const oldPdf = await r2.get(keys.pdf);
  const oldZip = await r2.get(keys.zip);
  const oldPdfSha = sha256(oldPdf);
  const oldZipSha = sha256(oldZip);

  if (!oldJson.equals(canonicalBytes)) throw new Error('Gate 28 v3 Worker-binding canonical JSON does not exactly match D1 canonical JSON.');
  if (oldPdfSha !== canonical.evidence.hashes.pdfSha256 || oldZipSha !== canonical.evidence.hashes.zipSha256) {
    throw new Error(`Gate 28 v3 prior Worker-binding artifact integrity mismatch: pdf_receipt=${canonical.evidence.hashes.pdfSha256}, pdf_binding=${oldPdfSha}, zip_receipt=${canonical.evidence.hashes.zipSha256}, zip_binding=${oldZipSha}.`);
  }

  writeFileSync(join(BACKUP_DIR, 'pre-rematerialization-blueprint.pdf'), oldPdf);
  writeFileSync(join(BACKUP_DIR, 'pre-rematerialization-assets.zip'), oldZip);

  const nextReceipt = JSON.parse(JSON.stringify(canonical.researchReceipt));
  nextReceipt.generationReceiptEvidence.hashes.pdfSha256 = newPdfSha;
  nextReceipt.generationReceiptEvidence.hashes.zipSha256 = newZipSha;
  nextReceipt.generationReceiptEvidence.document = documentReceipt;
  nextReceipt.artifactRematerialization = {
    schemaVersion: 'ghosttown-acceptance-artifact-rematerialization-v2',
    reason: 'Gate 28 premium-document presentation rematerialized through the same remote R2 binding used by customer fulfillment.',
    canonicalBlueprintSha256: canonical.evidence.hashes.canonicalBlueprintSha256,
    priorPdfSha256: oldPdfSha,
    priorZipSha256: oldZipSha,
    pdfSha256: newPdfSha,
    zipSha256: newZipSha,
    renderer: 'renderLaunchBlueprintPdfV21',
    r2MutationPath: 'workers-remote-binding',
    documentReceipt,
    purchaseReplayed: false,
    researchReplayed: false,
    modelInvoked: false,
    acceptanceOnly: true,
    productionDeployed: false,
    rematerializedAt: new Date().toISOString()
  };
  const nextPointer = JSON.parse(JSON.stringify(priorPointer));
  nextPointer.hashes = nextReceipt.generationReceiptEvidence.hashes;
  nextPointer.updatedAt = new Date().toISOString();

  const metadataBase = { orderId, ownerId: blueprint.ownerId, schemaVersion: blueprint.schemaVersion };
  try {
    await r2.put(keys.pdf, newPdf, {
      ...metadataBase,
      sha256: newPdfSha,
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`
    });
    const verifyPdf = await r2.get(keys.pdf);
    if (!verifyPdf.equals(newPdf)) throw new Error(`Gate 28 v3 PDF binding round-trip mismatch: expected_sha256=${newPdfSha}, actual_sha256=${sha256(verifyPdf)}, expected_bytes=${newPdf.byteLength}, actual_bytes=${verifyPdf.byteLength}.`);

    await r2.put(keys.zip, newZip, {
      ...metadataBase,
      sha256: newZipSha,
      contentType: 'application/zip',
      contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`
    });
    const verifyZip = await r2.get(keys.zip);
    if (!verifyZip.equals(newZip)) throw new Error(`Gate 28 v3 ZIP binding round-trip mismatch: expected_sha256=${newZipSha}, actual_sha256=${sha256(verifyZip)}, expected_bytes=${newZip.byteLength}, actual_bytes=${verifyZip.byteLength}.`);

    writeD1Receipt(orderId, nextReceipt, 'update-research-receipt-v3.sql');
    putKvJson(priorIntegrityKey, nextReceipt.generationReceiptEvidence, 'integrity-receipt-v3.json', orderId);
    putKvJson(pointerKey, nextPointer, 'blueprint-pointer-v3.json', orderId);

    const verifyD1 = fetchCanonicalD1(orderId);
    if (verifyD1.evidence.hashes.pdfSha256 !== newPdfSha || verifyD1.evidence.hashes.zipSha256 !== newZipSha || verifyD1.evidence.hashes.canonicalBlueprintSha256 !== canonical.evidence.hashes.canonicalBlueprintSha256) {
      throw new Error('Gate 28 v3 D1 integrity receipt verification failed after binding write.');
    }
    await waitForKvHash(priorIntegrityKey, newPdfSha, newZipSha, orderId);
    await waitForKvHash(pointerKey, newPdfSha, newZipSha, orderId);

    const finalJson = await r2.get(keys.json);
    const finalPdf = await r2.get(keys.pdf);
    const finalZip = await r2.get(keys.zip);
    if (!finalJson.equals(canonicalBytes)) throw new Error('Gate 28 v3 canonical JSON changed unexpectedly.');
    if (!finalPdf.equals(newPdf) || !finalZip.equals(newZip)) throw new Error('Gate 28 v3 final Worker-binding artifact verification failed.');
  } catch (error) {
    let rollbackError = null;
    try {
      await r2.put(keys.pdf, oldPdf, {
        ...metadataBase,
        sha256: oldPdfSha,
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}.pdf"`
      });
      await r2.put(keys.zip, oldZip, {
        ...metadataBase,
        sha256: oldZipSha,
        contentType: 'application/zip',
        contentDisposition: `attachment; filename="ghosttown-launch-blueprint-${orderId}-assets.zip"`
      });
      writeD1Receipt(orderId, canonical.researchReceipt, 'rollback-research-receipt-v3.sql');
      putKvJson(priorIntegrityKey, priorIntegrity, 'rollback-integrity-v3.json', orderId);
      putKvJson(pointerKey, priorPointer, 'rollback-pointer-v3.json', orderId);
      const rollbackPdf = await r2.get(keys.pdf);
      const rollbackZip = await r2.get(keys.zip);
      if (!rollbackPdf.equals(oldPdf) || !rollbackZip.equals(oldZip)) throw new Error('Worker-binding rollback did not restore original bytes.');
    } catch (caught) {
      rollbackError = caught;
    }
    if (rollbackError) throw new Error(`Gate 28 v3 failed and rollback also failed. Original: ${error instanceof Error ? error.message : String(error)}. Rollback: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
    throw error;
  }

  repairReceipt = {
    schema_version: 'roadmap-gate28-acceptance-artifact-rematerialization-receipt-v2',
    rematerialized_at: new Date().toISOString(),
    environment: 'acceptance',
    canonical_blueprint_sha256: canonical.evidence.hashes.canonicalBlueprintSha256,
    canonical_blueprint_unchanged: true,
    prior: { pdf_sha256: oldPdfSha, zip_sha256: oldZipSha },
    current: { pdf_sha256: newPdfSha, zip_sha256: newZipSha, document_receipt: documentReceipt },
    r2_mutation_path: 'workers_remote_binding',
    r2_exact_round_trip_verified: true,
    purchase_replayed: false,
    stripe_charge_created: false,
    research_replayed: false,
    vertex_invoked: false,
    canonical_blueprint_regenerated: false,
    acceptance_only: true,
    production_mutated: false,
    production_deployed: false,
    rollback_on_partial_failure: true,
    gate27_reverification_required: true,
    gate28_reverification_required: true,
    secret_values_recorded: false,
    decision: 'REMATERIALIZED_REVERIFY'
  };
});

writeFileSync(RECEIPT_PATH, `${JSON.stringify(repairReceipt, null, 2)}\n`, 'utf8');
reopenAcceptanceGates('Acceptance PDF/ZIP rematerialized through authoritative remote Worker R2 binding from unchanged canonical JSON; Gates 27 and 28 must reverify the same binding-visible bytes.');
rmSync(TEMP_DIR, { recursive: true, force: true });
console.log(JSON.stringify({
  ok: true,
  decision: repairReceipt.decision,
  canonical_blueprint_unchanged: true,
  r2_mutation_path: repairReceipt.r2_mutation_path,
  r2_exact_round_trip_verified: true,
  purchase_replayed: false,
  research_replayed: false,
  vertex_invoked: false,
  acceptance_only: true,
  production_mutated: false,
  next: 'npm run roadmap:autopilot',
  receipt: '.roadmap-autopilot/gate28-artifact-rematerialization-receipt.json'
}));
