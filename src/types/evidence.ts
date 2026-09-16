export type GhostTownEvidenceClass = 'market' | 'customer' | 'commercial';
export type GhostTownEvidenceStrength = 'weak' | 'early' | 'moderate' | 'strong';
export type EvidenceScanStatus = 'complete' | 'partial' | 'unavailable';
export type EvidenceScanCategory = 'competition' | 'demand' | 'access' | 'current_alternative';
export type EvidenceScanProvider = 'dataforseo' | 'podcast_index' | 'youtube_api' | 'founder_input';

export interface EvidenceScanItem {
  evidenceId: string;
  category: EvidenceScanCategory;
  label: string;
  publicUrl?: string;
  provider: EvidenceScanProvider;
  evidenceClass: 'market';
  strength: 'weak';
  verificationStatus: 'provider_candidate' | 'founder_supplied';
  note: string;
}

export interface EvidenceProviderReceipt {
  provider: Exclude<EvidenceScanProvider, 'founder_input'>;
  status: 'complete' | 'failed' | 'not_configured' | 'rate_limited';
  queryCount: number;
  resultCount: number;
  error?: string;
}
export interface GhostTownEvidenceScanV1 {
  schemaVersion: 'ghosttown-evidence-scan-v1';
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
  uncertainty: string[];
  providerReceipts: EvidenceProviderReceipt[];
  evidenceBoundary: {
    market: string;
    customer: string;
    commercial: string;
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
