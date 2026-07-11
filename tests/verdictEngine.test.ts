import { describe, expect, it } from 'vitest';
import type { VerdictProvider } from '../src/verdict/aiVerdictProvider';
import { MockVerdictProvider } from '../src/verdict/mockVerdictProvider';
import { generateValidatedVerdict, VerdictEngineError } from '../src/verdict/verdictEngine';

const idea = {
  name: 'AI UGC Creator Agency',
  description: 'A manual short-form product-video service',
  target_user: 'small ecommerce brands'
};

const signals = {
  lit_score: 78,
  risk_level: 'medium' as const,
  top_reason: 'The offer is clear but the buyer path still needs direct proof.',
  next_step: 'Sell 3 paid manual video pilots to 10 targeted ecommerce brands.',
  pain_score: 15,
  reachability_score: 8,
  willingness_to_pay_score: 8,
  advantage_score: 5
};

describe('AI verdict provider boundary', () => {
  it('returns the same validated mock verdict for the same input without a key', async () => {
    const provider = new MockVerdictProvider();
    const first = await generateValidatedVerdict(provider, idea, signals);
    const second = await generateValidatedVerdict(provider, idea, signals);
    expect(second).toEqual(first);
    expect(first.provenance).toEqual({
      source: 'ai_verdict_engine',
      provider: 'mock',
      model: 'mock-lit-verdict-v1',
      generated_at: '2026-01-01T00:00:00.000Z',
      validated: true
    });
  });

  it('fails closed when a provider returns an invalid verdict', async () => {
    const invalidProvider: VerdictProvider = {
      name: 'invalid-test',
      model: 'invalid-test-v1',
      async generateVerdict() { return { verdict_headline: 'Incomplete' }; }
    };
    await expect(generateValidatedVerdict(invalidProvider, idea, signals))
      .rejects.toBeInstanceOf(VerdictEngineError);
  });
});
