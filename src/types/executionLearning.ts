export type ExecutionCoachPhase = 'plan' | 'review' | 'checkpoint' | 'chat';

export type ExecutionKnowledgeClass =
  | 'human_behavior'
  | 'strategy'
  | 'tactic'
  | 'market_research';

export type ExecutionKnowledgeScope =
  | 'universal'
  | 'lane'
  | 'market'
  | 'customer_specific';

export interface ExecutionLearningCandidate {
  knowledgeClass: ExecutionKnowledgeClass;
  scope: ExecutionKnowledgeScope;
  lesson: string;
  confidence: 'low' | 'medium' | 'high';
  evidenceBasis: string;
}

export interface ExecutionCoachMemoryItem {
  dayNumber: number;
  answer: string;
  evidenceAssessment: string;
  recommendedAction: string;
  recordedAt: string;
}

export interface ExecutionReusableKnowledgeItem {
  knowledgeId: string;
  knowledgeClass: ExecutionKnowledgeClass;
  scope: Exclude<ExecutionKnowledgeScope, 'customer_specific'>;
  lesson: string;
  supportCount: number;
  contradictionCount: number;
  validUntil?: string;
  lastSupportedAt: string;
}

export interface ExecutionCoachMemoryContext {
  priorDailyAssessments: ExecutionCoachMemoryItem[];
  reusableKnowledge: ExecutionReusableKnowledgeItem[];
}
