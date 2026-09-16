import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import worker from '../src/api/worker';
import type { Env } from '../src/api/env';
import { productionRuntimeBindingGuard } from '../src/api/runtimeControls';

function minimalEnv(extra: Partial<Env> = {}): Env {
  return {
    AI: {} as Ai,
    JWT_SECRET: 'secret', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec',
    ...extra
  } as Env;
}

describe('observed evidence runtime contract', () => {
  it('uses an idempotent D1 event table as the durable automatic-evidence source', async () => {
    const migration = await readFile(new URL('../migrations/0007_observed_evidence_events.sql', import.meta.url), 'utf8');
    expect(migration).toContain('event_id TEXT PRIMARY KEY');
    expect(migration).toContain("evidence_class TEXT NOT NULL CHECK(evidence_class IN ('market', 'customer', 'commercial'))");
    expect(migration).toContain('payload_sha256 TEXT NOT NULL');
    expect(migration).toContain('FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id) ON DELETE CASCADE');
  });

  it('requires D1 in production for Story Studio evidence ingestion', () => {
    const request = new Request('https://ghost.test/api/integrations/story-studio/evidence', { method: 'POST' });
    expect(productionRuntimeBindingGuard(request, minimalEnv({ DEPLOYMENT_ENV: 'production' }))).not.toBeNull();
    expect(productionRuntimeBindingGuard(request, minimalEnv({ DEPLOYMENT_ENV: 'production', DB: true as never }))).toBeNull();
  });
  it('registers the Story Studio endpoint in the Worker router', async () => {
    const response = await worker.fetch(new Request('https://ghost.test/api/integrations/story-studio/evidence', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    }), minimalEnv({ DEPLOYMENT_ENV: 'development' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Story Studio evidence ingestion is not configured' });
  });
});
