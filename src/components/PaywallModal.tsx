import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { apiUrl } from '../lib/api';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';

interface Props {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onClose: () => void;
  context?: 'allowance' | 'plan-declined';
}

type PaywallLocale = 'en' | 'es';

const paywallCopy = {
  en: {
    allowanceTitle: 'Keep testing before you build',
    planDeclinedTitle: 'Keep exploring before you commit',
    allowanceBody: 'Your current free verdict allowance has been used. You can either sign in to recover/share supported results, or buy additional verdict credits.',
    planDeclinedBody: 'Not ready for the paid Launch Blueprint yet? You can still buy additional verdict credits and keep testing ideas before committing to a longer evidence sprint.',
    verdictPackTitle: 'Verdict Pack',
    verdictPackPrice: '10 assessments · $14.97',
    verdictPackBody: 'One-time purchase for additional free-product-style verdicts. This does not include the Launch Blueprint.',
    blueprintTitle: GHOSTTOWN_30_DAY_PLAN_V1.name,
    blueprintBody: 'The Launch Blueprint is a separate paid continuation from a verdict into research, seed confirmation, fulfillment status, and ready-state artifacts.',
    shareTitle: 'Share reward where supported',
    shareBody: 'Registered members may unlock a bonus assessment only after the current share-credit logic confirms the reward. Sharing is not pre-counted here.',
    loginBody: 'Log in or sign up before checkout so the purchase can be associated with your account.',
    openCheckout: 'Buy 10 Assessments — $14.97',
    login: 'Log in or sign up',
    loading: 'Opening checkout…',
    close: 'Not now',
    closeLabel: 'Close product options',
    errorFallback: 'Checkout failed'
  },
  es: {
    allowanceTitle: 'Sigue probando antes de construir',
    planDeclinedTitle: 'Sigue explorando antes de comprometerte',
    allowanceBody: 'Tu cupo actual de veredictos gratuitos se usó. Puedes iniciar sesión para recuperar/compartir resultados compatibles, o comprar créditos adicionales de veredictos.',
    planDeclinedBody: '¿Aún no estás listo para el Launch Blueprint pagado? Puedes comprar créditos adicionales de veredictos y seguir probando ideas antes de comprometerte con un sprint de evidencia más largo.',
    verdictPackTitle: 'Paquete de veredictos',
    verdictPackPrice: '10 evaluaciones · $14.97',
    verdictPackBody: 'Compra única para veredictos adicionales del estilo del producto gratuito. Esto no incluye el Launch Blueprint.',
    blueprintTitle: GHOSTTOWN_30_DAY_PLAN_V1.name,
    blueprintBody: 'El Launch Blueprint es una continuación pagada separada desde un veredicto hacia investigación, confirmación de semillas, estado de fulfillment y artefactos cuando esté listo.',
    shareTitle: 'Recompensa por compartir donde esté disponible',
    shareBody: 'Los miembros registrados pueden desbloquear una evaluación extra solo después de que la lógica actual de crédito por compartir confirme la recompensa. Compartir no se cuenta por adelantado aquí.',
    loginBody: 'Inicia sesión o regístrate antes del checkout para que la compra pueda asociarse con tu cuenta.',
    openCheckout: 'Comprar 10 evaluaciones — $14.97',
    login: 'Iniciar sesión o registrarse',
    loading: 'Abriendo checkout…',
    close: 'Ahora no',
    closeLabel: 'Cerrar opciones de producto',
    errorFallback: 'El checkout falló'
  }
};

function paywallLocale(): PaywallLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

const dialogFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function dialogFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter(element => (
    !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0
  ));
}

function containDialogFocus(event: ReactKeyboardEvent<HTMLElement>, dialog: HTMLElement | null) {
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = dialogFocusableElements(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export default function PaywallModal({ isLoggedIn, onLoginClick, onClose, context = 'allowance' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const locale = paywallLocale();
  const text = paywallCopy[locale];
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const initial = dialog.querySelector<HTMLElement>('[data-modal-initial-focus]') ?? dialogFocusableElements(dialog)[0] ?? dialog;
      initial.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !loading) {
      event.preventDefault();
      onClose();
      return;
    }
    containDialogFocus(event, dialogRef.current);
  };

  const handlePurchase = async () => {
    const token = localStorage.getItem('lit_user_token_v1');
    if (!token) {
      onLoginClick();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json<{ sessionUrl?: string; error?: string }>();
      if (!response.ok || !data.sessionUrl) {
        throw new Error(data.error || 'Checkout is not available right now');
      }
      window.location.assign(data.sessionUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.errorFallback);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="paywall-title" aria-describedby="paywall-description" tabIndex={-1} onKeyDown={handleDialogKeyDown} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus:outline-none sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-rust">{context === 'plan-declined' ? GHOSTTOWN_30_DAY_PLAN_V1.name : text.verdictPackTitle}</p>
            <h2 id="paywall-title" className="mt-1 break-words text-2xl font-bold text-ghost-ink">{context === 'plan-declined' ? text.planDeclinedTitle : text.allowanceTitle}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label={text.closeLabel} className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-2xl leading-none text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 disabled:opacity-50">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p id="paywall-description" className="mt-3 text-sm leading-6 text-gray-600">
          {context === 'plan-declined' ? text.planDeclinedBody : text.allowanceBody}
        </p>

        <div className="mt-6 grid gap-3">
          <section className="rounded-lg border border-ghost-rust/25 bg-[#fff7f2] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">{text.verdictPackTitle}</p>
            <div className="mt-1 break-words text-2xl font-bold text-ghost-ink">{text.verdictPackPrice}</div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{text.verdictPackBody}</p>
          </section>

          <section className="rounded-lg border border-ghost-forest/20 bg-[#eef3ef] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-forest">{text.blueprintTitle}</p>
            <div className="mt-1 text-lg font-bold text-ghost-ink">{displayPrice}</div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{text.blueprintBody}</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">{text.shareTitle}</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{text.shareBody}</p>
          </section>
        </div>

        {!isLoggedIn && <p className="mt-4 rounded-lg border border-ghost-gold/40 bg-[#fffaf0] p-3 text-sm leading-6 text-amber-900">{text.loginBody}</p>}

        {error && <p className="mt-4 break-words rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        <button
          type="button"
          onClick={isLoggedIn ? handlePurchase : onLoginClick}
          disabled={loading}
          data-modal-initial-focus
          className="mt-6 min-h-11 w-full rounded bg-ghost-rust px-4 py-3 font-bold text-white hover:bg-[#96360d] focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? text.loading : isLoggedIn ? text.openCheckout : text.login}
        </button>
        <button type="button" onClick={onClose} disabled={loading} className="mt-3 min-h-11 w-full py-2 text-sm font-bold text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-ghost-rust/30 disabled:opacity-50">
          {text.close}
        </button>
      </div>
    </div>
  );
}
