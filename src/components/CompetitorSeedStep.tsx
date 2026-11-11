import { useEffect, useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { CompetitorSeedRelationship, CompetitorSeedSuggestion } from '../types/paidTest';
import type { PrePurchaseResearchSignals } from '../types/researchSignals';
import type { Locale } from '../lib/locale';

interface Props {
  orderId: string;
  onStarted: () => void;
  onBack?: () => void;
  locale?: Locale;
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

type SeedCopy = {
  relationships: Record<CompetitorSeedRelationship, string>;
  confidence: Record<string, string>;
  yourIdea: string;
  noReferences: string;
  needNameAndSite: string;
  alreadyThree: string;
  couldNotStart: string;
  finding: string;
  opening: string;
  kicker: string;
  heading: string;
  introBefore: string;
  introAfter: string;
  mapAria: string;
  earlierClues: string;
  customer: string;
  clueTypes: Record<'commercial' | 'audience' | 'ecosystem', string>;
  notSupplied: string;
  optionalOnly: string;
  verified: (confidence: string) => string;
  onlyFound: (count: number) => string;
  replaceTitle: string;
  replaceBody: string;
  namePlaceholder: string;
  sitePlaceholder: string;
  add: string;
  setTitle: string;
  setBody: string;
  remove: string;
  back: string;
  starting: string;
  submit: string;
};

const COPY: Record<Locale, SeedCopy> = {
  en: {
    relationships: {
      direct_competitor: 'Same market',
      adjacent_product: 'Similar or adjacent market',
      current_alternative: 'Alternative or useful market resource'
    },
    confidence: {},
    yourIdea: 'your idea',
    noReferences: 'GhostTown could not find market references',
    needNameAndSite: 'Enter the public name and official website for the replacement resource.',
    alreadyThree: 'Three resources are already selected. Remove one before adding another.',
    couldNotStart: 'Blueprint research could not be started',
    finding: 'GhostTown is finding three useful market references for you...',
    opening: 'Opening your Blueprint research...',
    kicker: 'Post-purchase market research',
    heading: 'GhostTown already did the first pass.',
    introBefore: 'For',
    introAfter: ', we preselected the strongest verified starting resources we found. They are useful because they operate in the same market, a similar market, or reveal buyer and distribution patterns that can improve your Blueprint. Review them and replace one only if you know a better fit.',
    mapAria: 'Research confirmation map',
    earlierClues: 'Earlier clues retained as optional context',
    customer: 'Customer',
    clueTypes: { commercial: 'commercial', audience: 'audience', ecosystem: 'ecosystem' },
    notSupplied: 'Not supplied',
    optionalOnly: 'Optional context only',
    verified: confidence => `GhostTown researched · homepage verified · ${confidence} confidence`,
    onlyFound: count => `GhostTown found only ${count} resource${count === 1 ? '' : 's'} it could verify safely. We will not invent a third resource just to fill the screen.`,
    replaceTitle: 'Want to replace one?',
    replaceBody: 'Optional. The three GhostTown selections are ready to use as-is.',
    namePlaceholder: 'Brand, product, or resource',
    sitePlaceholder: 'Official website',
    add: 'Add',
    setTitle: 'Your starting research set',
    setBody: 'GhostTown preselects up to three verified resources. You can use them immediately or replace one before research starts.',
    remove: 'Remove',
    back: 'Return to Dashboard',
    starting: 'Starting Blueprint research...',
    submit: 'Use These Resources and Build My Blueprint'
  },
  es: {
    relationships: {
      direct_competitor: 'Mismo mercado',
      adjacent_product: 'Mercado parecido o cercano',
      current_alternative: 'Alternativa o recurso útil del mercado'
    },
    confidence: { high: 'alta', medium: 'media', low: 'baja' },
    yourIdea: 'tu idea',
    noReferences: 'GhostTown no encontró referencias del mercado',
    needNameAndSite: 'Escribe el nombre público y la página oficial del recurso que quieres poner.',
    alreadyThree: 'Ya hay tres recursos escogidos. Quita uno antes de añadir otro.',
    couldNotStart: 'No pudimos empezar la investigación de tu Blueprint',
    finding: 'GhostTown está buscando tres referencias útiles de tu mercado...',
    opening: 'Abriendo la investigación de tu Blueprint...',
    kicker: 'Investigación de mercado después de tu compra',
    heading: 'GhostTown ya hizo la primera búsqueda.',
    introBefore: 'Para',
    introAfter: ', escogimos los mejores recursos verificados que encontramos para empezar. Son útiles porque están en el mismo mercado, en uno parecido, o muestran cómo compran y por dónde llegan los clientes, y eso mejora tu Blueprint. Revísalos y cambia uno solo si conoces uno que encaje mejor.',
    mapAria: 'Mapa de confirmación de la investigación',
    earlierClues: 'Pistas de antes, guardadas como contexto opcional',
    customer: 'Cliente',
    clueTypes: { commercial: 'comercial', audience: 'audiencia', ecosystem: 'ecosistema' },
    notSupplied: 'No lo diste',
    optionalOnly: 'Solo contexto opcional',
    verified: confidence => `GhostTown lo investigó · página principal verificada · confianza: ${confidence}`,
    onlyFound: count => `GhostTown solo encontró ${count} recurso${count === 1 ? '' : 's'} que pudo verificar bien. No vamos a inventar un tercero solo para llenar la pantalla.`,
    replaceTitle: '¿Quieres cambiar uno?',
    replaceBody: 'Opcional. Los tres que escogió GhostTown están listos para usarse así.',
    namePlaceholder: 'Marca, producto o recurso',
    sitePlaceholder: 'Página oficial',
    add: 'Añadir',
    setTitle: 'Tu grupo inicial de investigación',
    setBody: 'GhostTown escoge hasta tres recursos verificados. Puedes usarlos ya o cambiar uno antes de que empiece la investigación.',
    remove: 'Quitar',
    back: 'Volver al panel',
    starting: 'Empezando la investigación de tu Blueprint...',
    submit: 'Usar estos recursos y crear mi Blueprint'
  }
};

const preferredRelationshipOrder: CompetitorSeedRelationship[] = [
  'direct_competitor',
  'adjacent_product',
  'current_alternative'
];

function suggestionDraft(item: CompetitorSeedSuggestion): SeedDraft {
  return {
    key: item.suggestionId,
    name: item.name,
    website: item.website,
    relationship: item.relationship
  };
}

function defaultSuggestionSelection(items: CompetitorSeedSuggestion[]): Record<string, SeedDraft> {
  const picked: CompetitorSeedSuggestion[] = [];
  const used = new Set<string>();

  for (const relationship of preferredRelationshipOrder) {
    const match = items.find(item => item.relationship === relationship && !used.has(item.suggestionId));
    if (!match) continue;
    picked.push(match);
    used.add(match.suggestionId);
  }

  for (const item of items) {
    if (picked.length >= 3) break;
    if (used.has(item.suggestionId)) continue;
    picked.push(item);
    used.add(item.suggestionId);
  }

  return Object.fromEntries(picked.slice(0, 3).map(item => [item.suggestionId, suggestionDraft(item)]));
}

export default function CompetitorSeedStep({ orderId, onStarted, onBack, locale = 'en' }: Props) {
  const t = COPY[locale];
  const [ideaName, setIdeaName] = useState('');
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/seeds`), { headers: authHeaders() });
        const body = await response.json<SeedStatusResponse>();
        if (!response.ok) throw new Error(body.error || 'Market-reference step could not be opened');
        if (cancelled) return;
        setIdeaName(body.ideaName || '');
        const loadedSuggestions = body.suggestions || [];
        setSuggestions(loadedSuggestions);
        setResearchSignals(body.researchSignals || null);
        setTargetCustomer(body.targetCustomer || '');
        if (body.confirmedSeeds?.length) {
          setSelected(Object.fromEntries(body.confirmedSeeds.map(seed => [seed.seedId, {
            key: seed.seedId,
            name: seed.name,
            website: seed.website,
            relationship: seed.relationship
          }])));
        } else if (loadedSuggestions.length) {
          setSelected(defaultSuggestionSelection(loadedSuggestions));
        }
        if (!loadedSuggestions.length && !body.confirmedSeeds?.length) {
          setGenerating(true);
          const suggestionResponse = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/seeds/suggest`), {
            method: 'POST',
            headers: authHeaders()
          });
          const suggestionBody = await suggestionResponse.json<{ suggestions?: CompetitorSeedSuggestion[]; error?: string }>();
          if (!suggestionResponse.ok) throw new Error(suggestionBody.error || t.noReferences);
          if (!cancelled) {
            const generatedSuggestions = suggestionBody.suggestions || [];
            setSuggestions(generatedSuggestions);
            setSelected(defaultSuggestionSelection(generatedSuggestions));
          }
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Market-reference step could not be opened');
      } finally {
        if (!cancelled) {
          setGenerating(false);
          setLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [orderId, t]);

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
      setError(t.needNameAndSite);
      return;
    }
    if (selectedSeeds.length >= 3) {
      setError(t.alreadyThree);
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
      if (!response.ok) throw new Error(body.error || t.couldNotStart);
      onStarted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.couldNotStart);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-8 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ghost-rust/20 border-b-ghost-rust" /><p className="mt-4 text-sm text-gray-600">{generating ? t.finding : t.opening}</p></div>;

  return (
    <section className="text-left">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-rust">{t.kicker}</p>
        <h2 className="mt-2 text-3xl font-black text-ghost-ink">{t.heading}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700">{t.introBefore} <strong>{ideaName || t.yourIdea}</strong>{t.introAfter}</p>
      </div>

      {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {researchSignals && <section className="mt-7 rounded-xl border border-ghost-forest/20 bg-[#eef3ef] p-5" aria-label={t.mapAria}>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-forest">{t.earlierClues}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-3"><p className="text-[10px] font-black uppercase text-gray-500">{t.customer}</p><p className="mt-1 text-sm font-bold">{targetCustomer || researchSignals.targetCustomer}</p></div>
          {(['commercial', 'audience', 'ecosystem'] as const).map(type => <div key={type} className="rounded-lg bg-white p-3"><p className="text-[10px] font-black uppercase text-gray-500">{t.clueTypes[type]}</p><p className="mt-1 text-sm font-bold">{researchSignals[type]?.value || t.notSupplied}</p><p className="mt-1 text-[10px] uppercase text-gray-500">{t.optionalOnly}</p></div>)}
        </div>
      </section>}

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {suggestions.map(item => {
          const active = Boolean(selected[item.suggestionId]);
          return <button key={item.suggestionId} type="button" onClick={() => toggleSuggestion(item)} className={`rounded-xl border p-5 text-left transition ${active ? 'border-ghost-rust bg-[#fff0e7] ring-2 ring-ghost-rust' : 'border-black/10 bg-white hover:border-ghost-rust/50'}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.relationships[item.relationship]}</p><h3 className="mt-1 text-lg font-black text-ghost-ink">{item.name}</h3></div><span className={`flex h-6 w-6 items-center justify-center rounded border-2 text-sm font-black ${active ? 'border-ghost-rust bg-ghost-rust text-white' : 'border-gray-300'}`}>{active ? '✓' : ''}</span></div>
            <p className="mt-2 break-all text-xs font-bold text-blue-700">{item.website}</p>
            <p className="mt-3 text-sm text-gray-700">{item.reason}</p>
            <p className="mt-3 text-xs font-bold uppercase text-gray-500">{t.verified(t.confidence[item.confidence] ?? item.confidence)}</p>
          </button>;
        })}
      </div>

      {suggestions.length > 0 && suggestions.length < 3 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t.onlyFound(suggestions.length)}</p>
      )}

      <div className="mt-7 rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-black text-ghost-ink">{t.replaceTitle}</h3>
        <p className="mt-1 text-sm text-gray-600">{t.replaceBody}</p>
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,.8fr)_auto]">
          <input value={custom.name} onChange={event => setCustom(current => ({ ...current, name: event.target.value }))} placeholder={t.namePlaceholder} className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input value={custom.website} onChange={event => setCustom(current => ({ ...current, website: event.target.value }))} placeholder={t.sitePlaceholder} className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={custom.relationship} onChange={event => setCustom(current => ({ ...current, relationship: event.target.value as CompetitorSeedRelationship }))} className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {Object.entries(t.relationships).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={addCustom} className="rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust">{t.add}</button>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-ghost-ink p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.15em] text-ghost-gold">{t.setTitle}</p><p className="mt-1 text-sm text-white/75">{t.setBody}</p></div><span className="text-3xl font-black text-ghost-gold">{selectedSeeds.length}/3</span>
        </div>
        <div className="mt-4 space-y-2">{selectedSeeds.map(seed => <div key={seed.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 p-3"><div><p className="font-black">{seed.name}</p><p className="text-xs text-white/65">{t.relationships[seed.relationship]} · {seed.website}</p></div><button type="button" onClick={() => removeSelected(seed.key)} className="text-sm font-black text-ghost-gold">{t.remove}</button></div>)}</div>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-700">{t.back}</button> : <span />}
        <button type="button" onClick={() => void startResearch()} disabled={!canSubmit} className="rounded-lg bg-ghost-rust px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-45">{submitting ? t.starting : t.submit}</button>
      </div>
    </section>
  );
}
