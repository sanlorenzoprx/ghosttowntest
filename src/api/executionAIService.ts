import type { Env } from './env';
import { generateAIJson, type GenerativeAITask, type GenerativeAIResponseSchema, type GenerativeAIReceipt } from './generativeAIService';
import type { ExecutionCapability, ExecutionCopilotMode, ExecutionRagContext } from '../lib/blueprintExecutionIntelligence';

export interface ExecutionCopilotModelOutput {
  answer: string;
  evidenceAssessment: string;
  contradictionDetected: boolean;
  recommendedAction: string;
  evidenceToRecord: string[];
  assumptions: string[];
}

export interface ExecutionCriticOutput {
  challenge: string;
  overreachDetected: boolean;
  saferRecommendation: string;
}

const COPILOT_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    evidenceAssessment: { type: 'STRING' },
    contradictionDetected: { type: 'BOOLEAN' },
    recommendedAction: { type: 'STRING' },
    evidenceToRecord: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 10 },
    assumptions: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 8 }
  },
  required: ['answer', 'evidenceAssessment', 'contradictionDetected', 'recommendedAction', 'evidenceToRecord', 'assumptions']
};

const CRITIC_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    challenge: { type: 'STRING' },
    overreachDetected: { type: 'BOOLEAN' },
    saferRecommendation: { type: 'STRING' }
  },
  required: ['challenge', 'overreachDetected', 'saferRecommendation']
};

export function generativeTaskForExecutionCapability(capability: ExecutionCapability): GenerativeAITask {
  // Capability names are stable product contracts. Provider/model configuration remains replaceable.
  // The current Vertex mapping deliberately reuses the proven cheap/strong/research slots rather
  // than adding provider sprawl before real customer usage justifies it.
  if (capability === 'fast_assistant') return 'candidate_selection';
  if (capability === 'grounded_research') return 'grounded_research';
  return 'blueprint';
}

function systemInstruction(mode: ExecutionCopilotMode): string {
  const scope = mode === 'strategy_room'
    ? 'You are in STRATEGY ROOM. You may explore alternatives, but you must explicitly say that exploration does not change the live experiment.'
    : 'You are in CURRENT EXPERIMENT mode. The formal branch controls which variables may change. Never recommend changing a frozen variable as if it were an approved live change.';
  return [
    'You are GhostTown Execution Copilot, an evidence-led business execution assistant.',
    scope,
    'The supplied JSON context is authoritative for the current Blueprint, day, assets, recorded evidence, checkpoint branch, and research.',
    'Recorded behavior outranks your opinion. Never invent a customer, quote, response, payment, metric, source, or proof.',
    'Distinguish RECORDED EVIDENCE from INFERENCE and from STRATEGY EXPLORATION.',
    'Do not claim a day is complete; deterministic software owns completion.',
    'When evidence contradicts the plan, name the contradiction and respect mayChange/mustKeep from the formal branch.',
    'Prefer one bounded next experiment over broad business advice.',
    'When useful, reference the prepared asset by its exact title.',
    'Return only the requested JSON structure.'
  ].join('\n');
}

function promptFor(context: ExecutionRagContext, question: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  return JSON.stringify({
    instruction: 'Answer the founder question using the retrieved execution context. Keep the answer practical and specific to today\'s experiment.',
    question,
    recentConversation: history.slice(-6),
    context
  });
}

export async function runExecutionCopilot(
  env: Env,
  capability: ExecutionCapability,
  mode: ExecutionCopilotMode,
  context: ExecutionRagContext,
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ output: ExecutionCopilotModelOutput; receipt: GenerativeAIReceipt }> {
  const task = generativeTaskForExecutionCapability(capability);
  const generated = await generateAIJson<ExecutionCopilotModelOutput>(env, {
    task,
    prompt: promptFor(context, question, history),
    systemInstruction: systemInstruction(mode),
    responseSchema: COPILOT_SCHEMA,
    temperature: capability === 'fast_assistant' ? 0.15 : 0.05,
    maxOutputTokens: 1800,
    timeoutMs: 35_000,
    googleSearch: capability === 'grounded_research'
  });
  return { output: generated.data, receipt: generated.result.receipt };
}

export async function runExecutionCritic(
  env: Env,
  context: ExecutionRagContext,
  question: string,
  primary: ExecutionCopilotModelOutput
): Promise<{ output: ExecutionCriticOutput; receipt: GenerativeAIReceipt }> {
  const generated = await generateAIJson<ExecutionCriticOutput>(env, {
    task: generativeTaskForExecutionCapability('critic'),
    prompt: JSON.stringify({ question, primaryAnswer: primary, context }),
    systemInstruction: [
      'You are the skeptical GhostTown evidence critic.',
      'Challenge only unsupported inference, premature variable changes, weak-evidence overreach, or contradictions with the supplied formal branch.',
      'Do not invent new evidence or a new strategy.',
      'If the primary recommendation is disciplined and supported, say so briefly.',
      'Return only the requested JSON structure.'
    ].join('\n'),
    responseSchema: CRITIC_SCHEMA,
    temperature: 0,
    maxOutputTokens: 700,
    timeoutMs: 30_000
  });
  return { output: generated.data, receipt: generated.result.receipt };
}
