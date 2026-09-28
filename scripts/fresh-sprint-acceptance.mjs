#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'github-acceptance', 'fresh-sprint');
const TEMP = join(OUT, 'fresh-sprint-worker.ts');
const R2_BUCKET = 'ghosttowntest-private-blueprints-acceptance';
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
const START_PATH = '/__acceptance/fresh-sprint/start';
const STATUS_PATH = '/__acceptance/fresh-sprint/status';
const CAPABILITIES_PATH = '/__acceptance/fresh-sprint/capabilities';
const TOKEN = crypto.randomUUID() + crypto.randomUUID();
const VERIFIER_MARKER = `fresh-sprint-verifier-${crypto.randomUUID()}`;
const RESTORE_WORKTREE = join(ROOT, 'github-acceptance', 'main-restore-worktree');

function git(args) {
  const r = spawnSync('git', args, {
    cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024
  });
  if (r.error) throw r.error;
  if ((r.status ?? 1) !== 0) throw new Error((r.stderr || r.stdout || 'git failed').trim());
  return String(r.stdout || '').trim();
}

const ORIGINAL_HEAD = git(['rev-parse', 'HEAD']);
let MAIN_SHA = '';
try {
  MAIN_SHA = git(['rev-parse', 'origin/main']);
} catch {
  git(['fetch', 'origin', 'main', '--depth=1']);
  MAIN_SHA = git(['rev-parse', 'FETCH_HEAD']);
}

mkdirSync(OUT, { recursive: true });

function wrangler(args, opts = {}) {
  const r = spawnSync(process.execPath, [resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'), ...args], {
    cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024, ...opts
  });
  if (r.error) throw r.error;
  if ((r.status ?? 1) !== 0) throw new Error((r.stderr || r.stdout || 'wrangler failed').trim());
  return String(r.stdout || '') + String(r.stderr || '');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const jsonFile = (name, value) => writeFileSync(join(OUT, name), JSON.stringify(value, null, 2) + '\n', 'utf8');

const worker = `
import app from '../../src/api/worker.ts';
import { startLaunchBlueprintWorkflow } from '../../src/api/blueprintFulfillment.ts';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../../src/lib/ghosttownOffer.ts';
export { LaunchBlueprintWorkflow } from '../../src/api/launchBlueprintWorkflow.ts';

const TOKEN = ${JSON.stringify(TOKEN)};
const VERIFIER_MARKER = ${JSON.stringify(VERIFIER_MARKER)};
const ok = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const auth = request => request.headers.get('x-acceptance-token') === TOKEN;

async function start(env) {
  const stamp = Date.now().toString(36);
  const email = 'fresh-sprint-' + stamp + '@acceptance.ghosttowntest.local';
  const verdictId = 'fresh_verdict_' + stamp;
  const orderId = 'gtt_fresh_' + stamp;
  const now = new Date().toISOString();
  const verdict = {
    resultId: verdictId,
    generatedAt: now,
    idea: {
      ideaName: 'AI App Launch Readiness Audit',
      description: 'A manual launch-readiness audit for solo founders building apps with AI coding tools, focused on deployment, authentication, payments, domains, and production-readiness gaps before launch.',
      targetUser: 'Solo founders using AI coding tools such as Cursor, Replit, or Lovable who personally build and launch web apps',
      painfulProblem: 'Solo founders can get an AI-built app working locally but still struggle to make deployment, authentication, payments, domains, and production configuration work together.',
      currentAlternative: 'Product documentation, Reddit and community discussions, Discord groups, Stack Overflow, podcasts, and trial-and-error debugging.',
      motivation: 'Find launch blockers before spending more time rebuilding or announcing an app that is not production-ready.'
    },
    deterministicScores: {
      ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
      litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak',
      businessDnaType: 'service', businessDnaTrap: 'Solo founders may prefer free documentation and community help instead of paying for a launch-readiness audit',
      businessDnaWinStrategy: 'Sell a small manual launch-readiness audit before building automation',
      finalVerdict: 'test_first', verdictHeadline: 'Test willingness to pay for a focused AI-app launch-readiness audit',
      verdictExplanation: 'The launch-friction problem is visible, but willingness to pay for a focused audit is not yet proven.',
      recommendedNextTest: 'Ask qualified solo founders using AI coding tools to pay for a manual launch-readiness audit.',
      doNotBuildUntil: 'At least a few qualified solo founders pay or make another meaningful commitment.',
      oneSentenceAdvice: 'Sell the launch-readiness outcome before building automation.'
    },
    usedAI: false, cacheHit: false, answers: {}
  };
  const order = {
    orderId, email, verdictId, status: 'paid',
    artifactType: 'launch_blueprint_v2',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: GHOSTTOWN_30_DAY_PLAN_V1.version,
    planVersion: '2.0',
    stripeMode: 'test',
    stripeCheckoutSessionId: 'cs_test_fresh_' + stamp,
    stripeEventId: 'evt_test_fresh_' + stamp,
    stripePriceId: 'price_test_acceptance_fixture',
    paidAt: now,
    createdAt: now,
    updatedAt: now,
    intake: {
      verdictId,
      targetBuyer: 'Solo founders using AI coding tools who personally own the app and can approve a small business purchase',
      geography: 'United States',
      problem: 'Solo founders can get an AI-built app working locally but still struggle to make deployment, authentication, payments, domains, and production configuration work together.',
      currentWorkaround: 'Product documentation, Reddit and community discussions, Discord groups, Stack Overflow, podcasts, and trial-and-error debugging.',
      offerHypothesis: 'A $49 manual AI App Launch Readiness Audit: review the launch setup and deliver a prioritized list of the top three production blockers with screenshots and fixes to test.',
      expectedPrice: '$49',
      currentStage: 'New idea with no paid customers yet',
      customerNotes: 'The solo founder is both the user and payer. The first test is advisory only: no credential collection, no production access, no security guarantee, no financial advice, and no changes to the live app.',
      competitorSeeds: [
        { seedId: 'seed_cursor_' + stamp, name: 'Cursor', website: 'https://cursor.com', domain: 'cursor.com', relationship: 'adjacent_product', origin: 'customer_confirmed', reason: 'Solo founders use Cursor to build AI-assisted applications.', verifiedAt: now },
        { seedId: 'seed_replit_' + stamp, name: 'Replit', website: 'https://replit.com', domain: 'replit.com', relationship: 'adjacent_product', origin: 'customer_confirmed', reason: 'Solo founders use Replit to build and deploy AI-assisted applications.', verifiedAt: now }
      ]
    }
  };
  await env.KV.put('user_result_' + email + '_' + verdictId, JSON.stringify(verdict));
  await env.KV.put('verdict_' + verdictId, JSON.stringify(verdict));
  await env.KV.put('paid_test_order_' + orderId, JSON.stringify(order));
  const started = await startLaunchBlueprintWorkflow(env, orderId, 'fresh_acceptance_' + stamp);
  return ok({ ok: true, orderId, verdictId, email, workflowId: started.workflowId, createdAt: now });
}

async function status(env, orderId) {
  const raw = await env.KV.get('paid_test_order_' + orderId);
  if (!raw) return ok({ ok: false, error: 'order not found' }, 404);
  const order = JSON.parse(raw);
  let workflowStatus = 'unknown';
  try {
    const instance = order.fulfillmentWorkflowId ? await env.LAUNCH_BLUEPRINT_WORKFLOW.get(order.fulfillmentWorkflowId) : null;
    workflowStatus = (await instance?.status())?.status || 'unknown';
  } catch {}
  const body = { ok: true, order: {
    orderId: order.orderId, verdictId: order.verdictId, email: order.email, status: order.status,
    paidAt: order.paidAt, fulfillmentWorkflowId: order.fulfillmentWorkflowId,
    fulfillmentAttemptCount: order.fulfillmentAttemptCount, fulfillmentError: order.fulfillmentError,
    uncertaintySprint: order.uncertaintySprint,
    researchBlocked: order.researchBlocked
  }, workflowStatus };
  if (order.status === 'ready') {
    const row = await env.DB.prepare('SELECT blueprint_json, research_receipt_json, pdf_r2_key FROM launch_blueprints WHERE order_id = ?').bind(orderId).first();
    body.blueprintJson = row?.blueprint_json || null;
    body.researchReceiptJson = row?.research_receipt_json || null;
    body.pdfR2Key = row?.pdf_r2_key || null;
    try { body.pointer = JSON.parse((await env.KV.get('paid_test_blueprint_pointer_' + orderId)) || 'null'); } catch { body.pointer = null; }
  }
  return ok(body);
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    if (u.pathname === '${START_PATH}' || u.pathname === '${STATUS_PATH}' || u.pathname === '${CAPABILITIES_PATH}') {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (!auth(request)) return new Response('Unauthorized', { status: 401 });
      if (u.pathname === '${START_PATH}' && request.method === 'GET') return ok({ ok: true, verifierMarker: VERIFIER_MARKER });
      if (u.pathname === '${CAPABILITIES_PATH}' && request.method === 'GET') return ok({
        ok: true,
        verifierMarker: VERIFIER_MARKER,
        capabilities: {
          braveSearch: Boolean(env.BRAVE_SEARCH_API_KEY?.trim()),
          youtubeFree: Boolean(env.YOUTUBE_API_KEY?.trim()),
          youtubePaid: Boolean(env.YOUTUBE_API_KEY_PAID?.trim()),
          dataForSeo: Boolean(env.DATAFORSEO_LOGIN?.trim() && env.DATAFORSEO_PASSWORD?.trim()),
          rankParse: Boolean(env.RANKPARSE_API_KEY?.trim()),
          podcastIndex: Boolean(env.PODCAST_INDEX_API_KEY?.trim() && env.PODCAST_INDEX_API_SECRET?.trim()),
          vertexServiceAccount: Boolean(env.VERTEX_SERVICE_ACCOUNT_EMAIL?.trim() && env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY?.trim())
        }
      });
      if (u.pathname === '${START_PATH}' && request.method === 'POST') return start(env);
      if (u.pathname === '${STATUS_PATH}' && request.method === 'GET') return status(env, u.searchParams.get('order_id') || '');
      return new Response('Method not allowed', { status: 405 });
    }
    return app.fetch(request, env, ctx);
  }
};
`;
writeFileSync(TEMP, worker, 'utf8');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function parseStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const names = [];
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    names.push(decoder.decode(bytes.subarray(nameStart, nameStart + nameLength)));
    offset = dataStart + size;
  }
  return names;
}

function auditUncertainty(status) {
  const u = status.order.uncertaintySprint;
  assert(u?.schemaVersion === 'strategic-uncertainty-sprint-v1', 'Missing strategic uncertainty Sprint');
  assert(u.horizonDays === 3, 'Uncertainty Sprint must be 3 days');
  assert(Array.isArray(u.unresolvedLinks) && u.unresolvedLinks.length > 0, 'Uncertainty Sprint must name unresolved links');
  assert(Array.isArray(u.questions) && u.questions.length > 0, 'Uncertainty Sprint must ask concrete questions');
  assert(String(u.unlockCondition || '').includes('all eight links'), 'Unlock condition must require all eight links to cohere');
  return { outcome: 'uncertainty', unresolvedLinks: u.unresolvedLinks, questionCount: u.questions.length, passed: true };
}

function auditResearchBlocked(status) {
  const blocked = status.order.researchBlocked;
  assert(blocked?.schemaVersion === 'ghosttown-research-blocked-v1', 'Missing research-blocked receipt');
  assert(blocked.outcome === 'PROVIDER_BLOCKED', 'research_blocked must carry PROVIDER_BLOCKED outcome');
  assert(blocked.code, 'research_blocked must identify a typed shortfall code');
  assert(blocked.nextRetryAt, 'research_blocked must include an automatic retry time');
  assert(blocked.automaticRetryWindowHours === 48, 'research_blocked retry window must remain 48 hours');
  assert(String(blocked.customerMessage || '').includes('not a judgment about your business idea'), 'research_blocked customer message must not judge the business');
  return {
    outcome: 'research_blocked',
    code: blocked.code,
    failedProviderTypes: blocked.failedProviderTypes || [],
    nextRetryAt: blocked.nextRetryAt,
    passed: true
  };
}

function auditReady(status) {
  const blueprint = JSON.parse(status.blueprintJson);
  const research = JSON.parse(status.researchReceiptJson);
  assert(blueprint.status === 'ready', 'Blueprint is not READY');
  assert(blueprint.qualityGate?.passed === true, 'Blueprint quality gate did not pass');
  assert(Array.isArray(blueprint.dailyCalendar) && blueprint.dailyCalendar.length === 30, '30-day calendar must have exactly 30 days');
  assert(blueprint.dailyCalendar.every(d => d.whyItMatters && d.expectedDeliverable && d.successMeasurement && Array.isArray(d.ifThenBranches) && d.ifThenBranches.length), 'Every day must be actionable with deliverable, measurement, and branch rule');
  const channels = blueprint.customerAccessPack?.channels || [];
  const direct = channels.filter(c => c.evidenceRole === 'customer_access');
  assert(direct.length >= 3, 'Need at least 3 verified Customer Access paths');
  assert(direct.every(c => c.currentActivityStatus === 'verified_current' && c.publicUrl && c.accessPath && c.evidenceDate && c.currentActivityVerifiedAt), 'Customer Access paths must be currently verified with dated evidence and usable access');
  assert(direct.every(c => c.evidenceRole === 'customer_access'), 'First-buyer paths must remain Customer Access');
  assert(blueprint.firstRevenuePath?.firstBuyer, 'Missing first buyer');
  assert(blueprint.firstRevenuePath?.commitmentMethod, 'Missing commitment method');
  assert(blueprint.manualFulfillmentPlan?.onboardingSteps?.length, 'Missing manual fulfillment method');
  assert(blueprint.offer?.initialTestPrice || blueprint.firstRevenuePath?.firstPrice, 'Missing price');
  assert(Array.isArray(blueprint.customerAccessPack?.outreachScripts) && blueprint.customerAccessPack.outreachScripts.length > 0, 'Missing usable outreach messages');
  const allText = JSON.stringify(blueprint);
  assert(!allText.includes('$119'), 'Retired $119 Get Me Live promise leaked into Sprint');
  assert(!/30-Day Sprint[^]{0,180}(includes|comes with)[^]{0,100}(live website|Launch Site)/i.test(allText), 'Sprint improperly bundles a live website/Launch Site');
  assert(research?.generationReceiptEvidence?.quality?.sourceVerificationPassed === true, 'Source verification receipt did not pass');

  const review = blueprint.competitorReviewIntelligence;
  assert(review?.schemaVersion === 'competitor-review-intelligence-v1', 'READY Sprint is missing competitor review intelligence');
  assert(review.productSpecific === true, 'Competitor review intelligence must be product-specific');
  assert(review.orderId === status.order.orderId, 'Competitor review intelligence order provenance mismatch');
  assert(Array.isArray(review.observations) && review.observations.length >= 3, 'READY Sprint needs at least three verified first-person problem-language observations');
  const observedReviewUrls = new Set(review.observations.map(o => String(o.sourceUrl || '').toLowerCase().replace(/\/$/, '')).filter(Boolean));
  assert(observedReviewUrls.size >= 3, 'READY Sprint needs problem-language evidence from at least three independent source URLs');
  const observedSourceIds = new Set(review.observations.map(o => o.sourceId));
  assert(review.observations.every(o => o.sourceUrl && o.customerLanguage?.length && o.sourceId), 'Review observations must retain source URL, source ID, and observed language');
  assert((review.patterns || []).every(p => Array.isArray(p.sourceIds) && p.sourceIds.length >= 2 && p.sourceIds.every(id => observedSourceIds.has(id))), 'Review patterns must cite at least two verified observations');
  assert((review.productImplications || []).every(i => Array.isArray(i.sourceIds) && i.sourceIds.length && i.sourceIds.every(id => observedSourceIds.has(id))), 'Review product hypotheses must cite verified observations');

  const observedUrlBySourceId = new Map(
    review.observations.map(observation => [
      observation.sourceId,
      String(observation.sourceUrl || '').toLowerCase().replace(/\/$/, '')
    ])
  );
  const competitivePatternKinds = new Set(['strength', 'weakness', 'switching_signal', 'pricing_signal', 'support_signal', 'requested_improvement']);
  const competitiveReviewUrls = (review.patterns || [])
    .filter(pattern => competitivePatternKinds.has(pattern.kind))
    .flatMap(pattern => pattern.sourceIds || [])
    .map(sourceId => observedUrlBySourceId.get(sourceId) || '')
    .filter(Boolean);
  const competitiveAlternativeUrls = new Set([
    ...competitiveReviewUrls,
    ...channels
      .filter(channel => channel.competitorEvidence?.some(value => String(value || '').trim()))
      .map(channel => String(channel.publicUrl || '').toLowerCase().replace(/\/$/, ''))
      .filter(Boolean)
  ]);
  assert(competitiveAlternativeUrls.size >= 2, 'READY Sprint needs at least two independent competitive/alternative evidence sources');
  assert(research?.evidenceSufficiency?.sufficient === true, 'READY research receipt did not pass role-based evidence sufficiency');
  assert(research.evidenceSufficiency.currentCustomerAccessCount >= 3, 'READY receipt has fewer than three current Customer Access sources');
  assert(research.evidenceSufficiency.problemLanguageObservationCount >= 3, 'READY receipt has fewer than three problem-language observations');
  assert(research.evidenceSufficiency.competitiveAlternativeSourceCount >= 2, 'READY receipt has fewer than two competitive/alternative sources');

  const receipt = blueprint.generationReceipt;
  assert(receipt?.pipelineVersion === 'vertex-blueprint-staged-v3', 'READY Sprint must carry the staged Vertex v3 generation receipt');
  const stages = (receipt.stages || []).map(stage => stage.stage);
  assert(stages.includes('strategic_coherence_gate'), 'READY Sprint is missing the Strategic Coherence stage receipt');
  assert(receipt.redTeam?.passed === true, 'READY Sprint red-team receipt did not pass');

  return {
    outcome: 'ready',
    customerAccessCount: direct.length,
    dayCount: blueprint.dailyCalendar.length,
    messageCount: blueprint.customerAccessPack.outreachScripts.length,
    reviewObservationCount: review.observations.length,
    reviewPatternCount: review.patterns.length,
    evidenceRoles: research.evidenceSufficiency.coveredRoles,
    independentEvidenceUrls: research.evidenceSufficiency.independentEvidenceUrls,
    generationStages: stages,
    passed: true
  };
}

let deployed = false;
let finalStatus = null;
try {
  wrangler(['deploy', TEMP, '--env', 'acceptance']);
  deployed = true;

  // Cloudflare can briefly serve the prior Worker version after deploy. Probe
  // the acceptance-only route until the temporary verifier is actually live,
  // then create exactly one fresh order.
  const verifierDeadline = Date.now() + 90_000;
  let verifierReady = false;
  while (Date.now() < verifierDeadline) {
    try {
      const probe = await fetch(WORKER_URL + START_PATH, {
        method: 'GET',
        headers: { 'x-acceptance-token': TOKEN, 'cache-control': 'no-cache' }
      });
      if (probe.ok) {
        const readiness = await probe.json().catch(() => null);
        if (readiness?.ok === true && readiness?.verifierMarker === VERIFIER_MARKER) {
          verifierReady = true;
          break;
        }
      }
    } catch {}
    await sleep(3000);
  }
  assert(verifierReady, 'Fresh Sprint verifier did not become active at the acceptance Worker URL');

  // Prove what the deployed temporary acceptance Worker can actually see.
  // This receipt contains capability booleans only; it never exposes secret values.
  const capabilityRes = await fetch(WORKER_URL + CAPABILITIES_PATH, {
    method: 'GET',
    headers: { 'x-acceptance-token': TOKEN, 'cache-control': 'no-cache' }
  });
  const capabilityBody = await capabilityRes.json().catch(() => null);
  assert(
    capabilityRes.ok && capabilityBody?.ok === true && capabilityBody?.verifierMarker === VERIFIER_MARKER,
    'Fresh Sprint provider capability probe failed'
  );
  const capabilities = capabilityBody.capabilities || {};
  jsonFile('provider-capabilities.json', {
    schemaVersion: 'ghosttown-provider-capabilities-v1',
    checkedAt: new Date().toISOString(),
    capabilities
  });
  console.log('[provider-capabilities]', JSON.stringify(capabilities));

  const startRes = await fetch(WORKER_URL + START_PATH, {
    method: 'POST',
    headers: { 'x-acceptance-token': TOKEN, 'cache-control': 'no-cache' }
  });
  const start = await startRes.json();
  assert(startRes.ok && start.ok, 'Fresh Sprint start failed: ' + JSON.stringify(start));
  jsonFile('fresh-input-receipt.json', start);

  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(10000);
    // Poll durable acceptance state directly instead of depending on a temporary
    // HTTP verifier version staying at the edge while the Workflow is running.
    const orderRaw = wrangler(['kv','key','get','paid_test_order_' + start.orderId,'--binding','KV','--remote','--env','acceptance','--text']).trim();
    if (!orderRaw) continue;
    const order = JSON.parse(orderRaw);
    finalStatus = { ok: true, order, workflowStatus: order.fulfillmentWorkflowId ? 'recorded' : 'unknown' };
    jsonFile('latest-status.json', finalStatus);
    if (['ready', 'uncertainty', 'research_blocked', 'failed'].includes(order.status)) break;
    finalStatus = null;
  }
  assert(finalStatus, 'Fresh Sprint timed out');
  assert(finalStatus.order.status !== 'failed', 'Fresh Sprint failed: ' + (finalStatus.order.fulfillmentError || 'unknown'));

  let audit;
  if (finalStatus.order.status === 'uncertainty') {
    audit = auditUncertainty(finalStatus);
  } else if (finalStatus.order.status === 'research_blocked') {
    audit = auditResearchBlocked(finalStatus);
  } else {
    const sql = `SELECT blueprint_json, research_receipt_json, pdf_r2_key FROM launch_blueprints WHERE order_id = '${start.orderId.replaceAll("'", "''")}' LIMIT 1;`;
    const d1Raw = wrangler(['d1','execute','ghosttowntest-blueprints-acceptance','--remote','--env','acceptance','--command',sql,'--json']);
    const d1 = JSON.parse(d1Raw);
    const row = d1?.[0]?.results?.[0] || d1?.results?.[0] || null;
    assert(row?.blueprint_json && row?.research_receipt_json, 'READY result missing persisted JSON');
    finalStatus.blueprintJson = row.blueprint_json;
    finalStatus.researchReceiptJson = row.research_receipt_json;
    const pointerRaw = wrangler(['kv','key','get','paid_test_blueprint_pointer_' + start.orderId,'--binding','KV','--remote','--env','acceptance','--text']).trim();
    finalStatus.pointer = pointerRaw ? JSON.parse(pointerRaw) : null;
    writeFileSync(join(OUT, 'blueprint.json'), finalStatus.blueprintJson);
    writeFileSync(join(OUT, 'research-receipt.json'), finalStatus.researchReceiptJson);
    const pointer = finalStatus.pointer || {};
    assert(pointer.pdfR2Key && pointer.jsonR2Key && pointer.assetsR2Key, 'Missing persisted artifact pointers');
    wrangler(['r2','object','get',R2_BUCKET + '/' + pointer.pdfR2Key,'--file',join(OUT,'launch-blueprint.pdf'),'--remote','--env','acceptance']);
    wrangler(['r2','object','get',R2_BUCKET + '/' + pointer.assetsR2Key,'--file',join(OUT,'assets.zip'),'--remote','--env','acceptance']);
    assert(readFileSync(join(OUT,'launch-blueprint.pdf')).subarray(0,5).toString() === '%PDF-', 'PDF signature invalid');
    const zipNames = parseStoredZip(readFileSync(join(OUT,'assets.zip')));
    assert(zipNames.length === 16, 'ZIP must contain exactly 16 files; found ' + zipNames.length);
    jsonFile('zip-manifest.json', zipNames);
    audit = auditReady(finalStatus);
    audit.zipFileCount = zipNames.length;
  }

  const receipt = {
    schemaVersion: 'ghosttown-fresh-sprint-acceptance-v1',
    recordedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || null,
    environment: 'acceptance',
    orderId: finalStatus.order.orderId,
    verdictId: finalStatus.order.verdictId,
    workflowId: finalStatus.order.fulfillmentWorkflowId,
    workflowStatus: finalStatus.workflowStatus,
    finalOrderStatus: finalStatus.order.status,
    audit,
    freshAcceptancePassed: audit.passed === true,
    sep26EvaluationClosed: audit.passed === true && audit.outcome === 'ready'
  };
  jsonFile('final-acceptance-receipt.json', receipt);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  if (deployed) {
    try {
      // Restore exact main from an isolated detached worktree. The Autopilot
      // intentionally mutates roadmap state in the primary worktree, so branch
      // switching there is unsafe and can strand the temporary verifier.
      try { git(['worktree', 'remove', '--force', RESTORE_WORKTREE]); } catch {}
      rmSync(RESTORE_WORKTREE, { recursive: true, force: true });
      git(['worktree', 'add', '--detach', RESTORE_WORKTREE, MAIN_SHA]);
      wrangler(['deploy','--env','acceptance'], { cwd: RESTORE_WORKTREE });
      jsonFile('restore-receipt.json', {
        schemaVersion: 'ghosttown-acceptance-restore-v1',
        restoredSha: MAIN_SHA,
        requestedFromSha: ORIGINAL_HEAD,
        restoreMethod: 'isolated_detached_worktree',
        restoredAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('CRITICAL: failed to restore canonical acceptance Worker from exact main SHA:', e);
      process.exitCode = 1;
    } finally {
      try { git(['worktree', 'remove', '--force', RESTORE_WORKTREE]); } catch {}
      rmSync(RESTORE_WORKTREE, { recursive: true, force: true });
    }
  }
  rmSync(TEMP, { force: true });
}
