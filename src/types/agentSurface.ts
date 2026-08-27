import type { EvaluationAnswers, EvaluationResult, IdeaIntake } from './lit';

export type AgentProtocol = 'api' | 'mcp' | 'search' | 'webmcp' | 'a2a';

export interface AgentClientContext {
  client?: string;
  protocol?: AgentProtocol;
}

export interface AgentVerdictInput {
  idea?: string | (Partial<IdeaIntake> & Record<string, unknown>);
  customer?: string;
  problem?: string;
  alternative?: string;
  motivation?: string;
  geography?: string;
  context?: string;
  answers?: EvaluationAnswers;
  locale?: string;
  public_content_acknowledged?: boolean;
  agent?: AgentClientContext;
}

export interface AgentInputQuestion {
  field: string;
  prompt: string;
  helper?: string;
  options?: Array<{ label: string; value: number }>;
}

export interface AgentPublicVerdictProjection {
  verdict_id: string;
  verdict: string;
  summary: string;
  key_assumptions: string[];
  primary_risks: string[];
  fastest_test: string;
  next_actions: string[];
}

export interface AgentOfferProjection {
  offer_id: string;
  name: string;
  price_usd: number;
  currency: string;
  url: string;
  requires_user_action: true;
}

export interface AgentCompleteVerdictResponse extends AgentPublicVerdictProjection {
  status: 'complete';
  handoff_id: string;
  result_url: string;
  offer: AgentOfferProjection;
}

export interface AgentNeedsInputResponse {
  status: 'needs_input';
  missing: string[];
  questions: AgentInputQuestion[];
  continue_with: '/api/v1/free-verdict';
}

export interface AgentHandoffRecord {
  schemaVersion: 'ghosttown-agent-handoff-v1';
  handoffId: string;
  verdictId: string;
  publicVerdict: AgentPublicVerdictProjection;
  agentClient?: string;
  protocol: AgentProtocol;
  tool: string;
  createdAt: string;
  expiresAt: string;
}

export type ClaimableAgentResult = EvaluationResult;
