import { useState } from 'react';
import { featuredExamples } from '../lib/exampleIdeas';

interface Props {
  onSelect: (slug: string) => void;
  locale?: 'en' | 'es';
}

const CATEGORY_TONES = ['bg-[#FFE9DC] text-[#8F3A17]', 'bg-[#FFF1C2] text-[#7A5000]', 'bg-[#DDF2E7] text-[#0B6B50]', 'bg-[#E3EEF9] text-[#24507A]'] as const;

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
    <section id="example-gallery" className="bg-day-canvas">
      <div className="mx-auto max-w-[78rem] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="day-reveal grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2A]">{es ? '¿No sabes cómo empezar?' : 'Not sure how to start?'}</p><h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-6xl">{es ? 'Prueba una idea de ejemplo.' : 'Try an example idea.'}</h2></div>
          <p className="max-w-2xl text-xl leading-9 text-[#3F4944]">{es ? 'Elige una. Cámbiala para que se parezca a tu idea. Luego empieza la prueba.' : 'Pick one. Change it to match your idea. Then start the test.'}</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {featuredExamples.map((example, index) => (
            <article key={example.slug} className="day-card day-reveal flex min-w-0 flex-col gap-6 rounded-3xl border border-[#EFE6D8] bg-white p-6 shadow-soft sm:p-8">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-[0.08em] ${CATEGORY_TONES[index % CATEGORY_TONES.length]}`}>{example.category}</span><span className="text-base font-bold text-[#4B544F]">{verdictLabel(example.idea.expectedVerdict)}</span></div><h3 className="mt-4 break-words text-2xl font-bold leading-tight sm:text-3xl">{example.idea.ideaName}</h3><p className="mt-3 max-w-2xl text-lg leading-8 text-[#3F4944]">{example.videoHook}</p></div>
              <div className="mt-auto min-w-0 border-t border-[#EFE6D8] pt-5"><p className="text-sm font-bold uppercase tracking-[0.11em] text-[#4B544F]">{es ? 'Para quién' : 'Who it is for'}</p><p className="mt-2 text-lg font-semibold leading-7 text-[#202825]">{example.idea.targetUser}</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onSelect(example.slug)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-day-leaf px-5 py-3 text-base font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#0B6B50] focus:outline-none focus:ring-4 focus:ring-[#0F7A5C]/25">{es ? 'Usar esta idea' : 'Use this idea'}</button><button type="button" onClick={() => void copyDeepLink(example.slug)} aria-label={`${es ? 'Copiar enlace directo a' : 'Copy direct link to'} ${example.idea.ideaName}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#BEB4A6] bg-white px-5 py-3 text-base font-bold text-[#2F3833] transition hover:border-[#A94F2A] hover:text-[#A94F2A] focus:outline-none focus:ring-4 focus:ring-[#D96F3D]/20">{copiedSlug === example.slug ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar enlace' : 'Copy link')}</button></div></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
