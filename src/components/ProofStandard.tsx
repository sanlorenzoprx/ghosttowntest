interface Props { locale: 'en' | 'es'; }

export default function ProofStandard({ locale }: Props) {
  const es = locale === 'es';
  const signals = es ? [
    ['Depósito pagado', 'Una persona entrega dinero para avanzar.'],
    ['Piloto acordado', 'Un comprador acepta probar una oferta con alcance definido.'],
    ['Acceso o tiempo', 'El comprador comparte datos, acceso o tiempo de su equipo.'],
    ['Presentación', 'Te conecta con quien toma la decisión.']
  ] : [
    ['Paid deposit', 'A person puts money down to move forward.'],
    ['Pilot agreed', 'A buyer accepts a scoped offer to test.'],
    ['Access or time', 'A buyer shares data, access, or their team’s time.'],
    ['Decision-maker intro', 'They connect you to the person who can approve it.']
  ];

  return (
    <section className="border-y border-ghost-ink bg-ghost-ink py-16 text-white sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ghost-gold">{es ? 'La prueba social que importa' : 'The social proof that matters'}</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{es ? 'Comportamiento del comprador, no aplausos.' : 'Buyer behavior, not applause.'}</h2>
          <p className="mt-4 text-white/75">{es ? 'GhostTown Test no inventa testimonios ni cuenta “me gusta” como demanda. Puedes traer evidencia de tu CRM, checkout, calendario, notas de entrevista u otro sistema; lo que importa es el comportamiento verificable.' : 'GhostTown Test does not invent testimonials or count likes as demand. Bring evidence from your CRM, checkout, calendar, interview notes, or another system; what matters is verifiable buyer behavior.'}</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {signals.map(([title, body], index) => (
            <article key={title} className="border border-white/15 bg-white/5 p-5">
              <span className="font-score text-ghost-gold">0{index + 1}</span>
              <h3 className="mt-2 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-white/65">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
