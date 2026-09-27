import { describe, expect, it } from 'vitest';
import {
  ResearchOutcomeError,
  classifyResearchShortfall,
  isResearchOutcomeError,
  researchShortfallError
} from '../src/api/researchOutcome';
import { isCustomerAccessResearchUncertainty } from '../src/api/launchBlueprintWorkflow';

describe('typed research outcomes', () => {
  it('routes healthy-provider evidence shortfalls to INSUFFICIENT_EVIDENCE', () => {
    const attempts = [
      { sourceType: 'rankparse_backlinks', success: true, candidateCount: 2 },
      { sourceType: 'podcast_index', success: true, candidateCount: 0 },
      { sourceType: 'google_grounded_customer_access', success: true, candidateCount: 1 }
    ];
    expect(classifyResearchShortfall(attempts)).toBe('INSUFFICIENT_EVIDENCE');
    const error = researchShortfallError(
      'MIN_VERIFIED_CANDIDATES',
      'Only three verified candidates were found after healthy providers completed.',
      attempts
    );
    expect(error.outcome).toBe('INSUFFICIENT_EVIDENCE');
    expect(isCustomerAccessResearchUncertainty(error)).toBe(true);
  });

  it('routes any provider-incomplete shortfall to PROVIDER_BLOCKED instead of founder uncertainty', () => {
    const attempts = [
      { sourceType: 'rankparse_backlinks', success: true, candidateCount: 4 },
      { sourceType: 'youtube_api', success: false, candidateCount: 0 },
      { sourceType: 'google_grounded_customer_access', success: false, candidateCount: 0 }
    ];
    expect(classifyResearchShortfall(attempts)).toBe('PROVIDER_BLOCKED');
    const error = researchShortfallError(
      'MIN_VERIFIED_CANDIDATES',
      'Research could not reach the evidence gate because providers were unavailable.',
      attempts
    );
    expect(error.outcome).toBe('PROVIDER_BLOCKED');
    expect(error.failedProviderTypes).toEqual(['youtube_api', 'google_grounded_customer_access']);
    expect(error.customerSafeMessage).not.toContain('quota');
    expect(isCustomerAccessResearchUncertainty(error)).toBe(false);
  });

  it('never treats untyped diagnostic text as a research outcome', () => {
    const raw = new Error('Quota exhausted and fewer than 10 candidates');
    expect(isResearchOutcomeError(raw)).toBe(false);
    expect(isCustomerAccessResearchUncertainty(raw)).toBe(false);
  });

  it('supports explicit typed outcome checks', () => {
    const error = new ResearchOutcomeError({
      outcome: 'PROVIDER_BLOCKED',
      code: 'MIN_SUCCESSFUL_PROVIDER_TASKS',
      detail: 'Provider execution incomplete',
      attempts: [{ sourceType: 'youtube_api', success: false, candidateCount: 0 }]
    });
    expect(isResearchOutcomeError(error, 'PROVIDER_BLOCKED')).toBe(true);
    expect(isResearchOutcomeError(error, 'INSUFFICIENT_EVIDENCE')).toBe(false);
  });
});
