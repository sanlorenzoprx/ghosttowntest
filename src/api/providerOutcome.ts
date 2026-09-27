export type ProviderOutcome =
  | 'SUCCESS'
  | 'NO_RESULTS'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'PAYMENT_REQUIRED'
  | 'TEMPORARY_PROVIDER_FAILURE'
  | 'PERMANENT_PROVIDER_FAILURE'
  | 'SOURCE_VERIFICATION_FAILED';

export class ProviderRequestError extends Error {
  readonly provider: string;
  readonly outcome: Exclude<ProviderOutcome, 'SUCCESS' | 'NO_RESULTS' | 'SOURCE_VERIFICATION_FAILED'>;
  readonly httpStatus?: number;
  readonly retryAfterSeconds?: number;

  constructor(options: {
    provider: string;
    outcome: ProviderRequestError['outcome'];
    message: string;
    httpStatus?: number;
    retryAfterSeconds?: number;
  }) {
    super(options.message);
    this.name = 'ProviderRequestError';
    this.provider = options.provider;
    this.outcome = options.outcome;
    this.httpStatus = options.httpStatus;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

function retryAfterSeconds(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.ceil(numeric);
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return undefined;
  return Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

function messageFromBody(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  try {
    const parsed = JSON.parse(compact) as {
      error?: string | { message?: string; status?: string };
      message?: string;
      status_message?: string;
    };
    if (typeof parsed.error === 'string') return parsed.error;
    return parsed.error?.message || parsed.message || parsed.status_message || compact.slice(0, 500);
  } catch {
    return compact.slice(0, 500);
  }
}

export function classifyProviderHttpOutcome(status: number, body = ''): ProviderRequestError['outcome'] {
  const lower = body.toLowerCase();
  if (status === 402) return 'PAYMENT_REQUIRED';
  if ((status === 403 || status === 429) && /quota|daily limit|resource exhausted|exceeded/.test(lower)) {
    return 'QUOTA_EXHAUSTED';
  }
  if (status === 429) return 'RATE_LIMITED';
  if (status === 408 || status === 425 || status >= 500) return 'TEMPORARY_PROVIDER_FAILURE';
  return 'PERMANENT_PROVIDER_FAILURE';
}

export function classifyProviderMessageOutcome(message: string): ProviderRequestError['outcome'] {
  const lower = message.toLowerCase();
  if (/payment required|insufficient (?:funds|credits)|billing/.test(lower)) return 'PAYMENT_REQUIRED';
  if (/quota|daily limit|resource exhausted/.test(lower)) return 'QUOTA_EXHAUSTED';
  if (/rate limit|too many requests/.test(lower)) return 'RATE_LIMITED';
  if (/timeout|timed out|temporar|unavailable|try again|connection/.test(lower)) return 'TEMPORARY_PROVIDER_FAILURE';
  return 'PERMANENT_PROVIDER_FAILURE';
}

export function providerHttpError(
  provider: string,
  status: number,
  body: string,
  retryAfter?: string | null
): ProviderRequestError {
  const detail = messageFromBody(body);
  return new ProviderRequestError({
    provider,
    outcome: classifyProviderHttpOutcome(status, body),
    message: `${provider} returned HTTP ${status}${detail ? `: ${detail}` : ''}`,
    httpStatus: status,
    retryAfterSeconds: retryAfterSeconds(retryAfter)
  });
}

export function providerSemanticError(provider: string, message: string): ProviderRequestError {
  return new ProviderRequestError({
    provider,
    outcome: classifyProviderMessageOutcome(message),
    message
  });
}

export function isProviderRequestError(error: unknown): error is ProviderRequestError {
  return error instanceof ProviderRequestError;
}

export function isRetryableProviderOutcome(outcome: ProviderOutcome): boolean {
  return outcome === 'RATE_LIMITED' || outcome === 'TEMPORARY_PROVIDER_FAILURE';
}

export function opensProviderCircuit(outcome: ProviderOutcome): boolean {
  return outcome === 'QUOTA_EXHAUSTED'
    || outcome === 'PAYMENT_REQUIRED'
    || outcome === 'PERMANENT_PROVIDER_FAILURE';
}
