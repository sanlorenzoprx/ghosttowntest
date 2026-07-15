import type { IdeaInput, VerdictProvider, VerdictSignals } from './aiVerdictProvider';
import { MockVerdictProvider } from './mockVerdictProvider';
import type { RichVerdict } from './verdictSchema';

const FALLBACK_MODEL = 'deterministic-rich-verdict-v1';

export class DeterministicVerdictProvider implements VerdictProvider {
  readonly name = 'deterministic_fallback';
  readonly model = FALLBACK_MODEL;

  constructor(private readonly generatedAt = new Date().toISOString()) {}

  async generateVerdict(input: IdeaInput, signals: VerdictSignals): Promise<RichVerdict> {
    const verdict = await new MockVerdictProvider(this.generatedAt).generateVerdict(input, signals);
    return {
      ...verdict,
      provenance: {
        source: 'ai_verdict_engine',
        provider: this.name,
        model: this.model,
        generated_at: this.generatedAt,
        validated: true
      }
    };
  }
}
