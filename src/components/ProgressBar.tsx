import { useEffect, useState } from 'react';
import { evaluationStages, getEvaluationStageState } from '../lib/evaluationStages';
import { litQuestions } from '../lib/litQuestions';

export default function ProgressBar({ currentIndex }: { currentIndex: number }) {
  const isSpanish = useDocumentLocale();
  const state = getEvaluationStageState(currentIndex);
  const completedQuestions = Math.min(Math.max(currentIndex, 0), litQuestions.length);
  const currentQuestion = Math.min(Math.max(currentIndex, 0), litQuestions.length - 1) + 1;
  const remainingQuestions = Math.max(litQuestions.length - completedQuestions, 0);
  const completedPercentage = Math.min(Math.max(Math.round((completedQuestions / litQuestions.length) * 100), 0), 100);
  const stageLabel = isSpanish ? spanishStageLabels[state.stage.id]?.label ?? state.stage.label : state.stage.label;
  const stageShortLabel = (stageId: string, fallback: string) => isSpanish ? spanishStageLabels[stageId]?.shortLabel ?? fallback : fallback;
  const statusLabels = isSpanish ? { complete: 'Completada', current: 'Actual', upcoming: 'Próxima' } : { complete: 'Complete', current: 'Current', upcoming: 'Upcoming' };

  return (
    <section className="mb-7 min-w-0 border-b border-border pb-6 sm:mb-10 sm:pb-8" aria-labelledby="assessment-progress-title">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-score text-xs font-bold uppercase tracking-[0.16em] text-rust">{isSpanish ? 'Etapa de evaluación' : 'Assessment stage'} {state.stageNumber} {isSpanish ? 'de' : 'of'} {state.totalStages}</p>
          <h2 id="assessment-progress-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">{stageLabel}</h2>
          <p className="mt-2 text-sm text-ink-soft">{isSpanish ? 'Pregunta' : 'Question'} {currentQuestion} {isSpanish ? 'de' : 'of'} {litQuestions.length} · {state.currentStageQuestion} {isSpanish ? 'de' : 'of'} {state.stageQuestionCount} {isSpanish ? 'en esta etapa' : 'in this stage'}</p>
        </div>
        <span className="font-score text-sm font-bold text-ink-muted sm:shrink-0">
          {completedPercentage}% {isSpanish ? 'completado' : 'complete'} · {remainingQuestions} {isSpanish ? 'restantes' : 'remaining'}
        </span>
      </div>

      <div className="mt-5" role="progressbar" aria-label={isSpanish ? 'Progreso de la evaluación' : 'Assessment progress'} aria-valuetext={`${isSpanish ? 'Pregunta' : 'Question'} ${currentQuestion} ${isSpanish ? 'de' : 'of'} ${litQuestions.length}; ${completedPercentage}% ${isSpanish ? 'completado' : 'complete'}; ${remainingQuestions} ${isSpanish ? 'restantes' : 'remaining'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completedPercentage}>
        <div className="h-2 overflow-hidden rounded-full bg-surface-stone">
          <div className="h-full rounded-full bg-rust transition-[width] duration-300" style={{ width: `${completedPercentage}%` }} />
        </div>
      </div>

      <ol className="mt-5 grid min-w-0 grid-cols-5 gap-1.5 sm:gap-2" aria-label={isSpanish ? 'Etapas de la evaluación' : 'Assessment stages'}>
        {evaluationStages.map((stage, index) => {
          const status = index < state.stageIndex ? statusLabels.complete : index === state.stageIndex ? statusLabels.current : statusLabels.upcoming;
          return (
            <li key={stage.id} className="min-w-0">
              <span className={`block h-1.5 rounded-full ${index < state.stageIndex ? 'bg-pass' : index === state.stageIndex ? 'bg-rust' : 'bg-surface-stone'}`} aria-hidden="true" />
              <span className={`mt-2 block break-words text-[0.65rem] font-bold leading-tight sm:text-xs ${index === state.stageIndex ? 'text-rust' : index < state.stageIndex ? 'text-pass' : 'text-ink-muted'}`}>
                <span className="sr-only">{status}: </span>{stageShortLabel(stage.id, stage.shortLabel)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const spanishStageLabels: Record<string, { label: string; shortLabel: string }> = {
  demand: { label: 'Demanda', shortLabel: 'Demanda' },
  proof: { label: 'Pasión frente a evidencia', shortLabel: 'Evidencia' },
  lit: { label: 'Puntuación LIT', shortLabel: 'LIT' },
  dna: { label: 'ADN del negocio', shortLabel: 'ADN' },
  walls: { label: 'Barreras altas', shortLabel: 'Barreras' }
};

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
