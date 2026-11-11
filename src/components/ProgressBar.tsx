import { evaluationStages, getEvaluationStageState } from '../lib/evaluationStages';
import type { Locale } from '../lib/locale';

type ProgressCopy = {
  aria: (n: number, total: number, label: string) => string;
  depth: (n: number, total: number) => string;
  inStage: (n: number, total: number) => string;
  stages: Record<string, { label: string; shortLabel: string }>;
};

const COPY: Record<Locale, ProgressCopy> = {
  en: {
    aria: (n, total, label) => `Stage ${n} of ${total}: ${label}`,
    depth: (n, total) => `Claim depth ${n} of ${total}`,
    inStage: (n, total) => `${n} of ${total} in this stage`,
    stages: {}
  },
  es: {
    aria: (n, total, label) => `Etapa ${n} de ${total}: ${label}`,
    depth: (n, total) => `Etapa ${n} de ${total}`,
    inStage: (n, total) => `${n} de ${total} en esta etapa`,
    stages: {
      demand: { label: 'Demanda', shortLabel: 'Demanda' },
      proof: { label: 'Pasión o pruebas', shortLabel: 'Pruebas' },
      lit: { label: 'Puntuación LIT', shortLabel: 'LIT' },
      dna: { label: 'ADN del negocio', shortLabel: 'ADN' },
      walls: { label: 'Muros altos', shortLabel: 'Muros' }
    }
  }
};

export default function ProgressBar({ currentIndex, locale = 'en' }: { currentIndex: number; locale?: Locale }) {
  const state = getEvaluationStageState(currentIndex);
  const t = COPY[locale];
  const stageLabel = t.stages[state.stage.id]?.label ?? state.stage.label;

  return (
    <div className="mb-6 sm:mb-8" aria-label={t.aria(state.stageNumber, state.totalStages, stageLabel)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ghost-rust">
            {t.depth(state.stageNumber, state.totalStages)}
          </span>
          <h2 className="mt-1 text-lg font-bold text-gray-950 sm:text-xl">{stageLabel}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {t.inStage(state.currentStageQuestion, state.stageQuestionCount)}
          </p>
        </div>
        <span className="text-sm font-bold text-gray-500">{state.overallPercentage}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
            className="h-full rounded-full bg-ghost-forest transition-all duration-300"
          style={{ width: `${state.overallPercentage}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2" aria-hidden="true">
        {evaluationStages.map((stage, index) => (
          <div key={stage.id} className="text-center">
            <div className={`h-1.5 rounded-full ${
              index < state.stageIndex
                ? 'bg-green-500'
                : index === state.stageIndex
                  ? 'bg-ghost-rust'
                  : 'bg-gray-200'
            }`} />
            <span className={`mt-1.5 block truncate text-[10px] font-bold sm:text-xs ${
              index === state.stageIndex ? 'text-ghost-rust' : 'text-gray-400'
            }`}>
              {t.stages[stage.id]?.shortLabel ?? stage.shortLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
