export type GhostTownEvidenceClass = 'market' | 'customer' | 'commercial';
export type GhostTownEvidenceStrength = 'weak' | 'early' | 'moderate' | 'strong';
export type EvidenceScanStatus = 'complete' | 'partial' | 'unavailable';
export type EvidenceScanCategory =
  | 'competition'
  | 'demand'
  | 'access'
  | 'current_alternative'
  | 'customer_consumption'
  | 'commercial_consumption'
  | 'pricing'
  | 'premium_precedent';
export type EvidenceScanProvider = 'dataforseo' | 'podcast_index' | 'youtube_api' | 'founder_input';
export type EvidenceScope = 'external' | 'founder';
export type DirectEvidenceState = 'observed' | 'not_observed' | 'not_collected';

export interface EvidenceRating {
  value: number;
  maximum?: number;
  reviewCount: number;
}

export interface EvidencePrice {
  current?: number;
  regular?: number;
  maximum?: number;
  currency?: string;
  isRange?: boolean;
  displayed?: string;
}

export interface EvidenceScanItem {
  evidenceId: string;
  category: EvidenceScanCategory;
  label: string;
  publicUrl?: string;
  provider: EvidenceScanProvider;
  evidenceClass: GhostTownEvidenceClass;
  evidenceScope?: EvidenceScope;
  strength: GhostTownEvidenceStrength;
  verificationStatus: 'provider_candidate' | 'founder_supplied';
  note: string;
  rating?: EvidenceRating;
  price?: EvidencePrice;
}

export interface EvidenceProviderReceipt {
  provider: Exclude<EvidenceScanProvider, 'founder_input'>;
  status: 'complete' | 'failed' | 'not_configured' | 'rate_limited';
  queryCount: number;
  resultCount: number;
  error?: string;
}

export interface PricingBandSummary {
  currency: string;
  count: number;
  minimum: number;
  median: number;
  maximum: number;
}

export interface DirectEvidenceSummary {
  count: number;
  state: DirectEvidenceState;
  statement: string;
}

export interface GhostTownEvidenceScanV1 {
  schemaVersion: 'ghosttown-evidence-scan-v1';
  modelVersion?: 'seven-layer-v1';
  status: EvidenceScanStatus;
  generatedAt: string;
  fingerprint: string;
  founderSays: {
    customer: string;
    problem: string;
    currentAlternative: string;
    offer: string;
  };
  competition: EvidenceScanItem[];
  demand: EvidenceScanItem[];
  access: EvidenceScanItem[];
  currentAlternatives: EvidenceScanItem[];
  customerConsumption?: EvidenceScanItem[];
  commercialConsumption?: EvidenceScanItem[];
  pricingLandscape?: EvidenceScanItem[];
  premiumPrecedent?: EvidenceScanItem[];
  pricingBands?: PricingBandSummary[];
  directEvidence?: {
    response: DirectEvidenceSummary;
    purchase: DirectEvidenceSummary;
  };
  uncertainty: string[];
  providerReceipts: EvidenceProviderReceipt[];
  evidenceBoundary: {
    market: string;
    customer: string;
    commercial: string;
    pricing?: string;
    direct?: string;
  };
}

export type ObservedEvidenceEventType =
  | 'qualified_click'
  | 'launch_site_lead'
  | 'customer_reply'
  | 'qualified_conversation'
  | 'proposal_request'
  | 'calendar_booking'
  | 'deposit'
  | 'payment'
  | 'referral';

export interface ObservedEvidenceEventInput {
  eventId: string;
  orderId: string;
  eventType: ObservedEvidenceEventType;
  occurredAt: string;
  source: 'launch_site' | 'story_studio' | 'email' | 'calendar' | 'stripe' | 'manual_import';
  contactOrChannel?: string;
  summary: string;
  customerLanguage?: string;
  alternativeMentioned?: string;
  objection?: string;
  commitmentOffered?: string;
  commitmentReceived?: string;
  revenueCents?: number;
  sourceReference?: string;
}

export interface ObservedEvidenceClassification {
  evidenceClass: GhostTownEvidenceClass;
  strength: GhostTownEvidenceStrength;
}
