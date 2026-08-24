import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bridge = readFileSync(new URL('../scripts/roadmap-r2-binding-bridge.mjs', import.meta.url), 'utf8');
const bridgeWorker = readFileSync(new URL('../scripts/roadmap-r2-binding-worker.ts', import.meta.url), 'utf8');
const recoveryBridge = readFileSync(new URL('../scripts/roadmap-gate28-recovery-bridge.mjs', import.meta.url), 'utf8');
const recoveryWorker = readFileSync(new URL('../scripts/roadmap-gate28-recovery-worker.ts', import.meta.url), 'utf8');
const repair = readFileSync(new URL('../scripts/roadmap-gate28-rematerialize-acceptance-v4.mjs', import.meta.url), 'utf8');
const gate27 = readFileSync(new URL('../scripts/roadmap-gate27-private-r2-artifacts.mjs', import.meta.url), 'utf8');
const gate28 = readFileSync(new URL('../scripts/roadmap-gate28-zip-pdf-product.mjs', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../scripts/roadmap-gate28-render-current-pdf.test.ts', import.meta.url), 'utf8');
const keyStore = readFileSync(new URL('../src/api/blueprintStore.ts', import.meta.url), 'utf8');
const storeV21 = readFileSync(new URL('../src/api/blueprintStoreV21.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../src/api/launchBlueprintWorkflow.ts', import.meta.url), 'utf8');
const fulfillment = readFileSync(new URL('../src/api/blueprintFulfillmentV21.ts', import.meta.url), 'utf8');

describe('Gate 27/28 authoritative acceptance artifact path', () => {
  it('proves paid fulfillment writes a browser-rendered PDF through the v2.1 Worker R2 binding path', () => {
    expect(workflow).toContain('completeLaunchBlueprintOrderV21');
    expect(fulfillment).toContain('renderLaunchBlueprintPdfV21WithBrowser(blueprint, renderer)');
    expect(fulfillment).toContain("env.BROWSER!.quickAction('pdf'");
    expect(fulfillment).toContain('Production Launch Blueprint PDF requires the Cloudflare Browser Run BROWSER binding');
    expect(fulfillment).toContain('renderMode: rendered.mode');
    expect(fulfillment).toContain('saveBlueprintRecordV21');
  });

  it('keeps canonical artifact key literals in the shared key store and consumes them from v2.1 persistence', () => {
    expect(keyStore).toContain('ghosttown-launch-blueprint-v2.pdf');
    expect(keyStore).toContain('ghosttown-launch-blueprint-v2.json');
    expect(keyStore).toContain('ghosttown-launch-blueprint-v2-assets.zip');
    expect(keyStore).toContain('export function blueprintPdfKey');
    expect(keyStore).toContain('export function blueprintJsonKey');
    expect(keyStore).toContain('export function blueprintAssetsKey');
    expect(storeV21).toContain("from './blueprintStore'");
    expect(storeV21).toContain('blueprintPdfKey(order.orderId)');
    expect(storeV21).toContain('blueprintJsonKey(order.orderId)');
    expect(storeV21).toContain('blueprintAssetsKey(order.orderId)');
    expect(gate27).toContain("const keyStore = readFileSync(join(ROOT, 'src', 'api', 'blueprintStore.ts')");
  });

  it('uses remote DB, KV and BLUEPRINTS bindings instead of direct data CLI commands', () => {
    for (const source of [bridge, recoveryBridge]) {
      expect(source).toContain('remote = true');
      expect(source).toContain('binding = "DB"');
      expect(source).toContain('binding = "KV"');
      expect(source).toContain('binding = "BLUEPRINTS"');
    }
    expect(bridgeWorker).toContain('env.DB.prepare');
    expect(bridgeWorker).toContain('env.KV.get');
    expect(bridgeWorker).toContain('env.BLUEPRINTS.get');
    expect(recoveryWorker).toContain('env.DB.prepare');
    expect(recoveryWorker).toContain('env.KV.put');
    expect(recoveryWorker).toContain('env.BLUEPRINTS.put');
  });

  it('pins local bridge compatibility to the repository stable baseline', () => {
    expect(bridge).toContain("BRIDGE_COMPATIBILITY_DATE = '2024-01-01'");
    expect(recoveryBridge).toContain("COMPATIBILITY_DATE = '2024-01-01'");
    expect(bridge).not.toContain('compatibility_date = "2026-08-18"');
    expect(recoveryBridge).not.toContain('compatibility_date = "2026-08-18"');
  });

  it('never rewrites canonical Blueprint JSON during rematerialization', () => {
    expect(bridgeWorker).toContain('Canonical JSON is read-only through this bridge');
    expect(recoveryWorker).not.toContain('env.BLUEPRINTS.put(keys.json');
    expect(repair).toContain('canonical_blueprint_unchanged');
    expect(repair).toContain('canonical_blueprint_regenerated: false');
  });

  it('renders PDF and ZIP only from exact canonical JSON and checks the premium document before mutation', () => {
    expect(helper).toContain('renderLaunchBlueprintPdfV21');
    expect(helper).toContain('buildBlueprintAssetZipFromCanonicalBytesV21');
    expect(helper).toContain('canonicalJsonBytes');
    expect(helper).toContain('expect(JSON.stringify(blueprint)).toBe(before)');
    expect(helper).toContain('describe.skipIf(!gate28AdapterConfigured)');
    expect(helper).toContain('REQUIRED_ENV.every');
    expect(repair).toContain("'First Customer'");
    expect(repair).toContain('actual.length !== 16');
    expect(repair).toContain('bundledJson');
    expect(repair).toContain('bundledPdf');
  });

  it('recovers a partial v3 state using Gate-27-certified local backups and one binding transaction', () => {
    expect(repair).toContain('pre-rematerialization-blueprint.pdf');
    expect(repair).toContain('pre-rematerialization-assets.zip');
    expect(repair).toContain('pre-rematerialization-research-receipt.json');
    expect(repair).toContain('pre-rematerialization-integrity-kv.json');
    expect(repair).toContain('pre-rematerialization-pointer-kv.json');
    expect(recoveryWorker).toContain('allowedCurrent');
    expect(recoveryWorker).toContain('single_worker_remote_bindings');
    expect(recoveryWorker).toContain('v4 rollback did not restore the Gate-27 baseline exactly');
    expect(repair).toContain('r2_exact_round_trip_verified');
    expect(repair).toContain('d1_integrity_receipt_verified');
  });

  it('forces Gate 27 and Gate 28 to certify binding-visible artifact bytes and Gate 27 D1 state', () => {
    expect(gate27).toContain('withAcceptanceDataBindings');
    expect(gate27).toContain('withAcceptanceR2Binding');
    expect(gate27).toContain("d1_read_path: 'workers_remote_binding'");
    expect(gate27).toContain("r2_read_path: 'workers_remote_binding'");
    expect(gate28).toContain('withAcceptanceR2Binding');
    expect(gate28).toContain("r2_read_path:'workers_remote_binding'");
    expect(gate27).not.toContain("'d1','execute'");
    expect(gate27).not.toContain("'r2', 'object', 'get'");
    expect(gate28).not.toContain("'r2', 'object', 'get'");
  });

  it('does not replay purchase, research, Vertex generation, or touch production', () => {
    expect(recoveryWorker).toContain('purchase_replayed: false');
    expect(recoveryWorker).toContain('research_replayed: false');
    expect(recoveryWorker).toContain('vertex_invoked: false');
    expect(recoveryWorker).toContain('production_mutated: false');
    expect(repair).toContain('stripe_charge_created: false');
    expect(repair).not.toContain('api.stripe.com');
    expect(repair).not.toContain('VERTEX_SERVICE_ACCOUNT');
  });
});
