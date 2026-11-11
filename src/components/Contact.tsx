import type { Locale } from '../lib/locale';

const COPY: Record<Locale, Record<'kicker' | 'heading' | 'intro' | 'supportTitle' | 'supportBody' | 'partnersTitle' | 'partnersBody' | 'fastTitle' | 'fastBody' | 'fastButton' | 'paidTitle' | 'paidBody', string>> = {
  en: {
    kicker: 'Contact Ghost Town Test',
    heading: 'Need help deciding if an idea is worth building?',
    intro: 'Send the short version. We can help with paid plan access, checkout issues, partnership questions, or a bug that blocks your verdict.',
    supportTitle: 'Support',
    supportBody: 'Checkout, account, plan access, or a verdict that did not save.',
    partnersTitle: 'Partnerships',
    partnersBody: 'Startup communities, agencies, creators, and tools that want sharper idea validation.',
    fastTitle: 'Fastest answer',
    fastBody: 'Run one free verdict first. It gives support the exact context if you need help after.',
    fastButton: 'Run Free Verdict',
    paidTitle: 'Paid plan help',
    paidBody: 'If you bought a paid GhostTown plan, include the email used at checkout and the idea name. Do not send API keys, Stripe secrets, passwords, or private customer data.'
  },
  es: {
    kicker: 'Contacta a Ghost Town Test',
    heading: '¿Necesitas ayuda para decidir si vale la pena crear una idea?',
    intro: 'Mándanos la versión corta. Te ayudamos con el acceso a tu plan pagado, problemas al pagar, preguntas de alianzas o un error que no te deja ver tu veredicto.',
    supportTitle: 'Ayuda',
    supportBody: 'Pago, cuenta, acceso al plan o un veredicto que no se guardó.',
    partnersTitle: 'Alianzas',
    partnersBody: 'Comunidades de startups, agencias, creadores y herramientas que quieren validar ideas mejor.',
    fastTitle: 'La respuesta más rápida',
    fastBody: 'Haz primero un veredicto gratis. Así nuestro equipo tiene el contexto exacto si luego necesitas ayuda.',
    fastButton: 'Hacer un veredicto gratis',
    paidTitle: 'Ayuda con un plan pagado',
    paidBody: 'Si compraste un plan pagado de GhostTown, incluye el correo que usaste al pagar y el nombre de la idea. No envíes claves de API, secretos de Stripe, contraseñas ni datos privados de clientes.'
  }
};

interface Props {
  onStart: () => void;
  locale?: Locale;
}

export default function Contact({ onStart, locale = 'en' }: Props) {
  const t = COPY[locale];
  return (
    <section className="bg-ghost-paper px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-ghost-rust">{t.kicker}</p>
        <h1 className="mt-4 max-w-3xl font-slab text-4xl font-bold leading-[1.08] tracking-tight text-ghost-ink sm:text-5xl lg:text-6xl">
          {t.heading}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">
          {t.intro}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-950">{t.supportTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {t.supportBody}
            </p>
            <a className="mt-4 inline-block font-bold text-blue-700 hover:text-blue-900" href="mailto:support@ghosttownverdict.app">
              support@ghosttownverdict.app
            </a>
          </article>

          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-950">{t.partnersTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {t.partnersBody}
            </p>
            <a className="mt-4 inline-block font-bold text-blue-700 hover:text-blue-900" href="mailto:hello@ghosttownverdict.app">
              hello@ghosttownverdict.app
            </a>
          </article>

          <article className="rounded-lg border border-ghost-rust/30 bg-ghost-rust p-6 text-white shadow-lantern">
            <h2 className="font-bold">{t.fastTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              {t.fastBody}
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded bg-white px-4 py-3 font-bold text-ghost-rust transition hover:bg-ghost-paper"
            >
              {t.fastButton}
            </button>
          </article>
        </div>

        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-bold text-blue-950">{t.paidTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-900">
            {t.paidBody}
          </p>
        </div>
      </div>
    </section>
  );
}
