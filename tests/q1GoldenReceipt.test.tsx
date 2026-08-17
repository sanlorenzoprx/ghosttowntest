import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ResultReport from '../src/components/ResultReport';
import { buildVerdictDecisionV2, projectVerdictDecisionV2ToLegacy, validateVerdictDecisionV2 } from '../src/verdict/verdictDecisionV2';
import type { EvaluationResult } from '../src/types/lit';

const goldens = [
  {
    id: 'specific-paid-pilot',
    input: {
      idea: {
        ideaName: 'Fractional accessibility audits', description: 'A fixed-scope accessibility audit for independent ecommerce stores.',
        targetUser: 'independent ecommerce stores with active checkout traffic',
        painfulProblem: 'Checkout accessibility issues create customer friction and support work.', currentAlternative: 'sporadic internal QA and generic automated scans'
      },
      scores: { litScore: 3.4, ghostTownRisk: 'medium', insightScore: 3.2, leverageScore: 3, timingScore: 3.5, highWallsScore: 2.4 },
      priceOrCommitmentRange: '$300–$500 paid audit pilot'
    },
    expected: { decision: 'REVISE_BEFORE_TESTING', confidence: 'MODERATE' }
  },
  {
    id: 'broad-missing-intake',
    input: {
      idea: { ideaName: 'General productivity app', description: 'An app for everyone.', targetUser: '', painfulProblem: '', currentAlternative: '' },
      scores: { litScore: 4.8, ghostTownRisk: 'low', insightScore: 4.8, leverageScore: 4.8, timingScore: 4.8, highWallsScore: 4.8 }
    },
    expected: { decision: 'DO_NOT_PURSUE_YET', confidence: 'LOW' }
  }
] as const;

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function renderFixtureResult(decision: ReturnType<typeof buildVerdictDecisionV2>, id: string): string {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://ghosttowntest.test' } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => undefined } });
  const result: EvaluationResult = {
    resultId: id,
    idea: { ...goldens.find(item => item.id === id)!.input.idea, motivation: 'Golden receipt fixture' }, answers: {},
    deterministicScores: {
      ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3,
      litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service',
      businessDnaTrap: 'Unverified demand', businessDnaWinStrategy: 'Ask for one paid pilot', finalVerdict: 'test_first',
      verdictHeadline: 'Legacy headline', verdictExplanation: 'Legacy explanation', recommendedNextTest: 'Build an MVP',
      doNotBuildUntil: 'Legacy guardrail', oneSentenceAdvice: 'Start building now.'
    },
    verdictDecisionV2: decision, usedAI: false, generatedAt: '2026-08-17T00:00:00.000Z', cacheHit: false
  };
  return renderToStaticMarkup(<ResultReport result={result} onReset={() => {}} isLoggedIn={false} onLoginClick={() => {}} onRewardClaimed={() => {}} locale="en" />);
}

describe('Q1 golden decision receipt', () => {
  it('produces representative canonical decisions, adverse handling, and rendered report artifacts', () => {
    const outputs = goldens.map(golden => {
      const decision = buildVerdictDecisionV2(golden.input);
      const projection = projectVerdictDecisionV2ToLegacy(decision);
      const html = renderFixtureResult(decision, golden.id);
      expect(validateVerdictDecisionV2(decision).valid).toBe(true);
      expect(decision.decision).toBe(golden.expected.decision);
      expect(decision.confidence.level).toBe(golden.expected.confidence);
      expect(projection.next_step).toBe(decision.firstAction.action);
      expect(html).toContain(decision.customer.initialCustomer);
      expect(html).toContain(decision.offerHypothesis.offer);
      expect(html).not.toContain('Start building now.');
      return {
        fixture_id: golden.id,
        input_sha256: digest(golden.input),
        decision_sha256: digest(decision),
        rendered_report_sha256: digest(html),
        decision: decision.decision,
        confidence: decision.confidence.level,
        customer: decision.customer.initialCustomer,
        problem: decision.problem.painfulProblem,
        offer: decision.offerHypothesis.offer,
        commitment: decision.offerHypothesis.commitmentRequested,
        first_action: decision.firstAction.action,
        falsification: decision.cheapestFalsification,
        evidence_labels: decision.evidenceLabels.map(label => label.truthLabel),
        semantic_checks: {
          bounded_commitment_prediction: /meaningful customer commitment/i.test(decision.predictionTarget),
          no_whole_business_claim: !/will succeed|guaranteed/i.test(JSON.stringify(decision)),
          no_build_before_demand: !/build.*(?:product|app|platform|software)/i.test(decision.firstAction.action),
          rendered_canonical_customer_offer_commitment: html.includes(decision.customer.initialCustomer) && html.includes(decision.offerHypothesis.commitmentRequested),
          adverse_unknown_intake: golden.id !== 'broad-missing-intake' || decision.evidenceLabels.some(label => label.truthLabel === 'UNKNOWN')
        }
      };
    });
    const path = process.env.ROADMAP_Q1_GOLDEN_ARTIFACT_PATH;
    if (path) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify({ schema_version: 'ghosttown-q1-golden-output-v1', outputs }, null, 2)}\n`, 'utf8');
    }
  });
});
