// ============ ENUMS ============
export type BusinessDnaType =
  | 'service'
  | 'physical_product'
  | 'digital_product'
  | 'marketplace'
  | 'media'
  | 'capital'
  | 'asset';

export type FinalVerdict =
  | 'build_now'
  | 'test_first'
  | 'niche_down'
  | 'change_business_dna'
  | 'kill_it_before_it_kills_years';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ScoreBand = 'weak' | 'unclear' | 'promising' | 'strong';

// ============ IDEA INTAKE ============
export interface IdeaIntake {
  ideaName: string;
  description: string;
  targetUser: string;
  painfulProblem: string;
  currentAlternative: string;
  motivation: string;
  publicContentAcknowledged?: boolean;
}

// ============ QUESTIONS ============
export interface QuestionOption {
  label: string;
  value: number;
  helper?: string;
}

export interface EvaluationQuestion {
  id: string;
  category:
    | 'ghost_town'
    | 'passion_graveyard'
    | 'leverage'
    | 'insight'
    | 'timing'
    | 'business_dna'
    | 'high_walls';
  question: string;
  helper?: string;
  options: QuestionOption[];
}

// ============ ANSWERS ============
export interface EvaluationAnswers {
  [questionId: string]: number | string;
}

// ============ AI ANALYSIS (Step 1) ============
export interface IdeaAnalysis {
  market_need: string;
  unfair_advantage: string;
  timing_readiness: string;
  founder_conviction: string;
  competitive_landscape: string;
  red_flags: string[];
}

// ============ SCORES (Step 2) ============
export interface ScoreDetail {
  score: number;
  reasoning: string;
}

export interface IdeaScores {
  ghost_town_risk: ScoreDetail;
  leverage_score: ScoreDetail;
  insight_score: ScoreDetail;
  timing_score: ScoreDetail;
  passion_risk_score: ScoreDetail;
  business_dna: BusinessDnaType;
  dna_reasoning: string;
}

// ============ VERDICT (Step 3) ============
export interface VerdictData {
  verdict: FinalVerdict;
  verdict_headline: string;
  one_sentence_advice: string;
  biggest_trap: string;
  do_not_build_until: string;
  recommended_next_test: string;
  confidence: number;
}

// ============ COMPLETE RESULT ============
export interface PublicVideoResult {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  public: true;
  origin: 'user_submission';
  reused: boolean;
  status_url: string;
  video_url: string | null;
  distribution_status: 'pending' | 'eligible';
}

export interface EvaluationResult {
  resultId: string;
  idea: IdeaIntake;
  answers: EvaluationAnswers;

  // AI Analysis (if using hybrid)
  analysis?: IdeaAnalysis;
  scores?: IdeaScores;
  verdict?: VerdictData;

  // Deterministic fallback (always present)
  deterministicScores: {
    ghostTownScore: number;
    ghostTownRisk: RiskLevel;
    leverageScore: number;
    insightScore: number;
    timingScore: number;
    litScore: number;
    litBand: ScoreBand;
    highWallsScore: number;
    highWallsBand: ScoreBand;
    businessDnaType: BusinessDnaType;
    businessDnaTrap: string;
    businessDnaWinStrategy: string;
    finalVerdict: FinalVerdict;
    verdictHeadline: string;
    verdictExplanation: string;
    recommendedNextTest: string;
    doNotBuildUntil: string;
    oneSentenceAdvice: string;
  };

  // Canonical customer-facing decision. Older records are hydrated at read time
  // so existing saved verdicts remain compatible.
  verdictDecisionV2?: import('../verdict/verdictDecisionV2').VerdictDecisionV2;
  // Evidence-aware decision. V2 remains present for backward compatibility.
  verdictDecisionV3?: import('../verdict/verdictDecisionV3').VerdictDecisionV3;
  evidenceScan?: import('./evidence').GhostTownEvidenceScanV1;

  // Metadata
  usedAI: boolean;
  generatedAt: string;
  cacheHit: boolean;
  video?: PublicVideoResult;
}

// ============ BUSINESS DNA ============
export interface BusinessDnaTrap {
  dna: BusinessDnaType;
  trap: string;
  winStrategy: string;
}

// ============ EXAMPLE IDEA ============
export interface ExampleIdea extends IdeaIntake {
  expectedVerdict: FinalVerdict;
  expectedDna: BusinessDnaType;
  explanation: string;
}
