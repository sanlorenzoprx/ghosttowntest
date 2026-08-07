import { describe, expect, it } from 'vitest';
import { handleSignup } from '../src/api/auth';
import type { Env } from '../src/api/env';
import {
  handleLaunchBlueprint,
  handleLaunchBlueprintAssets,
  handleLaunchBlueprintJson,
  handleLaunchBlueprintPdf,
  handleLaunchBlueprintProgress,
  handleLaunchBlueprintRetry
} from '../src/api/blueprintApi';
import { handleLaunchSiteOwner } from '../src/api/launchSite';

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
  const env = {
    KV,
    AI: {},
    JWT_SECRET: 'test-jwt-secret-with-enough-entropy',
    STRIPE_SECRET_KEY: 'sk_test_owner_boundary',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test'
  } as unknown as Env;
  return { env, KV };
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

describe('Launch Blueprint v2.1 cross-account denial', () => {
  it('returns privacy-safe 404s before touching customer artifacts or owner-only state', async () => {
    const { env, KV } = testEnv();
    const orderId = 'order-owner-private-123';
    const ownerEmail = 'owner@example.com';
    const token = await bearerFor(env, 'intruder@example.com');

    await KV.put(`paid_test_order_${orderId}`, JSON.stringify({
      orderId,
      email: ownerEmail,
      verdictId: 'verdict-private',
      status: 'ready',
      artifactType: 'launch_blueprint_v2',
      stripeCheckoutSessionId: 'cs_test_private',
      intake: {},
      createdAt: '2026-08-07T12:00:00.000Z',
      updatedAt: '2026-08-07T12:00:00.000Z'
    }));

    const authHeaders = { Authorization: `Bearer ${token}` };
    const cases: Array<[string, () => Promise<Response>]> = [
      ['open Blueprint', () => handleLaunchBlueprint(new Request('https://ghost.test/blueprint', { headers: authHeaders }), env, orderId)],
      ['download PDF', () => handleLaunchBlueprintPdf(new Request('https://ghost.test/pdf', { headers: authHeaders }), env, orderId)],
      ['download ZIP', () => handleLaunchBlueprintAssets(new Request('https://ghost.test/assets', { headers: authHeaders }), env, orderId)],
      ['download technical JSON', () => handleLaunchBlueprintJson(new Request('https://ghost.test/json', { headers: authHeaders }), env, orderId)],
      ['read progress', () => handleLaunchBlueprintProgress(new Request('https://ghost.test/progress', { headers: authHeaders }), env, orderId)],
      ['save progress', () => handleLaunchBlueprintProgress(new Request('https://ghost.test/progress', {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ completedDays: [1] })
      }), env, orderId)],
      ['publish site', () => handleLaunchSiteOwner(new Request('https://ghost.test/site/publish', { method: 'POST', headers: authHeaders }), env, orderId, 'publish')],
      ['unpublish site', () => handleLaunchSiteOwner(new Request('https://ghost.test/site/unpublish', { method: 'POST', headers: authHeaders }), env, orderId, 'unpublish')],
      ['view leads', () => handleLaunchSiteOwner(new Request('https://ghost.test/site/leads', { headers: authHeaders }), env, orderId, 'leads')],
      ['export leads', () => handleLaunchSiteOwner(new Request('https://ghost.test/site/leads.csv', { headers: authHeaders }), env, orderId, 'csv')],
      ['retry order', () => handleLaunchBlueprintRetry(new Request('https://ghost.test/retry', { method: 'POST', headers: authHeaders }), env, orderId)]
    ];

    for (const [label, run] of cases) {
      const response = await run();
      expect(response.status, label).toBe(404);
      const body = await response.text();
      expect(body, label).not.toContain(ownerEmail);
      expect(body, label).not.toContain(orderId);
      expect(body, label).not.toContain('cs_test_private');
      expect(body, label).not.toMatch(/r2|site_id|lead_count|verdict-private/i);
      expect(body, label).toContain('not found');
    }
  });
});
