import type { TruthLabel } from './paidTest';

export type BlueprintStatus = 'ready' | 'in_progress' | 'completed' | 'failed_quality_gate';
export type ResearchConfidence = 'high' | 'medium' | 'low' | 'unverified';
export type ActivityLevel = 'recent' | 'active' | 'occasional' | 'uncertain';
export type EvidenceRecency = 'current' | 'recent' | 'stale' | 'unknown';
export type EvidenceDateSource = 'published_metadata' | 'provider_activity' | 'page_activity_text' | 'page_year' | 'unknown';
export type CurrentActivityStatus = 'verified_current' | 'verified_inactive' | 'unverified';
export type BlueprintDecision = 'continue' | 'revise' | 'pivot' | 'stop';
export type ResearchEvidenceRole = 'customer_access' | 'market_evidence' | 'media_pr' | 'partnership';
export type DistributionTargetType =
  | 'podcast'
  | 'youtube_creator'
  | 'newsletter_or_publication'
  | 'event'
  | 'association'
  | 'review_site'
  | 'complementary_partner'
  | 'community';

export interface BlueprintSource {
  sourceId: string;
  title: string;
  url: string;
  publisher?: string;
  accessedAt: string;
  evidenceDate?: string;
  evidenceDateSource?: EvidenceDateSource;
  evidenceRecency?: EvidenceRecency;
  supports: string[];
}

export interface ExecutiveLaunchDecision {
  originalIdea: string;
  verdict: string;
  strongestOpportunity: string;
  biggestRisk: string;
  recommendedInitialCustomer: string;
  validationObjective: string;
  founderTimeRiskHours: number;
  founderCashRiskMaximum: number;
  currency: 'USD';
  continueEvidence: string[];
  stopEvidence: string[];
}

export interface OfferDeliverable {
  name: string;
  description: string;
  timeToValue?: string;
}

export interface OfferAndPricing {
  offerName: string;
  targetCustomer: string;
  painfulProblem: string;
  desiredOutcome: string;
  oneSentencePromise: string;
  deliverables: OfferDeliverable[];
  deliveryMethod: string;
  timeToFirstUsefulResult: string;
  buyerResponsibilities: string[];
  exclusions: string[];
  initialTestPrice: string;
  lowerTestBoundary: string;
  upperTestBoundary: string;
  pricingRationale: string;
  objections: Array<{ objection: string; response: string }>;
  riskReversal: string;
  truthLabel: TruthLabel;
}

export interface PositioningPlan {
  firstTargetCustomer: string;
  triggerEvents: string[];
  currentAlternatives: string[];
  alternativeWeaknesses: string[];
  buyerLanguage: string[];
  actionTriggers: string[];
  rejectionReasons: string[];
  notFor: string[];
  positioningStatement: string;
  differentiator: string;
}

export interface CustomerAccessChannel {
  channelId: string;
  community: string;
  platform: string;
  publicUrl: string;
  relevance: string;
  activity: ActivityLevel;
  participationRules: string;
  recommendedApproach: string;
  usefulTopic: string;
  risk: string;
  firstAction: string;
  confidence: ResearchConfidence;
  researchDate: string;
  evidenceDate?: string;
  evidenceDateSource?: EvidenceDateSource;
  evidenceRecency?: EvidenceRecency;
  currentActivityStatus?: CurrentActivityStatus;
  currentActivityVerifiedAt?: string;
  currentActivityEvidence?: string;
  sourceIds: string[];
  targetType?: DistributionTargetType;
  evidenceRole?: ResearchEvidenceRole;
  evidenceRoleReason?: string;
  discoveredThrough?: 'competitor_backlink' | 'podcast_search' | 'youtube_search' | 'grounded_customer_access_search' | 'customer_seed' | 'original_source';
  competitorEvidence?: string[];
  audienceOwner?: string;
  accessPath?: string;
  preparedAsset?: string;
  outreachScriptId?: string;
}

export interface HelpfulPost {
  postId: string;
  platform: string;
  intendedCommunity: string;
  objective: string;
  title: string;
  body: string;
  closingQuestion: string;
  softCallToAction?: string;
  responseSignals: string[];
  commentResponsePlan: string;
}

export interface OutreachScript {
  scriptId: string;
  relationship: 'warm_contact' | 'former_colleague_or_customer' | 'community_member' | 'linkedin_connection' | 'association_member' | 'referral_partner' | 'interview_invitation' | 'offer_test_invitation' | 'follow_up_no_response' | 'follow_up_interest' | 'follow_up_rejection' | 'referral_request';
  title: string;
  message: string;
  purpose: string;
  useWhen: string;
}

export interface LandingPageCopy {
  metadataTitle: string;
  metadataDescription: string;
  socialDescription: string;
  targetCustomerCallout: string;
  headline: string;
  subheadline: string;
  problemSection: string;
  currentAlternativeSection: string;
  offerDescription: string;
  deliverables: string[];
  howItWorks: Array<{ step: string; description: string }>;
  expectedTimeline: string;
  pricePresentation: string;
  faq: Array<{ question: string; answer: string }>;
  proofPlaceholders: string[];
  riskReversal: string;
  primaryCallToAction: string;
  secondaryCallToAction: string;
  thankYouPageCopy: string;
  confirmationEmailSubject: string;
  confirmationEmailBody: string;
}

export interface LaunchSiteConfig {
  schemaVersion: 'launch-site-config-v1';
  site: {
    businessName: string;
    logoUrl: string | null;
    primaryDomain: string | null;
    contactEmail: string;
    phone: string | null;
    location: string | null;
  };
  offer: {
    offerName: string;
    targetCustomer: string;
    headline: string;
    subheadline: string;
    primaryOutcome: string;
    price: string;
    priceExplanation: string;
    deliveryMethod: string;
    timeToFirstValue: string;
    callToAction: string;
    secondaryCallToAction: string;
  };
  problem: {
    summary: string;
    painPoints: string[];
  };
  solution: {
    summary: string;
    deliverables: string[];
    exclusions: string[];
  };
  positioning: {
    currentAlternatives: string[];
    differentiator: string;
    idealFor: string[];
    notFor: string[];
  };
  proof: {
    status: 'validation-stage';
    claimsAllowed: string[];
    proofPlaceholders: string[];
  };
  riskReversal: {
    type: 'deliverable' | 'conditional';
    text: string;
  };
  faq: Array<{ question: string; answer: string }>;
  leadCapture: {
    mode: 'email' | 'external_link';
    destination: string;
    buttonLabel: string;
  };
  legal: {
    privacyPolicy: boolean;
    termsOfService: boolean;
    refundPolicy: boolean;
    disclaimer: boolean;
  };
}

export interface BlueprintDailyAction {
  dayNumber: number;
  title: string;
  date?: string;
  primaryObjective: string;
  estimatedEffort: 'light' | 'moderate' | 'heavy';
  requiredActions: string[];
  preparedAssets: string[];
  expectedDeliverable: string;
  successMeasurement: string;
  evidenceToRecord: string[];
  completionKey: string;
}

export interface WeeklyMilestone {
  weekNumber: 1 | 2 | 3 | 4;
  objective: string;
  priorities: string[];
  milestone: string;
  successMetrics: string[];
}

export interface BlueprintQualityGate {
  passed: boolean;
  failures: string[];
  warnings: string[];
}

export interface BlueprintGenerationReceipt {
  sourceVerdictId: string;
  generatedAt: string;
  generatorVersion: 'launch-blueprint-v2.0';
  researchStatus: 'complete' | 'partial' | 'not_run';
  researchDate?: string;
  sourceCount: number;
  model?: string;
  promptVersion?: string;
  fallbackStatus: 'ai_enriched' | 'ai_fallback' | 'deterministic_only';
  fallbackReason?: string;
}

export interface GhostTownLaunchBlueprint {
  schemaVersion: 'ghosttown-launch-blueprint-v2';
  blueprintId: string;
  blueprintVersion: '2.0' | '2.1';
  status: BlueprintStatus;
  orderId: string;
  ownerId: string;
  sourceVerdictId: string;
  createdAt: string;
  executiveDecision: ExecutiveLaunchDecision;
  offer: OfferAndPricing;
  positioning: PositioningPlan;
  customerAccessPack: {
    initialCustomerProfile: string;
    buyerTriggerEvents: string[];
    searchPhrases: string[];
    channels: CustomerAccessChannel[];
    publicExpertsAndPartners: Array<{ name: string; role: string; publicUrl: string; relevance: string; sourceIds: string[] }>;
    helpfulPosts: HelpfulPost[];
    outreachScripts: OutreachScript[];
    thirtyDayContactSchedule: Array<{ dayNumber: number; action: string; channelIds: string[] }>;
    responseTrackingColumns: string[];
  };
  landingPageCopy: LandingPageCopy;
  launchSite: LaunchSiteConfig;
  weeklyMilestones: WeeklyMilestone[];
  dailyCalendar: BlueprintDailyAction[];
  finalDecision: {
    options: BlueprintDecision[];
    criteria: Array<{ decision: BlueprintDecision; condition: string; nextAction: string }>;
  };
  sources: BlueprintSource[];
  qualityGate: BlueprintQualityGate;
  generationReceipt: BlueprintGenerationReceipt;
}
