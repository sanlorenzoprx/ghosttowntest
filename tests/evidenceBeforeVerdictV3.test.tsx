import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runEvidenceScanV1 } from '../src/api/evidenceScan';
import type { Env } from '../src/api/env';
import { buildAnalyzePrompt } from '../src/lib/prompts';
import ResultReport from '../src/components/ResultReport';
import { buildVerdictDecisionV3 } from '../src/verdict/verdictDecisionV3';
import type { GhostTownEvidenceScanV1 } from '../src/types/evidence';
import type { EvaluationResult, IdeaIntake } from '../src/types/lit';

const idea: IdeaIntake = {
  ideaName: 'Checkout proof sprint',
  description: 'A fixed-scope manual checkout friction audit for independent ecommerce stores.',
  targetUser: 'independent ecommerce stores with meaningful checkout volume',
  painfulProblem: 'Checkout friction creates lost orders and repeated support work.',
  currentAlternative: 'sporadic internal QA and customer complaints',
  motivation: 'Test willingness to pay before building software'
};

const scores = {
  ghostTownScore: 3, ghostTownRisk: 'medium' as const, leverageScore: 3, insightScore: 3, timingScore: 3,
  litScore: 2, litBand: 'weak' as const, highWallsScore: 2, highWallsBand: 'weak' as const,
  businessDnaType: 'service' as const, businessDnaTrap: 'Unverified demand', businessDnaWinStrategy: 'Run a paid pilot',
  finalVerdict: 'test_first' as const, verdictHeadline: 'Test first.', verdictExplanation: 'Commitment is unknown.',
  recommendedNextTest: 'Ask for a paid pilot.', doNotBuildUntil: 'A buyer commits.', oneSentenceAdvice: 'Test commitment.'
};
function marketScan(): GhostTownEvidenceScanV1 {
  const item = (id: string, category: 'competition' | 'demand' | 'access') => ({
    evidenceId: id, category, label: `${category} ${id}`, publicUrl: `https://example.com/${id}`,
    provider: 'dataforseo' as const, evidenceClass: 'market' as const, strength: 'weak' as const,
    verificationStatus: 'provider_candidate' as const, note: 'Public market signal only.'
  });
  return {
    schemaVersion: 'ghosttown-evidence-scan-v1', status: 'complete', generatedAt: '2026-09-15T20:00:00.000Z',
    fingerprint: 'scan-proof-1', founderSays: { customer: idea.targetUser, problem: idea.painfulProblem, currentAlternative: idea.currentAlternative, offer: idea.description },
    competition: [item('c1', 'competition'), item('c2', 'competition'), item('c3', 'competition')],
    demand: [item('d1', 'demand')], access: [item('a1', 'access')],
    currentAlternatives: [], uncertainty: ['Buyer commitment is still unknown.'],
    providerReceipts: [{ provider: 'dataforseo', status: 'complete', queryCount: 2, resultCount: 4 }],
    evidenceBoundary: {
      market: 'Market activity is not proof buyers will act.', customer: 'Customer evidence requires observed behavior.',
      commercial: 'Commercial evidence requires an observed commitment.'
    }
  };
}

function baseEnv(): Env {
  return { AI: {} as Ai, JWT_SECRET: 'secret', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' } as Env;
}
describe('Evidence Scan before verdict + VerdictDecisionV3', () => {
  it('produces a stable bounded fingerprint even when no external providers are configured', async () => {
    const request = new Request('https://ghost.test/api/verdict', { headers: { 'CF-Connecting-IP': '203.0.113.10' } });
    const first = await runEvidenceScanV1(request, baseEnv(), idea, 'en');
    const second = await runEvidenceScanV1(request, baseEnv(), idea, 'en');
    expect(first.status).toBe('unavailable');
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.currentAlternatives[0]).toMatchObject({ provider: 'founder_input', verificationStatus: 'founder_supplied' });
    expect(first.evidenceBoundary.market).toMatch(/does not prove people will buy/i);
    expect(first.uncertainty.join(' ')).toMatch(/buying action/i);
  });

  it('uses market evidence to tighten the test without turning it into demand proof', () => {
    const scan = marketScan();
    const decision = buildVerdictDecisionV3({ idea, scores, evidenceScan: scan });
    expect(decision.decision).toBe('REVISE_BEFORE_TESTING');
    expect(decision.evidenceTiers.market).toMatchObject({ state: 'observed', count: 5 });
    expect(decision.evidenceTiers.customer).toMatchObject({ state: 'not_observed', count: 0 });
    expect(decision.evidenceTiers.commercial).toMatchObject({ state: 'not_observed', count: 0 });
    expect(decision.evidenceContrast.marketEvidenceSays).toMatch(/do not prove people will buy/i);
    expect(decision.evidenceContrast.ghostTownConcludes).toMatch(/keep testing|proof|buy/i);
  });

  it('injects the truth boundary into AI analysis prompts', () => {
    const prompt = buildAnalyzePrompt(idea, {}, marketScan());
    expect(prompt).toContain('GHOSTTOWN EVIDENCE SCAN');
    expect(prompt).toMatch(/market context/i);
    expect(prompt).toMatch(/Do not convert search visibility, competitors, channels, or audience surfaces into claims that customers will buy/i);
  });
  it('renders the Evidence Scan before the decision and sells the Sprint around evidence value', () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghost.test' } } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    const scan = marketScan();
    const result: EvaluationResult = {
      resultId: 'evidence-v3-ui', idea, answers: {}, deterministicScores: scores,
      evidenceScan: scan, verdictDecisionV3: buildVerdictDecisionV3({ idea, scores, evidenceScan: scan }),
      usedAI: false, generatedAt: '2026-09-15T20:00:00.000Z', cacheHit: false
    };
    const html = renderToStaticMarkup(<ResultReport result={result} onReset={() => {}} isLoggedIn={false} onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />);
    expect(html.indexOf('GhostTown Evidence Scan')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('GhostTown Evidence Scan')).toBeLessThan(html.indexOf('Decision'));
    expect(html).toContain('Market evidence');
    expect(html).toContain('Customer evidence');
    expect(html).toContain('Buying evidence');
    expect(html).toContain('30-Day Evidence Sprint');
    expect(html).toContain('Do not lose another month');
    expect(html).toContain('Do not quit for the wrong reason');
    expect(html).toMatch(/does not promise sales or success/i);
  });
});
