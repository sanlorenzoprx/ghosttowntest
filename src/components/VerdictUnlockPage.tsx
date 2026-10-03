import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/api';
import {
  ASSESSMENT_PACK_CREDITS,
  ASSESSMENT_PACK_DISPLAY_PRICE
} from '../lib/assessmentPack';
import type { EvaluationDraft } from '../lib/storage';
import type { PublicUserData } from '../types/auth';

interface Props {
  draft: EvaluationDraft | null;
  isLoggedIn: boolean;
  purchaseReturn: 'success' | 'cancelled' | null;
  onLoginClick: () => void;
  onCreditsReady: () => void;
}

function availableTests(user: PublicUserData): number {
  return Math.max(
    0,
    1 + Number(user.testsPurchased || 0) + Math.min(Number(user.shareCredits || 0), 1) - Number(user.testsUsed || 0)
  );
}

export default function VerdictUnlockPage({
  draft,
  isLoggedIn,
  purchaseReturn,
  onLoginClick,
  onCreditsReady
}: Props) {
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(purchaseReturn === 'success');
  const [error, setError] = useState('');
  const ideaName = useMemo(() => draft?.idea.ideaName?.trim() || 'your idea', [draft]);

  const verifyCredits = async (): Promise<boolean> => {
    const token = localStorage.getItem('lit_user_token_v1');
    if (!token) return false;
    const response = await fetch(apiUrl('/api/auth/verify'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return false;
    const body = await response.json<{ user?: PublicUserData }>();
    return Boolean(body.user && availableTests(body.user) > 0);
  };

  useEffect(() => {
    if (purchaseReturn !== 'success' || !isLoggedIn) return;
    let cancelled = false;

    const confirm = async () => {
      setCheckingPayment(true);
      setError('');
      for (let attempt = 0; attempt < 20 && !cancelled; attempt += 1) {
        if (await verifyCredits()) {
          if (!cancelled) onCreditsReady();
          return;
        }
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (!cancelled) {
        setCheckingPayment(false);
        setError('Payment was received, but GhostTown is still confirming your verdict credits. Try again in a moment.');
      }
    };

    void confirm();
    return () => { cancelled = true; };
  }, [purchaseReturn, isLoggedIn, onCreditsReady]);

  const openCheckout = async () => {
    const token = localStorage.getItem('lit_user_token_v1');
    if (!token) {
      onLoginClick();
      return;
    }

    setOpeningCheckout(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resumePendingVerdict: true })
      });
      const body = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !body.sessionUrl) {
        throw new Error(body.error || 'Checkout is not available right now');
      }
      window.location.assign(body.sessionUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed');
      setOpeningCheckout(false);
    }
  };

  const retryConfirmation = async () => {
    setCheckingPayment(true);
    setError('');
    if (await verifyCredits()) {
      onCreditsReady();
      return;
    }
    setCheckingPayment(false);
    setError('Your payment is still being confirmed. Your answers are safe. Try again in a moment.');
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-ghost-ink bg-white p-6 shadow-lg sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-ghost-rust">
          {draft ? 'Your second verdict is saved' : 'Your free verdict has been used'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-ghost-ink">
          Get {ASSESSMENT_PACK_CREDITS} more verdicts for {ASSESSMENT_PACK_DISPLAY_PRICE}.
        </h1>
        <p className="mt-5 text-lg leading-8 text-gray-700">
          {draft
            ? <>Your test for <strong>{ideaName}</strong> is waiting for you. Complete payment, then GhostTown will resume that second verdict from where you left off.</>
            : <>You’ve used your free verdict. Complete payment to continue with verdict #2 and get {ASSESSMENT_PACK_CREDITS} paid verdicts.</>}
        </p>

        <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-3xl font-black text-blue-950">{ASSESSMENT_PACK_CREDITS} verdicts · {ASSESSMENT_PACK_DISPLAY_PRICE}</p>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            One-time purchase. No subscription. Verdict #2 uses one of the {ASSESSMENT_PACK_CREDITS}, so you’ll have 9 verdicts left after it is completed.
          </p>
        </div>

        {purchaseReturn === 'cancelled' && (
          <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Checkout was cancelled. {draft ? 'Your second verdict is still saved.' : 'You can continue with verdict #2 whenever you’re ready.'}
          </p>
        )}

        {purchaseReturn === 'success' && checkingPayment && (
          <p role="status" className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950">
            Payment received. Confirming your verdict credits, then resuming verdict #2…
          </p>
        )}

        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {purchaseReturn === 'success' ? (
          <button
            type="button"
            onClick={retryConfirmation}
            disabled={checkingPayment}
            className="mt-7 w-full rounded-lg bg-ghost-rust px-5 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {checkingPayment ? 'Confirming payment…' : 'See My Saved Verdict'}
          </button>
        ) : (
          <button
            type="button"
            onClick={isLoggedIn ? openCheckout : onLoginClick}
            disabled={openingCheckout}
            className="mt-7 w-full rounded-lg bg-ghost-rust px-5 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {openingCheckout
              ? 'Opening secure checkout…'
              : isLoggedIn
                ? `Continue Verdict #2 + ${ASSESSMENT_PACK_CREDITS} Verdicts — ${ASSESSMENT_PACK_DISPLAY_PRICE}`
                : 'Log In to Continue Verdict #2'}
          </button>
        )}

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          {draft
            ? 'Your saved StoryFactory answers stay on this device. After payment, GhostTown resumes that same verdict.'
            : 'Payment unlocks verdict #2 before any additional assessment is completed.'}
        </p>
      </div>
    </section>
  );
}
