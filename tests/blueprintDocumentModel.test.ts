import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { composeBlueprintDocumentModel, BLUEPRINT_DOCUMENT_PRIORITY_IDS, validateBlueprintDocumentModel } from '../src/api/blueprintDocumentModel';
import { renderBlueprintDocumentHtml } from '../src/api/blueprintDocumentHtml';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const order = { orderId: 'q3-doc-fixture', email: 'owner@example.com', verdictId: 'q3-verdict', status: 'generating', artifactType: 'launch_blueprint_v2', planVersion: '2.0', intake: { verdictId: 'q3-verdict', targetBuyer: 'Independent ecommerce stores', problem: 'Checkout accessibility friction', currentWorkaround: 'Manual support', offerHypothesis: 'Checkout audit', expectedPrice: '$300-$500' }, createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T00:00:00.000Z' } as PaidTestOrder;
const verdict = { resultId: 'q3-verdict', generatedAt: order.createdAt, idea: { ideaName: 'Checkout Audit', description: 'Accessibility audit', targetUser: 'Independent ecommerce stores', painfulProblem: 'Checkout accessibility friction', currentAlternative: 'Manual support', motivation: 'Observed support burden' }, deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Generic offer', businessDnaWinStrategy: 'Narrow paid pilot', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Test demand.', recommendedNextTest: 'Ask buyers.', doNotBuildUntil: 'A buyer commits.', oneSentenceAdvice: 'Sell before building.' }, usedAI: false, cacheHit: false, answers: {} } as EvaluationResult;
function blueprint() { return upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), order, verdict); }

describe('Blueprint premium document model', () => {
  it('projects one canonical Blueprint into six ordered decision-to-adaptation sections', () => {
    const model = composeBlueprintDocumentModel(blueprint());
    expect(model.schemaVersion).toBe('ghosttown-blueprint-document-model-v1');
    expect(model.prioritySections.map(section => section.sectionId)).toEqual(BLUEPRINT_DOCUMENT_PRIORITY_IDS);
    expect(model.customerActions).toEqual(['open_blueprint', 'download_pdf']);
    expect(model.prioritySections.every(section => section.decision && section.why && section.evidence.length && section.readyToUseAssets.length && section.measurement.completionDefinition && section.adaptationRule.length)).toBe(true);
    expect(model.supportingSections.find(section => section.sectionId === 'full_30_day_plan')?.content).toHaveLength(30);
    expect(validateBlueprintDocumentModel(model)).toEqual([]);
  });

  it('is deterministic and escapes hostile customer text rather than emitting markup', () => {
    const first = composeBlueprintDocumentModel(blueprint());
    const second = composeBlueprintDocumentModel(blueprint());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    first.prioritySections[0].decision = '<script>alert(1)</script>';
    const html = renderBlueprintDocumentHtml(first);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('fails closed when a priority component, exact order, or resolved asset is missing', () => {
    const model = composeBlueprintDocumentModel(blueprint());
    model.prioritySections.reverse();
    model.prioritySections[0].readyToUseAssets[0].finishedContent = '';
    expect(validateBlueprintDocumentModel(model)).toEqual(expect.arrayContaining(['priority-section-order', `asset:${model.prioritySections[0].sectionId}`]));
  });
});
