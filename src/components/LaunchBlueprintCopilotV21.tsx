import { useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import { executionLaneProfile, type ExecutionCopilotMode } from '../lib/blueprintExecutionIntelligence';
import type { BusinessModelExecutionLane } from '../types/launchBlueprintV21';
import type { ExecutionCoachPhase, ExecutionLearningCandidate } from '../types/executionLearning';
import type { Locale } from '../lib/locale';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface CopilotResponse {
  answer?: string;
  error?: string;
  capability?: string;
  evidenceAssessment?: string;
  contradictionDetected?: boolean;
  recommendedAction?: string;
  evidenceToRecord?: string[];
  critic?: { challenge?: string; overreachDetected?: boolean; saferRecommendation?: string } | null;
  guardrails?: {
    route?: string;
    checkpointDay?: number | null;
    primaryConstraint?: string;
    mayChange?: string[];
    mustKeep?: string[];
    branchReason?: string;
    nextAction?: string;
    strategyRoomDoesNotMutateLiveExperiment?: boolean;
  };
  groundedWebSources?: Array<{ title: string; url: string }>;
  learningCandidates?: ExecutionLearningCandidate[];
  cache?: { hit?: boolean; responseId?: string; expiresAt?: string | null; hitCount?: number };
  memory?: { saved?: boolean; learningCandidateCount?: number; priorDailyAssessmentCount?: number; reusableKnowledgeCount?: number };
}

type CopilotCopy = {
  quickPrompts: string[];
  failed: (status: number) => string;
  couldNotAnswer: string;
  couldNotAnswerPrefix: (message: string) => string;
  openButton: (day: number) => string;
  asideLabel: string;
  kicker: (day: number) => string;
  experiment: (label: string) => string;
  laneLabel: (lane: BusinessModelExecutionLane, fallback: string) => string;
  close: string;
  commercialProof: string;
  laneProof: (lane: BusinessModelExecutionLane, fallback: string) => string;
  currentExperiment: string;
  strategyRoom: string;
  currentExperimentHint: string;
  strategyRoomHint: string;
  reviewPrompt: (day: number) => string;
  reviewButton: string;
  orAsk: string;
  you: string;
  thinking: string;
  recommended: string;
  guardrails: string;
  route: string;
  mayChange: string;
  nothingYet: string;
  keepFixed: string;
  notApplicable: string;
  critic: string;
  recordNext: string;
  learned: string;
  saved: string;
  cacheHit: string;
  sources: string;
  askLabel: string;
  placeholder: string;
  footnote: string;
  ask: string;
};

const LANE_ES: Record<BusinessModelExecutionLane, { label: string; proof: string }> = {
  service_or_consulting: { label: 'Servicio / consultoría', proof: 'un cliente que de verdad encaja acepta un trabajo pagado con alcance claro' },
  saas: { label: 'SaaS', proof: 'un cliente que de verdad encaja pone dinero, acceso o tiempo real de su operación en ese flujo específico' },
  digital_product: { label: 'Producto digital', proof: 'un cliente que de verdad encaja paga por la primera edición o evento completo y útil' },
  physical_product: { label: 'Producto físico', proof: 'un cliente o tienda que de verdad encaja pone dinero o te da espacio en góndola o para pruebas, por escrito, para el primer lote' },
  marketplace: { label: 'Marketplace', proof: 'una pareja específica de comprador y proveedor da un paso real de compra o venta' },
  local_business: { label: 'Negocio local', proof: 'un cliente local que de verdad encaja reserva o paga por el servicio con alcance claro' },
  creator_or_media: { label: 'Creador / medios', proof: 'alguien de tu audiencia o un patrocinador hace algo comercial, más allá de vistas, likes o elogios generales' }
};

const COPY: Record<Locale, CopilotCopy> = {
  en: {
    quickPrompts: [
      'What exactly should I do today?',
      'What evidence do I still need to record?',
      'Explain today’s success and failure thresholds.',
      'Does my evidence contradict the plan?'
    ],
    failed: status => `Execution Copilot failed (${status})`,
    couldNotAnswer: 'Execution Copilot could not answer',
    couldNotAnswerPrefix: message => `I could not answer this request: ${message}`,
    openButton: day => `Ask GhostTown · Day ${day}`,
    asideLabel: 'GhostTown Execution Copilot',
    kicker: day => `Execution Copilot · Day ${day}`,
    experiment: label => `${label} experiment`,
    laneLabel: (_lane, fallback) => fallback,
    close: 'Close',
    commercialProof: 'Commercial proof:',
    laneProof: (_lane, fallback) => fallback,
    currentExperiment: 'Current Experiment',
    strategyRoom: 'Strategy Room',
    currentExperimentHint: 'Advice must respect the live experiment, checkpoint branch, and frozen variables.',
    strategyRoomHint: 'Explore broader strategy without changing the live experiment.',
    reviewPrompt: day => `Review the recorded results for Day ${day}. Tell me what happened, what the evidence means, what I should do next, and what lesson—if any—is worth remembering.`,
    reviewButton: 'Review today’s recorded results',
    orAsk: 'Or ask from the work you are doing now:',
    you: 'You',
    thinking: 'Reading the Blueprint, today’s packet, evidence, checkpoint state, and relevant research…',
    recommended: 'Recommended bounded action',
    guardrails: 'Experiment guardrails',
    route: 'Route:',
    mayChange: 'May change:',
    nothingYet: 'nothing yet',
    keepFixed: 'Keep fixed:',
    notApplicable: 'n/a',
    critic: 'Evidence critic',
    recordNext: 'Record next',
    learned: 'What GhostTown learned',
    saved: 'Saved to your Sprint learning history.',
    cacheHit: ' This answer came from the saved cache for the same evidence.',
    sources: 'Grounded web sources',
    askLabel: 'Ask GhostTown',
    placeholder: 'Paste a customer response, ask what to do, or explore strategy…',
    footnote: 'AI advises. Evidence, completion and branch permissions remain deterministic.',
    ask: 'Ask'
  },
  es: {
    quickPrompts: [
      '¿Qué exactamente debo hacer hoy?',
      '¿Qué pruebas me faltan por anotar?',
      'Explícame qué cuenta hoy como éxito y qué cuenta como fallo.',
      '¿Lo que encontré contradice el plan?'
    ],
    failed: status => `El Execution Copilot falló (${status})`,
    couldNotAnswer: 'El Execution Copilot no pudo contestar',
    couldNotAnswerPrefix: message => `No pude contestar esto: ${message}`,
    openButton: day => `Pregúntale a GhostTown · Día ${day}`,
    asideLabel: 'Execution Copilot de GhostTown',
    kicker: day => `Execution Copilot · Día ${day}`,
    experiment: label => `Experimento: ${label}`,
    laneLabel: (lane, fallback) => LANE_ES[lane]?.label ?? fallback,
    close: 'Cerrar',
    commercialProof: 'Prueba de venta:',
    laneProof: (lane, fallback) => LANE_ES[lane]?.proof ?? fallback,
    currentExperiment: 'Experimento actual',
    strategyRoom: 'Sala de estrategia',
    currentExperimentHint: 'Los consejos respetan el experimento en curso, el camino que tomaste en el último chequeo y lo que no se puede cambiar todavía.',
    strategyRoomHint: 'Explora ideas más amplias sin cambiar el experimento en curso.',
    reviewPrompt: day => `Revisa los resultados que anoté para el Día ${day}. Dime qué pasó, qué significan las pruebas, qué debo hacer ahora y qué lección, si hay alguna, vale la pena recordar.`,
    reviewButton: 'Revisar los resultados que anoté hoy',
    orAsk: 'O pregunta sobre lo que estás haciendo ahora:',
    you: 'Tú',
    thinking: 'Leyendo el Blueprint, el paquete de hoy, tus pruebas, el estado del chequeo y la investigación que aplica…',
    recommended: 'Próximo paso recomendado',
    guardrails: 'Límites del experimento',
    route: 'Camino:',
    mayChange: 'Puedes cambiar:',
    nothingYet: 'nada todavía',
    keepFixed: 'No cambies:',
    notApplicable: 'no aplica',
    critic: 'Revisión de tus pruebas',
    recordNext: 'Anota ahora',
    learned: 'Lo que GhostTown aprendió',
    saved: 'Guardado en el historial de aprendizaje de tu Sprint.',
    cacheHit: ' Esta respuesta viene de una guardada antes con las mismas pruebas.',
    sources: 'Fuentes de la web usadas',
    askLabel: 'Pregúntale a GhostTown',
    placeholder: 'Pega la respuesta de un cliente, pregunta qué hacer o explora ideas…',
    footnote: 'La IA aconseja. Las pruebas, lo completado y los cambios de camino siguen reglas fijas.',
    ask: 'Preguntar'
  }
};

export default function LaunchBlueprintCopilotV21({
  orderId,
  dayNumber,
  lane,
  locale = 'en',
}: {
  orderId: string;
  dayNumber: number;
  lane: BusinessModelExecutionLane;
  locale?: Locale;
}) {
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExecutionCopilotMode>('current_experiment');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latest, setLatest] = useState<CopilotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const profile = useMemo(() => executionLaneProfile(lane), [lane]);

  const ask = async (value = question, phase: ExecutionCoachPhase = 'chat') => {
    const prompt = value.trim();
    if (!prompt || loading) return;
    const prior = messages.slice(-6);
    setMessages(current => [...current, { role: 'user', content: prompt }]);
    setQuestion('');
    setLoading(true);
    setLatest(null);
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/copilot`), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, dayNumber, mode, phase, history: prior })
      });
      const body = await response.json<CopilotResponse>();
      if (!response.ok || !body.answer) throw new Error(body.error || copy.failed(response.status));
      setMessages(current => [...current, { role: 'assistant', content: body.answer! }]);
      setLatest(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.couldNotAnswer;
      setMessages(current => [...current, { role: 'assistant', content: copy.couldNotAnswerPrefix(message) }]);
      setLatest({ error: message });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-50 rounded-full bg-[#101A17] px-5 py-3 font-black text-white shadow-xl ring-1 ring-white/15 sm:bottom-6 sm:right-6">{copy.openButton(dayNumber)}</button>;
  }

  return (
    <aside aria-label={copy.asideLabel} className="fixed inset-x-3 bottom-3 z-50 max-h-[82vh] overflow-hidden rounded-2xl border border-black/10 bg-[#F6F3ED] shadow-2xl sm:left-auto sm:right-5 sm:w-[30rem]">
      <div className="border-b border-white/10 bg-[#101A17] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-gold">{copy.kicker(dayNumber)}</p><h2 className="mt-1 text-lg font-black">{copy.experiment(copy.laneLabel(lane, profile.label))}</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-black">{copy.close}</button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/70">{copy.commercialProof} {copy.laneProof(lane, profile.firstCommercialProof)}</p>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
          <button type="button" onClick={() => setMode('current_experiment')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'current_experiment' ? 'bg-ghost-rust text-white' : 'text-gray-600'}`}>{copy.currentExperiment}</button>
          <button type="button" onClick={() => setMode('strategy_room')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'strategy_room' ? 'bg-ghost-rust text-white' : 'text-gray-600'}`}>{copy.strategyRoom}</button>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500">{mode === 'current_experiment' ? copy.currentExperimentHint : copy.strategyRoomHint}</p>

        {messages.length === 0 && <div className="mt-4 space-y-2">
          <button type="button" onClick={() => void ask(copy.reviewPrompt(dayNumber), 'review')} className="block w-full rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-3 text-left text-sm font-black text-ghost-rust hover:border-ghost-rust">{copy.reviewButton}</button>
          <p className="pt-2 text-sm font-black">{copy.orAsk}</p>
          {copy.quickPrompts.map(item => <button key={item} type="button" onClick={() => void ask(item)} className="block w-full rounded-xl border border-black/10 bg-white p-3 text-left text-sm font-bold hover:border-ghost-rust">{item}</button>)}
        </div>}

        <div className="mt-4 space-y-3">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-xl p-3 text-sm leading-6 ${message.role === 'user' ? 'ml-8 bg-[#fff7f2]' : 'mr-4 border border-black/10 bg-white'}`}><p className="mb-1 text-[11px] font-black uppercase tracking-[0.1em] text-gray-500">{message.role === 'user' ? copy.you : 'GhostTown'}</p><p className="whitespace-pre-wrap">{message.content}</p></div>)}
          {loading && <div aria-live="polite" className="mr-4 rounded-xl border border-black/10 bg-white p-3 text-sm text-gray-500">{copy.thinking}</div>}
        </div>

        {latest?.recommendedAction && <section className="mt-4 rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">{copy.recommended}</p><p className="mt-2 text-sm font-bold">{latest.recommendedAction}</p></section>}
        {latest?.guardrails && mode === 'current_experiment' && <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{copy.guardrails}</p><p className="mt-2 text-sm"><strong>{copy.route}</strong> {(latest.guardrails.route || 'continue').replace(/_/g, ' ')}</p>{latest.guardrails.mayChange?.length ? <p className="mt-1 text-sm"><strong>{copy.mayChange}</strong> {latest.guardrails.mayChange.join(', ')}</p> : <p className="mt-1 text-sm"><strong>{copy.mayChange}</strong> {copy.nothingYet}</p>}<p className="mt-1 text-sm"><strong>{copy.keepFixed}</strong> {latest.guardrails.mustKeep?.join(', ') || copy.notApplicable}</p></section>}
        {latest?.critic && <section className={`mt-3 rounded-xl border p-4 ${latest.critic.overreachDetected ? 'border-amber-300 bg-amber-50' : 'border-black/10 bg-white'}`}><p className="text-xs font-black uppercase tracking-[0.12em]">{copy.critic}</p><p className="mt-2 text-sm">{latest.critic.challenge}</p>{latest.critic.saferRecommendation && <p className="mt-2 text-sm font-bold">{latest.critic.saferRecommendation}</p>}</section>}
        {latest?.evidenceToRecord?.length ? <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{copy.recordNext}</p><ul className="mt-2 space-y-1 text-sm">{latest.evidenceToRecord.map(item => <li key={item}>• {item}</li>)}</ul></section> : null}
        {latest?.learningCandidates?.length ? <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{copy.learned}</p><ul className="mt-2 space-y-2 text-sm">{latest.learningCandidates.map((item, index) => <li key={`${item.knowledgeClass}-${index}`}><strong>{item.knowledgeClass.replace(/_/g, ' ')}:</strong> {item.lesson}</li>)}</ul></section> : null}
        {latest?.memory?.saved ? <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><strong>{copy.saved}</strong>{latest.cache?.hit ? copy.cacheHit : ''}</section> : null}
        {latest?.groundedWebSources?.length ? <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{copy.sources}</p><ul className="mt-2 space-y-2 text-sm">{latest.groundedWebSources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="font-bold text-ghost-rust underline">{source.title}</a></li>)}</ul></section> : null}
      </div>

      <div className="border-t border-black/10 bg-white p-3">
        <label className="sr-only" htmlFor="execution-copilot-question">{copy.askLabel}</label>
        <textarea id="execution-copilot-question" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(); } }} className="min-h-20 w-full rounded-xl border border-gray-300 p-3 text-sm" placeholder={copy.placeholder} />
        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-[11px] leading-4 text-gray-500">{copy.footnote}</p><button type="button" disabled={loading || !question.trim()} onClick={() => void ask()} className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white disabled:opacity-50">{copy.ask}</button></div>
      </div>
    </aside>
  );
}
