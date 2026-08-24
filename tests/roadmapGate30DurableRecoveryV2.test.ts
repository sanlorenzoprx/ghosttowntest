import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 30 durable recovery v2', () => {
  it('compares durable state rather than volatile read-time timestamps', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery-v2.mjs');
    expect(gate30).toContain('function materialProgress(progress, persisted)');
    expect(gate30).toContain('if (!persisted) delete copy.updatedAt');
    expect(gate30).toContain('function materialExecution(log)');
    expect(gate30).toContain('delete copy.acsReadiness.assessedAt');
    expect(gate30).toContain('volatile_empty_progress_updated_at_ignored');
    expect(gate30).toContain('volatile_acs_assessed_at_ignored: true');
  });

  it('keeps persisted execution evidence and certified artifact identity strict', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery-v2.mjs');
    expect(gate30).toContain('progress.completedDays.length !== Number(gate26.execution.completed_action_rows');
    expect(gate30).toContain('progress.evidenceLedger.length !== Number(gate26.execution.evidence_rows');
    expect(gate30).toContain('progress.checkpointReviews.length !== Number(gate26.execution.checkpoint_review_rows');
    expect(gate30).toContain('gate27.artifacts.json.sha256');
    expect(gate30).toContain('gate27.artifacts.pdf.sha256');
    expect(gate30).toContain('gate27.artifacts.zip.sha256');
    expect(gate30).toContain('gate26.canonical.canonical_blueprint_sha256');
    expect(gate30).toContain('gate29.site_id_sha256');
    expect(gate30).toContain('gate29.public_slug_sha256');
    expect(gate30).toContain('gate29.public_url_sha256');
  });

  it('remains read-only and never replays commercial or generation work', async () => {
    const gate30 = await readText('scripts/roadmap-gate30-second-device-recovery-v2.mjs');
    expect(gate30).toContain("mutation_scope_verified: 'none'");
    expect(gate30).toContain('acceptance_resources_mutated: false');
    expect(gate30).toContain('purchase_replayed: false');
    expect(gate30).toContain('workflow_replayed: false');
    expect(gate30).toContain('research_replayed: false');
    expect(gate30).toContain('vertex_invoked: false');
    expect(gate30).toContain('production_deployed: false');
    expect(gate30).not.toContain("'deploy'");
    expect(gate30).not.toContain('/publish');
    expect(gate30).not.toContain('/unpublish');
    expect(gate30).not.toContain('/blueprint/retry');
    expect(gate30).not.toContain('/paid-test/checkout');
    expect(gate30).not.toContain('api.stripe.com');
    expect(gate30).not.toContain('/rematerialize');
  });
});
