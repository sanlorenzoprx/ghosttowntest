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

type Locale = 'en' | 'es';

const copy = {
  en: {
    eyebrow: 'Owner-only internal tool',
    title: 'Live Google Research Console',
    purpose: 'Use this internal workspace for one-off Google-grounded research questions. It is intentionally separate from paid Blueprint fulfillment.',
    boundary: 'Results stay in this browser session, are not written to KV, D1, R2, PDFs, or customer accounts, and are not used to crawl returned links.',
    sensitive: 'Do not enter customer secrets or sensitive personal data. Google retains grounding prompts and generated output for its stated service period.',
    back: 'Return to Dashboard',
    question: 'Research question',
    placeholder: 'Example: What podcasts, YouTube creators, newsletters, and events currently cover family board games and subscription boxes?',
    helper: 'Enter at least 3 characters. The exact prompt is sent to the existing internal Google-grounded search endpoint.',
    filters: 'Filters',
    noFilters: 'No filters are configured for this console. The current request uses only the submitted prompt.',
    idleTitle: 'No research request has run yet',
    idleBody: 'Submit a question to see the grounded answer, search queries, source links, and Google Search Suggestions returned by the provider.',
    loading: 'Searching Google...',
    submit: 'Run live research',
    failed: 'Google grounded search failed',
    result: 'Google-grounded result',
    model: 'Model',
    answer: 'Answer',
    queries: 'Search queries',
    sources: 'Grounding sources',
    noSources: 'No grounding source links were returned with this answer.',
    suggestions: 'Google Search Suggestions',
    notice: 'Provider notice',
    retry: 'Edit the question and run research again.',
    access: 'Access boundary'
  },
  es: {
    eyebrow: 'Herramienta interna solo para owner',
    title: 'Consola de investigacion Google en vivo',
    purpose: 'Usa este espacio interno para preguntas puntuales de investigacion con grounding de Google. Esta separado intencionalmente del fulfillment pagado de Blueprint.',
    boundary: 'Los resultados permanecen en esta sesion del navegador, no se escriben en KV, D1, R2, PDFs ni cuentas de clientes, y no se usan para rastrear los enlaces devueltos.',
    sensitive: 'No ingreses secretos de clientes ni datos personales sensibles. Google conserva prompts de grounding y output generado durante su periodo de servicio indicado.',
    back: 'Volver al Dashboard',
    question: 'Pregunta de investigacion',
    placeholder: 'Ejemplo: Que podcasts, creadores de YouTube, newsletters y eventos cubren actualmente juegos de mesa familiares y cajas de suscripcion?',
    helper: 'Ingresa al menos 3 caracteres. El prompt exacto se envia al endpoint interno existente de busqueda Google-grounded.',
    filters: 'Filtros',
    noFilters: 'No hay filtros configurados para esta consola. La solicitud actual usa solo el prompt enviado.',
    idleTitle: 'Aun no se ha ejecutado una investigacion',
    idleBody: 'Envia una pregunta para ver la respuesta grounded, consultas de busqueda, enlaces fuente y Google Search Suggestions devueltos por el proveedor.',
    loading: 'Buscando en Google...',
    submit: 'Ejecutar investigacion en vivo',
    failed: 'La busqueda Google grounded fallo',
    result: 'Resultado Google-grounded',
    model: 'Modelo',
    answer: 'Respuesta',
    queries: 'Consultas de busqueda',
    sources: 'Fuentes de grounding',
    noSources: 'No se devolvieron enlaces de fuentes de grounding con esta respuesta.',
    suggestions: 'Google Search Suggestions',
    notice: 'Aviso del proveedor',
    retry: 'Edita la pregunta y ejecuta la investigacion otra vez.',
    access: 'Limite de acceso'
  }
} as const;

function currentLocale(): Locale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

export default function InternalGoogleSearchConsole({ onBack }: Props) {
  const text = copy[currentLocale()];
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
      if (!response.ok || !body.answer) throw new Error(body.error || text.failed);
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.failed);
    } finally {
      setLoading(false);
    }
  };

  const trimmedPrompt = prompt.trim();
  const canSubmit = trimmedPrompt.length >= 3 && !loading;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{text.eyebrow}</p>
          <h1 className="mt-2 font-slab text-3xl font-black leading-tight text-ghost-ink sm:text-4xl">{text.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{text.purpose}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 font-black text-gray-700 hover:border-ghost-rust hover:text-ghost-rust focus:outline-none focus:ring-2 focus:ring-ghost-rust/30"
        >
          {text.back}
        </button>
      </div>

      <section className="rounded-lg border border-ghost-rust/30 bg-[#fff7f2] p-5 shadow-sm sm:p-6" aria-labelledby="internal-boundary-title">
        <h2 id="internal-boundary-title" className="text-sm font-black uppercase tracking-[0.16em] text-ghost-rust">{text.access}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-700">{text.boundary}</p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">{text.sensitive}</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="research-controls-title">
          <h2 id="research-controls-title" className="text-xl font-black text-ghost-ink">{text.question}</h2>
          <form onSubmit={event => void search(event)} className="mt-4">
            <label htmlFor="internal-google-prompt" className="text-sm font-black text-ghost-ink">{text.question}</label>
            <textarea
              id="internal-google-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              rows={7}
              placeholder={text.placeholder}
              aria-describedby="internal-google-prompt-help"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-4 text-sm leading-6 outline-none focus:border-ghost-rust focus:ring-2 focus:ring-ghost-rust/20"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="internal-google-prompt-help" className="text-xs leading-5 text-gray-600">{text.helper}</p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/35 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? text.loading : text.submit}
              </button>
            </div>
          </form>
        </section>

        <aside className="h-fit rounded-lg border border-gray-200 bg-[#fbfaf7] p-5" aria-labelledby="research-filters-title">
          <h2 id="research-filters-title" className="text-sm font-black uppercase tracking-[0.16em] text-gray-700">{text.filters}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-700">{text.noFilters}</p>
        </aside>
      </div>

      <div className="mt-6" aria-live="polite">
        {loading && (
          <section className="rounded-lg border border-ghost-rust/25 bg-white p-6 text-center shadow-sm" aria-busy="true">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black text-ghost-ink">{text.loading}</h2>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-lg border border-red-200 bg-red-50 p-5" role="alert" aria-labelledby="research-error-title">
            <h2 id="research-error-title" className="text-lg font-black text-red-950">{text.failed}</h2>
            <p className="mt-2 break-words text-sm leading-6 text-red-800">{error}</p>
            <p className="mt-2 text-sm font-bold text-red-900">{text.retry}</p>
          </section>
        )}

        {!loading && !error && !result && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="research-idle-title">
            <h2 id="research-idle-title" className="text-xl font-black text-ghost-ink">{text.idleTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">{text.idleBody}</p>
          </section>
        )}

        {!loading && !error && result?.answer && (
          <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm" aria-labelledby="research-result-title">
            <div className="border-b border-black/10 bg-ghost-ink px-5 py-4 text-white sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-gold">{text.result}</p>
                  <h2 id="research-result-title" className="mt-1 text-2xl font-black">{text.answer}</h2>
                </div>
                {result.model && <span className="break-all rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/80">{text.model}: {result.model}</span>}
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {result.notice && (
                <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4" aria-label={text.notice}>
                  <p className="text-sm font-bold leading-6 text-amber-900">{result.notice}</p>
                </aside>
              )}

              <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-900 [overflow-wrap:anywhere]">{result.answer}</div>

              {Boolean(result.webSearchQueries?.length) && (
                <section className="border-t border-gray-200 pt-5" aria-labelledby="research-queries-title">
                  <h3 id="research-queries-title" className="text-sm font-black uppercase tracking-wide text-gray-700">{text.queries}</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-gray-700">
                    {result.webSearchQueries?.map(query => (
                      <li key={query} className="rounded-lg border border-gray-200 bg-[#fbfaf7] p-3 [overflow-wrap:anywhere]">{query}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="border-t border-gray-200 pt-5" aria-labelledby="research-sources-title">
                <h3 id="research-sources-title" className="text-sm font-black uppercase tracking-wide text-gray-700">{text.sources}</h3>
                {Boolean(result.sources?.length) ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {result.sources?.map(source => (
                      <a
                        key={`${source.index}:${source.uri}`}
                        href={source.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 rounded-lg border border-gray-200 p-3 text-sm font-bold text-blue-700 hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      >
                        <span className="block break-words">[{source.index}] {source.title}</span>
                        <span className="mt-1 block break-all text-xs font-normal text-blue-900">{source.uri}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-gray-200 bg-[#fbfaf7] p-3 text-sm leading-6 text-gray-700">{text.noSources}</p>
                )}
              </section>

              {result.searchSuggestionHtml && (
                <section className="border-t border-gray-200 pt-5" aria-labelledby="research-suggestions-title">
                  <h3 id="research-suggestions-title" className="text-sm font-black uppercase tracking-wide text-gray-700">{text.suggestions}</h3>
                  <iframe
                    title={text.suggestions}
                    srcDoc={result.searchSuggestionHtml}
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                    className="mt-3 min-h-24 w-full border-0"
                  />
                </section>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
