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
    <section id="example-gallery" className="border-t border-gray-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Trending idea starters</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">Start from the idea that inspired you</h2>
          <p className="mt-4 text-lg text-gray-600">
            Pick a popular concept from a video, edit it to make it yours, and jump straight into the assessment.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredExamples.map(example => (
            <article key={example.slug} className="flex flex-col rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{example.category}</span>
                <span className="text-xs font-semibold text-gray-400">Preloaded</span>
              </div>
              <h3 className="mt-5 text-xl font-bold leading-snug text-gray-950">{example.idea.ideaName}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">{example.videoHook}</p>
              <p className="mt-4 border-l-2 border-orange-300 pl-3 text-xs leading-relaxed text-gray-500">
                For: {example.idea.targetUser}
              </p>

              <div className="mt-6 grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(example.slug)}
                  className="min-h-11 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  Test This Idea
                </button>
                <button
                  type="button"
                  onClick={() => void copyDeepLink(example.slug)}
                  aria-label={`Copy direct link to ${example.idea.ideaName}`}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  {copiedSlug === example.slug ? 'Copied' : 'Link'}
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Every field is editable before the assessment starts.
        </p>
      </div>
    </section>
  );
}
