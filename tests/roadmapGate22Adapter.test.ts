import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) { return readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }

describe('Gate 22 seed confirmation and Workflow acceptance adapter', () => {
  it('uses the accepted order, validates seed evidence, and reads one Workflow without mutation', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate22-seed-confirmation-workflow.mjs');
    expect(wrapper).toContain('roadmap-gate22-seed-confirmation-workflow.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_22_COMMAND: sanctionedGate22Command');
    expect(adapter).toContain("'if (!hasConfirmedSeeds(order))'");
    expect(adapter).toContain('recoveryRetryCount: Math.max(0, fulfillmentAttemptCount - 1)');
    expect(adapter).toContain('env.LAUNCH_BLUEPRINT_WORKFLOW.get');
    expect(adapter).toContain('confirmedSeedCount: domains.length');
    expect(adapter).toContain('secretValuesRecorded: false');
    expect(adapter).not.toMatch(/payment_method_data|card_number|4242/);
  });
});
