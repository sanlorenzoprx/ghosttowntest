import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bridge = readFileSync(new URL('../scripts/roadmap-r2-binding-bridge.mjs', import.meta.url), 'utf8');
const bridgeWorker = readFileSync(new URL('../scripts/roadmap-r2-binding-worker.ts', import.meta.url), 'utf8');
const repair = readFileSync(new URL('../scripts/roadmap-gate28-rematerialize-acceptance-v3.mjs', import.meta.url), 'utf8');
const gate27 = readFileSync(new URL('../scripts/roadmap-gate27-private-r2-artifacts.mjs', import.meta.url), 'utf8');
const gate28 = readFileSync(new URL('../scripts/roadmap-gate28-zip-pdf-product.mjs', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../scripts/roadmap-gate28-render-current-pdf.test.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../src/api/launchBlueprintWorkflow.ts', import.meta.url), 'utf8');
const fulfillment = readFileSync(new URL('../src/api/blueprintFulfillmentV21.ts', import.meta.url), 'utf8');

describe('Gate 27/28 authoritative acceptance artifact path', () => {
  it('proves paid fulfillment writes through the v2.1 Worker R2 binding path', () => {
    expect(workflow).toContain('completeLaunchBlueprintOrderV21');
    expect(fulfillment).toContain('renderLaunchBlueprintPdfV21(blueprint)');
    expect(fulfillment).toContain('saveBlueprintRecordV21');
  });

  it('uses a local Worker with a remote BLUEPRINTS binding for acceptance R2 reads and writes', () => {
    expect(bridge).toContain('remote = true');
    expect(bridge).toContain("'dev'");
    expect(bridgeWorker).toContain('env.BLUEPRINTS.get');
    expect(bridgeWorker).toContain('env.BLUEPRINTS.put');
    expect(bridgeWorker).toContain('customMetadata');
  });

  it('never allows the repair bridge to rewrite canonical JSON', () => {
    expect(bridgeWorker).toContain('Canonical JSON is read-only through this bridge');
    expect(repair).toContain('canonical_blueprint_unchanged: true');
    expect(repair).toContain('canonical_blueprint_regenerated: false');
  });

  it('renders PDF and ZIP only from exact canonical JSON', () => {
    expect(helper).toContain('renderLaunchBlueprintPdfV21');
    expect(helper).toContain('buildBlueprintAssetZipFromCanonicalBytesV21');
    expect(helper).toContain('canonicalJsonBytes');
    expect(helper).toContain('expect(JSON.stringify(blueprint)).toBe(before)');
  });

  it('repairs and verifies through the same Worker-visible R2 object set', () => {
    expect(repair).toContain('withAcceptanceR2Binding');
    expect(repair).toContain("r2_mutation_path: 'workers_remote_binding'");
    expect(repair).toContain('r2_exact_round_trip_verified: true');
    expect(repair).toContain('rollback_on_partial_failure: true');
  });

  it('forces Gate 27 and Gate 28 to certify Worker-binding-visible bytes rather than Wrangler object CLI bytes', () => {
    expect(gate27).toContain('withAcceptanceR2Binding');
    expect(gate27).toContain("r2_read_path: 'workers_remote_binding'");
    expect(gate28).toContain('withAcceptanceR2Binding');
    expect(gate28).toContain("r2_read_path:'workers_remote_binding'");
    expect(gate27).not.toContain("'r2', 'object', 'get'");
    expect(gate28).not.toContain("'r2', 'object', 'get'");
  });

  it('does not replay purchase, research, Vertex generation, or touch production', () => {
    expect(repair).toContain('purchase_replayed: false');
    expect(repair).toContain('stripe_charge_created: false');
    expect(repair).toContain('research_replayed: false');
    expect(repair).toContain('vertex_invoked: false');
    expect(repair).toContain('production_mutated: false');
    expect(repair).toContain('production_deployed: false');
    expect(repair).not.toContain('api.stripe.com');
    expect(repair).not.toContain('VERTEX_SERVICE_ACCOUNT');
  });
});
