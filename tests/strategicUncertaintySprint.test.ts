import { describe, expect, it } from 'vitest';
import { handleSignup } from '../src/api/auth';
import { handleLaunchBlueprintUncertainty } from '../src/api/blueprintApi';
import { createStrategicUncertaintySprint } from '../src/api/strategicUncertaintySprint';
import type { Env } from '../src/api/env';
import type { VertexStrategicCoherenceGate } from '../src/api/launchBlueprintVertexPipeline';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const failedGate: VertexStrategicCoherenceGate = {
  passed: false,
  chainSummary: 'The problem is real, but buyer/payer and safe fulfillment are unresolved.',
  links: [
    { link: 'customer', value: 'Medication user', status: 'coherent', reason: 'User is clear.', evidenceIds: [], channelIds: [] },
    { link: 'problem', value: 'Remembering scheduled medicine', status: 'coherent', reason: 'Problem is clear.', evidenceIds: [], channelIds: [] },
    { link: 'buyer_payer', value: 'Unknown', status: 'unresolved', reason: 'The user and payer may differ.', evidenceIds: [], channelIds: [] },
    { link: 'current_alternative', value: 'Phone alarms', status: 'coherent', reason: 'Current behavior is explicit.', evidenceIds: [], channelIds: [] },
    { link: 'test', value: 'Manual reminder test', status: 'contradictory', reason: 'The proxy adds monitoring responsibility.', evidenceIds: [], channelIds: [] },
    { link: 'commitment', value: 'Paid signup', status: 'testable_hypothesis', reason: 'Observable.', evidenceIds: [], channelIds: [] },
    { link: 'fulfillment', value: 'Founder monitors confirmations', status: 'unresolved', reason: 'Safety and hours are not bounded.', evidenceIds: [], channelIds: [] },
    { link: 'access_path', value: 'Public medication community', status: 'coherent', reason: 'Direct access is plausible.', evidenceIds: [], channelIds: ['channel-1'] }
  ],
  blockers: [
    { code: 'UNRESOLVED_BUYER_PAYER', link: 'buyer_payer', message: 'The payer is unknown.', requiredEvidence: 'Identify who can authorize and pay for the first test.' },
    { code: 'SAFETY_SENSITIVE_MANUAL_PROXY', link: 'test', message: 'The proposed proxy creates medication-monitoring risk.', requiredEvidence: 'Define a safe non-clinical proxy that preserves the product value.' },
    { code: 'FULFILLMENT_UNRESOLVED', link: 'fulfillment', message: 'Founder responsibility is not bounded.', requiredEvidence: 'Define hours, responsibilities, and a safe stop boundary.' }
  ]
};

function testEnv() {
  const values = new Map<string, string>();
  const KV = {
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => { values.set(key, value); },
    delete: async (key: string) => { values.delete(key); },
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name }))
    })
  };
  const created: string[] = [];
  const env = {
    KV,
    JWT_SECRET: 'test-jwt-secret-with-enough-entropy',
    LAUNCH_BLUEPRINT_WORKFLOW: {
      create: async ({ id }: { id: string }) => { created.push(id); return { id }; }
    }
  } as unknown as Env;
  return { env, KV, created };
}

async function bearerFor(env: Env, email: string) {
  const response = await handleSignup(new Request('https://ghost.test/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse-battery' })
  }), env);
  expect(response.status).toBe(201);
  return (await response.json() as { token: string }).token;
}

describe('strategic uncertainty Sprint', () => {
  it('turns failed coherence into a bounded 3-day clarification artifact', () => {
    const sprint = createStrategicUncertaintySprint('order-1', 'verdict-1', failedGate, '2026-09-26T18:00:00.000Z');
    expect(sprint.horizonDays).toBe(3);
    expect(sprint.status).toBe('open');
    expect(sprint.unresolvedLinks).toEqual(expect.arrayContaining(['buyer_payer', 'test', 'fulfillment']));
    expect(sprint.questions.map(question => question.link)).toEqual(expect.arrayContaining(['buyer_payer', 'test', 'fulfillment']));
    expect(sprint.unlockCondition).toMatch(/30-Day Sprint unlocks only/i);
  });

  it('saves all answers into paid intake and restarts the paid workflow', async () => {
    const { env, KV, created } = testEnv();
    const email = 'founder@example.com';
    const orderId = 'gtt_uncertainty_1';
    const verdictId = 'verdict-uncertainty';
    const token = await bearerFor(env, email);
    const verdict = {
      resultId: verdictId,
      generatedAt: '2026-09-26T17:00:00.000Z',
      idea: {
        ideaName: 'Reminder App',
        description: 'Helps a person remember a scheduled task.',
        targetUser: 'Adults managing daily routines',
        painfulProblem: 'People forget scheduled tasks.',
        currentAlternative: 'Phone alarms',
        motivation: 'Observed problem'
      },
      deterministicScores: {
        ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
        litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak',
        businessDnaType: 'subscription', businessDnaTrap: 'Safety risk', businessDnaWinStrategy: 'Safe test',
        finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Buyer still needs proof.',
        recommendedNextTest: 'Clarify buyer and safe proxy.', doNotBuildUntil: 'Buyer and proxy are clear.',
        oneSentenceAdvice: 'Resolve the buyer and test before building.'
      },
      usedAI: false,
      cacheHit: false,
      answers: {}
    } as EvaluationResult;
    const sprint = createStrategicUncertaintySprint(orderId, verdictId, failedGate);
    const order = {
      orderId,
      email,
      verdictId,
      status: 'uncertainty',
      artifactType: 'launch_blueprint_v2',
      stripeCheckoutSessionId: 'cs_test_uncertainty',
      paidAt: '2026-09-26T17:10:00.000Z',
      intake: {
        verdictId,
        targetBuyer: 'Adults managing daily routines',
        problem: 'People forget scheduled tasks.',
        currentWorkaround: 'Phone alarms',
        competitorSeeds: [
          { seedId: 'seed-1', name: 'A', website: 'https://a.example.com', domain: 'a.example.com', relationship: 'direct_competitor', origin: 'customer_confirmed', verifiedAt: '2026-09-26T17:00:00.000Z' },
          { seedId: 'seed-2', name: 'B', website: 'https://b.example.com', domain: 'b.example.com', relationship: 'adjacent_product', origin: 'customer_confirmed', verifiedAt: '2026-09-26T17:00:00.000Z' }
        ]
      },
      createdAt: '2026-09-26T17:00:00.000Z',
      updatedAt: '2026-09-26T17:15:00.000Z',
      uncertaintySprint: sprint
    } as PaidTestOrder;

    await KV.put(`paid_test_order_${orderId}`, JSON.stringify(order));
    await KV.put(`user_result_${email}_${verdictId}`, JSON.stringify(verdict));

    const answers = sprint.questions.map((question, index) => ({
      questionId: question.questionId,
      answer: `Concrete answer ${index + 1} with a recent example and an observable fact.`
    }));
    const response = await handleLaunchBlueprintUncertainty(new Request('https://ghost.test/uncertainty', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    }), env, orderId);

    expect(response.status).toBe(202);
    const stored = JSON.parse((await KV.get(`paid_test_order_${orderId}`))!) as PaidTestOrder;
    expect(stored.status).toBe('researching');
    expect(stored.intake.strategicClarifications).toHaveLength(sprint.questions.length);
    expect(stored.uncertaintySprint?.status).toBe('submitted');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatch(/^launch-blueprint-/);
  });
});
