export type ResearchSignalType = 'commercial' | 'audience' | 'ecosystem';
export type ResearchSignalVerificationStatus = 'unverified' | 'provider_candidate' | 'verified';

export interface ResearchSignalSelection {
  type: ResearchSignalType;
  value: string;
  source: 'user_typed' | 'suggestion' | 'not_sure';
  candidateId?: string;
  publicUrl?: string;
  verificationStatus: ResearchSignalVerificationStatus;
  selectedAt: string;
}

export interface PrePurchaseResearchSignals {
  schemaVersion: 'pre-purchase-research-signals-v1';
  resultId: string;
  targetCustomer: string;
  commercial?: ResearchSignalSelection;
  audience?: ResearchSignalSelection;
  ecosystem?: ResearchSignalSelection;
  origin: 'free_verdict';
  verificationStatus: ResearchSignalVerificationStatus;
  updatedAt: string;
}

export interface ResearchPreviewRequest {
  resultId: string;
  ideaSummary: string;
  signalType: ResearchSignalType;
  typedSeed?: string;
  locale?: 'en' | 'es';
}

export interface ResearchPreviewSuggestion {
  candidateId: string;
  label: string;
  publicUrl: string;
  provider: 'dataforseo' | 'podcast_index' | 'youtube_api';
  verificationStatus: 'provider_candidate';
}

export interface ResearchPreviewResponse {
  suggestions: ResearchPreviewSuggestion[];
  insight: string;
  warning?: string;
}
