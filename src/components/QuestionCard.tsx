import { EvaluationQuestion } from '../types/lit';

interface Props {
  question: EvaluationQuestion;
  onAnswer: (value: number | string) => void;
  selectedValue?: number | string;
}

export default function QuestionCard({ question, onAnswer, selectedValue }: Props) {
  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:mb-8 sm:p-8">
      <h3 className="mb-3 text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">{question.question}</h3>
      
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
            className={`group min-h-16 w-full touch-manipulation rounded-xl border p-4 text-left transition active:scale-[0.99] ${
              selectedValue === option.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="font-semibold leading-snug text-gray-900 group-hover:text-blue-700">{option.label}</div>
            {option.helper && (
              <div className="text-sm text-gray-500 mt-1 group-hover:text-blue-500">{option.helper}</div>
            )}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-gray-500 sm:mt-8">
        There are no wrong answers. We're evaluating your idea objectively.
      </p>
    </div>
  );
}
