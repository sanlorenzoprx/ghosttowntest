import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 20 manual Stripe test purchase verification', () => {
  it('keeps Gate 20 manual while allowing receipt-backed resume after the human purchase', async () => {
    const config = JSON.parse(await readText('config/production-roadmap-47-gates.json')) as {
      gates: Array<{ id: number; mode: string; requires_user_input: boolean }>;
    };
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const verifier = await readText('scripts/roadmap-gate20-manual-purchase-verifier.mjs');

    expect(config.gates.find(gate => gate.id === 20)).toMatchObject({
      id: 20,
      mode: 'manual',
      requires_user_input: true
    });

    expect(wrapper).toContain('verifyCompletedGate20Purchase');
    expect(wrapper).toContain("state?.gates?.['19']?.status !== 'PASS'");
    expect(wrapper).toContain("state.gates['20'] = {");
    expect(wrapper).toContain("status: 'PASS'");
    expect(wrapper).toContain("local_purchase_receipt: '.roadmap-autopilot/gate20-purchase.json'");
    expect(wrapper).toContain('Gate 20 remains a manual roadmap gate');

    expect(verifier).toContain("stripeMode !== 'test'");
    expect(verifier).toContain("session?.livemode === false");
    expect(verifier).toContain("session?.payment_status === 'paid'");
    expect(verifier).toContain("session?.status === 'complete'");
    expect(verifier).toContain('GHOSTTOWN_30_DAY_PLAN_V1.amountCents');
    expect(verifier).toContain("metadata.fulfillment_type === 'execution_plan_30day_v1'");
    expect(verifier).toContain("state?.gates?.['19']");
    expect(verifier).toContain('gate20-purchase.json');
    expect(verifier).toContain('secretValuesRecorded: false');
    expect(verifier).not.toMatch(/4242|payment_method_data|card_number/i);
  });
});
