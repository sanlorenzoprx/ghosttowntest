import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultReport from '../src/components/ResultReport';
import { buildVerdictDecisionV2 } from '../src/verdict/verdictDecisionV2';
import type { EvaluationResult } from '../src/types/lit';

const result: EvaluationResult = {
  resultId: 'q1-golden-result',
  idea: {
    ideaName: 'Accessibility audit pilot',
    description: 'Manual checkout accessibility audit.',
    targetUser: 'independent ecommerce stores',
    painfulProblem: 'Checkout friction creates support work.',
    currentAlternative: 'sporadic internal QA',
    motivation: 'Test buyer commitment'
  },
  answers: {},
  deterministicScores: {
    ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
    litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service',
    businessDnaTrap: 'Unverified demand', businessDnaWinStrategy: 'Ask for a paid pilot', finalVerdict: 'test_first',
    verdictHeadline: 'Test demand first.', verdictExplanation: 'Commitment is unverified.',
    recommendedNextTest: 'Ask buyers for a paid pilot.', doNotBuildUntil: 'A buyer commits.',
    oneSentenceAdvice: 'Ask for commitment before building.'
  },
  usedAI: false,
  generatedAt: '2026-08-17T00:00:00.000Z',
  cacheHit: false
};
result.verdictDecisionV2 = buildVerdictDecisionV2({ idea: result.idea, scores: result.deterministicScores });

describe('ResultReport VerdictDecisionV2', () => {
  it('makes decision, biggest unknown, fastest test, and first action primary while keeping scores behind Detailed analysis', () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghosttowntest.test' } } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    const html = renderToStaticMarkup(<ResultReport result={result} onReset={() => {}} isLoggedIn={false} onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />);

    const primaryHeadings = ['Decision', 'Biggest unknown', 'Fastest test', 'Do this first'];
    const primaryPositions = primaryHeadings.map(heading => html.indexOf(heading));
    expect(primaryPositions.every(position => position >= 0)).toBe(true);
    expect(primaryPositions).toEqual([...primaryPositions].sort((left, right) => left - right));

    const detailedAnalysis = html.indexOf('Detailed analysis');
    const litScore = html.indexOf('LIT Score');
    const businessDna = html.indexOf('Business DNA');
    expect(detailedAnalysis).toBeGreaterThan(primaryPositions[primaryPositions.length - 1]);
    expect(litScore).toBeGreaterThan(detailedAnalysis);
    expect(businessDna).toBeGreaterThan(detailedAnalysis);
    expect(html.slice(0, detailedAnalysis)).not.toContain('LIT Score');
    expect(html).toContain('<details data-testid="detailed-analysis"');
    expect(html).not.toContain('ghost-score-ring');
  });
});
