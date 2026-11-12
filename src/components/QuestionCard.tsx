import { EvaluationQuestion } from '../types/lit';
import type { Locale } from '../lib/locale';

const COPY: Record<Locale, { noWrongAnswers: string }> = {
  en: { noWrongAnswers: "There are no wrong answers. We're evaluating your idea objectively." },
  es: { noWrongAnswers: 'No hay respuestas malas. Evaluamos tu idea de forma objetiva.' }
};

interface Props {
  question: EvaluationQuestion;
  onAnswer: (value: number | string) => void;
  selectedValue?: number | string;
  locale?: Locale;
}

export default function QuestionCard({ question, onAnswer, selectedValue, locale = 'en' }: Props) {
  return (
    <div key={question.id} className="day-pop mb-4 rounded-3xl border border-white bg-white p-5 shadow-pop sm:mb-8 sm:p-8">
      <h3 className="mb-3 font-display text-2xl font-semibold leading-tight tracking-[-0.01em] text-gray-950 sm:text-[2rem]">{question.question}</h3>
      
      {question.helper && (
        <p className="text-gray-600 mb-6 leading-relaxed">{question.helper}</p>
      )}

      <div className="space-y-2.5 sm:space-y-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onAnswer(option.value)}
            aria-pressed={selectedValue === option.value}
            className={`group flex min-h-16 w-full touch-manipulation items-center gap-4 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 active:scale-[0.99] ${
              selectedValue === option.value
                ? 'border-blue-600 bg-blue-50 shadow-soft'
                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-soft'
            }`}
          >
            <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition ${
              selectedValue === option.value ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent group-hover:border-blue-400'
            }`}>✓</span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug text-gray-900 group-hover:text-blue-700">{option.label}</span>
              {option.helper && (
                <span className="mt-1 block text-sm text-gray-500 group-hover:text-blue-600">{option.helper}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-gray-500 sm:mt-8">
        {COPY[locale].noWrongAnswers}
      </p>
    </div>
  );
}
