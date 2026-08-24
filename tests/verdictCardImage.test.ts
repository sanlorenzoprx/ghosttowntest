import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import { createVerdictCardSvg } from '../src/lib/verdictCardImage';
import { createShareSummary } from '../src/lib/share';
import { buildVerdictDecisionV2 } from '../src/verdict/verdictDecisionV2';

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
  it('renders a private landscape card with the correct verdict and no diagnostic score panel', () => {
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
    expect(svg).toContain('BIGGEST UNKNOWN');
    expect(svg).toContain('FASTEST TEST');
    expect(svg).not.toContain('LIT SCORE');
    expect(svg).not.toContain('BUSINESS DNA');
    expect(svg).toContain('LIT-GHOSTTOWN.COM');
  });

  it('renders an escaped square card with action-first context when the user includes the idea name', () => {
    const svg = createVerdictCardSvg(result, {
      format: 'square',
      includeIdeaName: true
    });

    expect(svg).toContain('width="1080" height="1080"');
    expect(svg).toContain('Private &lt;Launch&gt; &amp; Co.');
    expect(svg).not.toContain('Private <Launch>');
    expect(svg).toContain('BIGGEST UNKNOWN');
    expect(svg).toContain('FASTEST TEST');
    expect(svg).not.toContain('LIT SCORE');
    expect(svg).not.toContain('BUSINESS DNA');
  });

  it('wraps long verdict hooks inside the decision card layout', () => {
    const testFirstResult: EvaluationResult = {
      ...result,
      deterministicScores: {
        ...result.deterministicScores,
        finalVerdict: 'test_first'
      }
    };
    const svg = createVerdictCardSvg(testFirstResult, {
      format: 'landscape',
      includeIdeaName: false
    });

    expect(svg).toContain('GOOD IDEA. DANGEROUS');
    expect(svg).toContain('ASSUMPTION.');
    expect(svg).not.toContain('>GOOD IDEA. DANGEROUS ASSUMPTION.</text>');
  });

  it('uses the canonical V2 decision for every card label, hook, and color rather than legacy score copy', () => {
    const completeIdea = {
      ideaName: 'Accessibility audits', description: 'A fixed-scope accessibility audit for independent ecommerce stores.',
      targetUser: 'independent ecommerce stores with active checkout traffic',
      painfulProblem: 'Checkout accessibility issues create customer friction and support work.',
      currentAlternative: 'sporadic internal QA and generic automated scans'
    };
    const cases = [
      { score: 4, decision: 'WORTH_TESTING', label: 'WORTH TESTING', hook: 'TEST THE COMMITMENT.', color: '#052e2b' },
      { score: 3, decision: 'REVISE_BEFORE_TESTING', label: 'REVISE BEFORE TESTING', hook: 'SHARPEN THE TEST.', color: '#422006' },
      { score: 2, decision: 'WEAK_EVIDENCE', label: 'WEAK EVIDENCE', hook: 'EVIDENCE IS TOO THIN.', color: '#431407' },
      { score: 4, decision: 'DO_NOT_PURSUE_YET', label: 'DO NOT PURSUE YET', hook: 'DEFINE BEFORE OUTREACH.', color: '#450a0a', idea: { ...completeIdea, currentAlternative: '' } }
    ] as const;

    for (const item of cases) {
      const verdictDecisionV2 = buildVerdictDecisionV2({
        idea: item.idea || completeIdea,
        scores: { litScore: item.score, ghostTownRisk: 'medium', insightScore: 3, leverageScore: 3, timingScore: 3, highWallsScore: 3 }
      });
      const svg = createVerdictCardSvg({ ...result, verdictDecisionV2 }, { format: 'landscape', includeIdeaName: false });
      expect(verdictDecisionV2.decision).toBe(item.decision);
      expect(svg).toContain(item.label);
      expect(svg).toContain(item.hook);
      expect(svg).toContain(item.color);
      expect(svg).toContain('BIGGEST UNKNOWN');
      expect(svg).toContain('FASTEST TEST');
      expect(svg).not.toContain('LIT SCORE');
      if (item.decision === 'DO_NOT_PURSUE_YET') expect(svg).not.toMatch(/TEST FIRST|GOOD IDEA|MY IDEA SURVIVED/i);
    }
  });

  it('keeps the idea name out of share text when privacy is enabled', () => {
    const summary = createShareSummary(result, 'https://lit.example/share/abc', false);
    expect(summary).toContain('**Idea:** Kept private');
    expect(summary).not.toContain(result.idea.ideaName);
  });
});
