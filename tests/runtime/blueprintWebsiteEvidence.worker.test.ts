import { describe, expect, it } from 'vitest';
import { env as runtimeEnv } from 'cloudflare:workers';
import type { Env } from '../../src/api/env';
import { handleSignup } from '../../src/api/auth';
import { handleLaunchBlueprintWebsiteEvidence } from '../../src/api/blueprintApi';

const env = runtimeEnv as unknown as Env;

async function createOwner(label: string): Promise<{ email: string; token: string; sprintId: string }> {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const email = `${label}-${suffix}@website-evidence.runtime.test`;
  const sprintId = `gtt_runtime_web_${suffix}`;

  const signup = await handleSignup(new Request('https://api.test/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'runtime-password' }),
  }), env);
  expect(signup.status).toBe(200);
  const { token } = await signup.json() as { token: string };

  await env.KV.put(`paid_test_order_${sprintId}`, JSON.stringify({
    orderId: sprintId,
    email,
    status: 'ready',
    artifactType: 'launch_blueprint_v2',
  }));

  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO launch_blueprints (
      order_id, owner_id, source_verdict_id, schema_version, status,
      blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at
    ) VALUES (?, ?, 'runtime-verdict', 'ghosttown-launch-blueprint-v2.1', 'ready', '{}', '{}', 'runtime.pdf', ?, ?)
  `).bind(sprintId, email, now, now).run();

  return { email, token, sprintId };
}

function ownerRequest(token: string, sprintId: string): Request {
  return new Request(
    `https://api.test/api/paid-test/orders/${encodeURIComponent(sprintId)}/blueprint/website-evidence`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

async function seedGetMeLive(input: {
  email: string;
  sprintId: string;
  visits?: number;
  shares?: number;
  sales?: number;
  revenueCents?: number;
}): Promise<string> {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const orderId = `gml_runtime_web_${suffix}`;
  const now = new Date().toISOString();
  const customDomain = {
    schemaVersion: 'get-me-live-custom-domain-v1',
    version: 1,
    name: 'example.test',
    hosts: ['example.test', 'www.example.test'],
    zoneId: 'zone_runtime',
    status: 'active',
    step: 'active',
    addedAt: now,
    activatedAt: now,
  };

  await env.DB.prepare(`
    INSERT INTO get_me_live_orders (
      order_id, owner_id, source_sprint_order_id, source_blueprint_id,
      offer_id, offer_version, stripe_price_id, status, configuration_json,
      provider_state_json, public_url, hosting_json, custom_domain_json,
      created_at, updated_at, paid_at, published_at
    ) VALUES (?, ?, ?, 'bp_runtime', 'ghosttown_get_me_live_v1', '1.0',
      'price_runtime', 'live', '{}', ?, 'https://example.pages.dev', ?, ?, ?, ?, ?, ?)
  `).bind(
    orderId,
    input.email,
    input.sprintId,
    JSON.stringify({ cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false }),
    JSON.stringify({ pagesUrl: 'https://example.pages.dev' }),
    JSON.stringify(customDomain),
    now,
    now,
    now,
    now,
  ).run();

  await env.DB.prepare(`
    INSERT INTO get_me_live_activity_counts (get_me_live_order_id, visit_count, share_count, updated_at)
    VALUES (?, ?, ?, ?)
  `).bind(orderId, input.visits || 0, input.shares || 0, now).run();

  await env.DB.prepare(`
    INSERT INTO get_me_live_leads (
      lead_id, get_me_live_order_id, name, email, message, consent_text, source_path, created_at
    ) VALUES (?, ?, 'Private Person', 'private@example.test', 'Can you deliver this by Friday?', 'yes', '/', ?)
  `).bind(`lead_${suffix}`, orderId, now).run();

  await env.DB.prepare(`
    INSERT INTO get_me_live_leads (
      lead_id, get_me_live_order_id, name, email, message, consent_text, source_path, created_at
    ) VALUES (?, ?, 'No Message', 'nomessage@example.test', NULL, 'yes', '/', ?)
  `).bind(`lead_nomsg_${suffix}`, orderId, new Date(Date.now() - 1000).toISOString()).run();

  for (let i = 0; i < (input.sales || 0); i += 1) {
    const revenue = i === 0 ? (input.revenueCents || 0) : 0;
    const eventId = `payment_${suffix}_${i}`;
    const payload = {
      revenueCents: revenue,
      sourceReference: `get-me-live:${orderId}:runtime-${i}`,
    };
    await env.DB.prepare(`
      INSERT INTO observed_evidence_events (
        event_id, order_id, event_type, source, evidence_class, evidence_strength,
        payload_sha256, payload_json, occurred_at, ingested_at, applied_at
      ) VALUES (?, ?, 'payment', 'runtime-test', 'commercial', 'strong', ?, ?, ?, ?, ?)
    `).bind(eventId, input.sprintId, 'runtime-sha', JSON.stringify(payload), now, now, now).run();
  }

  return orderId;
}

describe('Sprint website evidence on real Cloudflare bindings', () => {
  it('keeps the Sprint valid when the owner has not purchased Get Me Live', async () => {
    const owner = await createOwner('no-gml');
    const response = await handleLaunchBlueprintWebsiteEvidence(
      ownerRequest(owner.token, owner.sprintId),
      env,
      owner.sprintId,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      websiteEvidence: {
        available: false,
        separateProduct: true,
      },
    });
  });

  it('returns linked website activity and anonymous recent feedback only', async () => {
    const owner = await createOwner('linked');
    const orderId = await seedGetMeLive({
      email: owner.email,
      sprintId: owner.sprintId,
      visits: 41,
      shares: 6,
      sales: 2,
      revenueCents: 12500,
    });

    const response = await handleLaunchBlueprintWebsiteEvidence(
      ownerRequest(owner.token, owner.sprintId),
      env,
      owner.sprintId,
    );
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, any>;

    expect(body.websiteEvidence).toMatchObject({
      available: true,
      separateProduct: true,
      getMeLiveOrderId: orderId,
      status: 'live',
      liveUrl: 'https://example.test',
      activity: {
        visits: 41,
        leads: 2,
        shares: 6,
        sales: 2,
        revenueCents: 12500,
      },
      recentFeedback: [{
        message: 'Can you deliver this by Friday?',
        sourcePath: '/',
      }],
    });
    expect(JSON.stringify(body)).not.toContain('private@example.test');
    expect(JSON.stringify(body)).not.toContain('Private Person');
    expect(JSON.stringify(body)).not.toContain('nomessage@example.test');
  });

  it('does not expose another owner Sprint or linked website activity', async () => {
    const owner = await createOwner('owner');
    await seedGetMeLive({ email: owner.email, sprintId: owner.sprintId, visits: 9 });
    const intruder = await createOwner('intruder');

    const response = await handleLaunchBlueprintWebsiteEvidence(
      ownerRequest(intruder.token, owner.sprintId),
      env,
      owner.sprintId,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: 'Launch Blueprint not found' });
  });
});
