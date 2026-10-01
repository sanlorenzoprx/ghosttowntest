import { authenticateRequest } from './auth';
import { recordCommercialFunnelEvent } from './analytics';
import { ownedLaunchBlueprintOrder } from './blueprintApi';
import { loadBlueprintRecord } from './blueprintStore';
import { ingestObservedEvidenceEvent } from './evidenceIngestion';
import type { Env } from './env';
import {
  GHOSTTOWN_GET_ME_LIVE_V1,
  DEFAULT_GET_ME_LIVE_DISPLAY_PRICE,
  preferredPublicUrl
} from '../lib/getMeLiveOffer';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type {
  GetMeLiveAsset,
  GetMeLiveConfiguration,
  GetMeLiveHosting,
  GetMeLiveLeadMagnet,
  GetMeLiveOrder,
  GetMeLiveProviderState,
  GetMeLivePublishAttempt,
  GetMeLiveReleaseKind,
  GetMeLiveReleaseReceipt,
  GetMeLiveReleaseReceiptV2,
  GetMeLiveShareDraft,
  GetMeLiveShareDraftType
} from '../types/getMeLive';
import { manufactureCustomWebsite } from './websiteCreationService';
import { buildCustomWebsite, renderCustomWebsiteStaticHtml } from './websiteBuildRunner';
import type { WebsiteAsset, WebsiteCreationResult } from '../types/customWebsite';
import { blueprintWebsiteAssetGenerator } from './websiteAssetGenerator';
import {
  CLAIM_EXPIRED_MESSAGE,
  DEPLOY_EXPIRED_MESSAGE,
  claimPublishAttempt,
  createGetMeLiveOrder,
  isPublishAttemptExpired,
  insertBackfilledLaunchRelease,
  listGetMeLiveReleases,
  loadLatestGetMeLiveRelease,
  loadLaunchGetMeLiveRelease,
  loadPublishAttempt,
  recordPublishDeployment,
  settlePublishFailure,
  settlePublishSuccess,
  transitionGetMeLiveStatus,
  countGetMeLiveLeads,
  getGetMeLiveActivity,
  incrementGetMeLiveActivity,
  listGetMeLiveAssets,
  loadGetMeLiveAsset,
  loadGetMeLiveBySprint,
  loadGetMeLiveAssetBytes,
  loadGetMeLiveOrder,
  loadGetMeLivePreview,
  listGetMeLiveShareDrafts,
  listGetMeLiveLeads,
  listGetMeLiveOrders,
  markGetMeLiveAssetPublished,
  orderGetMeLiveAssets,
  recordHosting,
  removeGetMeLiveAsset,
  saveGetMeLiveAsset,
  saveGetMeLiveLead,
  saveGetMeLivePreview,
  saveGetMeLiveShareDraft,
  updateGetMeLiveOrder
} from './getMeLiveStore';
import {
  completeCloudflareAuthorization,
  configureCloudflareEmailRouting,
  createPagesProject,
  createCloudflareAuthorizationUrl,
  createConnectedCheckoutSession,
  createStripeConnectedMerchant,
  createStripeOnboardingLink,
  deployCloudflarePagesHtml,
  disconnectCloudflareAuthorization,
  ensurePagesProject,
  findCloudflareZone,
  getPagesProject,
  loadCloudflareAuthorizationState,
  listCloudflareAccounts,
  retrieveStripeConnectedMerchant,
  type PagesProject
} from './getMeLiveProviders';

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...headers }
});

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function configuredPriceId(env: Env): string {
  return env.STRIPE_GET_ME_LIVE_PRICE_ID?.trim() || '';
}

/** The AI-generated website plan, before customer configuration is applied. */
interface GetMeLiveStoredAiPlan {
  /** sha256 of the source blueprint (with customer text overlaid) the plan was generated from. */
  inputHash: string;
  spec: WebsiteCreationResult['spec'];
  /** Assets the plan uses when the customer has not uploaded their own. */
  assets: WebsiteAsset[];
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hostingFromProject(accountId: string, project: PagesProject, source: GetMeLiveHosting['source'], previous?: GetMeLiveHosting): GetMeLiveHosting {
  return {
    schemaVersion: 'get-me-live-hosting-v1',
    cloudflareAccountId: accountId,
    pagesProjectName: project.name,
    pagesSubdomain: project.subdomain,
    pagesUrl: `https://${project.subdomain}`,
    lastReleaseFailure: previous?.lastReleaseFailure,
    source
  };
}

/** `<label>.<sub>.pages.dev` (deployment hash or alias) → `<sub>.pages.dev`; `<sub>.pages.dev` → itself. */
export function legacyPagesSubdomain(url: string | undefined): string | null {
  if (!url) return null;
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const labels = host.split('.');
  if (labels.length < 3 || labels.slice(-2).join('.') !== 'pages.dev' || labels.some(label => !/^[a-z0-9-]+$/.test(label))) return null;
  if (labels.length === 3) return host;
  if (labels.length === 4) return labels.slice(1).join('.');
  return null;
}

/**
 * Legacy hosting normalization (plan §20.1): the one write a GET path may make.
 * Applies only to published orders that predate `hosting_json`. It reads the
 * provider project when Cloudflare is reachable, otherwise derives the stable
 * Pages host from the stored URL, and never calls a provider write API.
 */
async function normalizeLegacyHosting(env: Env, order: GetMeLiveOrder): Promise<GetMeLiveOrder> {
  if (order.hosting) return order;
  const storedUrl = order.publicUrl || order.deploymentReceipt?.publicUrl;
  if (!storedUrl && !order.deploymentReceipt) return order;
  const accountId = order.configuration?.domain.cloudflareAccountId || '';
  const pagesProjectName = order.configuration?.domain.pagesProjectName || projectNameFor(order.orderId);
  try {
    let hosting: GetMeLiveHosting | undefined;
    if (accountId && order.providerState.cloudflareConnected) {
      const project = await getPagesProject(env, order.orderId, accountId, pagesProjectName).catch(() => null);
      if (project) hosting = hostingFromProject(accountId, project, 'provider');
    }
    if (!hosting) {
      const subdomain = legacyPagesSubdomain(storedUrl);
      if (subdomain) hosting = hostingFromProject(accountId, { name: pagesProjectName, subdomain }, 'derived_from_legacy');
    }
    if (!hosting) return order;
    await recordHosting(env, order.orderId, hosting, { publicUrl: hosting.pagesUrl });
    return { ...order, hosting, publicUrl: hosting.pagesUrl };
  } catch (error) {
    console.warn('Get Me Live legacy hosting normalization skipped', { orderId: order.orderId, error });
    return order;
  }
}

/**
 * True once a launch has been verified. From Slice 1b, `published_at` and
 * `deployment_receipt_json` are written only by launch/republish settlement, which
 * writes the `launch` release row in the same transaction; orders published
 * before then carry the same columns (legacy, plan §20). It no longer keys off
 * `public_url` or `custom_domain` presence.
 */
function hasPublishedGetMeLiveSite(order: GetMeLiveOrder): boolean {
  return Boolean(order.publishedAt || order.deploymentReceipt);
}

/** Preview, config, and asset handlers never change these statuses (plan §2.6 rule 6). */
function statusHeldByPublication(order: GetMeLiveOrder): boolean {
  return order.status === 'publishing' || order.status === 'verifying' || order.status === 'live';
}

/** Status shown to the owner: a verified site reads as live even while a republish is pending. */
function publicStatus(order: GetMeLiveOrder): GetMeLiveOrder['status'] {
  return hasPublishedGetMeLiveSite(order) ? 'live' : order.status;
}

function getMeLivePaymentMode(order: GetMeLiveOrder): GetMeLiveReleaseReceipt['checks']['paymentMode'] {
  const config = order.configuration;
  if (config?.offer.intent !== 'buy') return 'interest';
  if (order.providerState.stripeConnected && config.payments.chargesEnabled) return 'connected_checkout';
  return 'lead_until_stripe_ready';
}

function stripeIntegrationIdentifier(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const random = crypto.getRandomValues(new Uint8Array(8));
  return `ghosttown_gml_${Array.from(random, value => alphabet[value % alphabet.length]).join('')}`;
}

function emptyProviderState(): GetMeLiveProviderState {
  return { cloudflareConnected: false, stripeConnected: false, businessEmailVerified: false };
}
async function ownedGetMeLiveOrder(request: Request, env: Env, orderId: string): Promise<GetMeLiveOrder | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const order = await loadGetMeLiveOrder(env, orderId);
  if (!order || normalizeEmail(order.ownerId) !== normalizeEmail(auth.email)) {
    return json({ error: 'Get Me Live order not found' }, 404);
  }
  return normalizeLegacyHosting(env, order);
}

function businessNameSuggestions(blueprint: GhostTownLaunchBlueprint): string[] {
  const stop = new Set(['the','and','for','with','from','that','this','your','their','into','service','services','solution','solutions']);
  const words = (value: string) => value.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(word => word.length > 3 && !stop.has(word.toLowerCase()));
  const offer = words(blueprint.offer.offerName);
  const outcome = words(blueprint.offer.desiredOutcome);
  const customer = words(blueprint.offer.targetCustomer);
  const problem = words(blueprint.offer.painfulProblem);
  const candidates = [[outcome[0], 'Path'], [offer[0], 'Works'], [customer[0], outcome[0]], [problem[0], 'Clear'], [outcome[0], 'Bridge'], [offer[0], 'Studio']]
    .map(parts => parts.filter(Boolean).join(' ')).filter(name => name.length >= 4);
  return [...new Set(candidates)].slice(0, 6);
}

function defaultConfiguration(blueprint: GhostTownLaunchBlueprint, ownerEmail: string): GetMeLiveConfiguration {
  return {
    schemaVersion: 'get-me-live-config-v1',
    brand: {
      businessName: blueprint.launchSite.site.businessName || blueprint.offer.offerName,
      stylePreset: 'clean_saas',
      templateId: 'ghosttown_conversion'
    },
    offer: {
      intent: 'interest',
      headline: blueprint.landingPageCopy.headline || blueprint.launchSite.offer.headline,
      offer: blueprint.offer.offerName,
      price: blueprint.offer.initialTestPrice,
      ctaLabel: 'I am interested'
    },
    contact: {
      contactEmail: blueprint.launchSite.site.contactEmail || ownerEmail,
      leadDestinationEmail: ownerEmail,
      businessEmailLocalPart: 'hello'
    },
    domain: {},
    payments: { enabled: false }
  };
}

function safeText(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) || fallback : fallback;
}

function normalizeLeadMagnet(value: unknown): string | GetMeLiveLeadMagnet | undefined {
  if (typeof value === 'string') return safeText(value, 300) || undefined;
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<GetMeLiveLeadMagnet>;
  const title = safeText(candidate.title, 160);
  if (!title) return undefined;
  const kind = candidate.kind === 'asset' ? 'asset' : 'legacy';
  return {
    kind,
    title,
    assetId: safeText(candidate.assetId, 120) || undefined,
    url: safeText(candidate.url, 500) || undefined
  };
}

function normalizeConfiguration(value: GetMeLiveConfiguration): GetMeLiveConfiguration {
  const styles = new Set(['warm_editorial', 'clean_saas', 'local_trust', 'premium_service', 'bold_validation']);
  const templates = new Set(['ghosttown_conversion', 'memories_story_editorial']);
  if (value.schemaVersion !== 'get-me-live-config-v1') throw new Error('Unsupported Get Me Live configuration');
  if (!['interest', 'buy', 'decide_later'].includes(value.offer?.intent)) throw new Error('Choose what customers should do');
  const businessName = safeText(value.brand?.businessName, 120);
  const contactEmail = safeText(value.contact?.contactEmail, 254).toLowerCase();
  const destination = safeText(value.contact?.leadDestinationEmail, 254).toLowerCase();
  if (!businessName) throw new Error('Choose a business name');
  if (!contactEmail.includes('@') || !destination.includes('@')) throw new Error('Add valid contact and lead destination emails');
  const stylePreset = styles.has(value.brand.stylePreset) ? value.brand.stylePreset : 'clean_saas';
  const templateId = value.brand.templateId && templates.has(value.brand.templateId) ? value.brand.templateId : undefined;
  return {
    schemaVersion: 'get-me-live-config-v1',
    brand: {
      businessName,
      stylePreset,
      templateId,
      primaryColor: safeText(value.brand.primaryColor, 20) || undefined,
      logoUrl: safeText(value.brand.logoUrl, 500) || undefined,
      imageUrls: value.brand.imageUrls?.slice(0, 6).map(item => safeText(item, 500)).filter(Boolean),
      logoAssetId: safeText(value.brand.logoAssetId, 120) || undefined,
      imageAssetIds: value.brand.imageAssetIds?.slice(0, 8).map(item => safeText(item, 120)).filter(Boolean),
      mainImageAssetId: safeText(value.brand.mainImageAssetId, 120) || undefined
    },
    offer: {
      intent: value.offer.intent,
      headline: safeText(value.offer.headline, 180) || undefined,
      offer: safeText(value.offer.offer, 180) || undefined,
      price: safeText(value.offer.price, 80) || undefined,
      ctaLabel: safeText(value.offer.ctaLabel, 80) || undefined,
      leadMagnet: normalizeLeadMagnet(value.offer.leadMagnet)
    },
    contact: {
      contactEmail,
      leadDestinationEmail: destination,
      businessEmailLocalPart: safeText(value.contact.businessEmailLocalPart, 40, 'hello').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'hello'
    },
    domain: {
      requestedName: safeText(value.domain?.requestedName, 120) || undefined,
      selectedDomain: safeText(value.domain?.selectedDomain, 253).toLowerCase() || undefined,
      registrationPrice: safeText(value.domain?.registrationPrice, 40) || undefined,
      registrationCurrency: safeText(value.domain?.registrationCurrency, 10) || undefined,
      registrationConfirmedAt: value.domain?.registrationConfirmedAt,
      cloudflareAccountId: safeText(value.domain?.cloudflareAccountId, 80) || undefined,
      cloudflareZoneId: safeText(value.domain?.cloudflareZoneId, 80) || undefined,
      pagesProjectName: safeText(value.domain?.pagesProjectName, 63) || undefined
    },
    payments: {
      enabled: value.offer.intent === 'buy' ? true : Boolean(value.payments?.enabled),
      stripeConnectedAccountId: safeText(value.payments?.stripeConnectedAccountId, 80) || undefined,
      detailsSubmitted: Boolean(value.payments?.detailsSubmitted),
      chargesEnabled: Boolean(value.payments?.chargesEnabled),
      payoutsEnabled: Boolean(value.payments?.payoutsEnabled)
    }
  };
}

function overlayBlueprint(source: GhostTownLaunchBlueprint, config: GetMeLiveConfiguration): GhostTownLaunchBlueprint {
  const blueprint = structuredClone(source);
  blueprint.launchSite.site.businessName = config.brand.businessName;
  blueprint.launchSite.site.contactEmail = config.contact.contactEmail;
  blueprint.launchSite.leadCapture.destination = config.contact.leadDestinationEmail;
  if (config.offer.offer) blueprint.offer.offerName = config.offer.offer;
  if (config.offer.price) blueprint.offer.initialTestPrice = config.offer.price;
  if (config.offer.headline) {
    blueprint.landingPageCopy.headline = config.offer.headline;
    blueprint.launchSite.offer.headline = config.offer.headline;
  }
  if (config.offer.ctaLabel) {
    blueprint.landingPageCopy.primaryCallToAction = config.offer.ctaLabel;
    blueprint.launchSite.offer.callToAction = config.offer.ctaLabel;
  }
  return blueprint;
}
export async function handleGetMeLiveCheckout(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Please log in before Get Me Live checkout' }, 401);
  const body = await request.json<{ sourceSprintOrderId?: string }>().catch(() => ({} as { sourceSprintOrderId?: string }));
  const sourceSprintOrderId = safeText(body.sourceSprintOrderId, 120);
  if (!sourceSprintOrderId) return json({ error: 'Choose the Evidence Sprint you want to get live' }, 400);
  const source = await ownedLaunchBlueprintOrder(request, env, sourceSprintOrderId, true);
  if (source instanceof Response) return source;
  const record = await loadBlueprintRecord(env, sourceSprintOrderId);
  if (!record) return json({ error: 'The source Evidence Sprint is not ready' }, 409);
  const priceId = configuredPriceId(env);
  if (!priceId) return json({ error: 'Get Me Live checkout is not configured yet' }, 503);

  const ownerId = normalizeEmail(auth.email);
  let order = await loadGetMeLiveBySprint(env, ownerId, sourceSprintOrderId);
  if (order && (order.paidAt || ['configuring', 'preview_ready', 'provider_setup', 'ready_to_publish', 'publishing', 'live'].includes(order.status))) {
    return json({ orderId: order.orderId, alreadyPurchased: true, nextUrl: `/get-me-live/setup?order_id=${encodeURIComponent(order.orderId)}` });
  }
  const now = new Date().toISOString();
  if (!order) {
    order = {
      orderId: id('gml'), ownerId, sourceSprintOrderId,
      sourceBlueprintId: record.blueprint.blueprintId,
      offerId: GHOSTTOWN_GET_ME_LIVE_V1.offerId,
      offerVersion: GHOSTTOWN_GET_ME_LIVE_V1.version,
      stripePriceId: priceId,
      status: 'pending', providerState: emptyProviderState(),
      createdAt: now, updatedAt: now
    };
    await createGetMeLiveOrder(env, order);
  }
  const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  const fields = new URLSearchParams({
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    integration_identifier: stripeIntegrationIdentifier(),
    customer_email: ownerId,
    client_reference_id: order.orderId,
    'metadata[get_me_live_order_id]': order.orderId,
    'metadata[source_sprint_order_id]': sourceSprintOrderId,
    'metadata[source_blueprint_id]': record.blueprint.blueprintId,
    'metadata[owner_id]': ownerId,
    'metadata[offer_id]': GHOSTTOWN_GET_ME_LIVE_V1.offerId,
    'metadata[offer_version]': GHOSTTOWN_GET_ME_LIVE_V1.version,
    'metadata[fulfillment_type]': 'get_me_live_v1',
    success_url: `${frontendUrl}/get-me-live/setup?order_id=${encodeURIComponent(order.orderId)}&checkout=success`,
    cancel_url: `${frontendUrl}/get-me-live?source_sprint_order_id=${encodeURIComponent(sourceSprintOrderId)}&checkout=cancelled`
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fields.toString()
  });
  const session = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !session.id || !session.url) {
    return json({ error: session.error?.message || 'Get Me Live checkout could not be opened' }, 502);
  }
  order.stripeCheckoutSessionId = session.id;
  order.status = 'checkout_created';
  order.updatedAt = new Date().toISOString();
  await updateGetMeLiveOrder(env, order);
  return json({ sessionUrl: session.url, orderId: order.orderId, displayPrice: DEFAULT_GET_ME_LIVE_DISPLAY_PRICE });
}

export async function fulfillGetMeLiveOrder(
  env: Env,
  orderId: string,
  session: Record<string, unknown>
): Promise<GetMeLiveOrder> {
  const order = await loadGetMeLiveOrder(env, orderId);
  if (!order) throw new Error('Get Me Live order not found');
  const metadata = typeof session.metadata === 'object' && session.metadata ? session.metadata as Record<string, unknown> : {};
  if (
    metadata.offer_id !== GHOSTTOWN_GET_ME_LIVE_V1.offerId
    || metadata.offer_version !== GHOSTTOWN_GET_ME_LIVE_V1.version
    || metadata.fulfillment_type !== 'get_me_live_v1'
    || metadata.get_me_live_order_id !== order.orderId
  ) {
    throw new Error('Get Me Live checkout metadata does not match the offer contract');
  }
  if (
    metadata.source_sprint_order_id !== order.sourceSprintOrderId
    || metadata.source_blueprint_id !== order.sourceBlueprintId
    || metadata.owner_id !== order.ownerId
  ) {
    throw new Error('Get Me Live checkout ownership does not match the durable order');
  }
  if (session.payment_status !== 'paid') throw new Error('Get Me Live checkout is not paid');
  order.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : order.stripePaymentIntentId;
  if (!order.configuration) {
    const record = await loadBlueprintRecord(env, order.sourceSprintOrderId);
    if (!record || record.blueprint.blueprintId !== order.sourceBlueprintId) throw new Error('Source Evidence Sprint is unavailable');
    order.configuration = defaultConfiguration(record.blueprint, order.ownerId);
  }
  order.status = 'configuring';
  order.paidAt = order.paidAt || new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  await updateGetMeLiveOrder(env, order);
  return order;
}

export async function handleGetMeLiveOrders(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const orders = await Promise.all((await listGetMeLiveOrders(env, normalizeEmail(auth.email))).map(order => normalizeLegacyHosting(env, order)));
  const summaries = await Promise.all(orders.map(async order => {
    const [leadCount, activity] = await Promise.all([
      countGetMeLiveLeads(env, order.orderId),
      getGetMeLiveActivity(env, order.orderId, order.sourceSprintOrderId)
    ]);
    return {
      orderId: order.orderId, sourceSprintOrderId: order.sourceSprintOrderId, status: hasPublishedGetMeLiveSite(order) ? 'live' : order.status,
      businessName: order.configuration?.brand.businessName, publicUrl: order.publicUrl, customDomain: order.customDomain,
      leadCount, salesCount: activity.sales, salesValueCents: activity.revenueCents,
      visitCount: activity.visits, shareCount: activity.shares,
      recentActivity: activity.sales > 0 ? 'You made a sale' : leadCount > 0 ? 'Someone is interested' : hasPublishedGetMeLiveSite(order) ? 'Your page is ready for customers' : 'Your page is being prepared',
      emailStatus: order.providerState.businessEmailVerified ? 'ready' : order.customDomainState?.status === 'active' ? 'pending' : 'not_started',
      paymentStatus: order.providerState.stripeConnected ? 'ready' : order.configuration?.offer.intent === 'buy' ? 'pending' : 'not_requested',
      cloudflareConnected: order.providerState.cloudflareConnected, createdAt: order.createdAt, updatedAt: order.updatedAt
    };
  }));
  return json({ orders: summaries });
}

export async function handleGetMeLiveOrder(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const record = await loadBlueprintRecord(env, owned.sourceSprintOrderId);
  if (!record) return json({ error: 'Source Evidence Sprint is unavailable' }, 409);
  const configuration = owned.configuration || defaultConfiguration(record.blueprint, owned.ownerId);
  const [leads, assets, activity] = await Promise.all([
    hasPublishedGetMeLiveSite(owned) ? listGetMeLiveLeads(env, owned.orderId) : Promise.resolve([]),
    listGetMeLiveAssets(env, owned.orderId),
    getGetMeLiveActivity(env, owned.orderId, owned.sourceSprintOrderId)
  ]);
  return json({ order: { ...owned, status: hasPublishedGetMeLiveSite(owned) ? 'live' : owned.status, preview: undefined }, configuration, leads, assets, activity, nameSuggestions: businessNameSuggestions(record.blueprint) });
}
export async function handleGetMeLiveConfig(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.paidAt) return json({ error: 'Get Me Live must be purchased before setup' }, 402);
  if (request.method === 'GET') {
    const record = await loadBlueprintRecord(env, owned.sourceSprintOrderId);
    if (!record) return json({ error: 'Source Evidence Sprint is unavailable' }, 409);
    return json({ configuration: owned.configuration || defaultConfiguration(record.blueprint, owned.ownerId) });
  }
  if (request.method !== 'POST' && request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await request.json<GetMeLiveConfiguration>();
    const next = normalizeConfiguration(body);
    // The Pages project name is server-owned; clients cannot choose or change it.
    next.domain.pagesProjectName = owned.configuration?.domain.pagesProjectName;
    owned.configuration = next;
    if (!statusHeldByPublication(owned)) owned.status = hasPublishedGetMeLiveSite(owned) ? 'live' : 'configuring';
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
    return json({ configuration: owned.configuration, status: owned.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Configuration is invalid' }, 400);
  }
}

function applyConfigToSpec<T extends { stylePreset: string; templateId: string; businessName: string; sections: Array<any> }>(
  spec: T,
  config: GetMeLiveConfiguration
): T {
  const next = structuredClone(spec);
  next.businessName = config.brand.businessName;
  next.stylePreset = config.brand.stylePreset;
  if (config.brand.templateId) next.templateId = config.brand.templateId;
  for (const section of next.sections) {
    if (section.component === 'hero' && config.offer.headline) section.heading = config.offer.headline;
    if (section.component === 'pricing') {
      if (config.offer.price) section.heading = config.offer.price;
      if (config.offer.offer) section.body = config.offer.offer;
    }
    if (section.component === 'lead_capture' && config.offer.ctaLabel) {
      section.heading = config.offer.ctaLabel;
      section.primaryCtaLabel = config.offer.ctaLabel;
    }
  }
  return next;
}
function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(output);
}

function cleanFilename(value: string, fallback: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || fallback;
}

function logoSvg(name: string, choice: string): string {
  const palettes: Record<string, [string, string]> = {
    forest: ['#12372A', '#F9F3E8'],
    sunset: ['#B6422E', '#FFF7F2'],
    night: ['#243447', '#F7D774']
  };
  const [background, foreground] = palettes[choice] || palettes.forest;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'G';
  const safeInitials = initials.replace(/[^A-Z0-9]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" rx="36" fill="${background}"/><circle cx="120" cy="120" r="72" fill="${foreground}" opacity=".16"/><text x="120" y="145" text-anchor="middle" font-family="Arial,sans-serif" font-size="76" font-weight="800" fill="${foreground}">${safeInitials}</text><text x="220" y="137" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="${foreground}">${name.replace(/[<>&"']/g, '').slice(0, 22)}</text></svg>`;
}

export async function handleGetMeLiveAssets(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.paidAt || !owned.configuration) return json({ error: 'Open your purchased setup first' }, 409);
  try {
    const contentType = request.headers.get('content-type') || '';
    let kind: GetMeLiveAsset['kind'];
    let filename: string;
    let mediaType: string;
    let bytes: ArrayBuffer;
    let generated = false;
    if (contentType.includes('application/json')) {
      const body = await request.json<{ kind?: string; choice?: string }>();
      if (body.kind !== 'logo') return json({ error: 'Choose a logo style' }, 400);
      kind = 'logo';
      generated = true;
      mediaType = 'image/svg+xml';
      filename = `logo-${safeText(body.choice, 24, 'forest')}.svg`;
      bytes = new TextEncoder().encode(logoSvg(owned.configuration.brand.businessName, safeText(body.choice, 24, 'forest'))).buffer;
    } else {
      const form = await request.formData();
      const rawKind = String(form.get('kind') || '');
      if (!['logo', 'photo', 'lead_magnet'].includes(rawKind)) return json({ error: 'Choose a logo, photo, or PDF' }, 400);
      kind = rawKind as GetMeLiveAsset['kind'];
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'Choose a file to upload' }, 400);
      filename = cleanFilename(file.name, kind === 'lead_magnet' ? 'free-guide.pdf' : 'image');
      mediaType = file.type.toLowerCase();
      const allowed = kind === 'lead_magnet'
        ? new Set(['application/pdf'])
        : new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);
      const limit = kind === 'lead_magnet' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (!allowed.has(mediaType)) return json({ error: kind === 'lead_magnet' ? 'Upload a PDF file' : 'Upload a PNG, JPG, WebP, GIF, or SVG image' }, 415);
      if (file.size <= 0 || file.size > limit) return json({ error: `Keep this file under ${kind === 'lead_magnet' ? '10' : '5'} MB` }, 413);
      bytes = await file.arrayBuffer();
    }
    const current = await listGetMeLiveAssets(env, orderId);
    if (kind === 'photo' && current.filter(asset => asset.kind === 'photo').length >= 8) return json({ error: 'You can add up to eight photos' }, 409);
    const assetId = id('gml_asset');
    const position = current.filter(asset => asset.kind === kind).length;
    const asset = await saveGetMeLiveAsset(env, {
      assetId, orderId, kind, filename, contentType: mediaType, byteSize: bytes.byteLength,
      position, isMain: kind === 'photo' && !current.some(item => item.kind === 'photo'), generated, bytes
    });
    if (kind === 'logo') owned.configuration.brand.logoAssetId = assetId;
    if (kind === 'photo') {
      owned.configuration.brand.imageAssetIds = [...(owned.configuration.brand.imageAssetIds || []), assetId];
      owned.configuration.brand.mainImageAssetId ||= assetId;
    }
    if (kind === 'lead_magnet') {
      owned.configuration.offer.leadMagnet = { kind: 'asset', title: filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '), assetId };
    }
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
    return json({ asset, configuration: owned.configuration }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The file could not be saved' }, 400);
  }
}

export async function handleGetMeLiveAssetRead(request: Request, env: Env, orderId: string, assetId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const asset = await loadGetMeLiveAsset(env, orderId, assetId);
  if (!asset) return new Response('File not found', { status: 404 });
  const bytes = await loadGetMeLiveAssetBytes(env, orderId, assetId);
  if (!bytes) return new Response('File not found', { status: 404 });
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Content-Disposition': `inline; filename="${cleanFilename(asset.filename, 'file')}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}

export async function handleGetMeLiveActivity(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  return json({ activity: await getGetMeLiveActivity(env, orderId, owned.sourceSprintOrderId) });
}

export async function handleGetMeLiveAssetDelete(request: Request, env: Env, orderId: string, assetId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.configuration) return json({ error: 'Setup is not ready' }, 409);
  const asset = await listGetMeLiveAssets(env, orderId).then(items => items.find(item => item.assetId === assetId));
  if (!asset) return json({ error: 'File not found' }, 404);
  await removeGetMeLiveAsset(env, orderId, assetId);
  if (owned.configuration.brand.logoAssetId === assetId) owned.configuration.brand.logoAssetId = undefined;
  owned.configuration.brand.imageAssetIds = owned.configuration.brand.imageAssetIds?.filter(idValue => idValue !== assetId);
  if (owned.configuration.brand.mainImageAssetId === assetId) owned.configuration.brand.mainImageAssetId = owned.configuration.brand.imageAssetIds?.[0];
  if (typeof owned.configuration.offer.leadMagnet === 'object' && owned.configuration.offer.leadMagnet.assetId === assetId) owned.configuration.offer.leadMagnet = undefined;
  owned.updatedAt = new Date().toISOString();
  await updateGetMeLiveOrder(env, owned);
  return json({ removed: true, configuration: owned.configuration });
}

export async function handleGetMeLiveAssetOrder(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.configuration) return json({ error: 'Setup is not ready' }, 409);
  const body = await request.json<{ assetIds?: string[]; mainAssetId?: string }>().catch(() => ({} as { assetIds?: string[]; mainAssetId?: string }));
  const assetIds = (body.assetIds || []).map(value => safeText(value, 120)).filter(Boolean);
  try {
    await orderGetMeLiveAssets(env, orderId, assetIds, safeText(body.mainAssetId, 120) || undefined);
    owned.configuration.brand.imageAssetIds = assetIds;
    owned.configuration.brand.mainImageAssetId = safeText(body.mainAssetId, 120) || assetIds[0];
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
    return json({ assets: await listGetMeLiveAssets(env, orderId), configuration: owned.configuration });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Photo order could not be saved' }, 400);
  }
}

async function configuredAssets(
  env: Env,
  orderId: string,
  config: GetMeLiveConfiguration,
  blueprint: GhostTownLaunchBlueprint,
  published = false
): Promise<WebsiteAsset[]> {
  const assets: WebsiteAsset[] = [];
  const add = (urlValue: string | undefined, role: 'logo' | 'hero_image' | 'supporting_image', index = 0) => {
    if (!urlValue) return;
    try {
      const url = new URL(urlValue);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      assets.push({
        assetId: `gml_${role}_${index}`,
        role,
        origin: 'licensed',
        publicUrl: url.toString(),
        altText: role === 'logo' ? `${config.brand.businessName} logo` : `${config.brand.businessName} image`,
        sourceReference: `get-me-live:${blueprint.blueprintId}:customer-supplied`
      });
    } catch { /* invalid customer asset URLs are ignored until corrected */ }
  };
  add(config.brand.logoUrl, 'logo');
  config.brand.imageUrls?.forEach((url, index) => add(url, index === 0 ? 'hero_image' : 'supporting_image', index));
  const stored = await listGetMeLiveAssets(env, orderId);
  const selectedLogo = config.brand.logoAssetId
    ? stored.find(asset => asset.kind === 'logo' && asset.assetId === config.brand.logoAssetId)
    : undefined;
  const photos = stored.filter(asset => asset.kind === 'photo').sort((a, b) => a.position - b.position);
  const selectedPhotos = config.brand.imageAssetIds !== undefined
    ? config.brand.imageAssetIds.map(assetId => photos.find(asset => asset.assetId === assetId)).filter((asset): asset is GetMeLiveAsset => Boolean(asset))
    : photos;
  if (selectedLogo) assets.splice(0, assets.length, ...assets.filter(asset => asset.role !== 'logo'));
  if (selectedPhotos.length) assets.splice(0, assets.length, ...assets.filter(asset => asset.role === 'logo'));
  const appendStored = async (asset: GetMeLiveAsset, role: 'logo' | 'hero_image' | 'supporting_image', index: number) => {
    const bytes = await loadGetMeLiveAssetBytes(env, orderId, asset.assetId);
    if (!bytes) return;
    const extension = asset.contentType === 'image/svg+xml' ? 'svg' : asset.contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    const path = asset.publishedPath || `/assets/${asset.assetId}.${extension}`;
    assets.push({
      assetId: asset.assetId,
      role,
      origin: asset.generated ? 'generated' : 'licensed',
      publicUrl: published ? path : `data:${asset.contentType};base64,${bytesToBase64(new Uint8Array(bytes))}`,
      altText: role === 'logo' ? `${config.brand.businessName} logo` : `${config.brand.businessName} photo ${index + 1}`,
      sourceReference: `get-me-live:${orderId}:asset:${asset.assetId}`
    });
  };
  if (selectedLogo) await appendStored(selectedLogo, 'logo', 0);
  for (let index = 0; index < selectedPhotos.length; index += 1) {
    const asset = selectedPhotos[index];
    const isMain = asset.assetId === config.brand.mainImageAssetId || (!config.brand.mainImageAssetId && index === 0);
    await appendStored(asset, isMain ? 'hero_image' : 'supporting_image', index);
  }
  return assets;
}

export async function handleGetMeLivePreview(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.paidAt) return json({ error: 'Get Me Live must be purchased before preview' }, 402);
  if (request.method === 'GET') {
    const stored = await loadGetMeLivePreview(env, orderId);
    return stored ? new Response(stored.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } }) : json({ error: 'Preview has not been generated yet' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const record = await loadBlueprintRecord(env, owned.sourceSprintOrderId);
  if (!record) return json({ error: 'Source Evidence Sprint is unavailable' }, 409);
  const config = owned.configuration || defaultConfiguration(record.blueprint, owned.ownerId);
  owned.configuration = config;
  const sourceBlueprint = overlayBlueprint(record.blueprint, config);
  let customAssets: WebsiteAsset[];
  try {
    customAssets = await configuredAssets(env, orderId, config, sourceBlueprint);
  } catch (error) {
    console.error('Get Me Live preview failed at configured_assets:', error);
    return json({ error: 'Get Me Live preview failed', stage: 'configured_assets' }, 500);
  }

  // The AI website plan depends only on the source blueprint (with the customer's
  // text choices overlaid). Reuse the stored plan while those inputs are unchanged,
  // so photo, logo, style and payment edits do not re-run Vertex generation.
  const aiInputHash = await sha256Hex(JSON.stringify(sourceBlueprint));
  const previous = await loadGetMeLivePreview(env, orderId).catch(() => null);
  const storedPlan = (previous?.preview as (WebsiteCreationResult & { aiPlan?: GetMeLiveStoredAiPlan }) | undefined)?.aiPlan;
  let manufactured: Awaited<ReturnType<typeof manufactureCustomWebsite>>;
  let aiPlan: GetMeLiveStoredAiPlan;
  try {
    if (storedPlan?.inputHash === aiInputHash && previous) {
      manufactured = {
        ...previous.preview,
        spec: structuredClone(storedPlan.spec),
        assets: customAssets.length ? customAssets : storedPlan.assets
      };
      aiPlan = storedPlan;
    } else {
      manufactured = await manufactureCustomWebsite(env, sourceBlueprint, customAssets.length ? {
        allowDeployment: false,
        assetGenerator: { async generate() { return customAssets; } }
      } : { allowDeployment: false });
      aiPlan = {
        inputHash: aiInputHash,
        spec: structuredClone(manufactured.spec),
        assets: customAssets.length ? await blueprintWebsiteAssetGenerator.generate({ spec: manufactured.spec, blueprint: sourceBlueprint }) : manufactured.assets
      };
    }
  } catch (error) {
    console.error('Get Me Live preview failed at website_manufacturing:', error);
    const message = error instanceof Error ? error.message : '';
    const nestedStage = message.match(/stage=([a-z0-9_]+)/i)?.[1];
    return json({
      error: 'Get Me Live preview failed',
      stage: nestedStage ? `website_manufacturing.${nestedStage}` : 'website_manufacturing'
    }, 500);
  }

  const spec = applyConfigToSpec(manufactured.spec, config);
  (spec as typeof spec & { primaryColor?: string }).primaryColor = config.brand.primaryColor;
  if (config.offer.leadMagnet) {
    const capture = spec.sections.find(section => section.component === 'lead_capture');
    const title = typeof config.offer.leadMagnet === 'string' ? config.offer.leadMagnet : config.offer.leadMagnet.title;
    if (capture) capture.body = `${capture.body} Free resource: ${title}`.trim();
  }
  const origin = new URL(request.url).origin;
  const leadActionUrl = `${origin}/api/get-me-live/sites/${encodeURIComponent(orderId)}/leads`;
  const buyActionUrl = `${origin}/api/get-me-live/sites/${encodeURIComponent(orderId)}/buy`;
  const primaryActionUrl = config.offer.intent === 'buy' ? buyActionUrl : '#contact';
  const assets = manufactured.assets;
  let build: Awaited<ReturnType<typeof buildCustomWebsite>>;
  try {
    build = await buildCustomWebsite(spec, { primaryActionUrl, secondaryActionUrl: '#contact', assets });
  } catch (error) {
    console.error('Get Me Live preview failed at website_build:', error);
    return json({ error: 'Get Me Live preview failed', stage: 'website_build' }, 500);
  }

  let html: string;
  try {
    html = renderCustomWebsiteStaticHtml(spec, {
    assets,
    primaryActionUrl,
    secondaryActionUrl: '#contact',
    leadActionUrl,
    leadMagnet: typeof config.offer.leadMagnet === 'object' && config.offer.leadMagnet.assetId
      ? { title: config.offer.leadMagnet.title, url: '#' }
      : undefined,
    attributionUrl: `${origin}/get-me-live?from=customer-site`,
      showFriendShare: true
    });
  } catch (error) {
    console.error('Get Me Live preview failed at static_render:', error);
    return json({ error: 'Get Me Live preview failed', stage: 'static_render' }, 500);
  }

  const preview = {
    ...manufactured,
    aiPlan,
    spec,
    build,
    receipt: {
      ...manufactured.receipt,
      templateId: build.templateId,
      buildId: build.buildId,
      runtime: build.runtime,
      assetCount: assets.length,
      deployed: false as const,
      productionAutoDeploy: false as const
    }
  };
  try {
    await saveGetMeLivePreview(env, orderId, preview, html);
    if (!statusHeldByPublication(owned)) owned.status = hasPublishedGetMeLiveSite(owned) ? 'live' : 'preview_ready';
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
  } catch (error) {
    console.error('Get Me Live preview failed at preview_persistence:', error);
    return json({ error: 'Get Me Live preview failed', stage: 'preview_persistence' }, 500);
  }
  await recordCommercialFunnelEvent(env, "get_me_live_preview_created", { ownerId: owned.ownerId, orderId: owned.orderId, source: "get_me_live" }).catch(() => undefined);
  return json({ status: owned.status, buildId: build.buildId, templateId: build.templateId });
}
export async function handleGetMeLiveCloudflareConnect(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.paidAt) return json({ error: 'Get Me Live must be purchased first' }, 402);
  const redirectUri = `${new URL(request.url).origin}/api/get-me-live/cloudflare/callback`;
  try {
    const authUrl = await createCloudflareAuthorizationUrl(env, { orderId, ownerId: owned.ownerId, redirectUri });
    return json({ authUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Cloudflare connection is unavailable' }, 503);
  }
}

export async function handleGetMeLiveCloudflareDisconnect(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  await disconnectCloudflareAuthorization(env, orderId);
  owned.providerState.cloudflareConnected = false;
  owned.providerState.cloudflareScopes = undefined;
  owned.updatedAt = new Date().toISOString();
  owned.status = hasPublishedGetMeLiveSite(owned) ? 'live' : 'provider_setup';
  await updateGetMeLiveOrder(env, owned);
  return json({ disconnected: true });
}

export async function handleGetMeLiveCloudflareCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const frontend = env.FRONTEND_URL?.replace(/\/$/, '') || url.origin;
  const savedState = await loadCloudflareAuthorizationState(env, state);
  const setupUrl = savedState ? `${frontend}/get-me-live/setup?order_id=${encodeURIComponent(savedState.orderId)}` : `${frontend}/get-me-live`;
  if (url.searchParams.get('error')) {
    return redirect(`${setupUrl}${setupUrl.includes('?') ? '&' : '?'}cloudflare=error&message=${encodeURIComponent('Cloudflare was not connected. You can try again.')}`, 302);
  }
  if (!code || !state) {
    return redirect(`${setupUrl}${setupUrl.includes('?') ? '&' : '?'}cloudflare=error&message=${encodeURIComponent('Cloudflare did not finish connecting. Please try again.')}`, 302);
  }
  try {
    const connected = await completeCloudflareAuthorization(env, { code, state });
    const order = await loadGetMeLiveOrder(env, connected.orderId);
    if (!order || order.ownerId !== connected.ownerId) throw new Error('Get Me Live Cloudflare ownership mismatch');
    order.providerState.cloudflareConnected = true;
    order.providerState.cloudflareScopes = env.CLOUDFLARE_OAUTH_SCOPES?.split(/[\s,]+/).filter(Boolean);
    order.status = hasPublishedGetMeLiveSite(order) ? 'live' : 'provider_setup';
    order.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, order);
    return redirect(`${frontend}/get-me-live/setup?order_id=${encodeURIComponent(order.orderId)}&cloudflare=connected&step=name`, 302);
  } catch {
    return redirect(`${setupUrl}${setupUrl.includes('?') ? '&' : '?'}cloudflare=error&message=${encodeURIComponent('Cloudflare could not connect. Please try again.')}`, 302);
  }
}

export async function handleGetMeLiveCloudflareAccounts(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  try { return json({ accounts: await listCloudflareAccounts(env, orderId) }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : 'Cloudflare accounts unavailable' }, 409); }
}
/**
 * Optional business email (plan §10). Offered only after the custom domain is
 * active; it never blocks publishing or completion.
 */
export async function handleGetMeLiveEmailSetup(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const config = owned.configuration;
  const domain = owned.customDomainState;
  if (!config || domain?.status !== 'active') {
    return json({ error: 'Connect your own web address first. Business email is available once it is active.' }, 409);
  }
  if (!domain.hosts.includes(`www.${domain.name}`)) {
    return json({ error: 'Business email works with your main domain, not a sub-address.' }, 409);
  }
  const accountId = config.domain.cloudflareAccountId || owned.hosting?.cloudflareAccountId;
  if (!accountId) return json({ error: 'Reconnect Cloudflare to set up business email' }, 409);
  try {
    const zoneId = domain.zoneId || (await findCloudflareZone(env, orderId, accountId, domain.name))?.id;
    if (!zoneId) return json({ error: 'Cloudflare could not find this domain. Try again in a few minutes.' }, 425);
    const routed = await configureCloudflareEmailRouting(env, orderId, {
      accountId,
      zoneId,
      domain: domain.name,
      localPart: config.contact.businessEmailLocalPart || 'hello',
      destinationEmail: config.contact.leadDestinationEmail
    });
    owned.providerState.businessEmailVerified = routed.verified;
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
    return json({ businessEmail: routed.businessEmail, verified: routed.verified, actionRequired: routed.verified ? undefined : 'Open the email Cloudflare sent to your inbox and confirm it, then choose Check again.' }, routed.verified ? 200 : 202);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Business email setup failed' }, 502);
  }
}

export async function handleGetMeLiveStripeConnect(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.configuration) return json({ error: 'Save your Get Me Live setup first' }, 409);
  const body = await request.json<{ country?: string }>().catch(() => ({} as { country?: string }));
  try {
    let accountId = owned.configuration.payments.stripeConnectedAccountId;
    if (!accountId) {
      const account = await createStripeConnectedMerchant(env, { email: owned.ownerId, country: safeText(body.country, 2).toUpperCase() || undefined });
      accountId = account.id;
      owned.configuration.payments.stripeConnectedAccountId = accountId;
      owned.updatedAt = new Date().toISOString();
      await updateGetMeLiveOrder(env, owned);
    }
    const frontend = env.FRONTEND_URL?.replace(/\/$/, '') || new URL(request.url).origin;
    const returnUrl = `${frontend}/get-me-live/setup?order_id=${encodeURIComponent(orderId)}&stripe=return`;
    const refreshUrl = `${frontend}/get-me-live/setup?order_id=${encodeURIComponent(orderId)}&stripe=refresh`;
    const onboardingUrl = await createStripeOnboardingLink(env, { accountId, returnUrl, refreshUrl });
    return json({ onboardingUrl, accountId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Stripe connection failed' }, 502);
  }
}

export async function handleGetMeLiveStripeStatus(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const accountId = owned.configuration?.payments.stripeConnectedAccountId;
  if (!accountId) return json({ connected: false });
  try {
    const wasConnected = owned.providerState.stripeConnected;
    const account = await retrieveStripeConnectedMerchant(env, accountId);
    const cardStatus = account.configuration?.merchant?.capabilities?.card_payments?.status;
    const payoutStatus = account.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status;
    const chargesReady = cardStatus ? cardStatus === 'active' : account.charges_enabled === true;
    const payoutsReady = payoutStatus ? payoutStatus === 'active' : account.payouts_enabled === true;
    if (owned.configuration) {
      owned.configuration.payments.detailsSubmitted = chargesReady;
      owned.configuration.payments.chargesEnabled = chargesReady;
      owned.configuration.payments.payoutsEnabled = payoutsReady;
    }
    owned.providerState.stripeConnected = chargesReady;
    owned.updatedAt = new Date().toISOString();
    await updateGetMeLiveOrder(env, owned);
    if (!wasConnected && owned.providerState.stripeConnected) await recordCommercialFunnelEvent(env, "get_me_live_payment_connected", { ownerId: owned.ownerId, orderId: owned.orderId, source: "get_me_live" }).catch(() => undefined);
    return json({ connected: owned.providerState.stripeConnected, accountId, detailsSubmitted: chargesReady, chargesEnabled: chargesReady, payoutsEnabled: payoutsReady });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Stripe status failed' }, 502);
  }
}
// Pages project names are at most 58 characters: a 53-character slug plus
// "-" and a 4-character suffix.
const PAGES_SLUG_MAX = 53;

/** Customer-friendly Pages project slug (plan §4.2); empty when nothing usable remains. */
export function pagesSlug(value: string): string {
  return value.toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PAGES_SLUG_MAX)
    .replace(/-+$/g, '');
}

/** First 4 hex characters of sha256(orderId): deterministic, so retries choose the same fallback. */
export async function shortHash(orderId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(orderId)));
  return Array.from(digest.slice(0, 2), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function pagesProjectCandidates(order: GetMeLiveOrder): Promise<string[]> {
  const slug = pagesSlug(order.configuration?.brand.businessName || '');
  const candidates = [
    order.configuration?.domain.pagesProjectName,
    slug,
    slug ? `${slug}-${await shortHash(order.orderId)}` : undefined,
    projectNameFor(order.orderId)
  ].filter((name): name is string => Boolean(name));
  return [...new Set(candidates)];
}

/**
 * Overwrite guard (plan §4.1): GhostTown only deploys to a Pages project whose
 * name is persisted on this order. A name that already exists in the account but
 * is not persisted here belongs to someone else and is never reused.
 */
export async function resolvePagesProject(env: Env, order: GetMeLiveOrder, accountId: string): Promise<PagesProject> {
  const hosting = order.hosting;
  if (hosting && (!hosting.cloudflareAccountId || hosting.cloudflareAccountId === accountId)) {
    return ensurePagesProject(env, order.orderId, accountId, hosting.pagesProjectName);
  }
  for (const name of await pagesProjectCandidates(order)) {
    if (await getPagesProject(env, order.orderId, accountId, name)) continue;
    const created = await createPagesProject(env, order.orderId, accountId, name);
    if (created) return created;
  }
  throw new Error('No available Pages project name');
}

function projectNameFor(orderId: string): string {
  return `gt-${orderId.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(-46)}`.slice(0, 63);
}

function extensionFor(contentType: string): string {
  return ({
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
    'image/svg+xml': 'svg', 'application/pdf': 'pdf'
  } as Record<string, string>)[contentType] || 'bin';
}

function socialSvg(config: GetMeLiveConfiguration, liveUrl: string): string {
  const clean = (value: string) => value.replace(/[<>&"']/g, '').slice(0, 90);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#12251f"/><circle cx="1040" cy="100" r="260" fill="#d96f3d" opacity=".22"/><circle cx="140" cy="650" r="300" fill="#468269" opacity=".28"/><text x="88" y="155" fill="#f7d774" font-family="Arial,sans-serif" font-size="30" font-weight="800">${clean(config.brand.businessName)}</text><text x="88" y="270" fill="#ffffff" font-family="Arial,sans-serif" font-size="62" font-weight="800">${clean(config.offer.headline || config.offer.offer || 'See what is ready for you')}</text><text x="88" y="520" fill="#d9e3de" font-family="Arial,sans-serif" font-size="27">${clean(liveUrl.replace(/^https?:\/\//, ''))}</text></svg>`;
}

const RELEASE_MARKER = (releaseId: string) => `<meta name="ghosttown-release-id" content="${releaseId}">`;
const PUBLISH_VERIFY_BACKOFF_MS = [2_000, 3_000, 5_000, 5_000, 5_000, 5_000, 5_000];

function publishPaymentMode(order: GetMeLiveOrder): 'lead_until_stripe_ready' | 'connected_checkout' | 'lead' {
  const config = order.configuration;
  const paymentReady = config?.offer.intent === 'buy' && order.providerState.stripeConnected && Boolean(config.payments.chargesEnabled);
  return config?.offer.intent === 'buy' && !paymentReady ? 'lead_until_stripe_ready' : paymentReady ? 'connected_checkout' : 'lead';
}

function attemptTargetUrl(order: GetMeLiveOrder, attempt: GetMeLivePublishAttempt): string | undefined {
  if (attempt.kind === 'domain_activation' && attempt.customDomain) return `https://${attempt.customDomain}`;
  return order.hosting?.pagesUrl;
}

function attemptSummary(attempt: GetMeLivePublishAttempt) {
  return { releaseId: attempt.attemptId, kind: attempt.kind, phase: attempt.phase, buildId: attempt.buildId, claimedAt: attempt.claimedAt, deployedAt: attempt.deployedAt };
}

type VerifyOutcome =
  | { state: 'verified'; settledHere: boolean }
  | { state: 'pending' }
  | { state: 'failed'; message: string };

/**
 * One verification step for a deployed attempt (plan §2.5): the target must
 * answer 200 with this attempt's exact release marker. Success settles the
 * attempt atomically; an expired attempt is settled as failed.
 */
async function verifyAttemptOnce(env: Env, order: GetMeLiveOrder, attempt: GetMeLivePublishAttempt): Promise<VerifyOutcome> {
  if (isPublishAttemptExpired(attempt)) {
    const message = attempt.phase === 'deployed' ? DEPLOY_EXPIRED_MESSAGE : CLAIM_EXPIRED_MESSAGE;
    await settlePublishFailure(env, attempt, message);
    return { state: 'failed', message };
  }
  if (attempt.phase !== 'deployed') return { state: 'pending' };
  const target = attemptTargetUrl(order, attempt);
  const hosting = order.hosting;
  if (!target || !hosting) return { state: 'pending' };
  const verifiedUrl = `${target}/?gt_verify=${encodeURIComponent(attempt.attemptId)}`;
  let html = '';
  let httpStatus = 0;
  try {
    const response = await fetch(verifiedUrl, { method: 'GET', redirect: 'follow', headers: { 'Cache-Control': 'no-cache' } });
    httpStatus = response.status;
    if (response.status === 200) html = await response.text();
    else await response.body?.cancel();
  } catch { return { state: 'pending' }; }
  if (httpStatus !== 200 || !html.includes(RELEASE_MARKER(attempt.attemptId))) return { state: 'pending' };

  const verifiedAt = new Date().toISOString();
  const routeBase = `/api/get-me-live/sites/${encodeURIComponent(order.orderId)}`;
  const receipt: GetMeLiveReleaseReceiptV2 = {
    schemaVersion: 'ghosttown-get-me-live-release-receipt-v2',
    kind: attempt.kind,
    releaseId: attempt.attemptId,
    orderId: order.orderId,
    sourceSprintOrderId: order.sourceSprintOrderId,
    sourceBlueprintId: order.sourceBlueprintId,
    offerId: order.offerId,
    offerVersion: order.offerVersion,
    provider: 'cloudflare_pages',
    pagesProjectName: hosting.pagesProjectName,
    pagesSubdomain: hosting.pagesSubdomain,
    pagesUrl: hosting.pagesUrl,
    liveUrl: hosting.pagesUrl,
    customDomain: attempt.kind === 'domain_activation' ? attempt.customDomain : undefined,
    deploymentUrl: attempt.deploymentUrl,
    deploymentId: attempt.deploymentId!,
    buildId: attempt.buildId,
    publishedAt: attempt.deployedAt || verifiedAt,
    verifiedAt,
    backfilled: false,
    checks: {
      releaseMarkerServed: true,
      customerPageHttpStatus: httpStatus,
      leadCaptureConfigured: html.includes(`${routeBase}/leads`),
      activityTrackingConfigured: html.includes(`${routeBase}/activity`),
      paymentMode: getMeLivePaymentMode(order)
    }
  };
  const { lastReleaseFailure: _cleared, ...settledHosting } = hosting;
  const settledHere = await settlePublishSuccess(env, {
    attempt,
    release: { pagesUrl: hosting.pagesUrl, verifiedUrl, verifiedAt, receiptJson: JSON.stringify(receipt), customDomain: receipt.customDomain },
    order: {
      deploymentReceiptJson: JSON.stringify({
        deploymentId: attempt.deploymentId, buildId: attempt.buildId, publicUrl: hosting.pagesUrl,
        deploymentUrl: attempt.deploymentUrl, publishedAt: receipt.publishedAt, releaseId: attempt.attemptId
      }),
      hostingJson: JSON.stringify(settledHosting),
      publicUrl: hosting.pagesUrl,
      publishedAt: receipt.publishedAt
    }
  });
  if (settledHere && attempt.kind === 'launch') {
    await recordCommercialFunnelEvent(env, "get_me_live_live_completed", { ownerId: order.ownerId, orderId: order.orderId, source: "get_me_live", content: hosting.pagesUrl }).catch(() => undefined);
  }
  return { state: 'verified', settledHere };
}

async function currentPublishState(env: Env, orderId: string) {
  const [order, attempt, latest] = await Promise.all([
    loadGetMeLiveOrder(env, orderId),
    loadPublishAttempt(env, orderId),
    loadLatestGetMeLiveRelease(env, orderId)
  ]);
  return { order, attempt, latest };
}

export async function handleGetMeLivePublish(
  request: Request,
  env: Env,
  orderId: string,
  options: { verifyBackoffMs?: number[] } = {}
): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.paidAt || !owned.configuration) return json({ error: 'Finish your Get Me Live setup before publishing' }, 409);
  if (!owned.providerState.cloudflareConnected || !owned.configuration.domain.cloudflareAccountId) {
    return json({ error: 'Connect Cloudflare and choose an account before publishing' }, 409);
  }
  const stored = await loadGetMeLivePreview(env, orderId);
  if (!stored) return json({ error: 'Generate and review your page before publishing' }, 409);
  if (!env.BROWSER) return json({ error: 'Browser verification is unavailable; publication is blocked' }, 503);

  const config = owned.configuration;
  const accountId = config.domain.cloudflareAccountId!;
  const storedAssets = await listGetMeLiveAssets(env, orderId);
  const deployedFiles: Array<{ path: string; contentType: string; bytes: ArrayBuffer }> = [];
  for (const asset of storedAssets) {
    const bytes = await loadGetMeLiveAssetBytes(env, orderId, asset.assetId);
    if (!bytes) return json({ error: `The file ${asset.filename} is missing. Upload it again before going live.` }, 409);
    const path = `assets/${asset.assetId}.${extensionFor(asset.contentType)}`;
    deployedFiles.push({ path, contentType: asset.contentType, bytes });
  }

  // One unverified publish attempt per order, enforced by the database (plan §2.4).
  const kind: GetMeLiveReleaseKind = hasPublishedGetMeLiveSite(owned) ? 'republish' : 'launch';
  const claim = await claimPublishAttempt(env, orderId, { kind, buildId: stored.preview.build.buildId });
  if (!claim.claimed) {
    const current = await loadGetMeLiveOrder(env, orderId);
    return json({
      duplicate: true, verified: false, releaseId: claim.existing.attemptId, attemptKind: claim.existing.kind,
      attemptBuildId: claim.existing.buildId, currentBuildId: stored.preview.build.buildId,
      status: current ? publicStatus(current) : owned.status, pagesUrl: current?.hosting?.pagesUrl
    }, 202);
  }
  const attempt = claim.attempt;
  const releaseId = attempt.attemptId;
  if (kind === 'launch') await transitionGetMeLiveStatus(env, orderId, 'publishing', { except: ['live'] });

  // Resolve the Pages project: the provider-returned subdomain is the only source
  // for the stable customer URL. Persist it before deploying so a retry reuses it.
  let hosting: GetMeLiveHosting;
  try {
    const project = await resolvePagesProject(env, owned, accountId);
    hosting = hostingFromProject(accountId, project, 'provider', owned.hosting);
    await recordHosting(env, orderId, hosting);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloudflare Pages is unavailable';
    await settlePublishFailure(env, attempt, message);
    return json({ error: message, releaseId }, 502);
  }
  owned.hosting = hosting;
  const pagesUrl = hosting.pagesUrl;
  const canonicalUrl = preferredPublicUrl(owned) || pagesUrl;
  const social = new TextEncoder().encode(socialSvg(config, canonicalUrl));
  deployedFiles.push({ path: 'og.svg', contentType: 'image/svg+xml', bytes: social.buffer });
  const publishedAssets = stored.preview.assets.map(asset => {
    const uploaded = storedAssets.find(item => item.assetId === asset.assetId);
    return uploaded ? { ...asset, publicUrl: `/assets/${uploaded.assetId}.${extensionFor(uploaded.contentType)}` } : asset;
  });
  const leadMagnetValue = typeof config.offer.leadMagnet === 'object' ? config.offer.leadMagnet : undefined;
  const leadMagnetAsset = leadMagnetValue?.assetId
    ? storedAssets.find(asset => asset.assetId === leadMagnetValue.assetId)
    : undefined;
  const leadMagnetConfig = leadMagnetValue?.assetId && leadMagnetAsset
    ? { title: leadMagnetValue.title, url: `/assets/${leadMagnetValue.assetId}.${extensionFor(leadMagnetAsset.contentType)}` }
    : undefined;
  const origin = new URL(request.url).origin;
  const leadActionUrl = `${origin}/api/get-me-live/sites/${encodeURIComponent(orderId)}/leads`;
  const buyActionUrl = `${origin}/api/get-me-live/sites/${encodeURIComponent(orderId)}/buy`;
  const paymentMode = publishPaymentMode(owned);
  let publicHtml: string;
  try {
    publicHtml = renderCustomWebsiteStaticHtml(stored.preview.spec, {
    assets: publishedAssets,
    primaryActionUrl: paymentMode === 'connected_checkout' ? buyActionUrl : '#contact',
    secondaryActionUrl: '#contact',
    leadActionUrl,
    leadMagnet: leadMagnetConfig,
    canonicalUrl,
    socialImageUrl: `${canonicalUrl}/og.svg`,
    attributionUrl: `${env.FRONTEND_URL?.replace(/\/$/, '') || origin}/get-me-live?from=customer-site`,
    showFriendShare: true,
      activityUrl: `${origin}/api/get-me-live/sites/${encodeURIComponent(orderId)}/activity`,
      releaseId
    });
    const browser = await env.BROWSER.quickAction('pdf', { html: publicHtml, pdfOptions: { printBackground: true } });
    if (!browser.ok) throw new Error('render check');
  } catch {
    const message = 'Your page did not pass the final browser render check';
    await settlePublishFailure(env, attempt, message);
    return json({ error: message, releaseId }, 409);
  }

  // Publication never attaches a custom domain: a domain problem must not be
  // able to fail a deployment that succeeded.
  let deployed: GetMeLivePublishAttempt | null;
  try {
    const deployment = await deployCloudflarePagesHtml(env, orderId, accountId, hosting.pagesProjectName, publicHtml, deployedFiles);
    deployed = await recordPublishDeployment(env, attempt, deployment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publication failed';
    await settlePublishFailure(env, attempt, message);
    return json({ error: message, releaseId }, 502);
  }
  if (!deployed) {
    // The claim was lost to a takeover: write nothing else and report the current attempt.
    const current = await currentPublishState(env, orderId);
    return json({
      verified: false, superseded: true, releaseId: current.attempt?.attemptId, attemptKind: current.attempt?.kind,
      status: current.order ? publicStatus(current.order) : owned.status, pagesUrl
    }, 202);
  }
  if (kind === 'launch') await transitionGetMeLiveStatus(env, orderId, 'verifying', { only: ['publishing'] });
  for (const asset of storedAssets) {
    await markGetMeLiveAssetPublished(env, orderId, asset.assetId, `/assets/${asset.assetId}.${extensionFor(asset.contentType)}`);
  }
  await saveGetMeLivePreview(env, orderId, stored.preview, publicHtml);

  const backoff = options.verifyBackoffMs ?? PUBLISH_VERIFY_BACKOFF_MS;
  let outcome: VerifyOutcome = await verifyAttemptOnce(env, owned, deployed);
  for (const delay of backoff) {
    if (outcome.state !== 'pending') break;
    await new Promise(resolve => setTimeout(resolve, delay));
    outcome = await verifyAttemptOnce(env, owned, deployed);
  }
  const after = await loadGetMeLiveOrder(env, orderId);
  const status = after ? publicStatus(after) : owned.status;
  if (outcome.state === 'verified') {
    return json({
      status, verified: true, releaseId, pagesUrl, publicUrl: pagesUrl, pagesProjectName: hosting.pagesProjectName,
      deploymentId: deployed.deploymentId, paymentMode, businessEmailReady: owned.providerState.businessEmailVerified
    });
  }
  if (outcome.state === 'failed') return json({ error: outcome.message, status, verified: false, releaseId, pagesUrl }, 502);
  return json({ status, verified: false, releaseId, pagesUrl, publicUrl: pagesUrl, pagesProjectName: hosting.pagesProjectName }, 202);
}

/** POST /publish/verify: one explicit, idempotent verification step for the current attempt. */
export async function handleGetMeLivePublishVerify(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const attempt = await loadPublishAttempt(env, orderId);
  if (attempt) {
    const outcome = await verifyAttemptOnce(env, owned, attempt);
    if (outcome.state === 'pending') {
      return json({ status: publicStatus(owned), verified: false, pending: true, releaseId: attempt.attemptId, attemptKind: attempt.kind, phase: attempt.phase, pagesUrl: owned.hosting?.pagesUrl });
    }
  }
  const current = await currentPublishState(env, orderId);
  const order = current.order || owned;
  const pending = current.attempt;
  return json({
    status: publicStatus(order),
    verified: !pending && Boolean(current.latest),
    pending: Boolean(pending),
    releaseId: pending?.attemptId || current.latest?.releaseId,
    attemptKind: pending?.kind,
    phase: pending?.phase,
    failure: order.status === 'failed' ? order.failure : order.hosting?.lastReleaseFailure?.releaseId === attempt?.attemptId ? order.hosting?.lastReleaseFailure?.message : undefined,
    pagesUrl: order.hosting?.pagesUrl
  });
}

/** GET /publish/status: read-only. Never fetches the site, settles, or writes. */
export async function handleGetMeLivePublishStatus(request: Request, env: Env, orderId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const current = await currentPublishState(env, orderId);
  if (!current.order || normalizeEmail(current.order.ownerId) !== normalizeEmail(auth.email)) return json({ error: 'Get Me Live order not found' }, 404);
  return json({
    status: publicStatus(current.order),
    pendingAttempt: current.attempt ? attemptSummary(current.attempt) : undefined,
    latestRelease: current.latest ? { releaseId: current.latest.releaseId, kind: current.latest.kind, verifiedAt: current.latest.verifiedAt } : undefined,
    pagesUrl: current.order.hosting?.pagesUrl
  });
}

function launchShareTexts(order: GetMeLiveOrder): string[] {
  const config = order.configuration!;
  const liveUrl = preferredPublicUrl(order) || '';
  const offer = config.offer.offer || config.brand.businessName;
  return [
    `${config.brand.businessName} is live. ${config.offer.headline || `Take a look at ${offer}.`} ${liveUrl}`,
    `I turned an idea into a real page for customers. See ${offer} from ${config.brand.businessName}: ${liveUrl}`,
    `Know someone who could use ${offer}? Here is the page: ${liveUrl}`
  ];
}

async function ensureOrderShareDrafts(env: Env, order: GetMeLiveOrder): Promise<GetMeLiveShareDraft[]> {
  const existing = await listGetMeLiveShareDrafts(env, {
    ownerId: order.ownerId, sourceSprintOrderId: order.sourceSprintOrderId, orderId: order.orderId, draftType: 'launch'
  });
  if (existing.length) return existing;
  const createdAt = new Date().toISOString();
  const drafts = launchShareTexts(order).map((text, position): GetMeLiveShareDraft => ({
    draftId: id('gml_share'), ownerId: order.ownerId, sourceSprintOrderId: order.sourceSprintOrderId,
    getMeLiveOrderId: order.orderId, draftType: 'launch', position,
    generatedText: text, editedText: text, createdAt
  }));
  for (const draft of drafts) await saveGetMeLiveShareDraft(env, draft);
  return drafts;
}

export async function handleGetMeLiveSharePack(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!hasPublishedGetMeLiveSite(owned) || !owned.configuration) return json({ error: 'Go live before opening your share pack' }, 409);
  let drafts = await ensureOrderShareDrafts(env, owned);
  if (request.method === 'POST') {
    const body = await request.json<{ draftId?: string; text?: string; action?: 'save' | 'approve' | 'shared' }>().catch(() => ({} as { draftId?: string; text?: string; action?: 'save' | 'approve' | 'shared' }));
    const draft = drafts.find(item => item.draftId === body.draftId);
    if (!draft) return json({ error: 'Share draft not found' }, 404);
    draft.editedText = safeText(body.text, 600, draft.editedText);
    if (body.action === 'approve' || body.action === 'shared') draft.approvedAt = new Date().toISOString();
    if (body.action === 'shared') {
      draft.sharedAt = new Date().toISOString();
      await incrementGetMeLiveActivity(env, orderId, 'share');
    }
    await saveGetMeLiveShareDraft(env, draft);
    drafts = drafts.map(item => item.draftId === draft.draftId ? draft : item);
  }
  const activity = await getGetMeLiveActivity(env, orderId, owned.sourceSprintOrderId);
  const liveUrl = preferredPublicUrl(owned);
  const milestoneType: GetMeLiveShareDraftType | undefined = activity.sales > 0 ? 'milestone_sale' : (await countGetMeLiveLeads(env, orderId)) > 0 ? 'milestone_lead' : undefined;
  const milestoneText = milestoneType === 'milestone_sale'
    ? `A customer bought from ${owned.configuration.brand.businessName}. Small step, real progress. ${liveUrl}`
    : milestoneType === 'milestone_lead'
      ? `Someone raised their hand for ${owned.configuration.offer.offer || owned.configuration.brand.businessName}. The page is doing its job. ${liveUrl}`
      : undefined;
  return json({ drafts, liveUrl, socialImageUrl: `${liveUrl}/og.svg`, milestone: milestoneText ? { type: milestoneType, text: milestoneText } : undefined });
}

export async function handleGetMeLiveSprintShareDraft(request: Request, env: Env, sourceSprintOrderId: string): Promise<Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Please log in first' }, 401);
  const source = await ownedLaunchBlueprintOrder(request, env, sourceSprintOrderId, true);
  if (source instanceof Response) return source;
  const record = await loadBlueprintRecord(env, sourceSprintOrderId);
  if (!record) return json({ error: 'Your Sprint is not ready yet' }, 409);
  const ownerId = normalizeEmail(auth.email);
  let drafts = await listGetMeLiveShareDrafts(env, { ownerId, sourceSprintOrderId, draftType: 'sprint' });
  if (!drafts.length) {
    const text = `I finished a GhostTown Sprint for ${record.blueprint.offer.offerName}. Next I am testing whether real customers want it.`;
    const draft: GetMeLiveShareDraft = {
      draftId: id('gml_share'), ownerId, sourceSprintOrderId, draftType: 'sprint', position: 0,
      generatedText: text, editedText: text, createdAt: new Date().toISOString()
    };
    await saveGetMeLiveShareDraft(env, draft);
    drafts = [draft];
  }
  if (request.method === 'POST') {
    const body = await request.json<{ text?: string; action?: 'save' | 'approve' | 'shared' }>().catch(() => ({} as { text?: string; action?: 'save' | 'approve' | 'shared' }));
    const draft = drafts[0];
    draft.editedText = safeText(body.text, 600, draft.editedText);
    if (body.action === 'approve' || body.action === 'shared') draft.approvedAt = new Date().toISOString();
    if (body.action === 'shared') draft.sharedAt = new Date().toISOString();
    await saveGetMeLiveShareDraft(env, draft);
    drafts = [draft];
  }
  return json({ draft: drafts[0] });
}

export async function handlePublicGetMeLiveActivity(request: Request, env: Env, orderId: string): Promise<Response> {
  const order = await loadGetMeLiveOrder(env, orderId);
  if (!order || !hasPublishedGetMeLiveSite(order)) return new Response(null, { status: 204 });
  const body = request.method === 'POST'
    ? await request.json<{ kind?: string }>().catch(() => ({} as { kind?: string }))
    : { kind: 'visit' };
  await incrementGetMeLiveActivity(env, orderId, body.kind === 'share' ? 'share' : 'visit');
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function handleGetMeLiveStoryStudioHandoff(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!owned.configuration || !hasPublishedGetMeLiveSite(owned)) return json({ error: 'Go live before opening Story Studio' }, 409);
  const leadCount = await countGetMeLiveLeads(env, orderId);
  const liveUrl = preferredPublicUrl(owned);
  return json({ handoff: {
    schemaVersion: 'ghosttown-story-studio-handoff-v1',
    sourceSprintOrderId: owned.sourceSprintOrderId, sourceBlueprintId: owned.sourceBlueprintId, getMeLiveOrderId: owned.orderId,
    business: { name: owned.configuration.brand.businessName, offer: owned.configuration.offer.offer, intent: owned.configuration.offer.intent, liveUrl },
    activity: { interestedPeople: leadCount, canonicalSprintEvidenceOrderId: owned.sourceSprintOrderId, note: 'GhostTown will carry your customer activity forward.' },
    storyStudioUrl: env.STORY_STUDIO_URL?.trim() || undefined
  } });
}

const RELEASE_MARKER_PATTERN = /<meta name="ghosttown-release-id" content="([^"]+)">/;

/** Reads a customer page without writing anything; used by backfill and /health. */
async function inspectCustomerPage(url: string, orderId: string): Promise<{
  url: string; httpStatus: number; reachable: boolean; servedReleaseId?: string;
  leadCaptureConfigured: boolean; activityTrackingConfigured: boolean; error?: string;
}> {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'Cache-Control': 'no-cache' } });
    const html = response.ok && (response.headers.get('content-type') || 'text/html').includes('text/html') ? await response.text() : '';
    if (!html) await response.body?.cancel();
    const routeBase = `/api/get-me-live/sites/${encodeURIComponent(orderId)}`;
    return {
      url,
      httpStatus: response.status,
      reachable: response.ok,
      servedReleaseId: html.match(RELEASE_MARKER_PATTERN)?.[1],
      leadCaptureConfigured: html.includes(`${routeBase}/leads`),
      activityTrackingConfigured: html.includes(`${routeBase}/activity`)
    };
  } catch (error) {
    return { url, httpStatus: 0, reachable: false, leadCaptureConfigured: false, activityTrackingConfigured: false, error: error instanceof Error ? error.message : 'unreachable' };
  }
}

/**
 * GET /release-receipt: the stored launch receipt, byte-identical on every read
 * (plan §15). A published legacy order without a launch row answers
 * 404 { needsBackfill: true }; the client then calls POST /release-receipt/backfill.
 */
export async function handleGetMeLiveReleaseReceipt(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const launch = await loadLaunchGetMeLiveRelease(env, orderId);
  if (launch) {
    return new Response(`{"receipt":${launch.receiptJson}}`, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
    });
  }
  if (!owned.configuration || !hasPublishedGetMeLiveSite(owned)) return json({ error: 'Go live before opening your release receipt' }, 409);
  return json({ error: 'This launch receipt needs to be rebuilt from your live site.', needsBackfill: true }, 404);
}

/** POST /release-receipt/backfill: legacy orders only; creates the backfilled launch row (plan §20.2). Idempotent. */
export async function handleGetMeLiveReleaseReceiptBackfill(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const existing = await loadLaunchGetMeLiveRelease(env, orderId);
  if (existing) return new Response(`{"receipt":${existing.receiptJson}}`, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
  if (!owned.configuration || !hasPublishedGetMeLiveSite(owned)) return json({ error: 'Go live before opening your release receipt' }, 409);
  const hosting = owned.hosting;
  if (!hosting) return json({ error: 'Reconnect Cloudflare to refresh your website details.' }, 409);
  const page = await inspectCustomerPage(hosting.pagesUrl, orderId);
  const verifiedAt = new Date().toISOString();
  const deployment = owned.deploymentReceipt;
  const releaseId = `rel_legacy_${orderId}`;
  const receipt: GetMeLiveReleaseReceiptV2 = {
    schemaVersion: 'ghosttown-get-me-live-release-receipt-v2',
    kind: 'launch',
    releaseId,
    orderId: owned.orderId,
    sourceSprintOrderId: owned.sourceSprintOrderId,
    sourceBlueprintId: owned.sourceBlueprintId,
    offerId: owned.offerId,
    offerVersion: owned.offerVersion,
    provider: 'cloudflare_pages',
    pagesProjectName: hosting.pagesProjectName,
    pagesSubdomain: hosting.pagesSubdomain,
    pagesUrl: hosting.pagesUrl,
    liveUrl: hosting.pagesUrl,
    deploymentUrl: deployment?.deploymentUrl,
    deploymentId: deployment?.deploymentId || 'legacy',
    buildId: deployment?.buildId || 'legacy',
    publishedAt: deployment?.publishedAt || owned.publishedAt || verifiedAt,
    verifiedAt,
    // Launch-time verification never happened for legacy orders; the receipt says so.
    backfilled: true,
    checks: {
      releaseMarkerServed: false,
      customerPageHttpStatus: page.httpStatus,
      leadCaptureConfigured: page.leadCaptureConfigured,
      activityTrackingConfigured: page.activityTrackingConfigured,
      paymentMode: getMeLivePaymentMode(owned)
    }
  };
  await insertBackfilledLaunchRelease(env, {
    orderId, releaseId, buildId: receipt.buildId, deploymentId: receipt.deploymentId, deploymentUrl: receipt.deploymentUrl,
    pagesUrl: hosting.pagesUrl, verifiedUrl: hosting.pagesUrl, verifiedAt, receiptJson: JSON.stringify(receipt)
  });
  const stored = await loadLaunchGetMeLiveRelease(env, orderId);
  if (!stored) return json({ error: 'The launch receipt could not be saved' }, 500);
  return new Response(`{"receipt":${stored.receiptJson}}`, { status: 201, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
}

/** GET /releases: every verified release row, oldest first (append-only). */
export async function handleGetMeLiveReleases(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const releases = await listGetMeLiveReleases(env, orderId);
  return json({
    releases: releases.map(release => ({
      releaseId: release.releaseId, kind: release.kind, buildId: release.buildId, deploymentId: release.deploymentId,
      deploymentUrl: release.deploymentUrl, pagesUrl: release.pagesUrl, customDomain: release.customDomain,
      verifiedUrl: release.verifiedUrl, verifiedAt: release.verifiedAt, backfilled: release.backfilled
    }))
  });
}

/** GET /health: current, mutable site health. Reads the live site; never writes. */
export async function handleGetMeLiveHealth(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (!hasPublishedGetMeLiveSite(owned)) return json({ error: 'Go live before checking your website' }, 409);
  const preferredUrl = preferredPublicUrl(owned) || owned.publicUrl;
  if (!preferredUrl) return json({ error: 'Reconnect Cloudflare to refresh your website details.' }, 409);
  const pagesUrl = owned.hosting?.pagesUrl;
  const urls = [...new Set([preferredUrl, pagesUrl].filter((url): url is string => Boolean(url)))];
  const [targets, latest] = await Promise.all([
    Promise.all(urls.map(url => inspectCustomerPage(url, orderId))),
    loadLatestGetMeLiveRelease(env, orderId)
  ]);
  const primary = targets[0];
  return json({
    checkedAt: new Date().toISOString(),
    preferredUrl,
    pagesUrl,
    latestReleaseId: latest?.releaseId,
    servingLatestRelease: Boolean(latest && primary.servedReleaseId === latest.releaseId),
    healthy: primary.reachable && primary.leadCaptureConfigured && primary.activityTrackingConfigured,
    paymentMode: getMeLivePaymentMode(owned),
    targets
  });
}

export async function handleGetMeLiveLeads(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedGetMeLiveOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  return json({ leads: await listGetMeLiveLeads(env, orderId) });
}
/** Exact hosts a visitor may be returned to for this order (plan §5.2). */
function trustedReturnHosts(order: GetMeLiveOrder): { exact: Set<string>; pagesSubdomain?: string } {
  const exact = new Set<string>();
  const pagesSubdomain = order.hosting?.pagesSubdomain?.toLowerCase();
  if (pagesSubdomain) exact.add(pagesSubdomain);
  const domain = order.customDomainState;
  if (domain?.status === 'active' && domain.name) {
    const apex = domain.name.toLowerCase();
    exact.add(apex);
    exact.add(`www.${apex}`);
  }
  return { exact, pagesSubdomain };
}

function trustedOrigin(order: GetMeLiveOrder, candidate: string | null): string | undefined {
  if (!candidate) return undefined;
  let url: URL;
  try { url = new URL(candidate); } catch { return undefined; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return undefined;
  const host = url.hostname.toLowerCase();
  const { exact, pagesSubdomain } = trustedReturnHosts(order);
  if (exact.has(host)) return `https://${host}`;
  // This project's deployment hashes and branch aliases: <label>.<pagesSubdomain>.
  if (pagesSubdomain) {
    const suffix = `.${pagesSubdomain}`;
    if (host.endsWith(suffix) && /^[a-z0-9-]+$/.test(host.slice(0, -suffix.length))) return `https://${host}`;
  }
  return undefined;
}

/**
 * Where to send a visitor back to after a lead or payment step (plan §5): the
 * validated Origin header, else the validated Referer origin, else the order's
 * preferred public URL. Request paths and query strings are never reused, so
 * an arbitrary or look-alike origin can never produce an open redirect.
 */
export function returnOriginFor(order: GetMeLiveOrder, request: Request): string | undefined {
  let referer: string | null = null;
  try { referer = request.headers.get('Referer') ? new URL(request.headers.get('Referer')!).origin : null; } catch { referer = null; }
  return trustedOrigin(order, request.headers.get('Origin'))
    || trustedOrigin(order, referer)
    || preferredPublicUrl(order);
}

function returnUrl(origin: string | undefined, param: string): string {
  return origin ? `${origin}/?${param}` : `/?${param}`;
}

export async function handlePublicGetMeLiveLead(request: Request, env: Env, orderId: string): Promise<Response> {
  const loaded = await loadGetMeLiveOrder(env, orderId);
  if (!loaded || !hasPublishedGetMeLiveSite(loaded)) return new Response('Page not found', { status: 404 });
  const order = await normalizeLegacyHosting(env, loaded);
  let body: { name?: string; email?: string; message?: string; consent?: string | boolean } = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) body = await request.json<typeof body>();
    else {
      const form = await request.formData();
      body = {
        name: String(form.get('name') || ''), email: String(form.get('email') || ''),
        message: String(form.get('message') || ''), consent: String(form.get('consent') || '')
      };
    }
  } catch { return new Response('Please check the form and try again.', { status: 400 }); }
  const name = safeText(body.name, 120);
  const email = safeText(body.email, 254).toLowerCase();
  const message = safeText(body.message, 2000);
  const consented = body.consent === true || ['yes', 'true', 'on'].includes(String(body.consent).toLowerCase());
  if (!name || !email.includes('@') || !consented) return new Response('Name, email, and contact permission are required.', { status: 400 });

  const leadId = id('gml_lead');
  const now = new Date().toISOString();
  const consentText = 'I agree to be contacted about this offer.';
  await saveGetMeLiveLead(env, { leadId, orderId, name, email, message, consentText, sourcePath: new URL(request.url).pathname, createdAt: now });
  try {
    await ingestObservedEvidenceEvent(env, {
      eventId: leadId,
      orderId: order.sourceSprintOrderId,
      eventType: 'launch_site_lead',
      occurredAt: now,
      source: 'launch_site',
      contactOrChannel: email,
      summary: message ? `Get Me Live lead submitted with consent: ${message}` : 'Get Me Live lead submitted with consent.',
      customerLanguage: message || undefined,
      sourceReference: `get-me-live:${orderId}`
    });
  } catch (error) {
    console.warn('Get Me Live lead evidence projection failed', { leadId, error });
  }
  await recordCommercialFunnelEvent(env, "get_me_live_lead_captured", { orderId: order.sourceSprintOrderId, source: "get_me_live", content: orderId }).catch(() => undefined);
  if (contentType.includes('application/json')) return json({ received: true, leadId }, 201, { 'Cache-Control': 'no-store' });
  return redirect(returnUrl(returnOriginFor(order, request), 'lead=received'), 303);
}

export async function handlePublicGetMeLiveBuy(request: Request, env: Env, orderId: string): Promise<Response> {
  const loaded = await loadGetMeLiveOrder(env, orderId);
  if (!loaded || !hasPublishedGetMeLiveSite(loaded) || !loaded.configuration) return new Response('Page not found', { status: 404 });
  const order = await normalizeLegacyHosting(env, loaded);
  if (!order.configuration) return new Response('Page not found', { status: 404 });
  const config = order.configuration;
  const accountId = config.payments.stripeConnectedAccountId;
  if (config.offer.intent !== 'buy' || !accountId || !config.payments.chargesEnabled || !order.providerState.stripeConnected) {
    return redirect(returnUrl(returnOriginFor(order, request), 'payment=not-ready'), 303);
  }
  if (!config.offer.price) return new Response('This offer does not have a payment price yet.', { status: 409 });
  const site = returnOriginFor(order, request);
  if (!site) return new Response('Page is not published yet.', { status: 409 });
  try {
    const session = await createConnectedCheckoutSession(env, {
      accountId,
      productName: config.offer.offer || config.brand.businessName,
      price: config.offer.price,
      successUrl: returnUrl(site, 'payment=success'),
      cancelUrl: returnUrl(site, 'payment=cancelled'),
      getMeLiveOrderId: orderId,
      sourceSprintOrderId: order.sourceSprintOrderId
    });
    return redirect(session.url, 303);
  } catch (error) {
    console.error('Get Me Live connected checkout failed', error);
    return new Response('Payment checkout is temporarily unavailable. Please contact the business directly.', { status: 502 });
  }
}

export async function recordGetMeLiveExperimentPayment(
  env: Env,
  eventId: string,
  session: Record<string, unknown>,
  connectedAccountId?: string
): Promise<boolean> {
  const metadata = typeof session.metadata === 'object' && session.metadata ? session.metadata as Record<string, unknown> : {};
  const orderId = typeof metadata.get_me_live_experiment_order_id === 'string' ? metadata.get_me_live_experiment_order_id : '';
  if (!orderId) return false;
  const order = await loadGetMeLiveOrder(env, orderId);
  if (!order || metadata.source_sprint_order_id !== order.sourceSprintOrderId) throw new Error('Get Me Live experiment payment lineage mismatch');
  const expectedAccountId = order.configuration?.payments.stripeConnectedAccountId;
  if (!expectedAccountId || (connectedAccountId && connectedAccountId !== expectedAccountId)) throw new Error('Get Me Live experiment payment connected-account mismatch');
  if (session.payment_status !== 'paid') return false;
  const amountTotal = typeof session.amount_total === 'number' && Number.isFinite(session.amount_total) ? Math.max(0, Math.round(session.amount_total)) : 0;
  await ingestObservedEvidenceEvent(env, {
    eventId: `stripe_${eventId}`,
    orderId: order.sourceSprintOrderId,
    eventType: 'payment',
    occurredAt: new Date().toISOString(),
    source: 'stripe',
    summary: `A real customer completed payment through the Get Me Live offer${amountTotal ? ` for $${(amountTotal / 100).toFixed(2)}` : ''}.`,
    commitmentReceived: 'payment',
    revenueCents: amountTotal || undefined,
    sourceReference: `get-me-live:${orderId}:stripe:${String(session.id || eventId)}`
  });
  await recordCommercialFunnelEvent(env, "get_me_live_customer_payment", { ownerId: order.ownerId, orderId: order.sourceSprintOrderId, source: "get_me_live", content: orderId }).catch(() => undefined);
  return true;
}
