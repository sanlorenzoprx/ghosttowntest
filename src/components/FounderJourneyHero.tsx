import { useEffect, useMemo, useState } from 'react';

interface Props {
  locale: 'en' | 'es';
}

interface JourneySlide {
  image?: string;
  alt: string;
  eyebrow: string;
  caption: string;
  quote?: string;
  attribution?: string;
  verdict?: boolean;
}

const images = {
  woman: 'https://images.unsplash.com/photo-1758598304540-1ac6fd7d477b?auto=format&fit=crop&w=1600&q=82',
  whiteMan: 'https://images.unsplash.com/photo-1769071167081-0b0ddce3754d?auto=format&fit=crop&w=1600&q=82',
  brownMan: 'https://images.unsplash.com/photo-1758876202983-c36dd5019142?auto=format&fit=crop&w=1600&q=82',
  blackMan: 'https://images.unsplash.com/photo-1758519290830-5462f4924bb5?auto=format&fit=crop&w=1600&q=82',
  asianMan: 'https://images.unsplash.com/photo-1766066014773-0074bf4911de?auto=format&fit=crop&w=1600&q=82',
  olderCouple: 'https://images.unsplash.com/photo-1758691031582-0ce1b43749e7?auto=format&fit=crop&w=1600&q=82'
} as const;

export default function FounderJourneyHero({ locale }: Props) {
  const es = locale === 'es';
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const slides = useMemo<JourneySlide[]>(() => es ? [
    {
      image: images.woman,
      alt: 'Emprendedora joven trabajando con una laptop en una oficina',
      eyebrow: '01 · La idea',
      caption: 'Tienes una idea.'
    },
    {
      image: images.whiteMan,
      alt: 'Emprendedor trabajando en su laptop',
      eyebrow: '02 · Empiezas',
      caption: 'Así que empiezas a construir.'
    },
    {
      image: images.brownMan,
      alt: 'Emprendedor concentrado trabajando en una oficina',
      eyebrow: '03 · Más trabajo',
      caption: 'Sigues añadiendo, arreglando y puliendo.'
    },
    {
      image: images.blackMan,
      alt: 'Empresario trabajando con una laptop en una cafetería',
      eyebrow: '04 · El problema',
      caption: 'La gente puede mirar sin comprar.',
      quote: '“La gente visitó. Algunos probaron. Nadie pagó.”',
      attribution: 'Luc Setzer · publicación pública en Indie Hackers · foto ilustrativa'
    },
    {
      image: images.asianMan,
      alt: 'Profesional asiático con una laptop en una oficina',
      eyebrow: '05 · La realidad',
      caption: 'Buenas respuestas no siempre significan ventas.',
      quote: '“Construí el MVP. Lancé a mi lista. Cero ventas.”',
      attribution: 'Pratham Naik · publicación pública en Indie Hackers · foto ilustrativa'
    },
    {
      image: images.olderCouple,
      alt: 'Pareja mayor usando una laptop juntos',
      eyebrow: '06 · El costo',
      caption: 'Pueden pasar meses antes de saber si la gente realmente lo quiere.'
    },
    {
      alt: 'Ejemplo de un veredicto de GhostTown',
      eyebrow: '07 · La claridad',
      caption: 'GhostTown te ayuda a decidir si vale la pena construirlo.',
      verdict: true
    }
  ] : [
    {
      image: images.woman,
      alt: 'Young woman founder working on a laptop in an office',
      eyebrow: '01 · The idea',
      caption: 'You get an idea.'
    },
    {
      image: images.whiteMan,
      alt: 'Founder working on his laptop',
      eyebrow: '02 · You start',
      caption: 'So you start building.'
    },
    {
      image: images.brownMan,
      alt: 'Founder focused on work in an office',
      eyebrow: '03 · More work',
      caption: 'You keep adding, fixing, and polishing.'
    },
    {
      image: images.blackMan,
      alt: 'Business owner working on a laptop in a cafe',
      eyebrow: '04 · The problem',
      caption: 'People can look without buying.',
      quote: '“People visited. Some tried. Nobody paid.”',
      attribution: 'Luc Setzer · public Indie Hackers post · photo illustrative'
    },
    {
      image: images.asianMan,
      alt: 'Asian professional holding a laptop in an office',
      eyebrow: '05 · The reality',
      caption: 'Good feedback does not always mean sales.',
      quote: '“Built the MVP. Launched to my validation list. Zero sales.”',
      attribution: 'Pratham Naik · public Indie Hackers post · photo illustrative'
    },
    {
      image: images.olderCouple,
      alt: 'Older couple using a laptop together',
      eyebrow: '06 · The cost',
      caption: 'Months can pass before you know if people really want it.'
    },
    {
      alt: 'Illustrative GhostTown verdict',
      eyebrow: '07 · Clarity',
      caption: 'GhostTown helps you decide if it’s worth building.',
      verdict: true
    }
  ], [es]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const delay = active === slides.length - 1 ? 7600 : 4800;
    const timer = window.setTimeout(() => setActive(current => (current + 1) % slides.length), delay);
    return () => window.clearTimeout(timer);
  }, [active, paused, reducedMotion, slides.length]);

  const slide = slides[active];
  const goTo = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.12] bg-[#192521] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
      <div className="relative h-[31rem] sm:h-[37rem]" aria-label={es ? 'Historia visual del recorrido de un fundador' : 'Visual story of the founder journey'}>
        {slide.verdict ? (
          <div className="absolute inset-0 flex items-center bg-[radial-gradient(circle_at_25%_15%,rgba(217,111,61,0.25),transparent_34%),linear-gradient(145deg,#0D1714,#183028)] p-5 sm:p-8">
            <div className="w-full rounded-[1.7rem] border border-white/15 bg-[#F9F7F1] p-5 text-[#17201C] shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-[#DED8CE] pb-5">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#A94F2A]">GHOSTTOWN VERDICT</p>
                  <p className="mt-2 text-xl font-bold sm:text-2xl">{es ? '¿Vale la pena construirlo?' : 'Is it worth building?'}</p>
                </div>
                <span className="rounded-full bg-[#F7EAD2] px-3 py-1.5 text-xs font-bold text-[#8B5B19]">{es ? 'PROBAR PRIMERO' : 'TEST FIRST'}</span>
              </div>
              <div className="grid gap-5 py-6 sm:grid-cols-[0.55fr_1.45fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#747C77]">{es ? 'SEÑAL' : 'SIGNAL'}</p>
                  <p className="mt-2 font-score text-5xl font-bold tracking-[-0.08em]">3.7</p>
                  <p className="mt-1 text-xs text-[#747C77]">/ 5.0</p>
                </div>
                <div>
                  <p className="text-lg font-bold leading-tight sm:text-xl">{es ? 'El problema parece real. Aún falta probar si pagan.' : 'The problem looks real. You still need to prove people will pay.'}</p>
                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#A94F2A]">{es ? 'SIGUIENTE PASO' : 'NEXT STEP'}</p>
                    <p className="mt-2 text-sm leading-6 text-[#59635D]">{es ? 'Ofrece un piloto simple. Sigue solo si compradores reales se comprometen.' : 'Offer a simple pilot. Keep going only if real buyers commit.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <img key={slide.image} src={slide.image} alt={slide.alt} className="absolute inset-0 h-full w-full object-cover" loading={active === 0 ? 'eager' : 'lazy'} decoding="async" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07100D] via-[#07100D]/25 to-transparent" aria-hidden="true" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="max-w-xl rounded-2xl border border-white/15 bg-black/40 p-5 text-white backdrop-blur-md sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E7A178]">{slide.eyebrow}</p>
            <p className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{slide.caption}</p>
            {slide.quote && (
              <div className="mt-4 border-t border-white/15 pt-4">
                <p className="text-base font-semibold leading-6 text-white/90">{slide.quote}</p>
                <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-white/55">{slide.attribution}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 bg-[#0E1815] px-4 py-3 sm:px-5">
        <button type="button" onClick={() => goTo(active - 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-lg text-white transition hover:bg-white/10" aria-label={es ? 'Imagen anterior' : 'Previous image'}>←</button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5" role="tablist" aria-label={es ? 'Historia de fundador' : 'Founder journey'}>
          {slides.map((item, index) => (
            <button key={item.eyebrow} type="button" role="tab" aria-selected={index === active} aria-label={`${index + 1}: ${item.caption}`} onClick={() => goTo(index)} className={`h-2.5 rounded-full transition-all ${index === active ? 'w-8 bg-[#E7A178]' : 'w-2.5 bg-white/30 hover:bg-white/55'}`} />
          ))}
        </div>
        <button type="button" onClick={() => setPaused(value => !value)} className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-white/20 px-3 text-xs font-bold text-white transition hover:bg-white/10" aria-pressed={paused} aria-label={paused ? (es ? 'Reanudar historia' : 'Resume story') : (es ? 'Pausar historia' : 'Pause story')}>{paused ? '▶' : 'Ⅱ'}</button>
        <button type="button" onClick={() => goTo(active + 1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-lg text-white transition hover:bg-white/10" aria-label={es ? 'Siguiente imagen' : 'Next image'}>→</button>
      </div>
    </div>
  );
}
