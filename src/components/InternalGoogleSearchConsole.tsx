import { FormEvent, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';

interface Props {
  onBack: () => void;
}

interface SearchSource {
  index: number;
  title: string;
  uri: string;
}

interface SearchResponse {
  error?: string;
  model?: string;
  answer?: string;
  webSearchQueries?: string[];
  searchSuggestionHtml?: string;
  sources?: SearchSource[];
  notice?: string;
}

export default function InternalGoogleSearchConsole({ onBack }: Props) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim().length < 3 || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(apiUrl('/api/internal/google-search'), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const body = await response.json<SearchResponse>();
      if (!response.ok || !body.answer) throw new Error(body.error || 'Google grounded search failed');
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google grounded search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">Owner-only internal tool</p>
          <h1 className="mt-1 text-3xl font-black text-ghost-ink">Live Google Research Console</h1>
        </div>
        <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-4 py-2 font-bold text-gray-700">Return to Dashboard</button>
      </div>

      <section className="rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-6 shadow-sm">
        <p className="text-sm leading-6 text-gray-700">This console is intentionally separate from paid Blueprint fulfillment. Results stay in this browser session, are not written to KV, D1, R2, PDFs, or customer accounts, and are not used to crawl returned links.</p>
        <p className="mt-2 text-xs font-bold text-amber-800">Do not enter customer secrets or sensitive personal data. Google retains grounding prompts and generated output for its stated service period.</p>
        <form onSubmit={event => void search(event)} className="mt-5">
          <label htmlFor="internal-google-prompt" className="text-sm font-black text-ghost-ink">Research question</label>
          <textarea
            id="internal-google-prompt"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            rows={6}
            placeholder="Example: What podcasts, YouTube creators, newsletters, and events currently cover family board games and subscription boxes?"
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-4 text-sm leading-6 outline-none focus:border-ghost-rust focus:ring-2 focus:ring-ghost-rust/20"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600">The answer and Google Search Suggestions are shown together exactly for your submitted prompt.</p>
            <button type="submit" disabled={loading || prompt.trim().length < 3} className="rounded-lg bg-ghost-rust px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-45">{loading ? 'Searching Google...' : 'Run live research'}</button>
          </div>
        </form>
      </section>

      {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}

      {result?.answer && <section className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 bg-ghost-ink px-6 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">Google-grounded result</h2>
            <span className="text-xs font-bold uppercase text-ghost-gold">{result.model}</span>
          </div>
        </div>
        <div className="p-6">
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-900">{result.answer}</div>

          {Boolean(result.sources?.length) && <div className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">Grounding sources</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{result.sources?.map(source => <a key={`${source.index}:${source.uri}`} href={source.uri} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 p-3 text-sm font-bold text-blue-700 hover:border-blue-300 hover:bg-blue-50">[{source.index}] {source.title}</a>)}</div>
          </div>}

          {result.searchSuggestionHtml && <div className="mt-6 border-t border-gray-200 pt-5">
            <iframe
              title="Google Search Suggestions"
              srcDoc={result.searchSuggestionHtml}
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              className="min-h-24 w-full border-0"
            />
          </div>}
        </div>
      </section>}
    </main>
  );
}
