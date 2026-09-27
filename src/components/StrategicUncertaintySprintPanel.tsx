import { useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { StrategicUncertaintySprint } from '../types/paidTest';

interface Props {
  orderId: string;
  onBack: () => void;
  onSubmitted: () => void;
}

export default function StrategicUncertaintySprintPanel({ orderId, onBack, onSubmitted }: Props) {
  const [sprint, setSprint] = useState<StrategicUncertaintySprint | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/uncertainty`), { headers: authHeaders() })
      .then(async response => {
        const body = await response.json() as { sprint?: StrategicUncertaintySprint; error?: string };
        if (!response.ok) throw new Error(body.error || 'Your clarification questions could not be loaded.');
        if (!cancelled && body.sprint) {
          setSprint(body.sprint);
          setAnswers(Object.fromEntries(body.sprint.questions.map(question => [question.questionId, question.answer || ''])));
        }
      })
      .catch(caught => !cancelled && setError(caught instanceof Error ? caught.message : 'Your clarification questions could not be loaded.'));
    return () => { cancelled = true; };
  }, [orderId]);

  const submit = async () => {
    if (!sprint) return;
    const missing = sprint.questions.find(question => !answers[question.questionId]?.trim());
    if (missing) {
      setError('Answer every question before GhostTown tries the 30-Day Sprint again.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/uncertainty`), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: sprint.questions.map(question => ({ questionId: question.questionId, answer: answers[question.questionId].trim() })) })
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Your answers could not be saved.');
      onSubmitted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your answers could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (!sprint) return <div className="mx-auto max-w-3xl p-8"><button onClick={onBack} className="font-black text-ghost-rust">← Back</button><p className="mt-6">{error || 'Loading your questions…'}</p></div>;

  return <main className="mx-auto max-w-3xl px-4 py-10">
    <button onClick={onBack} className="font-black text-ghost-rust">← Back</button>
    <section className="mt-5 rounded-2xl bg-ghost-ink p-7 text-white">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-gold">3-day clarity Sprint</p>
      <h1 className="mt-2 text-3xl font-black">Before I build your 30 days, I need a few answers.</h1>
      <p className="mt-3 text-white/80">GhostTown found a gap in the business chain. Answer these questions first. Your $97 Sprint stays active; GhostTown will try the full plan again after you answer.</p>
    </section>
    <section className="mt-5 rounded-xl border border-black/10 bg-white p-6">
      <p className="text-sm font-black">Why GhostTown stopped</p>
      <p className="mt-2 text-sm text-gray-700">{sprint.chainSummary}</p>
    </section>
    <div className="mt-5 space-y-4">
      {sprint.questions.map((question, index) => <label key={question.questionId} className="block rounded-xl border border-black/10 bg-white p-5">
        <span className="text-xs font-black uppercase text-ghost-rust">Question {index + 1} · {question.link.replace(/_/g, ' ')}</span>
        <span className="mt-2 block text-lg font-black">{question.question}</span>
        <span className="mt-2 block text-sm text-gray-600">{question.whyItMatters}</span>
        <span className="mt-2 block text-xs font-bold text-gray-500">Useful proof: {question.requiredEvidence}</span>
        <textarea value={answers[question.questionId] || ''} onChange={event => setAnswers(current => ({ ...current, [question.questionId]: event.target.value }))} className="mt-4 min-h-28 w-full rounded-lg border-2 border-gray-400 p-3" placeholder="Type the concrete answer here." />
      </label>)}
    </div>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <button onClick={() => void submit()} disabled={busy} className="mt-6 w-full rounded-xl bg-ghost-rust px-6 py-4 text-lg font-black text-white disabled:opacity-50">{busy ? 'Saving answers…' : 'Save answers and rebuild my Sprint'}</button>
    <p className="mt-3 text-center text-xs text-gray-500">The full 30-Day Sprint unlocks only if the Strategic Coherence Gate passes after these answers are included.</p>
  </main>;
}
