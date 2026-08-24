import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 21 Stripe order idempotency acceptance adapter', () => {
  it('is wired as the sanctioned default adapter after the manual Gate 20 receipt', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate21-stripe-order-idempotency.mjs');

    expect(wrapper).toContain('roadmap-gate21-stripe-order-idempotency.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_21_COMMAND: sanctionedGate21Command');
    expect(adapter).toContain("gate20-purchase.json");
    expect(adapter).toContain("state?.gates?.['20']?.status !== 'PASS'");
    expect(adapter).toContain("GATE21_RECEIPT_PATH");
  });

  it('uses only the accepted purchase evidence and read-only Stripe inspection', async () => {
    const adapter = await readText('scripts/roadmap-gate21-stripe-order-idempotency.mjs');

    expect(adapter).toContain("method: 'GET'");
    expect(adapter).toContain("/v1/checkout/sessions/");
    expect(adapter).toContain("/v1/charges?payment_intent=");
    expect(adapter).toContain('validSeedConfirmation');
    expect(adapter).toContain('workflowStartedAfterValidSeeds');
    expect(adapter).toContain('assertFirstPartyWebhookContract');
    expect(adapter).toContain("'if (await env.KV.get(eventKey))'");
    expect(adapter).toContain('matchingOrderCount: linkedOrders.length');
    expect(adapter).toContain('successfulChargeCount: successfulCharges.length');
    expect(adapter).toContain('duplicateReplayPerformed: false');
    expect(adapter).toContain('workflowStartedByWebhook: false');
    expect(adapter).toContain('secretValuesRecorded: false');
    expect(adapter).not.toMatch(/payment_method_data|card_number|4242/);
    expect(adapter).not.toMatch(/method:\s*'POST'\s*,\s*headers:\s*\{ Authorization: 'Bearer ' \+ stripeKey \}/);
  });
});
