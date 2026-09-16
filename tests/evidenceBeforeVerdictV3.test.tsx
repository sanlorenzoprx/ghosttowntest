import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runEvidenceScanV1 } from '../src/api/evidenceScan';
import type { Env } from '../src/api/env';
import { buildAnalyzePrompt } from '../src/lib/prompts';
import ResultReport from '../src/components/ResultReport';
import { buildVerdictDecisionV3 } from '../src/verdict/verdictDecisionV3';
import type { EvidenceScanItem, GhostTownEvidenceScanV1 } from '../src/types/evidence';
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
function marketItem(id: string, category: 'competition' | 'demand' | 'access'): EvidenceScanItem {
  return {
    evidenceId: id,
    category,
    label: `${category} ${id}`,
    publicUrl: `https://example.com/${id}`,
    provider: 'dataforseo',
    evidenceClass: 'market',
    evidenceScope: 'external',
    strength: 'weak',
    verificationStatus: 'provider_candidate',
    note: 'Public market signal.'
  };
}

function sevenLayerScan(): GhostTownEvidenceScanV1 {
  const reviewed: EvidenceScanItem = {
    evidenceId: 'customer:r1', category: 'customer_consumption', label: 'Comparable reviewed service',
    publicUrl: 'https://example.com/reviewed', provider: 'dataforseo', evidenceClass: 'customer',
    evidenceScope: 'external', strength: 'moderate', verificationStatus: 'provider_candidate',
    note: 'Public review activity supports category consumption.',
    rating: { value: 4.8, maximum: 5, reviewCount: 1200 }
  };
  const priced: EvidenceScanItem = {
    evidenceId: 'commercial:p1', category: 'commercial_consumption', label: 'Premium comparable service',
    publicUrl: 'https://example.com/premium', provider: 'dataforseo', evidenceClass: 'commercial',
    evidenceScope: 'external', strength: 'moderate', verificationStatus: 'provider_candidate',
    note: 'Commercial precedent.', price: { current: 499, currency: 'USD', displayed: '$499' }
  };
  const pricing: EvidenceScanItem = { ...priced, evidenceId: 'pricing:p1', category: 'pricing' };
  const premium: EvidenceScanItem = { ...priced, evidenceId: 'premium:p1', category: 'premium_precedent' };
  return {
    schemaVersion: 'ghosttown-evidence-scan-v1', modelVersion: 'seven-layer-v1', status: 'complete',
    generatedAt: '2026-09-16T20:00:00.000Z', fingerprint: 'seven-layer-proof-1',
    founderSays: { customer: idea.targetUser, problem: idea.painfulProblem, currentAlternative: idea.currentAlternative, offer: idea.description },
    competition: [marketItem('c1', 'competition'), marketItem('c2', 'competition'), marketItem('c3', 'competition')],
    demand: [marketItem('d1', 'demand')], access: [marketItem('a1', 'access')], currentAlternatives: [],
    customerConsumption: [reviewed], commercialConsumption: [reviewed, priced],
    pricingLandscape: [pricing], premiumPrecedent: [premium],
    pricingBands: [{ currency: 'USD', count: 3, minimum: 99, median: 199, maximum: 499 }],
    directEvidence: {
      response: { count: 0, state: 'not_collected', statement: 'Direct response has not been collected yet.' },
      purchase: { count: 0, state: 'not_collected', statement: 'Direct purchase has not been collected yet.' }
    },
    uncertainty: ['This founder-specific offer still needs a direct test.'],
    providerReceipts: [{ provider: 'dataforseo', status: 'complete', queryCount: 2, resultCount: 5 }],
    evidenceBoundary: {
      market: 'Category context.', customer: 'Reviews can support external consumption.',
      commercial: 'Commercial consumption can exist without exact price.', pricing: 'Observed prices are descriptive.',
      direct: 'Direct evidence is founder-specific.'
    }
  };
}

function baseEnv(): Env {
  return { AI: {} as Ai, JWT_SECRET: 'secret', STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price', STRIPE_WEBHOOK_SECRET: 'whsec' } as Env;
}
describe('Evidence Scan seven-layer free verdict', () => {
  it('marks direct response and purchase as not collected when providers are unavailable', async () => {
    const request = new Request('https://ghost.test/api/verdict', {
      headers: { 'CF-Connecting-IP': '203.0.113.10' }
    });
    const first = await runEvidenceScanV1(request, baseEnv(), idea, 'en');
    const second = await runEvidenceScanV1(request, baseEnv(), idea, 'en');
    expect(first.status).toBe('unavailable');
    expect(first.modelVersion).toBe('seven-layer-v1');
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.directEvidence?.response.state).toBe('not_collected');
    expect(first.directEvidence?.purchase.state).toBe('not_collected');
    expect(first.evidenceBoundary.customer).toMatch(/reviews|ratings/i);
    expect(first.evidenceBoundary.commercial).toMatch(/exact price is optional/i);
  });

  it('treats external consumption as real evidence without claiming direct-offer proof', () => {
    const decision = buildVerdictDecisionV3({ idea, scores, evidenceScan: sevenLayerScan() });
    expect(decision.evidenceModelVersion).toBe('seven-layer-v1');
    expect(decision.evidenceLayers.marketExistence).toMatchObject({ state: 'observed', count: 5 });
    expect(decision.evidenceLayers.customerConsumption).toMatchObject({ state: 'observed', count: 1 });
    expect(decision.evidenceLayers.commercialConsumption).toMatchObject({ state: 'observed', count: 2 });
    expect(decision.evidenceLayers.directOfferResponse).toMatchObject({ state: 'not_collected', count: 0 });
    expect(decision.evidenceLayers.directOfferPurchase).toMatchObject({ state: 'not_collected', count: 0 });
    expect(decision.evidenceTiers.customer).toMatchObject({ state: 'observed', count: 1 });
    expect(decision.evidenceTiers.commercial).toMatchObject({ state: 'observed', count: 2 });
    expect(decision.evidenceContrast.marketEvidenceSays).toMatch(/customer-consumption|commercial-consumption/i);
    expect(decision.evidenceContrast.ghostTownConcludes).toMatch(/specific|offer|positioning/i);
  });
  it('teaches Vertex the seven-layer boundary and keeps pricing descriptive', () => {
    const prompt = buildAnalyzePrompt(idea, {}, sevenLayerScan());
    expect(prompt).toContain('seven-layer evidence model');
    expect(prompt).toMatch(/reviews\/ratings can support category-level customer consumption/i);
    expect(prompt).toMatch(/commercial.*consumption.*exact price is unknown/i);
    expect(prompt).toMatch(/do not recommend the lowest, average, median, highest, or premium price/i);
    expect(prompt).toMatch(/direct response or purchase of this founder's specific offer/i);
  });

  it('renders all seven evidence layers before the decision', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { origin: 'https://ghost.test' } }
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => null }
    });
    const scan = sevenLayerScan();
    const result: EvaluationResult = {
      resultId: 'seven-layer-ui', idea, answers: {}, deterministicScores: scores,
      evidenceScan: scan,
      verdictDecisionV3: buildVerdictDecisionV3({ idea, scores, evidenceScan: scan }),
      usedAI: false, generatedAt: '2026-09-16T20:00:00.000Z', cacheHit: false
    };
    const html = renderToStaticMarkup(
      <ResultReport result={result} onReset={() => {}} isLoggedIn={false}
        onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />
    );
    expect(html.indexOf('GhostTown Evidence Scan')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('GhostTown Evidence Scan')).toBeLessThan(html.indexOf('Decision'));
    expect(html).toContain('Customer consumption');
    expect(html).toContain('Commercial consumption');
    expect(html).toContain('Pricing landscape');
    expect(html).toContain('Premium precedent');
    expect(html).toContain('Direct offer response');
    expect(html).toContain('Direct offer purchase');
    expect(html).toContain('Not collected');
    expect(html).toMatch(/does not automatically recommend the lowest, average, median, highest, or premium price/i);
    expect(html).toContain('30-Day Evidence Sprint');
  });
});
