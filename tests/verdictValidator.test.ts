import { describe, expect, it } from 'vitest';
import { validateVerdict } from '../src/lib/verdictValidator';

const validVerdict = {
  verdict: 'test_first' as const,
  verdict_headline: 'Prove demand before writing code.',
  one_sentence_advice: 'Pre-sell the workflow to three design agencies this week.',
  biggest_trap: 'Building automation before agencies commit budget.',
  do_not_build_until: 'Three agencies each commit at least $100 for a pilot.',
  recommended_next_test: 'Pitch a paid manual pilot to ten agency owners and close three.',
  confidence: 0.84
};

describe('AI verdict validation', () => {
  it('accepts a specific, well-formed verdict', () => {
    expect(validateVerdict(validVerdict)).toEqual({ valid: true, errors: [] });
  });

  it('rejects vague and out-of-range output', () => {
    const validation = validateVerdict({
      ...validVerdict,
      verdict_headline: 'Maybe',
      recommended_next_test: 'Consider testing',
      confidence: 0.99
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThanOrEqual(3);
  });
});
