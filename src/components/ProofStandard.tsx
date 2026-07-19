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
    <section className="bg-black py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-[#2997ff]">{es ? 'La evidencia que importa' : 'The evidence that matters'}</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
            {es ? 'Comportamiento del comprador. No aplausos.' : 'Buyer behavior. Not applause.'}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55 sm:text-xl">
            {es ? 'No contamos “me gusta” como demanda ni inventamos testimonios. GhostTown busca compromisos verificables que cuesten dinero, tiempo, acceso o reputación.' : 'Likes are not demand, and invented testimonials are not proof. GhostTown looks for verifiable commitments that cost money, time, access, or reputation.'}
          </p>
        </div>
        <div className="mt-16 grid overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] sm:grid-cols-2">
          {signals.map(([title, body], index) => (
            <article key={title} className={`p-8 sm:p-10 ${index % 2 === 1 ? 'sm:border-l sm:border-white/10' : ''} ${index > 1 ? 'border-t border-white/10' : index === 1 ? 'border-t border-white/10 sm:border-t-0' : ''}`}>
              <span className="text-sm font-semibold text-[#2997ff]">0{index + 1}</span>
              <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
              <p className="mt-3 leading-7 text-white/52">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
