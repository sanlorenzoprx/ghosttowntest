import type {
  BlueprintDailyAction,
  BlueprintGenerationReceipt,
  BlueprintQualityGate,
  GhostTownLaunchBlueprint,
  TruthLabel
} from './launchBlueprint';

export type BusinessModelExecutionLane =
  | 'service_or_consulting'
  | 'saas'
  | 'digital_product'
  | 'physical_product'
  | 'marketplace'
  | 'local_business'
  | 'creator_or_media';

export type EvidenceStrength = 'strong' | 'moderate' | 'early' | 'weak';

export interface BlueprintEvidenceStatement {
  statement: string;
  truthLabel: TruthLabel;
  source: 'customer_input' | 'ghosttown_verdict' | 'provider_research' | 'system_inference' | 'missing_input';
}

export interface StartingStateAudit {
  currentStage: BlueprintEvidenceStatement;
  existingOffer: BlueprintEvidenceStatement;
  existingLandingPage: BlueprintEvidenceStatement;
  previousOutreach: BlueprintEvidenceStatement;
  existingCustomersAudienceOrPartners: BlueprintEvidenceStatement;
  existingSkillsAndAssets: BlueprintEvidenceStatement[];
  founderConstraints: {
    hoursPerWeek: BlueprintEvidenceStatement;
    testBudget: BlueprintEvidenceStatement;
    geography: BlueprintEvidenceStatement;
    language: BlueprintEvidenceStatement;
    technicalCapability: BlueprintEvidenceStatement;
  };
  manualFulfillmentReadiness: BlueprintEvidenceStatement;
  priorSignals: BlueprintEvidenceStatement[];
  priorNoSignals: BlueprintEvidenceStatement[];
  verifiedFacts: BlueprintEvidenceStatement[];
  inferences: BlueprintEvidenceStatement[];
  criticalTests: Array<{
    assumptionId: string;
    assumption: string;
    failureConsequence: string;
    evidenceRequired: string;
  }>;
}

export interface BusinessModelLane {
  lane: BusinessModelExecutionLane;
  rationale: string;
  firstMeaningfulTest: string;
  earliestCommercialAskDay: number;
  intentionallyDeferred: string[];
}

export interface FirstRevenuePath {
  firstOfferFormat: string;
  firstBuyer: string;
  firstChannel: string;
  firstAsk: string;
  firstPrice: string;
  requiredProof: string[];
  commitmentMethod: string;
  targetDay: number;
  minimumQualifiedAsks: number;
  followUpSequence: string[];
  successThreshold: string;
}

export interface ManualFulfillmentPlan {
  onboardingSteps: string[];
  customerInputs: string[];
  founderWork: string[];
  expectedDeliveryTime: string;
  toolsRequired: string[];
  customerCommunicationPoints: string[];
  successfulDeliveryDefinition: string;
  qualityChecklist: string[];
  capacityPerWeek: number;
  estimatedVariableCost: string;
  estimatedFounderHours: string;
  grossMarginGuardrail: string;
  intentionallyManual: string[];
}

export interface LaunchCard48Hour {
  firstCustomer: string;
  firstOffer: string;
  firstThreeApproaches: Array<{
    name: string;
    channelId: string;
    publicUrl: string;
    firstAction: string;
  }>;
  exactFirstMessage: string;
  firstCommitmentRequest: string;
  launchSitePreviewReady: boolean;
  completionDeadlineHours: 48;
}

export interface EvidenceHierarchy {
  strong: string[];
  moderate: string[];
  early: string[];
  weak: string[];
  rankingRule: string;
}

export interface AdaptiveCheckpoint {
  checkpointId: 'day-7' | 'day-14' | 'day-21' | 'day-30';
  dayNumber: 7 | 14 | 21 | 30;
  title: string;
  questions: string[];
  evidenceRequired: string[];
  branches: Array<{
    condition: string;
    action: string;
  }>;
}

export interface CustomerInterviewGuide {
  opening: string;
  problemHistoryQuestions: string[];
  lastOccurrenceQuestions: string[];
  currentWorkaroundQuestions: string[];
  costAndConsequenceQuestions: string[];
  buyingProcessQuestions: string[];
  existingSpendingQuestions: string[];
  switchingFrictionQuestions: string[];
  closingAndReferralQuestions: string[];
}

export interface OfferConversationGuide {
  opening: string;
  problemConfirmation: string[];
  offerExplanation: string;
  scopeConfirmation: string[];
  pricePresentation: string;
  objectionCapture: string[];
  commitmentRequest: string;
  followUpAgreement: string;
}

export interface FoundingCustomerPilotBrief {
  problem: string;
  scope: string;
  deliverables: string[];
  timeline: string;
  price: string;
  buyerResponsibilities: string[];
  proofBoundary: string;
  nextStep: string;
}

export interface BlueprintDailyActionV21 extends BlueprintDailyAction {
  whyItMatters: string;
  estimatedMinutes: number;
  ifThenBranches: Array<{
    condition: string;
    action: string;
  }>;
}

export interface CanonicalContractReceipt {
  version: '2.1.0';
  gitBlobSha1: 'a6dd1fa9e8f59417b7ce00b032eabf3793537abd';
  sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md';
  changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_CHANGE_RECORD.md';
  evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json';
  verifiedAt: string;
}

export type BlueprintGenerationReceiptV21 = BlueprintGenerationReceipt & {
  canonicalContract: CanonicalContractReceipt;
};

export type GhostTownLaunchBlueprintV21 = Omit<
  GhostTownLaunchBlueprint,
  'dailyCalendar' | 'generationReceipt' | 'qualityGate'
> & {
  contractVersion: '2.1.0';
  startingStateAudit: StartingStateAudit;
  businessModelLane: BusinessModelLane;
  firstRevenuePath: FirstRevenuePath;
  manualFulfillmentPlan: ManualFulfillmentPlan;
  launchCard48Hour: LaunchCard48Hour;
  evidenceHierarchy: EvidenceHierarchy;
  adaptiveCheckpoints: AdaptiveCheckpoint[];
  customerInterviewGuide: CustomerInterviewGuide;
  offerConversationGuide: OfferConversationGuide;
  foundingCustomerPilotBrief: FoundingCustomerPilotBrief;
  dailyCalendar: BlueprintDailyActionV21[];
  generationReceipt: BlueprintGenerationReceiptV21;
  qualityGate: BlueprintQualityGate;
};
