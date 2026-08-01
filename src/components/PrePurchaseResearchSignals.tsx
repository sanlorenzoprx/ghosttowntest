import { useEffect, useMemo, useState } from 'react';
import type { IdeaIntake } from '../types/lit';
import { apiUrl, authHeaders } from '../lib/api';
import { loadResearchSignals, saveResearchSignals } from '../lib/storage';
import type {
  PrePurchaseResearchSignals as ResearchSignals,
  ResearchPreviewResponse,
  ResearchSignalSelection,
  ResearchSignalType
} from '../types/researchSignals';

interface Props {
  resultId: string;
  idea: IdeaIntake;
  locale: 'en' | 'es';
  value: ResearchSignals | null;
  onChange: (signals: ResearchSignals) => void;
}

const cards: Record<ResearchSignalType, { title: string; question: string; placeholder: string }> = {
  commercial: { title: 'Commercial signal', question: 'What is one brand or product your customer already buys?', placeholder: 'Example: KiwiCo' },
  audience: { title: 'Attention signal', question: 'What might they watch or listen to?', placeholder: 'Podcast, YouTube channel, or creator' },
  ecosystem: { title: 'Trust and ecosystem signal', question: 'Where might they learn or gather?', placeholder: 'Association, event, newsletter, publication, or community' }
};

const spanishCards: typeof cards = {
  commercial: { title: 'Señal comercial', question: '¿Cuál es una marca o producto que tu cliente ya compra?', placeholder: 'Ejemplo: KiwiCo' },
  audience: { title: 'Señal de atención', question: '¿Qué podría ver o escuchar?', placeholder: 'Podcast, canal de YouTube o creador' },
  ecosystem: { title: 'Señal de confianza', question: '¿Dónde podría aprender o reunirse?', placeholder: 'Asociación, evento, boletín, publicación o comunidad' }
};

function emptySignals(resultId: string, targetCustomer: string): ResearchSignals {
  return {
    schemaVersion: 'pre-purchase-research-signals-v1',
    resultId,
    targetCustomer,
    origin: 'free_verdict',
    verificationStatus: 'unverified',
    updatedAt: new Date().toISOString()
  };
}

export default function PrePurchaseResearchSignals({ resultId, idea, locale, value, onChange }: Props) {
  const copy = locale === 'es' ? spanishCards : cards;
  const [draft, setDraft] = useState<ResearchSignals>(() => value ?? loadResearchSignals(resultId) ?? emptySignals(resultId, idea.targetUser));
  const [openType, setOpenType] = useState<ResearchSignalType | null>(null);
  const [typed, setTyped] = useState<Record<ResearchSignalType, string>>({ commercial: '', audience: '', ecosystem: '' });
  const [previews, setPreviews] = useState<Partial<Record<ResearchSignalType, ResearchPreviewResponse>>>({});
  const [loadingType, setLoadingType] = useState<ResearchSignalType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ResearchSignalType, string>>>({});
  const hasAny = useMemo(() => Boolean(draft.commercial || draft.audience || draft.ecosystem), [draft]);

  useEffect(() => {
    setDraft(value ?? loadResearchSignals(resultId) ?? emptySignals(resultId, idea.targetUser));
  }, [idea.targetUser, resultId, value]);

  const commit = (type: ResearchSignalType, selection: ResearchSignalSelection) => {
    const next = { ...draft, [type]: selection, updatedAt: new Date().toISOString() };
    setDraft(next);
    saveResearchSignals(next);
    onChange(next);
    setOpenType(null);
  };

  const selectTyped = (type: ResearchSignalType) => {
    const value = typed[type].replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!value) return;
    commit(type, { type, value, source: 'user_typed', verificationStatus: 'unverified', selectedAt: new Date().toISOString() });
    setTyped(current => ({ ...current, [type]: '' }));
  };

  const selectSuggestion = (type: ResearchSignalType, item: ResearchPreviewResponse['suggestions'][number]) => {
    commit(type, {
      type,
      value: item.label,
      source: 'suggestion',
      candidateId: item.candidateId,
      publicUrl: item.publicUrl,
      verificationStatus: 'provider_candidate',
      selectedAt: new Date().toISOString()
    });
  };

  const skip = (type: ResearchSignalType) => commit(type, {
    type,
    value: locale === 'es' ? 'No estoy seguro' : "I'm not sure",
    source: 'not_sure',
    verificationStatus: 'unverified',
    selectedAt: new Date().toISOString()
  });

  const requestSuggestions = async (type: ResearchSignalType) => {
    setLoadingType(type);
    setErrors(current => ({ ...current, [type]: undefined }));
    try {
      const response = await fetch(apiUrl('/api/research-preview/suggestions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          resultId,
          ideaSummary: `${idea.ideaName}: ${idea.description}. Target customer: ${idea.targetUser}.`,
          signalType: type,
          typedSeed: typed[type],
          locale
        })
      });
      const body = await response.json<ResearchPreviewResponse & { error?: string }>();
      if (!response.ok) throw new Error(body.error || (locale === 'es' ? 'Las sugerencias no están disponibles.' : 'Suggestions are temporarily unavailable.'));
      setPreviews(current => ({ ...current, [type]: { suggestions: body.suggestions.slice(0, 6), insight: body.insight, warning: body.warning } }));
    } catch (error) {
      setErrors(current => ({ ...current, [type]: error instanceof Error ? error.message : 'Suggestions are temporarily unavailable.' }));
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <section className="mb-8 rounded-sm border border-ghost-forest/20 bg-[#eef3ef] p-5 shadow-dust sm:p-6" aria-labelledby="research-signals-title" data-testid="pre-purchase-research-signals">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-forest">{locale === 'es' ? 'Mapa de investigación opcional' : 'Optional research map'}</p>
      <h2 id="research-signals-title" className="mt-2 font-display text-2xl font-bold text-ghost-ink">{locale === 'es' ? 'Dale una ventaja a tu Launch Blueprint' : 'Give your Launch Blueprint a head start'}</h2>
      <p className="mt-2 text-sm text-gray-700">{locale === 'es' ? 'Estas pistas son opcionales, se guardan automáticamente y se verificarán durante la investigación pagada.' : 'These clues are optional, save automatically, and will be verified during paid research.'}</p>
      <div className="mt-5 grid gap-4">
        {(Object.keys(copy) as ResearchSignalType[]).map(type => {
          const selection = draft[type];
          const preview = previews[type];
          const isOpen = openType === type;
          return <article key={type} className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-bold text-gray-950">{copy[type].title}</h3>
            <p className="mt-1 text-sm font-medium text-gray-800">{copy[type].question}</p>
            {selection && !isOpen ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-ghost-forest/20 bg-[#f7faf7] p-3 text-sm"><span><strong>{selection.source === 'not_sure' ? (locale === 'es' ? 'Omitido' : 'Skipped') : selection.value}</strong>{selection.source !== 'not_sure' && <span className="ml-2 text-xs text-gray-500">{selection.verificationStatus === 'provider_candidate' ? (locale === 'es' ? 'Candidato encontrado' : 'Provider candidate') : (locale === 'es' ? 'Sin verificar' : 'Not verified yet')}</span>}</span><button type="button" className="font-bold text-ghost-rust underline" onClick={() => setOpenType(type)}>{locale === 'es' ? 'Editar' : 'Edit'}</button></div> : <button type="button" className="mt-3 min-h-11 rounded border border-ghost-forest px-4 py-2 text-sm font-bold text-ghost-forest" onClick={() => setOpenType(type)} aria-expanded={isOpen}>{locale === 'es' ? 'Añadir una pista' : 'Add a clue'}</button>}
            {isOpen && <div className="mt-4 border-t border-gray-100 pt-4">
              <label className="block text-sm font-bold text-gray-800">{copy[type].title}<input value={typed[type]} onChange={event => setTyped(current => ({ ...current, [type]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); selectTyped(type); } }} placeholder={copy[type].placeholder} className="mt-2 min-h-11 w-full rounded border border-gray-300 px-3 py-2 text-base outline-none focus:border-ghost-forest focus:ring-2 focus:ring-ghost-forest/20" /></label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={!typed[type].trim()} onClick={() => selectTyped(type)} className="min-h-11 rounded bg-ghost-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{locale === 'es' ? 'Guardar pista' : 'Save clue'}</button>
                <button type="button" onClick={() => void requestSuggestions(type)} disabled={loadingType === type} className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800">{loadingType === type ? (locale === 'es' ? 'Buscando…' : 'Finding ideas…') : (locale === 'es' ? 'Mostrar sugerencias' : 'Show suggestions')}</button>
                <button type="button" onClick={() => skip(type)} className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700">{locale === 'es' ? 'No estoy seguro' : "I'm not sure"}</button>
              </div>
              {errors[type] && <p className="mt-2 text-sm text-red-700" role="alert">{errors[type]}</p>}
              {preview && <div className="mt-4 rounded border border-ghost-gold/40 bg-[#fffaf0] p-3" aria-live="polite"><p className="text-sm text-gray-800">{preview.insight}</p>{preview.warning && <p className="mt-2 text-xs text-amber-800">{preview.warning}</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{preview.suggestions.map(item => <button type="button" key={item.candidateId} onClick={() => selectSuggestion(type, item)} className="min-h-11 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm font-bold text-gray-800 hover:border-ghost-rust">{item.label}</button>)}</div></div>}
            </div>}
          </article>;
        })}
      </div>
      <p className="mt-4 text-xs text-gray-600">{hasAny ? (locale === 'es' ? 'Tu mapa está guardado en este dispositivo y pasará al checkout.' : 'Your map is saved on this device and will be included in checkout.') : (locale === 'es' ? 'Puedes omitir las tres tarjetas y continuar al checkout.' : 'You can skip all three cards and continue to checkout.')}</p>
    </section>
  );
}
