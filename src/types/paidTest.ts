import type { EvaluationResult } from './lit';
import type { GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import type { PrePurchaseResearchSignals } from './researchSignals';
import type { CommercialAttributionEnvelope } from './commercialAttribution';

export type TruthLabel = 'Verified' | 'Inferred' | 'Test';
export type PaidTestOrderStatus = 'pending' | 'checkout_created' | 'paid' | 'awaiting_seeds' | 'researching' | 'generating' | 'uncertainty' | 'ready' | 'failed' | 'refunded';
export type StripeMode = 'test' | 'live';
export type PaidArtifactType = 'legacy_report_v1' | 'execution_plan_30day_v1' | 'launch_blueprint_v2';
export type PaidPlanOfferId = typeof GHOSTTOWN_30_DAY_PLAN_V1.offerId;
export type CompetitorSeedRelationship = 'direct_competitor' | 'adjacent_product' | 'current_alternative';
export type CompetitorSeedOrigin = 'customer_confirmed' | 'ghosttown_suggestion' | 'checkout_intake';

export interface CompetitorSeed {
  seedId: string;
  name: string;
  website: string;
  domain: string;
  relationship: CompetitorSeedRelationship;
  origin: CompetitorSeedOrigin;
  reason?: string;
  verifiedAt: string;
}

export interface CompetitorSeedSuggestion {
  suggestionId: string;
  name: string;
  website: string;
  relationship: CompetitorSeedRelationship;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  verified: boolean;
}

export interface StrategicUncertaintyResolution {
  answeredAt: string;
  answers: Record<string, string>;
}

export type StrategicUncertaintyLink =
  | 'customer'
  | 'problem'
  | 'buyer_payer'
  | 'current_alternative'
  | 'test'
  | 'commitment'
  | 'fulfillment'
  | 'access_path';

export interface StrategicClarificationResponse {
  questionId: string;
  link: StrategicUncertaintyLink;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface StrategicUncertaintyQuestion {
  questionId: string;
  link: StrategicUncertaintyLink;
  question: string;
  whyItMatters: string;
  requiredEvidence: string;
  answer?: string;
}

export interface StrategicUncertaintySprint {
  schemaVersion: 'strategic-uncertainty-sprint-v1';
  orderId: string;
  sourceVerdictId: string;
  createdAt: string;
  horizonDays: 3;
  status: 'open' | 'submitted';
  chainSummary: string;
  unresolvedLinks: StrategicUncertaintyLink[];
  blockers: Array<{
    code: string;
    link: StrategicUncertaintyLink;
    message: string;
    requiredEvidence: string;
  }>;
  questions: StrategicUncertaintyQuestion[];
  unlockCondition: string;
  submittedAt?: string;
}

export interface PaidTestIntake {
  verdictId: string;
  targetBuyer: string;
  geography?: string;
  problem: string;
  currentWorkaround: string;
  offerHypothesis?: string;
  expectedPrice?: string;
  currentStage?: string;
  competitorLinks?: string[];
  competitorSeeds?: CompetitorSeed[];
  landingPageLink?: string;
  customerNotes?: string;
  strategicClarifications?: StrategicClarificationResponse[];
  researchSignals?: PrePurchaseResearchSignals;
  uncertaintyResolution?: StrategicUncertaintyResolution;
  /** Transport-only checkout lineage; the Worker moves this onto PaidTestOrder. */
  attribution?: CommercialAttributionEnvelope;
}

export interface PendingPaidPlanOrder {
  orderId: string;
  ownerId: string;
  sourceVerdictId: string;
  offerId: PaidPlanOfferId;
  offerVersion: '1.0';
  planVersion: '1.0';
  stripePriceId: string;
  stripeMode: StripeMode;
  checkoutSessionId?: string;
  idempotencyKey: string;
  status: Exclude<PaidTestOrderStatus, 'refunded'>;
  createdAt: string;
  updatedAt: string;
}

export interface PaidTestOrder {
  orderId: string;
  email: string;
  verdictId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  stripeMode?: StripeMode;
  stripeEventId?: string;
  status: PaidTestOrderStatus;
  artifactType?: PaidArtifactType;
  offerId?: PaidPlanOfferId;
  offerVersion?: '1.0';
  planVersion?: '1.0' | '2.0';
  idempotencyKey?: string;
  reportVersion?: '1.0';
  intake: PaidTestIntake;
  /** Commercial lineage is persisted beside, not inside, canonical Blueprint inputs. */
  commercialAttribution?: CommercialAttributionEnvelope;
  competitorSeedSuggestions?: CompetitorSeedSuggestion[];
  competitorSeedSuggestionsGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  fulfillmentError?: string;
  fulfillmentWorkflowId?: string;
  fulfillmentAttemptCount?: number;
  uncertaintySprint?: StrategicUncertaintySprint;
}

export interface ReportClaim {
  label: TruthLabel;
  text: string;
}

export interface PaidTestReport {
  reportId: string;
  orderId: string;
  reportVersion: '1.0';
  createdAt: string;
  verdict: Pick<EvaluationResult, 'resultId' | 'idea' | 'deterministicScores' | 'generatedAt'>;
  sections: Array<{ title: string; claims: ReportClaim[] }>;
  qualityGate: { passed: boolean; failures: string[] };
  generationReceipt: { sourceVerdictId: string; generatedAt: string; reportVersion: '1.0' };
}

export interface TruthLabeledClaim {
  label: TruthLabel;
  text: string;
}

export interface ActionItem {
  actionId: string;
  description: string;
  quantity: string;
  truthLabel: TruthLabel;
}

export interface EvidenceRequirement {
  evidenceId: string;
  description: string;
  minimumQuantity: string;
  truthLabel: TruthLabel;
}

export interface PlanPhase {
  phaseId: string;
  title: string;
  dayStart: number;
  dayEnd: number;
  objective: string;
}

export interface WeeklyCheckpoint {
  checkpointId: string;
  dayNumber: number;
  title: string;
  questions: string[];
  passSignal: string;
  failSignal: string;
}

export interface DecisionRule {
  ruleId: string;
  outcome: 'continue' | 'pivot' | 'pause' | 'stop';
  condition: string;
  nextAction: string;
}

export interface PlanGenerationReceipt {
  sourceVerdictId: string;
  generatedAt: string;
  generatorVersion: 'deterministic-30day-v1.0';
  inputHash: string;
  outputHash: string;
  fallbackStatus: 'deterministic_only' | 'ai_enriched' | 'ai_fallback';
  fallbackReason?: string;
  model?: string;
  promptVersion?: string;
}

export interface PlanQualityGate {
  passed: boolean;
  failures: string[];
}

export interface DayTask {
  dayNumber: number;
  phaseId: string;
  title: string;
  objective: string;
  whyItMatters: string;
  actions: ActionItem[];
  timeBudgetMinutes: number;
  cashBudget: {
    currency: 'USD';
    maximumAmount: number;
  };
  requiredEvidence: EvidenceRequirement[];
  passThreshold: string;
  failThreshold: string;
  expectedArtifacts: string[];
  risksAndWarnings: TruthLabeledClaim[];
  nextRouteOnPass: string;
  nextRouteOnFail: string;
}

export interface ExecutionPlan30Day {
  schemaVersion: 'execution-plan-30day-v1';
  planId: string;
  planVersion: '1.0';
  offerId: PaidPlanOfferId;
  sourceVerdictId: string;
  orderId: string;
  ownerId: string;
  createdAt: string;
  idea: {
    name: string;
    description: string;
    targetBuyer: string;
    problem: string;
    currentWorkaround: string;
    offerHypothesis: string;
    priceHypothesis: string;
  };
  assumptions: TruthLabeledClaim[];
  limitations: TruthLabeledClaim[];
  phases: PlanPhase[];
  days: DayTask[];
  weeklyCheckpoints: WeeklyCheckpoint[];
  decisionRules: DecisionRule[];
  generationReceipt: PlanGenerationReceipt;
  qualityGate: PlanQualityGate;
}
