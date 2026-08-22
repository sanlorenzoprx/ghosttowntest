import { describe, expect, it } from 'vitest';
import {
  handleLogin,
  handleRevokeSessions,
  handleSignup,
  handleVerify
} from '../src/api/auth';
import { handleSaveCurrentResult } from '../src/api/resultHistory';
import { issueResultClaimToken } from '../src/api/resultClaim';
import { handlePaidTestCheckout } from '../src/api/paidTestCheckout';
import { handleShareReward } from '../src/api/shareReward';
import type { Env } from '../src/api/env';
import type { EvaluationResult } from '../src/types/lit';

function memoryEnv() {
  const values = new Map<string, string>();
  const KV = {
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => { values.set(key, value); },
    delete: async (key: string) => { values.delete(key); },
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name }))
    })
  };
  const env = {
    KV,
    AI: {},
    JWT_SECRET: 'slice-b-test-jwt-secret-with-enough-entropy',
    STRIPE_SECRET_KEY: 'sk_test_slice_b',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_30_DAY_PLAN_PRICE_ID: 'price_test_plan',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  } as unknown as Env;
  return { env, KV, values };
}

async function signup(env: Env, email: string) {
  const response = await handleSignup(new Request('https://ghost.test/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse-battery' })
  }), env);
  expect(response.status).toBe(201);
  return (await response.json() as { token: string }).token;
}

function authRequest(url: string, token: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
}

function verdict(resultId: string, ideaName = 'Server verdict'): EvaluationResult {
  return {
    resultId,
    idea: {
      ideaName,
      description: 'Description',
      targetUser: 'Target',
      painfulProblem: 'Problem',
      currentAlternative: 'Alternative',
      motivation: 'Motivation'
    },
    answers: {},
    deterministicScores: {
      ghostTownScore: 2,
      ghostTownRisk: 'medium',
      leverageScore: 3,
      insightScore: 3,
      timingScore: 3,
      litScore: 3,
      litBand: 'promising',
      highWallsScore: 2,
      highWallsBand: 'unclear',
      businessDnaType: 'service',
      businessDnaTrap: 'Trap',
      businessDnaWinStrategy: 'Win',
      finalVerdict: 'test_first',
      verdictHeadline: 'Test it',
      verdictExplanation: 'Evidence first',
      recommendedNextTest: 'Ask buyers',
      doNotBuildUntil: 'Commitment',
      oneSentenceAdvice: 'Test',
    },
    usedAI: false,
    generatedAt: '2026-08-20T00:00:00.000Z',
    cacheHit: false
  };
}

function legacySimpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

describe('Slice B security invariants', () => {
  it('revokes all previously issued JWTs by incrementing the auth version', async () => {
    const { env } = memoryEnv();
    const token = await signup(env, 'owner@example.com');

    const before = await handleVerify(authRequest('https://ghost.test/api/auth/verify', token, {
      method: 'POST'
    }), env);
    expect(before.status).toBe(200);

    const revoked = await handleRevokeSessions(authRequest(
      'https://ghost.test/api/auth/revoke-sessions',
      token,
      { method: 'POST' }
    ), env);
    expect(revoked.status).toBe(200);

    const after = await handleVerify(authRequest('https://ghost.test/api/auth/verify', token, {
      method: 'POST'
    }), env);
    expect(after.status).toBe(401);
  });

  it('rejects retired simpleHash credentials and does not rewrite the account', async () => {
    const { env, values } = memoryEnv();
    const email = 'legacy@example.com';
    const password = 'correct-horse-battery';
    await signup(env, email);
    const user = JSON.parse(values.get(`user_${email}`) || '{}');
    const retiredHash = legacySimpleHash(password);
    user.passwordHash = retiredHash;
    values.set(`user_${email}`, JSON.stringify(user));

    const login = await handleLogin(new Request('https://ghost.test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }), env);
    expect(login.status).toBe(401);

    const after = JSON.parse(values.get(`user_${email}`) || '{}');
    expect(after.passwordHash).toBe(retiredHash);
    expect(after.legacyPasswordMigratedAt).toBeUndefined();
  });

  it('does not allow a public resultId alone to establish new account ownership', async () => {
    const { env, values } = memoryEnv();
    const email = 'owner@example.com';
    const token = await signup(env, email);
    const server = verdict('123e4567-e89b-42d3-a456-426614174000');
    values.set(`verdict_${server.resultId}`, JSON.stringify(server));

    const response = await handleSaveCurrentResult(authRequest(
      'https://ghost.test/api/results',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: server })
      }
    ), env);

    expect(response.status).toBe(404);
    expect(values.has(`user_result_${email}_${server.resultId}`)).toBe(false);
  });

  it('claims only the authoritative server verdict with the private one-time claim capability', async () => {
    const { env, values } = memoryEnv();
    const email = 'owner@example.com';
    const token = await signup(env, email);
    const server = verdict('123e4567-e89b-42d3-a456-426614174000', 'Authoritative server idea');
    values.set(`verdict_${server.resultId}`, JSON.stringify(server));
    const claimToken = await issueResultClaimToken(env, server.resultId);
    const forged = {
      ...server,
      claimToken,
      idea: { ...server.idea, ideaName: 'Forged client idea' }
    };

    const response = await handleSaveCurrentResult(authRequest(
      'https://ghost.test/api/results',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: forged })
      }
    ), env);
    expect(response.status).toBe(200);

    const owned = JSON.parse(values.get(`user_result_${email}_${server.resultId}`) || '{}');
    expect(owned.idea.ideaName).toBe('Authoritative server idea');
    expect(owned.claimToken).toBeUndefined();
    expect(values.get(`verdict_claim_${server.resultId}`)).toBe('consumed');

    const attackerToken = await signup(env, 'attacker@example.com');
    const replay = await handleSaveCurrentResult(authRequest(
      'https://ghost.test/api/results',
      attackerToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: forged })
      }
    ), env);
    expect(replay.status).toBe(404);
    expect(values.has(`user_result_attacker@example.com_${server.resultId}`)).toBe(false);
  });

  it('does not allow a legacy short global verdict id to establish new ownership', async () => {
    const { env, values } = memoryEnv();
    const email = 'owner@example.com';
    const token = await signup(env, email);
    const server = verdict('legacy-short-id');
    values.set(`verdict_${server.resultId}`, JSON.stringify(server));

    const response = await handleSaveCurrentResult(authRequest(
      'https://ghost.test/api/results',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: server })
      }
    ), env);
    expect(response.status).toBe(404);
    expect(values.has(`user_result_${email}_${server.resultId}`)).toBe(false);
  });

  it('does not allow a global verdict record to satisfy paid checkout ownership', async () => {
    const { env, values } = memoryEnv();
    const email = 'owner@example.com';
    const token = await signup(env, email);
    const server = verdict('result-global-only');
    values.set(`verdict_${server.resultId}`, JSON.stringify(server));

    const response = await handlePaidTestCheckout(authRequest(
      'https://ghost.test/api/paid-test/checkout',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdictId: server.resultId,
          targetBuyer: 'Buyer',
          problem: 'Problem',
          currentWorkaround: 'Workaround'
        })
      }
    ), env);

    // Fails before any Stripe call because this account does not yet own the
    // verdict in user_result_<email>_<resultId>.
    expect(response.status).toBe(404);
  });

  it('does not allow a global verdict alone to earn a share reward', async () => {
    const { env, values } = memoryEnv();
    const email = 'owner@example.com';
    const token = await signup(env, email);
    const server = verdict('123e4567-e89b-42d3-a456-426614174000');
    const refId = 'slice-b-ref';

    values.set(`verdict_${server.resultId}`, JSON.stringify(server));
    values.set(`referral_${refId}`, JSON.stringify({ fromEmail: email }));

    const rewardRequest = () => authRequest(
      'https://ghost.test/api/share/reward',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: server.resultId, refId })
      }
    );

    const globalOnly = await handleShareReward(rewardRequest(), env);
    expect(globalOnly.status).toBe(404);

    values.set(`user_result_${email}_${server.resultId}`, JSON.stringify(server));
    const owned = await handleShareReward(rewardRequest(), env);
    expect(owned.status).toBe(200);
    expect(await owned.json()).toMatchObject({ rewarded: true, totalFreeAssessments: 2 });
  });
});
