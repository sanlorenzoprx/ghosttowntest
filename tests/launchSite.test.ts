import { describe, expect, it } from 'vitest';
import { composeLaunchSitePresentation, handlePublicLaunchLead, handlePublicLaunchSite, launchSitePublishFailures, renderLaunchSite, validateLaunchSitePresentation } from '../src/api/launchSite';
import type { Env } from '../src/api/env';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

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
});
