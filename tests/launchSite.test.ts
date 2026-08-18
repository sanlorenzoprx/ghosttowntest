import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { composeLaunchSitePresentation, handleLaunchSiteOwner, handlePublicLaunchLead, handlePublicLaunchSite, launchSitePublishFailures, renderLaunchSite, validateLaunchSitePresentation } from '../src/api/launchSite';
import { handleSignup } from '../src/api/auth';
import type { Env } from '../src/api/env';
import { checkoutAccessibilityBlueprintFixture as launchBlueprintFixture } from './fixtures/checkoutAccessibilityBlueprint';

describe('Launch Site canonical rendering and publish gates', () => {
  it('renders offer, price, positioning, and form from the existing canonical Blueprint', () => {
    const blueprint = launchBlueprintFixture();
    const html = renderLaunchSite(blueprint, 'family-game-night');
    expect(html).toContain(blueprint.launchSite.offer.headline);
    expect(html).toContain(blueprint.launchSite.offer.price);
    expect(html).toContain(blueprint.launchSite.positioning.differentiator);
    expect(html).toContain('/api/launch-sites/family-game-night/leads');
    expect(html).toContain('Validation-stage offer');
    expect(html).not.toContain(blueprint.ownerId);
  });

  it('composes the canonical ordered conversion system with honest truth labels', () => {
    const blueprint = launchBlueprintFixture();
    const model = composeLaunchSitePresentation(blueprint);
    expect(model.blocks.map(block => block.job)).toEqual([
      'hero', 'specific_promise', 'customer_qualifier', 'pain_cost', 'mechanism', 'offer', 'inclusions',
      'how_it_works', 'evidence_proof', 'risk_scope_boundary', 'primary_cta', 'objections', 'faq_final_cta'
    ]);
    expect(model.blocks.map(block => block.truthLabel)).toContain('VALIDATION_STAGE');
    expect(validateLaunchSitePresentation(model, blueprint)).toEqual([]);
  });

  it('fails closed when a generic claim enters the presentation model', () => {
    const blueprint = launchBlueprintFixture();
    const model = composeLaunchSitePresentation(blueprint);
    model.blocks[1].body = 'Unlock your potential with a game-changing workflow.';
    expect(validateLaunchSitePresentation(model, blueprint)).toContain('Generic conversion copy is not allowed on the validation Launch Site.');
  });

  it('fails closed for canonical drift, missing jobs, fabricated claims, proof-label drift, and incomplete artifact evidence', () => {
    const blueprint = launchBlueprintFixture();
    const mutations: Array<(model: ReturnType<typeof composeLaunchSitePresentation>) => void> = [
      model => { model.customer = 'Any business'; },
      model => { model.blocks.splice(4, 1); },
      model => { model.blocks[1].body = 'Customers achieved a 40% increase with limited spots.'; },
      model => { model.proofItems[0].label = 'PROOF_TO_EARN'; },
      model => { model.artifactSteps.pop(); },
    ];
    for (const mutate of mutations) {
      const model = composeLaunchSitePresentation(blueprint);
      mutate(model);
      expect(validateLaunchSitePresentation(model, blueprint).length).toBeGreaterThan(0);
    }
  });

  it('fails closed when canonical quality, proof, or legal requirements are missing', () => {
    const blueprint = launchBlueprintFixture();
    expect(launchSitePublishFailures(blueprint)).toEqual([]);
    blueprint.qualityGate.passed = false;
    blueprint.launchSite.proof.status = 'validation-stage';
    blueprint.launchSite.legal.privacyPolicy = false;
    expect(launchSitePublishFailures(blueprint)).toEqual(expect.arrayContaining([
      'The canonical Blueprint quality gate has not passed.',
      'Privacy, terms, and disclaimer flags must be enabled.'
    ]));
  });

  it('defines D1—not KV—as the lifecycle and lead database', async () => {
    const migration = await import('node:fs/promises').then(fs => fs.readFile(new URL('../migrations/0003_launch_sites.sql', import.meta.url), 'utf8'));
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS launch_sites');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS launch_site_leads');
    expect(migration).toContain('FOREIGN KEY(order_id) REFERENCES launch_blueprints(order_id)');
    expect(migration).not.toMatch(/kv/i);
  });

  it('reads publication state and canonical content from D1, then writes consented leads to D1', async () => {
    const blueprint = launchBlueprintFixture();
    let status = 'published';
    const leadBinds: unknown[][] = [];
    const database = {
      prepare(sql: string) {
        let bindings: unknown[] = [];
        return {
          bind(...values: unknown[]) { bindings = values; return this; },
          async first() {
            if (sql.includes('FROM launch_sites')) return status === 'published' ? { site_id: 'site-1', order_id: blueprint.orderId, owner_id: blueprint.ownerId, public_slug: 'family-game-night', status, published_at: blueprint.createdAt, unpublished_at: null, created_at: blueprint.createdAt, updated_at: blueprint.createdAt } : null;
            if (sql.includes('FROM launch_blueprints')) return { blueprint_json: JSON.stringify(blueprint), research_receipt_json: JSON.stringify({ provider: 'distribution_footprint' }), pdf_r2_key: 'private.pdf' };
            return null;
          },
          async run() { if (sql.includes('INSERT INTO launch_site_leads')) leadBinds.push(bindings); return { success: true }; }
        };
      }
    };
    const rateValues = new Map<string, string>();
    const environment = { DB: database, KV: { get: async (key: string) => rateValues.get(key) ?? null, put: async (key: string, value: string) => { rateValues.set(key, value); } } } as unknown as Env;
    const page = await handlePublicLaunchSite(new Request('https://ghost.test/launch/family-game-night'), environment, 'family-game-night');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain(blueprint.launchSite.offer.headline);
    const lead = await handlePublicLaunchLead(new Request('https://ghost.test/api/launch-sites/family-game-night/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.8' }, body: JSON.stringify({ email: 'lead@example.com', name: 'Lead', consent: true }) }), environment, 'family-game-night');
    expect(lead.status).toBe(201);
    expect(leadBinds).toHaveLength(1);
    expect(leadBinds[0]).toEqual(expect.arrayContaining(['site-1', 'lead@example.com']));
    status = 'unpublished';
    expect((await handlePublicLaunchSite(new Request('https://ghost.test/launch/family-game-night'), environment, 'family-game-night')).status).toBe(404);
  });

  it('behaviorally publishes and unpublishes through the owner handler and denies another account', async () => {
    const blueprint = launchBlueprintFixture();
    const values = new Map<string, string>();
    const KV = {
      get: async (key: string) => values.get(key) ?? null,
      put: async (key: string, value: string) => { values.set(key, value); },
      delete: async (key: string) => { values.delete(key); },
      list: async ({ prefix = '' }: { prefix?: string } = {}) => ({ keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) }),
    };
    const ownerId = 'owner@example.test';
    let siteStatus: 'draft' | 'published' | 'unpublished' = 'draft';
    const row = () => ({ site_id: 'site-checkout', order_id: blueprint.orderId, owner_id: ownerId, public_slug: 'checkout-audit', status: siteStatus, published_at: siteStatus === 'published' ? blueprint.createdAt : null, unpublished_at: siteStatus === 'unpublished' ? blueprint.createdAt : null, created_at: blueprint.createdAt, updated_at: blueprint.createdAt });
    const database = {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes('FROM launch_sites')) return row();
            if (sql.includes('FROM launch_blueprints')) return { blueprint_json: JSON.stringify(blueprint), research_receipt_json: JSON.stringify({ provider: 'distribution_footprint' }), pdf_r2_key: 'private.pdf' };
            return null;
          },
          async run() {
            if (sql.includes("status = 'published'")) siteStatus = 'published';
            if (sql.includes("status = 'unpublished'")) siteStatus = 'unpublished';
            return { success: true };
          },
          async all() { return { results: [] }; },
        };
      },
    };
    const environment = { DB: database, KV, JWT_SECRET: 'test-jwt-secret-with-enough-entropy' } as unknown as Env;
    await KV.put(`paid_test_order_${blueprint.orderId}`, JSON.stringify({ orderId: blueprint.orderId, email: ownerId, verdictId: blueprint.sourceVerdictId, status: 'ready', artifactType: 'launch_blueprint_v2', intake: {}, createdAt: blueprint.createdAt, updatedAt: blueprint.createdAt }));
    const signup = async (email: string) => {
      const response = await handleSignup(new Request('https://ghost.test/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'correct-horse-battery' }) }), environment);
      return (await response.json() as { token: string }).token;
    };
    const ownerToken = await signup(ownerId);
    const intruderToken = await signup('intruder@example.test');
    const ownerRequest = (path: string) => new Request(`https://ghost.test/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } });
    const published = await handleLaunchSiteOwner(ownerRequest('publish'), environment, blueprint.orderId, 'publish');
    expect(published.status).toBe(200);
    expect((await published.json() as { site: { status: string } }).site.status).toBe('published');
    const unpublished = await handleLaunchSiteOwner(ownerRequest('unpublish'), environment, blueprint.orderId, 'unpublish');
    expect(unpublished.status).toBe(200);
    expect((await unpublished.json() as { site: { status: string } }).site.status).toBe('unpublished');
    const denied = await handleLaunchSiteOwner(new Request('https://ghost.test/publish', { method: 'POST', headers: { Authorization: `Bearer ${intruderToken}` } }), environment, blueprint.orderId, 'publish');
    expect(denied.status).toBe(404);
    if (process.env.ROADMAP_Q4_LIFECYCLE_ARTIFACT_PATH) {
      writeFileSync(process.env.ROADMAP_Q4_LIFECYCLE_ARTIFACT_PATH, `${JSON.stringify({ schema_version: 'ghosttown-q4-lifecycle-evidence-v1', owner_publish: true, published_status: 'published', owner_unpublish: true, unpublished_status: 'unpublished', cross_account_denied: true, denial_status: 404, handler: 'handleLaunchSiteOwner', storage: 'D1', production_mutated: false }, null, 2)}\n`);
    }
  });
});
