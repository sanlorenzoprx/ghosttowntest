import { useEffect, useState } from 'react';
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
  const canResumeDraft = initialDraft?.idea.ideaName === idea.ideaName;
  const [currentIndex, setCurrentIndex] = useState(() => canResumeDraft
    ? Math.min(Math.max(initialDraft.currentIndex, 0), litQuestions.length - 1)
    : 0);
  const [answers, setAnswers] = useState<EvaluationAnswers>(() => canResumeDraft ? initialDraft.answers : {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = litQuestions[currentIndex];
  const isLast = currentIndex === litQuestions.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

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
    setError(null);

    try {
      const response = await fetch(apiUrl('/api/verdict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ idea, answers: finalAnswers })
      });

      if (!response.ok) {
        const body: { error?: string } = await response.json<{ error?: string }>().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate verdict');
      }

      const result = await response.json<EvaluationResult>();
      if (!localStorage.getItem('lit_user_token_v1')) incrementTestsUsed();
      clearEvaluationDraft();
      onDraftChange(null);
      onResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100dvh-72px)] max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
      <ProgressBar currentIndex={currentIndex} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && (
        <QuestionCard
          question={current}
          selectedValue={answers[current.id]}
          onAnswer={handleAnswer}
        />
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-lg font-bold text-gray-900">Generating your verdict...</p>
          <p className="mt-2 text-sm text-gray-500">The deterministic fallback keeps this reliable if AI is unavailable.</p>
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
              ← Back
            </button>
          ) : <span />}
          <span className="text-xs font-medium text-gray-500">Saved automatically</span>
        </div>
      )}
    </div>
  );
}
