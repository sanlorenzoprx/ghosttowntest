import { useEffect, useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { CompetitorSeedRelationship, CompetitorSeedSuggestion } from '../types/paidTest';
import type { PrePurchaseResearchSignals } from '../types/researchSignals';

interface Props {
  orderId: string;
  onStarted: () => void;
  onBack?: () => void;
}

interface SeedDraft {
  key: string;
  name: string;
  website: string;
  relationship: CompetitorSeedRelationship;
}

interface SeedStatusResponse {
  ideaName?: string;
  status?: string;
  paid?: boolean;
  suggestions?: CompetitorSeedSuggestion[];
  confirmedSeeds?: Array<{ seedId: string; name: string; website: string; relationship: CompetitorSeedRelationship }>;
  researchSignals?: PrePurchaseResearchSignals | null;
  targetCustomer?: string;
  error?: string;
}

type SeedLocale = 'en' | 'es';

const seedCopy = {
  en: {
    stage: 'Paid research intake',
    title: 'Choose the market neighborhood GhostTown should research.',
    intro: 'For',
    introAfter: 'confirm exactly 2 or 3 existing products, brands, publications, or adjacent tools whose audiences resemble your customer.',
    notProof: 'Seeds guide research. They are not proof of demand.',
    requirement: 'Exactly 2 or 3 seeds required',
    selectedCount: 'Selected research seeds',
    selectedOf: 'selected',
    needTwo: 'Select at least two seeds to begin research.',
    ready: 'Ready to confirm. You may choose up to three.',
    maxed: 'Three selected. Remove one before adding another.',
    suggestionsTitle: 'Suggested starting points',
    suggestedNote: 'Suggestions are possible research starting points from the existing paid order context. Review them before confirming.',
    selected: 'Selected',
    notSelected: 'Not selected',
    verified: 'Homepage verified',
    unverified: 'Homepage not verified',
    confidence: 'confidence',
    customTitle: 'Add or replace with a seed you know',
    customHelp: 'Use a public official website. Long names and URLs can wrap safely.',
    name: 'Brand or product name',
    website: 'Official website',
    relationship: 'Relationship',
    add: 'Add',
    customMissing: 'Enter the public name and official website for the custom seed.',
    tooMany: 'Choose no more than three seeds. Remove one before adding another.',
    loading: 'Opening your paid research intake...',
    generating: 'Finding likely competitors and adjacent brands...',
    errorOpen: 'Competitor seed intake could not be opened',
    errorSuggest: 'GhostTown could not suggest competitor seeds',
    errorStart: 'Media & Distribution research could not be started',
    researchMap: 'Confirmation map carried from your verdict',
    customer: 'Customer',
    notSupplied: 'Not supplied',
    openResearch: 'Open research clue',
    carried: 'Carried into provider planning',
    mapNote: 'Audience and ecosystem clues are included in later research planning, but the confirmed seeds below control where public footprint research starts.',
    confirmedPanel: 'Confirmed research seeds',
    confirmedHelp: 'Research charges and the durable Workflow begin only after confirmation.',
    remove: 'Remove',
    back: 'Return to Dashboard',
    submit: 'Confirm seeds and build my network',
    submitting: 'Starting research...',
    emptySelected: 'No seeds selected yet.',
    relationships: {
      direct_competitor: 'Direct competitor',
      adjacent_product: 'Adjacent product or brand',
      current_alternative: 'Current alternative'
    }
  },
  es: {
    stage: 'Intake de investigación pagada',
    title: 'Elige el vecindario de mercado que GhostTown debe investigar.',
    intro: 'Para',
    introAfter: 'confirma exactamente 2 o 3 productos, marcas, publicaciones o herramientas adyacentes existentes cuyas audiencias se parezcan a tu cliente.',
    notProof: 'Las semillas guían la investigación. No son prueba de demanda.',
    requirement: 'Se requieren exactamente 2 o 3 semillas',
    selectedCount: 'Semillas de investigación seleccionadas',
    selectedOf: 'seleccionadas',
    needTwo: 'Selecciona al menos dos semillas para empezar la investigación.',
    ready: 'Listo para confirmar. Puedes elegir hasta tres.',
    maxed: 'Tres seleccionadas. Quita una antes de añadir otra.',
    suggestionsTitle: 'Puntos de partida sugeridos',
    suggestedNote: 'Las sugerencias son posibles puntos de partida desde el contexto existente de la orden pagada. Revísalas antes de confirmar.',
    selected: 'Seleccionada',
    notSelected: 'No seleccionada',
    verified: 'Homepage verificada',
    unverified: 'Homepage no verificada',
    confidence: 'confianza',
    customTitle: 'Añade o reemplaza con una semilla que conoces',
    customHelp: 'Usa un sitio web oficial público. Los nombres y URLs largos pueden ajustarse al ancho.',
    name: 'Nombre de marca o producto',
    website: 'Sitio web oficial',
    relationship: 'Relación',
    add: 'Añadir',
    customMissing: 'Ingresa el nombre público y el sitio web oficial de la semilla personalizada.',
    tooMany: 'Elige no más de tres semillas. Quita una antes de añadir otra.',
    loading: 'Abriendo tu intake de investigación pagada...',
    generating: 'Buscando competidores y marcas adyacentes probables...',
    errorOpen: 'No se pudo abrir el intake de semillas competidoras',
    errorSuggest: 'GhostTown no pudo sugerir semillas competidoras',
    errorStart: 'No se pudo iniciar la investigación de Media & Distribution',
    researchMap: 'Mapa de confirmación traído desde tu veredicto',
    customer: 'Cliente',
    notSupplied: 'No proporcionado',
    openResearch: 'Pista abierta de investigación',
    carried: 'Llevado a planificación del proveedor',
    mapNote: 'Las pistas de audiencia y ecosistema se incluyen en la planificación posterior, pero las semillas confirmadas abajo controlan dónde empieza la investigación de huellas públicas.',
    confirmedPanel: 'Semillas de investigación confirmadas',
    confirmedHelp: 'Los cargos de investigación y el Workflow durable empiezan solo después de confirmar.',
    remove: 'Quitar',
    back: 'Volver al Dashboard',
    submit: 'Confirmar semillas y construir mi red',
    submitting: 'Iniciando investigación...',
    emptySelected: 'Aún no hay semillas seleccionadas.',
    relationships: {
      direct_competitor: 'Competidor directo',
      adjacent_product: 'Producto o marca adyacente',
      current_alternative: 'Alternativa actual'
    }
  }
};

function seedLocale(): SeedLocale {
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

function suggestionDraft(item: CompetitorSeedSuggestion): SeedDraft {
  return {
    key: item.suggestionId,
    name: item.name,
    website: item.website,
    relationship: item.relationship
  };
}

export default function CompetitorSeedStep({ orderId, onStarted, onBack }: Props) {
  const locale = seedLocale();
  const text = seedCopy[locale];
  const [ideaName, setIdeaName] = useState('your idea');
  const [suggestions, setSuggestions] = useState<CompetitorSeedSuggestion[]>([]);
  const [selected, setSelected] = useState<Record<string, SeedDraft>>({});
  const [custom, setCustom] = useState<SeedDraft>({ key: 'custom', name: '', website: '', relationship: 'adjacent_product' });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [researchSignals, setResearchSignals] = useState<PrePurchaseResearchSignals | null>(null);
  const [targetCustomer, setTargetCustomer] = useState('');

  const selectedSeeds = useMemo(() => Object.values(selected), [selected]);
  const canSubmit = selectedSeeds.length >= 2 && selectedSeeds.length <= 3 && !submitting;
  const countMessage = selectedSeeds.length < 2 ? text.needTwo : selectedSeeds.length >= 3 ? text.maxed : text.ready;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/seeds`), { headers: authHeaders() });
        const body = await response.json<SeedStatusResponse>();
        if (!response.ok) throw new Error(body.error || text.errorOpen);
        if (cancelled) return;
        setIdeaName(body.ideaName || 'your idea');
        setSuggestions(body.suggestions || []);
        setResearchSignals(body.researchSignals || null);
        setTargetCustomer(body.targetCustomer || '');
        if (body.confirmedSeeds?.length) {
          setSelected(Object.fromEntries(body.confirmedSeeds.map(seed => [seed.seedId, {
            key: seed.seedId,
            name: seed.name,
            website: seed.website,
            relationship: seed.relationship
          }])));
        }
        if (!(body.suggestions || []).length && !body.confirmedSeeds?.length) {
          setGenerating(true);
          const suggestionResponse = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/seeds/suggest`), {
            method: 'POST',
            headers: authHeaders()
          });
          const suggestionBody = await suggestionResponse.json<{ suggestions?: CompetitorSeedSuggestion[]; error?: string }>();
          if (!suggestionResponse.ok) throw new Error(suggestionBody.error || text.errorSuggest);
          if (!cancelled) setSuggestions(suggestionBody.suggestions || []);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : text.errorOpen);
      } finally {
        if (!cancelled) {
          setGenerating(false);
          setLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orderId, text.errorOpen, text.errorSuggest]);

  const toggleSuggestion = (item: CompetitorSeedSuggestion) => {
    setError('');
    setSelected(current => {
      if (current[item.suggestionId]) {
        const next = { ...current };
        delete next[item.suggestionId];
        return next;
      }
      if (Object.keys(current).length >= 3) return current;
      return { ...current, [item.suggestionId]: suggestionDraft(item) };
    });
  };

  const addCustom = () => {
    setError('');
    if (!custom.name.trim() || !custom.website.trim()) {
      setError(text.customMissing);
      return;
    }
    if (selectedSeeds.length >= 3) {
      setError(text.tooMany);
      return;
    }
    const key = `custom-${Date.now()}`;
    setSelected(current => ({ ...current, [key]: { ...custom, key } }));
    setCustom({ key: 'custom', name: '', website: '', relationship: 'adjacent_product' });
  };

  const removeSelected = (key: string) => {
    setSelected(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const startResearch = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/seeds`), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seeds: selectedSeeds.map(seed => ({
            name: seed.name,
            website: seed.website,
            relationship: seed.relationship
          }))
        })
      });
      const body = await response.json<{ error?: string }>();
      if (!response.ok) throw new Error(body.error || text.errorStart);
      onStarted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.errorStart);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-8 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" aria-hidden="true" /><p className="mt-4 text-sm text-gray-600">{generating ? text.generating : text.loading}</p></div>;

  return (
    <section className="text-left" aria-labelledby="competitor-seed-title">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{text.stage}</p>
        <h2 id="competitor-seed-title" className="mt-2 break-words text-3xl font-black text-ghost-ink">{text.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700">
          {text.intro} <strong className="break-words">{ideaName}</strong>, {text.introAfter}
        </p>
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
          <span className="rounded-full border border-ghost-rust/30 bg-white px-3 py-1 text-ghost-rust">{text.requirement}</span>
          <span className="rounded-full border border-ghost-gold/40 bg-[#fffaf0] px-3 py-1 text-amber-900">{text.notProof}</span>
        </div>
      </div>

      {error && <p className="mt-5 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {researchSignals && <section className="mt-7 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-5" aria-label={text.researchMap}>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-forest">{text.researchMap}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 rounded-lg bg-white p-3"><p className="text-[10px] font-black uppercase text-gray-500">{text.customer}</p><p className="mt-1 break-words text-sm font-bold">{targetCustomer || researchSignals.targetCustomer}</p></div>
          {(['commercial', 'audience', 'ecosystem'] as const).map(type => <div key={type} className="min-w-0 rounded-lg bg-white p-3"><p className="text-[10px] font-black uppercase text-gray-500">{type}</p><p className="mt-1 break-words text-sm font-bold">{researchSignals[type]?.value || text.notSupplied}</p><p className="mt-1 text-[10px] uppercase text-gray-500">{researchSignals[type]?.source === 'not_sure' ? text.openResearch : text.carried}</p></div>)}
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-600">{text.mapNote}</p>
      </section>}

      <section className="mt-7" aria-labelledby="seed-suggestions-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="seed-suggestions-title" className="font-black text-ghost-ink">{text.suggestionsTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">{text.suggestedNote}</p>
          </div>
          <p className="text-sm font-bold text-ghost-rust">{selectedSeeds.length}/3 {text.selectedOf}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {suggestions.map(item => {
            const active = Boolean(selected[item.suggestionId]);
            return (
              <button
                key={item.suggestionId}
                type="button"
                onClick={() => toggleSuggestion(item)}
                aria-pressed={active}
                className={`rounded-xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 ${active ? 'border-ghost-rust bg-[#fff0e7] ring-2 ring-ghost-rust' : 'border-black/10 bg-white hover:border-ghost-rust/50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-ghost-rust">{text.relationships[item.relationship]}</p>
                    <h4 className="mt-1 break-words text-lg font-black text-ghost-ink">{item.name}</h4>
                  </div>
                  <span className={`flex h-7 min-w-7 items-center justify-center rounded border-2 px-1 text-xs font-black ${active ? 'border-ghost-rust bg-ghost-rust text-white' : 'border-gray-300 text-gray-500'}`}>{active ? '✓' : '—'}</span>
                </div>
                <p className="mt-2 break-all text-xs font-bold text-blue-700">{item.website}</p>
                <p className="mt-3 break-words text-sm leading-6 text-gray-700">{item.reason}</p>
                <p className="mt-3 text-xs font-bold uppercase leading-5 text-gray-500">
                  {active ? text.selected : text.notSelected} ·{' '}
                  <span className={item.verified ? 'text-green-700' : 'text-gray-500'}>
                    {item.verified ? text.verified : text.unverified}
                  </span>{' '}
                  · {item.confidence} {text.confidence}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-black/10 bg-white p-5" aria-labelledby="custom-seed-title">
        <h3 id="custom-seed-title" className="font-black text-ghost-ink">{text.customTitle}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-600">{text.customHelp}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.2fr_.8fr_auto]">
          <label className="text-sm font-bold text-gray-800">
            {text.name}
            <input value={custom.name} onChange={event => setCustom(current => ({ ...current, name: event.target.value }))} placeholder={text.name} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" />
          </label>
          <label className="text-sm font-bold text-gray-800">
            {text.website}
            <input value={custom.website} onChange={event => setCustom(current => ({ ...current, website: event.target.value }))} placeholder={text.website} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ghost-rust/30" />
          </label>
          <label className="text-sm font-bold text-gray-800">
            {text.relationship}
            <select value={custom.relationship} onChange={event => setCustom(current => ({ ...current, relationship: event.target.value as CompetitorSeedRelationship }))} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">
              {Object.entries(text.relationships).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={addCustom} className="min-h-11 self-end rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust hover:bg-[#fff7f2] focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">{text.add}</button>
        </div>
      </section>

      <section className="mt-6 rounded-xl bg-ghost-ink p-5 text-white" aria-labelledby="selected-seeds-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-gold">{text.confirmedPanel}</p>
            <h3 id="selected-seeds-title" className="mt-1 text-lg font-black">{text.selectedCount}</h3>
            <p className="mt-1 text-sm text-white/75">{text.confirmedHelp}</p>
            <p className="mt-2 text-sm font-bold text-ghost-gold">{countMessage}</p>
          </div>
          <span className="text-3xl font-black text-ghost-gold">{selectedSeeds.length}/3</span>
        </div>
        <div className="mt-4 space-y-2">
          {selectedSeeds.length === 0 && <p className="rounded-lg bg-white/10 p-3 text-sm text-white/75">{text.emptySelected}</p>}
          {selectedSeeds.map(seed => <div key={seed.key} className="flex flex-col gap-3 rounded-lg bg-white/10 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-black">{seed.name}</p><p className="break-all text-xs text-white/65">{text.relationships[seed.relationship]} · {seed.website}</p></div><button type="button" onClick={() => removeSelected(seed.key)} className="min-h-11 rounded border border-white/20 px-3 py-2 text-sm font-black text-ghost-gold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ghost-gold/50">{text.remove}</button></div>)}
        </div>
      </section>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? <button type="button" onClick={onBack} className="min-h-11 rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-ghost-rust/30">{text.back}</button> : <span aria-hidden="true" />}
        <button type="button" onClick={() => void startResearch()} disabled={!canSubmit} className="min-h-11 rounded-lg bg-ghost-rust px-6 py-3 font-black text-white hover:bg-[#96360d] focus:outline-none focus:ring-2 focus:ring-ghost-rust/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45">{submitting ? text.submitting : text.submit}</button>
      </div>
    </section>
  );
}
