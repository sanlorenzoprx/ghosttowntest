import type { VerdictData } from './lit';

export type { VerdictData };

export interface VerdictValidation {
  valid: boolean;
  errors: string[];
}

export interface VerdictCache {
  ideaHash: string;
  result: any;
  cachedAt: string;
  expiresAt: string;
}

export interface VerdictRequest {
  idea: {
    ideaName: string;
    description: string;
    targetUser: string;
    painfulProblem: string;
    currentAlternative: string;
    motivation: string;
  };
  answers: { [key: string]: number | string };
}

export interface VerdictResponse {
  success: boolean;
  data?: VerdictData;
  error?: string;
}
