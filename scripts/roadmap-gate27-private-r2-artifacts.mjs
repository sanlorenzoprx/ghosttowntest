#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE26_RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const TEMP_DIR = join(STATE_DIR, 'gate27-r2-downloads');
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 27 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  const starts = [clean.indexOf('['), clean.indexOf('{')]
    .filter(index => index >= 0)
    .sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = clean.length; end > start; end -= 1) {
      const last = clean[end - 1];
      if (last !== ']' && last !== '}') continue;
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

function redact(value, orderId = '') {
  let text = String(value ?? '');
  if (orderId) text = text.replaceAll(orderId, '[ORDER_ID_REDACTED]');
  return text
    .replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|rk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[PRIVATE_KEY_REDACTED]');
}

function runWrangler(args, orderId = '') {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 27 Wrangler command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', orderId)}`.trim());
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function assertPrerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 27 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['26']?.status !== 'PASS') throw new Error('Gate 27 requires Gate 26 to be PASS.');
  if (!existsSync(GATE20_RECEIPT_PATH)) throw new Error('Gate 27 requires the existing Gate 20 purchase receipt.');
  if (!existsSync(GATE26_RECEIPT_PATH)) throw new Error('Gate 27 requires the Gate 26 canonical D1 receipt.');
  const gate26 = JSON.parse(readFileSync(GATE26_RECEIPT_PATH, 'utf8'));
  if (gate26?.schema_version !== 'roadmap-gate26-canonical-d1-artifacts-receipt-v1' || gate26?.decision !== 'PASS') {
    throw new Error('Gate 27 found an invalid Gate 26 receipt.');
  }

  const storeSource = readFileSync(join(ROOT, 'src', 'api', 'blueprintStore.ts'), 'utf8');
  const apiSource = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const routeSource = readFileSync(join(ROOT, 'src', 'api', 'index.ts'), 'utf8');
  const requiredSourceTokens = [
    'ghosttown-launch-blueprint-v2.pdf',
    'ghosttown-launch-blueprint-v2.json',
    'ghosttown-launch-blueprint-v2-assets.zip',
    'handleLaunchBlueprintJson',
    'handleLaunchBlueprintPdf',
    'handleLaunchBlueprintAssets',
    'Cache-Control',
    'private, no-store',
    'blueprintJsonMatch',
    'blueprintPdfMatch',
    'blueprintAssetsMatch'
  ];
  const combined = `${storeSource}\n${apiSource}\n${routeSource}`;
  if (requiredSourceTokens.some(token => !combined.includes(token))) {
    throw new Error('Gate 27 source contract no longer proves private canonical JSON/PDF/ZIP storage and delivery routes.');
  }
}

function purchaseReceipt() {
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1'
    || receipt?.stripe_mode !== 'test'
    || typeof receipt?.order_id !== 'string'
    || !/^gtt_[A-Za-z0-9_-]+$/.test(receipt.order_id)) {
    throw new Error('Gate 27 found an incomplete or unexpected Gate 20 purchase receipt.');
  }
  return receipt;
}

function canonicalD1(orderId) {
  const order = sqlLiteral(orderId);
  const sql = `SELECT blueprint_json, research_receipt_json FROM launch_blueprints WHERE order_id = ${order} LIMIT 1;`;
  const output = runWrangler([
    'd1', 'execute', D1_NAME,
    '--remote', '--env', 'acceptance', '--command', sql, '--json'
  ], orderId);
  const parsed = parseLooseJson(output);
  const row = findObjectWithKey(parsed, 'blueprint_json');
  if (!row || typeof row.blueprint_json !== 'string' || typeof row.research_receipt_json !== 'string') {
    throw new Error('Gate 27 could not read canonical Blueprint/integrity receipt from acceptance D1.');
  }
  let blueprint;
  let researchReceipt;
  try { blueprint = JSON.parse(row.blueprint_json); } catch { throw new Error('Gate 27 canonical D1 Blueprint JSON is invalid.'); }
  try { researchReceipt = JSON.parse(row.research_receipt_json); } catch { throw new Error('Gate 27 canonical D1 research receipt JSON is invalid.'); }
  const evidence = researchReceipt?.generationReceiptEvidence;
  if (!evidence?.artifactKeys || !evidence?.hashes) throw new Error('Gate 27 D1 generation integrity receipt is incomplete.');
  return { row, blueprint, evidence };
}

function expectedArtifacts(orderId, evidence) {
  const expected = {
    json: {
      key: `orders/${orderId}/ghosttown-launch-blueprint-v2.json`,
      hash: evidence.hashes.canonicalBlueprintSha256
    },
    pdf: {
      key: `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`,
      hash: evidence.hashes.pdfSha256
    },
    zip: {
      key: `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`,
      hash: evidence.hashes.zipSha256
    }
  };
  const receiptKeys = evidence.artifactKeys;
  if (receiptKeys.json !== expected.json.key || receiptKeys.pdf !== expected.pdf.key || receiptKeys.zip !== expected.zip.key) {
    throw new Error('Gate 27 persisted artifact keys do not match the canonical private R2 key contract.');
  }
  for (const artifact of Object.values(expected)) {
    if (!/^[a-f0-9]{64}$/i.test(String(artifact.hash || ''))) {
      throw new Error('Gate 27 persisted artifact integrity receipt contains an invalid SHA-256.');
    }
  }
  return expected;
}

function findEnabledBooleans(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) findEnabledBooleans(item, found);
  } else if (value && typeof value === 'object') {
    if (typeof value.enabled === 'boolean') found.push(value.enabled);
    for (const child of Object.values(value)) findEnabledBooleans(child, found);
  }
  return found;
}

function assertDevUrlDisabled(output) {
  const parsed = parseLooseJson(output);
  const flags = findEnabledBooleans(parsed);
  if (flags.includes(true)) throw new Error('Gate 27 acceptance R2 bucket has public r2.dev access enabled.');
  if (flags.includes(false)) return;
  const text = stripAnsi(output).toLowerCase();
  if (/\b(enabled|allowed)\b[^\n]*(true|yes)|public[^\n]*(enabled|allowed)/i.test(text)) {
    throw new Error('Gate 27 acceptance R2 bucket appears publicly accessible through r2.dev.');
  }
  if (/\bdisabled\b|\bnot enabled\b|\bdisallowed\b|enabled\s*[:=]\s*false/i.test(text)) return;
  throw new Error('Gate 27 could not prove that acceptance R2 r2.dev access is disabled.');
}

function domainRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.domains)) return value.domains;
  const nested = findObjectWithKey(value, 'domains');
  return Array.isArray(nested?.domains) ? nested.domains : null;
}

function assertNoEnabledCustomDomain(output) {
  const parsed = parseLooseJson(output);
  const rows = domainRows(parsed);
  if (rows) {
    const enabled = rows.filter(row => row && typeof row === 'object' && row.enabled === true);
    const unknown = rows.filter(row => row && typeof row === 'object' && typeof row.enabled !== 'boolean');
    if (enabled.length) throw new Error('Gate 27 acceptance R2 bucket has an enabled custom public domain.');
    if (unknown.length) throw new Error('Gate 27 could not determine custom-domain enabled state from Wrangler output.');
    return rows.length;
  }
  const text = stripAnsi(output).trim();
  if (!text || /no custom domains|no domains|\[\s*\]/i.test(text)) return 0;
  throw new Error('Gate 27 could not prove that the acceptance R2 bucket has no enabled custom public domain.');
}

function downloadArtifact(kind, key, pass, orderId) {
  const path = join(TEMP_DIR, `${kind}-${pass}.bin`);
  rmSync(path, { force: true });
  runWrangler([
    'r2', 'object', 'get', `${R2_BUCKET}/${key}`,
    '--file', path, '--remote', '--env', 'acceptance'
  ], orderId);
  if (!existsSync(path) || statSync(path).size <= 0) {
    throw new Error(`Gate 27 ${kind.toUpperCase()} R2 download was empty or missing.`);
  }
  const bytes = readFileSync(path);
  return { bytes, sha256: sha256(bytes), size: bytes.byteLength };
}

function assertArtifactIdentity(kind, first, second, expectedHash, d1Json = null) {
  if (first.sha256 !== second.sha256 || first.size !== second.size || !first.bytes.equals(second.bytes)) {
    throw new Error(`Gate 27 ${kind.toUpperCase()} repeat download changed bytes or size.`);
  }
  if (first.sha256 !== expectedHash) {
    throw new Error(`Gate 27 ${kind.toUpperCase()} R2 bytes do not match the persisted generation-receipt SHA-256.`);
  }
  if (kind === 'json') {
    const text = first.bytes.toString('utf8');
    if (text !== d1Json) throw new Error('Gate 27 R2 canonical JSON bytes do not exactly match canonical D1 blueprint_json.');
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error('Gate 27 R2 canonical JSON is not valid JSON.'); }
    if (parsed?.schemaVersion !== EXPECTED_SCHEMA) throw new Error('Gate 27 R2 canonical JSON schema identity drifted.');
  } else if (kind === 'pdf') {
    if (first.bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Gate 27 R2 PDF does not have a valid PDF signature.');
  } else if (kind === 'zip') {
    const signature = first.bytes.length >= 4 ? first.bytes.readUInt32LE(0) : 0;
    if (![0x04034b50, 0x06054b50, 0x08074b50].includes(signature)) throw new Error('Gate 27 R2 asset package does not have a valid ZIP signature.');
  }
}

async function assertUnauthenticatedRoutesDenied(orderId) {
  const paths = [
    `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.json`,
    `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`,
    `/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`
  ];
  const statuses = [];
  for (const path of paths) {
    const response = await fetch(`${WORKER_URL}${path}`, { method: 'GET', redirect: 'manual' });
    const text = await response.text();
    if (response.status !== 401) throw new Error(`Gate 27 unauthenticated artifact route did not deny access with HTTP 401 (received ${response.status}).`);
    let body = null;
    try { body = JSON.parse(text); } catch {}
    if (body?.error !== 'Authentication required') throw new Error('Gate 27 unauthenticated artifact denial leaked or changed its privacy-safe response contract.');
    if (text.includes(orderId) || /orders\//i.test(text)) throw new Error('Gate 27 unauthenticated artifact denial leaked private artifact identity.');
    statuses.push(response.status);
  }
  return statuses;
}

assertPrerequisites();
const purchase = purchaseReceipt();
const { row, blueprint, evidence } = canonicalD1(purchase.order_id);
if (blueprint?.orderId !== purchase.order_id || blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.status !== 'ready') {
  throw new Error('Gate 27 canonical D1 Blueprint identity is not the verified ready paid Blueprint.');
}
const artifacts = expectedArtifacts(purchase.order_id, evidence);

const devUrlOutput = runWrangler(['r2', 'bucket', 'dev-url', 'get', R2_BUCKET, '--env', 'acceptance'], purchase.order_id);
assertDevUrlDisabled(devUrlOutput);
const domainOutput = runWrangler(['r2', 'bucket', 'domain', 'list', R2_BUCKET, '--env', 'acceptance'], purchase.order_id);
const configuredCustomDomains = assertNoEnabledCustomDomain(domainOutput);
const unauthenticatedStatuses = await assertUnauthenticatedRoutesDenied(purchase.order_id);

mkdirSync(TEMP_DIR, { recursive: true });
const results = {};
try {
  for (const [kind, artifact] of Object.entries(artifacts)) {
    const first = downloadArtifact(kind, artifact.key, 1, purchase.order_id);
    const second = downloadArtifact(kind, artifact.key, 2, purchase.order_id);
    assertArtifactIdentity(kind, first, second, artifact.hash, kind === 'json' ? row.blueprint_json : null);
    results[kind] = { sha256: first.sha256, size_bytes: first.size, repeat_download_match: true };
  }
} finally {
  rmSync(TEMP_DIR, { recursive: true, force: true });
}

const receipt = {
  schema_version: 'roadmap-gate27-private-r2-artifacts-receipt-v1',
  verified_at: new Date().toISOString(),
  bucket: R2_BUCKET,
  environment: 'acceptance',
  canonical: {
    order_id_sha256: sha256(Buffer.from(purchase.order_id, 'utf8')),
    blueprint_id_sha256: sha256(Buffer.from(String(blueprint.blueprintId || ''), 'utf8')),
    schema_version: blueprint.schemaVersion,
    status: blueprint.status
  },
  privacy: {
    r2_dev_disabled: true,
    enabled_custom_domains: 0,
    configured_custom_domain_records: configuredCustomDomains,
    unauthenticated_artifact_routes_denied: unauthenticatedStatuses.length,
    denial_status: 401
  },
  artifacts: results,
  exact_generation_receipt_hashes_verified: true,
  canonical_json_matches_d1_exactly: true,
  repeat_downloads_verified: 6,
  read_only: true,
  mutation_performed: false,
  r2_objects_written: false,
  acceptance_worker_deployed: false,
  production_deployed: false,
  secret_values_recorded: false,
  decision: 'PASS'
};

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  bucket_private: true,
  r2_dev_disabled: true,
  enabled_custom_domains: 0,
  unauthenticated_routes_denied: unauthenticatedStatuses.length,
  json_sha256: results.json.sha256,
  pdf_sha256: results.pdf.sha256,
  zip_sha256: results.zip.sha256,
  repeat_downloads_verified: 6,
  receipt: '.roadmap-autopilot/gate27-private-r2-artifacts-receipt.json',
  read_only: true,
  mutation_performed: false,
  production_deployed: false,
  secret_values_recorded: false
}));
