import type { RichVerdict, RiskLevel } from './verdictSchema';

export interface IdeaInput {
  name: string;
  description: string;
  target_user?: string;
  market?: string;
  pain?: string;
  current_alternative?: string;
  price_point?: string;
  distribution_channel?: string;
}

export interface VerdictSignals {
  lit_score: number;
  risk_level: RiskLevel;
  top_reason: string;
  next_step: string;
  pain_score: number;
  reachability_score: number;
  willingness_to_pay_score: number;
  advantage_score: number;
}

export interface VerdictProvider {
  readonly name: string;
  readonly model: string;
  generateVerdict(input: IdeaInput, signals: VerdictSignals): Promise<unknown>;
}

export type ValidatedVerdictProvider = VerdictProvider & {
  generateVerdict(input: IdeaInput, signals: VerdictSignals): Promise<RichVerdict>;
};
