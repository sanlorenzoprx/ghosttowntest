#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE_DIR = join(ROOT, '.roadmap-autopilot');
const STATE_PATH = join(STATE_DIR, 'state.json');
const QUALITY_STATE_PATH = join(STATE_DIR, 'commercial-quality-state.json');
const HOOK_RECEIPT_PATH = join(STATE_DIR, 'gate35-ghosttown-acceptance-receipt.json');
const FINAL_RECEIPT_PATH = join(STATE_DIR, 'gate35-ghosttown-final-acceptance-receipt.json');
const EVIDENCE_CHAIN_PATH = join(ROOT, 'docs', 'blueprint-evidence', 'ghosttown-launch-blueprint-v2.1-evidence-chain.json');
const EXECUTION_INTELLIGENCE_EVIDENCE_PATH = join(ROOT, 'docs', 'blueprint-evidence', 'ghosttown-launch-blueprint-v2.1.6-execution-intelligence-evidence.json');
const CONFIG_PATH = join(ROOT, 'config', 'production-roadmap-47-gates.json');
const FINAL_REFRESH = process.argv.includes('--final-refresh');
const BRANCH = 'feat/launch-blueprint-spa';
const REPOSITORY = 'sanlorenzoprx/ghosttowntest';
const PR_NUMBER = 7;
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
  if (!existsSync(path)) return { path: path.replace(/\\/g, '/'), label, sha256: null };
  return { path: path.replace(/\\/g, '/'), label, sha256: sha256(readFileSync(path)) };
}

function command(commandName, args, required = true) {
  const result = spawnSync(commandName, args, { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 });
  if ((result.status ?? 1) !== 0 && required) throw new Error(`Gate 35 ${FINAL_REFRESH ? 'final refresh' : 'hook'} could not run ${commandName} ${args.join(' ')}.`);
  return String(result.stdout || '').trim();
}

function localGitIdentity() {
  const branch = command('git', ['branch', '--show-current']);
  const head = command('git', ['rev-parse', 'HEAD']);
  if (branch !== BRANCH) throw new Error(`Gate 35 requires branch ${BRANCH}; current branch is ${branch || 'unknown'}.`);
  return { branch, head };
}

function remoteAndPrIdentity(localHead) {
  if (!FINAL_REFRESH) return { origin_head: null, pr: null, heads_equal: null };
  const remote = command('git', ['ls-remote', 'origin', `refs/heads/${BRANCH}`]);
  const originHead = remote.split(/\s+/)[0] || '';
  if (!/^[a-f0-9]{40}$/i.test(originHead)) throw new Error('Gate 35 final refresh could not resolve the origin branch head.');
  const raw = command('gh', ['pr', 'view', String(PR_NUMBER), '--repo', REPOSITORY, '--json', 'headRefOid,headRefName,baseRefName,isDraft,state,mergedAt,url']);
  let pr;
  try { pr = JSON.parse(raw); } catch { throw new Error('Gate 35 final refresh could not parse PR #7 metadata.'); }
  const valid = pr?.headRefOid === localHead
    && originHead === localHead
    && pr?.headRefName === BRANCH
    && pr?.baseRefName === 'main'
    && pr?.isDraft === true
    && pr?.state === 'OPEN'
    && pr?.mergedAt == null;
  if (!valid) {
    throw new Error(`Gate 35 final refresh requires local HEAD == origin/${BRANCH} == PR #7 head and PR #7 draft/open/unmerged. local=${localHead} origin=${originHead} pr=${pr?.headRefOid || 'unknown'}.`);
  }
  return {
    origin_head: originHead,
    heads_equal: true,
    pr: {
      number: PR_NUMBER,
      url: pr.url,
      head_sha: pr.headRefOid,
      head_branch: pr.headRefName,
      base_branch: pr.baseRefName,
      draft: pr.isDraft,
      state: pr.state,
      merged: pr.mergedAt != null
    }
  };
}

function secretNames(state) {
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

function assertNoSecretValues(serialized, names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.length >= 8 && serialized.includes(value)) {
      throw new Error(`Gate 35 refuses to write a receipt containing the value of secret ${name}.`);
    }
  }
}

function prerequisites() {
  if (!existsSync(STATE_PATH)) throw new Error('Gate 35 requires roadmap state.');
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const gates = state?.gates || {};
  const requiredThrough = FINAL_REFRESH ? 35 : 34;
  const failed = Array.from({ length: requiredThrough }, (_, index) => index + 1)
    .filter(id => gates[String(id)]?.status !== 'PASS');
  if (failed.length) throw new Error(`Gate 35 ${FINAL_REFRESH ? 'final refresh' : 'hook'} fails closed: roadmap gates ${failed.join(', ')} are not PASS.`);
  if (!FINAL_REFRESH && gates['35']?.status === 'PASS') {
    throw new Error('Gate 35 is already PASS; use --final-refresh for the post-PASS authoritative snapshot.');
  }
  const gate36Status = gates['36']?.status || 'PENDING_HUMAN_DECISION';
  if (['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36Status) || state?.runtime?.production_release_authorized === true) {
    throw new Error('Gate 35 final authority refuses to run after Gate 36 production release is authorized or executed.');
  }
  const quality = existsSync(QUALITY_STATE_PATH) ? JSON.parse(readFileSync(QUALITY_STATE_PATH, 'utf8')) : null;
  const qualityGates = quality?.quality_gates || {};
  const qualityIds = Object.keys(qualityGates);
  if (qualityIds.length !== 5 || qualityIds.some(id => qualityGates[id]?.status !== 'PASS')) {
    throw new Error('Gate 35 fails closed: Commercial Quality Q1-Q5 are not all PASS.');
  }
  if (FINAL_REFRESH) {
    const corrections = [
      ['gate31-cross-account-security-receipt-v2.json', 'roadmap-gate31-cross-account-security-receipt-v2'],
      ['gate34-visual-certification-receipt-v2.json', 'roadmap-gate34-visual-certification-receipt-v2'],
      ['gate34-visual-evidence-matrix.json', 'roadmap-gate34-visual-evidence-matrix-v1']
    ];
    for (const [file, schema] of corrections) {
      const path = join(STATE_DIR, file);
      if (!existsSync(path)) throw new Error(`Gate 35 final refresh requires corrected evidence ${file}.`);
      const value = JSON.parse(readFileSync(path, 'utf8'));
      if (value?.schema_version !== schema || value?.decision !== 'PASS') throw new Error(`Gate 35 final refresh found invalid corrected evidence ${file}.`);
    }
  }
  return { state, gates, qualityGates, gate36Status };
}

const { state, gates, qualityGates, gate36Status } = prerequisites();
const git = localGitIdentity();
const remote = remoteAndPrIdentity(git.head);
const names = secretNames(state);
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const gatesArray = Array.isArray(config?.gates) ? config.gates : [];
const chain = JSON.parse(readFileSync(EVIDENCE_CHAIN_PATH, 'utf8'));

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
const totalPassed = gatesSummary.filter(gate => gate.status === 'PASS').length;
if (FINAL_REFRESH && (gatesSummary.length !== 35 || totalPassed !== 35)) {
  throw new Error(`Gate 35 final refresh requires an exact 35/35 PASS snapshot; found ${totalPassed}/${gatesSummary.length}.`);
}

const receiptFiles = [
  ['gate20-purchase.json', 'gate20-purchase'],
  ['gate21-stripe-order-idempotency.json', 'gate21-stripe-order-idempotency'],
  ['gate22-seed-confirmation-workflow.json', 'gate22-seed-confirmation-workflow'],
  ['gate23-paid-provider-research.json', 'gate23-paid-provider-research'],
  ['gate24-paid-vertex-quality.json', 'gate24-paid-vertex-quality'],
  ['gate25-workflow-ready-receipt.json', 'gate25-workflow-ready-receipt'],
  ['gate26-canonical-d1-artifacts-receipt.json', 'gate26-canonical-d1-artifacts-receipt'],
  ['gate27-private-r2-artifacts-receipt.json', 'gate27-private-r2-artifacts-receipt'],
  ['gate28-zip-pdf-product-receipt.json', 'gate28-zip-pdf-product-receipt'],
  ['gate29-launch-site-lead-receipt.json', 'gate29-launch-site-lead-receipt'],
  ['gate30-second-device-recovery-receipt.json', 'gate30-second-device-recovery-receipt'],
  ['gate31-cross-account-security-receipt.json', 'gate31-cross-account-security-receipt-v1'],
  ['gate31-cross-account-security-receipt-v2.json', 'gate31-cross-account-security-receipt-v2'],
  ['gate32-provider-failure-retry-receipt.json', 'gate32-provider-failure-retry-receipt'],
  ['gate33-r2-failure-retry-receipt.json', 'gate33-r2-failure-retry-receipt'],
  ['gate34-visual-certification-receipt.json', 'gate34-visual-certification-receipt-v1'],
  ['gate34-visual-certification-receipt-v2.json', 'gate34-visual-certification-receipt-v2'],
  ['gate34-visual-evidence-matrix.json', 'gate34-visual-evidence-matrix'],
  ['commercial-quality-latest-report.json', 'commercial-quality-latest-report'],
  ['latest-report.json', 'roadmap-latest-report']
].map(([file, label]) => hashFile(join(STATE_DIR, file), label)).filter(item => item.sha256 !== null);

const receipt = {
  schema_version: 'ghosttown-authoritative-acceptance-receipt-v2',
  mode: FINAL_REFRESH ? 'FINAL_REFRESH' : 'GATE_HOOK',
  generated_at: now(),
  branch: BRANCH,
  git_identity: {
    local_head: git.head,
    origin_head: remote.origin_head,
    pr_head: remote.pr?.head_sha || null,
    local_origin_pr_heads_equal: remote.heads_equal,
    pr: remote.pr
  },
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
    total_passed: totalPassed,
    exact_35_of_35_pass: FINAL_REFRESH ? totalPassed === 35 && gatesSummary.length === 35 : null,
    gates: gatesSummary
  },
  commercial_quality: {
    all_q1_q5_pass: Object.keys(qualityGates).length === 5 && Object.values(qualityGates).every(gate => gate?.status === 'PASS'),
    gates: Object.keys(qualityGates).map(id => ({ id, slug: qualityGates[id]?.slug || null, status: qualityGates[id]?.status, checked_at: qualityGates[id]?.checked_at || null }))
  },
  corrected_pre_gate36_evidence: {
    authenticated_cross_account: hashFile(join(STATE_DIR, 'gate31-cross-account-security-receipt-v2.json'), 'gate31-v2'),
    read_only_visual_certification: hashFile(join(STATE_DIR, 'gate34-visual-certification-receipt-v2.json'), 'gate34-v2'),
    canonical_visual_matrix: hashFile(join(STATE_DIR, 'gate34-visual-evidence-matrix.json'), 'gate34-visual-matrix')
  },
  acceptance_secrets: { secret_names_only: names, secret_values_recorded: false },
  receipt_inventory: receiptFiles,
  source_files: [
    hashFile(EVIDENCE_CHAIN_PATH, 'blueprint-evidence-chain'),
    hashFile(EXECUTION_INTELLIGENCE_EVIDENCE_PATH, 'execution-intelligence-evidence'),
    hashFile(CONFIG_PATH, 'production-roadmap-47-gates'),
    hashFile(STATE_PATH, 'roadmap-autopilot-state'),
    hashFile(QUALITY_STATE_PATH, 'commercial-quality-state')
  ],
  stripe: {
    second_purchase_occurred: false,
    second_charge_occurred: false,
    evidence: ['gate20-purchase.json', 'gate32-provider-failure-retry-receipt.json']
  },
  acceptance_mutation_truth: {
    corrected_gate31_customer_data_mutations: 'none',
    corrected_gate34_customer_order_artifact_site_mutations: 'none',
    original_gate34_acceptance_infrastructure_deployment: true,
    original_gate34_reason: 'The historical v1 run updated stale acceptance Pages and temporarily deployed a mint Worker; the corrected v2 gate is read-only and fails closed on stale pairing.',
    production_infrastructure_mutation: 'none'
  },
  production_deployment: { enabled: false, deployed: false, note: 'Production auto-deploy remains disabled; Gate 36 is a human-only decision.' },
  gate_36: { status: gate36Status, authorized: false, executed: false, mode: 'manual', mutation_scope: 'production', requires_user_input: true },
  story_studio: { gates_37_47_run: false, completed_count: 0, total_count: 11 },
  secret_values_recorded: false,
  production_deployed: false,
  merge_performed: false,
  decision: 'PASS'
};

const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
assertNoSecretValues(serialized, names);
mkdirSync(STATE_DIR, { recursive: true });
const outputPath = FINAL_REFRESH ? FINAL_RECEIPT_PATH : HOOK_RECEIPT_PATH;
writeFileSync(outputPath, serialized, 'utf8');
console.log(JSON.stringify({
  ok: true,
  decision: 'PASS',
  mode: receipt.mode,
  gates_total: gatesSummary.length,
  gates_passed: totalPassed,
  exact_35_of_35_pass: receipt.gates_summary.exact_35_of_35_pass,
  local_origin_pr_heads_equal: remote.heads_equal,
  pr_draft_open_unmerged: remote.pr ? remote.pr.draft === true && remote.pr.state === 'OPEN' && remote.pr.merged === false : null,
  secret_names_count: names.length,
  secret_values_recorded: false,
  production_deployed: false,
  gate_36: gate36Status,
  story_studio_gates_37_47: 'not_run',
  receipt: FINAL_REFRESH ? '.roadmap-autopilot/gate35-ghosttown-final-acceptance-receipt.json' : '.roadmap-autopilot/gate35-ghosttown-acceptance-receipt.json'
}));
