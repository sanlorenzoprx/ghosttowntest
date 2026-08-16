import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('paid Blueprint acceptance recovery', () => {
  it('keeps general and production research off while enabling only paid acceptance fulfillment', async () => {
    const wrangler = await readText('wrangler.toml');
    const workflow = await readText('src/api/launchBlueprintWorkflow.ts');
    const helper = await readText('src/api/paidBlueprintResearch.ts');

    expect(wrangler).toContain('[env.acceptance.vars]');
    expect(wrangler).toContain('DISTRIBUTION_FOOTPRINT_ENABLED = "false"');
    expect(wrangler).toContain('PAID_BLUEPRINT_RESEARCH_ENABLED = "true"');
    expect(wrangler).toContain('[env.production.vars]');
    expect(wrangler).toContain('PAID_BLUEPRINT_RESEARCH_ENABLED = "false"');

    expect(helper).toContain("env.DEPLOYMENT_ENV === 'acceptance'");
    expect(helper).toContain("order.stripeMode === 'test'");
    expect(helper).toContain('Boolean(order.paidAt)');
    expect(helper).toContain('Boolean(order.stripeCheckoutSessionId)');
    expect(helper).toContain('Boolean(order.stripeEventId)');

    expect(workflow).toContain('researchEnvForPaidBlueprint(this.env, context.order)');
    expect(workflow).toContain('runResearchBatch(researchEnv, context.order, plan, sourceIds)');
  });

  it('recognizes a paid Stripe purchase even when downstream fulfillment entered failed state', async () => {
    const verifier = await readText('scripts/roadmap-gate20-manual-purchase-verifier.mjs');

    expect(verifier).toContain("'ready', 'failed'");
    expect(verifier).toContain('Gate 20 proves the human Stripe purchase, not successful downstream fulfillment.');
    expect(verifier).toContain("session?.payment_status === 'paid'");
    expect(verifier).toContain("session?.status === 'complete'");
    expect(verifier).toContain("metadata.fulfillment_type === 'execution_plan_30day_v1'");
  });
});
