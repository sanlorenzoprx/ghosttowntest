interface Props {
  locale: 'en' | 'es';
}

export default function ProofStandard({ locale }: Props) {
  const es = locale === 'es';

  const strongSignals = es
    ? [
        ['Pago o depósito', 'Alguien entrega dinero para avanzar, no solo para expresar interés.'],
        ['Piloto acordado', 'Un comprador acepta una oferta con alcance y una forma clara de probarla.'],
        ['Cambio de alternativa', 'El comprador cambia de una solución existente porque la nueva opción resuelve mejor el problema.'],
        ['Acceso o presentación', 'El comprador comparte tiempo, datos, acceso o te conecta con quien decide.']
      ]
    : [
        ['Payment or deposit', 'Someone puts money down to move forward, not merely to express interest.'],
        ['Pilot agreed', 'A buyer accepts a scoped offer with a clear way to test it.'],
        ['Switching behavior', 'A buyer changes from an existing alternative because the new option solves the problem better.'],
        ['Access or introduction', 'A buyer shares time, data, access, or connects you to the person who decides.']
      ];

  const weakSignals = es
    ? [
        '“Me encanta la idea.”',
        'Likes o comentarios sin acción posterior',
        'Interés vago en una encuesta',
        'Tamaño de mercado sin acceso real al comprador'
      ]
    : [
        '“I love the idea.”',
        'Likes or comments without follow-through',
        'Vague survey interest',
        'Market size without real buyer access'
      ];

  return (
    <section id="proof-standard" className="bg-[#101A17] text-white">
      <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">
              {es ? 'El estándar' : 'The standard'}
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              {es ? '¿Qué haría un comprador de verdad?' : 'What would a real buyer actually do?'}
            </h2>
            <p className="mt-7 text-xl leading-9 text-white/[0.72]">
              {es
                ? 'GhostTown separa señales que reducen incertidumbre de señales que solo producen una sensación de progreso. Una señal fuerte cuesta algo.'
                : 'GhostTown separates signals that reduce uncertainty from signals that merely feel like progress. A strong signal costs something.'}
            </p>
          </div>

          <div className="divide-y divide-white/15 border-y border-white/15">
            {strongSignals.map(([title, body], index) => (
              <article key={title} className="grid gap-4 py-7 sm:grid-cols-[3rem_12rem_1fr] sm:items-start sm:gap-6">
                <span className="font-score text-sm font-bold text-[#E7A178]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-base leading-7 text-white/[0.68]">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-20 grid gap-10 rounded-[2rem] bg-white/[0.06] p-6 sm:p-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7A178]">
              {es ? 'Señales débiles' : 'Weak signals'}
            </p>
            <ul className="mt-5 space-y-4 text-lg leading-7 text-white/[0.72]">
              {weakSignals.map(signal => (
                <li key={signal} className="flex gap-3">
                  <span className="text-white/40" aria-hidden="true">×</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7A178]">
              {es ? 'Lo que GhostTown no afirma' : 'What GhostTown does not claim'}
            </p>
            <p className="mt-5 text-lg leading-8 text-white/[0.72]">
              {es
                ? 'Una señal fuerte no garantiza un mercado. Una señal débil tampoco mata automáticamente una idea. El trabajo es reducir incertidumbre suficiente para decidir qué probar, cambiar o detener.'
                : 'A strong signal does not guarantee a market. A weak signal does not automatically kill an idea either. The job is to reduce enough uncertainty to decide what to test, change, or stop.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
