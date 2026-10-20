// Customer problems GhostTown reads from the public communities that
// customer-access research already found. Every quote is copied exactly from
// the page it links to. Public discussion shows a possible problem; it never
// shows that anyone will buy.

export const COMMUNITY_PROBLEM_RESEARCH_VERSION = 'ghosttown-community-problem-research-v1' as const;

export type CommunityObservationKind = 'complaint' | 'question' | 'objection' | 'workaround' | 'alternative';
export type CommunityProblemCategory = 'functional' | 'emotional' | 'price';
export type CommunityObservationStance = 'supports' | 'contradicts';
export type CommunityProblemStrength = 'one_mention' | 'repeated_in_one_place' | 'seen_in_several_places';
export type CommunityPromotionRule = 'allowed' | 'limited' | 'not_allowed' | 'unclear';

export interface CommunityObservation {
  observationId: string;
  problemId: string;
  stance: CommunityObservationStance;
  channelId: string;
  community: string;
  url: string;
  quote: string;
  kind: CommunityObservationKind;
}

export interface CommunityProblem {
  problemId: string;
  title: string;
  category: CommunityProblemCategory;
  who: string;
  when: string;
  currentWorkaround: string;
  observationIds: string[];
  contradictingObservationIds: string[];
  channelIds: string[];
  strength: CommunityProblemStrength;
  whatToAskNext: string;
  whatWouldChangePlan: string;
  // Public discussion is problem evidence at most; commitments and payments
  // are recorded separately during the Sprint.
  evidenceLevel: 'problem_evidence';
}

export interface CommunityStyle {
  channelId: string;
  community: string;
  url: string;
  howPeopleTalk: string;
  formatThatFits: string;
  promotionRule: CommunityPromotionRule;
  promotionEvidence: string;
}

export interface CommunityResearchGap {
  channelId: string;
  community: string;
  url: string;
  reason: string;
}

export interface CommunityProblemResearchReceipt {
  model: string;
  promptHash: string;
  responseHash: string;
  completedAt: string;
  pagesRead: number;
  quotesReturned: number;
  quotesKept: number;
  quotesRejected: number;
}

export interface CommunityProblemResearch {
  version: typeof COMMUNITY_PROBLEM_RESEARCH_VERSION;
  researchedAt: string;
  // complete: every selected community was read and problems were found.
  // partial: problems were found but some communities could not be read.
  // unavailable: no source-linked problem could be kept.
  status: 'complete' | 'partial' | 'unavailable';
  problems: CommunityProblem[];
  observations: CommunityObservation[];
  styles: CommunityStyle[];
  gaps: CommunityResearchGap[];
  boundary: string;
  receipt?: CommunityProblemResearchReceipt;
}
