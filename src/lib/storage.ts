import { EvaluationAnswers, EvaluationResult, IdeaIntake } from '../types/lit';

const LATEST_RESULT_KEY = 'lit_latest_result_v1';
const USER_TOKEN_KEY = 'lit_user_token_v1';
const TESTS_USED_KEY = 'lit_tests_used_v1';
const EVALUATION_DRAFT_KEY = 'lit_evaluation_draft_v1';

export interface EvaluationDraft {
  idea: IdeaIntake;
  answers: EvaluationAnswers;
  currentIndex: number;
  updatedAt: string;
}

// ============ RESULT STORAGE ============
export function saveLatestResult(result: EvaluationResult): void {
  try {
    localStorage.setItem(LATEST_RESULT_KEY, JSON.stringify(result));
  } catch (error) {
    console.error('Failed to save result:', error);
  }
}

export function loadLatestResult(): EvaluationResult | null {
  try {
    const data = localStorage.getItem(LATEST_RESULT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load result:', error);
    return null;
  }
}

export function clearLatestResult(): void {
  try {
    localStorage.removeItem(LATEST_RESULT_KEY);
  } catch (error) {
    console.error('Failed to clear result:', error);
  }
}

// ============ IN-PROGRESS EVALUATION ============
export function saveEvaluationDraft(
  idea: IdeaIntake,
  answers: EvaluationAnswers,
  currentIndex: number
): EvaluationDraft {
  const draft: EvaluationDraft = {
    idea,
    answers,
    currentIndex,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(EVALUATION_DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save evaluation progress:', error);
  }
  return draft;
}

export function loadEvaluationDraft(): EvaluationDraft | null {
  try {
    const data = localStorage.getItem(EVALUATION_DRAFT_KEY);
    if (!data) return null;
    const draft = JSON.parse(data) as Partial<EvaluationDraft>;
    if (!draft.idea || !draft.answers || typeof draft.currentIndex !== 'number' || !draft.updatedAt) {
      clearEvaluationDraft();
      return null;
    }
    return draft as EvaluationDraft;
  } catch (error) {
    console.error('Failed to load evaluation progress:', error);
    return null;
  }
}

export function clearEvaluationDraft(): void {
  try {
    localStorage.removeItem(EVALUATION_DRAFT_KEY);
  } catch (error) {
    console.error('Failed to clear evaluation progress:', error);
  }
}

// ============ AUTH TOKEN STORAGE ============
export function saveAuthToken(token: string): void {
  try {
    localStorage.setItem(USER_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

export function loadAuthToken(): string | null {
  try {
    return localStorage.getItem(USER_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to load token:', error);
    return null;
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(USER_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

// ============ TEST TRACKING ============
export function incrementTestsUsed(): number {
  try {
    const current = localStorage.getItem(TESTS_USED_KEY);
    const count = current ? parseInt(current) : 0;
    const newCount = count + 1;
    localStorage.setItem(TESTS_USED_KEY, String(newCount));
    return newCount;
  } catch (error) {
    console.error('Failed to increment tests:', error);
    return 0;
  }
}

export function getTestsUsed(): number {
  try {
    const current = localStorage.getItem(TESTS_USED_KEY);
    return current ? parseInt(current) : 0;
  } catch (error) {
    console.error('Failed to get tests used:', error);
    return 0;
  }
}

export function resetTestsUsed(): void {
  try {
    localStorage.setItem(TESTS_USED_KEY, '0');
  } catch (error) {
    console.error('Failed to reset tests:', error);
  }
}

// ============ AVAILABLE TESTS CALCULATION ============
// Anonymous visitors receive one browser-tracked assessment.
// Registered share rewards and purchases are enforced by the Worker.
export function getAvailableTestsLocally(): number {
  const testsUsed = getTestsUsed();
  const freeTestsAvailable = Math.max(0, 1 - testsUsed);
  return freeTestsAvailable;
}

// Check if user has hit free tier limit (used 1 free test)
export function hasHitFreeTierLimit(): boolean {
  return getTestsUsed() >= 1;
}
