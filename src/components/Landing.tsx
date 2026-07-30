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
  'Describe your idea',
  `Answer ${litQuestions.length} focused questions`,
  'Get a clear verdict',
  'Run the next test'
];

export default function Landing({ onStart, onSelectExample, hasDraft, onResume, isLoggedIn, onLoginClick, locale }: Props) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const es = locale === 'es';
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;
  const localizedPreviewSteps = es ? ['Describe tu idea', `Responde ${litQuestions.length} preguntas`, 'Recibe un veredicto claro', 'Ejecuta la próxima prueba'] : previewSteps;

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
      setAnimationStep(current => (current + 1) % localizedPreviewSteps.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [isPlaying, localizedPreviewSteps.length]);

  return (
    <div className="min-h-screen bg-ghost-paper pb-20 sm:pb-0">
      <section className="relative overflow-hidden bg-ghost-ink">
        <div className="landing-grid-pattern absolute inset-0" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ghost-forest/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-gray-700/30 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-ghost-sand">
              {es ? 'La prueba Ghost Town' : 'The Ghost Town Test'}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              {es ? 'Antes de construirlo,' : 'Before you build it,'}
              <span className="mt-1 block text-ghost-sand">{es ? 'prueba si merece existir.' : 'test if it deserves to exist.'}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-200 sm:text-xl">
              {es ? 'Obtén un veredicto claro y honesto sobre tu idea en unos cinco minutos, antes de invertir meses construyendo lo equivocado.' : 'Get a sharp, honest verdict on your startup idea in about five minutes—before you spend months building the wrong thing.'}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="rounded-lg bg-ghost-forest px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-ghost-sand"
              >
                {es ? 'Valida tu idea gratis' : 'Validate Your Idea Free'}
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('thirty-day-offer')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-lg border border-white/40 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                {es ? 'Ver el plan de 30 dias' : 'See the 30-Day Plan'}
              </button>
            </div>

            {hasDraft && (
              <button
                type="button"
                onClick={onResume}
                className="mt-5 flex w-full max-w-md items-center justify-between rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-left text-white backdrop-blur transition hover:bg-white/15"
              >
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-300">{es ? 'Guardado en este dispositivo' : 'Saved on this device'}</span>
                  <span className="mt-0.5 block font-bold">{es ? 'Continúa tu evaluación' : 'Resume your assessment'}</span>
                </span>
                <span className="text-xl" aria-hidden="true">→</span>
              </button>
            )}

            <p className="mt-7 text-sm font-medium text-gray-300">
              <span className="mr-4">✓ {es ? 'Una prueba gratis' : 'One free test'}</span>
              <span className="mr-4">✓ {es ? 'Sin cuenta' : 'No login required'}</span>
              <span>✓ {es ? 'Sin tarjeta' : 'No credit card'}</span>
            </p>
            {!isLoggedIn && (
              <p className="mt-4 text-sm text-gray-300">
                {es ? '¿Ya tienes una cuenta?' : 'Already have an account?'}{' '}
                <button type="button" onClick={onLoginClick} className="font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                  {es ? 'Inicia sesión' : 'Log in'}
                </button>
              </p>
            )}
          </div>

          <div className="relative">
            <div className="min-h-96 rounded-2xl border border-white/70 bg-white/95 p-7 shadow-2xl backdrop-blur sm:p-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ghost-forest">{es ? 'Cómo funciona' : 'How it works'}</p>
                  <p className="mt-1 font-bold text-gray-900">{localizedPreviewSteps[animationStep]}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {animationStep + 1}/{localizedPreviewSteps.length}
                </span>
              </div>

              <div className="flex min-h-56 items-center py-8">
                {animationStep === 0 && (
                  <div className="w-full space-y-4" aria-label="Idea description preview">
                    <div className="landing-slide-in h-7 w-2/3 rounded bg-ghost-forest" />
                    <div className="landing-slide-in landing-delay-1 h-4 rounded bg-ghost-sand" />
                    <div className="landing-slide-in landing-delay-2 h-4 w-5/6 rounded bg-ghost-sand" />
                    <div className="landing-slide-in landing-delay-3 h-16 rounded-lg border border-gray-200 bg-gray-50" />
                  </div>
                )}

                {animationStep === 1 && (
                  <div className="w-full space-y-4" aria-label="Evaluation questions preview">
                    {[72, 94, 82, 64].map((width, index) => (
                      <div key={width} className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                        <div
                          className="landing-question-pulse h-3 rounded bg-ghost-forest"
                          style={{ width: `${width}%`, animationDelay: `${index * 150}ms` }}
                        />
                      </div>
                    ))}
                    <p className="pt-1 text-center text-sm font-medium text-gray-500">
                      {es ? 'Demanda · Ventaja · Perspectiva · Momento · Defensibilidad' : 'Demand · Leverage · Insight · Timing · Defensibility'}
                    </p>
                  </div>
                )}

                {animationStep === 2 && (
                  <div className="grid w-full grid-cols-3 gap-2" aria-label="Verdict examples preview">
                    {[
                      { score: '4.2', label: es ? 'Construye ahora' : 'Build Now', colors: 'border-green-200 bg-green-50 text-green-800' },
                      { score: '3.1', label: es ? 'Prueba primero' : 'Test First', colors: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
                      { score: '2.8', label: es ? 'Reduce el nicho' : 'Niche Down', colors: 'border-orange-200 bg-orange-50 text-orange-800' }
                    ].map((verdict, index) => (
                      <div
                        key={verdict.label}
                        className={`landing-slide-up rounded-lg border p-3 text-center ${verdict.colors}`}
                        style={{ animationDelay: `${index * 180}ms` }}
                      >
                        <div className="text-2xl font-bold text-gray-900">{verdict.score}</div>
                        <div className="mt-1 text-xs font-bold">{verdict.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {animationStep === 3 && (
                  <div className="landing-slide-up w-full text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-ghost-forest" aria-hidden="true">✓</div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{es ? 'Sal con un próximo paso concreto.' : 'Leave with a concrete next step.'}</h2>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                      {es ? 'Sabrás qué demostrar, qué podría matar la idea y qué no construir todavía.' : 'Know what to prove, what could kill the idea, and what not to build yet.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex gap-2" aria-label="Explainer steps">
                  {localizedPreviewSteps.map((step, index) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setAnimationStep(index)}
                      aria-label={`Show step ${index + 1}: ${step}`}
                      aria-current={animationStep === index ? 'step' : undefined}
                      className={`h-2.5 rounded-full transition-all ${animationStep === index ? 'w-7 bg-ghost-forest' : 'w-2.5 bg-gray-300 hover:bg-gray-400'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlaying(current => !current)}
                  aria-pressed={!isPlaying}
                  className="rounded px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isPlaying ? (es ? 'Pausar vista previa' : 'Pause preview') : (es ? 'Reproducir vista previa' : 'Play preview')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExampleIdeaGallery onSelect={onSelectExample} />

      <ProofStandard locale={locale} />

      <section id="thirty-day-offer" className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ghost-rust">{es ? 'Oferta pagada' : 'Paid plan'}</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">{GHOSTTOWN_30_DAY_PLAN_V1.name}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">
              {es
                ? `Despues del veredicto gratis, compra un PDF personalizado por ${displayPrice} con tareas diarias, presupuestos, evidencia requerida y reglas para continuar, pivotar, pausar o parar.`
                : `After the free verdict, buy a personalized PDF for ${displayPrice} with daily tasks, budgets, required evidence, and rules for whether to continue, pivot, pause, or stop.`}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="font-bold text-gray-950">{es ? 'Incluye' : 'What you receive'}</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>{es ? '30 dias de acciones concretas y umbrales de evidencia.' : '30 days of concrete actions and evidence thresholds.'}</li>
              <li>{es ? 'Entrevistas, alcance, oferta, precio, pagina, piloto pagado y decision final.' : 'Interviews, outreach, offer, price, landing page, paid pilot, and final decision.'}</li>
              <li>{es ? 'PDF legible y descarga repetida desde tu cuenta.' : 'Readable PDF and repeat download from your account.'}</li>
            </ul>
            <h3 className="mt-6 font-bold text-gray-950">{es ? 'No promete' : 'What it does not promise'}</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>{es ? 'No garantiza clientes, ingresos, inversion o product-market fit.' : 'No guaranteed customers, revenue, funding, or product-market fit.'}</li>
              <li>{es ? 'No inventa citas, tamano de mercado, competidores o investigacion externa.' : 'No invented quotes, market size, competitor facts, or external research.'}</li>
              <li>{es ? 'No sustituye asesoria legal, financiera, medica o profesional.' : 'Not legal, financial, medical, or professional advice.'}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{es ? 'Para fundadores sin tiempo que perder' : 'Built for founders who don\'t have time to waste'}</h2>
          <p className="mt-4 text-lg text-gray-600">{es ? 'Una evaluación enfocada. Un veredicto útil. Una prueba que puedes ejecutar.' : 'A focused evaluation. A useful verdict. A test you can run next.'}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {(es ? [
            { icon: '01', title: 'Describe la idea', body: 'Cuéntanos qué construyes, quién lo necesita y cómo resuelve el problema hoy.' },
            { icon: '02', title: `Responde ${litQuestions.length} preguntas`, body: 'Pon a prueba la demanda, la ventaja del fundador, el momento, el modelo y la defensibilidad.' },
            { icon: '03', title: 'Obtén el próximo paso', body: 'Ve el veredicto, el mayor riesgo y la evidencia exacta que debes reunir antes de construir.' }
          ] : [
            { icon: '01', title: 'Describe the idea', body: 'Tell us what you are building, who needs it, and how they solve the problem today.' },
            { icon: '02', title: `Answer ${litQuestions.length} questions`, body: 'Pressure-test demand, founder advantage, market insight, timing, business model, and defensibility.' },
            { icon: '03', title: 'Get the next move', body: 'See the verdict, scores, biggest trap, and the exact evidence to gather before building.' }
          ]).map(item => (
            <article key={item.title} className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-bold tracking-wider text-orange-500">{item.icon}</div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-gray-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ghost-ink py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ghost-sand">Sample verdicts</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Sharp advice, without the startup theater.</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <article className="rounded-lg border border-ghost-forest/70 bg-ghost-forest/20 p-6">
              <h3 className="font-display text-2xl font-semibold text-white">Build Now</h3>
              <p className="mt-4 leading-relaxed text-gray-200">You have demand, timing, and an unfair advantage. Stop polishing the plan and secure the first three pilot commitments.</p>
              <p className="mt-5 text-sm font-bold text-ghost-sand">Next: confirm three paid pilots</p>
            </article>
            <article className="rounded-lg border border-white/20 bg-white/5 p-6">
              <h3 className="font-display text-2xl font-semibold text-white">Test First</h3>
              <p className="mt-4 leading-relaxed text-gray-300">The pain sounds real, but willingness to pay is still an assumption. Proof beats plans every time.</p>
              <p className="mt-5 text-sm font-bold text-ghost-sand">Next: pitch ten target customers</p>
            </article>
            <article className="rounded-lg border border-white/20 bg-white/5 p-6">
              <h3 className="font-display text-2xl font-semibold text-white">Kill It</h3>
              <p className="mt-4 leading-relaxed text-gray-300">There is no urgent demand or defensible advantage yet. Save six months and redirect the insight.</p>
              <p className="mt-5 text-sm font-bold text-ghost-sand">Next: find a sharper problem</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-ghost-sand py-20 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-4xl font-semibold text-ghost-ink sm:text-5xl">Stop guessing. Start validating.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-700">
            Give your idea a fair test and leave with a decision you can act on.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-9 rounded-lg bg-ghost-forest px-10 py-4 text-lg font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-ghost-forest/30"
          >
            Validate Your Idea Free
          </button>
          <p className="mt-5 text-sm text-gray-600">One free test · No commitment · No credit card</p>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={hasDraft ? onResume : onStart}
          className="min-h-12 w-full rounded-lg bg-ghost-forest px-5 py-3 font-bold text-white shadow-lg active:bg-blue-700"
        >
          {hasDraft ? 'Resume Assessment' : 'Validate My Idea Free'}
        </button>
      </div>
    </div>
  );
}
