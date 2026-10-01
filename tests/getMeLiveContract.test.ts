import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { GHOSTTOWN_GET_ME_LIVE_V1, DEFAULT_GET_ME_LIVE_DISPLAY_PRICE } from '../src/lib/getMeLiveOffer';
import { STEPS, prelaunchReady, resolveSetupStep } from '../src/components/GetMeLiveWorkspace';
import type { GetMeLiveConfiguration } from '../src/types/getMeLive';

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
    for (const handler of ['handleGetMeLiveCheckout','handleGetMeLiveOrders','handleGetMeLiveConfig','handleGetMeLivePreview','handleGetMeLiveCloudflareConnect','handleGetMeLiveCloudflareDisconnect','handleGetMeLiveCloudflareAccounts','handleGetMeLiveEmailSetup','handleGetMeLiveStripeConnect','handleGetMeLiveStripeStatus','handleGetMeLivePublish','handleGetMeLivePublishVerify','handleGetMeLivePublishStatus','handleGetMeLiveLeads','handleGetMeLiveReleaseReceipt','handleGetMeLiveStoryStudioHandoff','handlePublicGetMeLiveLead','handlePublicGetMeLiveBuy']) {
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
    // A failed republish settles with status kept live (hosting.lastReleaseFailure); only a launch fails the order.
    const store = await read('src/api/getMeLiveStore.ts');
    expect(store).toContain("attempt.kind === 'launch'");
    expect(store).toContain("SET status = 'failed', failure = ?");
    expect(store).toContain("'$.lastReleaseFailure'");
    expect(source).toContain("returnUrl(returnOriginFor(order, request), 'lead=received')");
    expect(source).not.toContain('getMeLiveSiteUrl');
    expect(source).not.toMatch(/\$\{projectName\}\.pages\.dev/);
    expect(source).toContain('function redirect(location: string');
    expect(source).not.toContain('Response.redirect(');
    expect(source).toContain("schemaVersion: 'ghosttown-get-me-live-release-receipt-v2'");
    expect(source).toContain('needsBackfill: true');
    const index = await read('src/api/index.ts');
    expect(index).toContain('/release-receipt$/');
    expect(index).toContain('/release-receipt\\/backfill$/');
    expect(index).toContain('handleGetMeLiveReleases');
    expect(index).toContain('handleGetMeLiveHealth');
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

describe('Get Me Live pre-launch has no domain step', () => {
  const configuration: GetMeLiveConfiguration = {
    schemaVersion: 'get-me-live-config-v1',
    brand: { businessName: 'Proof Path', stylePreset: 'clean_saas' },
    offer: { intent: 'interest', headline: 'Proof first', offer: 'Pilot', price: '$49', ctaLabel: 'I am interested' },
    contact: { contactEmail: 'owner@example.com', leadDestinationEmail: 'owner@example.com' },
    domain: { cloudflareAccountId: 'acct_1' },
    payments: { enabled: false }
  };
  const connected = { providerState: { cloudflareConnected: true, stripeConnected: false, businessEmailVerified: false } };

  it('#16 Go Live needs no web address: no domain fields, no purchase, no registrar UI or routes', async () => {
    expect(configuration.domain.selectedDomain).toBeUndefined();
    expect(prelaunchReady(connected, configuration, 'acct_1', 'blob:preview')).toBe(true);
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    for (const retired of ['/domains/search', '/domains/register', '/domains/status', '/name-options', 'registrationPrice', 'Costs outside GhostTown', 'Buy a web address', 'domainReady', 'chosenDomain']) {
      expect(workspace).not.toContain(retired);
    }
    expect(workspace).toContain('{configuration.offer.intent === "buy" && <p className="mt-5 text-sm text-gray-700">Stripe charges its normal fees only when a customer pays.</p>}');
    const index = await read('src/api/index.ts');
    for (const retired of ['domains\\/search', 'domains\\/register', 'domains\\/status', 'name-options']) expect(index).not.toContain(retired);
    const api = await read('src/api/getMeLive.ts');
    for (const retired of ['handleGetMeLiveDomainSearch', 'handleGetMeLiveDomainRegister', 'handleGetMeLiveDomainStatus', 'handleGetMeLiveNameOptions', 'domainReady']) expect(api).not.toContain(retired);
  });

  it('#17 business email is not a pre-launch step; it is offered only after a custom domain is active', async () => {
    expect(prelaunchReady(connected, { ...configuration, contact: { ...configuration.contact, businessEmailLocalPart: undefined } }, 'acct_1', 'blob:preview')).toBe(true);
    expect(STEPS.find(([id]) => id === 'contact')?.[1]).toBe('Where leads go');
    const workspace = await read('src/components/GetMeLiveWorkspace.tsx');
    const contactStep = workspace.slice(workspace.indexOf('activeStep === "contact"'), workspace.indexOf('activeStep === "payments"'));
    expect(contactStep).not.toMatch(/business ?email|setupEmail/i);
    expect(workspace).toContain('const activeDomain = order?.customDomainState?.status === "active" ? order.customDomainState.name : undefined;');
    expect(workspace).toContain('{activeDomain && <div className="mt-7 rounded-xl border p-5"><h3 className="text-xl font-black">Want a matching business email?</h3>');
  });

  it('#26 the step URL param resolves to a real step; legacy step=domain maps to name', async () => {
    expect(STEPS.map(([id]) => id)).not.toContain('domain');
    expect(resolveSetupStep('domain')).toBe('name');
    expect(resolveSetupStep('name')).toBe('name');
    expect(resolveSetupStep('payments')).toBe('payments');
    for (const unknown of [null, '', 'registrar', 'constructor', '__proto__']) expect(resolveSetupStep(unknown)).toBe('home');
    const api = await read('src/api/getMeLive.ts');
    const callbackStep = api.match(/cloudflare=connected&step=([a-z]+)/)?.[1];
    expect(callbackStep).toBe('name');
    expect(resolveSetupStep(callbackStep ?? null)).toBe(callbackStep);
  });
});
