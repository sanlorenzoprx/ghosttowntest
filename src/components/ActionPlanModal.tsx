import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { IdeaIntake } from '../types/lit';
import type { PaidTestIntake } from '../types/paidTest';
import type { PrePurchaseResearchSignals } from '../types/researchSignals';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';

interface Props {
  idea: IdeaIntake;
  verdictId: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (intake: PaidTestIntake) => void;
  researchSignals?: PrePurchaseResearchSignals | null;
}

type PaidLocale = 'en' | 'es';

const modalCopy = {
  en: {
    stage: 'Paid continuation',
    priceSuffix: 'one-time purchase',
    titlePrefix: 'Personalize your',
    continuation: 'This is the paid continuation of your free verdict. GhostTown carries forward the buyer, problem, workaround, and optional research clues so the Launch Blueprint starts from the idea you already tested.',
    knownTitle: 'What is already known',
    knownBody: 'Your verdict identified the target buyer, painful problem, and current alternative below. You can tighten the language before checkout.',
    includedTitle: 'What you receive when the Blueprint is ready',
    processTitle: 'What happens after payment',
    process: [
      'Stripe verifies the paid order and returns you to the fulfillment status page.',
      'You confirm exactly 2 or 3 competitors, alternatives, or adjacent products as research starting points.',
      'GhostTown researches those public footprints, then organizes the findings into the Launch Blueprint and available artifacts.'
    ],
    seedsTitle: 'Why competitor seeds are requested',
    seedsBody: 'Seeds define the market neighborhood for research. They are not proof of demand; they tell the system where to start looking for audiences, channels, publications, events, and partnerships.',
    researchMapTitle: 'Optional research clues attached',
    researchMapBody: 'These clues carry into paid confirmation and research planning. GhostTown verifies them before treating them as evidence.',
    nonGuaranteesTitle: 'What this does not guarantee',
    nonGuarantees: [
      'It does not guarantee customers, revenue, validation, or product-market fit.',
      'It does not treat unverified clues as proof.',
      'It does not make the Blueprint ready until fulfillment confirms the ready state.'
    ],
    fieldsetTitle: 'Confirm the intake GhostTown should use',
    cancel: 'Return to verdict',
    close: 'Close Launch Blueprint form',
    checkout: 'Continue to secure checkout',
    loadingCheckout: 'Opening secure checkout…',
    required: 'Required',
    optional: 'Optional',
    skipped: 'Skipped',
    fields: {
      targetBuyer: {
        label: 'One buyer segment',
        placeholder: 'Example: independent web-design agencies'
      },
      problem: {
        label: 'Urgent problem they will pay to solve',
        placeholder: 'Describe the costly or frustrating problem'
      },
      currentWorkaround: {
        label: 'What they use or do today',
        placeholder: 'Current tool, service, spreadsheet, or manual workaround'
      },
      offerHypothesis: {
        label: 'Offer you want to test',
        placeholder: 'Example: a manual QA audit delivered in 48 hours'
      },
      expectedPrice: {
        label: 'Price you want to test',
        placeholder: 'Example: $250 pilot'
      }
    }
  },
  es: {
    stage: 'Continuación pagada',
    priceSuffix: 'compra única',
    titlePrefix: 'Personaliza tu',
    continuation: 'Esta es la continuación pagada de tu veredicto gratuito. GhostTown lleva adelante el comprador, el problema, la alternativa actual y las pistas opcionales para que el Launch Blueprint empiece desde la idea que ya evaluaste.',
    knownTitle: 'Lo que ya se sabe',
    knownBody: 'Tu veredicto identificó el comprador objetivo, el problema doloroso y la alternativa actual abajo. Puedes ajustar el lenguaje antes del checkout.',
    includedTitle: 'Lo que recibes cuando el Blueprint esté listo',
    processTitle: 'Qué pasa después del pago',
    process: [
      'Stripe verifica la orden pagada y te devuelve a la página de estado de fulfillment.',
      'Confirmas exactamente 2 o 3 competidores, alternativas o productos adyacentes como puntos de partida de investigación.',
      'GhostTown investiga esas huellas públicas y organiza los hallazgos en el Launch Blueprint y los artefactos disponibles.'
    ],
    seedsTitle: 'Por qué se piden semillas de competidores',
    seedsBody: 'Las semillas definen el vecindario de mercado para investigar. No son prueba de demanda; le indican al sistema dónde empezar a buscar audiencias, canales, publicaciones, eventos y alianzas.',
    researchMapTitle: 'Pistas opcionales adjuntas',
    researchMapBody: 'Estas pistas pasan a la confirmación pagada y a la planificación de investigación. GhostTown las verifica antes de tratarlas como evidencia.',
    nonGuaranteesTitle: 'Lo que esto no garantiza',
    nonGuarantees: [
      'No garantiza clientes, ingresos, validación ni product-market fit.',
      'No trata pistas sin verificar como prueba.',
      'No muestra el Blueprint como listo hasta que fulfillment confirme el estado ready.'
    ],
    fieldsetTitle: 'Confirma el intake que GhostTown debe usar',
    cancel: 'Volver al veredicto',
    close: 'Cerrar formulario del Launch Blueprint',
    checkout: 'Continuar al checkout seguro',
    loadingCheckout: 'Abriendo checkout seguro…',
    required: 'Requerido',
    optional: 'Opcional',
    skipped: 'Omitido',
    fields: {
      targetBuyer: {
        label: 'Un segmento de comprador',
        placeholder: 'Ejemplo: agencias independientes de diseño web'
      },
      problem: {
        label: 'Problema urgente por el que pagarían',
        placeholder: 'Describe el problema costoso o frustrante'
      },
      currentWorkaround: {
        label: 'Qué usan o hacen hoy',
        placeholder: 'Herramienta, servicio, hoja de cálculo o solución manual actual'
      },
      offerHypothesis: {
        label: 'Oferta que quieres probar',
        placeholder: 'Ejemplo: una auditoría manual de QA entregada en 48 horas'
      },
      expectedPrice: {
        label: 'Precio que quieres probar',
        placeholder: 'Ejemplo: piloto de $250'
      }
    }
  }
};

function paidLocale(): PaidLocale {
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

export default function ActionPlanModal({ idea, verdictId, loading, error, onClose, onSubmit, researchSignals }: Props) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const [targetBuyer, setTargetBuyer] = useState(idea.targetUser);
  const [problem, setProblem] = useState(idea.painfulProblem);
  const [currentWorkaround, setCurrentWorkaround] = useState(idea.currentAlternative);
  const [offerHypothesis, setOfferHypothesis] = useState('');
  // This is the founder's own price hypothesis, not the price of GhostTown's Blueprint.
  const [expectedPrice, setExpectedPrice] = useState('');
  const locale = paidLocale();
  const text = modalCopy[locale];
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

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !loading) {
      event.preventDefault();
      onClose();
      return;
    }
    containDialogFocus(event, dialogRef.current);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()) return;
    onSubmit({
      verdictId,
      targetBuyer: targetBuyer.trim(),
      problem: problem.trim(),
      currentWorkaround: currentWorkaround.trim(),
      offerHypothesis: offerHypothesis.trim(),
      expectedPrice: expectedPrice.trim() || undefined,
      researchSignals: researchSignals ? {
        ...researchSignals,
        targetCustomer: targetBuyer.trim(),
        updatedAt: new Date().toISOString()
      } : undefined
    });
  };

  const researchSignalTypes = ['commercial', 'audience', 'ecosystem'] as const;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-4">
      <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
        <form ref={dialogRef} onSubmit={submit} onKeyDown={handleDialogKeyDown} role="dialog" aria-modal="true" aria-labelledby="action-plan-title" aria-describedby="action-plan-description" tabIndex={-1} className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl focus:outline-none">
          <div className="border-b border-black/10 bg-[#f7f2ea] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-ghost-rust">{displayPrice} {text.priceSuffix}</p>
                <h2 id="action-plan-title" className="mt-1 break-words font-display text-2xl font-bold text-gray-950 sm:text-3xl">{text.titlePrefix} {GHOSTTOWN_30_DAY_PLAN_V1.name}</h2>
                <p id="action-plan-description" className="mt-2 text-sm leading-6 text-gray-700">{text.continuation}</p>
              </div>
              <button type="button" onClick={onClose} disabled={loading} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-ghost-rust/40" aria-label={text.close}>
                {locale === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-5 sm:p-7">
            <section className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
              <div className="rounded-xl border border-ghost-rust/20 bg-[#fff7f2] p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-rust">{text.stage}</p>
                <h3 className="mt-2 font-black text-ghost-ink">{text.includedTitle}</h3>
                <ul className="mt-3 grid gap-2 text-sm text-gray-800">
                  {GHOSTTOWN_30_DAY_PLAN_V1.customerPromise.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="font-black text-ghost-rust" aria-hidden="true">✓</span>
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-lg bg-white p-3 text-sm font-bold leading-6 text-ghost-ink">{GHOSTTOWN_30_DAY_PLAN_V1.launchSiteInvariant}</p>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-5">
                <h3 className="font-black text-ghost-ink">{text.processTitle}</h3>
                <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-700">
                  {text.process.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ghost-rust/30 bg-[#fff7f2] text-xs font-black text-ghost-rust">{index + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4">
                <h3 className="font-black text-ghost-forest">{text.knownTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-700">{text.knownBody}</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-[10px] font-black uppercase tracking-wide text-gray-500">{text.fields.targetBuyer.label}</dt>
                    <dd className="mt-1 break-words font-bold text-gray-900">{idea.targetUser}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-[10px] font-black uppercase tracking-wide text-gray-500">{text.fields.currentWorkaround.label}</dt>
                    <dd className="mt-1 break-words font-bold text-gray-900">{idea.currentAlternative}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-ghost-gold/40 bg-[#fffaf0] p-4">
                <h3 className="font-black text-ghost-ink">{text.seedsTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{text.seedsBody}</p>
              </div>
            </section>

            {researchSignals && (
              <section className="mt-5 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-4" aria-label={text.researchMapTitle}>
                <h3 className="font-black text-ghost-forest">{text.researchMapTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-700">{text.researchMapBody}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {researchSignalTypes.map(type => (
                    <div key={type} className="min-w-0 rounded-lg border border-black/10 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{type}</p>
                      <p className="mt-1 break-words text-sm font-bold text-gray-800">{researchSignals[type]?.value || text.skipped}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-black text-red-900">{text.nonGuaranteesTitle}</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-red-800">
                {text.nonGuarantees.map(item => <li key={item}>• {item}</li>)}
              </ul>
            </section>

            <fieldset className="mt-6 space-y-5">
              <legend className="font-black text-ghost-ink">{text.fieldsetTitle}</legend>
              <Field label={text.fields.targetBuyer.label} value={targetBuyer} onChange={setTargetBuyer} placeholder={text.fields.targetBuyer.placeholder} requiredLabel={text.required} optionalLabel={text.optional} initialFocus />
              <Field label={text.fields.problem.label} value={problem} onChange={setProblem} placeholder={text.fields.problem.placeholder} multiline requiredLabel={text.required} optionalLabel={text.optional} />
              <Field label={text.fields.currentWorkaround.label} value={currentWorkaround} onChange={setCurrentWorkaround} placeholder={text.fields.currentWorkaround.placeholder} multiline requiredLabel={text.required} optionalLabel={text.optional} />
              <Field label={text.fields.offerHypothesis.label} value={offerHypothesis} onChange={setOfferHypothesis} placeholder={text.fields.offerHypothesis.placeholder} multiline required={false} requiredLabel={text.required} optionalLabel={text.optional} />
              <Field label={text.fields.expectedPrice.label} value={expectedPrice} onChange={setExpectedPrice} placeholder={text.fields.expectedPrice.placeholder} required={false} requiredLabel={text.required} optionalLabel={text.optional} />
            </fieldset>

            {error && (
              <div className="mt-5 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={loading} className="min-h-11 rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">{text.cancel}</button>
              <button type="submit" disabled={loading || !targetBuyer.trim() || !problem.trim() || !currentWorkaround.trim()} className="min-h-11 rounded-lg bg-ghost-rust px-5 py-3 font-bold text-white hover:bg-[#96360d] focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:opacity-50">
                {loading ? text.loadingCheckout : `${text.checkout} — ${displayPrice}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, required = true, requiredLabel, optionalLabel, initialFocus = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
  requiredLabel: string;
  optionalLabel: string;
  initialFocus?: boolean;
}) {
  const isRequired = required !== false;
  const className = 'mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-ghost-rust focus:ring-2 focus:ring-ghost-rust/20';
  return (
    <label className="block text-sm font-bold text-gray-800">
      <span className="flex flex-wrap items-center gap-2">
        <span>{label}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-500">{isRequired ? requiredLabel : optionalLabel}</span>
      </span>
      {multiline ? (
        <textarea required={isRequired} rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} data-modal-initial-focus={initialFocus || undefined} className={className} />
      ) : (
        <input required={isRequired} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} data-modal-initial-focus={initialFocus || undefined} className={className} />
      )}
    </label>
  );
}
