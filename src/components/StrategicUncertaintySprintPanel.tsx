import { useEffect, useState } from 'react';
import { apiUrl, authHeaders } from '../lib/api';
import type { StrategicUncertaintyLink, StrategicUncertaintySprint } from '../types/paidTest';
import type { Locale } from '../lib/locale';

const COPY: Record<Locale, {
  loadFailed: string;
  answerAll: string;
  saveFailed: string;
  back: string;
  loading: string;
  kicker: string;
  heading: string;
  intro: string;
  whyStopped: string;
  question: (n: number) => string;
  link: (link: StrategicUncertaintyLink) => string;
  usefulProof: string;
  placeholder: string;
  saving: string;
  submit: string;
  footnote: string;
}> = {
  en: {
    loadFailed: 'Your clarification questions could not be loaded.',
    answerAll: 'Answer every question before GhostTown tries the 30-Day Sprint again.',
    saveFailed: 'Your answers could not be saved.',
    back: '← Back',
    loading: 'Loading your questions…',
    kicker: '3-day clarity Sprint',
    heading: 'Before I build your 30 days, I need a few answers.',
    intro: 'GhostTown found a gap in the business chain. Answer these questions first. Your $97 Sprint stays active; GhostTown will try the full plan again after you answer.',
    whyStopped: 'Why GhostTown stopped',
    question: n => `Question ${n}`,
    link: link => link.replace(/_/g, ' '),
    usefulProof: 'Useful proof:',
    placeholder: 'Type the concrete answer here.',
    saving: 'Saving answers…',
    submit: 'Save answers and rebuild my Sprint',
    footnote: 'The full 30-Day Sprint unlocks only if the Strategic Coherence Gate passes after these answers are included.'
  },
  es: {
    loadFailed: 'No pudimos cargar tus preguntas para aclarar.',
    answerAll: 'Contesta todas las preguntas antes de que GhostTown vuelva a intentar el Sprint de 30 días.',
    saveFailed: 'No pudimos guardar tus respuestas.',
    back: '← Volver',
    loading: 'Cargando tus preguntas…',
    kicker: 'Sprint de claridad de 3 días',
    heading: 'Antes de armar tus 30 días, necesito unas respuestas.',
    intro: 'GhostTown encontró un hueco en la cadena de tu negocio. Contesta estas preguntas primero. Tu Sprint de $97 sigue activo; GhostTown volverá a intentar el plan completo cuando contestes.',
    whyStopped: 'Por qué GhostTown se detuvo',
    question: n => `Pregunta ${n}`,
    link: link => ({
      customer: 'cliente',
      problem: 'problema',
      buyer_payer: 'quién compra y quién paga',
      current_alternative: 'lo que usan hoy',
      test: 'prueba',
      commitment: 'compromiso',
      fulfillment: 'entrega',
      access_path: 'cómo llegar a ellos'
    } satisfies Record<StrategicUncertaintyLink, string>)[link] ?? link.replace(/_/g, ' '),
    usefulProof: 'Prueba que ayuda:',
    placeholder: 'Escribe aquí tu respuesta concreta.',
    saving: 'Guardando respuestas…',
    submit: 'Guardar respuestas y rehacer mi Sprint',
    footnote: 'El Sprint completo de 30 días se abre solo si pasa la revisión de coherencia estratégica (Strategic Coherence Gate) con estas respuestas incluidas.'
  }
};

interface Props {
  orderId: string;
  onBack: () => void;
  onSubmitted: () => void;
  locale?: Locale;
}

export default function StrategicUncertaintySprintPanel({ orderId, onBack, onSubmitted, locale = 'en' }: Props) {
  const copy = COPY[locale];
  const [sprint, setSprint] = useState<StrategicUncertaintySprint | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/uncertainty`), { headers: authHeaders() })
      .then(async response => {
        const body = await response.json() as { sprint?: StrategicUncertaintySprint; error?: string };
        if (!response.ok) throw new Error(body.error || copy.loadFailed);
        if (!cancelled && body.sprint) {
          setSprint(body.sprint);
          setAnswers(Object.fromEntries(body.sprint.questions.map(question => [question.questionId, question.answer || ''])));
        }
      })
      .catch(caught => !cancelled && setError(caught instanceof Error ? caught.message : copy.loadFailed));
    return () => { cancelled = true; };
  }, [orderId, copy.loadFailed]);

  const submit = async () => {
    if (!sprint) return;
    const missing = sprint.questions.find(question => !answers[question.questionId]?.trim());
    if (missing) {
      setError(copy.answerAll);
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
      if (!response.ok) throw new Error(body.error || copy.saveFailed);
      onSubmitted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!sprint) return <div className="mx-auto max-w-3xl p-8"><button onClick={onBack} className="font-black text-ghost-rust">{copy.back}</button><p className="mt-6">{error || copy.loading}</p></div>;

  return <main className="mx-auto max-w-3xl px-4 py-10">
    <button onClick={onBack} className="font-black text-ghost-rust">{copy.back}</button>
    <section className="mt-5 rounded-2xl bg-ghost-ink p-7 text-white">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ghost-gold">{copy.kicker}</p>
      <h1 className="mt-2 text-3xl font-black">{copy.heading}</h1>
      <p className="mt-3 text-white/80">{copy.intro}</p>
    </section>
    <section className="mt-5 rounded-xl border border-black/10 bg-white p-6">
      <p className="text-sm font-black">{copy.whyStopped}</p>
      <p className="mt-2 text-sm text-gray-700">{sprint.chainSummary}</p>
    </section>
    <div className="mt-5 space-y-4">
      {sprint.questions.map((question, index) => <label key={question.questionId} className="block rounded-xl border border-black/10 bg-white p-5">
        <span className="text-xs font-black uppercase text-ghost-rust">{copy.question(index + 1)} · {copy.link(question.link)}</span>
        <span className="mt-2 block text-lg font-black">{question.question}</span>
        <span className="mt-2 block text-sm text-gray-600">{question.whyItMatters}</span>
        <span className="mt-2 block text-xs font-bold text-gray-500">{copy.usefulProof} {question.requiredEvidence}</span>
        <textarea value={answers[question.questionId] || ''} onChange={event => setAnswers(current => ({ ...current, [question.questionId]: event.target.value }))} className="mt-4 min-h-28 w-full rounded-lg border-2 border-gray-400 p-3" placeholder={copy.placeholder} />
      </label>)}
    </div>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <button onClick={() => void submit()} disabled={busy} className="mt-6 w-full rounded-xl bg-ghost-rust px-6 py-4 text-lg font-black text-white disabled:opacity-50">{busy ? copy.saving : copy.submit}</button>
    <p className="mt-3 text-center text-xs text-gray-500">{copy.footnote}</p>
  </main>;
}
