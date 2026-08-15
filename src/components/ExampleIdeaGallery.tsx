import { useState } from 'react';
import { featuredExamples } from '../lib/exampleIdeas';

interface Props {
  onSelect: (slug: string) => void;
  locale?: 'en' | 'es';
}

export default function ExampleIdeaGallery({ onSelect, locale = 'en' }: Props) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const es = locale === 'es';

  const copyDeepLink = async (slug: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('example', slug);
      url.hash = '';
      await navigator.clipboard.writeText(url.toString());
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug(current => (current === slug ? null : current)), 1800);
    } catch {
      setCopiedSlug(null);
    }
  };

  const verdictLabel = (expectedVerdict: string) => {
    if (expectedVerdict === 'niche_down') return es ? 'Reducir el nicho' : 'Narrow it';
    if (expectedVerdict === 'kill_it_before_it_kills_years') return es ? 'Parar y cambiar' : 'Stop and rethink';
    return es ? 'Probar primero' : 'Test first';
  };

  return (
    <section id="example-gallery" className="bg-[#F6F3ED]">
      <div className="mx-auto max-w-[78rem] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? '¿No sabes cómo empezar?' : 'Not sure how to start?'}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{es ? 'Prueba una idea de ejemplo.' : 'Try an example idea.'}</h2>
          </div>
          <p className="max-w-2xl text-xl leading-9 text-[#4C5550]">{es ? 'Elige una. Cámbiala para que se parezca a tu idea. Luego empieza la prueba.' : 'Pick one. Change it to match your idea. Then start the test.'}</p>
        </div>

        <div className="mt-14 divide-y divide-[#D8D0C4] border-y border-[#D8D0C4]">
          {featuredExamples.map((example, index) => (
            <article key={example.slug} className="grid min-w-0 gap-7 py-9 md:grid-cols-[4rem_minmax(0,1fr)_minmax(15rem,0.6fr)] md:items-center md:gap-8">
              <span className="font-score text-sm font-bold text-[#A94F2A]">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#EADFD2] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#77452D]">{example.category}</span><span className="text-sm font-bold text-[#7A817D]">{verdictLabel(example.idea.expectedVerdict)}</span></div>
                <h3 className="mt-4 break-words text-2xl font-bold leading-tight sm:text-3xl">{example.idea.ideaName}</h3>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-[#5A645E]">{example.videoHook}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#7A817D]">{es ? 'Para quién' : 'Who it is for'}</p>
                <p className="mt-2 text-base font-semibold leading-7">{example.idea.targetUser}</p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                  <button type="button" onClick={() => onSelect(example.slug)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#17201C] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#29342F] focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/25">{es ? 'Usar esta idea' : 'Use this idea'}</button>
                  <button type="button" onClick={() => void copyDeepLink(example.slug)} aria-label={`${es ? 'Copiar enlace directo a' : 'Copy direct link to'} ${example.idea.ideaName}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#CFC7BB] bg-white px-5 py-3 text-sm font-bold text-[#38413D] transition hover:border-[#A94F2A] hover:text-[#A94F2A] focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/20">{copiedSlug === example.slug ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar enlace' : 'Copy link')}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
