export type RiskLevel = 'low' | 'medium' | 'high';
export type SignalStrength = 'weak' | 'medium' | 'strong';

export interface VerdictProvenance {
  source: 'ai_verdict_engine';
  provider: string;
  model: string;
  generated_at: string;
  validated: true;
}

export interface RichVerdict {
  verdict_headline: string;
  lit_score: number;
  risk_level: RiskLevel;
  ghost_town_risk: RiskLevel;
  top_reason: string;
  buyer_pain_clarity: SignalStrength;
  willingness_to_pay_signal: SignalStrength;
  distribution_difficulty: RiskLevel;
  unfair_advantage_check: string;
  business_model_weakness: string;
  why_it_might_work: string;
  why_it_might_fail: string;
  killer_question: string;
  mvp_test: string;
  next_step: string;
  warnings: string[];
  provenance: VerdictProvenance;
  source: 'lit_api';
}

export const RICH_VERDICT_FIELDS = [
  'verdict_headline',
  'lit_score',
  'risk_level',
  'ghost_town_risk',
  'top_reason',
  'buyer_pain_clarity',
  'willingness_to_pay_signal',
  'distribution_difficulty',
  'unfair_advantage_check',
  'business_model_weakness',
  'why_it_might_work',
  'why_it_might_fail',
  'killer_question',
  'mvp_test',
  'next_step',
  'warnings',
  'provenance',
  'source'
] as const;

export const RISK_LEVELS = new Set<RiskLevel>(['low', 'medium', 'high']);
export const SIGNAL_STRENGTHS = new Set<SignalStrength>(['weak', 'medium', 'strong']);
