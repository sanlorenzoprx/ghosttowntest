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

function createEnv(apiKey = '') {
  return {
    KV: {} as KVNamespace,
    AI: {} as Ai,
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
  it('returns a complete normalized deterministic verdict', async () => {
    const response = await worker.fetch(verdictRequest(), createEnv());
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      idea: factoryPayload.idea,
      source: 'lit_api',
      warnings: []
    });
    expect(body.verdict_headline).toEqual(expect.any(String));
    expect(body.lit_score).toEqual(expect.any(Number));
    expect(body.risk_level).toEqual(expect.any(String));
    expect(body.top_reason).toEqual(expect.any(String));
    expect(body.next_step).toEqual(expect.any(String));
    expect(body.killer_question).toEqual(expect.any(String));
    expect(body.mvp_test).toEqual(expect.any(String));
    expect(body.why_it_might_work).toEqual(expect.any(String));
    expect(body.why_it_might_fail).toEqual(expect.any(String));
    expect(body.provenance).toMatchObject({
      source: 'ai_verdict_engine',
      provider: 'mock',
      model: 'mock-lit-verdict-v1',
      validated: true
    });
    expect(body.deterministic_scores).toEqual(expect.any(Object));
  });

  it('returns the same score and headline for the same input', async () => {
    const first = await worker.fetch(verdictRequest(), createEnv());
    const second = await worker.fetch(verdictRequest(), createEnv());
    const firstBody = await first.json<{ lit_score: number; verdict_headline: string }>();
    const secondBody = await second.json<{ lit_score: number; verdict_headline: string }>();

    expect(secondBody).toEqual(firstBody);
  });

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
