import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function text(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 30 durable recovery v3', () => {
  it('excludes only read-normalized timestamps from progress equality', async () => {
    const gate = await text('scripts/roadmap-gate30-second-device-recovery-v3.mjs');
    const store = await text('src/api/blueprintStore.ts');

    expect(store).toContain('updatedAt: new Date().toISOString()');
    expect(store).toContain('updatedAt: limitedText(item.updatedAt, 64) || new Date().toISOString()');

    expect(gate).toContain('delete copy.updatedAt');
    expect(gate).toContain('delete draft.updatedAt');
    expect(gate).toContain('delete copy.acsReadiness.assessedAt');

    for (const durable of [
      'completedDays', 'evidenceNotes', 'evidenceLedger', 'checkpointReviews',
      'reminderPreferences', 'scheduledReminders', 'assetDrafts', 'metrics', 'finalDecision'
    ]) {
      expect(gate).not.toContain(`delete copy.${durable}`);
    }
    expect(gate).toContain('validateExecution(progressView.body.progress, gate26)');
    expect(gate).toContain('gate27.artifacts.json.sha256');
    expect(gate).toContain('gate27.artifacts.pdf.sha256');
    expect(gate).toContain('gate27.artifacts.zip.sha256');
  });

  it('remains read-only and proves two distinct owner sessions', async () => {
    const gate = await text('scripts/roadmap-gate30-second-device-recovery-v3.mjs');
    expect(gate).toContain("fresh_authentication_contexts: 2");
    expect(gate).toContain("mutation_scope_verified: 'none'");
    expect(gate).toContain("acceptance_resources_mutated: false");
    expect(gate).toContain('if (token2 === token1)');
    expect(gate).not.toContain("'deploy'");
    expect(gate).not.toContain('/publish');
    expect(gate).not.toContain('/unpublish');
    expect(gate).not.toContain('/blueprint/retry');
    expect(gate).not.toContain('/paid-test/checkout');
    expect(gate).not.toContain('api.stripe.com');
    expect(gate).not.toContain('/rematerialize');
  });
});
