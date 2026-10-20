import { useState } from 'react';
import type { IdeaIntake } from '../types/lit';
import type { PaidTestIntake } from '../types/paidTest';
import type { PrePurchaseResearchSignals } from '../types/researchSignals';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1, GHOSTTOWN_FIRST_30_V1 } from '../lib/ghosttownOffer';
import { commercialAttributionForCheckout } from '../lib/commercialAttribution';
import type { Locale } from '../lib/locale';

import LanguageChoices from './LanguageChoices';

interface Props {
  idea: IdeaIntake;
  verdictId: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (intake: PaidTestIntake) => void;
  /** Kept temporarily for call-site compatibility. Research now starts after purchase. */
  researchSignals?: PrePurchaseResearchSignals | null;
  locale?: Locale;
  /** Which plan this intake buys. The dormant $97 Sprint or First 30. */
  offer?: 'sprint' | 'first30';
}

const COPY: Record<Locale, {
  close: string; closeAria: string; researchKicker: string; researchText: string; startNowKicker: string; startNowText: string;
  buyerLabel: string; buyerPlaceholder: string; problemLabel: string; problemPlaceholder: string; workaroundLabel: string; workaroundPlaceholder: string;
  optionalSummary: string; optionalHelp: string; sellLabel: string; sellPlaceholder: string; priceLabel: string; pricePlaceholder: string;
  cancel: string; opening: string;
}> = {
  en: {
    close: 'Close',
    closeAria: 'Close checkout',
    researchKicker: 'We do the research',
    researchText: 'You do not need to search for competitors or places to find buyers. GhostTown starts that work before your verdict and keeps going during the Sprint.',
    startNowKicker: 'Start now',
    startNowText: 'Your first step is ready right away. You get one clear test, what to do in the next 48 hours, and what result means keep going or change something.',
    buyerLabel: 'Who do you want to help first?',
    buyerPlaceholder: 'Example: local salon owners',
    problemLabel: 'What problem do they have?',
    problemPlaceholder: 'Describe the problem in your own words',
    workaroundLabel: 'What do they do now?',
    workaroundPlaceholder: 'What do they use or do instead?',
    optionalSummary: 'Optional: I already know what I want to sell',
    optionalHelp: 'Skip this if you are not sure yet. GhostTown can help you work it out.',
    sellLabel: 'What do you want to sell?',
    sellPlaceholder: 'Example: a 48-hour website checkup',
    priceLabel: 'What price are you thinking about?',
    pricePlaceholder: 'Example: $250',
    cancel: 'Cancel',
    opening: 'Opening secure checkout...'
  },
  es: {
    close: 'Cerrar',
    closeAria: 'Cerrar el pago',
    researchKicker: 'Nosotros investigamos',
    researchText: 'No tienes que buscar competidores ni lugares donde encontrar compradores. GhostTown empieza ese trabajo antes de tu veredicto y lo sigue durante los 30 días.',
    startNowKicker: 'Empieza ahora',
    startNowText: 'Tu primer paso está listo enseguida. Recibes una prueba clara, qué hacer en las próximas 48 horas y qué resultado significa seguir o cambiar algo.',
    buyerLabel: '¿A quién quieres ayudar primero?',
    buyerPlaceholder: 'Ejemplo: dueñas de salones de belleza en tu pueblo',
    problemLabel: '¿Qué problema tienen?',
    problemPlaceholder: 'Describe el problema con tus palabras',
    workaroundLabel: '¿Qué hacen ahora?',
    workaroundPlaceholder: '¿Qué usan o hacen en su lugar?',
    optionalSummary: 'Opcional: ya sé lo que quiero vender',
    optionalHelp: 'Sáltalo si todavía no estás seguro. GhostTown te ayuda a definirlo.',
    sellLabel: '¿Qué quieres vender?',
    sellPlaceholder: 'Ejemplo: una revisión de sitio web en 48 horas',
    priceLabel: '¿Qué precio estás pensando?',
    pricePlaceholder: 'Ejemplo: $250',
    cancel: 'Cancelar',
    opening: 'Abriendo el pago seguro...'
  }
};

interface PlanCopy {
  purchaseLine: string; heading: string; intro: string; planHeading: string; planBody: string;
  promise: readonly string[]; highlight: string; boundary: string; submit: string;
}

const FIRST30_COPY: Record<Locale, PlanCopy> = {
  en: {
    purchaseLine: `${GHOSTTOWN_FIRST_30_V1.displayPrice} one-time purchase`,
    heading: 'Start First 30',
    intro: 'Thirty days of guided help to test your idea with real customers. GhostTown finds where your likely customers are talking, and uses what they say to shape your website and the messages you test.',
    planHeading: 'What you get',
    planBody: 'You start with the words your customers already use, not a guess. Each day tells you what to do, and you tell GhostTown what happened.',
    promise: GHOSTTOWN_FIRST_30_V1.includes,
    highlight: 'One payment covers the 30-day plan and your website. There is nothing else to buy.',
    boundary: `${GHOSTTOWN_FIRST_30_V1.refundRule} The website build starts ${GHOSTTOWN_FIRST_30_V1.buildStartsWhen}.`,
    submit: `Start First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`
  },
  es: {
    purchaseLine: `${GHOSTTOWN_FIRST_30_V1.displayPrice}, un solo pago`,
    heading: 'Empieza First 30',
    intro: 'Treinta días de ayuda guiada para probar tu idea con clientes reales. GhostTown encuentra dónde conversan tus posibles clientes y usa lo que dicen para dar forma a tu sitio web y a los mensajes que pruebas.',
    planHeading: 'Lo que recibes',
    planBody: 'Empiezas con las palabras que tus clientes ya usan, no con una suposición. Cada día te dice qué hacer, y tú le cuentas a GhostTown qué pasó.',
    promise: GHOSTTOWN_FIRST_30_V1.includesEs,
    highlight: 'Un solo pago cubre el plan de 30 días y tu sitio web. No hay nada más que comprar.',
    boundary: `${GHOSTTOWN_FIRST_30_V1.refundRuleEs} La construcción del sitio empieza ${GHOSTTOWN_FIRST_30_V1.buildStartsWhenEs}.`,
    submit: `Empezar First 30 — ${GHOSTTOWN_FIRST_30_V1.displayPrice}`
  }
};

// The dormant $97 Sprint. Its promise list lives in GHOSTTOWN_30_DAY_PLAN_V1 (English).
const SPRINT_COPY: Record<Locale, (displayPrice: string, ctaPrice: string) => PlanCopy> = {
  en: (displayPrice, ctaPrice) => ({
    purchaseLine: `${displayPrice} one-time purchase`,
    heading: 'You tested your idea. Now let’s help you make it real.',
    intro: `For ${displayPrice}, GhostTown gives you a 30-day plan. Each day tells you what to do. You tell us what happened. We help you decide what to do next.`,
    planHeading: 'Your plan will not sit in a folder.',
    planBody: 'The PDF shows the whole 30-day plan. GhostTown shows what to do today. We remind you what comes next. Tell GhostTown what happened, and we help you decide what to do next.',
    promise: GHOSTTOWN_30_DAY_PLAN_V1.customerPromise,
    highlight: 'The PDF shows the full plan. GhostTown shows your next step.',
    boundary: GHOSTTOWN_30_DAY_PLAN_V1.scopeBoundary,
    submit: `Start My 30-Day Evidence Sprint — ${ctaPrice}`
  }),
  es: (displayPrice, ctaPrice) => ({
    purchaseLine: `${displayPrice}, un solo pago`,
    heading: 'Probaste tu idea. Ahora te ayudamos a hacerla realidad.',
    intro: `Por ${displayPrice}, GhostTown te da un plan de 30 días. Cada día te dice qué hacer. Tú nos cuentas qué pasó. Te ayudamos a decidir qué hacer después.`,
    planHeading: 'Tu plan no se queda guardado en una carpeta.',
    planBody: 'El PDF muestra el plan completo de 30 días. GhostTown te muestra qué hacer hoy y te recuerda lo que sigue.',
    promise: [
      'Abre GhostTown cada día y ve qué hacer',
      'Sabe qué resultado significa seguir, cambiar algo o parar',
      'Descarga el PDF completo cuando quieras',
      'Recibe recordatorios de tu próximo paso',
      'Cuéntale a GhostTown qué pasó y recibe ayuda para decidir'
    ],
    highlight: 'El PDF muestra el plan completo. GhostTown te muestra tu próximo paso.',
    boundary: 'El Sprint no incluye sitio web en vivo, dominio, publicación ni pagos. Esos son productos separados.',
    submit: `Empezar mi Sprint de 30 días — ${ctaPrice}`
  })
};

export default function ActionPlanModal({ idea, verdictId, loading, error, onClose, onSubmit, locale = 'en', offer = 'sprint' }: Props) {
  const [founderLanguage, setFounderLanguage] = useState<Locale>(locale);
  const [buyerLanguage, setBuyerLanguage] = useState<Locale>(locale);
  const [targetBuyer, setTargetBuyer] = useState(idea.targetUser);
  const [problem, setProblem] = useState(idea.painfulProblem);
  const [currentWorkaround, setCurrentWorkaround] = useState(idea.currentAlternative);
  const [offerHypothesis, setOfferHypothesis] = useState('');
  // This is the founder's own price hypothesis, not the price of GhostTown's Blueprint.
  const [expectedPrice, setExpectedPrice] = useState('');
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;
  const ctaPrice = displayPrice.replace(/\.00$/, '');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()) return;
    onSubmit({
      verdictId,
      targetBuyer: targetBuyer.trim(),
      problem: problem.trim(),
      currentWorkaround: currentWorkaround.trim(),
      offerHypothesis: offerHypothesis.trim(),
      expectedPrice: expectedPrice.trim() || undefined,
      founderLanguage,
      buyerLanguage,
      attribution: commercialAttributionForCheckout(verdictId)
    });
  };

  const t = COPY[locale];
  const plan = offer === 'first30'
    ? FIRST30_COPY[locale]
    : SPRINT_COPY[locale](displayPrice, ctaPrice);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="action-plan-title">
      <div className="flex min-h-full items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">{plan.purchaseLine}</p>
              <h2 id="action-plan-title" className="mt-1 text-2xl font-bold text-gray-950">{plan.heading}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{plan.intro}</p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100" aria-label={t.closeAria}>{t.close}</button>
          </div>

          <section className="mt-6 rounded-xl border border-ghost-rust/20 bg-[#fff7f2] p-5">
            <h3 className="font-black text-ghost-ink">{plan.planHeading}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">{plan.planBody}</p>
            <ul className="mt-4 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
              {plan.promise.map(item => <li key={item} className="flex gap-2"><span className="font-black text-ghost-rust">✓</span><span>{item}</span></li>)}
            </ul>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">{plan.highlight}</p>
            <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-ghost-ink">{plan.boundary}</p>
          </section>

          <section className="mt-6 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.researchKicker}</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{t.researchText}</p>
          </section>

          <section className="mt-6 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-forest">{t.startNowKicker}</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{t.startNowText}</p>
          </section>
          <div className="mt-6 space-y-5">
            <Field label={t.buyerLabel} value={targetBuyer} onChange={setTargetBuyer} placeholder={t.buyerPlaceholder} />
            <Field label={t.problemLabel} value={problem} onChange={setProblem} placeholder={t.problemPlaceholder} multiline />
            <Field label={t.workaroundLabel} value={currentWorkaround} onChange={setCurrentWorkaround} placeholder={t.workaroundPlaceholder} multiline />

            <LanguageChoices locale={locale} founderLanguage={founderLanguage} buyerLanguage={buyerLanguage} onFounderLanguage={setFounderLanguage} onBuyerLanguage={setBuyerLanguage} />

            <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <summary className="cursor-pointer font-bold text-gray-800">{t.optionalSummary}</summary>
              <p className="mt-2 text-sm text-gray-600">{t.optionalHelp}</p>
              <div className="mt-4 space-y-5">
                <Field label={t.sellLabel} value={offerHypothesis} onChange={setOfferHypothesis} placeholder={t.sellPlaceholder} multiline required={false} />
                <Field label={t.priceLabel} value={expectedPrice} onChange={setExpectedPrice} placeholder={t.pricePlaceholder} required={false} />
              </div>
            </details>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50">{t.cancel}</button>
            <button type="submit" disabled={loading || !targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()} className="rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white hover:bg-[#96360d] disabled:opacity-50">
              {loading ? t.opening : plan.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, required = true }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const isRequired = required !== false;
  const className = 'mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
  return (
    <label className="block text-sm font-bold text-gray-800">
      {label}
      {multiline ? (
        <textarea required={isRequired} rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      ) : (
        <input required={isRequired} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}
