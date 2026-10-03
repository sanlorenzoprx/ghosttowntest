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

describe('pay-before-second-verdict journey', () => {
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

  it('redirects an authenticated zero-credit customer to payment before verdict #2 continues', () => {
    expect(app).not.toContain('const canBeginAssessment = () => hasAvailableTest() || isLoggedIn;');
    expect(app).toContain('if (isLoggedIn) {');
    expect(app).toContain('if (!user) return false;');
    expect(app).toContain('if (!hasAvailableTest()) {');
    expect(app).toContain('if (isLoggedIn) openVerdictPurchasePage();');
    expect(app).toContain("updatePath('/unlock-verdict');");
    expect(app).toContain('onAllowanceRequired={handleAllowanceRequired}');
  });

  it('resumes the second paid verdict only after Stripe credits are confirmed', () => {
    expect(unlockPage).toContain("purchaseReturn !== 'success'");
    expect(unlockPage).toContain('availableTests(body.user) > 0');
    expect(app).toContain('setAutoSubmitPendingVerdict(true)');
    expect(questionFlow).toContain('autoSubmitCompleteDraft');
    expect(questionFlow).toContain('litQuestions.every(question => answers[question.id] !== undefined)');
  });

  it('shows the promised pay-first customer flow and counting rules', () => {
    expect(unlockPage).toContain('Your free verdict has been used');
    expect(unlockPage).toContain('Complete payment to continue with verdict #2');
    expect(unlockPage).toContain('Verdict #2 uses one of the');
    expect(unlockPage).toContain('9 verdicts left after it is completed');
  });
});
