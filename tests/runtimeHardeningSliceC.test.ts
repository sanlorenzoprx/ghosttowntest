import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/api/env';
import { productionRuntimeBindingGuard } from '../src/api/runtimeControls';
import { handleStripeWebhook } from '../src/api/webhook';

const launchSiteSource = readFileSync(new URL('../src/api/launchSite.ts', import.meta.url), 'utf8');
const copilotSource = readFileSync(new URL('../src/api/blueprintExecutionCopilot.ts', import.meta.url), 'utf8');
const webhookSource = readFileSync(new URL('../src/api/webhook.ts', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');

async function stripeSignature(body: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  ));
  const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

describe('Slice C runtime hardening', () => {
  it('keeps webhook exception details in logs instead of the HTTP response', async () => {
    const secret = 'whsec_slice_c_test_only';
    const sensitive = 'sensitive provider detail that must not leave the Worker';
    const body = JSON.stringify({
      id: 'evt_slice_c',
      type: 'checkout.session.completed',
      data: { object: {} }
    });
    const request = new Request('https://api.example.test/api/webhook/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': await stripeSignature(body, secret) },
      body
    });
    const env = {
      STRIPE_WEBHOOK_SECRET: secret,
      KV: {
        get: async () => { throw new Error(sensitive); }
      }
    } as unknown as Env;

    const response = await handleStripeWebhook(request, env);
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(text).toContain('Webhook payment finalization failed');
    expect(text).not.toContain(sensitive);
    expect(webhookSource).not.toContain("error instanceof Error ? error.message : 'Webhook payment finalization failed'");
  });

  it('returns a deliberate privacy-safe 503 when a production Blueprint binding is unavailable', async () => {
    const request = new Request('https://api.ghosttowntest.com/api/paid-test/orders/order-1/blueprint/pdf');
    const response = productionRuntimeBindingGuard(request, { DEPLOYMENT_ENV: 'production' } as Env);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    expect(response!.headers.get('Retry-After')).toBe('300');
    const text = await response!.text();
    expect(text).toContain('GHOSTTOWN_RUNTIME_UNAVAILABLE');
    expect(text).not.toMatch(/DB|BLUEPRINTS|LAUNCH_BLUEPRINT_WORKFLOW/);
    expect(productionRuntimeBindingGuard(request, { DEPLOYMENT_ENV: 'acceptance' } as Env)).toBeNull();
    expect(productionRuntimeBindingGuard(new Request('https://api.ghosttowntest.com/api/verdict'), { DEPLOYMENT_ENV: 'production' } as Env)).toBeNull();
  });

  it('uses D1 atomic rate gates instead of KV read-modify-write counters for paid Copilot and Launch Site leads', () => {
    expect(copilotSource).toContain('consumeHourlyRateLimit');
    expect(copilotSource).not.toContain('execution_copilot_rate:');
    expect(launchSiteSource).toContain('consumeHourlyRateLimit');
    expect(launchSiteSource).not.toContain('launch_lead_rate_');
  });

  it('keeps local developer secrets out of tracked Wrangler configuration', () => {
    expect(gitignore).toMatch(/^\.dev\.vars$/m);
    expect(gitignore).toMatch(/^\.dev\.vars\.\*$/m);
    expect(wrangler).not.toMatch(/^\s*JWT_SECRET\s*=/m);
    expect(wrangler).not.toMatch(/^\s*STRIPE_SECRET_KEY\s*=/m);
    expect(wrangler).not.toMatch(/^\s*STRIPE_WEBHOOK_SECRET\s*=/m);
    expect(wrangler).toContain('untracked .dev.vars');
  });

  it('preserves the paid architecture anchors while hardening its boundaries', () => {
    expect(webhookSource).toContain('markLaunchBlueprintAwaitingSeeds');
    expect(webhookSource).toContain("artifactType: 'launch_blueprint_v2'");
    expect(wrangler).toContain('binding = "LAUNCH_BLUEPRINT_WORKFLOW"');
    expect(wrangler).toContain('class_name = "LaunchBlueprintWorkflow"');
    expect(wrangler).toContain('binding = "BLUEPRINTS"');
  });
});
