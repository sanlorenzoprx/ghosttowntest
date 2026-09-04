import { describe, expect, it } from 'vitest';
import { createShareSummary } from '../src/lib/share';
import { buildVerdictDecisionV2 } from '../src/verdict/verdictDecisionV2';
import type { EvaluationResult } from '../src/types/lit';

const result: EvaluationResult = {
  resultId: 'share-copy-contract',
  idea: {
    ideaName: 'Private idea name',
    description: 'A simple service idea.',
    targetUser: 'local business owners',
    painfulProblem: 'They lose time on a repeated task.',
    currentAlternative: 'They do it manually.',
    motivation: 'Test demand before building.'
  },
  answers: {},
  deterministicScores: {
    ghostTownScore: 3,
    ghostTownRisk: 'medium',
    leverageScore: 3,
    insightScore: 3,
    timingScore: 3,
    litScore: 3,
    litBand: 'unclear',
    highWallsScore: 2,
    highWallsBand: 'weak',
    businessDnaType: 'service',
    businessDnaTrap: 'Unverified demand',
    businessDnaWinStrategy: 'Ask for a paid pilot',
    finalVerdict: 'test_first',
    verdictHeadline: 'Test demand first.',
    verdictExplanation: 'Buyer commitment is still unknown.',
    recommendedNextTest: 'Ask likely buyers to pay for a simple version.',
    doNotBuildUntil: 'A buyer commits.',
    oneSentenceAdvice: 'Ask for commitment before building.'
  },
  usedAI: false,
  generatedAt: '2026-09-04T00:00:00.000Z',
  cacheHit: false
};

result.verdictDecisionV2 = buildVerdictDecisionV2({
  idea: result.idea,
  scores: result.deterministicScores
});

describe('GhostTown share copy', () => {
  it('carries the product promise, verdict, unknown, and next step', () => {
    const copy = createShareSummary(result, 'https://example.test/share', true);

    expect(copy).toContain('I tested a business idea with GhostTown before building it.');
    expect(copy).toContain('Verdict:');
    expect(copy).toContain('Biggest unknown:');
    expect(copy).toContain(result.verdictDecisionV2!.firstAction.action);
    expect(copy).toContain('Test your idea before you spend months building it: https://example.test/share');
    expect(copy).toContain('#GhostTownTest');
  });

  it('keeps the idea name private unless the customer chooses to include it', () => {
    const privateCopy = createShareSummary(result, 'https://example.test/share', false);
    const namedCopy = createShareSummary(result, 'https://example.test/share', true);

    expect(privateCopy).not.toContain(result.idea.ideaName);
    expect(namedCopy).toContain(result.idea.ideaName);
  });

  it('does not make recipients decode internal diagnostic labels', () => {
    const copy = createShareSummary(result, 'https://example.test/share', false);

    expect(copy).not.toContain('LIT Score');
    expect(copy).not.toContain('Business DNA');
    expect(copy).not.toContain('Ghost Town Risk');
    expect(copy).not.toContain('falsification');
  });
});
