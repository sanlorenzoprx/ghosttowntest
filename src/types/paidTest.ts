import type { EvaluationResult } from './lit';

export type TruthLabel = 'Verified' | 'Inferred' | 'Test';
export type PaidTestOrderStatus = 'pending' | 'paid' | 'generating' | 'ready' | 'failed' | 'refunded';

export interface PaidTestIntake {
  verdictId: string;
  targetBuyer: string;
  geography?: string;
  problem: string;
  currentWorkaround: string;
  expectedPrice?: string;
  currentStage?: string;
  competitorLinks?: string[];
  landingPageLink?: string;
  customerNotes?: string;
}

export interface PaidTestOrder {
  orderId: string;
  email: string;
  verdictId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  status: PaidTestOrderStatus;
  reportVersion: '1.0';
  intake: PaidTestIntake;
  createdAt: string;
  updatedAt: string;
}

export interface ReportClaim { label: TruthLabel; text: string; }
export interface PaidTestReport {
  reportId: string;
  orderId: string;
  reportVersion: '1.0';
  createdAt: string;
  verdict: Pick<EvaluationResult, 'resultId' | 'idea' | 'deterministicScores' | 'generatedAt'>;
  sections: Array<{ title: string; claims: ReportClaim[] }>;
  qualityGate: { passed: boolean; failures: string[] };
  generationReceipt: { sourceVerdictId: string; generatedAt: string; reportVersion: '1.0' };
}
