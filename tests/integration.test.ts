import { describe, expect, it } from 'vitest';
import worker from '../src/api/index';

class MemoryKv {
  private values = new Map<string, string>();

  async get<T = string>(key: string, type?: 'text' | 'json'): Promise<T | null> {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return (type === 'json' ? JSON.parse(value) : value) as T;
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async list(options: { prefix?: string } = {}): Promise<{ keys: Array<{ name: string }> }> {
    const prefix = options.prefix ?? '';
    return {
      keys: [...this.values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name }))
    };
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
  public_content_acknowledged: true,
  answers: {
    gt_1: 5, gt_2: 4, gt_3: 4, gt_4: 5, pg_1: 4,
    lev_1: 4, lev_2: 3, lev_3: 5,
    ins_1: 4, ins_2: 4, ins_3: 3,
    tim_1: 4, tim_2: 4, tim_3: 4,
    dna_1: 3, walls_1: 3, walls_2: 3
  }
};

function createEnv(kv: MemoryKv, onModel?: (model: string) => void, apiKey = '') {
  return {
    KV: kv as unknown as KVNamespace,
    AI: { run: async (model: string) => {
      onModel?.(model);
      throw new Error('AI unavailable in local test');
    } } as unknown as Ai,
    AI_MODEL: '@cf/example/configured-model',
    FRONTEND_URL: 'http://localhost:5173',
    LIT_API_KEY: apiKey,
    JWT_SECRET: 'test-secret-with-enough-entropy',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_placeholder',
    STRIPE_PAID_TEST_PRICE_ID: 'price_paid_test_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_placeholder'
  };
}

describe('Worker verdict flow', () => {
  it('stores authenticated assessments and lets their owner reopen them', async () => {
    const kv = new MemoryKv();
    const env = createEnv(kv);
    const signupResponse = await worker.fetch(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'history@example.com', password: 'correct-horse' })
    }), env);
    const signup = await signupResponse.json<{ token: string }>();
    const authorization = { Authorization: `Bearer ${signup.token}` };

    const verdictResponse = await worker.fetch(new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authorization },
      body: JSON.stringify(payload)
    }), env);
    const verdict = await verdictResponse.json<{ resultId: string }>();

    const historyResponse = await worker.fetch(new Request('http://localhost/api/results', {
      headers: authorization
    }), env);
    const history = await historyResponse.json<{ results: Array<{ resultId: string; ideaName: string }> }>();
    expect(history.results).toMatchObject([{ resultId: verdict.resultId, ideaName: 'Agency QA' }]);

    const savedResponse = await worker.fetch(new Request(`http://localhost/api/results/${verdict.resultId}`, {
      headers: authorization
    }), env);
    expect(await savedResponse.json<{ result: { resultId: string } }>()).toMatchObject({
      result: { resultId: verdict.resultId }
    });
  });


  it('lists purchased validation plans saved before the user index existed', async () => {
    const kv = new MemoryKv();
    const env = createEnv(kv);
    const signupResponse = await worker.fetch(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'plans@example.com', password: 'correct-horse' })
    }), env);
    const signup = await signupResponse.json<{ token: string }>();
    const authorization = { Authorization: `Bearer ${signup.token}` };
    await kv.put('verdict_existing-plan', JSON.stringify({
      ...payload,
      resultId: 'existing-plan',
      deterministicScores: { litScore: 3, verdictHeadline: 'Test first' },
      generatedAt: '2026-07-12T00:00:00.000Z'
    }));
    await kv.put('paid_test_order_order-1', JSON.stringify({
      orderId: 'order-1',
      email: 'plans@example.com',
      verdictId: 'existing-plan',
      status: 'ready',
      reportVersion: '1.0',
      intake: { verdictId: 'existing-plan', targetBuyer: 'Agencies', problem: 'Defects', currentWorkaround: 'Checklists' },
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T01:00:00.000Z'
    }));

    const response = await worker.fetch(new Request('http://localhost/api/paid-test/orders', {
      headers: authorization
    }), env);
    expect(await response.json<{ orders: Array<{ orderId: string; ideaName: string; status: string }> }>()).toMatchObject({
      orders: [{ orderId: 'order-1', ideaName: 'Agency QA', status: 'ready' }]
    });
  });

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

  it('requires public acknowledgement and exposes an idempotent public video job', async () => {
    const kv = new MemoryKv();
    const env = createEnv(kv, undefined, 'factory-secret');

    const rejected = await worker.fetch(new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, public_content_acknowledged: false })
    }), env);
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toEqual({ error: 'public_content_acknowledgement_required' });

    const verdictResponse = await worker.fetch(new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }), env);
    const verdict = await verdictResponse.json<{
      video: { job_id: string; status: string; public: boolean; reused: boolean }
    }>();
    expect(verdict.video).toMatchObject({
      status: 'queued',
      public: true,
      reused: false
    });

    const claimResponse = await worker.fetch(new Request(
      'http://localhost/api/integrations/shorts-factory/video-jobs/next',
      { headers: { Authorization: 'Bearer factory-secret' } }
    ), env);
    expect(claimResponse.status).toBe(200);
    expect(await claimResponse.json<{ job_id: string }>()).toMatchObject({
      job_id: verdict.video.job_id
    });

    const statusResponse = await worker.fetch(new Request(
      `http://localhost/api/videos/${verdict.video.job_id}/status`
    ), env);
    expect(await statusResponse.json()).toMatchObject({
      job_id: verdict.video.job_id,
      status: 'processing',
      public: true
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
    const storedUser = JSON.parse((await kv.get('user_share-reward@example.com')) || '{}') as { passwordHash?: string };
    expect(storedUser.passwordHash).toMatch(/^pbkdf2\$100000\$/);
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
