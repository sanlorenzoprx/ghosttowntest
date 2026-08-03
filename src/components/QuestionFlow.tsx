import { useEffect, useRef, useState } from 'react';
import { EvaluationAnswers, EvaluationResult, IdeaIntake } from '../types/lit';
import { litQuestions } from '../lib/litQuestions';
import QuestionCard from './QuestionCard';
import ProgressBar from './ProgressBar';
import {
  clearEvaluationDraft,
  incrementTestsUsed,
  saveEvaluationDraft,
  type EvaluationDraft
} from '../lib/storage';
import { apiUrl, authHeaders } from '../lib/api';

interface Props {
  idea: IdeaIntake;
  onResult: (result: EvaluationResult) => void;
  initialDraft?: EvaluationDraft | null;
  onDraftChange: (draft: EvaluationDraft | null) => void;
}

export default function QuestionFlow({ idea, onResult, initialDraft, onDraftChange }: Props) {
  const isSpanish = useDocumentLocale();
  const canResumeDraft = initialDraft?.idea.ideaName === idea.ideaName;
  const [currentIndex, setCurrentIndex] = useState(() => canResumeDraft
    ? Math.min(Math.max(initialDraft.currentIndex, 0), litQuestions.length - 1)
    : 0);
  const [answers, setAnswers] = useState<EvaluationAnswers>(() => canResumeDraft ? initialDraft.answers : {});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const shouldFocusQuestionHeading = useRef(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const current = litQuestions[currentIndex];
  const isLast = currentIndex === litQuestions.length - 1;

  useEffect(() => {
    if (!shouldFocusQuestionHeading.current) return;
    shouldFocusQuestionHeading.current = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.requestAnimationFrame(() => {
      document.getElementById(`question-${litQuestions[currentIndex].id}`)?.focus({ preventScroll: true });
    });
  }, [currentIndex]);

  useEffect(() => {
    if (!error || loading) return;
    window.requestAnimationFrame(() => errorRef.current?.focus({ preventScroll: false }));
  }, [error, loading]);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => setLoadingStep(step => Math.min(step + 1, 2)), 900);
    return () => window.clearInterval(interval);
  }, [loading]);

  const persistDraft = (nextAnswers: EvaluationAnswers, nextIndex: number) => {
    const draft = saveEvaluationDraft(idea, nextAnswers, nextIndex);
    onDraftChange(draft);
  };

  const handleAnswer = (value: number | string) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);
    setError(null);

    if (isLast) {
      persistDraft(newAnswers, currentIndex);
      void handleSubmit(newAnswers);
    } else {
      const nextIndex = currentIndex + 1;
      persistDraft(newAnswers, nextIndex);
      shouldFocusQuestionHeading.current = true;
      setCurrentIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      persistDraft(answers, previousIndex);
      shouldFocusQuestionHeading.current = true;
      setCurrentIndex(previousIndex);
      setError(null);
    }
  };

  const handleSubmit = async (finalAnswers: EvaluationAnswers) => {
    setLoading(true);
    setLoadingStep(0);
    setError(null);

    try {
      const response = await fetch(apiUrl('/api/verdict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idea,
          answers: finalAnswers,
          public_content_acknowledged: idea.publicContentAcknowledged === true,
          locale: document.documentElement.lang === 'es' ? 'es-PR' : 'en-US'
        })
      });

      if (!response.ok) {
        const body: { error?: string } = await response.json<{ error?: string }>().catch(() => ({}));
        throw new Error(body.error || (isSpanish ? 'No se pudo generar el veredicto.' : 'Failed to generate verdict'));
      }

      const result = await response.json<EvaluationResult>();
      if (!localStorage.getItem('lit_user_token_v1')) incrementTestsUsed();
      clearEvaluationDraft();
      onDraftChange(null);
      onResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isSpanish ? 'Ocurrió un error. Inténtalo de nuevo.' : 'An error occurred. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <main aria-busy={loading} className="mx-auto min-h-[calc(100dvh-72px)] min-w-0 max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-10">
      <div className="mx-auto min-w-0 max-w-2xl">
        <ProgressBar currentIndex={currentIndex} />

        {error && (
          <div ref={errorRef} className="state-shell state-shell--error mb-5" role="alert" aria-live="assertive" tabIndex={-1}>
            <p className="font-score text-xs font-bold uppercase tracking-[0.14em]">{isSpanish ? 'Evaluación no enviada' : 'Assessment not submitted'}</p>
            <p className="mt-2 break-words text-sm leading-6">{error}</p>
          </div>
        )}

        {!loading && <QuestionCard question={current} selectedValue={answers[current.id]} onAnswer={handleAnswer} />}

        {loading && (
          <section className="state-shell state-shell--loading text-center" aria-live="polite" aria-label={isSpanish ? 'Preparando tu veredicto' : 'Preparing your verdict'}>
            <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{isSpanish ? 'Preparando tu resumen de decisión' : 'Preparing your decision brief'}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">{isSpanish ? 'Buscando la verdad' : 'Prospecting for the truth'}</h1>
            <p className="mx-auto mt-3 max-w-reading text-sm leading-6 text-ink-soft">{isSpanish ? 'Tus respuestas se guardan mientras GhostTown prepara la evaluación. La puntuación determinista sigue disponible si la IA no está disponible.' : 'Your answers are saved while GhostTown prepares the assessment. Deterministic scoring remains available if AI is unavailable.'}</p>
            <ol className="mx-auto mt-7 max-w-lg space-y-3 text-left">
              {(isSpanish ? ['Analizando las ventajas…', 'Calculando LIT…', 'Revisando el riesgo de Ghost Town…'] : ['Analyzing leverage…', 'Scoring LIT…', 'Checking Ghost Town risk…']).map((step, index) => (
                <li key={step} className={`flex min-w-0 items-center gap-3 rounded-field border px-4 py-3 text-sm font-semibold ${index <= loadingStep ? 'border-rust/30 bg-evidence-soft text-ink' : 'border-border bg-surface-raised text-ink-muted'}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-score text-xs ${index < loadingStep ? 'bg-pass text-white' : index === loadingStep ? 'bg-rust text-rust-foreground' : 'bg-surface-stone text-ink-muted'}`} aria-hidden="true">{index < loadingStep ? '✓' : index + 1}</span>
                  <span className="min-w-0 break-words">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {!loading && (
          <div className="mt-5 flex min-h-11 flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            {currentIndex > 0 ? <button type="button" onClick={handleBack} className="btn-secondary w-full sm:w-auto"><span className="mr-2" aria-hidden="true">←</span>{isSpanish ? 'Atrás' : 'Back'}</button> : <span className="hidden sm:block" aria-hidden="true" />}
            <p className="text-center text-sm text-ink-muted sm:text-right">{isLast ? (isSpanish ? 'Tu respuesta final prepara el veredicto.' : 'Your final answer prepares the verdict.') : (isSpanish ? 'Elige una respuesta para continuar. El progreso se guarda automáticamente.' : 'Choose an answer to continue. Progress saves automatically.')}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function useDocumentLocale(): boolean {
  const [isSpanish, setIsSpanish] = useState(() => typeof document !== 'undefined' && document.documentElement.lang === 'es');

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsSpanish(root.lang === 'es');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);

  return isSpanish;
}
