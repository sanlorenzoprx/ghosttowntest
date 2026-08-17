import type {
  BlueprintDailyAction,
  BlueprintGenerationReceipt,
  BlueprintQualityGate,
  GhostTownLaunchBlueprint
} from './launchBlueprint';
import type { TruthLabel } from './paidTest';

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
  /** Q2 keeps legacy calendar fields as deterministic projections of this packet. */
  executionPacket?: DailyExecutionPacket;
}

export type ExecutionTargetKind = 'verified_channel' | 'qualified_buyer_batch' | 'existing_contact' | 'launch_site' | 'offer' | 'evidence_set' | 'fulfillment_run';
export interface ExecutionTarget {
  targetId: string;
  kind: ExecutionTargetKind;
  name: string;
  identityStatus: 'verified_public' | 'founder_supplied' | 'founder_must_select' | 'canonical_internal';
  selectionOrQualificationRule: string;
  minimumCount: number;
  excluded: string[];
  channelId?: string;
  publicUrl?: string;
  sourceIds: string[];
}

export interface AssetLineage {
  blueprintId: string;
  blueprintVersion: string;
  sourceVerdictId: string;
  sourceIds: string[];
  sourceAssetIds: string[];
  parentAssetId?: string;
}

export interface DeliverableAsset {
  assetId: string;
  dayNumber: number;
  type: string;
  title: string;
  finishedContent: string;
  contentType: 'text/markdown' | 'text/plain' | 'text/csv';
  personalizationFields: Array<{ name: string; description: string; required: boolean }>;
  usageInstructions: string;
  targetChannel?: string;
  targetIds: string[];
  capabilities: { copyReady: boolean; editable: boolean; downloadable: boolean; openable: boolean };
  evidenceExpected: string[];
  version: string;
  lineage: AssetLineage;
}

export interface ExecutionAction {
  actionId: string;
  sequence: number;
  instruction: string;
  quantity: string;
  targetIds: string[];
  assetIds: string[];
  evidenceExpected: string[];
}

export interface BranchRule {
  branchId: string;
  condition: string;
  action: string;
  route: 'continue' | 'revise' | 'pivot' | 'pause' | 'stop';
  targetDay?: number;
  evidenceRequired: string[];
}

export interface DailyExecutionPacket {
  dayNumber: number;
  title: string;
  objective: string;
  whyThisDayExists: string;
  targets: ExecutionTarget[];
  actions: ExecutionAction[];
  assets: DeliverableAsset[];
  expectedOutcome: string;
  successThreshold: string;
  failureThreshold: string;
  evidenceToCapture: string[];
  branchRules: BranchRule[];
  estimatedMinutes: number;
  completionDefinition: string;
  nonAssetJustification?: string;
}

export interface CanonicalContractReceipt {
  version: '2.1.1';
  gitBlobSha1: '616c691e6b4c9cea93615963a07375d13ffba57f';
  sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md';
  changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md';
  evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json';
  verifiedAt: string;
}

/**
 * Safe, non-secret receipt returned by the structured Vertex transport. Prompt and
 * response bodies are deliberately excluded; only their hashes and public model
 * metadata may cross into the canonical generation evidence.
 */
export interface VertexStructuredStageReceipt {
  stage: string;
  model: string;
  modelVersion?: string;
  responseId?: string;
  promptHash: string;
  responseHash: string;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  completedAt: string;
}

export interface BlueprintVertexStageReceipt extends VertexStructuredStageReceipt {
  stage: 'evidence_normalization' | 'strategy_synthesis' | 'asset_generation' | 'red_team_review';
}

export interface BlueprintVertexRedTeamFinding {
  code: string;
  severity: 'warning' | 'blocking';
  field: string;
  message: string;
}

export interface BlueprintVertexPipelineReceipt {
  pipelineVersion: 'vertex-blueprint-staged-v1';
  required: boolean;
  status: 'complete' | 'skipped';
  stages: BlueprintVertexStageReceipt[];
  redTeam: {
    passed: boolean;
    findings: BlueprintVertexRedTeamFinding[];
  };
  completedAt: string;
  skippedReason?: string;
}

export interface BlueprintGenerationVertexReceipt {
  required: boolean;
  projectId: string;
  location: string;
  configuredModel: string;
  stages: VertexStructuredStageReceipt[];
}

export interface BlueprintGenerationHashesReceipt {
  normalizedInputSha256: string;
  canonicalBlueprintSha256: string;
  pdfSha256: string;
  zipSha256: string;
}

export interface BlueprintGenerationQualityReceipt {
  deterministicGatePassed: boolean;
  v21GatePassed: boolean;
  redTeamPassed: boolean;
  sourceVerificationPassed: boolean;
  candidateIdValidationPassed: boolean;
}

export interface BlueprintGenerationArtifactKeysReceipt {
  pdf: string;
  json: string;
  zip: string;
}

export interface BlueprintGenerationEvidenceReceipt {
  vertex: BlueprintGenerationVertexReceipt;
  hashes: BlueprintGenerationHashesReceipt;
  quality: BlueprintGenerationQualityReceipt;
  artifactKeys: BlueprintGenerationArtifactKeysReceipt;
}

export type BlueprintGenerationReceiptV21 = BlueprintGenerationReceipt & {
  canonicalContract: CanonicalContractReceipt;
  vertexPipeline?: BlueprintVertexPipelineReceipt;
  /**
   * Step 3 fields are populated before persistence. Exact artifact hashes are
   * persisted in the detached integrity receipt because a file cannot contain
   * its own SHA-256 without creating a recursive self-hash. Account responses
   * overlay those exact values without mutating the stored canonical bytes.
   */
  vertex?: BlueprintGenerationVertexReceipt;
  hashes?: BlueprintGenerationHashesReceipt;
  quality?: BlueprintGenerationQualityReceipt;
  artifactKeys?: BlueprintGenerationArtifactKeysReceipt;
};

export type GhostTownLaunchBlueprintV21 = Omit<
  GhostTownLaunchBlueprint,
  'blueprintVersion' | 'dailyCalendar' | 'generationReceipt' | 'qualityGate'
> & {
  blueprintVersion: '2.1';
  contractVersion: '2.1.1';
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
  dailyExecutionContractVersion?: 'daily-execution-packet-v1';
  dailyCalendar: BlueprintDailyActionV21[];
  generationReceipt: BlueprintGenerationReceiptV21;
  qualityGate: BlueprintQualityGate;
};
