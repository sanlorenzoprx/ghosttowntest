import { litQuestions } from '../lib/litQuestions';
import ExampleIdeaGallery from './ExampleIdeaGallery';
import ProofStandard from './ProofStandard';
import { BUSINESS_POLICY } from '../lib/businessPolicy';
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

const heroImage =
  'https://images.unsplash.com/photo-1590098563575-a82d9dcd7696?auto=format&fit=crop&w=1800&q=88';
const interviewImage =
  'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?auto=format&fit=crop&w=1800&q=88';
const conversationImage =
  'https://images.unsplash.com/photo-1765020553734-2c050ddb9494?auto=format&fit=crop&w=1800&q=88';

export default function Landing({
  onStart,
  onSelectExample,
  hasDraft,
  onResume,
  isLoggedIn,
  onLoginClick,
  locale
}: Props) {
  const es = locale === 'es';
  const displayPrice =
    import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  const blueprintDeliverables = es
    ? [
        'Hoja de ruta personalizada de lanzamiento de 30 días',
        'Oferta y estrategia de precios claras',
        'Plan de cliente objetivo y posicionamiento',
        'Investigación actual de acceso a clientes y distribución',
        'Mensajería de landing page y copy de ventas',
        'Guiones de alcance y plan de acción',
        'Prioridades semanales, hitos y métricas de éxito',
        'Calendario diario de ejecución de 30 días',
        'Launch Site Starter personalizado en Cloudflare',
        'Plan y activos terminados guardados en tu cuenta'
      ]
    : [...GHOSTTOWN_30_DAY_PLAN_V1.customerPromise];

  const objections = es
    ? [
        ['“Todavía no sé si mi idea es buena.”', 'Ese es el punto. Empieza con el veredicto gratis antes de pagar por un plan de ejecución.'],
        ['“No tengo meses para investigar.”', `La prueba gratis se enfoca en ${litQuestions.length} preguntas. Si compras el Blueprint, recibes una ruta priorizada en lugar de empezar desde una página en blanco.`],
        ['“No quiero otro PDF genérico.”', 'El Blueprint se genera a partir de tu idea, tu veredicto, tus competidores confirmados y la investigación disponible para producir acciones, guiones, copy y activos concretos.'],
        ['“¿Y si la evidencia dice que pare?”', 'Entonces parar, reducir el nicho o cambiar la oferta puede ser el resultado correcto. GhostTown está diseñado para mejorar la decisión, no para venderte optimismo.'],
        ['“¿Qué pasa si lo implemento y no obtengo resultados?”', 'La política publicada incluye una garantía condicional de devolución del 100% cuando se documenta la implementación completa y no se logra ningún resultado.']
      ]
    : [
        ['“I still don’t know if my idea is good.”', 'That is the point. Start with the free verdict before paying for an execution plan.'],
        ['“I don’t have months to research this.”', `The free test focuses on ${litQuestions.length} questions. If you buy the Blueprint, you get a prioritized path instead of another blank page.`],
        ['“I don’t want another generic PDF.”', 'The Blueprint is generated from your idea, verdict, confirmed competitors, and available research to produce concrete actions, scripts, copy, and finished assets.'],
        ['“What if the evidence says stop?”', 'Then stopping, narrowing the niche, or changing the offer may be the right result. GhostTown is built to improve the decision—not sell you optimism.'],
        ['“What if I implement it and get no results?”', 'The published policy includes a conditional 100% money-back guarantee when full implementation is documented and no results are achieved.']
      ];

  const faq = es
    ? [
        ['¿Qué recibo gratis?', 'Una prueba GhostTown con un veredicto claro, la incertidumbre principal y el siguiente experimento que vale la pena ejecutar. No necesitas tarjeta para empezar.'],
        ['¿Qué agrega el Blueprint de $97?', 'Convierte el veredicto en un sistema personalizado de ejecución de 30 días: oferta, posicionamiento, acceso a clientes, guiones, copy, calendario, hitos, evidencia y un Launch Site Starter.'],
        ['¿GhostTown garantiza que mi negocio funcionará?', 'No. Ningún veredicto o plan puede garantizar clientes, ingresos, inversión o product-market fit. GhostTown organiza evidencia y acciones para ayudarte a tomar mejores decisiones.'],
        ['¿Tengo que construir primero?', 'No. La idea es probar los supuestos más peligrosos antes de invertir meses en producto, inventario, contrataciones o anuncios.'],
        ['¿Puedo volver a descargar mi Blueprint?', 'Sí. Los activos terminados se guardan en la cuenta del cliente para acceso y descarga repetidos.']
      ]
    : [
        ['What do I get free?', 'One GhostTown test with a clear verdict, the main uncertainty, and the next experiment worth running. No credit card is required to start.'],
        ['What does the $97 Blueprint add?', 'It turns the verdict into a personalized 30-day execution system: offer, positioning, customer access, scripts, copy, calendar, milestones, evidence requirements, and a Launch Site Starter.'],
        ['Does GhostTown guarantee my business will work?', 'No. No verdict or plan can guarantee customers, revenue, funding, or product-market fit. GhostTown organizes evidence and action so you can make a better decision.'],
        ['Do I need to build first?', 'No. The goal is to test the riskiest assumptions before you spend months on product, inventory, hiring, or ads.'],
        ['Can I download my Blueprint again later?', 'Yes. Finished assets are saved to the customer account for repeat access and download.']
      ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#F6F3ED] text-[#17201C]">
      <style>{`
        body:has(#ghosttown-landing-sticky-cta) .site-header {
          position: sticky;
          top: 0;
          z-index: 60;
          border-color: rgba(23, 32, 28, 0.09);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: saturate(165%) blur(18px);
        }

        body:has(#ghosttown-landing-sticky-cta) .site-wordmark-kicker {
          display: none;
        }

        @media (max-width: 639px) {
          html:has(#ghosttown-landing-sticky-cta) {
            scroll-padding-bottom: calc(6rem + env(safe-area-inset-bottom));
          }

          body:has(#ghosttown-landing-sticky-cta) footer {
            padding-bottom: calc(6rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <section className="relative bg-[#101A17] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(202,120,76,0.20),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(52,102,82,0.24),transparent_32%)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[88rem] items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">
              {es ? 'La decisión antes de construir' : 'The decision before you build'}
            </p>
            <h1 className="mt-5 font-display text-[clamp(3rem,7vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
              {es ? 'No construyas la idea equivocada.' : 'Don’t spend months building the wrong idea.'}
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-white/[0.78] sm:text-2xl sm:leading-9">
              {es
                ? 'Pon a prueba la demanda, el acceso al comprador y la voluntad de pagar. Sal con una decisión clara y el siguiente experimento antes de invertir más tiempo y dinero.'
                : 'Pressure-test demand, buyer access, and willingness to pay. Leave with a clear decision and the next experiment before you invest more time and money.'}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white shadow-[0_18px_50px_rgba(217,111,61,0.28)] transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25"
              >
                {es ? 'Probar mi idea gratis' : 'Test My Idea Free'}
                <span className="ml-2" aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('verdict-moment')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/30 bg-white/[0.08] px-7 py-3 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/[0.14] focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                {es ? 'Ver un veredicto' : 'See a Verdict'}
              </button>
            </div>

            <p className="mt-5 text-sm font-semibold text-white/[0.65]">
              {es ? 'Una prueba gratis · Sin cuenta para empezar · Sin tarjeta' : 'One free test · No account to start · No credit card'}
            </p>

            {hasDraft && (
              <button
                type="button"
                onClick={onResume}
                className="mt-7 flex w-full max-w-lg items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left backdrop-blur transition hover:bg-white/15"
              >
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/[0.55]">
                    {es ? 'Progreso guardado' : 'Progress saved'}
                  </span>
                  <span className="mt-1 block text-base font-bold">
                    {es ? 'Continuar mi evaluación' : 'Continue my assessment'}
                  </span>
                </span>
                <span className="text-2xl text-[#E7A178]" aria-hidden="true">→</span>
              </button>
            )}

            {!isLoggedIn && (
              <p className="mt-5 text-sm text-white/[0.65]">
                {es ? '¿Ya tienes una cuenta?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="font-bold text-white underline decoration-white/[0.35] underline-offset-4 hover:decoration-white"
                >
                  {es ? 'Inicia sesión' : 'Sign in'}
                </button>
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] border border-white/10 bg-white/5 blur-sm" aria-hidden="true" />
            <figure className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.12] bg-[#192521] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
              <img
                src={heroImage}
                alt={es ? 'Fundadora trabajando en una idea antes de construirla' : 'Founder working through an idea before building it'}
                className="h-[31rem] w-full object-cover sm:h-[37rem]"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A1110] via-[#0A1110]/80 to-transparent p-6 pt-24 sm:p-8 sm:pt-28">
                <div className="max-w-lg rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7A178]">
                    {es ? 'La pregunta que importa' : 'The question that matters'}
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-tight">
                    {es ? '¿Qué evidencia necesitas antes de comprometer los próximos seis meses?' : 'What evidence do you need before committing the next six months?'}
                  </p>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'El problema' : 'The problem'}
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'La mayoría de las ideas no fallan por falta de trabajo.' : 'Most ideas do not fail because the founder did too little work.'}
            </h2>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-[#4C5550]">
              {es
                ? 'Fallan porque el fundador trabajó duro sobre el supuesto equivocado: que el problema era urgente, que el comprador era alcanzable o que alguien pagaría.'
                : 'They fail because the founder worked hard on the wrong assumption: that the problem was urgent, the buyer was reachable, or someone would actually pay.'}
            </p>
          </div>

          <div className="space-y-5">
            {(es
              ? [
                  ['Meses de producto', 'Construir más funciones no prueba demanda.'],
                  ['Dinero en anuncios', 'Más tráfico no arregla una oferta que nadie quiere.'],
                  ['Contrataciones prematuras', 'Más capacidad aumenta el costo de una suposición incorrecta.']
                ]
              : [
                  ['Months of product work', 'More features do not prove demand.'],
                  ['Money spent on ads', 'More traffic does not fix an offer nobody wants.'],
                  ['Premature hiring', 'More capacity increases the cost of a wrong assumption.']
                ]
            ).map(([title, body], index) => (
              <div key={title} className="flex gap-5 border-t border-[#DDD6CA] py-5 first:border-t-0">
                <span className="font-score text-sm font-bold text-[#A94F2A]">0{index + 1}</span>
                <div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-1 text-lg leading-7 text-[#66706A]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#EEE8DE]">
        <div className="mx-auto max-w-[78rem] px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
            {es ? 'El resultado que buscas' : 'The outcome you actually want'}
          </p>
          <h2 className="mx-auto mt-4 max-w-5xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
            {es
              ? 'Saber qué merece los próximos 30 días — y qué no.'
              : 'Know what deserves the next 30 days — and what does not.'}
          </h2>
          <p className="mx-auto mt-7 max-w-3xl text-xl leading-9 text-[#4C5550]">
            {es
              ? 'No necesitas más motivación. Necesitas una decisión: seguir, probar primero, reducir el nicho o detenerte — con una razón clara y un experimento concreto.'
              : 'You do not need more motivation. You need a decision: move forward, test first, narrow the niche, or stop—with a clear reason and a concrete experiment.'}
          </p>
        </div>
      </section>

      <section id="verdict-moment" className="bg-[#101A17] text-white">
        <div className="mx-auto grid max-w-[88rem] gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20 lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">
              {es ? 'El momento GhostTown' : 'The GhostTown moment'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Una idea borrosa se convierte en una decisión.' : 'A fuzzy idea becomes a decision.'}
            </h2>
            <p className="mt-7 text-xl leading-9 text-white/[0.72]">
              {es
                ? 'En lugar de una puntuación aislada, el veredicto muestra qué parece fuerte, qué sigue siendo una suposición y exactamente qué probar después.'
                : 'Instead of handing you a lonely score, the verdict shows what looks strong, what is still an assumption, and exactly what to test next.'}
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25"
            >
              {es ? 'Obtener mi veredicto gratis' : 'Get My Free Verdict'}
            </button>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-[#F9F7F1] p-5 text-[#17201C] shadow-[0_32px_100px_rgba(0,0,0,0.4)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DED8CE] pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A94F2A]">
                  {es ? 'Ejemplo ilustrativo' : 'Illustrative verdict'}
                </p>
                <h3 className="mt-2 text-2xl font-bold">
                  {es ? 'Herramienta de seguimiento para contratistas locales' : 'Job-proof tool for local contractors'}
                </h3>
              </div>
              <div className="rounded-full bg-[#F7EAD2] px-4 py-2 text-sm font-bold text-[#8B5B19]">
                {es ? 'Probar primero' : 'Test first'}
              </div>
            </div>

            <div className="grid gap-7 py-7 md:grid-cols-[0.55fr_1.45fr]">
              <div>
                <p className="font-score text-xs font-bold uppercase tracking-[0.12em] text-[#747C77]">
                  {es ? 'Señal' : 'Signal'}
                </p>
                <p className="mt-2 font-score text-6xl font-bold tracking-[-0.08em]">3.7</p>
                <p className="mt-1 text-sm text-[#747C77]">/ 5.0</p>
              </div>
              <div>
                <p className="font-score text-xs font-bold uppercase tracking-[0.12em] text-[#A94F2A]">
                  {es ? 'Lectura' : 'Readout'}
                </p>
                <p className="mt-2 text-2xl font-bold leading-tight">
                  {es ? 'El dolor parece real. La disposición a pagar sigue sin probarse.' : 'The pain looks real. Willingness to pay is still unproven.'}
                </p>
                <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold">{es ? 'Siguiente experimento' : 'Next experiment'}</p>
                  <p className="mt-2 text-base leading-7 text-[#59635D]">
                    {es
                      ? 'Ofrece un piloto manual a diez compradores objetivo. Continúa solo si tres aceptan pagar o dejar un depósito.'
                      : 'Offer a manual pilot to ten target buyers. Continue only if three agree to pay or place a deposit.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-[#DED8CE] pt-5 sm:grid-cols-3">
              {(es
                ? [
                    ['Fuerte', 'Problema reconocible'],
                    ['Incierto', 'Voluntad de pagar'],
                    ['Acción', 'Piloto pagado']
                  ]
                : [
                    ['Strong', 'Recognized problem'],
                    ['Uncertain', 'Willingness to pay'],
                    ['Action', 'Paid pilot']
                  ]
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white px-4 py-4">
                  <p className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#747C77]">{label}</p>
                  <p className="mt-1 font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'Cómo funciona' : 'How it works'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Tres pasos. Sin teatro de startup.' : 'Three steps. No startup theater.'}
            </h2>
            <p className="mt-6 text-xl leading-9 text-[#4C5550]">
              {es
                ? 'GhostTown reduce una decisión compleja a una secuencia guiada que puedes terminar y usar.'
                : 'GhostTown reduces a messy business decision to a guided sequence you can finish and use.'}
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {(es
              ? [
                  ['01', 'Enmarca la idea', 'Describe al comprador, el problema doloroso y cómo se resuelve hoy.'],
                  ['02', `Responde ${litQuestions.length} preguntas`, 'Presiona demanda, acceso, ventaja, momento, modelo y defensibilidad.'],
                  ['03', 'Toma una decisión', 'Recibe el veredicto, la incertidumbre principal y el siguiente experimento.']
                ]
              : [
                  ['01', 'Frame the idea', 'Describe the buyer, the painful problem, and how they solve it today.'],
                  ['02', `Answer ${litQuestions.length} focused questions`, 'Pressure-test demand, access, advantage, timing, model, and defensibility.'],
                  ['03', 'Make a decision', 'Get the verdict, the main uncertainty, and the next experiment worth running.']
                ]
            ).map(([number, title, body]) => (
              <article key={number} className="border-t-2 border-[#D96F3D] pt-7">
                <span className="font-score text-sm font-bold text-[#A94F2A]">{number}</span>
                <h3 className="mt-5 text-2xl font-bold">{title}</h3>
                <p className="mt-3 text-lg leading-8 text-[#5E6862]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#EAE3D8]">
        <div className="mx-auto grid max-w-[82rem] gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:px-8">
          <figure className="overflow-hidden rounded-[2rem] bg-[#D7CEC0] shadow-[0_24px_70px_rgba(32,37,35,0.16)]">
            <img
              src={interviewImage}
              alt={es ? 'Conversación de descubrimiento con clientes' : 'Founder conducting a customer discovery conversation'}
              className="h-[30rem] w-full object-cover sm:h-[38rem]"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'Prueba que cuenta' : 'Proof that counts'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Comportamiento del comprador. No aplausos.' : 'Buyer behavior. Not applause.'}
            </h2>
            <p className="mt-7 text-xl leading-9 text-[#4C5550]">
              {es
                ? 'Los “me gusta”, los elogios y el tamaño de mercado pueden sentirse bien sin reducir el riesgo. GhostTown prioriza señales que cuestan algo: dinero, tiempo, acceso, reputación o un cambio real de comportamiento.'
                : 'Likes, compliments, and market-size slides can feel good without reducing risk. GhostTown prioritizes signals that cost something: money, time, access, reputation, or a real change in behavior.'}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(es
                ? ['Pago o depósito', 'Piloto acordado', 'Cambio de alternativa', 'Acceso o presentación']
                : ['Payment or deposit', 'Pilot agreed', 'Switching behavior', 'Access or introduction']
              ).map(signal => (
                <div key={signal} className="rounded-2xl bg-white/70 px-5 py-4 text-base font-bold shadow-sm">
                  ✓ {signal}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[78rem] px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
            {es ? 'Primero, compruébalo tú mismo' : 'First, see what your own idea says'}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl">
            {es ? 'No tienes que comprar nada para obtener la primera decisión.' : 'You do not have to buy anything to get the first decision.'}
          </h2>
          <button
            type="button"
            onClick={onStart}
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-[#17201C] px-8 py-3 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#29342F] focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/25"
          >
            {es ? 'Probar mi idea gratis' : 'Test My Idea Free'}
          </button>
        </div>
      </section>

      <ExampleIdeaGallery onSelect={onSelectExample} locale={locale} />

      <ProofStandard locale={locale} />

      <section id="thirty-day-offer" className="bg-[#F6F3ED]">
        <div id="blueprint-offer" className="mx-auto max-w-[82rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'Cuando el veredicto merece ejecución' : 'When the verdict deserves execution'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Convierte la decisión en un lanzamiento de 30 días.' : 'Turn the decision into a 30-day launch.'}
            </h2>
            <p className="mt-7 text-xl leading-9 text-[#4C5550]">
              {es
                ? `El GhostTown Launch Blueprint de ${displayPrice} transforma tu veredicto en el trabajo concreto de conseguir evidencia real: oferta, precio, acceso a clientes, mensajes, activos y calendario.`
                : `The ${displayPrice} GhostTown Launch Blueprint turns your verdict into the concrete work of getting real evidence: offer, price, customer access, messages, assets, and a daily execution calendar.`}
            </p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="rounded-[2rem] bg-[#101A17] p-6 text-white shadow-[0_28px_90px_rgba(32,37,35,0.2)] sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7A178]">48-HOUR LAUNCH CARD</p>
                  <h3 className="mt-2 text-2xl font-bold">{es ? 'Primer movimiento comercial' : 'First commercial move'}</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75">
                  {es ? 'Personalizado' : 'Personalized'}
                </span>
              </div>
              <dl className="mt-6 space-y-5">
                {(es
                  ? [
                      ['Primer cliente', 'El comprador más accesible que puede darte una señal real.'],
                      ['Primera oferta', 'Qué pedir, a qué precio y qué compromiso cuenta.'],
                      ['Primeros 3 canales/personas', 'Dónde empezar en lugar de “publicar en todas partes”.'],
                      ['Primer mensaje', 'Copy específico para abrir la conversación.'],
                      ['Compromiso medible', 'La evidencia mínima que cambia la decisión.']
                    ]
                  : [
                      ['First customer', 'The most reachable buyer who can give you a real signal.'],
                      ['First offer', 'What to ask for, at what price, and what commitment counts.'],
                      ['First 3 channels/people', 'Where to start instead of “post everywhere.”'],
                      ['First message', 'Specific copy to open the conversation.'],
                      ['Measurable commitment', 'The minimum evidence that changes the decision.']
                    ]
                ).map(([label, value]) => (
                  <div key={label} className="grid gap-1 border-t border-white/[0.12] pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_1fr] sm:gap-5">
                    <dt className="text-sm font-bold text-[#E7A178]">{label}</dt>
                    <dd className="text-base leading-7 text-white/[0.76]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
                {es ? 'Valor visible antes del precio' : 'See the value before the price'}
              </p>
              <h3 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl">
                {es ? 'No es “contenido”. Es trabajo de lanzamiento ya estructurado.' : 'Not “content.” Launch work already structured for you.'}
              </h3>
              <p className="mt-6 text-xl leading-9 text-[#4C5550]">
                {es
                  ? 'El objetivo es eliminar páginas en blanco y decisiones innecesarias. Tu Blueprint organiza lo que debes hacer, decir, medir y entregar en el orden correcto.'
                  : 'The goal is to remove blank pages and unnecessary decisions. Your Blueprint organizes what to do, say, measure, and ship in the right order.'}
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-x-10 gap-y-8 border-y border-[#D8D0C4] py-10 md:grid-cols-2">
            {blueprintDeliverables.map((item, index) => (
              <div key={item} className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D96F3D] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-lg font-semibold leading-7">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[82rem] gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'Menos trabajo en blanco' : 'Less blank-page work'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'No te dice “haz marketing”. Te da el siguiente trabajo.' : 'It does not tell you to “do marketing.” It gives you the next work.'}
            </h2>
            <p className="mt-7 text-xl leading-9 text-[#4C5550]">
              {es
                ? 'Guiones de alcance, copy de la landing, investigación de acceso a clientes, oferta, precio, hitos y un calendario diario reducen las decisiones que normalmente frenan la ejecución.'
                : 'Outreach scripts, landing-page copy, customer-access research, offer, price, milestones, and a daily calendar reduce the decisions that normally stall execution.'}
            </p>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {(es
                ? ['Guiones listos para adaptar', 'Copy de ventas', 'Calendario diario', 'Launch Site Starter']
                : ['Ready-to-adapt outreach scripts', 'Sales-page copy', 'Daily execution calendar', 'Launch Site Starter']
              ).map(item => (
                <div key={item} className="rounded-2xl border border-[#DED8CE] bg-[#FAF8F4] p-5 text-base font-bold">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <figure className="relative overflow-hidden rounded-[2rem] shadow-[0_24px_70px_rgba(32,37,35,0.15)]">
            <img
              src={conversationImage}
              alt={es ? 'Conversación directa con un posible comprador' : 'Direct conversation with a potential buyer'}
              className="h-[34rem] w-full object-cover sm:h-[40rem]"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="absolute inset-x-5 bottom-5 rounded-2xl bg-[#101A17]/90 p-5 text-white backdrop-blur">
              <p className="text-sm font-bold text-[#E7A178]">{es ? 'La meta' : 'The goal'}</p>
              <p className="mt-1 text-xl font-semibold">
                {es ? 'Llegar a una conversación real con una oferta real.' : 'Reach a real buyer conversation with a real offer.'}
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-[#EEE8DE]">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">
              {es ? 'Las dudas razonables' : 'The reasonable doubts'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Preguntas que debes hacer antes de pagar.' : 'Questions you should ask before paying.'}
            </h2>
          </div>

          <div className="mx-auto mt-14 max-w-4xl divide-y divide-[#D0C7BA] border-y border-[#D0C7BA]">
            {objections.map(([question, answer]) => (
              <div key={question} className="grid gap-3 py-7 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
                <h3 className="text-xl font-bold">{question}</h3>
                <p className="text-lg leading-8 text-[#56605A]">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#101A17] text-white">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">
                {es ? 'El Blueprint' : 'The Blueprint'}
              </p>
              <h2 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">
                {es ? '30 días de ejecución personalizada.' : '30 days of personalized execution.'}
              </h2>
              <p className="mt-7 max-w-2xl text-xl leading-9 text-white/[0.72]">
                {es
                  ? 'Compra después de tu veredicto, cuando quieras convertir una idea que merece prueba en un sistema concreto para encontrar evidencia, clientes y una decisión de Día 30.'
                  : 'Buy after your verdict when you want to turn an idea worth testing into a concrete system for finding evidence, customers, and a Day-30 decision.'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-7 backdrop-blur sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-white/[0.55]">
                {es ? 'Precio único' : 'One-time price'}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-score text-6xl font-bold tracking-[-0.08em]">{displayPrice.replace('.00', '')}</span>
                <span className="pb-2 text-sm text-white/[0.55]">USD</span>
              </div>
              <p className="mt-5 text-base leading-7 text-white/[0.72]">
                {es
                  ? 'La prueba inicial sigue siendo gratis. Compra el Blueprint solo si quieres el sistema completo de ejecución de 30 días.'
                  : 'The initial test stays free. Buy the Blueprint only if you want the full 30-day execution system.'}
              </p>
              <div className="mt-6 rounded-xl border border-white/15 bg-black/[0.15] p-4 text-sm leading-6 text-white/[0.68]">
                <strong className="text-white">{BUSINESS_POLICY.refundPosition}.</strong>{' '}
                {es
                  ? 'Consulta la política de reembolsos para los requisitos de implementación documentada.'
                  : 'See the refund policy for the documented-implementation requirements.'}
              </div>
              <button
                type="button"
                onClick={onStart}
                className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25"
              >
                {es ? 'Empezar con el veredicto gratis' : 'Start With the Free Verdict'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[74rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">FAQ</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? 'Lo que todavía podrías querer saber.' : 'What you may still want to know.'}
            </h2>
          </div>

          <div className="mt-12 divide-y divide-[#DED8CE] border-y border-[#DED8CE]">
            {faq.map(([question, answer]) => (
              <details key={question} className="group py-2">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-xl font-bold">
                  <span>{question}</span>
                  <span className="text-2xl font-normal text-[#A94F2A] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pr-8 text-lg leading-8 text-[#56605A]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#D96F3D] text-white">
        <div className="mx-auto max-w-[78rem] px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
            {es ? 'Antes de construir' : 'Before you build'}
          </p>
          <h2 className="mx-auto mt-4 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">
            {es ? 'Descubre qué merece una prueba.' : 'Find out what deserves a test.'}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-white/[0.82]">
            {es
              ? 'Una prueba. Una decisión. Un siguiente experimento que puedes ejecutar.'
              : 'One test. One decision. One next experiment you can actually run.'}
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 py-3 text-lg font-bold text-[#17201C] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#FFF9F4] focus:outline-none focus:ring-4 focus:ring-white/[0.35]"
          >
            {es ? 'Probar mi idea gratis' : 'Test My Idea Free'}
          </button>
          <p className="mt-4 text-sm font-semibold text-white/70">
            {es ? 'Sin tarjeta. El Blueprint de $97 llega después, solo si lo quieres.' : 'No credit card. The $97 Blueprint comes later, only if you want it.'}
          </p>
        </div>
      </section>

      <div
        id="ghosttown-landing-sticky-cta"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(17,24,39,0.12)] backdrop-blur sm:hidden"
      >
        <button
          type="button"
          onClick={onStart}
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#17201C] px-5 py-3 text-base font-bold text-white"
        >
          {es ? 'Probar mi idea gratis' : 'Test My Idea Free'}
        </button>
      </div>
    </div>
  );
}
