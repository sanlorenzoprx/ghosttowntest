import { describe, expect, it } from 'vitest';
import { createPaidTestReport, qualityGate } from '../src/api/paidTest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';

const verdict = {
  resultId: 'verdict_1', generatedAt: '2026-07-11T00:00:00.000Z',
  idea: { ideaName: 'Release QA', description: 'A narrow QA offer.', targetUser: 'Small agencies', painfulProblem: 'Missed defects', currentAlternative: 'Manual checklists', motivation: 'Firsthand pain' },
  deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Scope creep', businessDnaWinStrategy: 'Narrow offer', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Validate it', recommendedNextTest: 'Interview buyers', doNotBuildUntil: 'A buyer commits', oneSentenceAdvice: 'Talk to buyers' }, usedAI: false, cacheHit: false, answers: {}
} as EvaluationResult;

const order: PaidTestOrder = { orderId: 'gtt_1', email: 'buyer@example.com', verdictId: 'verdict_1', status: 'generating', reportVersion: '1.0', intake: { verdictId: 'verdict_1', targetBuyer: 'Agency owners', problem: 'Missed release defects', currentWorkaround: 'Manual checklists', expectedPrice: '$29' }, createdAt: '2026-07-11T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' };

describe('paid GhostTown Test report', () => {
  it('contains the six required modules, truth labels, and a source verdict receipt', () => {
    const report = createPaidTestReport(order, verdict);
    expect(report.qualityGate).toEqual({ passed: true, failures: [] });
    expect(report.sections.map(section => section.title)).toEqual(expect.arrayContaining(['Buyer Interview Kit', 'Alternatives and Workarounds', 'Landing-Page Test Copy', 'Offer and Price Hypothesis', 'Seven-Day Validation Plan', 'Evidence Scoreboard and Limitations']));
    expect(report.sections.flatMap(section => section.claims).map(item => item.label)).toEqual(expect.arrayContaining(['Verified', 'Inferred', 'Test']));
    expect(report.generationReceipt.sourceVerdictId).toBe('verdict_1');
  });

  it('rejects a report that omits a required module', () => {
    const report = createPaidTestReport(order, verdict);
    report.sections = report.sections.filter(section => section.title !== 'Seven-Day Validation Plan');
    expect(qualityGate(report)).toMatchObject({ passed: false, failures: ['Missing Seven-Day Validation Plan'] });
  });
});
