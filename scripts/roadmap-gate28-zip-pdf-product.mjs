#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const GATE20_RECEIPT_PATH = join(STATE_DIR, 'gate20-purchase.json');
const GATE27_RECEIPT_PATH = join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate28-zip-pdf-product-receipt.json');
const TEMP_DIR = join(STATE_DIR, 'gate28-artifacts');
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const ROOT_PREFIX = 'ghosttown-launch-blueprint/';

const EXPECTED_FILES = [
  'README.md',
  'blueprint.json',
  'launch-blueprint.pdf',
  'executive-summary.md',
  'offer-and-pricing.md',
  'positioning.md',
  'media-and-distribution-network.csv',
  'outreach-scripts.md',
  'helpful-posts.md',
  'landing-page-copy.md',
  'launch-site-config.json',
  'thirty-day-calendar.csv',
  'weekly-milestones.md',
  'metrics-template.csv',
  'decision-rules.md',
  'sources.csv',
];

// Gate 28 verifies the actual v2.1 premium-document contract already certified
// by Q3. The older v2.0 renderer used different customer-facing headings; those
// strings are not the acceptance contract for a v2.1 paid artifact.
const PDF_PRIORITY_SECTIONS = [
  '48-Hour Launch Card',
  'First Customer',
  'First Offer',
  'First Revenue Path',
  'Customer Access Network',
  'Today: Day 1',
];

const PDF_SUPPORTING_SECTIONS = [
  'Starting-State and Evidence Audit',
  'Manual Fulfillment and Economics',
  'Prepared Content and Conversations',
  'Launch Site',
  'Full 30-Day Plan',
  'Behavioral Evidence Hierarchy',
  'Adaptive Checkpoint Reviews',
  'Sources and Receipt',
];

const PDF_DECISION_BLOCKS = [
  'DECISION',
  'WHY',
  'EVIDENCE',
  'READY-TO-USE ASSETS',
  'MEASUREMENT',
  'ADAPTATION RULE',
];

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
if (!wranglerBin) throw new Error('Gate 28 could not resolve the installed Wrangler CLI entrypoint.');
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

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

function runWrangler(args, orderId = '') {
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Gate 28 Wrangler command failed (${result.status ?? 1}).\n${redact(result.stderr || result.stdout || '', orderId)}`.trim());
  }
}

function assertPrerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 28 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  if (state?.gates?.['27']?.status !== 'PASS') throw new Error('Gate 28 requires Gate 27 to be PASS.');
  if (!existsSync(GATE20_RECEIPT_PATH) || !existsSync(GATE27_RECEIPT_PATH)) throw new Error('Gate 28 requires Gate 20 and Gate 27 receipts.');

  const amendment = readFileSync(join(ROOT, 'docs', 'blueprint-change-records', 'GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_5_CHANGE_RECORD.md'), 'utf8');
  const executionHome = readFileSync(join(ROOT, 'src', 'components', 'LaunchBlueprintExecutionHomeV21.tsx'), 'utf8');
  const offer = readFileSync(join(ROOT, 'src', 'lib', 'ghosttownOffer.ts'), 'utf8');
  const assetSource = readFileSync(join(ROOT, 'src', 'api', 'blueprintAssets.ts'), 'utf8');
  const pdfSource = readFileSync(join(ROOT, 'src', 'api', 'blueprintPdfV21.ts'), 'utf8');
  const documentModelSource = readFileSync(join(ROOT, 'src', 'api', 'blueprintDocumentModel.ts'), 'utf8');
  for (const token of [
    'The 30-Day Calendar is the primary execution interface',
    'The PDF and asset bundle remain durable exports and recovery artifacts.',
    'Your primary execution interface',
    'Asset Library',
    "recordCommercialEvent('daily_packet_opened'",
    "recordCommercialEvent('day_completed'",
    'Guided 30-day execution calendar that opens each day’s exact actions, prepared assets, evidence prompts, and decision context',
  ]) {
    if (!`${amendment}\n${executionHome}\n${offer}`.includes(token)) throw new Error(`Gate 28 v2.1.5 execution-home source contract is missing: ${token}`);
  }
  for (const filename of EXPECTED_FILES) if (!assetSource.includes(`"${filename}"`) && !assetSource.includes(`'${filename}'`)) throw new Error(`Gate 28 source asset manifest is missing ${filename}.`);
  for (const token of ['renderLaunchBlueprintPdfV21', 'composeBlueprintDocumentModel', 'renderBlueprintDocumentModelPdf']) {
    if (!pdfSource.includes(token)) throw new Error(`Gate 28 v2.1 PDF renderer source guard is missing ${token}.`);
  }
  for (const token of [
    "'48_hour_launch_card'", "'first_customer'", "'first_offer'", "'first_revenue'", "'customer_access_network'", "'today'",
    "title: 'Full 30-Day Plan'", "title: 'Sources and Receipt'", 'validateBlueprintDocumentAgainstCanonical'
  ]) {
    if (!documentModelSource.includes(token)) throw new Error(`Gate 28 v2.1 document-model source guard is missing ${token}.`);
  }
}

function loadReceipts() {
  const purchase = JSON.parse(readFileSync(GATE20_RECEIPT_PATH, 'utf8'));
  const gate27 = JSON.parse(readFileSync(GATE27_RECEIPT_PATH, 'utf8'));
  if (purchase?.schema_version !== 'roadmap-gate20-purchase-receipt-v1' || purchase?.stripe_mode !== 'test' || typeof purchase?.order_id !== 'string') {
    throw new Error('Gate 28 found an invalid Gate 20 purchase receipt.');
  }
  if (gate27?.schema_version !== 'roadmap-gate27-private-r2-artifacts-receipt-v1' || gate27?.decision !== 'PASS') {
    throw new Error('Gate 28 found an invalid Gate 27 receipt.');
  }
  for (const kind of ['json', 'pdf', 'zip']) {
    if (!/^[a-f0-9]{64}$/i.test(String(gate27?.artifacts?.[kind]?.sha256 || ''))) throw new Error(`Gate 28 Gate 27 receipt is missing ${kind} SHA-256.`);
  }
  return { purchase, gate27 };
}

function downloadR2(orderId, key, filename) {
  const path = join(TEMP_DIR, filename);
  rmSync(path, { force: true });
  runWrangler(['r2', 'object', 'get', `${R2_BUCKET}/${key}`, '--file', path, '--remote', '--env', 'acceptance'], orderId);
  if (!existsSync(path) || statSync(path).size <= 0) throw new Error(`Gate 28 downloaded an empty ${filename}.`);
  return readFileSync(path);
}

function parseStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true);
    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.byteLength) throw new Error('Gate 28 ZIP entry exceeds archive bounds.');
    if (compression !== 0) throw new Error('Gate 28 expected the canonical stored ZIP format but found compressed content.');
    if (compressedSize !== uncompressedSize) throw new Error('Gate 28 ZIP stored-entry sizes are inconsistent.');
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (!(flags & 0x800)) throw new Error(`Gate 28 ZIP entry ${name} is not marked UTF-8.`);
    if (entries.has(name)) throw new Error(`Gate 28 ZIP contains duplicate entry ${name}.`);
    entries.set(name, bytes.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  if (!entries.size) throw new Error('Gate 28 could not parse any local ZIP entries.');
  return entries;
}

function textEntry(entries, name) {
  const bytes = entries.get(`${ROOT_PREFIX}${name}`);
  if (!bytes) throw new Error(`Gate 28 ZIP is missing ${name}.`);
  return new TextDecoder().decode(bytes);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('Gate 28 found an unterminated quoted CSV cell.');
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(current => current.some(value => value.length));
}

function assertCsv(entries, name, minimumRows, exactRows = null) {
  const rows = parseCsv(textEntry(entries, name));
  if (rows.length < minimumRows) throw new Error(`Gate 28 ${name} has too few rows.`);
  if (exactRows !== null && rows.length !== exactRows) throw new Error(`Gate 28 ${name} expected ${exactRows} rows including header; found ${rows.length}.`);
  const width = rows[0].length;
  if (width < 2 || rows.some(row => row.length !== width)) throw new Error(`Gate 28 ${name} has inconsistent CSV columns.`);
  return { rows: rows.length, columns: width };
}

function assertTextQuality(entries) {
  const required = {
    'README.md': ['Canonical source hash:', 'Every Factory slice must verify this exact hash'],
    'executive-summary.md': ['48-Hour Launch Card', 'Starting-State and Evidence Audit', 'Canonical contract receipt'],
    'offer-and-pricing.md': ['Business-Model Execution Lane', 'First-Revenue Path', 'Manual Fulfillment and Economics', 'Founding Customer Pilot Brief'],
    'weekly-milestones.md': ['Adaptive Evidence Checkpoints', 'Day 7:', 'Day 14:', 'Day 21:', 'Day 30:'],
    'decision-rules.md': ['Behavioral Evidence Hierarchy', 'Adaptive Evidence Checkpoints'],
  };
  for (const [name, tokens] of Object.entries(required)) {
    const text = textEntry(entries, name);
    for (const token of tokens) if (!text.includes(token)) throw new Error(`Gate 28 ${name} is missing v2.1 enrichment: ${token}`);
  }

  for (const name of ['outreach-scripts.md', 'helpful-posts.md', 'landing-page-copy.md', 'positioning.md']) {
    const text = textEntry(entries, name).trim();
    if (text.length < 120 || text.split(/\s+/).length < 20) throw new Error(`Gate 28 ${name} is not usable customer text.`);
  }

  const launchSite = textEntry(entries, 'launch-site-config.json');
  try { JSON.parse(launchSite); } catch { throw new Error('Gate 28 launch-site-config.json is invalid JSON.'); }
}

function assertNoSensitiveLeak(entries) {
  const forbidden = [
    /\bsk_(?:live|test)_[A-Za-z0-9_-]{8,}\b/i,
    /\brk_(?:live|test)_[A-Za-z0-9_-]{8,}\b/i,
    /\bwhsec_[A-Za-z0-9_-]{8,}\b/i,
    /-----BEGIN [^-]+PRIVATE KEY-----/i,
    /\bAIza[0-9A-Za-z_-]{20,}\b/,
    /"?(?:rawProviderPayload|providerRawPayload|ownerGoogleResult|promptBody|responseBody)"?\s*:/i,
  ];
  for (const [name, bytes] of entries) {
    if (name.endsWith('.pdf')) continue;
    const text = new TextDecoder().decode(bytes);
    if (forbidden.some(pattern => pattern.test(text))) throw new Error(`Gate 28 found secret/raw-provider leakage in ${name}.`);
  }
}

function normalizedPdfText(bytes) {
  return new TextDecoder('latin1').decode(bytes)
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function assertPdf(pdfBytes, blueprint) {
  const text = normalizedPdfText(pdfBytes);
  if (!text.startsWith('%PDF-1.4')) throw new Error('Gate 28 PDF signature/version is invalid.');
  for (const section of [...PDF_PRIORITY_SECTIONS, ...PDF_SUPPORTING_SECTIONS]) {
    if (!text.includes(section)) throw new Error(`Gate 28 v2.1 PDF is missing required section: ${section}`);
  }
  for (const block of PDF_DECISION_BLOCKS) {
    if (!text.includes(block)) throw new Error(`Gate 28 v2.1 PDF is missing required decision block: ${block}`);
  }
  for (let day = 1; day <= 30; day += 1) if (!text.includes(`Day ${day}:`)) throw new Error(`Gate 28 PDF is missing daily action Day ${day}.`);

  const researchDates = [...new Set((blueprint?.customerAccessPack?.channels || [])
    .map(channel => String(channel?.researchDate || '').trim())
    .filter(value => /^20\d{2}-\d{2}-\d{2}$/.test(value)))];
  if (!researchDates.length || !researchDates.some(value => text.includes(value))) {
    throw new Error('Gate 28 PDF does not expose any canonical customer-access research date.');
  }

  if (!Array.isArray(blueprint?.sources) || blueprint.sources.length < 1) throw new Error('Gate 28 canonical Blueprint contains no research sources.');
  const sourceUrls = blueprint.sources.map(source => String(source?.url || '').trim()).filter(Boolean);
  if (!sourceUrls.length || !sourceUrls.some(value => text.includes(value))) {
    throw new Error('Gate 28 PDF does not expose any canonical public research source URL.');
  }

  const pageCount = text.match(/\/Type \/Page\b/g)?.length || 0;
  const streams = [...text.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(match => match[1]);
  if (pageCount < 10 || streams.length !== pageCount) throw new Error(`Gate 28 PDF page/content-stream structure is inconsistent (${pageCount} pages, ${streams.length} streams).`);
  if (streams.some(stream => !/\)\s*Tj\b/.test(stream))) throw new Error('Gate 28 PDF contains a blank page/content stream.');
  return {
    page_count: pageCount,
    content_streams: streams.length,
    priority_sections: PDF_PRIORITY_SECTIONS.length,
    supporting_sections: PDF_SUPPORTING_SECTIONS.length,
    decision_blocks: PDF_DECISION_BLOCKS.length,
    canonical_research_date_matches: researchDates.filter(value => text.includes(value)).length,
    canonical_source_url_matches: sourceUrls.filter(value => text.includes(value)).length,
  };
}

assertPrerequisites();
const { purchase, gate27 } = loadReceipts();
const orderId = purchase.order_id;
mkdirSync(TEMP_DIR, { recursive: true });

let receipt;
try {
  const zipKey = `orders/${orderId}/ghosttown-launch-blueprint-v2-assets.zip`;
  const pdfKey = `orders/${orderId}/ghosttown-launch-blueprint-v2.pdf`;
  const zipBytes = downloadR2(orderId, zipKey, 'assets.zip');
  const pdfBytes = downloadR2(orderId, pdfKey, 'blueprint.pdf');
  if (sha256(zipBytes) !== gate27.artifacts.zip.sha256) throw new Error('Gate 28 ZIP bytes no longer match Gate 27 integrity evidence.');
  if (sha256(pdfBytes) !== gate27.artifacts.pdf.sha256) throw new Error('Gate 28 PDF bytes no longer match Gate 27 integrity evidence.');

  const entries = parseStoredZip(zipBytes);
  const names = [...entries.keys()].sort();
  const expectedNames = EXPECTED_FILES.map(name => `${ROOT_PREFIX}${name}`).sort();
  if (names.length !== 16 || names.join('\n') !== expectedNames.join('\n')) {
    const missing = expectedNames.filter(name => !entries.has(name));
    const extra = names.filter(name => !expectedNames.includes(name));
    throw new Error(`Gate 28 ZIP file manifest mismatch: count=${names.length}, missing=${missing.join(',') || 'none'}, extra=${extra.join(',') || 'none'}.`);
  }

  const blueprintBytes = entries.get(`${ROOT_PREFIX}blueprint.json`);
  const bundledPdf = entries.get(`${ROOT_PREFIX}launch-blueprint.pdf`);
  if (!blueprintBytes || sha256(blueprintBytes) !== gate27.artifacts.json.sha256) throw new Error('Gate 28 ZIP blueprint.json does not exactly match the canonical Blueprint verified at Gate 27.');
  if (!bundledPdf || sha256(bundledPdf) !== gate27.artifacts.pdf.sha256 || !bundledPdf.equals(pdfBytes)) throw new Error('Gate 28 ZIP launch-blueprint.pdf does not exactly match the standalone canonical PDF.');
  let blueprint;
  try { blueprint = JSON.parse(new TextDecoder().decode(blueprintBytes)); } catch { throw new Error('Gate 28 bundled blueprint.json is invalid JSON.'); }
  if (blueprint?.blueprintVersion !== '2.1' || blueprint?.schemaVersion !== 'ghosttown-launch-blueprint-v2' || blueprint?.status !== 'ready') throw new Error('Gate 28 bundled Blueprint identity is not the ready v2.1 paid Blueprint.');

  assertTextQuality(entries);
  const csv = {
    media_distribution: assertCsv(entries, 'media-and-distribution-network.csv', 2),
    thirty_day_calendar: assertCsv(entries, 'thirty-day-calendar.csv', 31, 31),
    metrics: assertCsv(entries, 'metrics-template.csv', 2),
    sources: assertCsv(entries, 'sources.csv', 2),
  };
  assertNoSensitiveLeak(entries);
  const pdf = assertPdf(pdfBytes, blueprint);

  receipt = {
    schema_version: 'roadmap-gate28-zip-pdf-product-receipt-v1',
    verified_at: new Date().toISOString(),
    environment: 'acceptance',
    product_amendment: '2.1.5',
    canonical: {
      order_id_sha256: sha256(Buffer.from(orderId, 'utf8')),
      blueprint_id_sha256: sha256(Buffer.from(String(blueprint.blueprintId || ''), 'utf8')),
      blueprint_version: blueprint.blueprintVersion,
      schema_version: blueprint.schemaVersion,
    },
    execution_home: {
      calendar_primary_contract_verified: true,
      contextual_daily_assets_required: true,
      evidence_and_decision_context_required: true,
      independent_asset_access_required: true,
      exports_secondary_compatibility_surface: true,
    },
    zip: {
      sha256: sha256(zipBytes),
      file_count: names.length,
      exact_manifest_verified: true,
      canonical_json_match: true,
      bundled_pdf_match: true,
      v21_enrichment_verified: true,
      csv,
      usable_text_verified: true,
      sensitive_leak_scan_passed: true,
    },
    pdf: {
      sha256: sha256(pdfBytes),
      required_sections_verified: PDF_PRIORITY_SECTIONS.length + PDF_SUPPORTING_SECTIONS.length,
      decision_blocks_verified: PDF_DECISION_BLOCKS.length,
      daily_actions_verified: 30,
      research_date_context_verified: true,
      source_link_context_verified: true,
      no_blank_pages: true,
      structural_layout_guard_verified: true,
      ...pdf,
    },
    read_only: true,
    mutation_performed: false,
    r2_objects_written: false,
    acceptance_worker_deployed: false,
    production_deployed: false,
    secret_values_recorded: false,
    decision: 'PASS',
  };
} finally {
  rmSync(TEMP_DIR, { recursive: true, force: true });
}

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  product_amendment: '2.1.5',
  calendar_primary_contract_verified: true,
  zip_file_count: receipt.zip.file_count,
  zip_manifest_verified: receipt.zip.exact_manifest_verified,
  canonical_json_match: receipt.zip.canonical_json_match,
  bundled_pdf_match: receipt.zip.bundled_pdf_match,
  pdf_page_count: receipt.pdf.page_count,
  pdf_daily_actions_verified: receipt.pdf.daily_actions_verified,
  receipt: '.roadmap-autopilot/gate28-zip-pdf-product-receipt.json',
  read_only: true,
  mutation_performed: false,
  production_deployed: false,
  secret_values_recorded: false,
}));