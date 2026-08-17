import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBlueprintAssetFiles } from '../src/api/blueprintAssets';
import { upgradeGhostTownLaunchBlueprintToV21, validateGhostTownLaunchBlueprintV21 } from '../src/api/launchBlueprintGeneratorV21';
import { synchronizeDailyExecutionPackets, validateDailyExecutionPackets } from '../src/api/launchBlueprintDailyExecution';
import type { EvaluationResult } from '../src/types/lit';
import type { PaidTestOrder } from '../src/types/paidTest';
import { launchBlueprintFixture } from './fixtures/launchBlueprint';

const verdict = {
  resultId: 'q2-specific-paid-pilot', generatedAt: '2026-08-17T22:00:00.000Z',
  idea: { ideaName: 'Checkout Accessibility Audit', description: 'A fixed-scope accessibility audit for ecommerce checkout paths.', targetUser: 'Independent ecommerce teams with active checkout traffic', painfulProblem: 'Checkout accessibility friction creates support work and abandoned purchase risk.', currentAlternative: 'Sporadic QA and generic scans.', motivation: 'Customer support and conversion risk.' },
  deterministicScores: { ghostTownScore: 3, ghostTownRisk: 'medium', leverageScore: 3, insightScore: 3, timingScore: 3, litScore: 3, litBand: 'unclear', highWallsScore: 2, highWallsBand: 'weak', businessDnaType: 'service', businessDnaTrap: 'Broad monitoring too early', businessDnaWinStrategy: 'Fixed-scope paid pilot', finalVerdict: 'test_first', verdictHeadline: 'Test checkout audit commitment first', verdictExplanation: 'Recent checkout friction and willingness to pay require evidence.', recommendedNextTest: 'Ask 10 independent ecommerce teams for a paid audit conversation.', doNotBuildUntil: 'Do not build broad monitoring, integrations, or automation.', oneSentenceAdvice: 'Test a fixed-scope audit before productizing.' },
  verdictDecisionV2: {
    decision: 'WORTH_TESTING', predictionTarget: 'Whether 10 independent ecommerce teams will commit to a fixed-scope checkout accessibility audit.', confidence: { level: 'MODERATE', rationale: 'The target, problem, offer, and paid pilot are specific but need commitment evidence.' },
    customer: { initialCustomer: '10 independent ecommerce stores with active checkout traffic', whyThisCustomer: 'They can observe checkout support friction directly.', excludedBroadAudiences: ['Generic ecommerce audience'] },
    problem: { painfulProblem: 'Checkout accessibility friction/support', existingAlternative: 'Sporadic QA and generic scans', urgencyEvidence: ['Support work after checkout issues'] },
    offerHypothesis: { offer: 'Fixed-scope checkout accessibility audit with prioritized issue list and 30-minute review', commitmentRequested: 'Paid pilot at $300-$500', priceOrCommitmentRange: '$300-$500' },
    reasonsFor: ['Specific accessible checkout path'], reasonsAgainst: ['No paid commitment yet'], largestUncertainty: { assumption: 'Teams will pay for a bounded audit', whyItMatters: 'Revenue validates the offer.' },
    cheapestFalsification: { test: 'Send 10 qualified discovery messages and make transparent asks.', target: '10 qualified stores', successThreshold: 'PASS: >=3 qualified commitments or conversations within 5 business days.', failureThreshold: 'FAIL: 0/10.', maximumTime: '5 business days', maximumCash: '$0' },
    firstAction: { action: 'Send the exact first discovery message to 10 qualified independent ecommerce stores.', preparedAssetRequired: true }, whatWouldChangeTheVerdict: ['Three paid pilot commitments'], evidenceLabels: [{ statement: 'Checkout support friction is supplied context.', truthLabel: 'INFERRED' }]
  }, usedAI: false, cacheHit: false, answers: {}
} as EvaluationResult;

const order = { orderId: 'q2-order', email: 'owner@example.test', verdictId: verdict.resultId, status: 'generating', artifactType: 'launch_blueprint_v2', planVersion: '2.0', intake: { verdictId: verdict.resultId, targetBuyer: 'Independent ecommerce stores with active checkout traffic', problem: 'Checkout accessibility friction/support', currentWorkaround: 'Sporadic QA and generic scans', offerHypothesis: 'Fixed-scope checkout accessibility audit', expectedPrice: '$300-$500' }, createdAt: verdict.generatedAt, updatedAt: verdict.generatedAt } as PaidTestOrder;

function blueprint() {
  const base = launchBlueprintFixture();
  // The golden must be one coherent paid product, not a Family Game Night base
  // with an unrelated ecommerce verdict injected afterward.
  base.executiveDecision.recommendedInitialCustomer = '10 independent ecommerce stores with active checkout traffic';
  base.executiveDecision.originalIdea = verdict.idea.description;
  base.offer.offerName = 'Fixed-Scope Checkout Accessibility Audit';
  base.offer.targetCustomer = '10 independent ecommerce stores with active checkout traffic';
  base.offer.painfulProblem = 'Checkout accessibility friction/support';
  base.offer.oneSentencePromise = 'A fixed-scope checkout accessibility audit with a prioritized issue list and 30-minute review.';
  base.offer.initialTestPrice = '$300-$500';
  base.positioning.firstTargetCustomer = base.offer.targetCustomer;
  base.positioning.positioningStatement = `For ${base.offer.targetCustomer}: ${base.offer.oneSentencePromise}`;
  base.landingPageCopy.headline = 'Find checkout accessibility friction before customers report it.';
  base.landingPageCopy.offerDescription = base.offer.oneSentencePromise;
  base.launchSite.offer.offerName = base.offer.offerName;
  base.launchSite.offer.targetCustomer = base.offer.targetCustomer;
  base.launchSite.offer.headline = base.landingPageCopy.headline;
  return upgradeGhostTownLaunchBlueprintToV21(base, order, verdict);
}

describe('Q2 DailyExecutionPacket and DeliverableAsset', () => {
  it('creates 30 finished, lineage-preserving, alias-compatible customer packets', () => {
    const output = blueprint();
    expect(output.dailyExecutionContractVersion).toBe('daily-execution-packet-v1');
    expect(output.dailyCalendar).toHaveLength(30);
    expect(output.dailyCalendar.every(day => day.executionPacket?.assets.length === 1 && day.executionPacket.assets[0].finishedContent.length > 80)).toBe(true);
    expect(validateDailyExecutionPackets(output)).toEqual([]);
    expect(validateGhostTownLaunchBlueprintV21(output).passed).toBe(true);
    const day1 = output.dailyCalendar[0].executionPacket!;
    const day4 = output.dailyCalendar[3].executionPacket!;
    expect(day1.assets[0].finishedContent).toContain('Send the exact first discovery message');
    expect(day1.assets[0].finishedContent).toContain('Do not build broad monitoring, integrations, or automation');
    expect(day4.assets[0].finishedContent).toContain('Hi {{firstName}}');
    expect(day4.targets[0].targetId).toBe('target-day-04-qualified-buyers-v1');
    expect(day4.actions[0].actionId).toBe('action-day-04-send-discovery-v1');
    expect(day4.assets[0].assetId).toBe('asset-day-04-discovery-sequence-v1');
    expect(day4.successThreshold).toContain('3 qualified replies or 2 interviews');
    expect(day4.failureThreshold).toContain('Zero qualified replies');
    expect(output.foundingCustomerPilotBrief.problem).toContain('Checkout accessibility');
    expect(output.landingPageCopy.offerDescription).toContain('checkout accessibility audit');
    for (const dayNumber of [1, 4, 7, 14, 21, 30]) expect(output.dailyCalendar[dayNumber - 1].executionPacket?.assets[0].finishedContent).toBeTruthy();
    const files = buildBlueprintAssetFiles(output, new Uint8Array([37, 80, 68, 70]));
    expect(files).toHaveLength(16);
    expect(new TextDecoder().decode(files.find(file => file.name.endsWith('thirty-day-calendar.csv'))!.data)).toContain('finished_asset_content');
  });

  it('fails closed on description-only content, unresolved references, and undeclared fields', () => {
    const output = blueprint();
    const packet = output.dailyCalendar[3].executionPacket!;
    packet.assets[0].finishedContent = packet.assets[0].title;
    packet.actions[0].targetIds = ['missing-target'];
    packet.assets[0].finishedContent = 'Prepared outreach script for {{undeclared}}';
    expect(validateDailyExecutionPackets(output).join(' ')).toMatch(/unresolved action target|undeclared personalization/);
  });

  it('rebuilds packets after canonical strategy changes while retaining legacy aliases', () => {
    const output = blueprint();
    const changed = synchronizeDailyExecutionPackets({ ...output, offer: { ...output.offer, offerName: 'Narrow Checkout Audit' } }, verdict);
    expect(changed.dailyCalendar[0].executionPacket?.targets.some(target => target.name === 'Narrow Checkout Audit')).toBe(true);
    expect(changed.dailyCalendar.every(day => day.executionPacket && day.primaryObjective === day.executionPacket.objective)).toBe(true);
  });

  it('writes the acceptance golden artifact when requested', () => {
    const output = blueprint();
    const destination = process.env.ROADMAP_Q2_GOLDEN_ARTIFACT_PATH;
    if (destination) writeFileSync(destination, JSON.stringify({ schema_version: 'ghosttown-q2-daily-execution-golden-output-v1', fixture_id: 'specific-paid-pilot', days: [1, 4, 7, 14, 21, 30].map(day => ({ day, asset: output.dailyCalendar[day - 1].executionPacket?.assets[0], success_threshold: output.dailyCalendar[day - 1].executionPacket?.successThreshold, failure_threshold: output.dailyCalendar[day - 1].executionPacket?.failureThreshold })), semantic_checks: { all_30_packets: output.dailyCalendar.length === 30, q1_day1_action: output.dailyCalendar[0].executionPacket?.assets[0].finishedContent.includes('Send the exact first discovery message') === true, all_finished_assets: validateDailyExecutionPackets(output).length === 0, aliases_match: output.dailyCalendar.every(day => day.executionPacket && day.primaryObjective === day.executionPacket.objective) } }, null, 2));
    expect(output.dailyCalendar[29].executionPacket?.completionDefinition).toContain('evidence ledger');
  });
});
