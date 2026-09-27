export type ResearchOutcome = 'COMPLETE' | 'INSUFFICIENT_EVIDENCE' | 'PROVIDER_BLOCKED';

export type ResearchShortfallCode =
  | 'MIN_SUCCESSFUL_PROVIDER_TASKS'
  | 'MIN_PROVIDER_TYPES'
  | 'MIN_VERIFIED_CANDIDATES'
  | 'MIN_CURRENT_CUSTOMER_ACCESS'
  | 'RESEARCH_QUALITY_GATE';

export interface ResearchAttemptLike {
  sourceType: string;
  success: boolean;
  candidateCount: number;
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
      : 'GhostTown completed the available research paths but did not verify enough evidence to build a reliable 30-Day Sprint yet.';
  }
}

export function classifyResearchShortfall(
  attempts: ResearchAttemptLike[]
): Exclude<ResearchOutcome, 'COMPLETE'> {
  return attempts.some(attempt => !attempt.success)
    ? 'PROVIDER_BLOCKED'
    : 'INSUFFICIENT_EVIDENCE';
}

export function researchShortfallError(
  code: ResearchShortfallCode,
  detail: string,
  attempts: ResearchAttemptLike[]
): ResearchOutcomeError {
  return new ResearchOutcomeError({
    outcome: classifyResearchShortfall(attempts),
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
