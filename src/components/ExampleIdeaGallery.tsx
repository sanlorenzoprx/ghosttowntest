import { useState } from 'react';
import { featuredExamples } from '../lib/exampleIdeas';

interface Props {
  onSelect: (slug: string) => void;
}

export default function ExampleIdeaGallery({ onSelect }: Props) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

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

  return (
    <section id="example-gallery" className="bg-[#f5f5f7] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="eyebrow">Try a real starting point</p>
          <h2 className="section-title">See how an idea holds up.</h2>
          <p className="section-copy">Choose a familiar business concept, make it yours, and experience the assessment without staring at an empty form.</p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featuredExamples.map(example => (
            <article key={example.slug} className="group flex min-h-[360px] flex-col rounded-[28px] border border-black/[0.07] bg-white p-7 shadow-[0_16px_50px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#86868b]">{example.category}</span>
                <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-[#6e6e73]">Ready to edit</span>
              </div>
              <h3 className="mt-10 text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#1d1d1f]">{example.idea.ideaName}</h3>
              <p className="mt-4 flex-1 leading-7 text-[#6e6e73]">{example.videoHook}</p>
              <p className="mt-6 border-t border-black/[0.07] pt-5 text-sm text-[#86868b]">For {example.idea.targetUser}</p>

              <div className="mt-7 grid grid-cols-[1fr_auto] gap-2">
                <button type="button" onClick={() => onSelect(example.slug)} className="min-h-12 rounded-full bg-[#1d1d1f] px-5 text-sm font-semibold text-white transition hover:bg-black">
                  Test this idea
                </button>
                <button
                  type="button"
                  onClick={() => void copyDeepLink(example.slug)}
                  aria-label={`Copy direct link to ${example.idea.ideaName}`}
                  className="min-h-12 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                >
                  {copiedSlug === example.slug ? 'Copied' : 'Link'}
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-[#86868b]">Every field remains editable before the assessment begins.</p>
      </div>
    </section>
  );
}
