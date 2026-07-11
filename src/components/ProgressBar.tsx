import { evaluationStages, getEvaluationStageState } from '../lib/evaluationStages';

export default function ProgressBar({ currentIndex }: { currentIndex: number }) {
  const state = getEvaluationStageState(currentIndex);

  return (
    <div className="mb-6 sm:mb-8" aria-label={`Stage ${state.stageNumber} of ${state.totalStages}: ${state.stage.label}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-ghost-rust">
            Claim depth {state.stageNumber} of {state.totalStages}
          </span>
          <h2 className="mt-1 text-lg font-bold text-gray-950 sm:text-xl">{state.stage.label}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {state.currentStageQuestion} of {state.stageQuestionCount} in this stage
          </p>
        </div>
        <span className="text-sm font-bold text-gray-500">{state.overallPercentage}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ghost-rust to-ghost-gold transition-all duration-300"
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
              {stage.shortLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
