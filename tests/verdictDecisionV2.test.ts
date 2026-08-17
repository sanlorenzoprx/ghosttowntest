import { describe, expect, it } from 'vitest';
import {
  buildVerdictDecisionV2,
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
      maximumCash: '$50'
    });
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
});
