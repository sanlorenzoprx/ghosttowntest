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
  it('renders the Q1 customer-facing sections in canonical order before legacy score detail', () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghosttowntest.test' } } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    const html = renderToStaticMarkup(<ResultReport result={result} onReset={() => {}} isLoggedIn={false} onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />);
    const headings = [
      'Decision', 'What we are actually predicting', 'Confidence', 'Why this may work', 'Why this may fail',
      'Biggest unknown', 'Cheapest way to prove us wrong', 'Do this first', 'What would change this verdict', 'Evidence labels'
    ];
    const positions = headings.map(heading => html.indexOf(heading));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(html.indexOf('Ghost Town risk')).toBeGreaterThan(positions[positions.length - 1]);
  });
});
