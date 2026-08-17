import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 23 paid provider research acceptance adapter', () => {
  it('is wired as the sanctioned default adapter after the paid-order Workflow evidence', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate23-paid-provider-research.mjs');

    expect(wrapper).toContain('roadmap-gate23-paid-provider-research.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_23_COMMAND: sanctionedGate23Command');
    expect(adapter).toContain("state?.gates?.['22']?.status !== 'PASS'");
    expect(adapter).toContain("gate20-purchase.json");
    expect(adapter).toContain('GATE23_RECEIPT_PATH');
  });

  it('reads persisted D1/KV evidence without replaying provider research or payment', async () => {
    const adapter = await readText('scripts/roadmap-gate23-paid-provider-research.mjs');

    expect(adapter).toContain("SELECT status, research_receipt_json FROM launch_blueprints WHERE order_id = ?");
    expect(adapter).toContain("env.KV.get('paid_test_order_' + ORDER_ID)");
    expect(adapter).toContain("receipt?.provider !== 'distribution_footprint'");
    expect(adapter).toContain('attemptedSourceCount < 1');
    expect(adapter).toContain('successfulSourceCount < 1');
    expect(adapter).toContain('sourceTypeCount < 1');
    expect(adapter).toContain('candidateChannelCount < 10');
    expect(adapter).toContain('verifiedChannelCount < 10');
    expect(adapter).toContain('seedDomains.length < 2 || seedDomains.length > 3');
    expect(adapter).toContain('providerRequestsReplayed: false');
    expect(adapter).toContain('secretValuesRecorded: false');
    expect(adapter).not.toMatch(/payment_method_data|card_number|4242/);
    expect(adapter).not.toMatch(/DATAFORSEO_LOGIN|PODCAST_INDEX_API_KEY|YOUTUBE_API_KEY/);
  });
});
