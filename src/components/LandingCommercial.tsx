import { litQuestions } from '../lib/litQuestions';
import { BUSINESS_POLICY } from '../lib/businessPolicy';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import ExampleIdeaGallery from './ExampleIdeaGallery';
import FounderJourneyHero from './FounderJourneyHero';
import ProofStandard from './ProofStandard';
import First30Waitlist from './First30Waitlist';
import { FIRST30_OFFER_ACTIVE, SPRINT_OFFER_ACTIVE } from '../lib/postVerdictOffer';
import { GHOSTTOWN_FIRST_30_OPEN_COPY } from '../lib/ghosttownOffer';

const ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.2v.3',
  coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 6.5v11M15 9.6c-.6-1-1.7-1.6-3-1.6c-1.7 0-3 .9-3 2.200c0 3 6 1.6 6 4.600c0 1.3-1.3 2.2-3 2.200c-1.4 0-2.6-.6-3.2-1.6',
  blocks: 'M4 13h7v7H4zM13 13h7v7h-7zM8.5 4h7v7h-7z',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12',
  hourglass: 'M6 3h12M6 21h12M7 3c0 5 5 5 5 9s-5 4-5 9M17 3c0 5-5 5-5 9s5 4 5 9',
  chat: 'M4 5h16v11H9l-5 4z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z'
} as const;

// Soft colored tiles behind icons: coral, sun and leaf.
const TONES = ['bg-[#FFE9DC] text-[#B4471B]', 'bg-[#FFF1C2] text-[#8A5A00]', 'bg-[#DDF2E7] text-[#0B6B50]'] as const;

function Icon({ d, className = 'h-6 w-6' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>;
}

interface Props {
  onStart: () => void;
  onSelectExample: (slug: string) => void;
  hasDraft: boolean;
  onResume: () => void;
  isLoggedIn: boolean;
  hasUsedFreeVerdict: boolean;
  onLoginClick: () => void;
  locale: 'en' | 'es';
}

export default function LandingCommercial({
  onStart,
  onSelectExample,
  hasDraft,
  onResume,
  isLoggedIn,
  hasUsedFreeVerdict,
  onLoginClick,
  locale
}: Props) {
  const es = locale === 'es';
  const first30Open = GHOSTTOWN_FIRST_30_OPEN_COPY[locale];
  const isReturningVerdictCustomer = isLoggedIn && hasUsedFreeVerdict;
  const primaryVerdictCta = isReturningVerdictCustomer
    ? (es ? 'Probar otra idea' : 'Test Another Idea')
    : (es ? 'Probar mi idea gratis' : 'Test My Idea Free');
  const secondaryVerdictCta = isReturningVerdictCustomer
    ? (es ? 'Empezar otro veredicto' : 'Start Another Verdict')
    : (es ? 'Obtener mi veredicto gratis' : 'Get My Free Verdict');
  const displayPrice = import.meta.env.VITE_30_DAY_PLAN_DISPLAY_PRICE?.trim() || DEFAULT_30_DAY_PLAN_DISPLAY_PRICE;

  const deliverables = es
    ? [
        'Un plan de 30 días hecho para tu idea',
        'Una oferta clara y qué cobrar',
        'Quién es tu mejor cliente',
        'Dónde encontrar a esos clientes',
        'Qué decir en tu página de ventas',
        'Mensajes para contactar clientes',
        'Metas semanales fáciles de medir',
        'Qué hacer cada día por 30 días',
        'Investigación, mensajes y archivos listos para usar',
        'Todo guardado en tu cuenta para volver a usarlo'
      ]
    : [...GHOSTTOWN_30_DAY_PLAN_V1.customerPromise];

  const faq = es
    ? [
        ['¿Qué recibo gratis?', 'Un veredicto claro sobre tu idea, el mayor riesgo que vemos y qué hacer después. No necesitas tarjeta.'],
        SPRINT_OFFER_ACTIVE
          ? ['¿Qué recibo por $97?', 'Un Sprint de 30 días hecho para tu idea, con oferta, precio, clientes, mensajes, tareas diarias, investigación, reglas de evidencia y decisiones claras sobre qué hacer después. El sitio web en vivo no está incluido; Get Me Live es un producto separado de $297, pago único.']
          : FIRST30_OFFER_ACTIVE ? [GHOSTTOWN_FIRST_30_OPEN_COPY.es.faqQuestion, GHOSTTOWN_FIRST_30_OPEN_COPY.es.faqAnswer] : ['¿Qué viene después del veredicto?', 'First 30 abre pronto: treinta días de ayuda guiada para probar tu idea, con un sitio web para conseguir clientes y materiales de contacto basados en lo que investigamos: dónde ya conversan tus posibles clientes y qué problemas describen. Todavía no está a la venta. Únete a la lista y te escribiremos cuando abra.'],
        ['¿GhostTown garantiza que mi negocio funcionará?', 'No. Nadie puede prometer eso. GhostTown te ayuda a aprender antes de gastar meses y dinero.'],
        ['¿Tengo que construir algo primero?', 'No. La meta es probar primero las partes que pueden matar la idea.'],
        ...(SPRINT_OFFER_ACTIVE ? [['¿Puedo volver a descargar mi plan?', 'Sí. Tu plan y tus archivos terminados se guardan en tu cuenta.']] : [['¿Se guarda mi veredicto?', 'Sí, si creas una cuenta. Tu veredicto queda guardado en tu panel.']])
      ]
    : [
        ['What do I get free?', 'A clear verdict on your idea, the biggest risk we see, and what to do next. No credit card needed.'],
        SPRINT_OFFER_ACTIVE
          ? ['What do I get for $97?', 'A 30-day Sprint made for your idea, with your offer, price, customer, messages, daily steps, research, evidence rules, and clear decisions about what to do next. A live website is not included; Get Me Live is a separate $297 one-time product.']
          : FIRST30_OFFER_ACTIVE ? [GHOSTTOWN_FIRST_30_OPEN_COPY.en.faqQuestion, GHOSTTOWN_FIRST_30_OPEN_COPY.en.faqAnswer] : ['What comes after the verdict?', 'First 30 opens soon: thirty days of guided help to test your idea, with a customer-acquisition website and outreach materials shaped by our research into where your likely customers already talk and the problems they describe. It is not on sale yet. Join the list and we will email you when it opens.'],
        ['Does GhostTown promise my business will work?', 'No. Nobody can promise that. GhostTown helps you learn before you lose months and money.'],
        ['Do I have to build something first?', 'No. The goal is to test the parts that could kill the idea before you build.'],
        ...(SPRINT_OFFER_ACTIVE ? [['Can I download my plan again?', 'Yes. Your plan and finished files stay in your account.']] : [['Is my verdict saved?', 'Yes, if you create an account. Your verdict stays in your dashboard.']])
      ];

  return (
    <div className="min-h-screen overflow-hidden bg-day-canvas text-day-ink">
      <style>{`
        body:has(#ghosttown-commercial-sticky) .site-header {
          position: sticky;
          top: 0;
          z-index: 60;
          border-color: rgba(23, 32, 28, 0.08);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: saturate(165%) blur(18px);
        }
        body:has(#ghosttown-commercial-sticky) .site-wordmark-kicker { display: none; }
        @media (max-width: 639px) {
          html:has(#ghosttown-commercial-sticky) { scroll-padding-bottom: calc(6rem + env(safe-area-inset-bottom)); }
          body:has(#ghosttown-commercial-sticky) footer { padding-bottom: calc(6rem + env(safe-area-inset-bottom)); }
        }
      `}</style>

      <section className="day-hero relative">
        <div className="relative mx-auto grid max-w-[88rem] items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="day-pop inline-flex items-center gap-2.5 rounded-full border border-[#F2D9C4] bg-white/85 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.12em] text-[#A94F2A] shadow-quiet"><span className="h-2 w-2 rounded-full bg-day-coral" aria-hidden="true" />{es ? 'Antes de construir' : 'Before you build'}</p>
            <h1 className="mt-6 font-display text-[clamp(3rem,6.2vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-day-ink">
              {es ? <>No construyas la <span className="day-mark">idea equivocada.</span></> : <>Don’t build the <span className="day-mark">wrong idea.</span></>}
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-day-soft sm:text-2xl sm:leading-9">
              {es
                ? 'Prueba tu idea primero. Mira si la gente la quiere. Luego decide si vale la pena construirla.'
                : 'Test your idea first. See if people want it. Then decide if it’s worth building.'}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onStart} className="group inline-flex min-h-14 items-center justify-center rounded-full bg-day-coral px-8 py-3 text-lg font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/30">
                {primaryVerdictCta} <span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">→</span>
              </button>
              <button type="button" onClick={() => document.getElementById('free-verdict')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#D8D0C3] bg-white px-7 py-3 text-lg font-semibold text-day-ink shadow-quiet transition hover:-translate-y-0.5 hover:border-day-leaf hover:text-day-leaf focus:outline-none focus:ring-4 focus:ring-[#0F7A5C]/20">
                {es ? 'Ver qué recibo' : 'See What I Get'}
              </button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {(isReturningVerdictCustomer
                ? (es ? 'Completa la prueba primero · Paga solo cuando pidas el veredicto' : 'Complete the test first · Pay only when you ask for the verdict')
                : (es ? '1 prueba gratis · Sin tarjeta · Empieza ahora' : '1 free test · No credit card · Start now')
              ).split(' · ').map(item => <li key={item} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-base font-semibold text-day-soft shadow-quiet"><Icon d={ICONS.check} className="h-4 w-4 text-day-leaf" />{item}</li>)}
            </ul>

            {hasDraft && (
              <button type="button" onClick={onResume} className="mt-7 flex w-full max-w-lg items-center justify-between rounded-2xl border border-[#BFE3D0] bg-white px-5 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-day-leaf">
                <span><span className="block text-sm font-bold uppercase tracking-[0.11em] text-day-leaf">{es ? 'Guardado' : 'Saved'}</span><span className="mt-1 block text-base font-bold text-day-ink">{es ? 'Seguir donde lo dejé' : 'Keep going where I left off'}</span></span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-day-mint text-xl text-day-leaf" aria-hidden="true">→</span>
              </button>
            )}

            {!isLoggedIn && (
              <p className="mt-6 text-base text-day-soft">{es ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}<button type="button" onClick={onLoginClick} className="font-bold text-day-leaf underline decoration-[#0F7A5C]/40 underline-offset-4 hover:decoration-[#0F7A5C]">{es ? 'Entrar' : 'Sign in'}</button></p>
            )}
          </div>

          <div className="relative">
            <div className="day-float absolute -left-5 -top-6 hidden h-24 w-24 rounded-full bg-day-sun/80 sm:block" aria-hidden="true" />
            <div className="day-float absolute -bottom-7 -right-4 hidden h-28 w-28 rounded-[2rem] bg-[#F7B79A]/70 [--day-tilt:12deg] [animation-delay:1.5s] sm:block" aria-hidden="true" />
            <div className="relative"><FounderJourneyHero locale={locale} /></div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20 lg:px-8">
          <div className="day-reveal">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'El problema' : 'The problem'}</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Construir puede sentirse como progreso.' : 'Building can feel like progress.'}</h2>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-[#3F4944]">{es ? 'Pero puedes trabajar por meses y todavía no saber si alguien lo quiere.' : 'But you can work for months and still not know if anyone wants it.'}</p>
          </div>
          <div className="space-y-4">
            {(es ? [
              ['Construyes más', 'Pero más funciones no prueban que alguien pagará.'],
              ['Gastas en anuncios', 'Pero más visitas no arreglan una oferta débil.'],
              ['Esperas demasiado', 'Y el costo de estar equivocado sigue creciendo.']
            ] : [
              ['You build more', 'But more features do not prove someone will pay.'],
              ['You spend on ads', 'But more visitors do not fix a weak offer.'],
              ['You wait too long', 'And the cost of being wrong keeps growing.']
            ]).map(([title, body], index) => (
              <div key={title} className="day-card day-reveal flex items-start gap-5 rounded-3xl border border-[#EFE6D8] bg-white p-6 shadow-soft"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${TONES[index]}`}><Icon d={[ICONS.blocks, ICONS.megaphone, ICONS.hourglass][index]} className="h-7 w-7" /></span><div><h3 className="text-xl font-bold">{title}</h3><p className="mt-1 text-lg leading-7 text-[#4B5550]">{body}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-day-butter">
        <div className="day-reveal mx-auto max-w-[78rem] px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'La meta' : 'The goal'}</p>
          <h2 className="mx-auto mt-4 max-w-5xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Saber si vale la pena construirlo.' : 'Know if it’s worth building.'}</h2>
          <p className="mx-auto mt-7 max-w-3xl text-xl leading-9 text-[#3F4944]">{es ? 'No necesitas otra opinión. Necesitas saber qué se ve bien, qué puede matar la idea y qué hacer después.' : 'You do not need another opinion. You need to know what looks good, what could kill the idea, and what to do next.'}</p>
        </div>
      </section>

      <section id="free-verdict" className="bg-day-mint">
        <div className="mx-auto grid max-w-[84rem] gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20 lg:px-8">
          <div className="day-reveal">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-day-leaf">{es ? 'Tu prueba gratis' : 'Your free test'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Una respuesta que puedes usar.' : 'An answer you can use.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? 'GhostTown mira las partes que más importan: ¿hay un problema real? ¿puedes llegar al comprador? ¿pagaría? ¿qué debes hacer después?' : 'GhostTown looks at the parts that matter most: Is the problem real? Can you reach the buyer? Will they pay? What should you do next?'}</p>
            <button type="button" onClick={onStart} className="group mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-day-coral px-8 py-3 text-lg font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/30">{secondaryVerdictCta} <span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">→</span></button>
          </div>

          <div className="day-reveal rounded-[2rem] border border-white bg-white p-5 text-[#17201C] shadow-pop transition duration-300 sm:p-8 lg:rotate-1 lg:hover:rotate-0">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFE6D8] pb-6"><div><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#943F20]">GHOSTTOWN VERDICT</p><h3 className="mt-2 text-2xl font-bold">{es ? '¿Vale la pena construirlo?' : 'Is it worth building?'}</h3></div><span className="rounded-full bg-[#FFE7A8] px-4 py-2 text-sm font-bold text-[#75480E]">{es ? 'PROBAR PRIMERO' : 'TEST FIRST'}</span></div>
            <div className="grid gap-4 pt-7 sm:grid-cols-3">
              {(es ? [
                ['Se ve bien', 'El problema es fácil de entender.'],
                ['Hay riesgo', 'Todavía no sabes si pagarán.'],
                ['Demuestra que pagarán', 'Pide a clientes probables que paguen por una versión simple antes de construir más.']
              ] : [
                ['Looks good', 'The problem is easy to understand.'],
                ['Big risk', 'You still do not know if people will pay.'],
                ["Prove they'll pay", 'Ask likely customers to pay for a simple version before you build more.']
              ]).map(([label, body], index) => <div key={label} className={`rounded-2xl border p-5 ${['border-[#BFE3D0] bg-[#EEF8F3]', 'border-[#F3DFA6] bg-[#FFF8E1]', 'border-[#F5CDB8] bg-[#FFF1E8]'][index]}`}><p className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] ${['text-[#0B6B50]', 'text-[#7A5000]', 'text-[#943F20]'][index]}`}><Icon d={[ICONS.check, ICONS.alert, ICONS.coin][index]} className="h-5 w-5 shrink-0" />{label}</p><p className="mt-3 text-lg font-semibold leading-7 text-[#202825]">{body}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[78rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="day-reveal mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Cómo funciona' : 'How it works'}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Tres pasos simples.' : 'Three simple steps.'}</h2></div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {(es ? [
              ['01', 'Cuéntanos tu idea', 'Quién es el cliente, qué problema tiene y cómo lo resuelve hoy.'],
              ['02', `Responde ${litQuestions.length} preguntas`, 'Preguntas cortas sobre demanda, precio, competencia y cómo llegar al cliente.'],
              ['03', 'Recibe tu veredicto', 'Ve si debes seguir, cambiar la idea, reducir el nicho o probar algo primero.']
            ] : [
              ['01', 'Tell us the idea', 'Who the customer is, what hurts, and how they solve it today.'],
              ['02', `Answer ${litQuestions.length} questions`, 'Short questions about demand, price, competition, and how you will reach the buyer.'],
              ['03', 'Get your verdict', 'See if you should move forward, change it, narrow it, or test something first.']
            ]).map(([number, title, body], index) => <article key={number} className="day-card day-reveal rounded-3xl border border-[#EFE6D8] bg-day-canvas p-8 shadow-soft"><div className="flex items-center justify-between"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${TONES[index]}`}><Icon d={[ICONS.chat, ICONS.list, ICONS.star][index]} className="h-7 w-7" /></span><span className="font-display text-5xl font-semibold text-[#E6D9C5]" aria-hidden="true">{number}</span></div><h3 className="mt-6 text-2xl font-bold">{title}</h3><p className="mt-3 text-lg leading-8 text-[#46504A]">{body}</p></article>)}
          </div>
          <div className="mt-12 text-center"><button type="button" onClick={onStart} className="group inline-flex min-h-14 items-center justify-center rounded-full bg-day-coral px-8 py-3 text-lg font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/30">{primaryVerdictCta} <span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">→</span></button></div>
        </div>
      </section>

      <ExampleIdeaGallery onSelect={onSelectExample} locale={locale} />
      <ProofStandard locale={locale} />

      {FIRST30_OFFER_ACTIVE && <section className="bg-day-peach" data-first30-open>
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{first30Open.kicker}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{first30Open.headline}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{first30Open.body}</p>
            <p className="mt-4 text-lg font-semibold leading-8 text-day-ink">{first30Open.whereToBuy}</p>
          </div>
          <div className="day-reveal rounded-3xl border border-white bg-white p-6 shadow-pop sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#A94F2A]">{first30Open.includesTitle}</p>
            <ul className="mt-4 space-y-3 text-base leading-7 text-[#3F4944]">{first30Open.includes.map(item => <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-day-mint text-sm font-black text-day-leaf">✓</span><span>{item}</span></li>)}</ul>
            <p className="mt-5 text-sm leading-6 text-[#3F4944]">{first30Open.refund}</p>
            <button type="button" onClick={onStart} className="mt-6 w-full rounded-full bg-day-coral px-6 py-4 text-lg font-black text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover">{first30Open.cta}</button>
            <p className="mt-4 text-xs leading-5 text-gray-500">{first30Open.boundary}</p>
          </div>
        </div>
      </section>}
      {!SPRINT_OFFER_ACTIVE && !FIRST30_OFFER_ACTIVE && <section className="bg-day-peach">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Si la idea merece una prueba' : 'If the idea is worth testing'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'First 30 abre pronto.' : 'First 30 opens soon.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? 'Tu veredicto es gratis hoy. Después viene First 30: treinta días de ayuda guiada para probar tu idea con clientes reales. GhostTown encuentra lugares donde tus posibles clientes ya conversan, investiga los problemas que describen y usa lo que dicen para dar forma a tu sitio web y a los mensajes y contenido que pruebas durante esos 30 días. Así no adivinas qué decir ni dónde decirlo: tu sitio web y tus primeros mensajes usan las palabras que tus clientes ya usan, en los lugares donde ya conversan. Únete a la lista y te escribiremos cuando abra.' : 'Your verdict is free today. Next comes First 30: thirty days of guided help to test your idea with real customers. GhostTown finds places where your likely customers are already talking, researches the problems they describe, and uses what they say to shape your website and the messages and content you test during those 30 days. That way you are not guessing what to say or where to say it: your website and first messages use the words your customers already use, in the places where they already talk. Join the list and we will email you when it opens.'}</p>
          </div>
          <First30Waitlist source="landing" locale={locale} />
        </div>
      </section>}
      {SPRINT_OFFER_ACTIVE && <section className="bg-day-peach">
        <div className="mx-auto max-w-[82rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Si la idea merece una prueba' : 'If the idea is worth testing'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Te damos un plan para lanzarla.' : 'We give you the plan to launch it.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? `Por ${displayPrice}, tu GhostTown Launch Blueprint te dice qué vender, a quién, qué cobrar, qué decir y qué hacer durante los próximos 30 días.` : `For ${displayPrice}, your GhostTown Launch Blueprint tells you what to sell, who to sell it to, what to charge, what to say, and what to do for the next 30 days.`}</p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="day-pine rounded-[2rem] p-6 text-white shadow-pop sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#FFD27A]">48-HOUR LAUNCH CARD</p>
              <h3 className="mt-2 text-2xl font-bold">{es ? 'Tus primeras 48 horas' : 'Your first 48 hours'}</h3>
              <dl className="mt-6 divide-y divide-white/18 border-y border-white/18">
                {(es ? [
                  ['Primer cliente', 'La persona más fácil de alcanzar que puede darte una señal real.'],
                  ['Primera oferta', 'Qué vender y qué pedir.'],
                  ['Primer mensaje', 'Las palabras para abrir la conversación.'],
                  ['Prueba real', 'Qué debe hacer el comprador para demostrar interés.']
                ] : [
                  ['First customer', 'The easiest real buyer to reach.'],
                  ['First offer', 'What to sell and what to ask for.'],
                  ['First message', 'The words to start the conversation.'],
                  ['Real proof', 'What the buyer must do to show real interest.']
                ]).map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5"><dt className="text-base font-bold text-[#FFD27A]">{label}</dt><dd className="text-base leading-7 text-white/88">{value}</dd></div>)}
              </dl>
            </div>
            <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Menos trabajo en blanco' : 'Less blank-page work'}</p><h3 className="mt-4 font-display text-4xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl">{es ? 'No te decimos “haz marketing”. Te damos el trabajo.' : 'We do not tell you to “do marketing.” We give you the work.'}</h3><p className="mt-6 text-xl leading-9 text-[#3F4944]">{es ? 'Mensajes, copy de ventas, investigación, reglas de evidencia y tareas diarias ya quedan organizados alrededor de tu idea.' : 'Messages, sales copy, research, evidence rules, and daily steps are already organized around your idea.'}</p></div>
          </div>

          <div className="mt-16 grid gap-x-10 gap-y-8 border-y border-[#CFC6B8] py-10 md:grid-cols-2">
            {deliverables.map((item, index) => <div key={item} className="flex gap-4"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D96F3D] text-sm font-bold text-white">{index + 1}</span><p className="text-lg font-semibold leading-7">{item}</p></div>)}
          </div>
        </div>
      </section>}

      {SPRINT_OFFER_ACTIVE && <section className="bg-white">
        <div className="mx-auto grid max-w-[82rem] gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Siguiente paso opcional' : 'Optional next step'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Get Me Live cuando estés listo.' : 'Get Me Live when you are ready.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? 'Get Me Live es un producto separado de $297, pago único. Convierte la oferta probada de tu Sprint en una experiencia en vivo para clientes, con captura de interesados, seguimiento, publicación y comprobante de lanzamiento.' : 'Get Me Live is a separate $297 one-time product. It turns the tested offer from your Sprint into a live customer experience with lead capture, tracking, publishing, and release proof.'}</p>
            <ul className="mt-8 space-y-3 text-lg font-semibold text-[#303934]">{(es ? ['Tu mensaje', 'Tu oferta y precio', 'Tu llamada a la acción', 'Listo para mostrar a clientes'] : ['Your message', 'Your offer and price', 'Your call to action', 'Ready to show customers']).map(item => <li key={item}>✓ {item}</li>)}</ul>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#CDC5B9] bg-[#FBF8F2] shadow-[0_24px_70px_rgba(32,37,35,0.15)]">
            <div className="flex items-center gap-2 border-b border-[#CDC5B9] bg-white px-5 py-3"><span className="h-2.5 w-2.5 rounded-full bg-[#D96F3D]" /><span className="h-2.5 w-2.5 rounded-full bg-[#DDB763]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4F8A70]" /><div className="ml-4 flex-1 rounded-full bg-[#F0ECE5] px-4 py-2 text-sm text-[#505954]">youridea.com</div></div>
            <div className="day-pine px-7 py-12 text-white sm:px-10 sm:py-16"><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#FFD27A]">YOUR IDEA</p><h3 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.025em] sm:text-5xl">{es ? 'Una página creada para que tu cliente entienda por qué esto importa.' : 'A page built so your customer understands why this matters.'}</h3><p className="mt-5 max-w-lg text-lg leading-8 text-white/88">{es ? 'Problema claro. Oferta clara. Próximo paso claro.' : 'Clear problem. Clear offer. Clear next step.'}</p><div className="mt-8 inline-flex rounded-full bg-[#D96F3D] px-6 py-3 text-base font-bold">{es ? 'Quiero saber más' : 'I Want to Learn More'}</div></div>
          </div>
        </div>
      </section>}

      {SPRINT_OFFER_ACTIVE && <section className="bg-day-butter">
        <div className="mx-auto max-w-[76rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Dudas normales' : 'Fair questions'}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Antes de pagar, debes entender esto.' : 'Before you pay, you should know this.'}</h2></div>
          <div className="mx-auto mt-14 max-w-4xl divide-y divide-[#C8BFB2] border-y border-[#C8BFB2]">
            {(es ? [
              ['“¿Y si mi idea no es buena?”', 'Haz primero la prueba gratis. No compres el plan hasta ver tu veredicto.'],
              ['“¿Y si debo parar?”', 'Parar puede ser la respuesta correcta. Ahorrar seis meses también es ganar.'],
              ['“¿Esto es solo otro PDF?”', 'No. Recibes pasos diarios, investigación, mensajes, copy, archivos y reglas claras para decidir qué hacer después.'],
              ['“¿Y si hago el plan y no pasa nada?”', 'La política publicada incluye una garantía condicional de devolución del 100% cuando puedes demostrar que hiciste el trabajo y no obtuviste resultados.']
            ] : [
              ['“What if my idea is bad?”', 'Take the free test first. Do not buy the plan until you see your verdict.'],
              ['“What if I should stop?”', 'Stopping can be the right answer. Saving six months is also a win.'],
              ['“Is this just another PDF?”', 'No. You get daily steps, research, messages, sales copy, finished files, and clear rules for deciding what to do next.'],
              ['“What if I do the plan and nothing happens?”', 'The published policy includes a conditional 100% money-back guarantee when you can document full implementation and no results.']
            ]).map(([question, answer]) => <div key={question} className="grid gap-3 py-7 md:grid-cols-[0.8fr_1.2fr] md:gap-10"><h3 className="text-xl font-bold">{question}</h3><p className="text-lg leading-8 text-[#414A45]">{answer}</p></div>)}
          </div>
        </div>
      </section>}

      {SPRINT_OFFER_ACTIVE && <section className="day-pine text-white">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:px-8">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FFD27A]">GHOSTTOWN LAUNCH BLUEPRINT</p><h2 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.025em] sm:text-7xl">{es ? 'De idea a prueba real en 30 días.' : 'From idea to real proof in 30 days.'}</h2><p className="mt-7 max-w-2xl text-xl leading-9 text-white/86">{es ? 'Primero haces la prueba gratis. Si vale la pena seguir, el Blueprint te da el camino.' : 'Take the free test first. If the idea is worth moving forward with, the Blueprint gives you the path.'}</p></div>
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 sm:p-8"><p className="text-base font-bold uppercase tracking-[0.13em] text-white/82">{es ? 'Pago único' : 'One-time price'}</p><div className="mt-2 flex items-end gap-2"><span className="font-score text-6xl font-bold tracking-[-0.08em]">{displayPrice.replace('.00', '')}</span><span className="pb-2 text-base text-white/82">USD</span></div><p className="mt-5 text-base leading-7 text-white/88">{es ? 'No necesitas comprar para obtener tu primer veredicto.' : 'You do not need to buy anything to get your first verdict.'}</p><div className="mt-6 rounded-xl border border-white/20 bg-black/10 p-4 text-base leading-7 text-white/85"><strong className="text-white">{BUSINESS_POLICY.refundPosition}.</strong> {es ? 'Consulta la política para los requisitos.' : 'See the refund policy for the requirements.'}</div><button type="button" onClick={onStart} className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-day-coral px-7 py-3 text-lg font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-day-coral-hover focus:outline-none focus:ring-4 focus:ring-white/25">{isReturningVerdictCustomer ? (es ? 'Empezar otro veredicto' : 'Start Another Verdict') : (es ? 'Empezar con la prueba gratis' : 'Start With the Free Test')}</button></div>
        </div>
      </section>}

      <section className="bg-white">
        <div className="mx-auto max-w-[74rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">FAQ</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Preguntas rápidas.' : 'Quick answers.'}</h2></div>
          <div className="mt-10 space-y-3">{faq.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-[#EFE6D8] bg-day-canvas px-5 transition open:bg-white open:shadow-soft hover:border-[#D8C9B2] sm:px-7"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-xl font-bold [&::-webkit-details-marker]:hidden"><span>{question}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFE9DC] text-2xl font-normal leading-none text-[#A94F2A] transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-3xl pb-7 pr-8 text-lg leading-8 text-[#414A45]">{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="day-coral text-white">
        <div className="mx-auto max-w-[78rem] px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8"><p className="text-base font-bold uppercase tracking-[0.15em] text-white/90">{es ? 'Antes de construir' : 'Before you build'}</p><h2 className="mx-auto mt-4 max-w-5xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.025em] sm:text-7xl">{es ? 'Descubre si vale la pena.' : 'Find out if it’s worth building.'}</h2><p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-white/95">{es ? 'Una prueba. Un veredicto. Un siguiente paso claro.' : 'One test. One verdict. One clear next step.'}</p><button type="button" onClick={onStart} className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-9 py-3 text-lg font-bold text-[#17201C] shadow-xl transition hover:-translate-y-1 hover:bg-[#FFF9F4] focus:outline-none focus:ring-4 focus:ring-white/35">{primaryVerdictCta}</button><p className="mt-4 text-base font-semibold text-white/90">{SPRINT_OFFER_ACTIVE ? (es ? 'Sin tarjeta. El plan de $97 viene después, solo si lo quieres.' : 'No credit card. The $97 plan comes later, only if you want it.') : (es ? 'Sin tarjeta. No tienes que comprar nada.' : 'No credit card. Nothing to buy.')}</p></div>
      </section>

      <div id="ghosttown-commercial-sticky" className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/97 p-3 shadow-[0_-12px_35px_rgba(17,24,39,0.12)] backdrop-blur sm:hidden"><button type="button" onClick={onStart} className="flex min-h-12 w-full items-center justify-center rounded-full bg-day-coral px-5 py-3 text-base font-bold text-white shadow-cta">{primaryVerdictCta}</button></div>
    </div>
  );
}
