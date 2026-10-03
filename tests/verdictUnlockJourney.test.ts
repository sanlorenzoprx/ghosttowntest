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

describe('completed verdict unlock journey', () => {
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

  it('lets an authenticated zero-credit customer finish another assessment before the paywall', () => {
    expect(app).toContain('const canBeginAssessment = () => hasAvailableTest() || isLoggedIn;');
    expect(app).toContain('onAllowanceRequired={handleAllowanceRequired}');
  });

  it('resubmits the complete saved draft after Stripe credits are confirmed', () => {
    expect(unlockPage).toContain("purchaseReturn !== 'success'");
    expect(unlockPage).toContain('availableTests(body.user) > 0');
    expect(app).toContain('setAutoSubmitPendingVerdict(true)');
    expect(questionFlow).toContain('autoSubmitCompleteDraft');
    expect(questionFlow).toContain('litQuestions.every(question => answers[question.id] !== undefined)');
  });

  it('shows the promised customer-facing saved-work and counting rules', () => {
    expect(unlockPage).toContain('Your answers are saved');
    expect(unlockPage).toContain('You’ve used your free verdict.');
    expect(unlockPage).toContain('This pending verdict uses one of the');
    expect(unlockPage).toContain('9 verdicts left after it opens');
  });
});
