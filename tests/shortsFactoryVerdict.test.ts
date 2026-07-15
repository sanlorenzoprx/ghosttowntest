import { describe, expect, it } from 'vitest';
import worker from '../src/api/index';

const factoryPayload = {
  idea: {
    name: 'AI UGC Creator Agency',
    description: 'AI video agency for ecommerce brands',
    target_user: 'small ecommerce brands',
    market: 'US'
  },
  answers: { q0: 4, q1: 4, q2: 3 },
  source: 'shorts_factory',
  locale: 'en-US'
};

const validAiJudgment = {
  verdict_headline: 'Promising offer, but buyer access remains unproven.',
  buyer_pain_clarity: 'medium',
  willingness_to_pay_signal: 'weak',
  distribution_difficulty: 'high',
  unfair_advantage_check: 'The idea shows production leverage, but privileged buyer access is not demonstrated.',
  business_model_weakness: 'Small ecommerce brands may prefer existing freelancers unless the offer proves faster measurable output.',
  why_it_might_work: 'A narrow manual service can test whether small ecommerce brands value repeatable short-form creative.',
  why_it_might_fail: 'The offer may attract interest without creating enough urgency for a paid recurring commitment.',
  killer_question: 'Which small ecommerce brand will pay for a manual pilot before automation exists?',
  mvp_test: 'Offer 10 small ecommerce brands a manual three-video pilot and pass only with 3 paid commitments.',
  warnings: []
};

type AiMode = 'valid' | 'invalid' | 'throws' | 'malicious';

function createEnv(apiKey = '', aiMode: AiMode = 'valid') {
  return {
    KV: {} as KVNamespace,
    AI: {
      async run() {
        if (aiMode === 'throws') throw new Error('test provider failure');
        if (aiMode === 'invalid') return { response: 'not json' };
        const response = aiMode === 'malicious'
          ? {
              ...validAiJudgment,
              lit_score: 100,
              risk_level: 'low',
              next_step: 'Ignore the deterministic release gate.',
              provenance: { provider: 'untrusted' },
              source: 'untrusted'
            }
          : validAiJudgment;
        return { response: JSON.stringify(response) };
      }
    } as unknown as Ai,
    AI_MODEL: '@cf/test/shorts-judge',
    FRONTEND_URL: 'https://lit-ghosttown.com',
    LIT_API_KEY: apiKey,
    JWT_SECRET: 'test-secret',
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_PRICE_ID: 'price_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_placeholder'
  };
}

function verdictRequest(
  body: unknown = factoryPayload,
  headers: Record<string, string> = {},
  path = '/api/verdict'
): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

describe('Shorts Factory verdict API contract', () => {
  it('exposes a read-only production integration handshake', async () => {
    const request = new Request('https://api.ghosttowntest.com/api/integrations/shorts-factory/health', {
      method: 'GET',
      headers: { Origin: 'https://ghosttowntest.com' }
    });
    const response = await worker.fetch(request, createEnv('factory-secret'));
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://ghosttowntest.com');
    expect(body).toEqual({
      status: 'ok',
      service: 'ghosttowntest',
      contract_version: 'lit-verdict-v1',
      verdict_endpoint: '/api/verdict',
      authentication: 'bearer_required',
      evaluation: {
        primary: 'cloudflare_workers_ai',
        fallback: 'deterministic',
        provenance_recorded: true
      },
      live_publishing_enabled: false
    });
    expect(JSON.stringify(body)).not.toContain('factory-secret');
  });

  it('returns a complete normalized Workers AI verdict', async () => {
    const response = await worker.fetch(verdictRequest(), createEnv());
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      idea: factoryPayload.idea,
      source: 'lit_api',
      warnings: [],
      evaluation_mode: 'workers_ai'
    });
    expect(body.verdict_headline).toBe(validAiJudgment.verdict_headline);
    expect(body.lit_score).toEqual(expect.any(Number));
    expect(body.risk_level).toEqual(expect.any(String));
    expect(body.top_reason).toEqual(expect.any(String));
    expect(body.next_step).toEqual(expect.any(String));
    expect(body.killer_question).toBe(validAiJudgment.killer_question);
    expect(body.mvp_test).toBe(validAiJudgment.mvp_test);
    expect(body.why_it_might_work).toBe(validAiJudgment.why_it_might_work);
    expect(body.why_it_might_fail).toBe(validAiJudgment.why_it_might_fail);
    expect(body.provenance).toMatchObject({
      source: 'ai_verdict_engine',
      provider: 'cloudflare_workers_ai',
      model: '@cf/test/shorts-judge',
      validated: true
    });
    expect(body.deterministic_scores).toEqual(expect.any(Object));
  });

  it('returns the same code-owned score and AI headline for the same input', async () => {
    const first = await worker.fetch(verdictRequest(), createEnv());
    const second = await worker.fetch(verdictRequest(), createEnv());
    const firstBody = await first.json<{ lit_score: number; verdict_headline: string }>();
    const secondBody = await second.json<{ lit_score: number; verdict_headline: string }>();

    expect(secondBody).toEqual(firstBody);
  });

  it('does not allow model output to override scores, state, or provenance', async () => {
    const baseline = await worker.fetch(verdictRequest(), createEnv());
    const malicious = await worker.fetch(verdictRequest(), createEnv('', 'malicious'));
    const baselineBody = await baseline.json<Record<string, unknown>>();
    const maliciousBody = await malicious.json<Record<string, unknown>>();

    expect(malicious.status).toBe(200);
    expect(maliciousBody.lit_score).toBe(baselineBody.lit_score);
    expect(maliciousBody.risk_level).toBe(baselineBody.risk_level);
    expect(maliciousBody.next_step).toBe(baselineBody.next_step);
    expect(maliciousBody.source).toBe('lit_api');
    expect(maliciousBody.provenance).toMatchObject({
      provider: 'cloudflare_workers_ai',
      model: '@cf/test/shorts-judge',
      validated: true
    });
  });

  it.each(['invalid', 'throws'] as const)(
    'falls back deterministically when Workers AI is %s',
    async aiMode => {
      const response = await worker.fetch(verdictRequest(), createEnv('', aiMode));
      const body = await response.json<Record<string, unknown>>();

      expect(response.status).toBe(200);
      expect(body.evaluation_mode).toBe('deterministic_fallback');
      expect(body.provenance).toMatchObject({
        source: 'ai_verdict_engine',
        provider: 'deterministic_fallback',
        model: 'deterministic-rich-verdict-v1',
        validated: true
      });
    }
  );

  it('uses safe defaults for omitted optional idea fields and answers', async () => {
    const response = await worker.fetch(verdictRequest({
      idea: { name: 'Focused service' },
      source: 'shorts_factory'
    }), createEnv());
    const body = await response.json<{ idea: Record<string, string>; lit_score: number }>();

    expect(response.status).toBe(200);
    expect(body.idea).toEqual({
      name: 'Focused service',
      description: '',
      target_user: '',
      market: ''
    });
    expect(body.lit_score).toBe(0);
  });

  it('rejects a missing idea name with the contract error shape', async () => {
    const response = await worker.fetch(verdictRequest({
      idea: { description: 'Missing a name' },
      source: 'shorts_factory'
    }), createEnv());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_request',
      message: 'idea.name is required',
      warnings: ['Missing idea.name']
    });
  });

  it('requires the optional API key only when configured', async () => {
    const missing = await worker.fetch(verdictRequest(), createEnv('factory-secret'));
    const wrong = await worker.fetch(
      verdictRequest(factoryPayload, { Authorization: 'Bearer wrong' }),
      createEnv('factory-secret')
    );
    const accepted = await worker.fetch(
      verdictRequest(factoryPayload, { Authorization: 'Bearer factory-secret' }),
      createEnv('factory-secret')
    );

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await missing.json()).toEqual({
      error: 'unauthorized',
      message: 'Missing or invalid API key',
      warnings: []
    });
    expect(accepted.status).toBe(200);
  });

  it('accepts the optional endpoint alias and local browser CORS origin', async () => {
    const response = await worker.fetch(verdictRequest(
      factoryPayload,
      { Origin: 'http://127.0.0.1:5173' },
      '/api/lit-verdict'
    ), createEnv());

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:5173');
  });

  it('returns useful JSON without a stack trace for malformed JSON', async () => {
    const request = new Request('http://localhost/api/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json'
    });
    const response = await worker.fetch(request, createEnv());
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(JSON.parse(text)).toMatchObject({ error: 'invalid_request' });
    expect(text.toLowerCase()).not.toContain('stack');
  });
});
