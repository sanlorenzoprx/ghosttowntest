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

interface SignalCopy {
  title: string;
  question: string;
  placeholder: string;
  purpose: string;
}

const signalOrder: ResearchSignalType[] = ['commercial', 'audience', 'ecosystem'];

const cards: Record<ResearchSignalType, SignalCopy> = {
  commercial: {
    title: 'Commercial signal',
    question: 'What is one brand or product your customer already buys?',
    placeholder: 'Example: KiwiCo',
    purpose: 'Helps paid research start near real buying behavior, not a generic category.'
  },
  audience: {
    title: 'Attention signal',
    question: 'What might they watch or listen to?',
    placeholder: 'Podcast, YouTube channel, or creator',
    purpose: 'Helps focus later podcast, creator, and channel research.'
  },
  ecosystem: {
    title: 'Trust and ecosystem signal',
    question: 'Where might they learn or gather?',
    placeholder: 'Association, event, newsletter, publication, or community',
    purpose: 'Helps find credible communities and publications to investigate.'
  }
};

const spanishCards: typeof cards = {
  commercial: {
    title: 'Señal comercial',
    question: '¿Cuál es una marca o producto que tu cliente ya compra?',
    placeholder: 'Ejemplo: KiwiCo',
    purpose: 'Ayuda a que la investigación pagada empiece cerca de comportamiento de compra real, no de una categoría genérica.'
  },
  audience: {
    title: 'Señal de atención',
    question: '¿Qué podría ver o escuchar?',
    placeholder: 'Podcast, canal de YouTube o creador',
    purpose: 'Ayuda a enfocar la investigación posterior de podcasts, creadores y canales.'
  },
  ecosystem: {
    title: 'Señal de confianza y ecosistema',
    question: '¿Dónde podría aprender o reunirse?',
    placeholder: 'Asociación, evento, boletín, publicación o comunidad',
    purpose: 'Ayuda a encontrar comunidades y publicaciones creíbles para investigar.'
  }
};

const pageCopy = {
  en: {
    stage: 'Optional research clues',
    title: 'Carry useful clues into the Launch Blueprint',
    purpose: 'These inputs help GhostTown focus paid research after checkout. They are optional planning clues, not proof of demand, and they are not treated as verified evidence until the paid research step checks them.',
    optional: 'Optional',
    notProof: 'Not proof yet',
    add: 'Add a clue',
    edit: 'Edit clue',
    save: 'Save clue',
    suggestions: 'Show suggestions',
    loadingSuggestions: 'Finding ideas…',
    skip: "I'm not sure",
    skipped: 'Skipped',
    providerCandidate: 'Provider candidate',
    unverified: 'Not verified yet',
    selected: 'Selected clue',
    saved: 'Saved on this device and attached to the paid checkout intake.',
    empty: 'You can skip all three and continue to the Blueprint checkout below.',
    continueNote: 'Continue from the Launch Blueprint panel when you are ready.',
    suggestionError: 'Suggestions are temporarily unavailable.',
    previewLabel: 'Suggested research clues',
    inputHelp: 'Use a public brand, channel, community, publication, or product name. Keep it short.'
  },
  es: {
    stage: 'Pistas opcionales de investigación',
    title: 'Lleva pistas útiles al Launch Blueprint',
    purpose: 'Estas entradas ayudan a GhostTown a enfocar la investigación pagada después del checkout. Son pistas opcionales de planificación, no prueba de demanda, y no se tratan como evidencia verificada hasta que la investigación pagada las revise.',
    optional: 'Opcional',
    notProof: 'Aún no es prueba',
    add: 'Añadir una pista',
    edit: 'Editar pista',
    save: 'Guardar pista',
    suggestions: 'Mostrar sugerencias',
    loadingSuggestions: 'Buscando ideas…',
    skip: 'No estoy seguro',
    skipped: 'Omitido',
    providerCandidate: 'Candidato encontrado',
    unverified: 'Aún sin verificar',
    selected: 'Pista seleccionada',
    saved: 'Guardado en este dispositivo y adjunto al intake del checkout pagado.',
    empty: 'Puedes omitir las tres tarjetas y continuar al checkout del Blueprint abajo.',
    continueNote: 'Continúa desde el panel del Launch Blueprint cuando estés listo.',
    suggestionError: 'Las sugerencias no están disponibles por ahora.',
    previewLabel: 'Pistas de investigación sugeridas',
    inputHelp: 'Usa una marca, canal, comunidad, publicación o producto público. Mantén la pista breve.'
  }
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
  const text = pageCopy[locale];
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
      if (!response.ok) throw new Error(body.error || text.suggestionError);
      setPreviews(current => ({ ...current, [type]: { suggestions: body.suggestions.slice(0, 6), insight: body.insight, warning: body.warning } }));
    } catch (error) {
      setErrors(current => ({ ...current, [type]: error instanceof Error ? error.message : text.suggestionError }));
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-sm border border-ghost-forest/20 bg-[#eef3ef] p-5 shadow-dust sm:p-6" aria-labelledby="research-signals-title" data-testid="pre-purchase-research-signals">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-forest">{text.stage}</p>
          <h2 id="research-signals-title" className="mt-2 font-display text-2xl font-bold text-ghost-ink">{text.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
          <span className="rounded-full border border-ghost-forest/25 bg-white px-3 py-1 text-ghost-forest">{text.optional}</span>
          <span className="rounded-full border border-ghost-gold/40 bg-[#fffaf0] px-3 py-1 text-amber-800">{text.notProof}</span>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{text.purpose}</p>

      <div className="mt-5 grid gap-4">
        {signalOrder.map(type => {
          const selection = draft[type];
          const preview = previews[type];
          const isOpen = openType === type;
          const panelId = `research-signal-${type}`;
          const inputId = `research-signal-${type}-input`;
          const helpId = `research-signal-${type}-help`;
          return (
            <article key={type} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-950">{copy[type].title}</h3>
                  <p className="mt-1 text-sm font-medium text-gray-800">{copy[type].question}</p>
                  <p id={helpId} className="mt-2 text-xs leading-5 text-gray-600">{copy[type].purpose}</p>
                </div>
                <span className="w-fit rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">{text.optional}</span>
              </div>

              {selection && !isOpen ? (
                <div className="mt-3 flex flex-col gap-3 rounded border border-ghost-forest/20 bg-[#f7faf7] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ghost-forest">{text.selected}</p>
                    <p className="mt-1 break-words font-bold text-gray-900">{selection.source === 'not_sure' ? text.skipped : selection.value}</p>
                    {selection.source !== 'not_sure' && (
                      <p className="mt-1 text-xs text-gray-500">
                        {selection.verificationStatus === 'provider_candidate' ? text.providerCandidate : text.unverified}
                      </p>
                    )}
                  </div>
                  <button type="button" className="min-h-11 rounded border border-ghost-rust/40 px-4 py-2 text-sm font-bold text-ghost-rust underline-offset-4 hover:underline" onClick={() => setOpenType(type)}>
                    {text.edit}
                  </button>
                </div>
              ) : (
                <button type="button" className="mt-3 min-h-11 rounded border border-ghost-forest px-4 py-2 text-sm font-bold text-ghost-forest hover:bg-ghost-forest hover:text-white" onClick={() => setOpenType(type)} aria-expanded={isOpen} aria-controls={panelId}>
                  {text.add}
                </button>
              )}

              {isOpen && (
                <div id={panelId} className="mt-4 border-t border-gray-100 pt-4">
                  <label htmlFor={inputId} className="block text-sm font-bold text-gray-800">{copy[type].title}</label>
                  <input
                    id={inputId}
                    value={typed[type]}
                    onChange={event => setTyped(current => ({ ...current, [type]: event.target.value }))}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        selectTyped(type);
                      }
                    }}
                    placeholder={copy[type].placeholder}
                    aria-describedby={helpId}
                    className="mt-2 min-h-11 w-full rounded border border-gray-300 px-3 py-2 text-base outline-none focus:border-ghost-forest focus:ring-2 focus:ring-ghost-forest/20"
                  />
                  <p className="mt-2 text-xs text-gray-600">{text.inputHelp}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={!typed[type].trim()} onClick={() => selectTyped(type)} className="min-h-11 rounded bg-ghost-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{text.save}</button>
                    <button type="button" onClick={() => void requestSuggestions(type)} disabled={loadingType === type} className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800">{loadingType === type ? text.loadingSuggestions : text.suggestions}</button>
                    <button type="button" onClick={() => skip(type)} className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700">{text.skip}</button>
                  </div>
                  {errors[type] && <p className="mt-2 break-words text-sm text-red-700" role="alert">{errors[type]}</p>}
                  {preview && (
                    <div className="mt-4 rounded border border-ghost-gold/40 bg-[#fffaf0] p-3" aria-live="polite" aria-label={text.previewLabel}>
                      <p className="text-sm text-gray-800">{preview.insight}</p>
                      {preview.warning && <p className="mt-2 text-xs text-amber-800">{preview.warning}</p>}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {preview.suggestions.map(item => (
                          <button type="button" key={item.candidateId} onClick={() => selectSuggestion(type, item)} className="min-h-11 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm font-bold text-gray-800 hover:border-ghost-rust">
                            <span className="break-words">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-600">{hasAny ? text.saved : text.empty} {text.continueNote}</p>
    </section>
  );
}
