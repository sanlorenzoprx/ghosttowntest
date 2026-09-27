import { litQuestions } from '../lib/litQuestions';
import { BUSINESS_POLICY } from '../lib/businessPolicy';
import { DEFAULT_30_DAY_PLAN_DISPLAY_PRICE, GHOSTTOWN_30_DAY_PLAN_V1 } from '../lib/ghosttownOffer';
import ExampleIdeaGallery from './ExampleIdeaGallery';
import FounderJourneyHero from './FounderJourneyHero';
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

export default function LandingCommercial({
  onStart,
  onSelectExample,
  hasDraft,
  onResume,
  isLoggedIn,
  onLoginClick,
  locale
}: Props) {
  const es = locale === 'es';
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
        ['¿Qué recibo por $97?', 'Un Sprint de 30 días hecho para tu idea, con oferta, precio, clientes, mensajes, tareas diarias, investigación, reglas de evidencia y decisiones claras sobre qué hacer después. El sitio web en vivo no está incluido; Get Me Live es un producto separado de $297, pago único.'],
        ['¿GhostTown garantiza que mi negocio funcionará?', 'No. Nadie puede prometer eso. GhostTown te ayuda a aprender antes de gastar meses y dinero.'],
        ['¿Tengo que construir algo primero?', 'No. La meta es probar primero las partes que pueden matar la idea.'],
        ['¿Puedo volver a descargar mi plan?', 'Sí. Tu plan y tus archivos terminados se guardan en tu cuenta.']
      ]
    : [
        ['What do I get free?', 'A clear verdict on your idea, the biggest risk we see, and what to do next. No credit card needed.'],
        ['What do I get for $97?', 'A 30-day Sprint made for your idea, with your offer, price, customer, messages, daily steps, research, evidence rules, and clear decisions about what to do next. A live website is not included; Get Me Live is a separate $297 one-time product.'],
        ['Does GhostTown promise my business will work?', 'No. Nobody can promise that. GhostTown helps you learn before you lose months and money.'],
        ['Do I have to build something first?', 'No. The goal is to test the parts that could kill the idea before you build.'],
        ['Can I download my plan again?', 'Yes. Your plan and finished files stay in your account.']
      ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#F6F3ED] text-[#17201C]">
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

      <section className="relative bg-[#101A17] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(217,111,61,0.20),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(55,110,87,0.24),transparent_32%)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[88rem] items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">{es ? 'Antes de construir' : 'Before you build'}</p>
            <h1 className="mt-5 font-display text-[clamp(3.4rem,7vw,6.6rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
              {es ? 'No construyas la idea equivocada.' : 'Don’t build the wrong idea.'}
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-8 text-white/88 sm:text-2xl sm:leading-9">
              {es
                ? 'Prueba tu idea primero. Mira si la gente la quiere. Luego decide si vale la pena construirla.'
                : 'Test your idea first. See if people want it. Then decide if it’s worth building.'}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onStart} className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white shadow-[0_18px_50px_rgba(217,111,61,0.28)] transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25">
                {es ? 'Probar mi idea gratis' : 'Test My Idea Free'} <span className="ml-2" aria-hidden="true">→</span>
              </button>
              <button type="button" onClick={() => document.getElementById('free-verdict')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 py-3 text-lg font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20">
                {es ? 'Ver qué recibo' : 'See What I Get'}
              </button>
            </div>
            <p className="mt-5 text-base font-semibold text-white/82">{es ? '1 prueba gratis · Sin tarjeta · Empieza ahora' : '1 free test · No credit card · Start now'}</p>

            {hasDraft && (
              <button type="button" onClick={onResume} className="mt-7 flex w-full max-w-lg items-center justify-between rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-left transition hover:bg-white/15">
                <span><span className="block text-sm font-bold uppercase tracking-[0.11em] text-white/82">{es ? 'Guardado' : 'Saved'}</span><span className="mt-1 block text-base font-bold">{es ? 'Seguir donde lo dejé' : 'Keep going where I left off'}</span></span>
                <span className="text-2xl text-[#E7A178]" aria-hidden="true">→</span>
              </button>
            )}

            {!isLoggedIn && (
              <p className="mt-5 text-base text-white/82">{es ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}<button type="button" onClick={onLoginClick} className="font-bold text-white underline decoration-white/45 underline-offset-4 hover:decoration-white">{es ? 'Entrar' : 'Sign in'}</button></p>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] border border-white/10 bg-white/5 blur-sm" aria-hidden="true" />
            <div className="relative"><FounderJourneyHero locale={locale} /></div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'El problema' : 'The problem'}</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Construir puede sentirse como progreso.' : 'Building can feel like progress.'}</h2>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-[#3F4944]">{es ? 'Pero puedes trabajar por meses y todavía no saber si alguien lo quiere.' : 'But you can work for months and still not know if anyone wants it.'}</p>
          </div>
          <div className="divide-y divide-[#D2C9BC] border-y border-[#D2C9BC]">
            {(es ? [
              ['Construyes más', 'Pero más funciones no prueban que alguien pagará.'],
              ['Gastas en anuncios', 'Pero más visitas no arreglan una oferta débil.'],
              ['Esperas demasiado', 'Y el costo de estar equivocado sigue creciendo.']
            ] : [
              ['You build more', 'But more features do not prove someone will pay.'],
              ['You spend on ads', 'But more visitors do not fix a weak offer.'],
              ['You wait too long', 'And the cost of being wrong keeps growing.']
            ]).map(([title, body], index) => (
              <div key={title} className="grid grid-cols-[3rem_1fr] gap-3 py-6"><span className="font-score text-base font-bold text-[#A94F2A]">0{index + 1}</span><div><h3 className="text-xl font-bold">{title}</h3><p className="mt-1 text-lg leading-7 text-[#4B5550]">{body}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F3EEE5]">
        <div className="mx-auto max-w-[78rem] px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'La meta' : 'The goal'}</p>
          <h2 className="mx-auto mt-4 max-w-5xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Saber si vale la pena construirlo.' : 'Know if it’s worth building.'}</h2>
          <p className="mx-auto mt-7 max-w-3xl text-xl leading-9 text-[#3F4944]">{es ? 'No necesitas otra opinión. Necesitas saber qué se ve bien, qué puede matar la idea y qué hacer después.' : 'You do not need another opinion. You need to know what looks good, what could kill the idea, and what to do next.'}</p>
        </div>
      </section>

      <section id="free-verdict" className="bg-[#101A17] text-white">
        <div className="mx-auto grid max-w-[84rem] gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">{es ? 'Tu prueba gratis' : 'Your free test'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Una respuesta que puedes usar.' : 'An answer you can use.'}</h2>
            <p className="mt-7 text-xl leading-9 text-white/88">{es ? 'GhostTown mira las partes que más importan: ¿hay un problema real? ¿puedes llegar al comprador? ¿pagaría? ¿qué debes hacer después?' : 'GhostTown looks at the parts that matter most: Is the problem real? Can you reach the buyer? Will they pay? What should you do next?'}</p>
            <button type="button" onClick={onStart} className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25">{es ? 'Obtener mi veredicto gratis' : 'Get My Free Verdict'}</button>
          </div>

          <div className="rounded-[2rem] bg-[#FFFDF9] p-5 text-[#17201C] shadow-[0_32px_100px_rgba(0,0,0,0.4)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D5CEC3] pb-6"><div><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#943F20]">GHOSTTOWN VERDICT</p><h3 className="mt-2 text-2xl font-bold">{es ? '¿Vale la pena construirlo?' : 'Is it worth building?'}</h3></div><span className="rounded-full bg-[#F5E4C5] px-4 py-2 text-sm font-bold text-[#75480E]">{es ? 'PROBAR PRIMERO' : 'TEST FIRST'}</span></div>
            <div className="grid gap-6 py-7 sm:grid-cols-3">
              {(es ? [
                ['Se ve bien', 'El problema es fácil de entender.'],
                ['Hay riesgo', 'Todavía no sabes si pagarán.'],
                ['Demuestra que pagarán', 'Pide a clientes probables que paguen por una versión simple antes de construir más.']
              ] : [
                ['Looks good', 'The problem is easy to understand.'],
                ['Big risk', 'You still do not know if people will pay.'],
                ["Prove they'll pay", 'Ask likely customers to pay for a simple version before you build more.']
              ]).map(([label, body]) => <div key={label} className="rounded-2xl border border-[#E7E0D5] bg-white p-5"><p className="text-sm font-bold uppercase tracking-[0.1em] text-[#943F20]">{label}</p><p className="mt-2 text-lg font-semibold leading-7 text-[#202825]">{body}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Cómo funciona' : 'How it works'}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Tres pasos simples.' : 'Three simple steps.'}</h2></div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {(es ? [
              ['01', 'Cuéntanos tu idea', 'Quién es el cliente, qué problema tiene y cómo lo resuelve hoy.'],
              ['02', `Responde ${litQuestions.length} preguntas`, 'Preguntas cortas sobre demanda, precio, competencia y cómo llegar al cliente.'],
              ['03', 'Recibe tu veredicto', 'Ve si debes seguir, cambiar la idea, reducir el nicho o probar algo primero.']
            ] : [
              ['01', 'Tell us the idea', 'Who the customer is, what hurts, and how they solve it today.'],
              ['02', `Answer ${litQuestions.length} questions`, 'Short questions about demand, price, competition, and how you will reach the buyer.'],
              ['03', 'Get your verdict', 'See if you should move forward, change it, narrow it, or test something first.']
            ]).map(([number, title, body]) => <article key={number} className="border-t-2 border-[#D96F3D] pt-7"><span className="font-score text-base font-bold text-[#A94F2A]">{number}</span><h3 className="mt-5 text-2xl font-bold">{title}</h3><p className="mt-3 text-lg leading-8 text-[#46504A]">{body}</p></article>)}
          </div>
        </div>
      </section>

      <ExampleIdeaGallery onSelect={onSelectExample} locale={locale} />
      <ProofStandard locale={locale} />

      <section className="bg-[#F8F4ED]">
        <div className="mx-auto max-w-[82rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Si la idea merece una prueba' : 'If the idea is worth testing'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Te damos un plan para lanzarla.' : 'We give you the plan to launch it.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? `Por ${displayPrice}, tu GhostTown Launch Blueprint te dice qué vender, a quién, qué cobrar, qué decir y qué hacer durante los próximos 30 días.` : `For ${displayPrice}, your GhostTown Launch Blueprint tells you what to sell, who to sell it to, what to charge, what to say, and what to do for the next 30 days.`}</p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="rounded-[2rem] bg-[#101A17] p-6 text-white shadow-[0_28px_90px_rgba(32,37,35,0.2)] sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#F0B28F]">48-HOUR LAUNCH CARD</p>
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
                ]).map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5"><dt className="text-base font-bold text-[#F0B28F]">{label}</dt><dd className="text-base leading-7 text-white/88">{value}</dd></div>)}
              </dl>
            </div>
            <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Menos trabajo en blanco' : 'Less blank-page work'}</p><h3 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl">{es ? 'No te decimos “haz marketing”. Te damos el trabajo.' : 'We do not tell you to “do marketing.” We give you the work.'}</h3><p className="mt-6 text-xl leading-9 text-[#3F4944]">{es ? 'Mensajes, copy de ventas, investigación, reglas de evidencia y tareas diarias ya quedan organizados alrededor de tu idea.' : 'Messages, sales copy, research, evidence rules, and daily steps are already organized around your idea.'}</p></div>
          </div>

          <div className="mt-16 grid gap-x-10 gap-y-8 border-y border-[#CFC6B8] py-10 md:grid-cols-2">
            {deliverables.map((item, index) => <div key={item} className="flex gap-4"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D96F3D] text-sm font-bold text-white">{index + 1}</span><p className="text-lg font-semibold leading-7">{item}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[82rem] gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Siguiente paso opcional' : 'Optional next step'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Get Me Live cuando estés listo.' : 'Get Me Live when you are ready.'}</h2>
            <p className="mt-7 text-xl leading-9 text-[#3F4944]">{es ? 'Get Me Live es un producto separado de $297, pago único. Convierte la oferta probada de tu Sprint en una experiencia en vivo para clientes, con captura de interesados, seguimiento, publicación y comprobante de lanzamiento.' : 'Get Me Live is a separate $297 one-time product. It turns the tested offer from your Sprint into a live customer experience with lead capture, tracking, publishing, and release proof.'}</p>
            <ul className="mt-8 space-y-3 text-lg font-semibold text-[#303934]">{(es ? ['Tu mensaje', 'Tu oferta y precio', 'Tu llamada a la acción', 'Listo para mostrar a clientes'] : ['Your message', 'Your offer and price', 'Your call to action', 'Ready to show customers']).map(item => <li key={item}>✓ {item}</li>)}</ul>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#CDC5B9] bg-[#FBF8F2] shadow-[0_24px_70px_rgba(32,37,35,0.15)]">
            <div className="flex items-center gap-2 border-b border-[#CDC5B9] bg-white px-5 py-3"><span className="h-2.5 w-2.5 rounded-full bg-[#D96F3D]" /><span className="h-2.5 w-2.5 rounded-full bg-[#DDB763]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4F8A70]" /><div className="ml-4 flex-1 rounded-full bg-[#F0ECE5] px-4 py-2 text-sm text-[#505954]">youridea.com</div></div>
            <div className="bg-[#14201C] px-7 py-12 text-white sm:px-10 sm:py-16"><p className="text-sm font-bold uppercase tracking-[0.13em] text-[#F0B28F]">YOUR IDEA</p><h3 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-5xl">{es ? 'Una página creada para que tu cliente entienda por qué esto importa.' : 'A page built so your customer understands why this matters.'}</h3><p className="mt-5 max-w-lg text-lg leading-8 text-white/88">{es ? 'Problema claro. Oferta clara. Próximo paso claro.' : 'Clear problem. Clear offer. Clear next step.'}</p><div className="mt-8 inline-flex rounded-full bg-[#D96F3D] px-6 py-3 text-base font-bold">{es ? 'Quiero saber más' : 'I Want to Learn More'}</div></div>
          </div>
        </div>
      </section>

      <section className="bg-[#F3EEE5]">
        <div className="mx-auto max-w-[76rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? 'Dudas normales' : 'Fair questions'}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Antes de pagar, debes entender esto.' : 'Before you pay, you should know this.'}</h2></div>
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
      </section>

      <section className="bg-[#101A17] text-white">
        <div className="mx-auto grid max-w-[78rem] gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:px-8">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">GHOSTTOWN LAUNCH BLUEPRINT</p><h2 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">{es ? 'De idea a prueba real en 30 días.' : 'From idea to real proof in 30 days.'}</h2><p className="mt-7 max-w-2xl text-xl leading-9 text-white/86">{es ? 'Primero haces la prueba gratis. Si vale la pena seguir, el Blueprint te da el camino.' : 'Take the free test first. If the idea is worth moving forward with, the Blueprint gives you the path.'}</p></div>
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 sm:p-8"><p className="text-base font-bold uppercase tracking-[0.13em] text-white/82">{es ? 'Pago único' : 'One-time price'}</p><div className="mt-2 flex items-end gap-2"><span className="font-score text-6xl font-bold tracking-[-0.08em]">{displayPrice.replace('.00', '')}</span><span className="pb-2 text-base text-white/82">USD</span></div><p className="mt-5 text-base leading-7 text-white/88">{es ? 'No necesitas comprar para obtener tu primer veredicto.' : 'You do not need to buy anything to get your first verdict.'}</p><div className="mt-6 rounded-xl border border-white/20 bg-black/20 p-4 text-base leading-7 text-white/85"><strong className="text-white">{BUSINESS_POLICY.refundPosition}.</strong> {es ? 'Consulta la política para los requisitos.' : 'See the refund policy for the requirements.'}</div><button type="button" onClick={onStart} className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#D96F3D] px-7 py-3 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#E57B48] focus:outline-none focus:ring-4 focus:ring-white/25">{es ? 'Empezar con la prueba gratis' : 'Start With the Free Test'}</button></div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[74rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">FAQ</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Preguntas rápidas.' : 'Quick answers.'}</h2></div>
          <div className="mt-12 divide-y divide-[#D5CEC3] border-y border-[#D5CEC3]">{faq.map(([question, answer]) => <details key={question} className="group py-2"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-xl font-bold"><span>{question}</span><span className="text-2xl font-normal text-[#A94F2A] transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-3xl pb-7 pr-8 text-lg leading-8 text-[#414A45]">{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="bg-[#D96F3D] text-white">
        <div className="mx-auto max-w-[78rem] px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8"><p className="text-base font-bold uppercase tracking-[0.15em] text-white/90">{es ? 'Antes de construir' : 'Before you build'}</p><h2 className="mx-auto mt-4 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl">{es ? 'Descubre si vale la pena.' : 'Find out if it’s worth building.'}</h2><p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-white/95">{es ? 'Una prueba. Un veredicto. Un siguiente paso claro.' : 'One test. One verdict. One clear next step.'}</p><button type="button" onClick={onStart} className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 py-3 text-lg font-bold text-[#17201C] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#FFF9F4] focus:outline-none focus:ring-4 focus:ring-white/35">{es ? 'Probar mi idea gratis' : 'Test My Idea Free'}</button><p className="mt-4 text-base font-semibold text-white/90">{es ? 'Sin tarjeta. El plan de $97 viene después, solo si lo quieres.' : 'No credit card. The $97 plan comes later, only if you want it.'}</p></div>
      </section>

      <div id="ghosttown-commercial-sticky" className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/97 p-3 shadow-[0_-12px_35px_rgba(17,24,39,0.12)] backdrop-blur sm:hidden"><button type="button" onClick={onStart} className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#17201C] px-5 py-3 text-base font-bold text-white">{es ? 'Probar mi idea gratis' : 'Test My Idea Free'}</button></div>
    </div>
  );
}
