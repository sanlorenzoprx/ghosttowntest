interface Props {
  locale: 'en' | 'es';
}

export default function ProofStandard({ locale }: Props) {
  const es = locale === 'es';

  const strongSignals = es
    ? [
        ['Paga o deja un depósito', 'Pone dinero para dar el siguiente paso.'],
        ['Acepta una prueba', 'Dice sí a una oferta pequeña y clara.'],
        ['Cambia lo que usa hoy', 'Deja otra solución porque la tuya le sirve mejor.'],
        ['Te da acceso', 'Te da tiempo, datos o te presenta a quien decide.']
      ]
    : [
        ['Pays or leaves a deposit', 'They put money down to take the next step.'],
        ['Agrees to a test', 'They say yes to a small, clear offer.'],
        ['Switches what they use', 'They leave another option because yours works better for them.'],
        ['Gives you access', 'They give you time, data, or an intro to the person who decides.']
      ];

  const weakSignals = es
    ? ['“Me encanta la idea.”', 'Likes sin una acción después', '“Sí, yo lo usaría.”', 'Un mercado grande en una gráfica']
    : ['“I love the idea.”', 'Likes with no next action', '“Yes, I would use that.”', 'A big market on a slide'];

  return (
    <section id="proof-standard" className="bg-[#101A17] text-white">
      <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E7A178]">{es ? 'La prueba que importa' : 'Proof that matters'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? '¿Qué haría un comprador de verdad?' : 'What would a real buyer do?'}</h2>
            <p className="mt-7 text-xl leading-9 text-white/88">{es ? 'Las palabras son fáciles. Las acciones cuestan algo. GhostTown busca acciones.' : 'Words are easy. Actions cost something. GhostTown looks for actions.'}</p>
          </div>

          <div className="divide-y divide-white/20 border-y border-white/20">
            {strongSignals.map(([title, body], index) => (
              <article key={title} className="grid gap-4 py-7 sm:grid-cols-[3rem_12rem_1fr] sm:items-start sm:gap-6">
                <span className="font-score text-base font-bold text-[#F0B28F]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-base leading-7 text-white/85">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-20 grid gap-10 rounded-[2rem] border border-white/12 bg-white/8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#F0B28F]">{es ? 'Señales débiles' : 'Weak signals'}</p>
            <ul className="mt-5 space-y-4 text-lg leading-7 text-white/88">{weakSignals.map(signal => <li key={signal} className="flex gap-3"><span className="text-white/55" aria-hidden="true">×</span><span>{signal}</span></li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#F0B28F]">{es ? 'Lo que esto significa' : 'What this means'}</p>
            <p className="mt-5 text-lg leading-8 text-white/88">{es ? 'Una buena señal no garantiza que el negocio funcionará. Una mala señal tampoco mata la idea. Te dice qué probar después.' : 'A good signal does not promise the business will work. A weak signal does not kill the idea. It tells you what to test next.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
