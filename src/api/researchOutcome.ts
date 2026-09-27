import type { ProviderOutcome } from './providerOutcome';

export type ResearchOutcome = 'COMPLETE' | 'INSUFFICIENT_EVIDENCE' | 'PROVIDER_BLOCKED';

export type ResearchShortfallCode =
  | 'MIN_SUCCESSFUL_PROVIDER_TASKS'
  | 'MIN_PROVIDER_TYPES'
  | 'MIN_VERIFIED_CANDIDATES'
  | 'MIN_CURRENT_CUSTOMER_ACCESS'
  | 'MIN_PROBLEM_LANGUAGE_OBSERVATIONS'
  | 'MIN_COMPETITIVE_ALTERNATIVE_EVIDENCE'
  | 'EVIDENCE_ROLE_COVERAGE'
  | 'RESEARCH_QUALITY_GATE';

export interface ResearchAttemptLike {
  sourceType: string;
  success: boolean;
  candidateCount: number;
  outcome?: ProviderOutcome;
}

export interface ResearchOutcomeErrorOptions {
  outcome: Exclude<ResearchOutcome, 'COMPLETE'>;
  code: ResearchShortfallCode;
  detail: string;
  attempts?: ResearchAttemptLike[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export class ResearchOutcomeError extends Error {
  readonly outcome: Exclude<ResearchOutcome, 'COMPLETE'>;
  readonly code: ResearchShortfallCode;
  readonly attemptedProviderTypes: string[];
  readonly failedProviderTypes: string[];
  readonly customerSafeMessage: string;

  constructor(options: ResearchOutcomeErrorOptions) {
    super(options.detail);
    this.name = 'ResearchOutcomeError';
    this.outcome = options.outcome;
    this.code = options.code;
    const attempts = options.attempts || [];
    this.attemptedProviderTypes = unique(attempts.map(attempt => attempt.sourceType));
    this.failedProviderTypes = unique(attempts.filter(attempt => !attempt.success).map(attempt => attempt.sourceType));
    this.customerSafeMessage = options.outcome === 'PROVIDER_BLOCKED'
      ? 'GhostTown could not complete enough research because one or more research providers were unavailable. We will retry automatically; this is not a judgment about your business idea.'
      : 'GhostTown completed the available research paths but did not verify enough independent evidence across the required roles to build a reliable 30-Day Sprint yet.';
  }
}

export function classifyResearchShortfall(
  attempts: ResearchAttemptLike[],
  code?: ResearchShortfallCode
): Exclude<ResearchOutcome, 'COMPLETE'> {
  const providerFailure = attempts.some(attempt => {
    if (attempt.outcome === 'NO_RESULTS' || attempt.outcome === 'SOURCE_VERIFICATION_FAILED') return false;
    if (attempt.outcome === 'RATE_LIMITED'
      || attempt.outcome === 'QUOTA_EXHAUSTED'
      || attempt.outcome === 'PAYMENT_REQUIRED'
      || attempt.outcome === 'TEMPORARY_PROVIDER_FAILURE'
      || attempt.outcome === 'PERMANENT_PROVIDER_FAILURE') return true;
    return !attempt.outcome && !attempt.success;
  });
  if (!providerFailure) return 'INSUFFICIENT_EVIDENCE';

  // Capacity is genuinely blocking when too few provider tasks/types can run.
  if (code === 'MIN_SUCCESSFUL_PROVIDER_TASKS' || code === 'MIN_PROVIDER_TYPES') {
    return 'PROVIDER_BLOCKED';
  }

  // After alternate providers have produced verified evidence from at least two
  // independent provider types, a remaining evidence shortfall is a market
  // evidence result, not an infrastructure judgment.
  const successfulProviderTypes = new Set(
    attempts
      .filter(attempt => attempt.success || attempt.outcome === 'SUCCESS')
      .map(attempt => attempt.sourceType)
  ).size;
  return successfulProviderTypes >= 2 ? 'INSUFFICIENT_EVIDENCE' : 'PROVIDER_BLOCKED';
}

export function researchShortfallError(
  code: ResearchShortfallCode,
  detail: string,
  attempts: ResearchAttemptLike[]
): ResearchOutcomeError {
  return new ResearchOutcomeError({
    outcome: classifyResearchShortfall(attempts, code),
    code,
    detail,
    attempts
  });
}

export function isResearchOutcomeError(
  error: unknown,
  outcome?: Exclude<ResearchOutcome, 'COMPLETE'>
): error is ResearchOutcomeError {
  return error instanceof ResearchOutcomeError && (!outcome || error.outcome === outcome);
}
