import { useMemo, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import { executionLaneProfile, type ExecutionCopilotMode } from '../lib/blueprintExecutionIntelligence';
import type { BusinessModelExecutionLane } from '../types/launchBlueprintV21';

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
}

const QUICK_PROMPTS = [
  'What exactly should I do today?',
  'What evidence do I still need to record?',
  'Explain today’s success and failure thresholds.',
  'Does my evidence contradict the plan?'
];

export default function LaunchBlueprintCopilotV21({
  orderId,
  dayNumber,
  lane,
}: {
  orderId: string;
  dayNumber: number;
  lane: BusinessModelExecutionLane;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExecutionCopilotMode>('current_experiment');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latest, setLatest] = useState<CopilotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const profile = useMemo(() => executionLaneProfile(lane), [lane]);

  const ask = async (value = question) => {
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
        body: JSON.stringify({ question: prompt, dayNumber, mode, history: prior })
      });
      const body = await response.json<CopilotResponse>();
      if (!response.ok || !body.answer) throw new Error(body.error || `Execution Copilot failed (${response.status})`);
      setMessages(current => [...current, { role: 'assistant', content: body.answer! }]);
      setLatest(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution Copilot could not answer';
      setMessages(current => [...current, { role: 'assistant', content: `I could not answer this request: ${message}` }]);
      setLatest({ error: message });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-50 rounded-full bg-[#101A17] px-5 py-3 font-black text-white shadow-xl ring-1 ring-white/15 sm:bottom-6 sm:right-6">Ask GhostTown · Day {dayNumber}</button>;
  }

  return (
    <aside aria-label="GhostTown Execution Copilot" className="fixed inset-x-3 bottom-3 z-50 max-h-[82vh] overflow-hidden rounded-2xl border border-black/10 bg-[#F6F3ED] shadow-2xl sm:left-auto sm:right-5 sm:w-[30rem]">
      <div className="border-b border-white/10 bg-[#101A17] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ghost-gold">Execution Copilot · Day {dayNumber}</p><h2 className="mt-1 text-lg font-black">{profile.label} experiment</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-black">Close</button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/70">Commercial proof: {profile.firstCommercialProof}</p>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1">
          <button type="button" onClick={() => setMode('current_experiment')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'current_experiment' ? 'bg-ghost-rust text-white' : 'text-gray-600'}`}>Current Experiment</button>
          <button type="button" onClick={() => setMode('strategy_room')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'strategy_room' ? 'bg-ghost-rust text-white' : 'text-gray-600'}`}>Strategy Room</button>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500">{mode === 'current_experiment' ? 'Advice must respect the live experiment, checkpoint branch, and frozen variables.' : 'Explore broader strategy without changing the live experiment.'}</p>

        {messages.length === 0 && <div className="mt-4 space-y-2"><p className="text-sm font-black">Ask from the work you are doing now:</p>{QUICK_PROMPTS.map(item => <button key={item} type="button" onClick={() => void ask(item)} className="block w-full rounded-xl border border-black/10 bg-white p-3 text-left text-sm font-bold hover:border-ghost-rust">{item}</button>)}</div>}

        <div className="mt-4 space-y-3">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-xl p-3 text-sm leading-6 ${message.role === 'user' ? 'ml-8 bg-[#fff7f2]' : 'mr-4 border border-black/10 bg-white'}`}><p className="mb-1 text-[11px] font-black uppercase tracking-[0.1em] text-gray-500">{message.role === 'user' ? 'You' : 'GhostTown'}</p><p className="whitespace-pre-wrap">{message.content}</p></div>)}
          {loading && <div aria-live="polite" className="mr-4 rounded-xl border border-black/10 bg-white p-3 text-sm text-gray-500">Reading the Blueprint, today’s packet, evidence, checkpoint state, and relevant research…</div>}
        </div>

        {latest?.recommendedAction && <section className="mt-4 rounded-xl border border-ghost-rust/30 bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-ghost-rust">Recommended bounded action</p><p className="mt-2 text-sm font-bold">{latest.recommendedAction}</p></section>}
        {latest?.guardrails && mode === 'current_experiment' && <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Experiment guardrails</p><p className="mt-2 text-sm"><strong>Route:</strong> {(latest.guardrails.route || 'continue').replace(/_/g, ' ')}</p>{latest.guardrails.mayChange?.length ? <p className="mt-1 text-sm"><strong>May change:</strong> {latest.guardrails.mayChange.join(', ')}</p> : <p className="mt-1 text-sm"><strong>May change:</strong> nothing yet</p>}<p className="mt-1 text-sm"><strong>Keep fixed:</strong> {latest.guardrails.mustKeep?.join(', ') || 'n/a'}</p></section>}
        {latest?.critic && <section className={`mt-3 rounded-xl border p-4 ${latest.critic.overreachDetected ? 'border-amber-300 bg-amber-50' : 'border-black/10 bg-white'}`}><p className="text-xs font-black uppercase tracking-[0.12em]">Evidence critic</p><p className="mt-2 text-sm">{latest.critic.challenge}</p>{latest.critic.saferRecommendation && <p className="mt-2 text-sm font-bold">{latest.critic.saferRecommendation}</p>}</section>}
        {latest?.evidenceToRecord?.length ? <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Record next</p><ul className="mt-2 space-y-1 text-sm">{latest.evidenceToRecord.map(item => <li key={item}>• {item}</li>)}</ul></section> : null}
        {latest?.groundedWebSources?.length ? <section className="mt-3 rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Grounded web sources</p><ul className="mt-2 space-y-2 text-sm">{latest.groundedWebSources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="font-bold text-ghost-rust underline">{source.title}</a></li>)}</ul></section> : null}
      </div>

      <div className="border-t border-black/10 bg-white p-3">
        <label className="sr-only" htmlFor="execution-copilot-question">Ask GhostTown</label>
        <textarea id="execution-copilot-question" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(); } }} className="min-h-20 w-full rounded-xl border border-gray-300 p-3 text-sm" placeholder="Paste a customer response, ask what to do, or explore strategy…" />
        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-[11px] leading-4 text-gray-500">AI advises. Evidence, completion and branch permissions remain deterministic.</p><button type="button" disabled={loading || !question.trim()} onClick={() => void ask()} className="rounded-lg bg-ghost-rust px-4 py-2 text-sm font-black text-white disabled:opacity-50">Ask</button></div>
      </div>
    </aside>
  );
}
