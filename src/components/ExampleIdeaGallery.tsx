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
      window.setTimeout(() => setCopiedSlug(current => current === slug ? null : current), 1800);
    } catch {
      setCopiedSlug(null);
    }
  };

  const verdictLabel = (expectedVerdict: string) => {
    if (expectedVerdict === 'niche_down') return es ? 'Reducir el nicho' : 'Narrow the niche';
    if (expectedVerdict === 'kill_it_before_it_kills_years') return es ? 'Detenerse y replantear' : 'Stop and rethink';
    return es ? 'Probar primero' : 'Test first';
  };

  return (
    <section id="example-gallery" className="border-y border-border bg-surface-raised">
      <div className="mx-auto max-w-workspace px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-reading">
          <p className="font-score text-xs font-bold uppercase tracking-[0.18em] text-rust">{es ? 'Puntos de partida reales' : 'Real starting points'}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">{es ? 'Mira cómo resiste una idea.' : 'See how an idea holds up.'}</h2>
          <p className="mt-5 text-lg leading-8 text-ink-soft">{es ? 'Elige un concepto familiar, hazlo tuyo y entra a la evaluación sin empezar desde una pantalla vacía.' : 'Choose a familiar concept, make it yours, and enter the assessment without staring at an empty form.'}</p>
        </div>

        <div className="mt-10 grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredExamples.map(example => (
            <article key={example.slug} className="group flex min-w-0 flex-col rounded-card border border-border bg-surface p-5 shadow-quiet transition hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <span className="max-w-full rounded-full bg-rust-soft px-2.5 py-1 font-score text-xs font-bold text-rust">{example.category}</span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-ink-muted">{es ? 'Editable' : 'Ready to edit'}</span>
              </div>

              <h3 className="mt-6 min-w-0 break-words text-xl font-bold leading-tight text-ink">{example.idea.ideaName}</h3>
              <p className="mt-3 min-w-0 break-words text-sm leading-6 text-ink-soft">{example.videoHook}</p>

              <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
                <div className="min-w-0">
                  <dt className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{es ? 'Comprador' : 'Buyer'}</dt>
                  <dd className="mt-1 break-words font-semibold text-ink">{example.idea.targetUser}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-score text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">{es ? 'Por qué probarlo' : 'Why test it'}</dt>
                  <dd className="mt-1 break-words leading-6 text-ink-soft">{example.idea.painfulProblem}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="status-badge status-badge--watch max-w-full">{verdictLabel(example.idea.expectedVerdict)}</span>
                <span className="shrink-0 font-score text-xs text-ink-muted">{example.slug}</span>
              </div>

              <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                <button type="button" onClick={() => onSelect(example.slug)} className="btn-primary min-w-0 w-full text-sm">
                  {es ? 'Probar esta idea' : 'Test this idea'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyDeepLink(example.slug)}
                  aria-label={`${es ? 'Copiar enlace directo a' : 'Copy direct link to'} ${example.idea.ideaName}`}
                  className="btn-secondary min-w-0 px-3 text-sm"
                >
                  {copiedSlug === example.slug ? (es ? 'Copiado' : 'Copied') : (es ? 'Enlace' : 'Link')}
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-ink-muted">{es ? 'Todos los campos siguen siendo editables antes de comenzar la evaluación.' : 'Every field remains editable before the assessment begins.'}</p>
      </div>
    </section>
  );
}
