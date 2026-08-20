import { describe, expect, it } from 'vitest';
import { BLUEPRINT_ASSET_FILENAMES, buildBlueprintAssetFiles, buildBlueprintAssetZip } from '../src/api/blueprintAssets';
import { handleLaunchBlueprintAssets } from '../src/api/blueprintApi';
import { handleSignup } from '../src/api/auth';
import type { Env } from '../src/api/env';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

describe('canonical Blueprint asset package', () => {
  it('contains the complete manifest and derives every business asset from Blueprint v2', () => {
    const blueprint = launchBlueprintFixture();
    const files = buildBlueprintAssetFiles(blueprint, new Uint8Array([37, 80, 68, 70]));
    expect(files.map(file => file.name.replace('ghosttown-launch-blueprint/', ''))).toEqual(BLUEPRINT_ASSET_FILENAMES);
    const text = new TextDecoder().decode(files.find(file => file.name.endsWith('blueprint.json'))!.data);
    expect(JSON.parse(text)).toEqual(blueprint);
    expect(new TextDecoder().decode(files.find(file => file.name.endsWith('launch-site-config.json'))!.data)).toBe(JSON.stringify(blueprint.launchSite, null, 2));
    expect(new TextDecoder().decode(files.find(file => file.name.endsWith('media-and-distribution-network.csv'))!.data)).toContain(blueprint.customerAccessPack.channels[0].publicUrl);
  });

  it('writes a valid deterministic ZIP without provider payloads, prompts, or secrets', () => {
    const blueprint = launchBlueprintFixture();
    const first = buildBlueprintAssetZip(blueprint, new Uint8Array([1, 2, 3]));
    const second = buildBlueprintAssetZip(blueprint, new Uint8Array([1, 2, 3]));
    expect(Array.from(first.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(first).toEqual(second);
    const printable = new TextDecoder().decode(first);
    expect(printable).not.toMatch(/gemini_api_key|dataforseo_password|system prompt|raw provider/i);
  }, 15_000);

  it('serves the private R2 ZIP only through the paid-order ownership boundary', async () => {
    const values = new Map<string, string>();
    const kv = {
      get: async (key: string) => values.get(key) ?? null,
      put: async (key: string, value: string) => { values.set(key, value); },
      list: async ({ prefix = '' }: { prefix?: string } = {}) => ({ keys: [...values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) })
    };
    const object = { body: new Uint8Array([0x50, 0x4b]), httpEtag: 'etag-assets', writeHttpMetadata: (_headers: Headers) => undefined };
    const environment = { KV: kv, AI: {}, BLUEPRINTS: { get: async () => object }, JWT_SECRET: 'test-secret-with-enough-entropy', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' } as unknown as Env;
    const signup = await handleSignup(new Request('https://ghost.test/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password: 'correct-horse' }) }), environment);
    const token = (await signup.json() as { token: string }).token;
    await kv.put('paid_test_order_order-1', JSON.stringify({ orderId: 'order-1', email: 'owner@example.com', verdictId: 'v1', status: 'ready', artifactType: 'launch_blueprint_v2', intake: {}, createdAt: '', updatedAt: '' }));
    expect((await handleLaunchBlueprintAssets(new Request('https://ghost.test/assets'), environment, 'order-1')).status).toBe(401);
    const response = await handleLaunchBlueprintAssets(new Request('https://ghost.test/assets', { headers: { Authorization: `Bearer ${token}` } }), environment, 'order-1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
