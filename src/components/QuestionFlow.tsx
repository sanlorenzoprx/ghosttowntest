import { useEffect, useRef, useState } from 'react';
import { EvaluationAnswers, EvaluationResult, IdeaIntake } from '../types/lit';
import { litQuestions } from '../lib/litQuestions';
import QuestionCard from './QuestionCard';
import ProgressBar from './ProgressBar';
import { localizeAssessmentQuestion } from '../lib/agentQuestionLocalization';
import type { Locale } from '../lib/locale';

type FlowCopy = { verdictFailed: string; genericError: string; working: string; steps: string[]; saved: string; back: string; autosaved: string };

const FLOW_COPY: Record<Locale, FlowCopy> = {
  en: {
    verdictFailed: 'Failed to generate verdict',
    genericError: 'An error occurred. Please try again.',
    working: 'Prospecting for the truth',
    steps: ['Analyzing leverage…', 'Scoring LIT…', 'Checking Ghost Town risk…'],
    saved: 'Your progress is saved. Deterministic scoring remains available if AI is unavailable.',
    back: '← Back',
    autosaved: 'Saved automatically'
  },
  es: {
    verdictFailed: 'No pudimos crear tu veredicto',
    genericError: 'Algo falló. Inténtalo otra vez.',
    working: 'Buscando la verdad',
    steps: ['Analizando tu ventaja…', 'Calculando LIT…', 'Revisando el riesgo de pueblo fantasma…'],
    saved: 'Tu progreso está guardado. Si la IA no está disponible, igual calculamos tu puntuación con reglas fijas.',
    back: '← Atrás',
    autosaved: 'Se guarda solo'
  }
};
import {
  clearEvaluationDraft,
  incrementTestsUsed,
  saveEvaluationDraft,
  type EvaluationDraft
} from '../lib/storage';
import { apiUrl, authHeaders } from '../lib/api';
import { linkCommercialVerdict, recordCommercialEvent } from '../lib/commercialAttribution';

interface Props {
  idea: IdeaIntake;
  onResult: (result: EvaluationResult) => void;
  initialDraft?: EvaluationDraft | null;
  onDraftChange: (draft: EvaluationDraft | null) => void;
  onAllowanceRequired: () => void;
  autoSubmitCompleteDraft?: boolean;
  onAutoSubmitConsumed?: () => void;
  locale?: Locale;
}

export default function QuestionFlow({
  idea,
  onResult,
  initialDraft,
  onDraftChange,
  onAllowanceRequired,
  autoSubmitCompleteDraft = false,
  onAutoSubmitConsumed,
  locale = 'en'
}: Props) {
  const t = FLOW_COPY[locale];
  const canResumeDraft = initialDraft?.idea.ideaName === idea.ideaName;
  const [currentIndex, setCurrentIndex] = useState(() => canResumeDraft
    ? Math.min(Math.max(initialDraft.currentIndex, 0), litQuestions.length - 1)
    : 0);
  const [answers, setAnswers] = useState<EvaluationAnswers>(() => canResumeDraft ? initialDraft.answers : {});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitStarted = useRef(false);

  const current = litQuestions[currentIndex];
  const isLast = currentIndex === litQuestions.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

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
      setCurrentIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      setCurrentIndex(previousIndex);
      persistDraft(answers, previousIndex);
      setError(null);
    }
  };

  const handleSubmit = async (finalAnswers: EvaluationAnswers) => {
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    void recordCommercialEvent('verdict_started', { content: idea.ideaName });

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
        if (response.status === 402 && body.error === 'No tests remaining') {
          setLoading(false);
          onAllowanceRequired();
          return;
        }
        throw new Error(body.error || t.verdictFailed);
      }

      const result = await response.json<EvaluationResult>();
      linkCommercialVerdict(result.resultId);
      void recordCommercialEvent('verdict_completed', { verdictId: result.resultId, content: idea.ideaName });
      if (!localStorage.getItem('lit_user_token_v1')) incrementTestsUsed();
      clearEvaluationDraft();
      onDraftChange(null);
      onResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.genericError);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoSubmitCompleteDraft || autoSubmitStarted.current || loading) return;
    const complete = litQuestions.every(question => answers[question.id] !== undefined);
    if (!complete) return;
    autoSubmitStarted.current = true;
    onAutoSubmitConsumed?.();
    void handleSubmit(answers);
  }, [autoSubmitCompleteDraft, answers, loading, onAutoSubmitConsumed]);

  return (
    <div className="mx-auto min-h-[calc(100dvh-72px)] max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
      <ProgressBar currentIndex={currentIndex} locale={locale} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && (
        <QuestionCard
          question={localizeAssessmentQuestion(current, locale)}
          locale={locale}
          selectedValue={answers[current.id]}
          onAnswer={handleAnswer}
        />
      )}

      {loading && (
        <div className="ghost-surface rounded-sm border border-ghost-ink px-6 py-14 text-center text-white shadow-lantern">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ghost-gold border-t-transparent animate-spin" />
          <p className="font-display text-3xl font-bold">{t.working}</p>
          <ol className="mx-auto mt-7 max-w-sm space-y-3 text-left">
            {t.steps.map((step, index) => (
              <li key={step} className={`flex items-center gap-3 rounded border px-4 py-3 text-sm transition ${index <= loadingStep ? 'border-ghost-gold/50 bg-white/10 text-white' : 'border-white/10 text-white/40'}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${index <= loadingStep ? 'bg-ghost-gold text-ghost-ink' : 'border border-white/30'}`}>{index < loadingStep ? '✓' : index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-white/60">{t.saved}</p>
        </div>
      )}

      {!loading && (
        <div className="mt-4 flex min-h-11 items-center justify-between gap-4 px-1">
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
            >
              {t.back}
            </button>
          ) : <span />}
          <span className="text-xs font-medium text-gray-500">{t.autosaved}</span>
        </div>
      )}
    </div>
  );
}
