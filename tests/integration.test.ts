import { describe, expect, it } from 'vitest';
import worker from '../src/api/index';

class MemoryKv {
  private values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

const payload = {
  idea: {
    ideaName: 'Agency QA',
    description: 'Automated release checks for small web agencies.',
    targetUser: 'Web agencies with five to fifty staff',
    painfulProblem: 'Manual release QA delays launches and misses defects.',
    currentAlternative: 'Manual browser checklists',
    motivation: 'Repeated firsthand delivery pain'
  },
  answers: {
    gt_1: 5, gt_2: 4, gt_3: 4, gt_4: 5, pg_1: 4,
    lev_1: 4, lev_2: 3, lev_3: 5,
    ins_1: 4, ins_2: 4, ins_3: 3,
    tim_1: 4, tim_2: 4, tim_3: 4,
    dna_1: 3, walls_1: 3, walls_2: 3
  }
};

function createEnv(kv: MemoryKv, onModel?: (model: string) => void) {
  return {
    KV: kv as unknown as KVNamespace,
    AI: { run: async (model: string) => {
      onModel?.(model);
      throw new Error('AI unavailable in local test');
    } } as unknown as Ai,
    AI_MODEL: '@cf/example/configured-model',
    FRONTEND_URL: 'http://localhost:5173',
    JWT_SECRET: 'test-secret-with-enough-entropy',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_placeholder',
    STRIPE_PAID_TEST_PRICE_ID: 'price_paid_test_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_placeholder'
  };
}

describe('Worker verdict flow', () => {
  it('falls back deterministically and caches the result when AI is unavailable', async () => {
    const kv = new MemoryKv();
    let requestedModel = '';
    const env = createEnv(kv, model => { requestedModel = model; });

    const makeRequest = () => new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const first = await worker.fetch(makeRequest(), env);
    expect(first.status).toBe(200);
    expect(await first.json<{ usedAI: boolean; cacheHit: boolean }>()).toMatchObject({
      usedAI: false,
      cacheHit: false
    });
    expect(requestedModel).toBe('@cf/example/configured-model');

    const second = await worker.fetch(makeRequest(), env);
    expect(await second.json<{ usedAI: boolean; cacheHit: boolean }>()).toMatchObject({
      usedAI: false,
      cacheHit: true
    });
  });

  it('unlocks one share credit per result and caps free assessments at five total', async () => {
    const kv = new MemoryKv();
    const env = createEnv(kv);

    const verdictResponse = await worker.fetch(new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }), env);
    const verdict = await verdictResponse.json<{ resultId: string }>();

    const signupResponse = await worker.fetch(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'share-reward@example.com',
        password: 'correct-horse',
        usedAnonymousAssessment: true
      })
    }), env);
    const signup = await signupResponse.json<{ token: string; user: { testsUsed: number } }>();
    expect(signup.user.testsUsed).toBe(1);
    const authorization = { Authorization: `Bearer ${signup.token}` };

    const linkResponse = await worker.fetch(new Request('http://localhost/api/referral/create', {
      method: 'POST',
      headers: authorization
    }), env);
    const link = await linkResponse.json<{ refId: string }>();

    const rewardRequest = () => new Request('http://localhost/api/share/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authorization },
      body: JSON.stringify({ resultId: verdict.resultId, refId: link.refId })
    });
    const firstReward = await worker.fetch(rewardRequest(), env);
    expect(await firstReward.json<{ rewarded: boolean; totalFreeAssessments: number }>()).toMatchObject({
      rewarded: true,
      totalFreeAssessments: 2
    });

    const duplicateReward = await worker.fetch(rewardRequest(), env);
    expect(await duplicateReward.json<{ rewarded: boolean; reason: string }>()).toMatchObject({
      rewarded: false,
      reason: 'already_rewarded'
    });

    const userJson = await kv.get('user_share-reward@example.com');
    const user = JSON.parse(userJson || '{}') as { shareCredits: number };
    expect(user.shareCredits).toBe(1);

    user.shareCredits = 1;
    await kv.put('user_share-reward@example.com', JSON.stringify(user));
    const secondVerdictResponse = await worker.fetch(new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        idea: { ...payload.idea, ideaName: 'A different rewardable idea' }
      })
    }), env);
    const secondVerdict = await secondVerdictResponse.json<{ resultId: string }>();
    const secondLinkResponse = await worker.fetch(new Request('http://localhost/api/referral/create', {
      method: 'POST',
      headers: authorization
    }), env);
    const secondLink = await secondLinkResponse.json<{ refId: string }>();
    const limitResponse = await worker.fetch(new Request('http://localhost/api/share/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authorization },
      body: JSON.stringify({ resultId: secondVerdict.resultId, refId: secondLink.refId })
    }), env);
    expect(await limitResponse.json<{ rewarded: boolean; reason: string }>()).toMatchObject({
      rewarded: false,
      reason: 'limit_reached'
    });
  });
});
