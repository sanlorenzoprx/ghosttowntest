import { describe, expect, it } from 'vitest';
import {
  buildVerdictDecisionV2,
  hydrateEvaluationResultDecisionV2,
  hydrateVerdictDecisionV2,
  projectVerdictDecisionV2ToLegacy,
  validateVerdictDecisionV2
} from '../src/verdict/verdictDecisionV2';
import { verdictDecisionV2GoldenFixture as inputs } from './fixtures/verdictDecisionV2';

describe('VerdictDecisionV2', () => {
  it('builds a deterministic, bounded customer-commitment decision with the complete canonical shape', () => {
    const first = buildVerdictDecisionV2(inputs);
    const second = buildVerdictDecisionV2(inputs);

    expect(second).toEqual(first);
    expect(first.decision).toBe(inputs.expected.decision);
    expect(first.predictionTarget).toMatch(/meaningful customer commitment/i);
    expect(first.customer.initialCustomer).toContain(inputs.expected.initialCustomerIncludes);
    expect(first.cheapestFalsification).toMatchObject({
      maximumTime: '5 business days',
      maximumCash: 'No paid spend required; use founder time and existing direct outreach only.'
    });
    expect(first.cheapestFalsification.failureThreshold).toContain('INCONCLUSIVE: 1–2');
    expect(first.firstAction.preparedAssetRequired).toBe(true);
    expect(first.evidenceLabels.map(item => item.truthLabel)).toEqual(expect.arrayContaining(['VERIFIED', 'INFERRED', 'UNKNOWN']));
    expect(validateVerdictDecisionV2(first)).toMatchObject({ valid: true, errors: [] });
  });

  it('fails closed on a whole-business success claim or substantial product build as the first action', () => {
    const valid = buildVerdictDecisionV2(inputs);
    expect(validateVerdictDecisionV2({
      ...valid,
      reasonsFor: [...valid.reasonsFor, 'This business will succeed.'],
      firstAction: { ...valid.firstAction, action: 'Build the software product before contacting a buyer.' }
    })).toMatchObject({ valid: false });
  });

  it('hydrates a legacy result and projects the canonical decision back to legacy display fields', () => {
    const hydrated = hydrateVerdictDecisionV2(undefined, inputs);
    const projection = projectVerdictDecisionV2ToLegacy(hydrated);

    expect(validateVerdictDecisionV2(hydrated).valid).toBe(true);
    expect(projection).toMatchObject({
      next_step: hydrated.firstAction.action,
      mvp_test: hydrated.cheapestFalsification.test
    });
    expect(projection.killer_question.endsWith('?')).toBe(true);
  });

  it('caps broad or missing legacy intake at low-confidence unknown evidence even when legacy scores are high', () => {
    const legacy = {
      resultId: 'legacy-broad',
      idea: { ideaName: 'General app', description: 'An app for everyone.', targetUser: '', painfulProblem: '', currentAlternative: '', motivation: 'Test it' },
      answers: {},
      deterministicScores: {
        ghostTownScore: 5, ghostTownRisk: 'low', leverageScore: 5, insightScore: 5, timingScore: 5, litScore: 5,
        litBand: 'strong', highWallsScore: 5, highWallsBand: 'strong', businessDnaType: 'digital_product',
        businessDnaTrap: 'Unknown', businessDnaWinStrategy: 'Unknown', finalVerdict: 'build_now', verdictHeadline: 'Build now',
        verdictExplanation: 'Legacy score', recommendedNextTest: 'Build the app', doNotBuildUntil: 'None', oneSentenceAdvice: 'Build now'
      },
      usedAI: false, generatedAt: '2026-08-17T00:00:00.000Z', cacheHit: false
    } as import('../src/types/lit').EvaluationResult;
    const hydrated = hydrateEvaluationResultDecisionV2(legacy).verdictDecisionV2!;

    expect(hydrated.decision).toBe('DO_NOT_PURSUE_YET');
    expect(hydrated.confidence.level).toBe('LOW');
    expect(hydrated.evidenceLabels.some(label => label.truthLabel === 'UNKNOWN')).toBe(true);
  });
});
