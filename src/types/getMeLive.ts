import type { WebsiteCreationResult, WebsiteStylePreset, WebsiteTemplateId } from './customWebsite';

export type GetMeLiveIntent = 'interest' | 'buy' | 'decide_later';
export type GetMeLiveStatus =
  | 'pending'
  | 'checkout_created'
  | 'paid'
  | 'configuring'
  | 'preview_ready'
  | 'provider_setup'
  | 'ready_to_publish'
  | 'publishing'
  | 'live'
  | 'failed'
  | 'refunded';

export interface GetMeLiveBrandConfig {
  businessName: string;
  stylePreset: WebsiteStylePreset;
  templateId?: WebsiteTemplateId;
  primaryColor?: string;
  logoUrl?: string;
  imageUrls?: string[];
  logoAssetId?: string;
  imageAssetIds?: string[];
  mainImageAssetId?: string;
}

export interface GetMeLiveLeadMagnet {
  kind: 'asset' | 'legacy';
  title: string;
  assetId?: string;
  url?: string;
}

export interface GetMeLiveOfferConfig {
  intent: GetMeLiveIntent;
  headline?: string;
  offer?: string;
  price?: string;
  ctaLabel?: string;
  leadMagnet?: string | GetMeLiveLeadMagnet;
}
export interface GetMeLiveContactConfig {
  contactEmail: string;
  leadDestinationEmail: string;
  businessEmailLocalPart?: string;
}

export interface GetMeLiveDomainConfig {
  requestedName?: string;
  selectedDomain?: string;
  registrationPrice?: string;
  registrationCurrency?: string;
  registrationConfirmedAt?: string;
  cloudflareAccountId?: string;
  cloudflareZoneId?: string;
  pagesProjectName?: string;
}

export interface GetMeLivePaymentConfig {
  enabled: boolean;
  stripeConnectedAccountId?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export interface GetMeLiveConfiguration {
  schemaVersion: 'get-me-live-config-v1';
  brand: GetMeLiveBrandConfig;
  offer: GetMeLiveOfferConfig;
  contact: GetMeLiveContactConfig;
  domain: GetMeLiveDomainConfig;
  payments: GetMeLivePaymentConfig;
}
export interface GetMeLiveProviderState {
  cloudflareConnected: boolean;
  cloudflareScopes?: string[];
  stripeConnected: boolean;
  businessEmailVerified: boolean;
  domainReady: boolean;
}

export interface GetMeLiveDeploymentReceipt {
  deploymentId: string;
  buildId: string;
  /** Stable customer Pages URL (`pagesUrl`). Legacy receipts may hold a deployment hash URL. */
  publicUrl: string;
  /** Immutable per-deployment URL. Evidence only; never a customer address. */
  deploymentUrl?: string;
  customDomain?: string;
  publishedAt: string;
}

export interface GetMeLiveHosting {
  schemaVersion: 'get-me-live-hosting-v1';
  cloudflareAccountId: string;
  pagesProjectName: string;
  /** Provider-returned host, e.g. "joes-dog-walking.pages.dev". */
  pagesSubdomain: string;
  /** https://<pagesSubdomain> */
  pagesUrl: string;
  lastReleaseFailure?: { releaseId: string; message: string; at: string };
  source: 'provider' | 'derived_from_legacy';
}

export interface GetMeLiveCustomDomain {
  schemaVersion: 'get-me-live-custom-domain-v1';
  version: number;
  name: string;
  hosts: string[];
  zoneId: string;
  status: 'connecting' | 'active' | 'failed';
  step: 'attach_requested' | 'attached' | 'provider_active' | 'republish_deployed' | 'verified';
  addedAt: string;
  activatedAt?: string;
  lastProviderStatus?: string;
  lastError?: string;
  legacy?: boolean;
}

export interface GetMeLiveReleaseReceipt {
  schemaVersion: 'ghosttown-get-me-live-release-receipt-v1';
  orderId: string;
  sourceSprintOrderId: string;
  sourceBlueprintId?: string;
  offerId: 'ghosttown_get_me_live_v1';
  offerVersion: '1.0';
  provider: 'cloudflare_pages';
  pagesProjectName: string;
  deploymentId: string;
  buildId: string;
  liveUrl: string;
  customDomain?: string;
  publishedAt: string;
  checkedAt: string;
  checks: {
    durableDeploymentRecorded: boolean;
    customerPageReachable: boolean;
    customerPageHttpStatus?: number;
    leadCaptureConfigured: boolean;
    activityTrackingConfigured: boolean;
    cloudflareConnected: boolean;
    paymentMode: 'interest' | 'connected_checkout' | 'lead_until_stripe_ready';
  };
}

export interface GetMeLiveOrder {
  orderId: string;
  ownerId: string;
  sourceSprintOrderId: string;
  sourceBlueprintId?: string;
  offerId: 'ghosttown_get_me_live_v1';
  offerVersion: '1.0';
  stripePriceId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  status: GetMeLiveStatus;
  configuration?: GetMeLiveConfiguration;
  providerState: GetMeLiveProviderState;
  preview?: WebsiteCreationResult;
  /** Mirrors `hosting.pagesUrl` once hosting is recorded. */
  publicUrl?: string;
  /** `custom_domain` column: the custom domain name, non-null only while it is active. */
  customDomain?: string;
  deploymentReceipt?: GetMeLiveDeploymentReceipt;
  hosting?: GetMeLiveHosting;
  /** `custom_domain_json`: the optional post-launch custom domain record. */
  customDomainState?: GetMeLiveCustomDomain;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  publishedAt?: string;
  failure?: string;
}

export interface GetMeLiveDomainCandidate {
  name: string;
  registrable: boolean;
  tier?: string;
  registrationCost?: string;
  renewalCost?: string;
  currency?: string;
  reason?: string;
}

export type GetMeLiveAssetKind = 'logo' | 'photo' | 'lead_magnet' | 'social_image';

export interface GetMeLiveAsset {
  assetId: string;
  orderId: string;
  kind: GetMeLiveAssetKind;
  filename: string;
  contentType: string;
  byteSize: number;
  position: number;
  isMain: boolean;
  generated: boolean;
  publishedPath?: string;
  createdAt: string;
  updatedAt: string;
}

export type GetMeLiveShareDraftType = 'sprint' | 'launch' | 'milestone_lead' | 'milestone_sale';

export interface GetMeLiveShareDraft {
  draftId: string;
  ownerId: string;
  sourceSprintOrderId: string;
  getMeLiveOrderId?: string;
  draftType: GetMeLiveShareDraftType;
  position: number;
  generatedText: string;
  editedText: string;
  createdAt: string;
  approvedAt?: string;
  sharedAt?: string;
}
