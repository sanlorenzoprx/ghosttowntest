import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 19 Stripe webhook acceptance adapter', () => {
  it('uses the installed Wrangler-compatible secret list form and parses names without exposing values', async () => {
    const gate19 = await readText('scripts/roadmap-gate19-stripe-webhook-registration-smoke.mjs');

    expect(gate19).toContain("runWrangler(['secret', 'list', '--env', 'acceptance'])");
    expect(gate19).not.toContain("['secret', 'list', '--env', 'acceptance', '--json']");
    expect(gate19).toContain('function parseSecretNames(text)');
    expect(gate19).toContain('names.has(SIGNING_SECRET_NAME)');
    expect(gate19).toContain("const SIGNING_SECRET_NAME = 'STRIPE_WEBHOOK_SECRET'");
    expect(gate19).toContain('secretValuesRecorded: false');
  });

  it('keeps Stripe verification read-only and acceptance-scoped', async () => {
    const gate19 = await readText('scripts/roadmap-gate19-stripe-webhook-registration-smoke.mjs');

    expect(gate19).toContain("fetch('https://api.stripe.com/v1/webhook_endpoints?limit=100'");
    expect(gate19).toContain("method: 'GET'");
    expect(gate19).toContain("const WORKER_URL = 'https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev'");
    expect(gate19).toContain("endpoint.livemode !== false");
    expect(gate19).not.toMatch(/\/v1\/webhook_endpoints'\s*,\s*\{[\s\S]{0,160}method:\s*'POST'/);
    expect(gate19).not.toContain("method: 'DELETE'");
  });
});
