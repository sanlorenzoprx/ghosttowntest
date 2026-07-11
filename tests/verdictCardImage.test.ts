import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import { createVerdictCardSvg } from '../src/lib/verdictCardImage';
import { createShareSummary } from '../src/lib/share';

const result: EvaluationResult = {
  resultId: 'social-card-result',
  idea: {
    ideaName: 'Private <Launch> & Co.',
    description: 'A useful test idea',
    targetUser: 'Founders',
    painfulProblem: 'Unvalidated assumptions',
    currentAlternative: 'Guessing',
    motivation: 'Build the right thing'
  },
  answers: {},
  deterministicScores: {
    ghostTownScore: 4.2,
    ghostTownRisk: 'low',
    leverageScore: 4,
    insightScore: 4.2,
    timingScore: 4.4,
    litScore: 4.2,
    litBand: 'strong',
    highWallsScore: 3.5,
    highWallsBand: 'promising',
    businessDnaType: 'digital_product',
    businessDnaTrap: 'J-curve',
    businessDnaWinStrategy: 'Validate first',
    finalVerdict: 'build_now',
    verdictHeadline: 'You have the advantage.',
    verdictExplanation: 'Strong evidence across the framework.',
    recommendedNextTest: 'Secure three paid pilots.',
    doNotBuildUntil: 'Three customers commit.',
    oneSentenceAdvice: 'Secure three paid pilots before expanding the build.'
  },
  usedAI: false,
  generatedAt: '2026-06-26T00:00:00.000Z',
  cacheHit: false
};

describe('verdict social card rendering', () => {
  it('renders a private landscape card with the correct verdict and dimensions', () => {
    const svg = createVerdictCardSvg(result, {
      format: 'landscape',
      includeIdeaName: false,
      shareUrl: 'https://lit.example/share/abc'
    });

    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain('MY IDEA SURVIVED.');
    expect(svg).toContain('BUILD NOW');
    expect(svg).toContain('Idea name kept private');
    expect(svg).not.toContain('Private &lt;Launch&gt;');
    expect(svg).toContain('LIT-GHOSTTOWN.COM');
  });

  it('renders an escaped square card when the user includes the idea name', () => {
    const svg = createVerdictCardSvg(result, {
      format: 'square',
      includeIdeaName: true
    });

    expect(svg).toContain('width="1080" height="1080"');
    expect(svg).toContain('Private &lt;Launch&gt; &amp; Co.');
    expect(svg).not.toContain('Private <Launch>');
    expect(svg).toContain('Digital Product');
  });

  it('keeps the idea name out of share text when privacy is enabled', () => {
    const summary = createShareSummary(result, 'https://lit.example/share/abc', false);
    expect(summary).toContain('**Idea:** Kept private');
    expect(summary).not.toContain(result.idea.ideaName);
  });
});
