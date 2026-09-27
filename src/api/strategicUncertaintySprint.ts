import type {
  StrategicUncertaintyLink,
  StrategicUncertaintySprint
} from '../types/paidTest';
import type { VertexStrategicCoherenceGate } from './launchBlueprintVertexPipeline';

const QUESTIONS: Record<StrategicUncertaintyLink, string> = {
  customer: 'Who exactly has this problem right now? Describe one narrow kind of person or business.',
  problem: 'What happened the last time this problem occurred? Describe the real event, not the general idea.',
  buyer_payer: 'Who can say yes and pay for the first test? If that is different from the user, explain who pays and why.',
  current_alternative: 'What does this buyer or user do today when the problem happens?',
  test: 'What is the smallest safe test that proves the product’s core value without turning it into a different business or service?',
  commitment: 'What real action would show commitment—payment, deposit, booking, signup, introduction, or another observable step?',
  fulfillment: 'What can you personally deliver safely within the Sprint’s time, cost, and capability limits?',
  access_path: 'Where can you directly reach at least three people who match the buyer or payer for this test?'
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function createStrategicUncertaintySprint(
  orderId: string,
  sourceVerdictId: string,
  gate: VertexStrategicCoherenceGate,
  createdAt = new Date().toISOString()
): StrategicUncertaintySprint {
  const failedLinks = gate.links
    .filter(item => item.status === 'unresolved' || item.status === 'contradictory')
    .map(item => item.link);
  const blockerLinks = gate.blockers.map(item => item.link);
  const unresolvedLinks = unique([...failedLinks, ...blockerLinks]) as StrategicUncertaintyLink[];
  const questions = unresolvedLinks.slice(0, 5).map((link, index) => {
    const linkResult = gate.links.find(item => item.link === link);
    const blocker = gate.blockers.find(item => item.link === link);
    return {
      questionId: `uncertainty-${index + 1}-${link}`,
      link,
      question: QUESTIONS[link],
      whyItMatters: blocker?.message || linkResult?.reason || 'GhostTown needs this answer before it can build a coherent 30-day plan.',
      requiredEvidence: blocker?.requiredEvidence || 'Give a concrete recent example or observable fact that resolves this question.'
    };
  });

  if (!questions.length) {
    throw new Error('Strategic uncertainty Sprint requires at least one unresolved coherence link');
  }

  return {
    schemaVersion: 'strategic-uncertainty-sprint-v1',
    orderId,
    sourceVerdictId,
    createdAt,
    horizonDays: 3,
    status: 'open',
    chainSummary: gate.chainSummary,
    unresolvedLinks,
    blockers: gate.blockers.map(item => ({ ...item })),
    questions,
    unlockCondition: 'Answer every question with a concrete fact or recent example. GhostTown will rerun the Strategic Coherence Gate. The 30-Day Sprint unlocks only when all eight links make sense as one chain.'
  };
}
