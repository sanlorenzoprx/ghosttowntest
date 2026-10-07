import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const operation = String(process.env.GHOSTTOWN_LEARNING_OPERATION || '').trim();
const knowledgeId = String(process.env.GHOSTTOWN_LEARNING_KNOWLEDGE_ID || '').trim();
const confirm = String(process.env.GHOSTTOWN_LEARNING_CONFIRM || '').trim();
const allowed = new Set(['list', 'inspect', 'activate', 'reject']);
const expectedConfirm = {
  list: 'LIST PRODUCT LEARNING',
  inspect: 'INSPECT PRODUCT LEARNING',
  activate: 'ACTIVATE PRODUCT LEARNING',
  reject: 'REJECT PRODUCT LEARNING'
};

if (!allowed.has(operation)) throw new Error('Unsupported product-learning review operation.');
if (confirm !== expectedConfirm[operation]) throw new Error('Product-learning confirmation phrase does not match the selected operation.');
if (operation !== 'list' && !/^knowledge_[a-f0-9]{64}$/.test(knowledgeId)) {
  throw new Error('A canonical knowledge_<sha256> ID is required.');
}

function runWrangler(command) {
  const result = spawnSync(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js',
    'd1', 'execute', 'DB',
    '--env', 'production',
    '--remote',
    '--command', command,
    '--json'
  ], { encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    throw new Error(`Wrangler D1 operation failed: ${String(result.stderr || result.stdout || '').slice(0, 4000)}`);
  }
  const parsed = JSON.parse(result.stdout);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  return Array.isArray(first?.results) ? first.results : Array.isArray(first?.result) ? first.result : [];
}

function readRow(id) {
  return runWrangler(`SELECT knowledge_id, knowledge_class, scope, lane, lesson_text, evidence_summary_json, support_count, contradiction_count, status, valid_until, last_supported_at, next_review_at, created_at, updated_at FROM execution_product_knowledge WHERE knowledge_id = '${id}' LIMIT 1;`)[0] || null;
}

function parseEvidence(row) {
  try { return JSON.parse(String(row?.evidence_summary_json || '{}')); } catch { return {}; }
}

function publicRow(row) {
  if (!row) return null;
  const evidence = parseEvidence(row);
  return {
    knowledgeId: row.knowledge_id,
    knowledgeClass: row.knowledge_class,
    scope: row.scope,
    lane: row.lane || null,
    lesson: row.lesson_text,
    supportCount: Number(row.support_count || 0),
    distinctAccountSupport: Number(evidence.distinctAccountSupport || 0),
    contradictionCount: Number(row.contradiction_count || 0),
    status: row.status,
    privacySafe: evidence.privacySafe === true,
    requiresHumanApproval: evidence.requiresHumanApproval === true,
    validUntil: row.valid_until || null,
    lastSupportedAt: row.last_supported_at,
    nextReviewAt: row.next_review_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertActivationEligible(row) {
  if (!row) throw new Error('Product-learning knowledge record was not found.');
  if (row.status !== 'review_required') throw new Error(`Only review_required knowledge can be activated; current status is ${row.status}.`);
  const evidence = parseEvidence(row);
  const supportCount = Number(row.support_count || 0);
  const distinctSupport = Number(evidence.distinctAccountSupport || 0);
  if (evidence.privacySafe !== true || evidence.requiresHumanApproval !== true) {
    throw new Error('Product-learning record does not carry the required privacy/human-approval evidence.');
  }
  if (supportCount < 3 || distinctSupport < 3) {
    throw new Error(`At least three distinct customer accounts must support a reusable lesson before activation (support=${supportCount}, distinct=${distinctSupport}).`);
  }
  if (row.scope !== 'universal' && row.scope !== 'lane') {
    throw new Error(`Scope ${row.scope} is not eligible for runtime activation. Market-scoped learning remains review-only until an explicit market identity contract exists.`);
  }
  if (row.scope === 'lane' && !String(row.lane || '').trim()) {
    throw new Error('Lane-scoped product knowledge is missing its execution lane.');
  }
  if (row.knowledge_class === 'market_research') {
    const validUntil = row.valid_until ? new Date(row.valid_until).getTime() : 0;
    if (!validUntil || validUntil <= Date.now()) {
      throw new Error('Market-research knowledge is expired or missing a valid-until date.');
    }
  }
}

mkdirSync('github-product-learning-review', { recursive: true });

let output;
if (operation === 'list') {
  const rows = runWrangler(`SELECT knowledge_id, knowledge_class, scope, lane, lesson_text, evidence_summary_json, support_count, contradiction_count, status, valid_until, last_supported_at, next_review_at, created_at, updated_at FROM execution_product_knowledge WHERE status = 'review_required' ORDER BY support_count DESC, last_supported_at DESC LIMIT 25;`);
  output = {
    schemaVersion: 'ghosttown-product-learning-review-v1',
    operation,
    count: rows.length,
    records: rows.map(publicRow),
    mutationPerformed: false,
    recordedAt: new Date().toISOString()
  };
} else {
  const before = readRow(knowledgeId);
  if (!before) throw new Error('Product-learning knowledge record was not found.');
  if (operation === 'activate') {
    assertActivationEligible(before);
    const nextReviewModifier = before.knowledge_class === 'market_research' ? '+30 days' : '+90 days';
    runWrangler(`UPDATE execution_product_knowledge SET status = 'active', next_review_at = datetime('now', '${nextReviewModifier}'), updated_at = datetime('now') WHERE knowledge_id = '${knowledgeId}' AND status = 'review_required';`);
  } else if (operation === 'reject') {
    if (before.status !== 'review_required') throw new Error(`Only review_required knowledge can be rejected; current status is ${before.status}.`);
    runWrangler(`UPDATE execution_product_knowledge SET status = 'rejected', next_review_at = NULL, updated_at = datetime('now') WHERE knowledge_id = '${knowledgeId}' AND status = 'review_required';`);
  }
  const after = readRow(knowledgeId);
  if (operation === 'activate' && after?.status !== 'active') throw new Error('Product-learning activation did not persist.');
  if (operation === 'reject' && after?.status !== 'rejected') throw new Error('Product-learning rejection did not persist.');
  output = {
    schemaVersion: 'ghosttown-product-learning-review-v1',
    operation,
    before: publicRow(before),
    after: publicRow(after),
    mutationPerformed: operation === 'activate' || operation === 'reject',
    recordedAt: new Date().toISOString()
  };
}

writeFileSync('github-product-learning-review/review.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
