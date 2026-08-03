interface Props { locale: 'en' | 'es'; }

export default function ProofStandard({ locale }: Props) {
  const es = locale === 'es';
  const strongSignals = es ? [
    ['01', 'Pago o depósito', 'Una persona entrega dinero para avanzar, no solo para expresar interés.'],
    ['02', 'Piloto acordado', 'Un comprador acepta una oferta con alcance definido y una fecha para probarla.'],
    ['03', 'Cambio de alternativa', 'El comprador cambia de una solución existente porque la nueva opción resuelve mejor el problema.'],
    ['04', 'Acceso o presentación', 'El comprador comparte datos, tiempo, acceso o te conecta con quien decide.']
  ] : [
    ['01', 'Payment or deposit', 'Someone puts money down to move forward, not merely to express interest.'],
    ['02', 'Pilot agreed', 'A buyer accepts a scoped offer with a clear way to test it.'],
    ['03', 'Switching behavior', 'A buyer changes from an existing alternative because the new option solves the problem better.'],
    ['04', 'Access or introduction', 'A buyer shares data, time, access, or connects you to the person who decides.']
  ];

  const weakSignals = es ? [
    'Elogios de amigos o familiares',
    'Me gusta o comentarios sin una acción posterior',
    'Interés vago en una encuesta',
    'Tamaño de mercado sin acceso a compradores'
  ] : [
    'Compliments from friends or family',
    'Likes or comments without a follow-up action',
    'Vague survey interest',
    'Market-size claims without buyer access'
  ];

  return (
    <section id="proof-standard" className="bg-ink text-ink-inverse">
      <div className="mx-auto max-w-workspace px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-reading">
          <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust-soft">{es ? 'Estándar de evidencia' : 'Evidence standard'}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'Comportamiento del comprador. No aplausos.' : 'Buyer behavior. Not applause.'}</h2>
          <p className="mt-5 text-lg leading-8 text-white/75">{es ? 'GhostTown no inventa testimonios ni cuenta los “me gusta” como demanda. Busca compromisos verificables que cuesten dinero, tiempo, acceso o reputación.' : 'GhostTown does not invent testimonials or count likes as demand. It looks for verifiable commitments that cost money, time, access, or reputation.'}</p>
        </div>

        <div className="mt-10 grid min-w-0 overflow-hidden rounded-evidence border border-white/15 bg-white/5 sm:grid-cols-2">
          {strongSignals.map(([number, title, body], index) => (
            <article key={number} className={`min-w-0 p-5 sm:p-7 ${index % 2 === 1 ? 'sm:border-l sm:border-white/15' : ''} ${index > 1 ? 'border-t border-white/15' : index === 1 ? 'border-t border-white/15 sm:border-t-0' : ''}`}>
              <span className="font-score text-sm font-bold text-rust-soft">{number}</span>
              <h3 className="mt-4 break-words text-xl font-bold">{title}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-white/70">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-panel border border-watch/50 bg-watch/10 p-5 sm:p-6">
            <p className="font-score text-xs font-bold uppercase tracking-[0.14em] text-rust-soft">{es ? 'Señales débiles' : 'Weak signals'}</p>
            <ul className="mt-4 grid min-w-0 gap-2 text-sm leading-6 text-white/75 sm:grid-cols-2">
              {weakSignals.map(signal => <li key={signal} className="min-w-0 break-words">· {signal}</li>)}
            </ul>
          </div>
          <div className="min-w-0 rounded-panel border border-white/15 bg-white/5 p-5 sm:p-6">
            <p className="font-score text-xs font-bold uppercase tracking-[0.14em] text-rust-soft">{es ? 'Lo que no afirmamos' : 'What we do not claim'}</p>
            <p className="mt-4 text-sm leading-6 text-white/75">{es ? 'Una señal fuerte no garantiza el mercado. Una señal débil no mata automáticamente la idea. El veredicto muestra la incertidumbre y propone qué probar después.' : 'A strong signal does not guarantee a market. A weak signal does not automatically kill an idea. The verdict shows the uncertainty and proposes what to test next.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
