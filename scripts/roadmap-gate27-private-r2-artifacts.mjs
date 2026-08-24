#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { withAcceptanceDataBindings, withAcceptanceR2Binding, acceptanceR2BucketName as R2_BUCKET } from './roadmap-r2-binding-bridge.mjs';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE26_RECEIPT_PATH = join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const EXPECTED_SCHEMA = 'ghosttown-launch-blueprint-v2';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 27 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function stripAnsi(value) { return String(value ?? '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, ''); }
function redact(value, orderId = '') {
  let text = String(value ?? '');
  if (orderId) text = text.replaceAll(orderId, '[ORDER_ID_REDACTED]');
  return text.replace(/\b(sk_(?:live|test)_[A-Za-z0-9_-]+|rk_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g, '[SECRET_REDACTED]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[PRIVATE_KEY_REDACTED]');
}
function runWrangler(args, orderId = '') {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`Gate 27 Wrangler command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', orderId)}`.trim());
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}
function parseLooseJson(text) {
  const clean = stripAnsi(text).trim();
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  for (const start of [clean.indexOf('['), clean.indexOf('{')].filter(i => i >= 0).sort((a,b) => a-b)) {
    for (let end = clean.length; end > start; end -= 1) {
      if (!['}', ']'].includes(clean[end - 1])) continue;
      try { return JSON.parse(clean.slice(start, end)); } catch {}
    }
  }
  return null;
}
function findObjectWithKey(value, key) {
  if (Array.isArray(value)) { for (const item of value) { const found = findObjectWithKey(item, key); if (found) return found; } return null; }
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, key)) return value;
  for (const child of Object.values(value)) { const found = findObjectWithKey(child, key); if (found) return found; }
  return null;
}

function requireSourceTokens(source, label, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Gate 27 ${label} source contract is missing ${token}.`);
  }
}

function assertPrerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 27 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['26']?.status !== 'PASS') throw new Error('Gate 27 requires Gate 26 to be PASS.');
  if (!existsSync(GATE20_RECEIPT_PATH) || !existsSync(GATE26_RECEIPT_PATH)) throw new Error('Gate 27 requires Gate 20 and Gate 26 receipts.');
  const gate26 = JSON.parse(readFileSync(GATE26_RECEIPT_PATH, 'utf8'));
  if (gate26?.schema_version !== 'roadmap-gate26-canonical-d1-artifacts-receipt-v1' || gate26?.decision !== 'PASS') throw new Error('Gate 27 found an invalid Gate 26 receipt.');

  const keyStore = readFileSync(join(ROOT, 'src', 'api', 'blueprintStore.ts'), 'utf8');
  const storeV21 = readFileSync(join(ROOT, 'src', 'api', 'blueprintStoreV21.ts'), 'utf8');
  const api = readFileSync(join(ROOT, 'src', 'api', 'blueprintApi.ts'), 'utf8');
  const route = readFileSync(join(ROOT, 'src', 'api', 'index.ts'), 'utf8');
  const bridge = readFileSync(join(ROOT, 'scripts', 'roadmap-r2-binding-bridge.mjs'), 'utf8');

  requireSourceTokens(keyStore, 'artifact key', [
    'ghosttown-launch-blueprint-v2.pdf',
    'ghosttown-launch-blueprint-v2.json',
    'ghosttown-launch-blueprint-v2-assets.zip',
    'blueprintPdfKey',
    'blueprintJsonKey',
    'blueprintAssetsKey'
  ]);
  requireSourceTokens(storeV21, 'v2.1 persistence', [
    "from './blueprintStore'",
    'blueprintPdfKey(order.orderId)',
    'blueprintJsonKey(order.orderId)',
    'blueprintAssetsKey(order.orderId)',
    'customMetadata',
    'env.BLUEPRINTS.put'
  ]);
  requireSourceTokens(`${api}\n${route}`, 'delivery route', [
    'handleLaunchBlueprintJson',
    'handleLaunchBlueprintPdf',
    'handleLaunchBlueprintAssets',
    'private, no-store'
  ]);
  requireSourceTokens(bridge, 'remote binding', [
    'remote = true',
    'withAcceptanceDataBindings',
    'withAcceptanceR2Binding'
  ]);

  const gate27Source = readFileSync(new URL(import.meta.url), 'utf8');
  const forbiddenDirectD1Invocation = ["'d1'", "'execute'"].join(',');
  if (gate27Source.includes(forbiddenDirectD1Invocation)) throw new Error('Gate 27 must not use direct Wrangler D1 execute for canonical acceptance evidence.');
}

function purchaseReceipt() {
  const receipt = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  if (receipt?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || receipt?.stripe_mode !== 'test' || typeof receipt?.order_id !== 'string' || !/^gtt_[A-Za-z0-9_-]+$/.test(receipt.order_id)) {
    throw new Error('Gate 27 found an invalid Gate 20 purchase receipt.');
  }
  return receipt;
}

async function canonicalD1(orderId) {
  const snapshot = await withAcceptanceDataBindings(client => client.snapshot(orderId));
  if (!snapshot?.blueprintJson || !snapshot?.evidence) throw new Error('Gate 27 could not read canonical D1 Blueprint/integrity receipt through the remote binding.');
  const blueprint = JSON.parse(snapshot.blueprintJson);
  const evidence = snapshot.evidence;
  if (!evidence?.artifactKeys || !evidence?.hashes) throw new Error('Gate 27 D1 generation integrity receipt is incomplete.');
  return { row: { blueprint_json: snapshot.blueprintJson }, blueprint, evidence };
}

function expectedArtifacts(orderId, evidence) {
  const expected = {
    json: { key: `orders/${orderId}/ghosttown-launch-blueprint-v2.json`, hash: evidence.hashes.canonicalBlueprintSha256 },
    pdf: { key: `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`, hash: evidence.hashes.pdfSha256 },
    zip: { key: `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`, hash: evidence.hashes.zipSha256 }
  };
  if (evidence.artifactKeys.json !== expected.json.key || evidence.artifactKeys.pdf !== expected.pdf.key || evidence.artifactKeys.zip !== expected.zip.key) throw new Error('Gate 27 persisted artifact keys drifted.');
  for (const artifact of Object.values(expected)) if (!/^[a-f0-9]{64}$/i.test(String(artifact.hash || ''))) throw new Error('Gate 27 persisted artifact receipt has invalid SHA-256.');
  return expected;
}

function findEnabledBooleans(value, found = []) {
  if (Array.isArray(value)) for (const item of value) findEnabledBooleans(item, found);
  else if (value && typeof value === 'object') { if (typeof value.enabled === 'boolean') found.push(value.enabled); for (const child of Object.values(value)) findEnabledBooleans(child, found); }
  return found;
}
function assertDevUrlDisabled(output) {
  const flags = findEnabledBooleans(parseLooseJson(output));
  if (flags.includes(true)) throw new Error('Gate 27 acceptance R2 bucket has public r2.dev access enabled.');
  if (flags.includes(false)) return;
  const text = stripAnsi(output).toLowerCase();
  if (/\bdisabled\b|\bnot enabled\b|\bdisallowed\b|enabled\s*[:=]\s*false/i.test(text)) return;
  throw new Error('Gate 27 could not prove acceptance R2 r2.dev access is disabled.');
}
function domainRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.domains)) return value.domains;
  const nested = findObjectWithKey(value, 'domains');
  return Array.isArray(nested?.domains) ? nested.domains : null;
}
function assertNoEnabledCustomDomain(output) {
  const rows = domainRows(parseLooseJson(output));
  if (rows) {
    if (rows.some(row => row && typeof row === 'object' && row.enabled === true)) throw new Error('Gate 27 acceptance R2 bucket has an enabled custom public domain.');
    if (rows.some(row => row && typeof row === 'object' && typeof row.enabled !== 'boolean')) throw new Error('Gate 27 could not determine custom-domain enabled state.');
    return rows.length;
  }
  const text = stripAnsi(output).trim();
  if (!text || /no custom domains|no domains|\[\s*\]/i.test(text)) return 0;
  throw new Error('Gate 27 could not prove acceptance R2 has no enabled custom domain.');
}

function assertArtifactIdentity(kind, first, second, expectedHash, d1Json = null) {
  const firstHash = sha256(first); const secondHash = sha256(second);
  if (firstHash !== secondHash || first.byteLength !== second.byteLength || !first.equals(second)) throw new Error(`Gate 27 ${kind.toUpperCase()} repeat Worker-binding read changed bytes.`);
  if (firstHash !== expectedHash) throw new Error(`Gate 27 ${kind.toUpperCase()} Worker-binding bytes do not match D1 generation receipt: expected=${expectedHash}, actual=${firstHash}.`);
  if (kind === 'json') {
    if (first.toString('utf8') !== d1Json) throw new Error('Gate 27 Worker-binding JSON does not exactly match canonical D1 blueprint_json.');
    const parsed = JSON.parse(first.toString('utf8'));
    if (parsed?.schemaVersion !== EXPECTED_SCHEMA) throw new Error('Gate 27 canonical JSON schema drifted.');
  } else if (kind === 'pdf') {
    if (first.subarray(0,5).toString('ascii') !== '%PDF-') throw new Error('Gate 27 Worker-binding PDF signature is invalid.');
  } else if (kind === 'zip') {
    const signature = first.byteLength >= 4 ? first.readUInt32LE(0) : 0;
    if (![0x04034b50,0x06054b50,0x08074b50].includes(signature)) throw new Error('Gate 27 Worker-binding ZIP signature is invalid.');
  }
  return { sha256: firstHash, size: first.byteLength };
}

async function assertUnauthenticatedRoutesDenied(orderId) {
  const paths = [`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.json`,`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint.pdf`,`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint-assets.zip`];
  const statuses = [];
  for (const path of paths) {
    const response = await fetch(`${WORKER_URL}${path}`, { method:'GET', redirect:'manual' });
    const text = await response.text();
    if (response.status !== 401) throw new Error(`Gate 27 unauthenticated artifact route expected 401, received ${response.status}.`);
    let body = null; try { body = JSON.parse(text); } catch {}
    if (body?.error !== 'Authentication required' || text.includes(orderId) || /orders\//i.test(text)) throw new Error('Gate 27 unauthenticated denial contract drifted or leaked artifact identity.');
    statuses.push(response.status);
  }
  return statuses;
}

assertPrerequisites();
const purchase = purchaseReceipt();
const { row, blueprint, evidence } = await canonicalD1(purchase.order_id);
if (blueprint?.orderId !== purchase.order_id || blueprint?.schemaVersion !== EXPECTED_SCHEMA || blueprint?.status !== 'ready') throw new Error('Gate 27 canonical D1 Blueprint is not the ready paid v2.1 artifact.');
const artifacts = expectedArtifacts(purchase.order_id, evidence);
assertDevUrlDisabled(runWrangler(['r2','bucket','dev-url','get',R2_BUCKET,'--env','acceptance'], purchase.order_id));
const configuredCustomDomains = assertNoEnabledCustomDomain(runWrangler(['r2','bucket','domain','list',R2_BUCKET,'--env','acceptance'], purchase.order_id));
const unauthenticatedStatuses = await assertUnauthenticatedRoutesDenied(purchase.order_id);

const results = await withAcceptanceR2Binding(async r2 => {
  const result = {};
  for (const kind of ['json','pdf','zip']) {
    const first = await r2.get(artifacts[kind].key);
    const second = await r2.get(artifacts[kind].key);
    result[kind] = assertArtifactIdentity(kind, first, second, artifacts[kind].hash, kind === 'json' ? row.blueprint_json : null);
  }
  return result;
});

const receipt = {
  schema_version: 'roadmap-gate27-private-r2-artifacts-receipt-v1',
  verified_at: new Date().toISOString(),
  bucket: R2_BUCKET,
  environment: 'acceptance',
  canonical: {
    order_id_sha256: sha256(Buffer.from(purchase.order_id, 'utf8')),
    blueprint_id_sha256: sha256(Buffer.from(String(blueprint.blueprintId || ''), 'utf8')),
    schema_version: blueprint.schemaVersion,
    blueprint_version: blueprint.blueprintVersion
  },
  privacy: {
    r2_dev_disabled: true,
    enabled_custom_domains: configuredCustomDomains,
    unauthenticated_routes_denied: unauthenticatedStatuses.length,
    cache_control_private_no_store_source_verified: true
  },
  artifacts: {
    json: { key_sha256: sha256(Buffer.from(artifacts.json.key)), sha256: results.json.sha256, bytes: results.json.size, repeat_read_verified: true },
    pdf: { key_sha256: sha256(Buffer.from(artifacts.pdf.key)), sha256: results.pdf.sha256, bytes: results.pdf.size, repeat_read_verified: true },
    zip: { key_sha256: sha256(Buffer.from(artifacts.zip.key)), sha256: results.zip.sha256, bytes: results.zip.size, repeat_read_verified: true }
  },
  d1_read_path: 'workers_remote_binding',
  r2_read_path: 'workers_remote_binding',
  customer_delivery_storage_path_verified: true,
  exact_byte_integrity_receipt_verified: true,
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
console.log(JSON.stringify({ ok:true, decision:'PASS', bucket_private:true, d1_read_path:'workers_remote_binding', r2_read_path:'workers_remote_binding', unauthenticated_routes_denied:unauthenticatedStatuses.length, json_sha256:results.json.sha256, pdf_sha256:results.pdf.sha256, zip_sha256:results.zip.sha256, receipt:'.roadmap-autopilot/gate27-private-r2-artifacts-receipt.json', production_deployed:false, secret_values_recorded:false }));
