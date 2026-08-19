#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const QUALITY_STATE_PATH = join(STATE_DIR, 'commercial-quality-state.json');
const RECEIPT_PATH = join(STATE_DIR, 'gate35-ghosttown-acceptance-receipt.json');
const EVIDENCE_CHAIN_PATH = join(ROOT, 'docs', 'blueprint-evidence', 'ghosttown-launch-blueprint-v2.1-evidence-chain.json');
const EXECUTION_INTELLIGENCE_EVIDENCE_PATH = join(ROOT, 'docs', 'blueprint-evidence', 'ghosttown-launch-blueprint-v2.1.6-execution-intelligence-evidence.json');
const CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const PAGES_URL = 'https://ghosttown-acceptance.pages.dev';
const ACCOUNT_ID = 'a5cf89bcebf34090a11f016c07967458';
const D1_NAME = 'ghosttowntest-blueprints-acceptance';
const D1_ID = '9863d883-3c31-4268-9a98-8392fa3b9f8f';
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const KV_ID = '849e13521d454361aea286b8e1a5e4c7';
const KV_TITLE = 'ghosttown-acceptance';
const WORKFLOW_NAME = 'ghosttown-launch-blueprint-acceptance';
const WORKFLOW_SCRIPT = 'lit-ghost-town-api-acceptance';

const WRANGLER_PACKAGE_DIR = join(ROOT, 'node_modules', 'wrangler');
const wranglerPackage = JSON.parse(readFileSync(join(WRANGLER_PACKAGE_DIR, 'package.json'), 'utf8'));
const wranglerBin = typeof wranglerPackage.bin === 'string' ? wranglerPackage.bin : wranglerPackage.bin?.wrangler;
const WRANGLER_CLI = resolve(WRANGLER_PACKAGE_DIR, wranglerBin);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function now() {
  return new Date().toISOString();
}

function hashFile(path, label) {
  if (!existsSync(path)) return { path, label, sha256: null };
  return { path: path.replace(/\\/g, '/'), label, sha256: sha256(readFileSync(path)) };
}

function secretNames() {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const fromState = Array.isArray(state?.runtime?.acceptance_secret_names) ? state.runtime.acceptance_secret_names : [];
  const names = new Set(fromState);
  const result = spawnSync(process.execPath, [WRANGLER_CLI, 'secret', 'list', '--env', 'acceptance', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 16 * 1024 * 1024
  });
  if ((result.status ?? 1) === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      const list = Array.isArray(parsed) ? parsed : parsed?.secrets;
      if (Array.isArray(list)) for (const item of list) if (typeof item?.name === 'string') names.add(item.name);
    } catch {}
  }
  return [...names].sort();
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 35 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const gates = state?.gates || {};
  const failed = Object.keys(gates).filter(id => gates[id]?.status !== 'PASS').map(id => Number(id)).sort((a, b) => a - b);
  if (failed.length) {
    throw new Error(`Gate 35 fails closed: roadmap gates ${failed.join(', ')} are not PASS.`);
  }
  if (gates['35']?.status === 'PASS') {
    throw new Error('Gate 35 is already PASS; the authoritative receipt already exists and will not be overwritten.');
  }
  if (existsSync(RECEIPT_PATH)) {
    const prior = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
    if (prior?.decision === 'PASS' && prior?.gates_summary?.total_passed === 35) {
      console.log(JSON.stringify({
        ok: true,
        decision: 'PASS',
        replayed: false,
        reason: 'authoritative Gate 35 receipt already generated and all gates remain PASS',
        receipt: '.roadmap-autopilot/gate35-ghosttown-acceptance-receipt.json',
        production_deployed: false,
        secret_values_recorded: false
      }));
      process.exit(0);
    }
  }
  let quality = null;
  if (existsSync(QUALITY_STATE_PATH)) {
    quality = JSON.parse(readFileSync(QUALITY_STATE_PATH, 'utf8'));
  }
  const qualityGates = quality?.quality_gates || {};
  const qualityIds = Object.keys(qualityGates);
  if (qualityIds.length !== 5 || qualityIds.some(id => qualityGates[id]?.status !== 'PASS')) {
    throw new Error('Gate 35 fails closed: Commercial Quality Q1-Q5 are not all PASS.');
  }
  return { state, gates, qualityGates };
}

const { state, gates, qualityGates } = prerequisites();
const names = secretNames();
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const gatesArray = Array.isArray(config?.gates) ? config.gates : [];
const chain = JSON.parse(readFileSync(EVIDENCE_CHAIN_PATH, 'utf8'));
const chainFile = hashFile(EVIDENCE_CHAIN_PATH, 'blueprint-evidence-chain');
const intelligenceFile = hashFile(EXECUTION_INTELLIGENCE_EVIDENCE_PATH, 'execution-intelligence-evidence');
const configFile = hashFile(CONFIG_PATH, 'production-roadmap-47-gates');
const stateFile = hashFile(STATE_PATH, 'roadmap-autopilot-state');
const qualityStateFile = hashFile(QUALITY_STATE_PATH, 'commercial-quality-state');

const gatesSummary = gatesArray
  .filter(gate => gate?.id >= 1 && gate?.id <= 35)
  .map(gate => {
    const entry = gates[String(gate.id)];
    return {
      id: gate.id,
      phase: gate.phase,
      slug: gate.slug,
      title: gate.title,
      status: entry?.status || 'PENDING',
      checked_at: entry?.checked_at || null,
      head: entry?.head || null,
      hook: entry?.evidence?.hook || null,
      output_sha256: entry?.evidence?.output_sha256 || null,
      mutation_scope: gate.mutation_scope,
      requires_user_input: gate.requires_user_input
    };
  });

const receiptFiles = [
  hashFile(join(STATE_DIR, 'gate20-purchase.json'), 'gate20-purchase'),
  hashFile(join(STATE_DIR, 'gate21-stripe-order-idempotency.json'), 'gate21-stripe-order-idempotency'),
  hashFile(join(STATE_DIR, 'gate22-seed-confirmation-workflow.json'), 'gate22-seed-confirmation-workflow'),
  hashFile(join(STATE_DIR, 'gate23-paid-provider-research.json'), 'gate23-paid-provider-research'),
  hashFile(join(STATE_DIR, 'gate24-paid-vertex-quality.json'), 'gate24-paid-vertex-quality'),
  hashFile(join(STATE_DIR, 'gate25-workflow-ready-receipt.json'), 'gate25-workflow-ready-receipt'),
  hashFile(join(STATE_DIR, 'gate26-canonical-d1-artifacts-receipt.json'), 'gate26-canonical-d1-artifacts-receipt'),
  hashFile(join(STATE_DIR, 'gate27-private-r2-artifacts-receipt.json'), 'gate27-private-r2-artifacts-receipt'),
  hashFile(join(STATE_DIR, 'gate28-zip-pdf-product-receipt.json'), 'gate28-zip-pdf-product-receipt'),
  hashFile(join(STATE_DIR, 'gate29-launch-site-lead-receipt.json'), 'gate29-launch-site-lead-receipt'),
  hashFile(join(STATE_DIR, 'gate30-second-device-recovery-receipt.json'), 'gate30-second-device-recovery-receipt'),
  hashFile(join(STATE_DIR, 'gate31-cross-account-security-receipt.json'), 'gate31-cross-account-security-receipt'),
  hashFile(join(STATE_DIR, 'gate32-provider-failure-retry-receipt.json'), 'gate32-provider-failure-retry-receipt'),
  hashFile(join(STATE_DIR, 'gate33-r2-failure-retry-receipt.json'), 'gate33-r2-failure-retry-receipt'),
  hashFile(join(STATE_DIR, 'gate34-visual-certification-receipt.json'), 'gate34-visual-certification-receipt'),
  hashFile(join(STATE_DIR, 'commercial-quality-latest-report.json'), 'commercial-quality-latest-report'),
  hashFile(join(STATE_DIR, 'latest-report.json'), 'roadmap-latest-report')
].filter(item => item.sha256 !== null);

const receipt = {
  schema_version: 'ghosttown-authoritative-acceptance-receipt-v1',
  generated_at: now(),
  branch: 'feat/launch-blueprint-spa',
  head_sha256: null,
  canonical_chain: {
    contract_version: chain?.canonical?.version || '2.1.1',
    canonical_blob_sha1: chain?.canonical?.gitBlobSha1 || '616c691e6b4c9cea93615963a07375d13ffba57f',
    canonical_source_commit: chain?.canonical?.sourceCommit || null,
    chain_tip: chain?.chainTip || null,
    amendment_chain: [
      { version: '2.1.2', blob_sha1: chain?.platformAmendment?.gitBlobSha1 || null },
      { version: '2.1.3', blob_sha1: chain?.previousAmendment?.gitBlobSha1 || null },
      { version: '2.1.4', blob_sha1: chain?.amendment?.gitBlobSha1 || null },
      { version: '2.1.5', blob_sha1: chain?.calendarAmendment?.gitBlobSha1 || null },
      { version: '2.1.6', blob_sha1: chain?.executionIntelligenceAmendment?.gitBlobSha1 || null }
    ]
  },
  acceptance_environment: {
    worker_url: WORKER_URL,
    pages_url: PAGES_URL,
    cloudflare_account_id: ACCOUNT_ID,
    d1: { name: D1_NAME, id: D1_ID },
    r2_bucket: R2_BUCKET,
    kv: { namespace_id: KV_ID, title: KV_TITLE },
    workflow: { name: WORKFLOW_NAME, script: WORKFLOW_SCRIPT }
  },
  gates_summary: {
    total_gates: gatesSummary.length,
    total_passed: gatesSummary.filter(gate => gate.status === 'PASS').length,
    gates: gatesSummary
  },
  commercial_quality: Object.keys(qualityGates).map(id => ({
    id,
    slug: qualityGates[id]?.slug || null,
    status: qualityGates[id]?.status,
    checked_at: qualityGates[id]?.checked_at || null,
    hook_env: qualityGates[id]?.evidence?.hook_env || null
  })),
  acceptance_secrets: {
    secret_names_only: names,
    secret_values_recorded: false
  },
  receipt_inventory: receiptFiles,
  source_files: [chainFile, intelligenceFile, configFile, stateFile, qualityStateFile],
  production_deployment: { enabled: false, deployed: false, note: 'production auto-deploy disabled; Gate 36 requires an explicit human decision' },
  gate_36: { status: 'PENDING_HUMAN_DECISION', mode: 'manual', mutation_scope: 'production', requires_user_input: true },
  story_studio: { gates_37_47_run: false, claim: 'Story Studio Gates 37-47 have NOT been run; they are gated behind the Gate 36 human production-release decision.' },
  decision: 'PASS'
};

receipt.head_sha256 = sha256(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false }).stdout.trim());

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  gates_total: gatesSummary.length,
  gates_passed: gatesSummary.filter(gate => gate.status === 'PASS').length,
  commercial_quality_passed: Object.keys(qualityGates).length,
  secret_names_count: names.length,
  secret_values_recorded: false,
  production_deployed: false,
  gate_36: 'PENDING_HUMAN_DECISION',
  story_studio_gates_37_47: 'not_run',
  receipt: '.roadmap-autopilot/gate35-ghosttown-acceptance-receipt.json'
}));
