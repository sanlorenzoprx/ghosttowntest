import { LEGAL_POLICY } from '../lib/businessPolicy';
import { GHOSTTOWN_FIRST_30_V1, GHOSTTOWN_YEAR_SQUARED_V1 } from '../lib/ghosttownOffer';

interface Props {
  locale?: 'en' | 'es';
}

export default function AboutPage({ locale = 'en' }: Props) {
  const first30 = GHOSTTOWN_FIRST_30_V1;
  const year = GHOSTTOWN_YEAR_SQUARED_V1;
  const es = locale === 'es';
  const copy = es ? {
    eyebrow: 'Sobre nosotros',
    title: 'Sobre GhostTown',
    intro: 'GhostTown te ayuda a saber si vale la pena construir una idea de negocio antes de pasar meses en ella, y luego te ayuda a probarla con clientes reales.',
    offerTitle: 'Lo que ofrecemos',
    verdict: ['Veredicto gratis.', 'Contesta unas preguntas sobre tu idea y recibe un veredicto claro y la prueba más rápida para hacer después.'],
    first30: [`${first30.name}: ${first30.displayPrice}, abre pronto.`, `${first30.durationDays} días de ayuda guiada, un sitio web para conseguir clientes para tu negocio y los materiales para llegar a tus primeros clientes.`],
    year: [`${year.name}.`, `Se ofrece durante ${first30.name}: un año con el socio operativo de IA de GhostTown, con tu pago de ${first30.name} acreditado.`],
    whoTitle: 'Quién opera GhostTown',
    labels: { company: 'Compañía', based: 'Ubicada en', website: 'Sitio web', email: 'Email' },
    jurisdiction: LEGAL_POLICY.jurisdictionEs,
    pages: ['Términos de servicio', 'Política de privacidad', 'Reembolsos y cancelación', 'Aviso legal'],
    nav: 'Políticas'
  } : {
    eyebrow: 'About',
    title: 'About GhostTown',
    intro: 'GhostTown helps you find out whether a business idea is worth building before you spend months on it, and then helps you test it with real customers.',
    offerTitle: 'What we offer',
    verdict: ['Free verdict.', 'Answer a few questions about your idea and get a clear verdict and the fastest test to run next.'],
    first30: [`${first30.name} — ${first30.displayPrice}, opens soon.`, `${first30.durationDays} days of guided help, a customer-acquisition website for your business, and the materials to reach your first customers.`],
    year: [`${year.name}.`, `Offered during ${first30.name}: a year with GhostTown's AI operating partner, with your ${first30.name} payment credited toward it.`],
    whoTitle: 'Who runs GhostTown',
    labels: { company: 'Company', based: 'Based in', website: 'Website', email: 'Email' },
    jurisdiction: LEGAL_POLICY.jurisdiction,
    pages: ['Terms of service', 'Privacy policy', 'Refunds and cancellation', 'Disclaimer'],
    nav: 'Policies'
  };
  const hrefs = ['/terms', '/privacy', '/refunds', '/disclaimer'];
  return (
    <section className="bg-ghost-paper px-4 py-12 sm:py-16">
      <article lang={locale} className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-ghost-rust">{copy.eyebrow}</p>
        <h1 className="mt-3 font-slab text-4xl font-bold leading-tight tracking-tight text-ghost-ink sm:text-5xl">{copy.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-gray-700">{copy.intro}</p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-950">{copy.offerTitle}</h2>
          <ul className="mt-3 space-y-3 text-[15px] leading-7 text-gray-700">
            {[copy.verdict, copy.first30, copy.year].map(([lead, body]) => (
              <li key={lead}><strong className="text-gray-950">{lead}</strong> {body}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-950">{copy.whoTitle}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] text-gray-700 sm:grid-cols-[10rem_1fr]">
            <dt className="font-bold text-gray-900">{copy.labels.company}</dt><dd>{LEGAL_POLICY.operator}</dd>
            <dt className="font-bold text-gray-900">{copy.labels.based}</dt><dd>{copy.jurisdiction}</dd>
            <dt className="font-bold text-gray-900">{copy.labels.website}</dt><dd>{LEGAL_POLICY.website}</dd>
            <dt className="font-bold text-gray-900">{copy.labels.email}</dt><dd><a className="font-bold text-blue-700 underline" href={`mailto:${LEGAL_POLICY.supportEmail}`}>{LEGAL_POLICY.supportEmail}</a></dd>
          </dl>
        </section>

        <nav aria-label={copy.nav} className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-200 pt-6 text-sm">
          {copy.pages.map((label, index) => <a key={label} className="font-bold text-blue-700 hover:underline" href={hrefs[index]}>{label}</a>)}
        </nav>
      </article>
    </section>
  );
}
