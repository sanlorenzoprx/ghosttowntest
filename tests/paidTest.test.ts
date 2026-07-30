import { describe, expect, it } from 'vitest';
import { createExecutionPlan30Day, createPaidTestReport, fulfillPaidTestOrder, qualityGate, validateExecutionPlan30Day } from '../src/api/paidTest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import type { Env } from '../src/api/env';
import { GHOSTTOWN_30_DAY_PLAN_V1 } from '../src/lib/ghosttownOffer';

const verdict = {
  resultId: 'verdict_1', generatedAt: '2026-07-11T00:00:00.000Z',
  idea: { ideaName: 'Release QA', description: 'A narrow QA offer.', targetUser: 'Small agencies', painfulProblem: 'Missed defects', currentAlternative: 'Manual checklists', motivation: 'Firsthand pain' },
  deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Scope creep', businessDnaWinStrategy: 'Narrow offer', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Validate it', recommendedNextTest: 'Interview buyers', doNotBuildUntil: 'A buyer commits', oneSentenceAdvice: 'Talk to buyers' }, usedAI: false, cacheHit: false, answers: {}
} as EvaluationResult;

const order: PaidTestOrder = { orderId: 'gtt_1', email: 'buyer@example.com', verdictId: 'verdict_1', status: 'generating', reportVersion: '1.0', intake: { verdictId: 'verdict_1', targetBuyer: 'Agency owners', problem: 'Missed release defects', currentWorkaround: 'Manual checklists', expectedPrice: '$29' }, createdAt: '2026-07-11T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' };

describe('paid GhostTown Test report', () => {
  it('contains the six required modules, truth labels, and a source verdict receipt', () => {
    const report = createPaidTestReport(order, verdict);
    expect(report.qualityGate).toEqual({ passed: true, failures: [] });
    expect(report.sections.map(section => section.title)).toEqual(expect.arrayContaining(['Buyer Interview Kit', 'Alternatives and Workarounds', 'Landing-Page Test Copy', 'Offer and Price Hypothesis', 'Seven-Day Validation Plan', 'Evidence Scoreboard and Limitations']));
    expect(report.sections.flatMap(section => section.claims).map(item => item.label)).toEqual(expect.arrayContaining(['Verified', 'Inferred', 'Test']));
    expect(report.generationReceipt.sourceVerdictId).toBe('verdict_1');
  });

  it('rejects a report that omits a required module', () => {
    const report = createPaidTestReport(order, verdict);
    report.sections = report.sections.filter(section => section.title !== 'Seven-Day Validation Plan');
    expect(qualityGate(report)).toMatchObject({ passed: false, failures: ['Missing Seven-Day Validation Plan'] });
  });
});

class MemoryKv {
  private values = new Map<string, string>();

  async get<T = string>(key: string, type?: 'text' | 'json'): Promise<T | null> {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return (type === 'json' ? JSON.parse(value) : value) as T;
  }

  async put(key: string, value: string, _options?: unknown): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(options: { prefix?: string } = {}): Promise<{ keys: Array<{ name: string }> }> {
    const prefix = options.prefix ?? '';
    return {
      keys: [...this.values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name }))
    };
  }
}

function planOrder(overrides: Partial<PaidTestOrder> = {}): PaidTestOrder {
  return {
    ...order,
    orderId: 'gtt_plan_1',
    status: 'checkout_created',
    artifactType: 'execution_plan_30day_v1',
    offerId: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
    offerVersion: '1.0',
    planVersion: '1.0',
    stripePriceId: 'price_30_day_test',
    stripeMode: 'test',
    idempotencyKey: 'idem_plan_1',
    intake: {
      ...order.intake,
      offerHypothesis: 'A fixed-scope release QA pilot delivered in 48 hours',
      expectedPrice: '$97'
    },
    ...overrides
  };
}

function envWithKv(kv: MemoryKv): Env {
  return {
    KV: kv as unknown as KVNamespace,
    AI: {} as Ai,
    FRONTEND_URL: 'http://localhost:5173',
    JWT_SECRET: 'test-secret',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_assessment_pack',
    STRIPE_PAID_TEST_PRICE_ID: 'price_legacy',
    STRIPE_30_DAY_PLAN_PRICE_ID: 'price_30_day_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  };
}

describe('30-day paid implementation plan', () => {
  it('generates exactly 30 valid days with fixed phases, truth labels, and source hashes', () => {
    const plan = createExecutionPlan30Day(planOrder(), verdict);

    expect(plan.schemaVersion).toBe('execution-plan-30day-v1');
    expect(plan.offerId).toBe(GHOSTTOWN_30_DAY_PLAN_V1.offerId);
    expect(plan.days.map(day => day.dayNumber)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(plan.phases.map(phase => `${phase.dayStart}-${phase.dayEnd}`)).toEqual(['1-7', '8-11', '12-15', '16-19', '20-23', '24-26', '27-28', '29-29', '30-30']);
    expect(plan.days.every(day => day.actions.length > 0 && day.requiredEvidence.length > 0)).toBe(true);
    expect(plan.assumptions.map(item => item.label)).toEqual(expect.arrayContaining(['Inferred', 'Test']));
    expect(plan.limitations.map(item => item.label)).toEqual(expect.arrayContaining(['Verified']));
    expect(plan.generationReceipt.inputHash).toMatch(/^[0-9a-f]{8}$/);
    expect(plan.generationReceipt.outputHash).toMatch(/^[0-9a-f]{8}$/);
    expect(validateExecutionPlan30Day(plan)).toEqual({ passed: true, failures: [] });
  });

  it('is deterministic for the same normalized order, verdict, and generator version', () => {
    const first = createExecutionPlan30Day(planOrder(), verdict);
    const second = createExecutionPlan30Day(planOrder(), verdict);

    expect(second).toEqual(first);
  });

  it.each([
    ['regulated medical triage', { ideaName: 'Clinic Intake AI', description: 'Patient intake summaries for clinics.', targetUser: 'Small clinics', painfulProblem: 'Triage paperwork delays care.', currentAlternative: 'Manual nurse review', motivation: 'Operations experience' }],
    ['financial planning', { ideaName: 'Solo Founder Cash Coach', description: 'Cash-flow planning for freelancers.', targetUser: 'Freelance designers', painfulProblem: 'Irregular income causes missed tax savings.', currentAlternative: 'Spreadsheets and accountants', motivation: 'Firsthand pain' }],
    ['securities screening', { ideaName: 'Angel Memo Screener', description: 'Organizes startup investment memos.', targetUser: 'Angel investors', painfulProblem: 'Deal notes are scattered.', currentAlternative: 'Manual docs and email', motivation: 'Investor workflow pain' }],
    ['local service marketplace', { ideaName: 'Local Permit Runner', description: 'Manual permit status help for contractors.', targetUser: 'Small contractors', painfulProblem: 'Permit delays block jobs.', currentAlternative: 'Calling city offices', motivation: 'Local service experience' }],
    ['education service', { ideaName: 'Algebra Rescue Sprint', description: 'A fixed tutoring sprint for struggling students.', targetUser: 'Parents of ninth graders', painfulProblem: 'Students fall behind before exams.', currentAlternative: 'Generic tutoring', motivation: 'Teaching experience' }]
  ])('validates the fixture: %s', (_name, idea) => {
    const fixtureVerdict = { ...verdict, resultId: `verdict_${idea.ideaName.replace(/\W+/g, '_')}`, idea } as EvaluationResult;
    const plan = createExecutionPlan30Day(planOrder({ verdictId: fixtureVerdict.resultId, intake: { ...planOrder().intake, verdictId: fixtureVerdict.resultId } }), fixtureVerdict);

    expect(plan.qualityGate).toEqual({ passed: true, failures: [] });
    expect(JSON.stringify(plan.days)).not.toMatch(/guaranteed revenue|total addressable market|billion-dollar|market size is/i);
    expect(plan.limitations.some(item => item.text.includes('No customer quotes'))).toBe(true);
  });

  it('fulfills one canonical plan from a verified-session shape and returns the same plan on duplicate fulfillment', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const pendingOrder = planOrder();
    await kv.put(`paid_test_order_${pendingOrder.orderId}`, JSON.stringify(pendingOrder));
    await kv.put(`verdict_${verdict.resultId}`, JSON.stringify(verdict));

    const session = {
      id: 'cs_test_1',
      mode: 'payment',
      payment_status: 'paid',
      livemode: false,
      payment_intent: 'pi_test_1',
      customer: 'cus_test_1',
      metadata: {
        paid_test_order_id: pendingOrder.orderId,
        owner_id: pendingOrder.email,
        offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
        offer_version: '1.0',
        offer_amount_cents: '9700',
        offer_currency: 'usd',
        plan_version: '1.0',
        stripe_price_id: 'price_30_day_test',
        fulfillment_type: 'execution_plan_30day_v1'
      }
    };

    await fulfillPaidTestOrder(env, pendingOrder.orderId, session, 'evt_test_1');
    const firstPlan = await kv.get(`paid_test_plan_${pendingOrder.orderId}`);
    await fulfillPaidTestOrder(env, pendingOrder.orderId, session, 'evt_test_1');
    const secondPlan = await kv.get(`paid_test_plan_${pendingOrder.orderId}`);
    const storedOrder = JSON.parse(await kv.get(`paid_test_order_${pendingOrder.orderId}`) || '{}') as PaidTestOrder;

    expect(firstPlan).toBeTruthy();
    expect(secondPlan).toBe(firstPlan);
    expect(storedOrder.status).toBe('ready');
    expect(storedOrder.artifactType).toBe('execution_plan_30day_v1');
  });

  it('fails closed when webhook metadata carries the wrong price', async () => {
    const kv = new MemoryKv();
    const env = envWithKv(kv);
    const pendingOrder = planOrder({ orderId: 'gtt_wrong_price' });
    await kv.put(`paid_test_order_${pendingOrder.orderId}`, JSON.stringify(pendingOrder));
    await kv.put(`verdict_${verdict.resultId}`, JSON.stringify(verdict));

    await expect(fulfillPaidTestOrder(env, pendingOrder.orderId, {
      id: 'cs_test_wrong',
      mode: 'payment',
      payment_status: 'paid',
      livemode: false,
      metadata: {
        paid_test_order_id: pendingOrder.orderId,
        owner_id: pendingOrder.email,
        offer_id: GHOSTTOWN_30_DAY_PLAN_V1.offerId,
        offer_version: '1.0',
        offer_amount_cents: '9700',
        offer_currency: 'usd',
        plan_version: '1.0',
        stripe_price_id: 'price_wrong'
      }
    }, 'evt_wrong_price')).rejects.toThrow(/stripe_price_id mismatch/i);
    expect(await kv.get(`paid_test_plan_${pendingOrder.orderId}`)).toBeNull();
  });
});
