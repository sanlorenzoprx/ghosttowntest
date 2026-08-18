import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { composeBlueprintDocumentModel, BLUEPRINT_DOCUMENT_PRIORITY_IDS, validateBlueprintDocumentAgainstCanonical, validateBlueprintDocumentModel } from '../src/api/blueprintDocumentModel';
import { escapeBlueprintDocumentHtml, renderBlueprintDocumentHtml } from '../src/api/blueprintDocumentHtml';
import { renderBlueprintDocumentModelPdf, renderLaunchBlueprintPdfV21WithBrowser } from '../src/api/blueprintPdfV21';
import { buildBlueprintAssetFiles } from '../src/api/blueprintAssets';
import { upgradeGhostTownLaunchBlueprintToV21 } from '../src/api/launchBlueprintGeneratorV21';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const order = { orderId: 'q3-doc-fixture', email: 'owner@example.com', verdictId: 'q3-verdict', status: 'generating', artifactType: 'launch_blueprint_v2', planVersion: '2.0', intake: { verdictId: 'q3-verdict', targetBuyer: 'Independent ecommerce stores', problem: 'Checkout accessibility friction', currentWorkaround: 'Manual support', offerHypothesis: 'Checkout audit', expectedPrice: '$300-$500' }, createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T00:00:00.000Z' } as PaidTestOrder;
const verdict = { resultId: 'q3-verdict', generatedAt: order.createdAt, idea: { ideaName: 'Checkout Audit', description: 'Accessibility audit', targetUser: 'Independent ecommerce stores', painfulProblem: 'Checkout accessibility friction', currentAlternative: 'Manual support', motivation: 'Observed support burden' }, deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Generic offer', businessDnaWinStrategy: 'Narrow paid pilot', finalVerdict: 'test_first', verdictHeadline: 'Test first', verdictExplanation: 'Test demand.', recommendedNextTest: 'Ask buyers.', doNotBuildUntil: 'A buyer commits.', oneSentenceAdvice: 'Sell before building.' }, usedAI: false, cacheHit: false, answers: {} } as EvaluationResult;
function blueprint() { return upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), order, verdict); }

describe('Blueprint premium document model', () => {
  it('projects one canonical Blueprint into six ordered decision-to-adaptation sections', () => {
    const canonical = blueprint(); const model = composeBlueprintDocumentModel(canonical);
    expect(model.schemaVersion).toBe('ghosttown-blueprint-document-model-v1');
    expect(model.prioritySections.map(section => section.sectionId)).toEqual(BLUEPRINT_DOCUMENT_PRIORITY_IDS);
    expect(model.customerActions).toEqual(['open_blueprint', 'download_pdf']);
    expect(model.prioritySections.every(section => section.decision && section.why && section.evidence.length && section.readyToUseAssets.length && section.measurement.completionDefinition && section.adaptationRule.length)).toBe(true);
    expect(model.supportingSections.find(section => section.sectionId === 'full_30_day_plan')?.content).toHaveLength(30);
    expect(validateBlueprintDocumentModel(model)).toEqual([]);
    expect(validateBlueprintDocumentAgainstCanonical(model, canonical)).toEqual([]);
    const access = model.prioritySections.find(section => section.sectionId === 'customer_access_network')!;
    expect(access.accessGroups?.map(group => group.groupId)).toEqual(['priority_five', 'reserve_five', 'partner_targets']);
    const targets = access.accessGroups!.flatMap(group => group.targets);
    expect(targets).toHaveLength(10);
    expect(targets.every(target => target.publicUrl && target.sourceRefs.length && target.researchDate && target.confidence && target.accessPath && target.risk && target.matchedAssetOrScript && target.firstAction)).toBe(true);
  });

  it('is deterministic and escapes hostile customer text rather than emitting markup', () => {
    const first = composeBlueprintDocumentModel(blueprint());
    const second = composeBlueprintDocumentModel(blueprint());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    first.prioritySections[0].decision = '<script>alert(1)</script>';
    expect(() => renderBlueprintDocumentHtml(first)).toThrow('private-or-injected');
    expect(escapeBlueprintDocumentHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('fails closed when a priority component, exact order, or resolved asset is missing', () => {
    const model = composeBlueprintDocumentModel(blueprint());
    model.prioritySections.reverse();
    model.prioritySections[0].readyToUseAssets[0].finishedContent = '';
    expect(validateBlueprintDocumentModel(model)).toEqual(expect.arrayContaining(['priority-section-order', `asset:${model.prioritySections[0].sectionId}`]));
  });

  it('rejects broad/generic, contradictory, unresolved, branchless, duplicate, and private artifacts', () => {
    const canonical = blueprint();
    const cases: Array<(model: ReturnType<typeof composeBlueprintDocumentModel>) => void> = [
      model => { model.prioritySections[1].decision = 'small businesses unlock your potential'; },
      model => { model.prioritySections[2].decision = '$1 generic offer'; },
      model => { model.prioritySections[0].evidence[0].sourceRefs = ['missing-source']; },
      model => { model.prioritySections[0].readyToUseAssets[0].finishedContent = 'Prepared asset: outreach script'; },
      model => { model.prioritySections[5].adaptationRule = []; },
      model => { model.prioritySections[1].blockIds.decision = model.prioritySections[0].blockIds.decision; },
      model => { model.prioritySections[0].decision = '-----BEGIN PRIVATE KEY-----'; }
    ];
    for (const mutate of cases) { const model = composeBlueprintDocumentModel(canonical); mutate(model); expect(validateBlueprintDocumentAgainstCanonical(model, canonical).length).toBeGreaterThan(0); }
  });

  it('keeps a legacy v2.1 record readable without injecting Q2 data into it', () => {
    const legacy = blueprint(); legacy.dailyCalendar.forEach(day => { delete day.executionPacket; });
    const before = JSON.stringify(legacy);
    const model = composeBlueprintDocumentModel(legacy);
    expect(model.prioritySections[5].readyToUseAssets[0].assetId).toContain('legacy-document');
    expect(renderBlueprintDocumentHtml(model)).toContain('Today');
    expect(JSON.stringify(legacy)).toBe(before);
  });

  it('renders generated model, semantic HTML, deterministic PDF, and injected browser output from one coherent record', async () => {
    const canonical = blueprint(); const model = composeBlueprintDocumentModel(canonical); const html = renderBlueprintDocumentHtml(model); const pdf = renderBlueprintDocumentModelPdf(model);
    const text = new TextDecoder().decode(pdf);
    for (const expected of ['48-Hour Launch Card', 'First Customer', 'First Offer', 'First Revenue Path', 'Customer Access Network', 'Today: Day 1', 'DECISION', 'READY-TO-USE ASSETS', 'ADAPTATION RULE']) expect(text).toContain(expected);
    expect(html).toContain('<table><caption>Priority Five</caption><thead>');
    expect(html).toContain('@page { size: Letter'); expect(html).toContain('font-size:9.5pt'); expect(html).toContain('print-color-adjust:exact');
    const browser = await renderLaunchBlueprintPdfV21WithBrowser(canonical, { render: async received => new TextEncoder().encode(`browser:${received}`) });
    expect(browser.mode).toBe('browser'); expect(new TextDecoder().decode(browser.bytes)).toContain('48-Hour Launch Card');
    const output = process.env.ROADMAP_Q3_GOLDEN_ARTIFACT_PATH;
    if (output) writeFileSync(output, JSON.stringify({ schema_version: 'ghosttown-q3-document-golden-output-v1', model, html, pdf_base64: Buffer.from(pdf).toString('base64'), css: html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || '', bundle_file_count: buildBlueprintAssetFiles(canonical, pdf).length, adversarial_cases: ['broad_generic', 'contradictory_offer_price', 'unresolved_source', 'description_only_asset', 'missing_branch', 'duplicate_id', 'script_injection', 'private_material', 'legacy_v21_compatibility'], canonical: { customer: canonical.offer.targetCustomer, problem: canonical.offer.painfulProblem, offer: canonical.offer.offerName, price: canonical.firstRevenuePath.firstPrice, promise: canonical.offer.oneSentencePromise, cta: canonical.launchSite.offer.callToAction, proof: canonical.foundingCustomerPilotBrief.proofBoundary } }, null, 2));
  });
});
