import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 25 Workflow READY receipt acceptance adapter', () => {
  it('is wired as the sanctioned default adapter after paid Vertex quality verification', async () => {
    const wrapper = await readText('scripts/roadmap-autopilot-wrapper.mjs');
    const adapter = await readText('scripts/roadmap-gate25-workflow-ready-receipt.mjs');

    expect(wrapper).toContain('roadmap-gate25-workflow-ready-receipt.mjs');
    expect(wrapper).toContain('ROADMAP_GATE_25_COMMAND: sanctionedGate25Command');
    expect(adapter).toContain("state?.gates?.['24']?.status !== 'PASS'");
    expect(adapter).toContain('GATE25_RECEIPT_PATH');
  });

  it('reads the completed Workflow and existing KV/D1 receipts without replaying fulfillment', async () => {
    const adapter = await readText('scripts/roadmap-gate25-workflow-ready-receipt.mjs');

    expect(adapter).toContain('env.LAUNCH_BLUEPRINT_WORKFLOW.get(order.fulfillmentWorkflowId)');
    expect(adapter).toContain("workflowStatus = (await instance?.status())?.status || 'unavailable'");
    expect(adapter).toContain("SELECT status, owner_id, blueprint_json, research_receipt_json, pdf_r2_key FROM launch_blueprints WHERE order_id = ?");
    expect(adapter).toContain("'paid_test_blueprint_pointer_' + ORDER_ID");
    expect(adapter).toContain("'paid_test_blueprint_integrity_' + ORDER_ID");
    expect(adapter).toContain("prefix: 'analytics_event_'");
    expect(adapter).toContain("event?.eventName === 'launch_blueprint_completed'");
    expect(adapter).toContain('recoveryRetryCount: Math.max(0, fulfillmentAttemptCount - 1)');
    expect(adapter).toContain('workflowReplayed: false');
    expect(adapter).toContain('generationReplayed: false');
    expect(adapter).toContain('secretValuesRecorded: false');
    expect(adapter).not.toMatch(/payment_method_data|card_number|4242|GEMINI_API_KEY/);
  });
});
