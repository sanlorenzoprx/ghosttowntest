import { GHOSTTOWN_FIRST_30_V1 } from '../lib/ghosttownOffer';
import type { Locale } from '../lib/locale';

// The post-verdict offer when First 30 is on sale (VITE_POST_VERDICT_OFFER=first30).
// The Worker still refuses checkout until FIRST30_CHECKOUT_ENABLED is "true".

interface Props {
  locale?: Locale;
  loading: boolean;
  error: string;
  onStart: () => void;
}

const COPY: Record<Locale, {
  kicker: string;
  heading: string;
  summary: string;
  why: string;
  includes: readonly string[];
  oneCharge: string;
  refund: string;
  button: string;
  opening: string;
  boundary: string;
}> = {
  en: {
    kicker: 'If the idea is worth testing',
    heading: `First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}, paid once`,
    summary: 'Thirty days of guided help to test your idea with real customers. GhostTown finds places where your likely customers are already talking, researches the problems they describe, and uses what they say to shape your website and the messages you test.',
    why: 'Why this matters: you start with the words your customers already use, in the places they already read, instead of guessing.',
    includes: GHOSTTOWN_FIRST_30_V1.includes,
    oneCharge: 'One payment covers the 30-day plan and your website.',
    refund: `${GHOSTTOWN_FIRST_30_V1.refundRule} The website build starts ${GHOSTTOWN_FIRST_30_V1.buildStartsWhen}.`,
    button: `Start First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`,
    opening: 'Opening secure checkout...',
    boundary: 'First 30 helps you make better decisions with real evidence. It does not promise sales or income.'
  },
  es: {
    kicker: 'Si la idea merece una prueba',
    heading: `First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}, un solo pago`,
    summary: 'Treinta días de ayuda guiada para probar tu idea con clientes reales. GhostTown encuentra lugares donde tus posibles clientes ya conversan, investiga los problemas que describen y usa lo que dicen para dar forma a tu sitio web y a los mensajes que pruebas.',
    why: 'Por qué importa: empiezas con las palabras que tus clientes ya usan, en los lugares donde ya leen, en vez de adivinar.',
    includes: GHOSTTOWN_FIRST_30_V1.includesEs,
    oneCharge: 'Un solo pago cubre el plan de 30 días y tu sitio web.',
    refund: `${GHOSTTOWN_FIRST_30_V1.refundRuleEs} La construcción del sitio empieza ${GHOSTTOWN_FIRST_30_V1.buildStartsWhenEs}.`,
    button: `Empezar First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`,
    opening: 'Abriendo el pago seguro...',
    boundary: 'First 30 te ayuda a tomar mejores decisiones con evidencia real. No promete ventas ni ingresos.'
  }
};

export default function First30PurchasePanel({ locale = 'en', loading, error, onStart }: Props) {
  const t = COPY[locale];
  return (
    <section id="first-30" data-testid="first-30-purchase" className="mb-8 rounded-sm border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-lantern">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ghost-rust">{t.kicker}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-ghost-ink">{t.heading}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-700">{t.summary}</p>
      <p className="mt-3 text-sm leading-6 text-gray-800">{t.why}</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
        {t.includes.map(item => <li key={item} className="flex gap-2 rounded-lg border border-ghost-rust/15 bg-white p-3"><span className="font-black text-ghost-rust">✓</span><span>{item}</span></li>)}
      </ul>
      <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">{t.oneCharge}</p>
      <p className="mt-3 text-xs leading-5 text-gray-600">{t.refund}</p>
      {error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={onStart} disabled={loading} className="mt-5 min-h-14 w-full rounded-sm bg-ghost-rust px-5 py-4 font-bold text-white shadow-lantern hover:bg-[#96360d] disabled:opacity-50">
        {loading ? t.opening : t.button}
      </button>
      <p className="mt-3 text-xs leading-5 text-gray-600">{t.boundary}</p>
    </section>
  );
}
