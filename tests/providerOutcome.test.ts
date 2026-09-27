import { describe, expect, it } from 'vitest';
import {
  ProviderRequestError,
  classifyProviderHttpOutcome,
  isRetryableProviderOutcome,
  opensProviderCircuit,
  providerHttpError
} from '../src/api/providerOutcome';
import { classifyResearchShortfall } from '../src/api/researchOutcome';

describe('provider outcome classification', () => {
  it('classifies payment, quota, rate, temporary and permanent HTTP outcomes', () => {
    expect(classifyProviderHttpOutcome(402, 'payment required')).toBe('PAYMENT_REQUIRED');
    expect(classifyProviderHttpOutcome(403, 'quota exceeded')).toBe('QUOTA_EXHAUSTED');
    expect(classifyProviderHttpOutcome(429, 'resource exhausted: quota')).toBe('QUOTA_EXHAUSTED');
    expect(classifyProviderHttpOutcome(429, 'too many requests')).toBe('RATE_LIMITED');
    expect(classifyProviderHttpOutcome(503, 'unavailable')).toBe('TEMPORARY_PROVIDER_FAILURE');
    expect(classifyProviderHttpOutcome(401, 'unauthorized')).toBe('PERMANENT_PROVIDER_FAILURE');
  });

  it('preserves Retry-After metadata without exposing it as business uncertainty', () => {
    const error = providerHttpError('vertex_ai', 429, 'too many requests', '17');
    expect(error).toBeInstanceOf(ProviderRequestError);
    expect(error.outcome).toBe('RATE_LIMITED');
    expect(error.retryAfterSeconds).toBe(17);
    expect(isRetryableProviderOutcome(error.outcome)).toBe(true);
    expect(opensProviderCircuit(error.outcome)).toBe(false);
  });

  it('opens the per-Sprint circuit for quota/payment/permanent failures', () => {
    expect(opensProviderCircuit('QUOTA_EXHAUSTED')).toBe(true);
    expect(opensProviderCircuit('PAYMENT_REQUIRED')).toBe(true);
    expect(opensProviderCircuit('PERMANENT_PROVIDER_FAILURE')).toBe(true);
    expect(opensProviderCircuit('NO_RESULTS')).toBe(false);
  });

  it('treats NO_RESULTS as insufficient evidence, not provider blockage', () => {
    expect(classifyResearchShortfall([
      { sourceType: 'rankparse_backlinks', success: false, candidateCount: 0, outcome: 'NO_RESULTS' },
      { sourceType: 'podcast_index', success: false, candidateCount: 0, outcome: 'NO_RESULTS' }
    ])).toBe('INSUFFICIENT_EVIDENCE');
    expect(classifyResearchShortfall([
      { sourceType: 'youtube_api', success: false, candidateCount: 0, outcome: 'QUOTA_EXHAUSTED' }
    ])).toBe('PROVIDER_BLOCKED');
  });
});
