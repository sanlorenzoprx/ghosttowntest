import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const repair = readFileSync(new URL('../scripts/roadmap-gate28-rematerialize-acceptance.mjs', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../scripts/roadmap-gate28-render-current-pdf.test.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../src/api/launchBlueprintWorkflow.ts', import.meta.url), 'utf8');
const fulfillment = readFileSync(new URL('../src/api/blueprintFulfillmentV21.ts', import.meta.url), 'utf8');

describe('Gate 28 acceptance artifact rematerialization', () => {
  it('proves the real paid workflow is wired to the v2.1 PDF renderer', () => {
    expect(workflow).toContain('completeLaunchBlueprintOrderV21');
    expect(workflow).toContain('persist canonical blueprint v2.1 artifacts before ready');
    expect(fulfillment).toContain("renderLaunchBlueprintPdfV21(blueprint)");
    expect(fulfillment).toContain('saveBlueprintRecordV21');
  });

  it('renders PDF, ZIP, and document receipt only from exact canonical JSON', () => {
    expect(helper).toContain('renderLaunchBlueprintPdfV21');
    expect(helper).toContain('buildBlueprintAssetZipFromCanonicalBytesV21');
    expect(helper).toContain('composeBlueprintDocumentModel');
    expect(helper).toContain('renderBlueprintDocumentHtml');
    expect(helper).toContain('canonicalJsonBytes');
    expect(helper).toContain("expect(JSON.stringify(blueprint)).toBe(before)");
    expect(helper).toContain('modelSha256');
    expect(helper).toContain('htmlSha256');
    expect(helper).toContain('cssSha256');
  });

  it('refuses to change the canonical Blueprint and preserves pre-repair evidence', () => {
    expect(repair).toContain("sha256(canonicalJsonBytes) !== gate27.artifacts.json.sha256");
    expect(repair).toContain('canonical_blueprint_unchanged: true');
    expect(repair).toContain('canonical_blueprint_regenerated: false');
    expect(repair).not.toContain('blueprint_json =');
    expect(repair).toContain('pre-rematerialization-blueprint.pdf');
    expect(repair).toContain('pre-rematerialization-assets.zip');
    expect(repair).toContain('pre-rematerialization-gate27-receipt.json');
    expect(repair).toContain('pre-rematerialization-research-receipt.json');
    expect(repair).toContain('pre-rematerialization-integrity-kv.json');
    expect(repair).toContain('pre-rematerialization-pointer-kv.json');
  });

  it('updates all acceptance integrity authorities and requires Gates 27 and 28 to reverify', () => {
    expect(repair).toContain("'ghosttowntest-blueprints-acceptance'");
    expect(repair).toContain("'ghosttowntest-private-blueprints-acceptance'");
    expect(repair).toContain('paid_test_blueprint_integrity_');
    expect(repair).toContain('paid_test_blueprint_pointer_');
    expect(repair).toContain('generationReceiptEvidence.document = documentReceipt');
    expect(repair).toContain("for (const id of ['27', '28'])");
    expect(repair).toContain("status: 'PENDING'");
  });

  it('rolls every acceptance authority back if any mutation or verification step fails', () => {
    expect(repair).toContain('rollback-research-receipt.sql');
    expect(repair).toContain('rollback-integrity-receipt.json');
    expect(repair).toContain('rollback-blueprint-pointer.json');
    expect(repair).toContain('putPresentationArtifacts(orderId, oldPdfPath, oldZipPath)');
    expect(repair).toContain('rollback_on_partial_failure: true');
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
