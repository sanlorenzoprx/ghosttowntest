interface Props {
  onStart: () => void;
}

type Locale = 'en' | 'es';

const supportEmail = 'support@ghosttowntest.com';
const partnershipsEmail = 'hello@ghosttowntest.com';

const copy = {
  en: {
    eyebrow: 'Contact GhostTown Test',
    title: 'Support for checkout, access, and saved verdicts',
    intro: 'Send the short version of what happened. GhostTown support can help with paid plan access, checkout issues, account questions, partnership inquiries, or a bug that blocks your verdict.',
    supportTitle: 'Product support',
    supportBody: 'Use this for checkout, account, plan access, delivery, refunds, privacy requests, or a verdict that did not save.',
    partnerTitle: 'Partnerships',
    partnerBody: 'Use this for startup communities, agencies, creators, or tools that want sharper idea validation.',
    contextTitle: 'Helpful details to include',
    contextItems: [
      'The email address used for checkout or login.',
      'The idea name, order reference, or verdict context when relevant.',
      'What you expected, what happened, and any visible error message.'
    ],
    privacyTitle: 'Please do not send secrets',
    privacyBody: 'Do not send passwords, API keys, Stripe secrets, full payment details, private customer data, or information GhostTown does not need to resolve the request.',
    fastestTitle: 'Before you write support',
    fastestBody: 'A free verdict often gives the exact context support needs if you run into a product issue afterward.',
    start: 'Run Free Verdict',
    returnHome: 'Return to product',
    responseTitle: 'Response expectations',
    responseBody: 'Support is handled by email. GhostTown does not currently advertise live chat, phone support, or guaranteed response times.',
    emailAction: 'Email product support',
    partnerAction: 'Email partnerships'
  },
  es: {
    eyebrow: 'Contacto GhostTown Test',
    title: 'Soporte para checkout, acceso y verdictos guardados',
    intro: 'Envia la version corta de lo que paso. El soporte de GhostTown puede ayudar con acceso al plan pagado, problemas de checkout, preguntas de cuenta, alianzas o un bug que bloquee tu veredicto.',
    supportTitle: 'Soporte de producto',
    supportBody: 'Usa este correo para checkout, cuenta, acceso al plan, entrega, reembolsos, solicitudes de privacidad o un veredicto que no se guardo.',
    partnerTitle: 'Alianzas',
    partnerBody: 'Usa este correo para comunidades de startups, agencias, creadores o herramientas que quieren validacion de ideas mas clara.',
    contextTitle: 'Detalles utiles para incluir',
    contextItems: [
      'El email usado para checkout o login.',
      'El nombre de la idea, referencia de orden o contexto del veredicto cuando aplique.',
      'Que esperabas, que ocurrio y cualquier mensaje de error visible.'
    ],
    privacyTitle: 'No envies secretos',
    privacyBody: 'No envies passwords, API keys, secretos de Stripe, detalles completos de pago, datos privados de clientes ni informacion que GhostTown no necesite para resolver la solicitud.',
    fastestTitle: 'Antes de escribir a soporte',
    fastestBody: 'Un veredicto gratis suele dar el contexto exacto que soporte necesita si luego aparece un problema de producto.',
    start: 'Ejecutar veredicto gratis',
    returnHome: 'Volver al producto',
    responseTitle: 'Expectativas de respuesta',
    responseBody: 'El soporte se maneja por email. GhostTown no anuncia actualmente chat en vivo, soporte telefonico ni tiempos de respuesta garantizados.',
    emailAction: 'Enviar email a soporte',
    partnerAction: 'Enviar email a alianzas'
  }
} as const;

function currentLocale(): Locale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

export default function Contact({ onStart }: Props) {
  const text = copy[currentLocale()];

  return (
    <section className="bg-ghost-paper px-4 py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-ghost-rust">{text.eyebrow}</p>
          <h1 className="mt-4 max-w-[12ch] break-words font-slab text-4xl font-bold leading-[1.08] tracking-tight text-ghost-ink sm:max-w-3xl sm:text-5xl">
            {text.title}
          </h1>
          <p className="mt-5 max-w-[20rem] break-words text-lg leading-relaxed text-gray-700 sm:max-w-3xl">{text.intro}</p>

          <div className="mt-10 grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2">
            <article className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-800">Support</p>
              <h2 className="mt-2 text-xl font-black text-gray-950">{text.supportTitle}</h2>
              <p className="mt-3 break-words text-sm leading-6 text-gray-700 [overflow-wrap:anywhere]">{text.supportBody}</p>
              <a
                className="mt-5 inline-flex min-h-11 max-w-full items-center rounded-lg border border-ghost-rust px-4 py-2 font-black text-ghost-rust underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
                href={`mailto:${supportEmail}`}
              >
                <span className="break-all">{supportEmail}</span>
              </a>
              <p className="mt-2 text-xs font-bold text-gray-500">{text.emailAction}</p>
            </article>

            <article className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Business</p>
              <h2 className="mt-2 text-xl font-black text-gray-950">{text.partnerTitle}</h2>
              <p className="mt-3 break-words text-sm leading-6 text-gray-700 [overflow-wrap:anywhere]">{text.partnerBody}</p>
              <a
                className="mt-5 inline-flex min-h-11 max-w-full items-center rounded-lg border border-gray-300 px-4 py-2 font-black text-gray-800 underline-offset-4 hover:border-ghost-rust hover:text-ghost-rust hover:underline focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
                href={`mailto:${partnershipsEmail}`}
              >
                <span className="break-all">{partnershipsEmail}</span>
              </a>
              <p className="mt-2 text-xs font-bold text-gray-500">{text.partnerAction}</p>
            </article>
          </div>

          <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="support-guidance">
            <h2 id="support-guidance" className="text-xl font-black text-gray-950">{text.contextTitle}</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-700">
              {text.contextItems.map(item => (
                <li key={item} className="flex min-w-0 gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ghost-rust" aria-hidden="true" />
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6" aria-labelledby="support-privacy">
            <h2 id="support-privacy" className="text-xl font-black text-red-950">{text.privacyTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-red-900">{text.privacyBody}</p>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-ghost-rust/30 bg-ghost-rust p-6 text-white shadow-lantern" aria-labelledby="support-next-step">
          <h2 id="support-next-step" className="text-xl font-black">{text.fastestTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-white/85">{text.fastestBody}</p>
          <button
            type="button"
            onClick={onStart}
            className="mt-5 min-h-11 w-full rounded bg-white px-4 py-3 font-black text-ghost-rust transition hover:bg-ghost-paper focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            {text.start}
          </button>
          <div className="mt-6 border-t border-white/20 pt-5">
            <h2 className="text-base font-black">{text.responseTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-white/85">{text.responseBody}</p>
          </div>
          <a
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded border border-white/30 px-4 py-3 text-sm font-black text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
            href="/"
          >
            {text.returnHome}
          </a>
        </aside>
      </div>
    </section>
  );
}
