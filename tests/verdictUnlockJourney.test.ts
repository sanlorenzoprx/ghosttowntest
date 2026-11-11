import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_PACK_AMOUNT_CENTS,
  ASSESSMENT_PACK_CREDITS,
  ASSESSMENT_PACK_DISPLAY_PRICE
} from '../src/lib/assessmentPack';

const checkout = readFileSync(new URL('../src/api/checkout.ts', import.meta.url), 'utf8');
const questionFlow = readFileSync(new URL('../src/components/QuestionFlow.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const unlockPage = readFileSync(new URL('../src/components/VerdictUnlockPage.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/components/UserDashboard.tsx', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../src/components/LandingCommercial.tsx', import.meta.url), 'utf8');

describe('finish-second-test-then-pay journey', () => {
  it('locks the assessment pack commercial contract to 10 verdicts for $14.95', () => {
    expect(ASSESSMENT_PACK_CREDITS).toBe(10);
    expect(ASSESSMENT_PACK_AMOUNT_CENTS).toBe(1495);
    expect(ASSESSMENT_PACK_DISPLAY_PRICE).toBe('$14.95');
  });

  it('uses exact Stripe price_data and returns pending verdict purchases to the unlock route', () => {
    expect(checkout).toContain("'line_items[0][price_data][unit_amount]': String(ASSESSMENT_PACK_AMOUNT_CENTS)");
    expect(checkout).toContain("const returnPath = resumePendingVerdict ? '/unlock-verdict' : '/'");
    expect(checkout).toContain("'metadata[resume_pending_verdict]': resumePendingVerdict ? 'true' : 'false'");
    expect(checkout).toContain("'metadata[test_credits]': String(ASSESSMENT_PACK_CREDITS)");
  });

  it('turns a server 402 into the dedicated unlock journey without clearing the saved draft', () => {
    expect(questionFlow).toContain("response.status === 402 && body.error === 'No tests remaining'");
    expect(questionFlow).toContain('onAllowanceRequired();');
    expect(questionFlow).not.toMatch(/response\.status === 402[\s\S]{0,250}clearEvaluationDraft\(\)/);
    expect(app).toContain("if (pathname === '/unlock-verdict') return 'unlock-verdict';");
  });

  it('starts another verdict as a fresh assessment instead of reopening a completed unpaid draft', () => {
    expect(app).toContain('const canBeginAssessment = () => hasAvailableTest() || isLoggedIn;');
    expect(app).toContain('const startFreshAssessment = (exampleSlug?: string) => {');
    expect(app).toContain('clearEvaluationDraft();');
    expect(app).toContain('setResumeDraft(null);');
    expect(app).not.toContain('hasCompletedPendingDraft');
    expect(app).not.toMatch(/const handleStartTest[\s\S]{0,350}openVerdictPurchasePage\(\)/);
    expect(app).toContain('const handleStartTest = () => startFreshAssessment();');
    expect(app).toContain('const handleSelectExample = (slug: string) => startFreshAssessment(slug);');
    expect(app).toContain('onAllowanceRequired={handleAllowanceRequired}');
  });

  it('keeps Resume distinct from Start Another Verdict', () => {
    expect(app).toContain('if (isLoggedIn && !hasAvailableTest() && isDraftComplete(resumeDraft))');
    expect(app).toContain('openVerdictPurchasePage();');
    expect(app).toContain("setScreen('questions');");
  });

  it('shows a dashboard resume button only when a saved verdict draft exists', () => {
    expect(dashboard).toContain('hasDraft: boolean;');
    expect(dashboard).toContain('onResume: () => void;');
    expect(dashboard).toContain('{hasDraft && (');
    expect(dashboard).toContain('onClick={onResume}');
    expect(dashboard).toContain('Resume Saved Verdict');
    expect(app).toContain('hasDraft={Boolean(resumeDraft)}');
    expect(app).toContain('onResume={handleResume}');
  });

  it('opens the verdict intake directly from the dashboard without a zero-credit explainer or buy-first CTA', () => {
    expect(dashboard).toContain('onClick={onStart}');
    expect(dashboard).toContain('Start Another Verdict');
    expect(dashboard).not.toContain('You can still complete your next test. You only pay when you ask for the verdict.');
    expect(dashboard).not.toContain('Complete your next GhostTown test before you buy anything.');
    expect(dashboard).not.toContain('Buy 10 Assessments — $14.97');
    expect(dashboard).not.toContain('onBuy: () => void;');
  });

  it('labels returning landing-page CTAs as another verdict instead of another free verdict', () => {
    expect(landing).toContain('hasUsedFreeVerdict: boolean;');
    expect(landing).toContain('const isReturningVerdictCustomer = isLoggedIn && hasUsedFreeVerdict;');
    expect(landing).toContain("'Test Another Idea'");
    expect(landing).toContain("'Start Another Verdict'");
    expect(landing).toContain("'Complete the test first · Pay only when you ask for the verdict'");
  });

  it('resumes the completed second verdict only after Stripe credits are confirmed', () => {
    expect(unlockPage).toContain("purchaseReturn !== 'success'");
    expect(unlockPage).toContain('availableTests(body.user) > 0');
    expect(app).toContain('setAutoSubmitPendingVerdict(');
    expect(app).toContain('litQuestions.every(question => draft.answers[question.id] !== undefined)');
    expect(questionFlow).toContain('autoSubmitCompleteDraft');
    expect(questionFlow).toContain('litQuestions.every(question => answers[question.id] !== undefined)');
  });

  it('shows the exact paid verdict balance after verdict #2 is generated', () => {
    expect(app).toContain('setPaidVerdictResumeActive(true)');
    expect(app).toContain('if (paidVerdictResumeActive)');
    expect(app).toContain('You have used 1 of your 10 verdicts.');
    expect(app).toContain('You have 9 verdicts left to explore your business ideas.');
  });

  it('shows the out-of-free-verdicts offer only after the second test is saved', () => {
    expect(unlockPage).toContain('Your answers are saved');
    expect(unlockPage).toContain('You’re out of free verdicts.');
    expect(unlockPage).toContain('You finished the questions for');
    expect(unlockPage).toContain('Buy ${ASSESSMENT_PACK_CREDITS} Verdicts — ${ASSESSMENT_PACK_DISPLAY_PRICE}');
    expect(unlockPage).toContain('This second verdict uses one of the');
    expect(unlockPage).toContain('9 verdicts left after it is completed');
  });
});
