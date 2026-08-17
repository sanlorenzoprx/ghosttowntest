import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import type {
  ActionItem,
  DayTask,
  DecisionRule,
  EvidenceRequirement,
  ExecutionPlan30Day,
  PaidArtifactType,
  PaidTestIntake,
  PaidTestOrder,
  PaidTestReport,
  PlanPhase,
  ReportClaim,
  StripeMode,
  TruthLabel,
  TruthLabeledClaim,
  WeeklyCheckpoint
} from '../types/paidTest';
import type { PrePurchaseResearchSignals, ResearchSignalType } from '../types/researchSignals';
import {
  DEFAULT_30_DAY_PLAN_DISPLAY_PRICE,
  GHOSTTOWN_30_DAY_PLAN_V1,
  LEGACY_7_DAY_PLAN_LABEL
} from '../lib/ghosttownOffer';

const LEGACY_REPORT_VERSION = '1.0' as const;
const PLAN_VERSION = '1.0' as const;
const GENERATOR_VERSION = 'deterministic-30day-v1.0' as const;
const json = (body: unknown, status = 200, extra: HeadersInit = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
const orderKey = (id: string) => `paid_test_order_${id}`;
const reportKey = (id: string) => `paid_test_report_${id}`;
const planKey = (id: string) => `paid_test_plan_${id}`;
const userOrdersKey = (email: string) => `paid_test_orders_${email.trim().toLowerCase()}`;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function claim(label: TruthLabel, text: string): ReportClaim {
  return { label, text };
}

function truth(label: TruthLabel, text: string): TruthLabeledClaim {
  return { label, text };
}

function validIntake(value: Partial<PaidTestIntake>): value is PaidTestIntake {
  const verdictId = typeof value.verdictId === 'string' ? value.verdictId.trim() : '';
  const targetBuyer = typeof value.targetBuyer === 'string' ? value.targetBuyer.trim() : '';
  if (!Boolean(verdictId && targetBuyer && value.problem?.trim() && value.currentWorkaround?.trim())) return false;
  return !value.researchSignals || validResearchSignals(value.researchSignals, verdictId, targetBuyer);
}

function validResearchSignals(value: PrePurchaseResearchSignals, verdictId: string, targetBuyer: string): boolean {
  if (
    value.schemaVersion !== 'pre-purchase-research-signals-v1'
    || value.resultId !== verdictId
    || value.targetCustomer.trim() !== targetBuyer
    || value.origin !== 'free_verdict'
    || !['unverified', 'provider_candidate', 'verified'].includes(value.verificationStatus)
  ) return false;
  for (const type of ['commercial', 'audience', 'ecosystem'] as ResearchSignalType[]) {
    const signal = value[type];
    if (!signal) continue;
    if (
      signal.type !== type
      || !signal.value?.trim()
      || signal.value.length > 160
      || !['user_typed', 'suggestion', 'not_sure'].includes(signal.source)
      || !['unverified', 'provider_candidate', 'verified'].includes(signal.verificationStatus)
    ) return false;
    if (signal.publicUrl) {
      try {
        const url = new URL(signal.publicUrl);
        if (url.protocol !== 'https:' || url.username || url.password) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

function normalizedResearchSignals(value: PrePurchaseResearchSignals | undefined): PrePurchaseResearchSignals | undefined {
  if (!value) return undefined;
  const normalized = { ...value, updatedAt: new Date().toISOString() };
  for (const type of ['commercial', 'audience', 'ecosystem'] as ResearchSignalType[]) {
    const signal = normalized[type];
    if (!signal) continue;
    normalized[type] = {
      ...signal,
      value: signal.value.replace(/\s+/g, ' ').trim(),
      publicUrl: signal.publicUrl?.trim()
    };
  }
  return normalized;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function inferStripeMode(secretKey?: string): StripeMode {
  return secretKey?.startsWith('sk_live_') ? 'live' : 'test';
}

function configuredPlanPriceId(env: Env): string {
  // New checkouts must never fall back to a legacy assessment/report price.
  return env.STRIPE_30_DAY_PLAN_PRICE_ID?.trim() || '';
}

function safeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

async function savedVerdict(env: Env, verdictId: string, email?: string): Promise<EvaluationResult | null> {
  const normalizedEmail = email ? normalizeEmail(email) : '';
  const raw = await env.KV.get(`verdict_${verdictId}`)
    ?? await env.KV.get(`verdict:${verdictId}`)
    ?? (normalizedEmail ? await env.KV.get(`user_result_${normalizedEmail}_${verdictId}`) : null);
  return raw ? hydrateEvaluationResultDecisionV2(JSON.parse(raw) as EvaluationResult) : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

function deterministicHash(value: unknown): string {
  const text = typeof value === 'string' ? value : stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function handlePaidTestCheckout(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    console.warn('Paid checkout rejected: authentication required');
    return json({ error: 'Please log in again before checkout' }, 401);
  }

  const intake = await request.json<Partial<PaidTestIntake>>();
  if (!validIntake(intake)) {
    console.warn('Paid checkout rejected: incomplete intake');
    return json({ error: 'Complete all required 30-day plan fields' }, 400);
  }

  const verdict = await savedVerdict(env, intake.verdictId, auth.email);
  if (!verdict) {
    console.warn('Paid checkout rejected: source verdict not found', intake.verdictId);
    return json({ error: 'This assessment must be saved before checkout. Reopen it from Dashboard and try again.' }, 404);
  }

  const stripePriceId = configuredPlanPriceId(env);
  if (!stripePriceId) {
    console.error('Paid checkout rejected: missing 30-day plan Stripe price configuration');
    return json({ error: 'Checkout is not configured for the 30-day plan yet' }, 503);
  }

  const now = new Date().toISOString();
  const order: PaidTestOrder = {
    orderId: id('gtt'),
    email: normalizeEmail(auth.email),
    verdictId: intake.verdictId,
    status: 'pending',
    artifactType: 'execution_plan_30day_v1',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: GHOSTTOWN_30_DAY_PLAN_V1.version,
    planVersion: PLAN_VERSION,
    reportVersion: LEGACY_REPORT_VERSION,
    stripePriceId,
    stripeMode: inferStripeMode(env.STRIPE_SECRET_KEY),
    idempotencyKey: id('idem'),
    intake: {
      ...intake,
      targetBuyer: intake.targetBuyer.trim(),
      problem: intake.problem.trim(),
      currentWorkaround: intake.currentWorkaround.trim(),
      offerHypothesis: intake.offerHypothesis?.trim(),
      expectedPrice: intake.expectedPrice?.trim(),
      competitorLinks: intake.competitorLinks?.map(item => item.trim()).filter(Boolean),
      researchSignals: normalizedResearchSignals(intake.researchSignals)
    },
    createdAt: now,
    updatedAt: now
  };

  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));

  const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  const fields = new URLSearchParams({
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    customer_email: order.email,
    client_reference_id: order.orderId,
    'metadata[paid_test_order_id]': order.orderId,
    'metadata[owner_id]': order.email,
    'metadata[offer_id]': GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    'metadata[offer_version]': GHOSTTOWN_30_DAY_PLAN_V1.version,
    'metadata[offer_amount_cents]': String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents),
    'metadata[offer_currency]': GHOSTTOWN_30_DAY_PLAN_V1.currency,
    'metadata[plan_version]': PLAN_VERSION,
    'metadata[stripe_price_id]': stripePriceId,
    'metadata[fulfillment_type]': 'execution_plan_30day_v1',
    success_url: `${frontendUrl}/paid-test/success?order_id=${encodeURIComponent(order.orderId)}`,
    cancel_url: `${frontendUrl}/`
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fields.toString()
  });

  if (!response.ok) {
    const stripeError = await response.text();
    console.error('Paid checkout Stripe rejection', response.status, stripeError);
    await env.KV.delete(orderKey(order.orderId));
    return json({ error: 'Stripe rejected the 30-day plan checkout configuration. Confirm the price mode and STRIPE_30_DAY_PLAN_PRICE_ID.' }, 502);
  }

  const session = await response.json() as { id: string; url: string };
  order.stripeCheckoutSessionId = session.id;
  order.status = 'checkout_created';
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(order.orderId), JSON.stringify(order));
  await savePaidOrderSummary(env, order, verdict.idea.ideaName);
  return json({ sessionUrl: session.url, orderId: order.orderId, offerId: order.offerId });
}

export function createPaidTestReport(order: PaidTestOrder, verdict: EvaluationResult): PaidTestReport {
  const decision = hydrateEvaluationResultDecisionV2(verdict).verdictDecisionV2!;
  const buyer = order.intake.targetBuyer;
  const problem = order.intake.problem;
  const workaround = order.intake.currentWorkaround;
  const price = order.intake.expectedPrice?.trim() || 'a founder-set price before the first ask';
  const headline = `${buyer} can address ${problem} without relying on ${workaround}.`;
  const sections: PaidTestReport['sections'] = [
    { title: 'Idea Summary', claims: [claim('Inferred', `${verdict.idea.ideaName}: ${verdict.idea.description}`), claim('Inferred', `Canonical first action: ${decision.firstAction.action}`)] },
    { title: 'LIT Verdict Summary', claims: [claim('Inferred', `Decision: ${decision.decision.replace(/_/g, ' ')}.`), claim('Inferred', decision.confidence.rationale)] },
    { title: 'Buyer Segment', claims: [claim('Inferred', `Start with one narrow segment: ${buyer}.`), claim('Test', `Confirm this segment can name a recent instance of ${problem} and has authority or access to the decision maker.`)] },
    { title: 'Buyer Interview Kit', claims: [
      claim('Test', 'Tell me about the last time this happened.'), claim('Test', 'What triggered you to solve it, and what did you try first?'), claim('Test', `What are you using today instead of a better way to handle ${problem}?`), claim('Test', `What is frustrating or costly about ${workaround}?`), claim('Test', 'Who approves spending for this?'), claim('Test', 'Have you paid for a solution before?'), claim('Test', 'What would need to be true for you to switch?'), claim('Test', `Would you test a paid pilot at ${price}? Why or why not?`),
      claim('Test', `Outreach: I am researching how ${buyer} handle ${problem}. I am not selling anything; could I ask about the last time you dealt with it?`),
      claim('Test', 'Recruit people who experienced the problem recently; disqualify people who cannot describe a real past workflow.')
    ] },
    { title: 'Alternatives and Workarounds', claims: [claim('Inferred', `Current workaround supplied in intake: ${workaround}.`), claim('Test', 'Direct competitors: record only products or services named by buyers or supplied links.'), claim('Test', 'Indirect alternatives: record tools that solve only part of the job.'), claim('Test', 'Do nothing: document the consequence buyers describe if nothing changes.'), claim('Test', 'Switching friction: test cost, trust, time, migration, training, habit, and approval friction.'), claim('Test', 'Differentiation: confirm why a buyer would choose this offer over the named alternative.') ] },
    { title: 'Landing-Page Test Copy', claims: [claim('Inferred', `Headline: ${headline}`), claim('Inferred', `Subheadline: A focused offer for ${buyer} tired of ${problem}.`), claim('Inferred', `Offer: Get a clearer path through ${problem} with a focused pilot instead of ${workaround}.`), claim('Inferred', `Price: Founding pilot ${price}.`), claim('Test', 'CTA: Apply for a pilot. Track landing page viewed, CTA clicked, email captured, pilot requested, checkout started, and deposit paid.') ] },
    { title: 'Offer and Price Hypothesis', claims: [claim('Inferred', `Buyer: ${buyer}. Pain: ${problem}.`), claim('Inferred', `Starter promise: reduce the uncertainty or burden of ${problem} through a narrowly scoped pilot.`), claim('Inferred', `Launch price: ${price}. Define three to five deliverables and what is not included before asking.`), claim('Test', `Ask five qualified buyers for ${price} and five for a higher price. Record objections verbatim; count deposits, pilots, or scheduled serious sales calls, not compliments.`) ] },
    { title: 'Seven-Day Validation Plan', claims: [
      claim('Test', 'Day 0: choose one buyer, problem, offer, and price; write a one-page test brief.'), claim('Test', 'Day 1: list 25 qualified prospects and send 10 outreach messages; pass is 3 replies or 2 booked conversations.'), claim('Test', 'Day 2: run 2 interviews; capture exact language and current workaround.'), claim('Test', 'Day 3: publish the paid offer with tracking; fix clarity before buying traffic.'), claim('Test', 'Day 4: ask 5 qualified buyers for a paid pilot, deposit, or commitment.'), claim('Test', 'Day 5: run 3 more interviews; summarize repeating job, urgency, alternative, and objection.'), claim('Test', 'Day 6: follow up and ask for a commitment; count access, deposit, pilot agreement, or scheduled next step.'), claim('Test', 'Day 7: Continue for repeated pain plus meaningful commitment; Pivot if pain exists but segment, offer, price, or channel is wrong; Stop if there is no urgent problem, buyer access, or commitment.')
    ] },
    { title: 'Evidence Scoreboard and Limitations', claims: [claim('Test', 'Strong evidence: paid deposit, paid pilot, signed agreement, access/data/time, or an introduction to a decision maker.'), claim('Test', 'Medium evidence: serious sales call, buying-process objection, proposal, or trial request.'), claim('Test', 'Weak evidence: likes, compliments, generic waitlist signups, or friends saying they would use it.'), claim('Verified', 'This report contains no customer quotes, competitor features, market size, search demand, sales evidence, or citations unless supplied and independently verified.'), claim('Inferred', 'This is a validation experiment, not a promise of product-market fit, revenue, investor readiness, or certainty.') ] }
  ];
  const report: PaidTestReport = { reportId: id('report'), orderId: order.orderId, reportVersion: LEGACY_REPORT_VERSION, createdAt: new Date().toISOString(), verdict: { resultId: verdict.resultId, idea: verdict.idea, deterministicScores: verdict.deterministicScores, generatedAt: verdict.generatedAt }, sections, qualityGate: { passed: false, failures: [] }, generationReceipt: { sourceVerdictId: verdict.resultId, generatedAt: new Date().toISOString(), reportVersion: LEGACY_REPORT_VERSION } };
  report.qualityGate = legacyQualityGate(report);
  return report;
}

export function legacyQualityGate(report: PaidTestReport): { passed: boolean; failures: string[] } {
  const required = ['Buyer Interview Kit', 'Alternatives and Workarounds', 'Landing-Page Test Copy', 'Offer and Price Hypothesis', 'Seven-Day Validation Plan', 'Evidence Scoreboard and Limitations'];
  const failures = required.filter(title => !report.sections.some(section => section.title === title && section.claims.length > 0)).map(title => `Missing ${title}`);
  if (!report.sections.flatMap(section => section.claims).some(item => item.label === 'Test')) failures.push('No test-labelled claims');
  if (!report.generationReceipt.sourceVerdictId) failures.push('Missing source verdict receipt');
  return { passed: failures.length === 0, failures };
}

export const qualityGate = legacyQualityGate;

const phases: PlanPhase[] = [
  { phaseId: 'buyer-problem-evidence', title: 'Buyer and problem evidence', dayStart: 1, dayEnd: 7, objective: 'Confirm the buyer, problem, urgency, and access path before building.' },
  { phaseId: 'alternatives-offer-pricing', title: 'Alternatives, offer, and pricing hypothesis', dayStart: 8, dayEnd: 11, objective: 'Map current alternatives and turn the verdict into a narrow paid pilot hypothesis.' },
  { phaseId: 'landing-tracking-fulfillment', title: 'Landing page, tracking, and manual fulfillment path', dayStart: 12, dayEnd: 15, objective: 'Create a simple measurable path from interest to manual delivery.' },
  { phaseId: 'outreach-paid-pilot', title: 'Outreach and first paid-pilot attempt', dayStart: 16, dayEnd: 19, objective: 'Ask qualified buyers for a commitment instead of collecting compliments.' },
  { phaseId: 'deliver-evidence', title: 'Deliver a narrow result and collect customer evidence', dayStart: 20, dayEnd: 23, objective: 'Manually deliver value and record what customers actually do or say.' },
  { phaseId: 'improve-operations', title: 'Improve offer, onboarding, and operational steps', dayStart: 24, dayEnd: 26, objective: 'Reduce delivery friction using only evidence from the first pilot attempt.' },
  { phaseId: 'second-test-economics', title: 'Second acquisition test and unit-economics check', dayStart: 27, dayEnd: 28, objective: 'Run a second channel test and check whether delivery math can work.' },
  { phaseId: 'decision', title: 'Continue, pivot, pause, or stop decision', dayStart: 29, dayEnd: 29, objective: 'Make the next move based on observed evidence.' },
  { phaseId: 'roadmap', title: 'Produce the next 30-day roadmap', dayStart: 30, dayEnd: 30, objective: 'Convert what was learned into the next evidence plan.' }
];

function phaseForDay(dayNumber: number): PlanPhase {
  const phase = phases.find(item => dayNumber >= item.dayStart && dayNumber <= item.dayEnd);
  if (!phase) throw new Error(`No phase configured for day ${dayNumber}`);
  return phase;
}

function action(actionId: string, description: string, quantity: string, truthLabel: TruthLabel = 'Test'): ActionItem {
  return { actionId, description, quantity, truthLabel };
}

function evidence(evidenceId: string, description: string, minimumQuantity: string, truthLabel: TruthLabel = 'Test'): EvidenceRequirement {
  return { evidenceId, description, minimumQuantity, truthLabel };
}

function buildDay(dayNumber: number, title: string, objective: string, whyItMatters: string, actions: ActionItem[], requiredEvidence: EvidenceRequirement[], passThreshold: string, failThreshold: string, expectedArtifacts: string[], options: { timeBudgetMinutes?: number; cashBudget?: number; risks?: TruthLabeledClaim[]; passRoute?: string; failRoute?: string } = {}): DayTask {
  const phase = phaseForDay(dayNumber);
  return {
    dayNumber,
    phaseId: phase.phaseId,
    title,
    objective,
    whyItMatters,
    actions,
    timeBudgetMinutes: options.timeBudgetMinutes ?? 90,
    cashBudget: { currency: 'USD', maximumAmount: options.cashBudget ?? 0 },
    requiredEvidence,
    passThreshold,
    failThreshold,
    expectedArtifacts,
    risksAndWarnings: options.risks ?? [truth('Inferred', 'Treat positive comments as weak evidence until they create buyer action.')],
    nextRouteOnPass: options.passRoute ?? 'Continue to the next daily evidence task.',
    nextRouteOnFail: options.failRoute ?? 'Record what failed, tighten the buyer/problem hypothesis, and continue with the next task.'
  };
}

export function createExecutionPlan30Day(order: PaidTestOrder, verdict: EvaluationResult): ExecutionPlan30Day {
  const decision = hydrateEvaluationResultDecisionV2(verdict).verdictDecisionV2!;
  const buyer = safeText(order.intake.targetBuyer, verdict.idea.targetUser || 'the intended buyer');
  const problem = safeText(order.intake.problem, verdict.idea.painfulProblem || 'the stated problem');
  const workaround = safeText(order.intake.currentWorkaround, verdict.idea.currentAlternative || 'the current workaround');
  const offerHypothesis = safeText(order.intake.offerHypothesis, `A narrow manual pilot that helps ${buyer} make progress on ${problem}.`);
  const priceHypothesis = safeText(order.intake.expectedPrice, 'A test price supplied by the founder or discovered during interviews');
  const ideaName = safeText(verdict.idea.ideaName, 'Untitled startup idea');
  const ideaDescription = safeText(verdict.idea.description, 'No description supplied.');
  const recommendedNextTest = decision.cheapestFalsification.test;
  const now = order.paidAt ?? order.updatedAt ?? order.createdAt;
  const normalizedInput = {
    verdictId: verdict.resultId,
    orderId: order.orderId,
    ownerId: order.email,
    idea: verdict.idea,
    deterministicScores: verdict.deterministicScores,
    intake: order.intake,
    generatorVersion: GENERATOR_VERSION
  };
  const inputHash = deterministicHash(normalizedInput);

  const assumptions: TruthLabeledClaim[] = [
    truth('Inferred', `The first buyer segment to test is ${buyer}.`),
    truth('Inferred', `The highest-priority problem to validate is ${problem}.`),
    truth('Inferred', `The current workaround to compare against is ${workaround}.`),
    truth('Test', `The initial price hypothesis is ${priceHypothesis}; buyers must confirm or reject it through behavior.`)
  ];
  if (!order.intake.offerHypothesis?.trim()) assumptions.push(truth('Inferred', 'The offer hypothesis was generated from the verdict and intake because the founder did not supply one.'));
  if (!order.intake.expectedPrice?.trim()) assumptions.push(truth('Test', 'The plan uses a test-price task because the founder did not supply a concrete price.'));
  if (order.intake.customerNotes?.trim()) assumptions.push(truth('Verified', `Founder-supplied constraint or note: ${order.intake.customerNotes.trim()}`));

  const limitations: TruthLabeledClaim[] = [
    truth('Verified', 'This plan is derived from the submitted verdict and founder intake only.'),
    truth('Verified', 'No customer quotes, competitor facts, market size, search demand, citations, or sales evidence are included unless the founder supplied them.'),
    truth('Inferred', 'The plan is an evidence-gathering workflow, not a guarantee of revenue, funding, product-market fit, or investment readiness.'),
    truth('Test', 'Every recommendation should be treated as a test until observable buyer behavior supports it.')
  ];

  const days: DayTask[] = [
    buildDay(1, 'Write the evidence brief', `Turn ${ideaName} into one buyer/problem/test brief.`, 'A written brief prevents the next 29 days from drifting into vague validation work.', [
      action('d1-a1', `Write one paragraph describing ${buyer}, ${problem}, and ${workaround}.`, '1 brief'),
      action('d1-a2', `Copy the verdict next test into the brief: ${recommendedNextTest}`, '1 next-test statement'),
      action('d1-a3', 'List the riskiest assumption that would make this idea a ghost town.', '1 risk')
    ], [
      evidence('d1-e1', 'A one-page evidence brief with buyer, problem, workaround, offer, price, and risk.', '1 completed brief')
    ], 'The brief names one buyer, one problem, one workaround, one offer, and one measurable risk.', 'The brief still describes a broad audience or a vague problem.', ['Evidence brief v1']),
    buildDay(2, 'Define qualified buyers', `Create a qualification checklist for ${buyer}.`, 'Outreach quality matters more than volume when the evidence target is paid demand.', [
      action('d2-a1', 'Write five qualification criteria that prove someone fits the buyer segment.', '5 criteria'),
      action('d2-a2', 'Write three disqualifiers that keep the test narrow.', '3 disqualifiers'),
      action('d2-a3', 'Create a spreadsheet or CRM list with required columns for source, contact, status, notes, and evidence.', '1 tracking sheet')
    ], [
      evidence('d2-e1', 'Buyer qualification checklist and tracking sheet.', '1 checklist and 1 sheet')
    ], 'A stranger could use the checklist and pick the same target buyers.', 'The checklist admits anyone who might casually like the idea.', ['Buyer qualification checklist', 'Prospect tracker']),
    buildDay(3, 'Build the first prospect list', `Find reachable people who match ${buyer}.`, 'The idea cannot produce evidence without real access to the people who might pay.', [
      action('d3-a1', 'Find qualified prospects from existing network, communities, directories, LinkedIn, local businesses, or niche groups.', '30 prospects'),
      action('d3-a2', 'Mark the source and reason each prospect qualifies.', '30 qualification notes'),
      action('d3-a3', 'Remove prospects who do not show a plausible current need for the problem.', 'Review all rows')
    ], [
      evidence('d3-e1', 'Prospect list with source and qualification notes.', '30 rows')
    ], 'At least 25 prospects clearly match the checklist.', 'Fewer than 15 prospects can be found without changing the buyer definition.', ['Qualified prospect list'], { timeBudgetMinutes: 120 }),
    buildDay(4, 'Run discovery outreach', `Ask ${buyer} about the last time they dealt with ${problem}.`, 'Discovery starts with lived behavior, not a pitch for the product.', [
      action('d4-a1', `Send a short non-sales message asking about the last time ${buyer} dealt with ${problem}.`, '12 messages'),
      action('d4-a2', 'Track sent, opened/replied if known, booked, declined, and no response.', '12 status updates'),
      action('d4-a3', 'Save exact wording that gets any reply.', 'All replies')
    ], [
      evidence('d4-e1', 'Outreach log with timestamps and reply status.', '12 logged contacts')
    ], 'At least 3 replies or 2 booked conversations.', 'No replies and no clear reason why the segment is reachable.', ['Outreach message v1', 'Outreach log']),
    buildDay(5, 'Interview for recent behavior', `Interview buyers about ${problem} and ${workaround}.`, 'Recent behavior is stronger than opinions about a hypothetical product.', [
      action('d5-a1', 'Run buyer interviews focused on the last real occurrence of the problem.', '2 interviews'),
      action('d5-a2', `Ask what they used instead of a better solution, including ${workaround}.`, '2 workaround notes'),
      action('d5-a3', 'Record exact phrases, triggers, costs, delays, and who approves spending.', '2 interview notes')
    ], [
      evidence('d5-e1', 'Interview notes with exact buyer language and current workaround.', '2 notes')
    ], 'Both interviews describe a recent painful workflow and a real workaround.', 'Interviewees cannot recall a recent instance or consequence.', ['Interview notes batch 1'], { timeBudgetMinutes: 120 }),
    buildDay(6, 'Score pain and urgency', `Separate real urgency from curiosity for ${problem}.`, 'A ghost town often looks active until the buyer has to spend time, money, or reputation.', [
      action('d6-a1', 'Score each interview for urgency, current spend/time cost, decision access, and switching friction.', '2 scored interviews'),
      action('d6-a2', 'Write the top three repeating pain signals and top three objections.', '6 bullets'),
      action('d6-a3', 'Update the evidence brief with what is verified versus inferred.', '1 updated brief')
    ], [
      evidence('d6-e1', 'Pain/urgency scorecard tied to interview notes.', '1 scorecard')
    ], 'At least one buyer shows urgent pain and a plausible spending path.', 'Pain is mostly aspirational, occasional, or owned by someone unreachable.', ['Pain and urgency scorecard']),
    buildDay(7, 'Decide whether the buyer/problem pair survives', `Use first-week evidence to decide if ${buyer} and ${problem} remain the target.`, 'The second week should only refine a buyer/problem pair that still deserves testing.', [
      action('d7-a1', 'Review prospect access, reply rate, interview quality, pain, current workaround, and spending path.', '1 review'),
      action('d7-a2', 'Choose continue, narrow, or revise the buyer/problem pair for week two.', '1 decision'),
      action('d7-a3', 'Write the revised buyer/problem statement in one sentence.', '1 sentence')
    ], [
      evidence('d7-e1', 'Week-one decision note with evidence links.', '1 decision note')
    ], 'Continue only if buyer access and problem urgency both show evidence.', 'Revise if access or urgency is weak after honest outreach.', ['Week-one evidence decision']),
    buildDay(8, 'Map named alternatives', `Document what ${buyer} uses instead of this idea.`, 'Alternatives reveal buying criteria and the real competition for attention or budget.', [
      action('d8-a1', 'List every alternative named by buyers or supplied in founder intake.', 'At least 5 alternatives or all known alternatives'),
      action('d8-a2', 'Classify each as direct competitor, service provider, internal workflow, spreadsheet, marketplace, or do-nothing.', 'All alternatives'),
      action('d8-a3', 'Write what each alternative does well and where buyers still struggle.', '1 note per alternative')
    ], [
      evidence('d8-e1', 'Alternatives map based only on buyer/founder-supplied evidence.', '1 map')
    ], 'You can explain why a buyer would switch from the current alternative.', 'The alternative map is based on guesses rather than named sources.', ['Alternatives map']),
    buildDay(9, 'Shape the smallest paid pilot', `Turn ${offerHypothesis} into a concrete pilot for ${buyer}.`, 'A narrow pilot tests willingness to pay faster than a large product concept.', [
      action('d9-a1', 'Define one promised outcome, three deliverables, and three things that are not included.', '1 pilot scope'),
      action('d9-a2', `Tie each deliverable directly to reducing ${problem}.`, '3 deliverable notes'),
      action('d9-a3', 'Write the manual fulfillment steps needed to deliver without building software.', '1 fulfillment checklist')
    ], [
      evidence('d9-e1', 'Scoped pilot offer with inclusions, exclusions, and manual delivery steps.', '1 offer spec')
    ], 'A buyer can understand the pilot and what happens after payment in under one minute.', 'The pilot still requires building a full product before anyone can buy.', ['Paid pilot offer v1', 'Manual fulfillment checklist']),
    buildDay(10, 'Set pricing and objection tests', `Prepare to test ${priceHypothesis} without treating it as proven.`, 'Price evidence comes from buyer behavior, not founder preference.', [
      action('d10-a1', 'Write a base price, a higher test price, and a minimum acceptable paid commitment.', '3 price points'),
      action('d10-a2', 'Write responses to the five most likely objections.', '5 objection responses'),
      action('d10-a3', 'Define what counts as payment evidence, serious sales evidence, and weak evidence.', '3 evidence definitions')
    ], [
      evidence('d10-e1', 'Pricing test sheet with evidence categories and objection responses.', '1 sheet')
    ], 'The price test names a specific ask and a behavioral pass condition.', 'The plan still relies on survey answers or compliments.', ['Pricing test sheet']),
    buildDay(11, 'Write the sales conversation script', `Create the first paid-pilot ask for ${buyer}.`, 'The ask must be clear enough that a buyer can say yes, no, or not now.', [
      action('d11-a1', 'Write a 90-second discovery-to-pilot script.', '1 script'),
      action('d11-a2', 'Write a one-paragraph follow-up message with the pilot price and next step.', '1 follow-up message'),
      action('d11-a3', 'Practice the ask aloud and remove vague or overpromising language.', '2 practice passes')
    ], [
      evidence('d11-e1', 'Sales script and follow-up message.', '2 assets')
    ], 'The script asks for a concrete paid pilot, deposit, or scheduled buying next step.', 'The script avoids the price or promises outcomes that are not proven.', ['Sales script v1', 'Paid-pilot follow-up']),
    buildDay(12, 'Publish the landing page draft', `Create a simple page for the ${offerHypothesis} pilot.`, 'The landing page tests clarity and intent before paid traffic or product build.', [
      action('d12-a1', 'Write headline, subheadline, problem section, pilot deliverables, exclusions, price, and CTA.', '1 landing page'),
      action('d12-a2', 'Include a limitation statement that the pilot is manual and evidence-seeking.', '1 limitation note'),
      action('d12-a3', 'Add a contact or checkout-intent CTA that can be tracked.', '1 CTA')
    ], [
      evidence('d12-e1', 'Landing page draft or published simple page.', '1 page')
    ], 'A qualified buyer can understand who it is for, what they receive, and how to take the next step.', 'The page overclaims certainty or hides the manual nature of the offer.', ['Landing page v1'], { timeBudgetMinutes: 150, cashBudget: 20 }),
    buildDay(13, 'Install tracking and evidence capture', 'Make every meaningful buyer action observable.', 'A small test without tracking usually produces ambiguous stories instead of evidence.', [
      action('d13-a1', 'Track page views, CTA clicks, form submissions, checkout starts, paid commitments, and declines.', '6 events'),
      action('d13-a2', 'Create a simple evidence log for source, action, timestamp, quote/note, and outcome.', '1 log'),
      action('d13-a3', 'Test tracking from a private browser session.', '1 test pass')
    ], [
      evidence('d13-e1', 'Tracking checklist and tested evidence log.', '1 verified setup')
    ], 'You can trace a visitor from source to CTA or payment intent.', 'You cannot distinguish traffic, curiosity, and buying intent.', ['Tracking checklist', 'Evidence log']),
    buildDay(14, 'Design manual fulfillment', `Write how you will deliver a narrow result for ${buyer}.`, 'Manual fulfillment proves the value path before automation hides the hard parts.', [
      action('d14-a1', 'Write onboarding questions needed to deliver the pilot.', '5 to 8 questions'),
      action('d14-a2', 'Write the delivery checklist, owner, time estimate, and quality check.', '1 checklist'),
      action('d14-a3', 'Create one example deliverable using fixture or non-customer data.', '1 sample')
    ], [
      evidence('d14-e1', 'Manual fulfillment SOP and non-customer sample deliverable.', '2 artifacts')
    ], 'The pilot can be delivered manually within the stated time budget.', 'Delivery depends on unbuilt automation or unsupported data access.', ['Fulfillment SOP', 'Sample deliverable'], { timeBudgetMinutes: 150 }),
    buildDay(15, 'Run a dry-run purchase path', 'Test the complete path from CTA to delivery without charging a real customer.', 'Broken delivery loses trust even when demand exists.', [
      action('d15-a1', 'Walk through landing page, CTA, intake, payment-intent or invoice path, confirmation, and delivery steps.', '1 dry run'),
      action('d15-a2', 'Record friction, missing copy, unclear terms, and support instructions.', '1 issue list'),
      action('d15-a3', 'Fix only blockers that would stop a real buyer from receiving the pilot.', 'All blockers')
    ], [
      evidence('d15-e1', 'Dry-run receipt and blocker list.', '1 receipt')
    ], 'A buyer could pay and receive the manual pilot without confusion.', 'The path has a dead end, unclear payment step, or unsupported promise.', ['Dry-run receipt']),
    buildDay(16, 'Start the paid-pilot outreach batch', `Ask qualified ${buyer} for the paid pilot.`, 'This is the first real willingness-to-pay test.', [
      action('d16-a1', 'Send the pilot ask to the strongest qualified prospects and prior interviewees.', '10 messages'),
      action('d16-a2', 'Offer two time windows for a call or a direct pilot checkout/deposit path.', '10 clear next steps'),
      action('d16-a3', 'Track each response without reclassifying silence as failure too early.', '10 statuses')
    ], [
      evidence('d16-e1', 'Paid-pilot outreach log.', '10 logged asks')
    ], 'At least 2 serious replies, 1 paid/deposit action, or 2 buying-process conversations.', 'No one engages with the paid ask and no clear segment/channel learning emerges.', ['Paid-pilot outreach log'], { passRoute: 'Continue to sales calls and close attempts.', failRoute: 'Revise segment, message, or offer clarity before increasing volume.' }),
    buildDay(17, 'Run paid-pilot sales conversations', 'Convert interested replies into clear yes/no evidence.', 'A sales conversation should expose budget, authority, timing, and risk.', [
      action('d17-a1', 'Run calls with interested prospects or send the direct paid-pilot follow-up.', '2 conversations or follow-ups'),
      action('d17-a2', 'Ask for the price, deposit, signed agreement, or calendar commitment.', '2 direct asks'),
      action('d17-a3', 'Record objections verbatim and mark whether they are price, trust, timing, scope, or urgency objections.', 'All objections')
    ], [
      evidence('d17-e1', 'Sales notes with direct ask outcomes.', '2 notes')
    ], 'One buyer gives money, signs, schedules a serious buying next step, or introduces a decision maker.', 'Prospects only offer compliments or vague future interest.', ['Sales notes batch 1'], { timeBudgetMinutes: 120 }),
    buildDay(18, 'Follow up with value and urgency', 'Follow up without pretending weak interest is demand.', 'Most early tests need respectful follow-up to separate busy buyers from non-buyers.', [
      action('d18-a1', 'Send concise follow-up with the problem, pilot result, price, and deadline.', '8 follow-ups'),
      action('d18-a2', 'Include one useful artifact from the sample or evidence brief.', '1 artifact link'),
      action('d18-a3', 'Track replies, objections, declines, and next steps.', '8 statuses')
    ], [
      evidence('d18-e1', 'Follow-up log and response evidence.', '8 logged follow-ups')
    ], 'At least 1 buyer takes a concrete next step or gives a specific buying objection.', 'Follow-ups produce no replies or only polite encouragement.', ['Follow-up message v1', 'Follow-up log']),
    buildDay(19, 'Decide the first paid-pilot result', 'Summarize what the first close attempt proved.', 'The plan should pivot on payment evidence, not mood.', [
      action('d19-a1', 'Count paid commitments, deposits, serious buying calls, explicit declines, and silence.', '1 scorecard'),
      action('d19-a2', 'Write the strongest objection and the strongest buying signal.', '2 bullets'),
      action('d19-a3', 'Choose whether to deliver, revise, or run a tighter second close attempt.', '1 decision')
    ], [
      evidence('d19-e1', 'First paid-pilot decision scorecard.', '1 scorecard')
    ], 'There is at least one paid or serious commitment to deliver against.', 'There is no commitment and the objections point to buyer/problem mismatch.', ['First paid-pilot decision']),
    buildDay(20, 'Onboard the pilot customer or simulate with fixture data', 'Start delivery using the manual fulfillment path.', 'Delivery evidence shows whether the promised result can exist at acceptable effort.', [
      action('d20-a1', 'Collect onboarding inputs from the buyer, or run the SOP on fixture data if no buyer paid.', '1 onboarding set'),
      action('d20-a2', 'Confirm the deliverable, timeline, and what is outside scope.', '1 confirmation'),
      action('d20-a3', 'Track time spent from first input to first deliverable draft.', '1 time log')
    ], [
      evidence('d20-e1', 'Onboarding record and delivery time log.', '1 record')
    ], 'Inputs are complete enough to produce the promised narrow result.', 'The customer cannot provide inputs or the scope expands beyond the pilot.', ['Onboarding record', 'Delivery time log'], { timeBudgetMinutes: 150 }),
    buildDay(21, 'Deliver the narrow first result', `Produce the smallest useful result tied to ${problem}.`, 'A narrow delivery creates the first value evidence without waiting for a product.', [
      action('d21-a1', 'Create the pilot deliverable using the manual SOP.', '1 deliverable'),
      action('d21-a2', 'Run the quality checklist and remove unsupported claims.', '1 quality pass'),
      action('d21-a3', 'Send the deliverable with a short explanation and one feedback question.', '1 delivery message')
    ], [
      evidence('d21-e1', 'Delivered artifact and timestamped delivery message.', '1 delivered result')
    ], 'The buyer receives the promised result and understands the next action.', 'Delivery misses the promised outcome or requires unsustainable effort.', ['Pilot deliverable v1', 'Delivery message'], { timeBudgetMinutes: 180 }),
    buildDay(22, 'Collect customer evidence', 'Ask whether the delivered result changed behavior.', 'Usefulness is strongest when the buyer acts, pays, shares data, or asks for more.', [
      action('d22-a1', 'Ask what was useful, what was missing, what they did next, and whether they would continue.', '4 feedback questions'),
      action('d22-a2', 'Ask for renewal, expansion, referral, testimonial permission, or a second paid step only if delivery created value.', '1 direct ask'),
      action('d22-a3', 'Record exact feedback and behavior without editing it into a nicer story.', 'All feedback')
    ], [
      evidence('d22-e1', 'Customer feedback and behavior log.', '1 feedback record')
    ], 'The buyer takes a next step, asks for more, refers someone, renews, or names a concrete improvement.', 'Feedback is polite but no behavior changes.', ['Customer evidence log']),
    buildDay(23, 'Update the evidence scoreboard', 'Separate verified evidence from assumptions after delivery.', 'The next phase should improve the offer only where evidence points.', [
      action('d23-a1', 'Update strong, medium, and weak evidence categories.', '1 scoreboard'),
      action('d23-a2', 'Mark every claim as Verified, Inferred, or Test.', 'All claims'),
      action('d23-a3', 'Write the top three product or service changes supported by evidence.', '3 changes')
    ], [
      evidence('d23-e1', 'Updated evidence scoreboard with truth labels.', '1 scoreboard')
    ], 'The scoreboard contains at least one verified behavior or a clear reason none exists.', 'Evidence is mixed with interpretation and cannot support a decision.', ['Evidence scoreboard v2']),
    buildDay(24, 'Improve the offer copy', 'Revise the offer using the first delivery and sales evidence.', 'Copy should improve from buyer language, not founder cleverness.', [
      action('d24-a1', 'Replace vague language with exact buyer phrases from interviews and sales notes.', '5 edits'),
      action('d24-a2', 'Clarify deliverables, exclusions, price, proof limits, and next step.', '1 revised offer'),
      action('d24-a3', 'Remove claims not supported by evidence.', 'All unsupported claims')
    ], [
      evidence('d24-e1', 'Revised offer page or one-page offer.', '1 revised asset')
    ], 'The revised offer is clearer and more specific without adding unsupported promises.', 'The copy adds broader claims or hides limitations.', ['Offer copy v2']),
    buildDay(25, 'Tighten onboarding and delivery', 'Reduce the effort needed to fulfill the pilot.', 'Operational friction can kill a viable offer if ignored.', [
      action('d25-a1', 'Identify the slowest delivery step and the most confusing onboarding question.', '2 bottlenecks'),
      action('d25-a2', 'Create a reusable template, checklist, or intake improvement.', '1 reusable asset'),
      action('d25-a3', 'Estimate revised delivery time and gross margin at the test price.', '1 estimate')
    ], [
      evidence('d25-e1', 'Updated SOP and time/cost estimate.', '1 SOP update')
    ], 'The pilot can be delivered again with less ambiguity or time.', 'The pilot remains too custom, too slow, or too unclear to repeat.', ['Fulfillment SOP v2', 'Delivery economics estimate']),
    buildDay(26, 'Prepare the second acquisition test', 'Choose one revised channel/message for another buyer batch.', 'A second test checks whether the signal repeats outside the first small batch.', [
      action('d26-a1', 'Choose one acquisition channel based on evidence: direct network, community, cold email, partner, content, or local outreach.', '1 channel'),
      action('d26-a2', 'Write the revised message and CTA.', '1 message'),
      action('d26-a3', 'Build a fresh qualified prospect list.', '20 prospects')
    ], [
      evidence('d26-e1', 'Second-test channel plan, message, and prospect list.', '1 plan')
    ], 'The second test has a named channel, message, CTA, and qualified list.', 'The second test repeats a failed channel without a meaningful change.', ['Second acquisition test plan']),
    buildDay(27, 'Run the second acquisition test', 'Send the revised offer to a fresh qualified batch.', 'Repeatability matters more than one lucky customer.', [
      action('d27-a1', 'Send the revised paid-pilot ask to qualified prospects.', '15 messages'),
      action('d27-a2', 'Track source, message version, CTA action, replies, and commitments.', '15 status updates'),
      action('d27-a3', 'Stop after the planned batch unless a severe blocker appears.', '1 controlled batch')
    ], [
      evidence('d27-e1', 'Second acquisition test log.', '15 logged asks')
    ], 'The second batch produces a similar or better serious-response rate than the first.', 'The second batch produces weaker results and no sharper learning.', ['Second acquisition log'], { timeBudgetMinutes: 120, cashBudget: 25 }),
    buildDay(28, 'Check unit economics and repeatability', 'Estimate whether this offer can be delivered and sold sustainably.', 'A paid pilot is useful only if the path can become repeatable enough to justify continuing.', [
      action('d28-a1', 'Calculate time to sell, time to deliver, cash cost, price, gross margin, and support load.', '1 unit-economics sheet'),
      action('d28-a2', 'Compare first and second acquisition evidence.', '1 comparison'),
      action('d28-a3', 'Write what must improve before building product automation.', '3 constraints')
    ], [
      evidence('d28-e1', 'Unit economics and repeatability review.', '1 review')
    ], 'The offer shows a plausible path to repeatable acquisition and delivery.', 'The economics require unrealistic volume, price, or delivery effort.', ['Unit-economics review']),
    buildDay(29, 'Make the evidence decision', 'Choose continue, pivot, pause, or stop using explicit rules.', 'The decision protects the founder from drifting into months of unsupported building.', [
      action('d29-a1', 'Apply the decision rules in this plan to the evidence scoreboard.', '1 decision pass'),
      action('d29-a2', 'Write the chosen decision and the evidence that justifies it.', '1 decision memo'),
      action('d29-a3', 'Name the next irreversible build decision that is still not allowed without more evidence.', '1 constraint')
    ], [
      evidence('d29-e1', 'Continue/pivot/pause/stop memo.', '1 memo')
    ], 'The decision is tied to buyer behavior and evidence thresholds.', 'The decision is based mainly on excitement, fear, or sunk cost.', ['Day 29 decision memo']),
    buildDay(30, 'Write the next 30-day roadmap', 'Turn the decision into the next bounded evidence sprint.', 'Momentum should continue through the next highest-risk assumption, not a vague build plan.', [
      action('d30-a1', 'Write the next 30-day objective based on the Day 29 decision.', '1 objective'),
      action('d30-a2', 'Choose three weekly milestones and one stop condition.', '3 milestones and 1 stop condition'),
      action('d30-a3', 'List the first five tasks for the next sprint.', '5 tasks')
    ], [
      evidence('d30-e1', 'Next 30-day roadmap with objective, milestones, stop condition, and first tasks.', '1 roadmap')
    ], 'The roadmap targets the next riskiest assumption with measurable evidence.', 'The roadmap jumps to product build without evidence gates.', ['Next 30-day roadmap'])
  ];

  const decisionRules: DecisionRule[] = [
    { ruleId: 'continue', outcome: 'continue', condition: 'Continue when repeated qualified buyers show urgent pain, at least one buyer pays or commits seriously, and delivery can be repeated within the planned time/cost limits.', nextAction: 'Run another paid-pilot batch or fulfill the next customer before building broad automation.' },
    { ruleId: 'pivot', outcome: 'pivot', condition: 'Pivot when pain exists but the buyer, channel, offer, price, or delivery path is the blocker.', nextAction: 'Change only the failed assumption and rerun a smaller evidence test.' },
    { ruleId: 'pause', outcome: 'pause', condition: 'Pause when evidence is mixed and the next test needs access, data, or time you do not currently have.', nextAction: 'Acquire the missing access or constraint before spending on product build.' },
    { ruleId: 'stop', outcome: 'stop', condition: 'Stop when qualified buyers do not report recent pain, cannot be reached, reject the paid ask, and no credible workaround budget appears.', nextAction: 'Archive the evidence and redirect effort to a sharper problem.' }
  ];

  const weeklyCheckpoints: WeeklyCheckpoint[] = [
    { checkpointId: 'week-1', dayNumber: 7, title: 'Buyer/problem checkpoint', questions: ['Can you reach qualified buyers?', 'Did buyers describe recent pain?', 'Is the current workaround real?'], passSignal: 'Buyer access plus recent pain is visible.', failSignal: 'The target remains broad, unreachable, or low urgency.' },
    { checkpointId: 'week-2', dayNumber: 14, title: 'Offer readiness checkpoint', questions: ['Is the pilot narrow?', 'Is the price ask explicit?', 'Can the offer be fulfilled manually?'], passSignal: 'The paid ask and manual delivery path are clear.', failSignal: 'The offer still depends on building a full product first.' },
    { checkpointId: 'week-3', dayNumber: 21, title: 'Paid-pilot checkpoint', questions: ['Did a buyer commit?', 'What objection repeated?', 'Can you deliver the promised result?'], passSignal: 'A paid or serious commitment exists and delivery has started.', failSignal: 'Only compliments, weak interest, or vague next steps appear.' },
    { checkpointId: 'week-4', dayNumber: 28, title: 'Repeatability checkpoint', questions: ['Did the second test repeat the signal?', 'Can the economics work?', 'What must improve before automation?'], passSignal: 'Acquisition and delivery show a plausible repeatable path.', failSignal: 'The model requires unrealistic price, volume, or founder effort.' },
    { checkpointId: 'final', dayNumber: 30, title: 'Next-roadmap checkpoint', questions: ['What did the evidence prove?', 'What remains inferred?', 'What is the next riskiest test?'], passSignal: 'The next sprint is evidence-led and bounded.', failSignal: 'The next sprint is a broad build plan without new evidence gates.' }
  ];

  const planWithoutHashes: ExecutionPlan30Day = {
    schemaVersion: 'execution-plan-30day-v1',
    planId: `plan_${deterministicHash(`${order.orderId}:${inputHash}`)}`,
    planVersion: PLAN_VERSION,
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    sourceVerdictId: verdict.resultId,
    orderId: order.orderId,
    ownerId: order.email,
    createdAt: now,
    idea: {
      name: ideaName,
      description: ideaDescription,
      targetBuyer: buyer,
      problem,
      currentWorkaround: workaround,
      offerHypothesis,
      priceHypothesis
    },
    assumptions,
    limitations,
    phases,
    days,
    weeklyCheckpoints,
    decisionRules,
    generationReceipt: {
      sourceVerdictId: verdict.resultId,
      generatedAt: now,
      generatorVersion: GENERATOR_VERSION,
      inputHash,
      outputHash: '',
      fallbackStatus: 'deterministic_only',
      fallbackReason: 'AI enrichment is not required for launch fulfillment.'
    },
    qualityGate: { passed: false, failures: [] }
  };
  planWithoutHashes.qualityGate = validateExecutionPlan30Day(planWithoutHashes);
  planWithoutHashes.generationReceipt.outputHash = deterministicHash({
    ...planWithoutHashes,
    generationReceipt: { ...planWithoutHashes.generationReceipt, outputHash: '' }
  });
  return planWithoutHashes;
}

export function validateExecutionPlan30Day(plan: ExecutionPlan30Day): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (plan.schemaVersion !== 'execution-plan-30day-v1') failures.push('Wrong schema version');
  if (plan.planVersion !== PLAN_VERSION) failures.push('Wrong plan version');
  if (plan.offerId !== GHOSTTOWN_30_DAY_PLAN_V1.offerId) failures.push('Wrong offer ID');
  if (plan.days.length !== 30) failures.push('Plan must contain exactly 30 days');
  const dayNumbers = plan.days.map(day => day.dayNumber);
  for (let dayNumber = 1; dayNumber <= 30; dayNumber += 1) {
    if (dayNumbers.filter(value => value === dayNumber).length !== 1) failures.push(`Day ${dayNumber} must appear exactly once`);
  }
  const requiredPhases = phases.map(phase => `${phase.phaseId}:${phase.dayStart}-${phase.dayEnd}`);
  const actualPhases = plan.phases.map(phase => `${phase.phaseId}:${phase.dayStart}-${phase.dayEnd}`);
  if (stableStringify(requiredPhases) !== stableStringify(actualPhases)) failures.push('Required phase structure is missing or changed');
  for (const day of plan.days) {
    const expectedPhase = phaseForDay(day.dayNumber).phaseId;
    if (day.phaseId !== expectedPhase) failures.push(`Day ${day.dayNumber} is assigned to the wrong phase`);
    if (!day.title || !day.objective || !day.whyItMatters) failures.push(`Day ${day.dayNumber} is missing title, objective, or rationale`);
    if (day.actions.length < 1) failures.push(`Day ${day.dayNumber} has no observable action`);
    if (day.requiredEvidence.length < 1) failures.push(`Day ${day.dayNumber} has no evidence requirement`);
    if (!day.passThreshold || !day.failThreshold) failures.push(`Day ${day.dayNumber} is missing pass/fail thresholds`);
    if (!day.nextRouteOnPass || !day.nextRouteOnFail) failures.push(`Day ${day.dayNumber} is missing pass/fail routes`);
    if (day.timeBudgetMinutes <= 0) failures.push(`Day ${day.dayNumber} needs a time budget`);
    if (day.cashBudget.currency !== 'USD' || day.cashBudget.maximumAmount < 0) failures.push(`Day ${day.dayNumber} has an invalid cash budget`);
  }
  if (!plan.assumptions.some(item => item.label === 'Inferred' || item.label === 'Test')) failures.push('Plan needs truth-labeled assumptions');
  if (!plan.limitations.some(item => item.label === 'Verified')) failures.push('Plan needs verified limitations');
  if (!plan.weeklyCheckpoints.some(item => item.dayNumber === 30)) failures.push('Plan needs a Day 30 roadmap checkpoint');
  for (const outcome of ['continue', 'pivot', 'pause', 'stop'] as const) {
    if (!plan.decisionRules.some(rule => rule.outcome === outcome)) failures.push(`Missing ${outcome} decision rule`);
  }
  if (!plan.generationReceipt.inputHash) failures.push('Missing generation input hash');
  return { passed: failures.length === 0, failures };
}

export async function fulfillPaidTestOrder(env: Env, orderId: string, session: Record<string, unknown>, eventId?: string): Promise<PaidTestOrder> {
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) throw new Error('Paid test order not found');
  const order = JSON.parse(raw) as PaidTestOrder;
  if (order.status === 'ready') return order;

  const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata as Record<string, unknown> : {};
  if (order.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId || order.artifactType === 'execution_plan_30day_v1') {
    assertMetadata(metadata, 'paid_test_order_id', order.orderId);
    assertMetadata(metadata, 'owner_id', order.email);
    assertMetadata(metadata, 'offer_id', GHOSTTOWN_30_DAY_PLAN_V1.offerId);
    assertMetadata(metadata, 'offer_version', GHOSTTOWN_30_DAY_PLAN_V1.version);
    assertMetadata(metadata, 'offer_amount_cents', String(GHOSTTOWN_30_DAY_PLAN_V1.amountCents));
    assertMetadata(metadata, 'offer_currency', GHOSTTOWN_30_DAY_PLAN_V1.currency);
    assertMetadata(metadata, 'plan_version', PLAN_VERSION);
    if (order.stripePriceId) assertMetadata(metadata, 'stripe_price_id', order.stripePriceId);
    const sessionMode = typeof session.livemode === 'boolean' && session.livemode ? 'live' : 'test';
    if (order.stripeMode && sessionMode !== order.stripeMode) throw new Error('Stripe mode mismatch');
    if (typeof session.mode === 'string' && session.mode !== 'payment') throw new Error('Stripe checkout mode mismatch');
    if (typeof session.payment_status === 'string' && session.payment_status !== 'paid') throw new Error('Stripe session is not paid');
  }

  const verdict = await savedVerdict(env, order.verdictId, order.email);
  if (!verdict) {
    order.status = 'failed';
    order.fulfillmentError = 'Source verdict not found';
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await savePaidOrderSummary(env, order, 'Validation Action Plan');
    throw new Error('Source verdict not found');
  }

  order.status = 'generating';
  order.stripeCheckoutSessionId = String(session.id || order.stripeCheckoutSessionId || '');
  order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  order.stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
  order.stripeEventId = eventId;
  order.paidAt = order.paidAt ?? new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  await env.KV.put(orderKey(orderId), JSON.stringify(order));

  try {
    if (order.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId || order.artifactType === 'execution_plan_30day_v1') {
      const plan = createExecutionPlan30Day(order, verdict);
      if (!plan.qualityGate.passed) throw new Error(plan.qualityGate.failures.join(', '));
      await env.KV.put(planKey(orderId), JSON.stringify(plan));
      order.artifactType = 'execution_plan_30day_v1';
      order.offerId = GHOSTTOWN_30_DAY_PLAN_V1.offerId;
      order.offerVersion = GHOSTTOWN_30_DAY_PLAN_V1.version;
      order.planVersion = PLAN_VERSION;
    } else {
      const report = createPaidTestReport(order, verdict);
      if (!report.qualityGate.passed) throw new Error(report.qualityGate.failures.join(', '));
      await env.KV.put(reportKey(orderId), JSON.stringify(report));
      order.artifactType = 'legacy_report_v1';
    }
    order.status = 'ready';
    order.fulfillmentError = undefined;
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await recordWebhookPurchaseCompleted(env, order);
    await savePaidOrderSummary(env, order, verdict.idea.ideaName);
    return order;
  } catch (error) {
    order.status = 'failed';
    order.fulfillmentError = error instanceof Error ? error.message : 'Plan generation failed';
    order.updatedAt = new Date().toISOString();
    await env.KV.put(orderKey(orderId), JSON.stringify(order));
    await savePaidOrderSummary(env, order, verdict.idea.ideaName);
    throw error;
  }
}

async function recordWebhookPurchaseCompleted(env: Env, order: PaidTestOrder): Promise<void> {
  const event = {
    eventName: 'purchase_completed',
    origin: 'stripe_webhook',
    orderId: order.orderId,
    ownerId: order.email,
    offerId: order.offerId,
    artifactType: order.artifactType,
    stripeMode: order.stripeMode,
    stripeEventId: order.stripeEventId,
    createdAt: new Date().toISOString()
  };
  await env.KV.put(`analytics_event_${event.createdAt}_${crypto.randomUUID()}`, JSON.stringify(event), { expirationTtl: 86400 * 365 });
}

function assertMetadata(metadata: Record<string, unknown>, key: string, expected: string): void {
  if (metadata[key] !== expected) throw new Error(`Stripe metadata ${key} mismatch`);
}

export interface PaidOrderSummary {
  orderId: string;
  ideaName: string;
  status: PaidTestOrder['status'];
  createdAt: string;
  updatedAt: string;
  artifactType: PaidArtifactType;
  offerName: string;
  sourceVerdictId: string;
  planVersion?: string;
}

async function savePaidOrderSummary(env: Env, order: PaidTestOrder, ideaName: string): Promise<void> {
  const key = userOrdersKey(order.email);
  const raw = await env.KV.get(key);
  const existing = raw ? JSON.parse(raw) as PaidOrderSummary[] : [];
  const artifactType = order.artifactType ?? (order.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId ? 'execution_plan_30day_v1' : 'legacy_report_v1');
  const summary: PaidOrderSummary = {
    orderId: order.orderId,
    ideaName,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    artifactType,
    offerName: artifactType === 'execution_plan_30day_v1' ? GHOSTTOWN_30_DAY_PLAN_V1.name : LEGACY_7_DAY_PLAN_LABEL,
    sourceVerdictId: order.verdictId,
    planVersion: artifactType === 'execution_plan_30day_v1' ? order.planVersion ?? PLAN_VERSION : order.reportVersion
  };
  const orders = [summary, ...existing.filter(item => item.orderId !== order.orderId)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);
  await env.KV.put(key, JSON.stringify(orders));
}

export async function handlePaidTestOrders(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const key = userOrdersKey(auth.email);
  const indexed = await env.KV.get(key);
  if (indexed) return json({ orders: normalizeSummaries(JSON.parse(indexed) as Partial<PaidOrderSummary>[]) });

  const listed = await env.KV.list({ prefix: 'paid_test_order_', limit: 1000 });
  const orders: PaidOrderSummary[] = [];
  for (const item of listed.keys) {
    const raw = await env.KV.get(item.name);
    if (!raw) continue;
    const order = JSON.parse(raw) as PaidTestOrder;
    if (normalizeEmail(order.email) !== normalizeEmail(auth.email)) continue;
    const verdict = await savedVerdict(env, order.verdictId, order.email);
    const artifactType = order.artifactType ?? (order.offerId === GHOSTTOWN_30_DAY_PLAN_V1.offerId ? 'execution_plan_30day_v1' : 'legacy_report_v1');
    orders.push({
      orderId: order.orderId,
      ideaName: verdict?.idea.ideaName || (artifactType === 'execution_plan_30day_v1' ? '30-Day Implementation Plan' : 'Validation Action Plan'),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      artifactType,
      offerName: artifactType === 'execution_plan_30day_v1' ? GHOSTTOWN_30_DAY_PLAN_V1.name : LEGACY_7_DAY_PLAN_LABEL,
      sourceVerdictId: order.verdictId,
      planVersion: artifactType === 'execution_plan_30day_v1' ? order.planVersion ?? PLAN_VERSION : order.reportVersion
    });
  }
  orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  await env.KV.put(key, JSON.stringify(orders.slice(0, 50)));
  return json({ orders: orders.slice(0, 50) });
}

function normalizeSummaries(items: Partial<PaidOrderSummary>[]): PaidOrderSummary[] {
  return items.map(item => {
    const artifactType = item.artifactType ?? (item.offerName === LEGACY_7_DAY_PLAN_LABEL ? 'legacy_report_v1' : 'execution_plan_30day_v1');
    return {
      orderId: String(item.orderId ?? ''),
      ideaName: String(item.ideaName ?? '30-Day Implementation Plan'),
      status: item.status ?? 'pending',
      createdAt: String(item.createdAt ?? ''),
      updatedAt: String(item.updatedAt ?? ''),
      artifactType,
      offerName: item.offerName ?? (artifactType === 'execution_plan_30day_v1' ? GHOSTTOWN_30_DAY_PLAN_V1.name : LEGACY_7_DAY_PLAN_LABEL),
      sourceVerdictId: String(item.sourceVerdictId ?? ''),
      planVersion: item.planVersion
    };
  });
}

async function loadOwnedOrder(request: Request, env: Env, orderId: string): Promise<{ order: PaidTestOrder; authEmail: string } | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const rawOrder = await env.KV.get(orderKey(orderId));
  if (!rawOrder) return json({ error: 'Plan not found' }, 404);
  const order = JSON.parse(rawOrder) as PaidTestOrder;
  if (normalizeEmail(order.email) !== normalizeEmail(auth.email) || order.status !== 'ready') return json({ error: 'Plan not found' }, 404);
  return { order, authEmail: auth.email };
}

export async function handlePaidTestPlan(request: Request, env: Env, orderId: string): Promise<Response> {
  const loaded = await loadOwnedOrder(request, env, orderId);
  if (loaded instanceof Response) return loaded;
  const rawPlan = await env.KV.get(planKey(orderId));
  if (rawPlan) return new Response(rawPlan, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="ghosttown-30-day-plan-${orderId}.json"` } });
  const rawReport = await env.KV.get(reportKey(orderId));
  if (rawReport) return new Response(rawReport, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="ghosttown-legacy-report-${orderId}.json"` } });
  return json({ error: 'Plan not found' }, 404);
}

export async function handlePaidTestReport(request: Request, env: Env, orderId: string): Promise<Response> {
  return handlePaidTestPlan(request, env, orderId);
}

export async function handlePaidTestPdf(request: Request, env: Env, orderId: string): Promise<Response> {
  const loaded = await loadOwnedOrder(request, env, orderId);
  if (loaded instanceof Response) return loaded;
  const rawPlan = await env.KV.get(planKey(orderId));
  if (rawPlan) {
    const bytes = renderPlanPdf(JSON.parse(rawPlan) as ExecutionPlan30Day);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ghosttown-30-day-plan-${orderId}.pdf"` } });
  }
  const rawReport = await env.KV.get(reportKey(orderId));
  if (rawReport) {
    const bytes = renderLegacyReportPdf(JSON.parse(rawReport) as PaidTestReport);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ghosttown-legacy-report-${orderId}.pdf"` } });
  }
  return json({ error: 'Plan not found' }, 404);
}

export async function handlePaidTestPlanPdf(request: Request, env: Env, orderId: string): Promise<Response> {
  return handlePaidTestPdf(request, env, orderId);
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7e]/g, '');
}

function wrap(text: string, width = 92): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderTextPdf(lines: string[], title: string): Uint8Array {
  const pageLines = 45;
  const normalizedLines = lines.length ? lines : [title];
  const pages = Array.from({ length: Math.ceil(normalizedLines.length / pageLines) }, (_, index) => normalizedLines.slice(index * pageLines, (index + 1) * pageLines));
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ];
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const pageWithNumber = [...page, '', `Page ${index + 1} of ${pages.length}`];
    const stream = `BT /F1 9 Tf 48 760 Td 12 TL ${pageWithNumber.map(line => `(${pdfEscape(line)}) Tj T*`).join('\n')} ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function renderPlanPdf(plan: ExecutionPlan30Day): Uint8Array {
  const lines: string[] = [
    'GhostTown Test',
    GHOSTTOWN_30_DAY_PLAN_V1.name,
    `Display price: ${DEFAULT_30_DAY_PLAN_DISPLAY_PRICE}`,
    `Plan version ${plan.planVersion} | Source verdict ${plan.sourceVerdictId} | Order ${plan.orderId}`,
    `Generation ${plan.generationReceipt.generatorVersion} | Input ${plan.generationReceipt.inputHash} | Output ${plan.generationReceipt.outputHash}`,
    '',
    'Idea and intended customer',
    ...wrap(`${plan.idea.name}: ${plan.idea.description}`),
    ...wrap(`Buyer: ${plan.idea.targetBuyer}`),
    ...wrap(`Problem: ${plan.idea.problem}`),
    ...wrap(`Current workaround: ${plan.idea.currentWorkaround}`),
    ...wrap(`Offer hypothesis: ${plan.idea.offerHypothesis}`),
    ...wrap(`Price hypothesis: ${plan.idea.priceHypothesis}`),
    '',
    'Truth-label legend',
    '[Verified] Supplied or directly known from the current record.',
    '[Inferred] Reasonable interpretation from the verdict or intake.',
    '[Test] Must be proven through buyer behavior.',
    '',
    'Assumptions',
    ...plan.assumptions.flatMap(item => wrap(`[${item.label}] ${item.text}`)),
    '',
    'Limitations',
    ...plan.limitations.flatMap(item => wrap(`[${item.label}] ${item.text}`)),
    '',
    'How to use this plan',
    ...wrap('Complete each day in order, record evidence before interpretation, and use the pass/fail routes to avoid drifting into unsupported building.'),
    '',
    'Phase overview',
    ...plan.phases.flatMap(phase => [`Days ${phase.dayStart}-${phase.dayEnd}: ${phase.title}`, ...wrap(phase.objective)]),
    ''
  ];
  for (const day of plan.days) {
    lines.push(`Day ${day.dayNumber}: ${day.title}`);
    lines.push(...wrap(`Objective: ${day.objective}`));
    lines.push(...wrap(`Why it matters: ${day.whyItMatters}`));
    lines.push(...wrap(`Budget: ${day.timeBudgetMinutes} minutes, up to $${day.cashBudget.maximumAmount}.`));
    lines.push('Actions:');
    lines.push(...day.actions.flatMap(item => wrap(`- [${item.truthLabel}] ${item.quantity}: ${item.description}`)));
    lines.push('Required evidence:');
    lines.push(...day.requiredEvidence.flatMap(item => wrap(`- [${item.truthLabel}] ${item.minimumQuantity}: ${item.description}`)));
    lines.push(...wrap(`Pass: ${day.passThreshold}`));
    lines.push(...wrap(`Fail: ${day.failThreshold}`));
    lines.push(...wrap(`On pass: ${day.nextRouteOnPass}`));
    lines.push(...wrap(`On fail: ${day.nextRouteOnFail}`));
    lines.push(...wrap(`Artifacts: ${day.expectedArtifacts.join(', ')}`));
    lines.push(...day.risksAndWarnings.flatMap(item => wrap(`Warning [${item.label}]: ${item.text}`)));
    lines.push('');
  }
  lines.push('Weekly checkpoints');
  for (const checkpoint of plan.weeklyCheckpoints) {
    lines.push(`${checkpoint.title} (Day ${checkpoint.dayNumber})`);
    lines.push(...checkpoint.questions.flatMap(question => wrap(`- ${question}`)));
    lines.push(...wrap(`Pass signal: ${checkpoint.passSignal}`));
    lines.push(...wrap(`Fail signal: ${checkpoint.failSignal}`));
  }
  lines.push('', 'Decision rules');
  for (const rule of plan.decisionRules) {
    lines.push(rule.outcome.toUpperCase());
    lines.push(...wrap(`Condition: ${rule.condition}`));
    lines.push(...wrap(`Next action: ${rule.nextAction}`));
  }
  lines.push('', 'Evidence scoreboard checklist');
  lines.push('- Strong: paid deposit, paid pilot, signed agreement, access/data/time, or decision-maker introduction.');
  lines.push('- Medium: serious sales call, buying-process objection, proposal request, or trial request.');
  lines.push('- Weak: likes, compliments, generic waitlist signups, or friends saying they would use it.');
  lines.push('', 'Next 30-day roadmap instructions');
  lines.push(...wrap('Use Day 29 to choose continue, pivot, pause, or stop. Use Day 30 to define the next bounded evidence sprint with milestones, stop conditions, and first tasks.'));
  return renderTextPdf(lines, GHOSTTOWN_30_DAY_PLAN_V1.name);
}

function renderLegacyReportPdf(report: PaidTestReport): Uint8Array {
  const lines = ['GhostTown Test - 7-Day Validation Plan', `Report version ${report.reportVersion} | Source verdict ${report.generationReceipt.sourceVerdictId}`, ''];
  for (const section of report.sections) {
    lines.push(section.title);
    for (const item of section.claims) lines.push(...wrap(`[${item.label}] ${item.text}`));
    lines.push('');
  }
  return renderTextPdf(lines, LEGACY_7_DAY_PLAN_LABEL);
}
