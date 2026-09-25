import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { GHOSTTOWN_GET_ME_LIVE_V1, DEFAULT_GET_ME_LIVE_DISPLAY_PRICE } from '../src/lib/getMeLiveOffer';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Get Me Live product contract', () => {
  it('keeps the premium offer explicit and provider-fee safe', () => {
    expect(GHOSTTOWN_GET_ME_LIVE_V1.offerId).toBe('ghosttown_get_me_live_v1');
    expect(GHOSTTOWN_GET_ME_LIVE_V1.referenceAmountCents).toBe(29700);
    expect(DEFAULT_GET_ME_LIVE_DISPLAY_PRICE).toBe('$297.00');
    expect(GHOSTTOWN_GET_ME_LIVE_V1.scopeBoundary).toMatch(/provider|third-party/i);
  });

  it('exposes the complete owner and public route surface', async () => {
    const source = await read('src/api/index.ts');
    for (const handler of ['handleGetMeLiveCheckout','handleGetMeLiveOrders','handleGetMeLiveConfig','handleGetMeLivePreview','handleGetMeLiveCloudflareConnect','handleGetMeLiveCloudflareDisconnect','handleGetMeLiveCloudflareAccounts','handleGetMeLiveDomainSearch','handleGetMeLiveDomainRegister','handleGetMeLiveEmailSetup','handleGetMeLiveStripeConnect','handleGetMeLiveStripeStatus','handleGetMeLivePublish','handleGetMeLiveLeads','handleGetMeLiveReleaseReceipt','handleGetMeLiveStoryStudioHandoff','handlePublicGetMeLiveLead','handlePublicGetMeLiveBuy']) {
      expect(source).toContain(handler);
    }
  });
});

describe('Get Me Live safety and lineage contracts', () => {
  it('keeps owner boundaries privacy-safe and separates public capture', async () => {
    const source = await read('src/api/getMeLive.ts');
    expect(source).toContain("return json({ error: 'Get Me Live order not found' }, 404)");
    expect(source).toContain('ownedGetMeLiveOrder');
    expect(source).toContain('handlePublicGetMeLiveLead');
    expect(source).toContain('handlePublicGetMeLiveBuy');
    expect(source).toContain('canonicalSprintEvidenceOrderId');
    const index = await read('src/api/index.ts');
    expect(index).toContain("publicGetMeLiveBuyMatch && (method === 'GET' || method === 'POST')");
  });

  it('separates the Get Me Live purchase from customer experiment payments', async () => {
    const webhook = await read('src/api/webhook.ts');
    expect(webhook).toContain("metadata.fulfillment_type === 'get_me_live_v1'");
    expect(webhook).toContain('get_me_live_experiment_order_id');
    expect(webhook).toContain('STRIPE_CONNECT_WEBHOOK_SECRET');
    expect(webhook).toContain('recordGetMeLiveExperimentPayment');
  });

  it('keeps an already-published customer site usable if a later republish fails', async () => {
    const source = await read('src/api/getMeLive.ts');
    expect(source).toContain('hasPublishedGetMeLiveSite');
    expect(source).toContain("owned.status = hadPublishedSite ? 'live' : 'failed'");
    expect(source).toContain('const destination = getMeLiveSiteUrl(order)');
    expect(source).toContain("return `https://${projectName}.pages.dev`");
    expect(source).toContain('function redirect(location: string');
    expect(source).not.toContain('Response.redirect(');
    expect(source).toContain("schemaVersion: 'ghosttown-get-me-live-release-receipt-v1'");
    const index = await read('src/api/index.ts');
    expect(index).toContain('/release-receipt$/');
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    expect(workspace).toContain('Customer activity');
    expect(workspace).toContain('Release receipt');
    expect(workspace).toContain('Download receipt');
  });

  it('keeps GhostTown self-contained while preserving the dormant future StoryFactory handoff contract', async () => {
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    expect(workspace).not.toContain('Open Story Studio');
    expect(workspace).not.toContain('Story Studio can use the work you already made');
    expect(workspace).toContain('data.order.providerState.cloudflareConnected && data.order.status !== "live"');
    const source = await read('src/api/getMeLive.ts');
    expect(source).toContain("schemaVersion: 'ghosttown-story-studio-handoff-v1'");
    expect(source).toContain('STORY_STUDIO_URL');
  });

  it('records the complete activation funnel without treating infrastructure as customer evidence', async () => {
    const analytics = await read('src/api/analytics.ts');
    const events = ['get_me_live_offer_viewed','get_me_live_cta_clicked','get_me_live_checkout_started','get_me_live_purchase_completed','get_me_live_setup_started','get_me_live_preview_created','get_me_live_publish_clicked','get_me_live_live_completed','get_me_live_lead_captured','get_me_live_payment_connected','get_me_live_customer_payment'];
    for (const event of events) expect(analytics).toContain(event);
    const source = await read('src/api/getMeLive.ts');
    expect(source).toContain("eventType: 'launch_site_lead'");
    expect(source).toContain("eventType: 'payment'");
  });
});
