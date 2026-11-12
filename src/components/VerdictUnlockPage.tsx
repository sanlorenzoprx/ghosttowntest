import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/api';
import {
  ASSESSMENT_PACK_CREDITS,
  ASSESSMENT_PACK_DISPLAY_PRICE
} from '../lib/assessmentPack';
import type { EvaluationDraft } from '../lib/storage';
import type { PublicUserData } from '../types/auth';
import type { Locale } from '../lib/locale';

type UnlockCopy = {
  yourIdea: string;
  stillConfirming: string;
  unavailable: string;
  failed: string;
  stillBeingConfirmed: string;
  savedKicker: string;
  usedKicker: string;
  heading: string;
  finishedBefore: string;
  finishedAfter: string;
  usedBody: string;
  pack: string;
  packNote: string;
  cancelled: string;
  cancelledSaved: string;
  cancelledLater: string;
  received: string;
  confirming: string;
  seeSaved: string;
  opening: string;
  buy: string;
  loginToBuy: string;
  footSaved: string;
  footNext: string;
};

const COPY: Record<Locale, UnlockCopy> = {
  en: {
    yourIdea: 'your idea',
    stillConfirming: 'Payment was received, but GhostTown is still confirming your verdict credits. Try again in a moment.',
    unavailable: 'Checkout is not available right now',
    failed: 'Checkout failed',
    stillBeingConfirmed: 'Your payment is still being confirmed. Your answers are safe. Try again in a moment.',
    savedKicker: 'Your answers are saved',
    usedKicker: 'Your free verdict has been used',
    heading: 'You’re out of free verdicts.',
    finishedBefore: 'You finished the questions for',
    finishedAfter: `Buy ${ASSESSMENT_PACK_CREDITS} verdicts for ${ASSESSMENT_PACK_DISPLAY_PRICE}, then GhostTown will finish this saved second verdict.`,
    usedBody: `You’ve used your free verdict. Buy ${ASSESSMENT_PACK_CREDITS} more verdicts for ${ASSESSMENT_PACK_DISPLAY_PRICE} to continue.`,
    pack: `${ASSESSMENT_PACK_CREDITS} verdicts · ${ASSESSMENT_PACK_DISPLAY_PRICE}`,
    packNote: `One-time purchase. No subscription. This second verdict uses one of the ${ASSESSMENT_PACK_CREDITS}, so you’ll have 9 verdicts left after it is completed.`,
    cancelled: 'Checkout was cancelled.',
    cancelledSaved: 'Your second verdict is still saved.',
    cancelledLater: 'You can continue with verdict #2 whenever you’re ready.',
    received: 'Payment received. Confirming your verdict credits, then finishing your saved second verdict…',
    confirming: 'Confirming payment…',
    seeSaved: 'See My Saved Verdict',
    opening: 'Opening secure checkout…',
    buy: `Buy ${ASSESSMENT_PACK_CREDITS} Verdicts — ${ASSESSMENT_PACK_DISPLAY_PRICE}`,
    loginToBuy: 'Log In to Buy Verdicts',
    footSaved: 'Your saved answers stay on this device. After payment, GhostTown finishes this same verdict.',
    footNext: 'Your next verdict continues after payment is confirmed.'
  },
  es: {
    yourIdea: 'tu idea',
    stillConfirming: 'Recibimos tu pago, pero GhostTown todavía está confirmando tus veredictos. Inténtalo otra vez en un momento.',
    unavailable: 'El pago no está disponible ahora mismo',
    failed: 'El pago falló',
    stillBeingConfirmed: 'Todavía estamos confirmando tu pago. Tus respuestas están seguras. Inténtalo otra vez en un momento.',
    savedKicker: 'Tus respuestas están guardadas',
    usedKicker: 'Ya usaste tu veredicto gratis',
    heading: 'Se te acabaron los veredictos gratis.',
    finishedBefore: 'Terminaste las preguntas de',
    finishedAfter: `Compra ${ASSESSMENT_PACK_CREDITS} veredictos por ${ASSESSMENT_PACK_DISPLAY_PRICE} y GhostTown termina este segundo veredicto que dejaste guardado.`,
    usedBody: `Ya usaste tu veredicto gratis. Compra ${ASSESSMENT_PACK_CREDITS} veredictos más por ${ASSESSMENT_PACK_DISPLAY_PRICE} para seguir.`,
    pack: `${ASSESSMENT_PACK_CREDITS} veredictos · ${ASSESSMENT_PACK_DISPLAY_PRICE}`,
    packNote: `Un solo pago. Sin suscripción. Este segundo veredicto usa uno de los ${ASSESSMENT_PACK_CREDITS}, así que te quedan 9 veredictos cuando termine.`,
    cancelled: 'Cancelaste el pago.',
    cancelledSaved: 'Tu segundo veredicto sigue guardado.',
    cancelledLater: 'Puedes seguir con el veredicto #2 cuando quieras.',
    received: 'Recibimos tu pago. Estamos confirmando tus veredictos y luego terminamos el segundo veredicto que dejaste guardado…',
    confirming: 'Confirmando el pago…',
    seeSaved: 'Ver mi veredicto guardado',
    opening: 'Abriendo el pago seguro…',
    buy: `Comprar ${ASSESSMENT_PACK_CREDITS} veredictos — ${ASSESSMENT_PACK_DISPLAY_PRICE}`,
    loginToBuy: 'Entra para comprar veredictos',
    footSaved: 'Tus respuestas guardadas se quedan en este dispositivo. Después del pago, GhostTown termina este mismo veredicto.',
    footNext: 'Tu próximo veredicto sigue cuando se confirme el pago.'
  }
};

interface Props {
  draft: EvaluationDraft | null;
  isLoggedIn: boolean;
  purchaseReturn: 'success' | 'cancelled' | null;
  onLoginClick: () => void;
  onCreditsReady: () => void;
  locale?: Locale;
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
  onCreditsReady,
  locale = 'en'
}: Props) {
  const t = COPY[locale];
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(purchaseReturn === 'success');
  const [error, setError] = useState('');
  const ideaName = useMemo(() => draft?.idea.ideaName?.trim() || t.yourIdea, [draft, t]);

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
        setError(t.stillConfirming);
      }
    };

    void confirm();
    return () => { cancelled = true; };
  }, [purchaseReturn, isLoggedIn, onCreditsReady, t]);

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
        throw new Error(body.error || t.unavailable);
      }
      window.location.assign(body.sessionUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.failed);
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
    setError(t.stillBeingConfirmed);
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-3xl border border-white bg-white p-6 shadow-pop sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-ghost-rust">
          {draft ? t.savedKicker : t.usedKicker}
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-ghost-ink">
          {t.heading}
        </h1>
        <p className="mt-5 text-lg leading-8 text-gray-700">
          {draft
            ? <>{t.finishedBefore} <strong>{ideaName}</strong>. {t.finishedAfter}</>
            : t.usedBody}
        </p>

        <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-3xl font-black text-blue-950">{t.pack}</p>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            {t.packNote}
          </p>
        </div>

        {purchaseReturn === 'cancelled' && (
          <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t.cancelled} {draft ? t.cancelledSaved : t.cancelledLater}
          </p>
        )}

        {purchaseReturn === 'success' && checkingPayment && (
          <p role="status" className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950">
            {t.received}
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
            {checkingPayment ? t.confirming : t.seeSaved}
          </button>
        ) : (
          <button
            type="button"
            onClick={isLoggedIn ? openCheckout : onLoginClick}
            disabled={openingCheckout}
            className="mt-7 w-full rounded-lg bg-ghost-rust px-5 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {openingCheckout
              ? t.opening
              : isLoggedIn
                ? t.buy
                : t.loginToBuy}
          </button>
        )}

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          {draft
            ? t.footSaved
            : t.footNext}
        </p>
      </div>
    </section>
  );
}
