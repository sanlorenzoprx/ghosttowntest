import { useEffect, useState } from 'react';
import { litQuestions } from '../lib/litQuestions';
import ExampleIdeaGallery from './ExampleIdeaGallery';
import ProofStandard from './ProofStandard';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';

interface Props {
  onStart: () => void;
  onSelectExample: (slug: string) => void;
  hasDraft: boolean;
  onResume: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  locale: 'en' | 'es';
}

const previewSteps = [
  { en: 'Frame the idea', es: 'Define la idea' },
  { en: 'Pressure-test the assumptions', es: 'Pon a prueba las suposiciones' },
  { en: 'Read the decision signal', es: 'Lee la señal de decisión' },
  { en: 'Run the next test', es: 'Ejecuta la próxima prueba' }
];

export default function Landing({ onStart, onSelectExample, hasDraft, onResume, isLoggedIn, onLoginClick, locale }: Props) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const es = locale === 'es';
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const respectMotionPreference = () => {
      if (mediaQuery.matches) setIsPlaying(false);
    };

    respectMotionPreference();
    mediaQuery.addEventListener('change', respectMotionPreference);
    return () => mediaQuery.removeEventListener('change', respectMotionPreference);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setAnimationStep(current => (current + 1) % previewSteps.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const methodSteps = es ? [
    ['01', 'Define la idea', 'Aclara quién compra, qué problema urgente tiene y qué alternativa usa hoy.'],
    ['02', `Responde ${litQuestions.length} preguntas`, 'Pon a prueba demanda, ventaja, acceso, momento y defensibilidad.'],
    ['03', 'Recibe una decisión', 'Obtén un veredicto, la mayor incertidumbre y una prueba concreta para ejecutar.']
  ] : [
    ['01', 'Frame the idea', 'Define the buyer, the urgent problem, and what they use today.'],
    ['02', `Answer ${litQuestions.length} questions`, 'Pressure-test demand, advantage, access, timing, and defensibility.'],
    ['03', 'Make a decision', 'Leave with a verdict, the biggest uncertainty, and one test worth running next.']
  ];

  const immediateOutputs = es ? [
    ['Una decisión clara', 'Construye ahora, prueba primero, reduce el nicho o detente por ahora.'],
    ['La incertidumbre principal', 'El supuesto que todavía puede cambiar la decisión.'],
    ['El siguiente experimento', 'Una acción concreta para reunir evidencia antes de invertir más tiempo.']
  ] : [
    ['A clear decision', 'Build now, test first, narrow the niche, or stop for now.'],
    ['The main uncertainty', 'The assumption that could still change the decision.'],
    ['The next experiment', 'One concrete action to gather evidence before investing more time.']
  ];

  return (
    <div className="min-h-screen bg-canvas pb-20 text-ink sm:pb-0">
      <style>{`
        @media (max-width: 639px) {
          html:has(#ghosttown-landing-sticky-cta) {
            scroll-padding-bottom: calc(5.75rem + env(safe-area-inset-bottom));
          }

          body:has(#ghosttown-landing-sticky-cta) footer {
            padding-bottom: calc(5.75rem + env(safe-area-inset-bottom));
          }

          body:has(#ghosttown-landing-sticky-cta) footer a {
            scroll-margin-bottom: calc(5.75rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <section className="relative overflow-hidden bg-ink text-ink-inverse">
        <div className="landing-grid-pattern absolute inset-0" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rust/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-workspace min-w-0 items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14 lg:px-8 lg:py-24">
          <div className="min-w-0">
            <p className="font-score text-xs font-semibold uppercase tracking-[0.18em] text-rust-soft">
              {es ? 'La decisión antes de construir' : 'The decision before you build'}
            </p>
            <h1 className="mt-5 max-w-[12ch] break-words font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:max-w-3xl sm:text-6xl lg:text-7xl">
              {es ? 'Descubre qué merece una prueba.' : 'Find out what deserves a test.'}
            </h1>
            <p className="mt-6 max-w-[20rem] break-words text-lg leading-8 text-white/75 sm:max-w-2xl sm:text-xl">
              {es
                ? 'GhostTown convierte una idea borrosa en una decisión clara, la incertidumbre principal y el siguiente experimento antes de que inviertas meses construyendo.'
                : 'GhostTown turns a fuzzy idea into a clear decision, the main uncertainty, and the next experiment before you spend months building.'}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onStart} className="btn-primary w-full sm:w-auto">
                {es ? 'Probar mi idea gratis' : 'Test my idea free'}
                <span className="ml-2" aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('example-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary w-full border-white/30 bg-white/10 text-ink-inverse hover:bg-white/15 sm:w-auto"
              >
                {es ? 'Explorar ejemplos' : 'Explore examples'}
              </button>
            </div>

            <p className="mt-5 text-sm text-white/65">
              {es ? 'Una prueba gratis · Sin cuenta · Sin tarjeta' : 'One free test · No account · No credit card'}
            </p>

            {hasDraft && (
              <button type="button" onClick={onResume} className="mt-6 flex w-full max-w-md min-w-0 items-center justify-between rounded-card border border-white/20 bg-white/10 px-4 py-3 text-left text-ink-inverse shadow-quiet transition hover:bg-white/15">
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/60">{es ? 'Progreso guardado' : 'Progress saved'}</span>
                  <span className="mt-1 block truncate font-bold">{es ? 'Continúa tu evaluación' : 'Continue your assessment'}</span>
                </span>
                <span className="ml-4 text-xl text-rust-soft" aria-hidden="true">→</span>
              </button>
            )}

            {!isLoggedIn && (
              <p className="mt-5 text-sm text-white/65">
                {es ? '¿Ya tienes una cuenta?' : 'Already have an account?'}{' '}
                <button type="button" onClick={onLoginClick} className="font-bold text-ink-inverse underline decoration-rust-soft underline-offset-4 hover:text-rust-soft">
                  {es ? 'Inicia sesión' : 'Sign in'}
                </button>
              </p>
            )}
          </div>

          <div className="min-w-0 rounded-evidence border border-white/20 bg-surface-raised p-4 text-ink shadow-lift sm:p-6">
            <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border pb-4">
              <div className="min-w-0">
                <p className="font-score text-xs font-bold uppercase tracking-[0.14em] text-rust">{es ? 'Vista de veredicto' : 'Verdict preview'}</p>
                <p className="mt-1 truncate font-bold">{es ? previewSteps[animationStep].es : previewSteps[animationStep].en}</p>
              </div>
              <span className="shrink-0 rounded-full bg-watch-soft px-2.5 py-1 font-score text-xs font-bold text-watch">
                {animationStep + 1}/{previewSteps.length}
              </span>
            </div>

            <div className="grid min-w-0 gap-5 py-6 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{es ? 'Ejemplo ilustrativo' : 'Illustrative example'}</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-score text-6xl font-bold leading-none tracking-[-0.08em] text-ink">3.7</span>
                  <span className="pb-1 font-score text-sm text-ink-muted">/ 5.0</span>
                </div>
                <span className="status-badge status-badge--watch mt-4">{es ? 'Prueba primero' : 'Test first'}</span>
              </div>

              <div className="min-w-0 rounded-panel bg-surface-muted p-4 sm:p-5">
                <p className="font-score text-xs font-bold uppercase tracking-[0.14em] text-rust">{es ? 'Lectura' : 'Readout'}</p>
                <h2 className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl">
                  {es ? 'El dolor parece real. El pago todavía es una suposición.' : 'The pain looks real. Payment is still an assumption.'}
                </h2>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-bold text-ink">{es ? 'Siguiente prueba' : 'Next test'}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {es ? 'Ofrece un piloto manual a diez compradores y continúa solo si tres aceptan pagar.' : 'Offer a manual pilot to ten target buyers. Continue only if three agree to pay.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 border-t border-border pt-4 sm:grid-cols-3">
              {[
                [es ? 'Señal' : 'Signal', es ? 'Problema reconocible' : 'Recognized problem'],
                [es ? 'Duda' : 'Uncertainty', es ? 'Disposición a pagar' : 'Willingness to pay'],
                [es ? 'Acción' : 'Action', es ? 'Piloto pagado' : 'Paid pilot']
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex flex-wrap gap-1" aria-label={es ? 'Controles de vista previa' : 'Preview controls'}>
                {previewSteps.map((step, index) => (
                  <button
                    key={step.en}
                    type="button"
                    onClick={() => setAnimationStep(index)}
                    aria-label={`${es ? 'Mostrar paso' : 'Show step'} ${index + 1}: ${es ? step.es : step.en}`}
                    aria-current={animationStep === index ? 'step' : undefined}
                    className="tap-target flex w-9 items-center justify-center rounded-field px-1 hover:bg-surface-muted"
                  >
                    <span className={`block h-2.5 rounded-full transition-all ${animationStep === index ? 'w-6 bg-rust' : 'w-2.5 bg-border'}`} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setIsPlaying(current => !current)} aria-pressed={isPlaying} className="tap-target rounded-field px-2 text-xs font-bold text-ink-soft hover:bg-surface-muted hover:text-ink">
                {isPlaying ? (es ? 'Pausar' : 'Pause') : (es ? 'Reproducir' : 'Play')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface-raised">
        <div className="mx-auto max-w-decision px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-reading">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'El coste de suponer' : 'The cost of guessing'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">
              {es ? 'Construir más rápido no arregla una suposición equivocada.' : 'Building faster does not fix the wrong assumption.'}
            </h2>
            <p className="mt-5 text-lg leading-8 text-ink-soft">
              {es ? 'Antes de pulir una página, contratar ayuda o comprar inventario, descubre qué parte de la idea necesita evidencia real.' : 'Before polishing a page, hiring help, or buying inventory, find the part of the idea that needs real evidence.'}
            </p>
          </div>
          <div className="mt-10 grid min-w-0 gap-3 md:grid-cols-3">
            {(es ? [
              ['Demanda', '¿Alguien tiene suficiente dolor para actuar?'],
              ['Acceso', '¿Puedes llegar al comprador y escuchar una respuesta concreta?'],
              ['Oferta', '¿Hay una forma clara de pedir compromiso, no solo elogios?']
            ] : [
              ['Demand', 'Does someone care enough to act?'],
              ['Access', 'Can you reach the buyer and hear a concrete response?'],
              ['Offer', 'Is there a clear way to ask for commitment, not compliments?']
            ]).map(([label, body], index) => (
              <article key={label} className="min-w-0 rounded-card border border-border bg-surface p-5 shadow-quiet sm:p-6">
                <span className="font-score text-sm font-bold text-rust">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-bold">{label}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="verdict-demo" className="bg-surface-stone">
        <div className="mx-auto grid max-w-decision min-w-0 gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <div className="min-w-0">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'El producto, no el discurso' : 'The product, not the pitch'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'Un veredicto útil muestra qué sabe y qué todavía no sabe.' : 'A useful verdict shows what it knows and what it still needs to learn.'}</h2>
            <p className="mt-5 text-lg leading-8 text-ink-soft">{es ? 'La puntuación es un resumen. La decisión viene con una señal, una incertidumbre y una prueba que puedes ejecutar.' : 'The score is a summary. The decision comes with a signal, an uncertainty, and a test you can run.'}</p>
          </div>
          <div className="min-w-0 rounded-evidence border border-evidence-border bg-surface-raised p-5 shadow-lantern sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p className="font-score text-xs font-bold uppercase tracking-[0.15em] text-rust">{es ? 'Ejemplo de estructura' : 'Example structure'}</p>
              <span className="status-badge status-badge--watch">{es ? 'Incertidumbre abierta' : 'Open uncertainty'}</span>
            </div>
            <div className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">
              {(es ? [
                ['Decisión', 'Prueba primero', 'No construyas todavía; reúne una señal de pago.'],
                ['Señal más fuerte', 'Dolor reconocible', 'El comprador ya usa una solución costosa o incómoda.'],
                ['Mayor incertidumbre', 'Compromiso', 'El interés declarado todavía no es una compra.'],
                ['Próxima prueba', 'Piloto manual', 'Habla con diez compradores y pide tres compromisos pagados.']
              ] : [
                ['Decision', 'Test first', 'Do not build yet; collect a payment signal.'],
                ['Strongest signal', 'Recognized pain', 'The buyer already uses an expensive or awkward alternative.'],
                ['Biggest uncertainty', 'Commitment', 'Stated interest is not a purchase yet.'],
                ['Next test', 'Manual pilot', 'Talk to ten buyers and ask for three paid commitments.']
              ]).map(([label, title, body]) => (
                <div key={label} className="min-w-0 rounded-panel bg-surface-muted p-4">
                  <p className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
                  <h3 className="mt-2 text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-ink-muted">{es ? 'Demostración ilustrativa. No es un resultado de cliente ni una garantía.' : 'Illustrative demonstration. Not a customer result or a guarantee.'}</p>
          </div>
        </div>
      </section>

      <section id="method" className="bg-canvas">
        <div className="mx-auto max-w-decision px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-reading">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'Cómo funciona' : 'How it works'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'Una evaluación enfocada. Una decisión que puedes usar.' : 'A focused assessment. A decision you can use.'}</h2>
          </div>
          <div className="mt-10 grid min-w-0 gap-3 md:grid-cols-3">
            {methodSteps.map(([number, title, body]) => (
              <article key={number} className="min-w-0 border-t-2 border-rust bg-surface-raised p-5 shadow-quiet sm:p-6">
                <span className="font-score text-sm font-bold text-rust">{number}</span>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface-raised">
        <div className="mx-auto max-w-decision px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-reading">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'Lo que recibes gratis' : 'What you receive for free'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'Sal con algo que hacer, no solo algo que leer.' : 'Leave with something to do, not just something to read.'}</h2>
          </div>
          <div className="mt-10 grid min-w-0 gap-3 md:grid-cols-3">
            {immediateOutputs.map(([title, body], index) => (
              <article key={title} className="min-w-0 rounded-card border border-border bg-canvas p-5 sm:p-6">
                <span className="status-badge status-badge--pass">{es ? 'Salida' : 'Output'} 0{index + 1}</span>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ExampleIdeaGallery onSelect={onSelectExample} locale={locale} />
      <ProofStandard locale={locale} />

      <section id="thirty-day-offer" className="bg-surface-stone">
        <div className="mx-auto grid max-w-decision min-w-0 gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:px-8">
          <div className="min-w-0">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'Después del veredicto' : 'After the verdict'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{GHOSTTOWN_30_DAY_PLAN_V1.name}</h2>
            <p className="mt-5 max-w-reading text-lg leading-8 text-ink-soft">
              {es
                ? `Una continuación personalizada por ${displayPrice} para convertir una idea con señal en un plan de 30 días con oferta, acceso, distribución, activos de alcance y una Launch Site funcional.`
                : `A personalized ${displayPrice} continuation that turns a signal-bearing idea into a 30-day plan with an offer, buyer access, distribution, outreach assets, and a working Launch Site.`}
            </p>
            <p className="mt-4 max-w-reading text-sm leading-6 text-ink-muted">{es ? 'El Blueprint organiza evidencia y acciones. No garantiza clientes, ingresos ni éxito de mercado.' : 'The Blueprint organizes evidence and action. It does not guarantee customers, revenue, or market success.'}</p>
          </div>
          <div className="min-w-0 rounded-evidence border border-evidence-border bg-surface-raised p-5 shadow-lantern sm:p-7">
            <h3 className="text-xl font-bold">{es ? 'Qué incluye' : 'What it includes'}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-soft">
              {(es ? [
                'Oferta, precio y posicionamiento personalizados',
                'Investigación de acceso al cliente y distribución',
                'Mensajes, scripts de alcance y calendario diario',
                'Launch Site Starter y activos descargables guardados en tu cuenta'
              ] : GHOSTTOWN_30_DAY_PLAN_V1.customerPromise.slice(0, 4)).map(item => <li key={item} className="flex gap-3"><span className="font-score text-rust" aria-hidden="true">→</span><span>{item}</span></li>)}
            </ul>
            <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-ink-muted">{es ? 'Después del pago, confirmas 2–3 competidores o productos adyacentes para orientar la investigación.' : 'After payment, you confirm 2–3 competitors or adjacent products to guide the research.'}</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-raised">
        <div className="mx-auto max-w-decision px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-reading">
            <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'Preguntas honestas' : 'Honest boundaries'}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'La claridad también incluye decir lo que no sabemos.' : 'Clarity also means saying what we do not know.'}</h2>
          </div>
          <div className="mt-10 grid min-w-0 gap-3 md:grid-cols-2">
            {(es ? [
              ['¿Me dirá si la idea funcionará?', 'No. Te ayuda a decidir qué probar, qué sigue siendo incierto y cuándo pausar o cambiar de dirección.'],
              ['¿Qué ocurre después del pago?', 'Confirmas las semillas de investigación, el sistema avanza por sus estados y el Blueprint queda disponible cuando termina.'],
              ['¿Necesito tener competidores elegidos?', 'No. Después del pago confirmas 2–3 competidores o productos adyacentes para orientar la investigación.'],
              ['¿Es una salida genérica de IA?', 'No es una promesa de texto genérico: usa tus respuestas, tus restricciones y señales de evidencia para organizar un plan.'],
              ['¿Qué pasa si la evidencia es débil?', 'La respuesta puede ser probar primero, reducir el nicho, pausar o detenerse. Una señal débil no se presenta como certeza.'],
              ['¿Cuánto tarda la prueba gratis?', `La evaluación está diseñada para empezar en unos cinco minutos y cubre ${litQuestions.length} preguntas enfocadas.`]
            ] : [
              ['Will it tell me whether the idea is guaranteed to work?', 'No. It helps you decide what to test, what remains uncertain, and when to pause or change direction.'],
              ['What happens after payment?', 'You confirm research seeds, the system moves through its status states, and the Blueprint becomes available when it is ready.'],
              ['Do I need competitors already selected?', 'No. After payment you confirm 2–3 competitors or adjacent products to guide the research.'],
              ['Is this generic AI output?', 'It is not a promise of generic copy: your answers, constraints, and evidence signals organize the plan.'],
              ['What if the evidence is weak?', 'The answer may be test first, narrow the niche, pause, or stop. Weak evidence is not presented as certainty.'],
              ['How long does the free test take?', `The assessment is designed to start in about five minutes and covers ${litQuestions.length} focused questions.`]
            ]).map(([question, answer]) => (
              <article key={question} className="min-w-0 rounded-card border border-border bg-canvas p-5 sm:p-6">
                <h3 className="break-words text-lg font-bold">{question}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-center text-ink-inverse">
        <div className="mx-auto max-w-decision px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust-soft">{es ? 'Una prueba. Una decisión mejor.' : 'One test. One better decision.'}</p>
          <h2 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl">{es ? 'No construyas sobre una suposición.' : 'Do not build on a guess.'}</h2>
          <p className="mx-auto mt-5 max-w-reading text-lg leading-8 text-white/70">{es ? 'Empieza gratis y descubre qué evidencia merece tu próximo mes.' : 'Start free and find out what evidence deserves your next month.'}</p>
          <button type="button" onClick={onStart} className="btn-primary mt-8">{es ? 'Probar mi idea gratis' : 'Test my idea free'}<span className="ml-2" aria-hidden="true">↗</span></button>
        </div>
      </section>

      <div id="ghosttown-landing-sticky-cta" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-dust backdrop-blur sm:hidden" >
        <button type="button"  onClick={hasDraft ? onResume : onStart} className="btn-primary w-full">
          {hasDraft ? (es ? 'Continuar evaluación' : 'Continue assessment') : (es ? 'Probar mi idea gratis' : 'Test my idea free')}
        </button>
      </div>
    </div>
  );
}
