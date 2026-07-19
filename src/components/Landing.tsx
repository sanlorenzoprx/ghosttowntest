import { litQuestions } from '../lib/litQuestions';
import ExampleIdeaGallery from './ExampleIdeaGallery';
import ProofStandard from './ProofStandard';

interface Props {
  onStart: () => void;
  onSelectExample: (slug: string) => void;
  hasDraft: boolean;
  onResume: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  locale: 'en' | 'es';
}

export default function Landing({ onStart, onSelectExample, hasDraft, onResume, isLoggedIn, onLoginClick, locale }: Props) {
  const es = locale === 'es';
  const principles = es ? [
    ['01', 'Describe la idea', 'Define el comprador, el problema urgente y la alternativa que usa hoy.'],
    ['02', `Responde ${litQuestions.length} preguntas`, 'Pon a prueba demanda, ventaja, distribución, momento y defensibilidad.'],
    ['03', 'Recibe una decisión', 'Sal con un veredicto, el mayor riesgo y una prueba concreta para ejecutar.']
  ] : [
    ['01', 'Frame the idea', 'Define the buyer, the urgent problem, and what they use today.'],
    ['02', `Answer ${litQuestions.length} questions`, 'Pressure-test demand, advantage, distribution, timing, and defensibility.'],
    ['03', 'Make a decision', 'Leave with a verdict, the biggest risk, and one test worth running next.']
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-20 text-[#1d1d1f] sm:pb-0">
      <section className="relative overflow-hidden bg-black text-white">
        <div className="hero-aurora" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:px-10 lg:pb-32 lg:pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-semibold tracking-[-0.01em] text-white/60">
              {es ? 'GhostTown Test para ideas de negocio' : 'GhostTown Test for startup ideas'}
            </p>
            <h1 className="mx-auto mt-5 max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[92px]">
              {es ? 'Descubre la verdad antes de construir.' : 'Know the truth before you build.'}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 tracking-[-0.015em] text-white/68 sm:text-xl">
              {es
                ? 'Una evaluación rigurosa de cinco minutos que convierte una idea borrosa en una decisión clara, una señal de riesgo y el próximo experimento.'
                : 'A rigorous five-minute assessment that turns a fuzzy idea into a clear decision, a risk signal, and the next experiment to run.'}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button type="button" onClick={onStart} className="premium-cta">
                {es ? 'Probar mi idea gratis' : 'Test my idea free'}
                <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('example-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                className="premium-secondary"
              >
                {es ? 'Explorar ejemplos' : 'Explore examples'}
              </button>
            </div>

            <p className="mt-6 text-sm text-white/45">
              {es ? 'Una prueba gratis · Sin cuenta · Sin tarjeta' : 'One free test · No account · No credit card'}
            </p>

            {hasDraft && (
              <button type="button" onClick={onResume} className="mx-auto mt-7 flex w-full max-w-md items-center justify-between rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 text-left backdrop-blur-xl hover:bg-white/[0.12]">
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{es ? 'Progreso guardado' : 'Progress saved'}</span>
                  <span className="mt-1 block font-semibold">{es ? 'Continuar evaluación' : 'Continue your assessment'}</span>
                </span>
                <span className="text-xl text-white/70" aria-hidden="true">→</span>
              </button>
            )}

            {!isLoggedIn && (
              <p className="mt-5 text-sm text-white/50">
                {es ? '¿Ya tienes una cuenta?' : 'Already have an account?'}{' '}
                <button type="button" onClick={onLoginClick} className="font-semibold text-white hover:text-white/75">
                  {es ? 'Iniciar sesión' : 'Sign in'}
                </button>
              </p>
            )}
          </div>

          <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="product-window">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-7">
                <div className="flex gap-2" aria-hidden="true"><span /><span /><span /></div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">GhostTown verdict</p>
              </div>
              <div className="grid gap-8 p-6 text-left sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:p-12">
                <div>
                  <p className="text-sm font-semibold text-[#6e6e73]">{es ? 'Resultado de ejemplo' : 'Example result'}</p>
                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-7xl font-semibold tracking-[-0.07em] text-[#1d1d1f]">3.7</span>
                    <span className="pb-2 text-sm font-semibold text-[#6e6e73]">/ 5.0</span>
                  </div>
                  <span className="mt-5 inline-flex rounded-full bg-[#fff2d9] px-3 py-1.5 text-sm font-semibold text-[#8a5200]">
                    {es ? 'Probar primero' : 'Test first'}
                  </span>
                </div>
                <div className="rounded-3xl bg-[#f5f5f7] p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#86868b]">{es ? 'La verdad incómoda' : 'The uncomfortable truth'}</p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">
                    {es ? 'El dolor parece real. La disposición a pagar todavía no.' : 'The pain looks real. Willingness to pay does not—yet.'}
                  </h2>
                  <div className="mt-7 border-t border-black/[0.08] pt-6">
                    <p className="text-sm font-semibold text-[#1d1d1f]">{es ? 'Próximo movimiento' : 'Next move'}</p>
                    <p className="mt-2 leading-7 text-[#6e6e73]">
                      {es ? 'Ofrece un piloto manual a diez compradores y continúa solo si tres aceptan pagar.' : 'Offer a manual pilot to ten target buyers. Continue only if three agree to pay.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="max-w-3xl">
          <p className="eyebrow">{es ? 'Diseñado para decidir' : 'Designed for decisions'}</p>
          <h2 className="section-title">{es ? 'Menos teatro. Más evidencia.' : 'Less startup theater. More evidence.'}</h2>
          <p className="section-copy">
            {es ? 'GhostTown Test no celebra cada idea. La somete a presión para que inviertas tiempo únicamente donde la evidencia lo merece.' : 'GhostTown Test does not cheerlead every idea. It pressure-tests the assumptions so you invest time only where the evidence earns it.'}
          </p>
        </div>
        <div className="mt-16 grid overflow-hidden rounded-[32px] border border-black/[0.07] bg-white md:grid-cols-3">
          {principles.map(([number, title, body], index) => (
            <article key={number} className={`p-8 sm:p-10 ${index > 0 ? 'border-t border-black/[0.07] md:border-l md:border-t-0' : ''}`}>
              <span className="text-sm font-semibold text-[#86868b]">{number}</span>
              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">{title}</h3>
              <p className="mt-4 leading-7 text-[#6e6e73]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <ProofStandard locale={locale} />
      <ExampleIdeaGallery onSelect={onSelectExample} />

      <section className="px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-black px-6 py-20 text-center text-white sm:px-12 sm:py-28">
          <p className="text-sm font-semibold text-white/50">{es ? 'Cinco minutos. Una decisión mejor.' : 'Five minutes. One better decision.'}</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {es ? 'No construyas sobre una suposición.' : 'Do not build on a guess.'}
          </h2>
          <button type="button" onClick={onStart} className="premium-cta mt-10">
            {es ? 'Probar mi idea gratis' : 'Test my idea free'} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/90 p-3 backdrop-blur-xl sm:hidden">
        <button type="button" onClick={hasDraft ? onResume : onStart} className="min-h-12 w-full rounded-full bg-[#0071e3] px-5 py-3 font-semibold text-white active:bg-[#0077ed]">
          {hasDraft ? (es ? 'Continuar evaluación' : 'Continue assessment') : (es ? 'Probar mi idea gratis' : 'Test my idea free')}
        </button>
      </div>
    </div>
  );
}
