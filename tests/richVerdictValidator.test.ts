import { describe, expect, it } from 'vitest';
import { MockVerdictProvider } from '../src/verdict/mockVerdictProvider';
import { validateRichVerdict } from '../src/verdict/verdictValidator';

const idea = {
  name: 'Agency QA',
  description: 'Manual release QA for small web agencies',
  target_user: 'small web agencies'
};

const signals = {
  lit_score: 78,
  risk_level: 'medium' as const,
  top_reason: 'The buyer is specific but the paid acquisition path is not proven.',
  next_step: 'Pitch a paid manual release review to 10 agency owners and close 3 pilots.',
  pain_score: 16,
  reachability_score: 12,
  willingness_to_pay_score: 8,
  advantage_score: 6
};

async function validVerdict() {
  return new MockVerdictProvider().generateVerdict(idea, signals);
}

describe('rich verdict validator', () => {
  it('accepts the complete strict rich schema', async () => {
    const verdict = await validVerdict();
    expect(validateRichVerdict(verdict)).toMatchObject({ valid: true, errors: [] });
  });

  it('rejects missing fields, extra fields, invalid score, and invalid risk values', async () => {
    const verdict = await validVerdict();
    const { killer_question: _missing, ...withoutQuestion } = verdict;
    expect(validateRichVerdict(withoutQuestion).errors).toContain('missing required field: killer_question');
    expect(validateRichVerdict({ ...verdict, surprise: true }).valid).toBe(false);
    expect(validateRichVerdict({ ...verdict, lit_score: 101 }).valid).toBe(false);
    expect(validateRichVerdict({ ...verdict, ghost_town_risk: 'certain' }).valid).toBe(false);
  });

  it('rejects generic advice, fake certainty, unsupported claims, and non-array warnings', async () => {
    const verdict = await validVerdict();
    expect(validateRichVerdict({ ...verdict, next_step: 'Talk to users before deciding what to do next.' }).errors)
      .toContain('verdict contains generic advice');
    expect(validateRichVerdict({ ...verdict, why_it_might_work: 'This will definitely work for every buyer.' }).errors)
      .toContain('verdict contains unsupported certainty');
    expect(validateRichVerdict({ ...verdict, top_reason: 'Research shows the market is growing quickly.' }).errors)
      .toContain('verdict contains an unsupported market claim');
    expect(validateRichVerdict({ ...verdict, warnings: 'none' }).errors)
      .toContain('warnings must be an array of strings');
  });
});
