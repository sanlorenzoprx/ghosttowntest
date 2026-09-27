#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TEMP_DIR = join(ROOT, '.fresh-acceptance');
const EVIDENCE_DIR = join(ROOT, 'fresh-acceptance-evidence');
const ENTRY = join(TEMP_DIR, 'fresh-sprint-entry.ts');
const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev';
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
  'get-me-live-handoff.md',
  'thirty-day-calendar.csv',
  'weekly-milestones.md',
  'metrics-template.csv',
  'decision-rules.md',
  'sources.csv'
].map(name => 'ghosttown-launch-blueprint/' + name).sort();

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function wranglerCli() {
  const dir = join(ROOT, 'node_modules', 'wrangler');
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.wrangler;
  if (!bin) throw new Error('Unable to resolve Wrangler CLI.');
  return resolve(dir, bin);
}

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wranglerCli(), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error('wrangler ' + args.join(' ') + ' failed\n' + (result.stderr || result.stdout || ''));
  }
  return (result.stdout || '') + '\n' + (result.stderr || '');
}

async function fetchJson(path, token, init = {}) {
  const response = await fetch(WORKER_URL + path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'X-Fresh-Acceptance-Token': token,
      'Content-Type': 'application/json'
    }
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + path + ': ' + (body?.error || text.slice(0, 500)));
  return body;
}

async function fetchBytes(path, token) {
  const response = await fetch(WORKER_URL + path, {
    headers: { 'X-Fresh-Acceptance-Token': token }
  });
  if (!response.ok) throw new Error('Artifact fetch failed HTTP ' + response.status + ' ' + path);
  return Buffer.from(await response.arrayBuffer());
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
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
    if (compression !== 0 || size !== uncompressed || dataEnd > bytes.byteLength || !(flags & 0x800)) {
      throw new Error('ZIP contains a non-canonical entry');
    }
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (entries.has(name)) throw new Error('ZIP contains duplicate entry ' + name);
    entries.set(name, bytes.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  return entries;
}

function auditFullSprint({ setup, status, research, jsonBytes, pdfBytes, zipBytes }) {
  const checks = [];
  const failures = [];
  const check = (name, passed, detail) => {
    checks.push({ name, passed: Boolean(passed), detail });
    if (!passed) failures.push(name + ': ' + detail);
  };

  let blueprint;
  try { blueprint = JSON.parse(jsonBytes.toString('utf8')); }
  catch { blueprint = null; }
  check('canonical JSON parses', Boolean(blueprint), 'Standalone canonical JSON must parse.');
  if (!blueprint) return { decision: 'FAIL', outcome: 'FULL_30_DAY_SPRINT', checks, failures };

  const entries = parseStoredZip(zipBytes);
  const names = [...entries.keys()].sort();
  check('exact 16-file ZIP manifest', names.length === 16 && names.join('\n') === EXPECTED_FILES.join('\n'),
    'ZIP must contain exactly the canonical 16 files.');
  check('ZIP JSON byte identity', Buffer.from(entries.get('ghosttown-launch-blueprint/blueprint.json') || []).equals(jsonBytes),
    'Bundled blueprint.json must equal standalone JSON byte-for-byte.');
  check('ZIP PDF byte identity', Buffer.from(entries.get('ghosttown-launch-blueprint/launch-blueprint.pdf') || []).equals(pdfBytes),
    'Bundled PDF must equal standalone PDF byte-for-byte.');
  check('PDF signature and size', pdfBytes.subarray(0, 8).toString('latin1').startsWith('%PDF-') && pdfBytes.length > 10000,
    'PDF must be a non-trivial PDF document.');

  check('fresh identity lineage',
    blueprint.orderId === setup.orderId && blueprint.sourceVerdictId === setup.verdictId && String(blueprint.ownerId).toLowerCase() === String(setup.email).toLowerCase(),
    'Blueprint must belong only to this fresh account/verdict/order.');

  const sources = Array.isArray(blueprint.sources) ? blueprint.sources : [];
  const channels = Array.isArray(blueprint.customerAccessPack?.channels) ? blueprint.customerAccessPack.channels : [];
  const customerAccess = channels.filter(channel => channel.evidenceRole === 'customer_access');
  const currentCustomerAccess = customerAccess.filter(channel =>
    channel.currentActivityStatus === 'verified_current' && channel.currentActivityVerifiedAt
  );

  check('verified research volume', sources.length >= 10 && channels.length >= 10 && channels.length <= 25,
    'Ready Sprint requires at least 10 verified research sources/channels and at most 25 delivered channels.');
  check('source truth fields', sources.length > 0 && sources.every(source =>
    /^https:\/\//.test(String(source.url || '')) &&
    String(source.title || '').trim() &&
    String(source.accessedAt || '').trim() &&
    String(source.evidenceDate || '').trim() &&
    String(source.evidenceDateSource || '').trim() &&
    Array.isArray(source.supports) && source.supports.length > 0
  ), 'Every released source must have a usable HTTPS destination, access date, evidence date/source, and supported claims.');
  check('customer access is current and actionable', currentCustomerAccess.length >= 3 && currentCustomerAccess.every(channel =>
    /^https:\/\//.test(String(channel.publicUrl || '')) &&
    String(channel.currentActivityEvidence || '').trim() &&
    (String(channel.accessPath || '').trim() || String(channel.firstAction || '').trim())
  ), 'At least three Customer Access targets must have current activity evidence and a real access/action path.');

  const roleValues = new Set(channels.map(channel => channel.evidenceRole).filter(Boolean));
  check('research roles separated',
    roleValues.has('customer_access') && [...roleValues].every(role => ['customer_access','market_evidence','partnership','media_pr'].includes(role)),
    'Channels must use the explicit Customer Access / Market Evidence / Partnership / Media-PR role model.');

  const accessUrls = new Set(currentCustomerAccess.map(channel => String(channel.publicUrl || '').replace(/\/$/, '')));
  const launchApproaches = Array.isArray(blueprint.launchCard48Hour?.firstThreeApproaches) ? blueprint.launchCard48Hour.firstThreeApproaches : [];
  check('first-buyer paths use only Customer Access',
    launchApproaches.length >= 3 && launchApproaches.every(item => accessUrls.has(String(item.publicUrl || '').replace(/\/$/, ''))),
    'The first three approaches must come only from currently verified Customer Access channels.');

  check('evidence date separated from research date', channels.every(channel =>
    String(channel.researchDate || '').trim() &&
    String(channel.evidenceDate || '').trim() &&
    String(channel.evidenceDateSource || '').trim() &&
    String(channel.currentActivityVerifiedAt || '').trim()
  ), 'Research/access timing and evidence timing must be represented separately.');

  const buyerText = [
    blueprint.offer?.targetCustomer,
    blueprint.firstRevenuePath?.firstBuyer,
    blueprint.executiveDecision?.recommendedInitialCustomer,
    blueprint.launchCard48Hour?.firstCustomer
  ].map(value => String(value || '').trim());
  check('buyer/payer chain is specific', buyerText.every(Boolean) && buyerText.every(value => /groom/i.test(value)),
    'The generated buyer chain must stay specific to independent grooming businesses rather than drift to a generic consumer lane.');

  const allText = JSON.stringify(blueprint);
  check('safe non-clinical fulfillment', !/\b(?:patient|medication|clinical|medical advice|diagnos|treat(?:ment)?)\b/i.test(allText),
    'This non-clinical idea must not drift into medical or medication fulfillment.');
  check('manual fulfillment bounded',
    String(blueprint.manualFulfillmentPlan?.expectedDeliveryTime || '').trim() &&
    String(blueprint.manualFulfillmentPlan?.estimatedFounderHours || '').trim() &&
    Array.isArray(blueprint.manualFulfillmentPlan?.intentionallyManual) &&
    blueprint.manualFulfillmentPlan.intentionallyManual.length > 0,
    'Manual fulfillment must define time/capacity boundaries instead of an unsafe or unlimited service.');

  const scripts = Array.isArray(blueprint.customerAccessPack?.outreachScripts) ? blueprint.customerAccessPack.outreachScripts : [];
  check('messages are specific and usable',
    scripts.length >= 3 && scripts.every(item => String(item.message || '').trim().length >= 40) &&
    /groom|no-show|appointment/i.test(String(blueprint.launchCard48Hour?.exactFirstMessage || '')),
    'Prepared messages must be substantial and tied to this idea/customer/problem.');

  const days = Array.isArray(blueprint.dailyCalendar) ? blueprint.dailyCalendar : [];
  check('exact 30-day plan', days.length === 30 && days.every((day, index) => Number(day.dayNumber) === index + 1),
    'Ready Sprint must contain Day 1 through Day 30 exactly once.');
  check('all 30 days actionable', days.length === 30 && days.every(day =>
    String(day.primaryObjective || '').trim() &&
    Array.isArray(day.requiredActions) && day.requiredActions.length > 0 &&
    Array.isArray(day.evidenceToRecord) && day.evidenceToRecord.length > 0 &&
    Array.isArray(day.ifThenBranches) && day.ifThenBranches.length > 0
  ), 'Every day needs an objective, actions, evidence, and branch logic.');

  const textualZip = [...entries.entries()]
    .filter(([name]) => !name.endsWith('.pdf'))
    .map(([, data]) => Buffer.from(data).toString('utf8'))
    .join('\n');
  const commercialText = allText + '\n' + textualZip;
  check('current commercial promise', commercialText.includes('$97') && commercialText.includes('$297') &&
    !commercialText.includes('$119') && !/Get My Test Live/i.test(commercialText),
    'Active artifacts must preserve Free → $97 Sprint → $297 Get Me Live and reject retired $119/Get My Test Live language.');
  check('$97 does not bundle website', !/\$97[^.\n]{0,140}(?:includes?|comes with|bundles?)[^.\n]{0,100}(?:live website|domain|publishing|payment setup)/i.test(commercialText),
    'The $97 Sprint must not promise a live website/domain/publishing/payment setup.');

  check('no stale template leakage',
    !/Longevity AI|SureDose|Family Game Night|Checkout Accessibility Audit|q2-specific-paid-pilot/i.test(commercialText),
    'Fresh output must not contain names/content from prior fixtures or earlier acceptance Sprints.');
  check('no founder placeholders',
    !/\{\{\s*founder|\[\s*founder|FOUNDER_NAME|YOUR NAME HERE/i.test(commercialText),
    'Customer-facing output must not leak unresolved founder-name placeholders.');

  const quality = blueprint.qualityGate;
  check('strategic quality gate passed', quality?.passed === true && Array.isArray(quality?.failures) && quality.failures.length === 0,
    'Ready state requires the product/strategic quality gate, not schema completeness alone.');
  check('real Workflow completed', status.workflowStatus === 'complete' && status.status === 'ready',
    'The real Cloudflare Workflow must finish and persist ready state.');

  return {
    schemaVersion: 'ghosttown-fresh-sprint-acceptance-receipt-v1',
    decision: failures.length ? 'FAIL' : 'PASS',
    outcome: 'FULL_30_DAY_SPRINT',
    ideaName: setup.ideaName,
    orderId: setup.orderId,
    verdictId: setup.verdictId,
    workflowId: setup.workflowId,
    sourceCount: sources.length,
    channelCount: channels.length,
    customerAccessCount: customerAccess.length,
    currentCustomerAccessCount: currentCustomerAccess.length,
    researchProvider: research?.provider,
    artifacts: {
      json: { bytes: jsonBytes.length, sha256: sha256(jsonBytes) },
      pdf: { bytes: pdfBytes.length, sha256: sha256(pdfBytes) },
      zip: { bytes: zipBytes.length, sha256: sha256(zipBytes), fileCount: names.length }
    },
    checks,
    failures,
    auditedAt: new Date().toISOString()
  };
}

function auditUncertainty({ setup, status }) {
  const sprint = status.uncertaintySprint;
  const failures = [];
  const checks = [];
  const check = (name, passed, detail) => {
    checks.push({ name, passed: Boolean(passed), detail });
    if (!passed) failures.push(name + ': ' + detail);
  };
  const allowed = new Set(['customer','problem','buyer_payer','current_alternative','test','commitment','fulfillment','access_path']);

  check('real Workflow completed', status.workflowStatus === 'complete', 'Workflow must complete rather than crash.');
  check('uncertainty status persisted', status.status === 'uncertainty' && sprint?.status === 'open',
    'Failed coherence must persist an open Strategic Uncertainty Sprint.');
  check('3-day uncertainty contract', sprint?.schemaVersion === 'strategic-uncertainty-sprint-v1' && sprint?.horizonDays === 3,
    'Uncertainty output must use the canonical 3-day contract.');
  check('specific unresolved links', Array.isArray(sprint?.unresolvedLinks) && sprint.unresolvedLinks.length > 0 &&
    sprint.unresolvedLinks.every(link => allowed.has(link)),
    'Uncertainty Sprint must identify concrete broken links in the eight-link chain.');
  check('questions are bounded and actionable', Array.isArray(sprint?.questions) && sprint.questions.length >= 1 &&
    sprint.questions.length <= 5 && sprint.questions.every(item =>
      allowed.has(item.link) && String(item.question || '').trim() && String(item.requiredEvidence || '').trim()),
    'Ask only the small set of evidence questions needed to resolve coherence.');
  check('unlock condition is explicit', /all eight links make sense as one chain/i.test(String(sprint?.unlockCondition || '')),
    '30-Day Sprint must stay locked until the eight-link chain is coherent.');
  check('no full artifacts manufactured', status.pointerPresent === false,
    'An uncertainty result must not manufacture JSON/PDF/ZIP as if the full Sprint passed.');

  return {
    schemaVersion: 'ghosttown-fresh-sprint-acceptance-receipt-v1',
    decision: failures.length ? 'FAIL' : 'PASS',
    outcome: 'STRATEGIC_UNCERTAINTY_SPRINT',
    ideaName: setup.ideaName,
    orderId: setup.orderId,
    verdictId: setup.verdictId,
    workflowId: setup.workflowId,
    unresolvedLinks: sprint?.unresolvedLinks || [],
    checks,
    failures,
    auditedAt: new Date().toISOString()
  };
}

function temporaryWorkerSource(token) {
  return `import app from '../src/api/worker.ts';
import { LaunchBlueprintWorkflow } from '../src/api/launchBlueprintWorkflow.ts';
import { startLaunchBlueprintWorkflow } from '../src/api/blueprintFulfillment.ts';
import { handleSignup } from '../src/api/auth.ts';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer.ts';
export { LaunchBlueprintWorkflow };

const AUTH_TOKEN = ${JSON.stringify(token)};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function authorized(request) {
  return request.headers.get('X-Fresh-Acceptance-Token') === AUTH_TOKEN;
}

async function setup(env) {
  const suffix = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  const email = 'fresh-sprint-' + suffix + '@acceptance.invalid';
  const password = 'Aa9!' + crypto.randomUUID();
  const signup = await handleSignup(new Request('https://acceptance.invalid/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }), env);
  if (signup.status !== 201) return json({ ok: false, error: 'Fresh account creation failed with HTTP ' + signup.status }, 500);

  const verdictId = 'fresh_verdict_' + suffix;
  const ideaName = 'Groomer No-Show Recovery Tune-Up';
  const targetBuyer = 'Independent dog grooming salon owners with active appointment calendars';
  const problem = 'Last-minute no-shows leave paid grooming slots empty and force owners to spend time calling or texting to refill the schedule.';
  const currentAlternative = 'Manual reminder texts and calls, cancellation policies, and last-minute waitlist outreach.';
  const verdict = {
    resultId: verdictId,
    generatedAt: now,
    idea: {
      ideaName,
      description: 'A fixed-scope no-show recovery tune-up for independent dog grooming salons: review the current reminder, cancellation, and waitlist workflow and deliver a simple playbook with scripts and a one-week measurement plan.',
      targetUser: targetBuyer,
      painfulProblem: problem,
      currentAlternative,
      motivation: 'Independent grooming salons can lose usable appointment capacity when customers miss or cancel appointments late.'
    },
    deterministicScores: {
      ghostTownScore: 3,
      ghostTownRisk: 'medium',
      leverageScore: 3,
      insightScore: 3,
      timingScore: 3,
      litScore: 3,
      litBand: 'unclear',
      highWallsScore: 2,
      highWallsBand: 'weak',
      businessDnaType: 'service',
      businessDnaTrap: 'Building automation before proving owners will pay for a bounded workflow improvement.',
      businessDnaWinStrategy: 'Sell and manually deliver one fixed-scope tune-up first.',
      finalVerdict: 'test_first',
      verdictHeadline: 'Test the no-show tune-up before building software.',
      verdictExplanation: 'The buyer, problem, safe manual service, and measurable commitment are specific, but willingness to pay still needs evidence.',
      recommendedNextTest: 'Ask qualified grooming salon owners for a paid fixed-scope tune-up.',
      doNotBuildUntil: 'At least three qualified owners discuss the problem and one makes a real commitment.',
      oneSentenceAdvice: 'Sell a bounded manual tune-up before automating anything.'
    },
    verdictDecisionV2: {
      decision: 'WORTH_TESTING',
      predictionTarget: 'Whether independent dog grooming salon owners will commit to a fixed-scope no-show recovery tune-up.',
      confidence: { level: 'MODERATE', rationale: 'The buyer, payer, problem, safe fulfillment, and first commitment are explicit; demand still needs direct evidence.' },
      customer: {
        initialCustomer: targetBuyer,
        whyThisCustomer: 'The salon owner controls the schedule, experiences the cost of empty appointment slots, and can approve a small operating-service purchase.',
        excludedBroadAudiences: ['Pet owners', 'Enterprise pet-care chains', 'General small businesses']
      },
      problem: {
        painfulProblem: problem,
        existingAlternative: currentAlternative,
        urgencyEvidence: ['A late cancellation or no-show creates an immediately visible empty appointment slot.']
      },
      offerHypothesis: {
        offer: 'A $149 fixed-scope Groomer No-Show Recovery Tune-Up: 45-minute workflow review, reminder/cancellation scripts, waitlist refill checklist, and one-week measurement sheet.',
        commitmentRequested: 'Pay $149 for one bounded tune-up.',
        priceOrCommitmentRange: '$149'
      },
      reasonsFor: ['Clear owner-buyer', 'Observable schedule problem', 'Safe manual delivery', 'Small fixed-price commitment'],
      reasonsAgainst: ['No paid customer evidence yet'],
      largestUncertainty: { assumption: 'Independent grooming salon owners will pay $149 for a bounded workflow tune-up.', whyItMatters: 'Payment is stronger evidence than interest.' },
      cheapestFalsification: {
        test: 'Contact 10 qualified independent grooming salon owners and make the transparent $149 fixed-scope offer after confirming a recent no-show problem.',
        target: '10 qualified independent grooming salon owners',
        successThreshold: 'PASS: at least 3 qualified conversations and 1 paid or deposit-backed commitment.',
        failureThreshold: 'FAIL: no qualified conversations or commitments after the controlled batch and follow-up.',
        maximumTime: '7 days',
        maximumCash: '$50'
      },
      firstAction: { action: 'Contact the first three qualified grooming salon owners through verified customer-access paths.', preparedAssetRequired: true },
      whatWouldChangeTheVerdict: ['One paid $149 tune-up', 'Three qualified owners reporting the same recent no-show problem'],
      evidenceLabels: [{ statement: 'The proposed $149 price is a test hypothesis, not proven willingness to pay.', truthLabel: 'INFERRED' }]
    },
    usedAI: false,
    cacheHit: false,
    answers: {}
  };

  await env.KV.put('user_result_' + email + '_' + verdictId, JSON.stringify(verdict));

  const orderId = 'gtt_fresh_' + suffix;
  const seeds = [
    { seedId: 'seed_moego_' + suffix, name: 'MoeGo', website: 'https://www.moego.pet/', domain: 'moego.pet', relationship: 'adjacent_product', origin: 'customer_confirmed', reason: 'Pet grooming business software with booking and reminder workflows.', verifiedAt: now },
    { seedId: 'seed_gingr_' + suffix, name: 'Gingr', website: 'https://www.gingrapp.com/', domain: 'gingrapp.com', relationship: 'adjacent_product', origin: 'customer_confirmed', reason: 'Pet-care operations software with scheduling and reminders.', verifiedAt: now },
    { seedId: 'seed_daysmart_' + suffix, name: 'DaySmart Pet', website: 'https://www.daysmartpet.com/', domain: 'daysmartpet.com', relationship: 'adjacent_product', origin: 'customer_confirmed', reason: 'Pet business scheduling and reminder software.', verifiedAt: now }
  ];

  const order = {
    orderId,
    email,
    verdictId,
    stripeCheckoutSessionId: 'acceptance_synthetic_' + suffix,
    stripeMode: 'test',
    stripeEventId: 'acceptance_fresh_' + suffix,
    status: 'paid',
    artifactType: 'launch_blueprint_v2',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: GHOSTTOWN_30_DAY_PLAN_V1.version,
    planVersion: '2.0',
    intake: {
      verdictId,
      targetBuyer,
      geography: 'United States',
      problem,
      currentWorkaround: currentAlternative,
      offerHypothesis: 'A $149 fixed-scope no-show recovery tune-up with a 45-minute workflow review, scripts, waitlist refill checklist, and one-week measurement sheet.',
      expectedPrice: '$149',
      currentStage: 'New service idea with no paid customers yet',
      competitorLinks: seeds.map(seed => seed.website),
      competitorSeeds: seeds,
      customerNotes: 'The salon owner is the buyer and payer. The test is non-clinical, does not handle animals, and does not promise a specific revenue or no-show reduction.',
      researchSignals: {
        schemaVersion: 'pre-purchase-research-signals-v1',
        resultId: verdictId,
        targetCustomer: targetBuyer,
        origin: 'free_verdict',
        verificationStatus: 'unverified',
        audience: { type: 'audience', value: 'professional dog groomer communities and independent grooming salon owner groups', source: 'user_typed', verificationStatus: 'unverified' },
        ecosystem: { type: 'ecosystem', value: 'pet grooming business software, grooming associations, and groomer education communities', source: 'user_typed', verificationStatus: 'unverified' },
        updatedAt: now
      }
    },
    createdAt: now,
    updatedAt: now,
    paidAt: now
  };

  await env.KV.put('paid_test_order_' + orderId, JSON.stringify(order));
  const started = await startLaunchBlueprintWorkflow(env, orderId, 'fresh_acceptance_' + suffix);

  return json({
    ok: true,
    accountCreated: true,
    email,
    verdictId,
    orderId,
    workflowId: started.workflowId,
    ideaName,
    createdAt: now,
    syntheticStripePayment: true,
    realWorkflow: true
  });
}

async function status(env, orderId) {
  const raw = await env.KV.get('paid_test_order_' + orderId);
  if (!raw) return json({ ok: false, error: 'Fresh order not found' }, 404);
  const order = JSON.parse(raw);
  let workflowStatus = 'unavailable';
  if (order.fulfillmentWorkflowId) {
    try {
      const instance = await env.LAUNCH_BLUEPRINT_WORKFLOW.get(order.fulfillmentWorkflowId);
      workflowStatus = (await instance.status())?.status || 'unavailable';
    } catch {}
  }
  const pointer = await env.KV.get('paid_test_blueprint_pointer_' + orderId);
  return json({
    ok: true,
    status: order.status,
    workflowStatus,
    fulfillmentError: order.fulfillmentError || null,
    fulfillmentAttemptCount: order.fulfillmentAttemptCount || 0,
    uncertaintySprint: order.uncertaintySprint || null,
    pointerPresent: Boolean(pointer)
  });
}

async function artifact(env, orderId, kind) {
  const raw = await env.KV.get('paid_test_blueprint_pointer_' + orderId);
  if (!raw) return new Response('Artifact pointer not found', { status: 404 });
  const pointer = JSON.parse(raw);
  const key = kind === 'json' ? pointer.jsonR2Key : kind === 'pdf' ? pointer.pdfR2Key : kind === 'zip' ? pointer.assetsR2Key : '';
  if (!key) return new Response('Unknown artifact kind', { status: 400 });
  const object = await env.BLUEPRINTS.get(key);
  if (!object) return new Response('Artifact not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(object.body, { headers });
}

async function research(env, orderId) {
  const row = await env.DB.prepare('SELECT research_receipt_json FROM launch_blueprints WHERE order_id = ?').bind(orderId).first();
  if (!row || typeof row.research_receipt_json !== 'string') return json({ ok: false, error: 'Research receipt not found' }, 404);
  return new Response(row.research_receipt_json, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/__fresh-acceptance/')) {
      if (env.DEPLOYMENT_ENV !== 'acceptance') return new Response('Not found', { status: 404 });
      if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
      if (url.pathname === '/__fresh-acceptance/setup' && request.method === 'POST') return setup(env);
      if (url.pathname === '/__fresh-acceptance/status' && request.method === 'GET') return status(env, url.searchParams.get('order_id') || '');
      if (url.pathname === '/__fresh-acceptance/research' && request.method === 'GET') return research(env, url.searchParams.get('order_id') || '');
      if (url.pathname === '/__fresh-acceptance/artifact' && request.method === 'GET') return artifact(env, url.searchParams.get('order_id') || '', url.searchParams.get('kind') || '');
      return new Response('Not found', { status: 404 });
    }
    return app.fetch(request, env, ctx);
  }
};
`;
}

mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(EVIDENCE_DIR, { recursive: true });
const token = randomBytes(32).toString('hex');
writeFileSync(ENTRY, temporaryWorkerSource(token), 'utf8');

let temporaryDeployed = false;
let finalReceipt = null;
let setup = null;
let terminalStatus = null;

try {
  const deployLog = runWrangler(['deploy', '.fresh-acceptance/fresh-sprint-entry.ts', '--env', 'acceptance']);
  temporaryDeployed = true;
  writeFileSync(join(EVIDENCE_DIR, 'temporary-deploy.log'), deployLog, 'utf8');

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      setup = await fetchJson('/__fresh-acceptance/setup', token, { method: 'POST', body: '{}' });
      break;
    } catch (error) {
      if (attempt === 10) throw error;
      await sleep(1800 * attempt);
    }
  }
  writeFileSync(join(EVIDENCE_DIR, 'fresh-setup.json'), JSON.stringify(setup, null, 2) + '\n', 'utf8');

  const startedAt = Date.now();
  const timeoutMs = 22 * 60 * 1000;
  while (Date.now() - startedAt < timeoutMs) {
    const status = await fetchJson('/__fresh-acceptance/status?order_id=' + encodeURIComponent(setup.orderId), token);
    terminalStatus = status;
    writeFileSync(join(EVIDENCE_DIR, 'latest-status.json'), JSON.stringify(status, null, 2) + '\n', 'utf8');
    console.log('[fresh-acceptance] status=' + status.status + ' workflow=' + status.workflowStatus);
    if (['ready', 'uncertainty', 'failed'].includes(status.status)) break;
    await sleep(20000);
  }

  if (!terminalStatus || !['ready', 'uncertainty', 'failed'].includes(terminalStatus.status)) {
    throw new Error('Fresh acceptance Workflow did not reach a terminal product state within 22 minutes.');
  }
  if (terminalStatus.status === 'failed') {
    throw new Error('Fresh acceptance Workflow failed: ' + (terminalStatus.fulfillmentError || 'unknown failure'));
  }

  if (terminalStatus.status === 'uncertainty') {
    finalReceipt = auditUncertainty({ setup, status: terminalStatus });
    writeFileSync(join(EVIDENCE_DIR, 'uncertainty-sprint.json'), JSON.stringify(terminalStatus.uncertaintySprint, null, 2) + '\n', 'utf8');
  } else {
    const [jsonBytes, pdfBytes, zipBytes, research] = await Promise.all([
      fetchBytes('/__fresh-acceptance/artifact?order_id=' + encodeURIComponent(setup.orderId) + '&kind=json', token),
      fetchBytes('/__fresh-acceptance/artifact?order_id=' + encodeURIComponent(setup.orderId) + '&kind=pdf', token),
      fetchBytes('/__fresh-acceptance/artifact?order_id=' + encodeURIComponent(setup.orderId) + '&kind=zip', token),
      fetchJson('/__fresh-acceptance/research?order_id=' + encodeURIComponent(setup.orderId), token)
    ]);
    writeFileSync(join(EVIDENCE_DIR, 'canonical-blueprint.json'), jsonBytes);
    writeFileSync(join(EVIDENCE_DIR, 'launch-blueprint.pdf'), pdfBytes);
    writeFileSync(join(EVIDENCE_DIR, 'launch-blueprint-assets.zip'), zipBytes);
    writeFileSync(join(EVIDENCE_DIR, 'research-receipt.json'), JSON.stringify(research, null, 2) + '\n', 'utf8');
    finalReceipt = auditFullSprint({ setup, status: terminalStatus, research, jsonBytes, pdfBytes, zipBytes });
  }
} catch (error) {
  finalReceipt = {
    schemaVersion: 'ghosttown-fresh-sprint-acceptance-receipt-v1',
    decision: 'FAIL',
    outcome: 'HARNESS_OR_WORKFLOW_FAILURE',
    error: error instanceof Error ? error.message : String(error),
    orderId: setup?.orderId || null,
    verdictId: setup?.verdictId || null,
    auditedAt: new Date().toISOString()
  };
} finally {
  let restoreError = null;
  if (temporaryDeployed) {
    try {
      const restoreLog = runWrangler(['deploy', '--env', 'acceptance']);
      writeFileSync(join(EVIDENCE_DIR, 'canonical-restore.log'), restoreLog, 'utf8');
    } catch (error) {
      restoreError = error instanceof Error ? error.message : String(error);
    }
  }
  rmSync(TEMP_DIR, { recursive: true, force: true });
  if (restoreError) {
    finalReceipt = {
      ...(finalReceipt || {}),
      decision: 'FAIL',
      restoreError
    };
  }
  writeFileSync(join(EVIDENCE_DIR, 'final-acceptance-receipt.json'), JSON.stringify(finalReceipt, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify(finalReceipt, null, 2));
if (finalReceipt?.decision !== 'PASS') process.exitCode = 1;
