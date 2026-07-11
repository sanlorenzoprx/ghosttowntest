import type { EvaluationQuestion } from '../types/lit';
import { litQuestions } from './litQuestions';

export interface EvaluationStage {
  id: string;
  label: string;
  shortLabel: string;
  categories: EvaluationQuestion['category'][];
}

export const evaluationStages: EvaluationStage[] = [
  { id: 'demand', label: 'Demand', shortLabel: 'Demand', categories: ['ghost_town'] },
  { id: 'proof', label: 'Passion vs Proof', shortLabel: 'Proof', categories: ['passion_graveyard'] },
  { id: 'lit', label: 'LIT Score', shortLabel: 'LIT', categories: ['leverage', 'insight', 'timing'] },
  { id: 'dna', label: 'Business DNA', shortLabel: 'DNA', categories: ['business_dna'] },
  { id: 'walls', label: 'High Walls', shortLabel: 'Walls', categories: ['high_walls'] }
];

export function getEvaluationStageState(currentIndex: number) {
  const safeIndex = Math.min(Math.max(currentIndex, 0), litQuestions.length - 1);
  const question = litQuestions[safeIndex];
  const stageIndex = Math.max(0, evaluationStages.findIndex(stage => stage.categories.includes(question.category)));
  const stage = evaluationStages[stageIndex];
  const stageQuestions = litQuestions.filter(candidate => stage.categories.includes(candidate.category));
  const currentStageQuestion = stageQuestions.findIndex(candidate => candidate.id === question.id) + 1;

  return {
    stage,
    stageIndex,
    stageNumber: stageIndex + 1,
    totalStages: evaluationStages.length,
    currentStageQuestion,
    stageQuestionCount: stageQuestions.length,
    overallPercentage: Math.round(((safeIndex + 1) / litQuestions.length) * 100)
  };
}
