import { describe, expect, it } from 'vitest';
import worker from '../src/api/index';
import type { Env } from '../src/api/env';

const acceptanceEnv = {
  KV: {} as KVNamespace,
  AI: {} as Ai,
  DEPLOYMENT_ENV: 'acceptance',
  FRONTEND_URL: 'https://ghosttown-acceptance.pages.dev',
  JWT_SECRET: 'test-secret',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_PRICE_ID: 'price_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder'
} satisfies Env;

function preflight(origin: string) {
  return worker.fetch(
    new Request('https://lit-ghost-town-api-acceptance.example.workers.dev/api/verdict', {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    }),
    acceptanceEnv
  );
}

describe('acceptance CORS isolation', () => {
  it('allows the configured acceptance frontend', async () => {
    const response = await preflight('https://ghosttown-acceptance.pages.dev');

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://ghosttown-acceptance.pages.dev');
  });

  it.each([
    'https://ghosttowntest.com',
    'https://www.ghosttowntest.com',
    'https://lit-ghosttown.app',
    'https://preview.ghosttowntest.pages.dev'
  ])('denies production origin %s in acceptance', async origin => {
    const response = await preflight(origin);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});