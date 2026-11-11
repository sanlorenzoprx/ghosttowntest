import { useState } from 'react';
import { apiUrl } from '../lib/api';
import { ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE } from '../lib/assessmentPack';
import type { Locale } from '../lib/locale';

type PaywallCopy = {
  unavailable: string;
  failed: string;
  titleDeclined: string;
  titleAllowance: string;
  bodyDeclined: (credits: number) => string;
  bodyAllowance: (credits: number, price: string) => string;
  pack: (credits: number, price: string) => string;
  oneTime: string;
  opening: string;
  buy: (credits: number, price: string) => string;
  login: string;
  notNow: string;
};

const COPY: Record<Locale, PaywallCopy> = {
  en: {
    unavailable: 'Checkout is not available right now',
    failed: 'Checkout failed',
    titleDeclined: 'Keep exploring before you commit',
    titleAllowance: 'Keep testing before you build',
    bodyDeclined: credits => `Not ready for the $97.00 30-day PDF plan? You can still buy ${credits} additional assessments and keep testing ideas before committing to a longer evidence sprint.`,
    bodyAllowance: (credits, price) => `Your current allowance has been used. Registered members can share one completed result to unlock one bonus assessment, or get ${credits} more for ${price}.`,
    pack: (credits, price) => `${credits} assessments · ${price}`,
    oneTime: 'One-time purchase. No subscription.',
    opening: 'Opening checkout...',
    buy: (credits, price) => `Buy ${credits} Assessments — ${price}`,
    login: 'Log In or Sign Up',
    notNow: 'Not now'
  },
  es: {
    unavailable: 'El pago no está disponible ahora mismo',
    failed: 'El pago falló',
    titleDeclined: 'Sigue explorando antes de comprometerte',
    titleAllowance: 'Sigue probando antes de crear',
    bodyDeclined: credits => `¿Todavía no quieres el plan en PDF de 30 días de $97.00? Puedes comprar ${credits} evaluaciones más y seguir probando ideas antes de comprometerte con un sprint de pruebas más largo.`,
    bodyAllowance: (credits, price) => `Ya usaste las evaluaciones que tenías. Si tienes cuenta, puedes compartir un resultado completo para ganar una evaluación extra, o comprar ${credits} más por ${price}.`,
    pack: (credits, price) => `${credits} evaluaciones · ${price}`,
    oneTime: 'Un solo pago. Sin suscripción.',
    opening: 'Abriendo el pago...',
    buy: (credits, price) => `Comprar ${credits} evaluaciones — ${price}`,
    login: 'Entra o crea tu cuenta',
    notNow: 'Ahora no'
  }
};

interface Props {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onClose: () => void;
  context?: 'allowance' | 'plan-declined';
  locale?: Locale;
}

export default function PaywallModal({ isLoggedIn, onLoginClick, onClose, context = 'allowance', locale = 'en' }: Props) {
  const t = COPY[locale];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        throw new Error(data.error || t.unavailable);
      }
      window.location.assign(data.sessionUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.failed);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold">{context === 'plan-declined' ? t.titleDeclined : t.titleAllowance}</h2>
        <p className="mt-3 text-gray-600">
          {context === 'plan-declined'
            ? t.bodyDeclined(ASSESSMENT_PACK_CREDITS)
            : t.bodyAllowance(ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE)}
        </p>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-3xl font-bold text-blue-900">{t.pack(ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE)}</div>
          <p className="mt-1 text-sm text-blue-800">{t.oneTime}</p>
        </div>

        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={isLoggedIn ? handlePurchase : onLoginClick}
          disabled={loading}
          className="mt-6 w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t.opening : isLoggedIn ? t.buy(ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE) : t.login}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-900">
          {t.notNow}
        </button>
      </div>
    </div>
  );
}
