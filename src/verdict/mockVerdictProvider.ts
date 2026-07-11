import type { IdeaInput, VerdictProvider, VerdictSignals } from './aiVerdictProvider';
import type { RichVerdict, SignalStrength } from './verdictSchema';

const MOCK_MODEL = 'mock-lit-verdict-v1';

function strength(score: number): SignalStrength {
  if (score >= 14) return 'strong';
  if (score >= 7) return 'medium';
  return 'weak';
}

function clean(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

function fragment(value: string): string {
  return value.replace(/[.!?]+$/, '');
}

export class MockVerdictProvider implements VerdictProvider {
  readonly name = 'mock';
  readonly model = MOCK_MODEL;

  constructor(private readonly generatedAt = '2026-01-01T00:00:00.000Z') {}

  async generateVerdict(input: IdeaInput, signals: VerdictSignals): Promise<RichVerdict> {
    const target = clean(input.target_user, 'the first narrow buyer segment');
    const description = fragment(clean(input.description, input.name));
    const pain = clean(input.pain, `the stated problem behind ${input.name}`);
    const currentAlternative = clean(input.current_alternative, 'the buyer\'s current workaround');
    const channel = clean(input.distribution_channel, `a direct list of ${target}`);

    return {
      verdict_headline: signals.lit_score >= 70
        ? 'Promising, but distribution is the real test.'
        : 'Demand proof must come before product work.',
      lit_score: signals.lit_score,
      risk_level: signals.risk_level,
      ghost_town_risk: signals.risk_level,
      top_reason: signals.top_reason,
      buyer_pain_clarity: strength(signals.pain_score),
      willingness_to_pay_signal: strength(signals.willingness_to_pay_score),
      distribution_difficulty: signals.reachability_score >= 14 ? 'low' : signals.reachability_score >= 7 ? 'medium' : 'high',
      unfair_advantage_check: signals.advantage_score >= 14
        ? `The supplied answers suggest an advantage, but access to ${target} still needs direct proof.`
        : `No durable advantage is established; prove privileged access to ${target} before scaling.`,
      business_model_weakness: `The offer may sound useful without proving that ${target} will pay to replace ${currentAlternative}.`,
      why_it_might_work: `The supplied offer, ${description}, targets ${pain} for ${target}; that is a testable hypothesis, not verified market proof.`,
      why_it_might_fail: `The idea can become a ghost town if ${target} will discuss the problem but will not commit money or a concrete pilot.`,
      killer_question: `Which buyer among ${target} needs this urgently enough to pay before the full product exists?`,
      mvp_test: `Offer 10 manual pilots through ${channel} and require 3 paid commitments before building automation.`,
      next_step: signals.next_step,
      warnings: [],
      provenance: {
        source: 'ai_verdict_engine',
        provider: this.name,
        model: this.model,
        generated_at: this.generatedAt,
        validated: true
      },
      source: 'lit_api'
    };
  }
}
