import type { EvaluationResult } from '../types/lit';
import type {
  BlueprintDailyActionV21,
  BranchRule,
  DailyExecutionPacket,
  DeliverableAsset,
  ExecutionTarget,
  GhostTownLaunchBlueprintV21
} from '../types/launchBlueprintV21';
import {
  BLUEPRINT_DAILY_BUYER_COPY,
  BLUEPRINT_DAILY_FOUNDER_COPY,
  type DailyFounderCopy
} from '../lib/blueprintFixedCopy';

/**
 * Q2 is a logical factory only: it derives executable customer assets from the
 * canonical Blueprint and never adds a provider, storage surface, or workflow.
 */
// English asset names are machine keys: asset IDs and lineage are slugs of
// them in every language. Display titles come from the founder-language copy.
const assetNames = BLUEPRINT_DAILY_FOUNDER_COPY.en.assetNames;

function founderCopy(blueprint: GhostTownLaunchBlueprintV21): DailyFounderCopy {
  return BLUEPRINT_DAILY_FOUNDER_COPY[blueprint.languages?.founder ?? 'en'];
}

function id(day: number, suffix: string) { return `${suffix}-day-${String(day).padStart(2, '0')}-v1`; }
function minutes(day: number) { return [1, 4, 7, 14, 21, 29, 30].includes(day) ? 90 : [5, 11, 16, 25, 28].includes(day) ? 75 : 45; }
function first<T>(items: T[]) { return items[0]; }

function sourceDecision(blueprint: GhostTownLaunchBlueprintV21, verdict?: EvaluationResult) {
  const decision = verdict?.verdictDecisionV2;
  return {
    customer: blueprint.offer.targetCustomer || decision?.customer.initialCustomer || blueprint.executiveDecision.recommendedInitialCustomer,
    problem: blueprint.offer.painfulProblem || decision?.problem.painfulProblem,
    offer: blueprint.offer.oneSentencePromise || decision?.offerHypothesis.offer,
    firstAction: decision?.firstAction.action || blueprint.launchCard48Hour.exactFirstMessage,
    commitment: decision?.offerHypothesis.commitmentRequested || blueprint.firstRevenuePath.commitmentMethod,
    q1Prepared: Boolean(decision?.firstAction.preparedAssetRequired)
  };
}

function dayContent(day: number, blueprint: GhostTownLaunchBlueprintV21, verdict?: EvaluationResult) {
  const q1 = sourceDecision(blueprint, verdict);
  const channel = first(blueprint.customerAccessPack.channels);
  const source = channel?.sourceIds || [];
  const customer = q1.customer;
  const problem = q1.problem;
  const price = blueprint.firstRevenuePath.firstPrice;
  const f = founderCopy(blueprint);
  const m = BLUEPRINT_DAILY_BUYER_COPY[blueprint.languages?.buyer ?? 'en'];
  const content = f.dayContent({
    customer,
    problem,
    q1Offer: q1.offer,
    canonicalOffer: blueprint.offer.oneSentencePromise,
    commitment: q1.commitment,
    firstAction: q1.firstAction,
    price,
    offerName: blueprint.offer.offerName,
    interview: blueprint.customerInterviewGuide,
    brief: blueprint.foundingCustomerPilotBrief,
    offerGuide: blueprint.offerConversationGuide,
    landing: blueprint.landingPageCopy
  }, m);
  // Every finished asset carries the same canonical commercial context.  This
  // is deliberate: a downloaded worksheet must not lose the customer,
  // problem, offer, or price that makes the execution decision intelligible.
  const canonicalContext = f.canonicalContext({ customer, problem, offerName: blueprint.offer.offerName, promise: blueprint.offer.oneSentencePromise, price });
  const raw = content[day];
  const contentWithContext = day === 3 || day === 28
    ? `canonical_customer,canonical_problem,canonical_offer,canonical_price\n"${customer}","${problem}","${blueprint.offer.offerName} — ${blueprint.offer.oneSentencePromise}","${price}"\n${raw}`
    : `${canonicalContext}\n\n${raw}`;
  return { content: contentWithContext, sourceIds: source, channel };
}

/**
 * This is deliberately a day contract, not a calendar template.  The only
 * shared code is the serializer; each entry owns its public/internal routing,
 * evidence requirement, measurable failure, and the asset it actually builds
 * on.  That makes an accidental "30 copies of one task" detectable.
 */
const assetParents: Record<number, number[]> = {
  6: [5], 7: [3, 4, 5, 6], 8: [5], 9: [7, 8], 10: [9], 11: [9, 10],
  13: [3, 4, 5, 11], 14: [7, 10, 11, 13], 15: [9, 11, 14], 16: [9, 10, 11],
  17: [16], 18: [17], 19: [17, 18], 20: [9, 15, 19], 21: [20], 22: [21],
  23: [13, 17, 21, 22], 24: [23], 25: [20, 21], 26: [24, 25], 27: [26],
  28: [17, 21, 25, 27], 29: [23, 28], 30: [29]
};

const targetKindsByDay: Record<number, Array<'buyer' | 'offer' | 'evidence' | 'launch_site' | 'fulfillment' | 'existing_contact'>> = {
  1: ['buyer', 'offer', 'evidence'], 2: ['buyer', 'evidence'], 3: ['buyer', 'evidence'], 4: ['buyer', 'evidence'], 5: ['buyer', 'evidence'],
  6: ['buyer', 'evidence'], 7: ['evidence'], 8: ['buyer', 'evidence'], 9: ['buyer', 'offer'], 10: ['buyer', 'offer', 'evidence'],
  11: ['buyer', 'offer', 'evidence'], 12: ['launch_site', 'offer', 'evidence'], 13: ['evidence'], 14: ['evidence'], 15: ['buyer', 'offer', 'fulfillment'],
  16: ['buyer', 'offer', 'evidence'], 17: ['buyer', 'evidence'], 18: ['buyer', 'evidence'], 19: ['buyer', 'evidence'], 20: ['buyer', 'offer', 'fulfillment'],
  21: ['fulfillment', 'evidence'], 22: ['existing_contact', 'evidence'], 23: ['evidence'], 24: ['evidence'], 25: ['fulfillment', 'evidence'],
  26: ['buyer', 'evidence'], 27: ['buyer', 'evidence'], 28: ['evidence'], 29: ['evidence'], 30: ['evidence']
};

function actionContracts(blueprint: GhostTownLaunchBlueprintV21, verdict?: EvaluationResult) {
  const q1 = sourceDecision(blueprint, verdict);
  const q1Batch = `${verdict?.verdictDecisionV2?.cheapestFalsification.target || ''} ${q1.firstAction}`.match(/\b([1-9]\d?)\b/);
  const batchSize = q1Batch ? Number(q1Batch[1]) : Math.max(1, blueprint.firstRevenuePath.minimumQualifiedAsks || 10);
  return founderCopy(blueprint).actionContracts({
    customer: q1.customer,
    problem: q1.problem,
    offer: blueprint.offer.offerName,
    price: blueprint.firstRevenuePath.firstPrice,
    requested: q1.commitment,
    batchSize
  });
}

function branches(f: DailyFounderCopy, day: number, threshold: string, failure: string): BranchRule[] {
  const checkpoint = day === 7 || day === 14 || day === 21 || day === 30;
  const rule: BranchRule = checkpoint
    ? { branchId: id(day, 'branch'), condition: f.branch.checkpointCondition(failure), action: f.branch.checkpointAction(threshold), route: day === 30 ? 'pause' : 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: [...f.branch.checkpointEvidence] }
    : { branchId: id(day, 'branch'), condition: f.branch.condition(failure), action: f.branch.action(Math.min(30, day + 1)), route: 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: [...f.branch.evidence] };
  return [rule];
}

export function synchronizeDailyExecutionPackets(
  blueprint: GhostTownLaunchBlueprintV21,
  verdict?: EvaluationResult
): GhostTownLaunchBlueprintV21 {
  const decision = sourceDecision(blueprint, verdict);
  const q1Batch = `${verdict?.verdictDecisionV2?.cheapestFalsification.target || ''} ${decision.firstAction}`.match(/\b([1-9]\d?)\b/);
  const batchSize = q1Batch ? Number(q1Batch[1]) : Math.max(1, blueprint.firstRevenuePath.minimumQualifiedAsks || 10);
  const f = founderCopy(blueprint);
  const t = f.targets;
  const offerTarget: ExecutionTarget = { targetId: 'target-canonical-offer-v1', kind: 'offer', name: blueprint.offer.offerName, identityStatus: 'canonical_internal', selectionOrQualificationRule: t.offerRule, minimumCount: 1, excluded: [...t.offerExcluded], sourceIds: [] };
  const buyerTarget: ExecutionTarget = { targetId: 'target-qualified-buyer-batch-v1', kind: 'qualified_buyer_batch', name: blueprint.executiveDecision.recommendedInitialCustomer, identityStatus: 'founder_must_select', selectionOrQualificationRule: t.buyerRule, minimumCount: 10, excluded: [...t.buyerExcluded], sourceIds: [] };
  const evidenceTarget: ExecutionTarget = { targetId: 'target-evidence-ledger-v1', kind: 'evidence_set', name: t.evidenceName, identityStatus: 'canonical_internal', selectionOrQualificationRule: t.evidenceRule, minimumCount: 1, excluded: [...t.evidenceExcluded], sourceIds: [] };
  const launchSiteTarget: ExecutionTarget = { targetId: 'target-launch-site-v1', kind: 'launch_site', name: blueprint.launchSite.offer.headline || blueprint.landingPageCopy.headline, identityStatus: 'canonical_internal', selectionOrQualificationRule: t.launchSiteRule, minimumCount: 1, excluded: [...t.launchSiteExcluded], sourceIds: [] };
  const fulfillmentTarget: ExecutionTarget = { targetId: 'target-fulfillment-run-v1', kind: 'fulfillment_run', name: t.fulfillmentName(blueprint.offer.offerName), identityStatus: 'canonical_internal', selectionOrQualificationRule: t.fulfillmentRule, minimumCount: 1, excluded: [...t.fulfillmentExcluded], sourceIds: [] };
  const existingContactTarget: ExecutionTarget = { targetId: 'target-delivered-buyer-v1', kind: 'existing_contact', name: t.deliveredName, identityStatus: 'founder_supplied', selectionOrQualificationRule: t.deliveredRule, minimumCount: 1, excluded: [...t.deliveredExcluded], sourceIds: [] };
  const objectives = f.objectives({ customer: decision.customer, problem: decision.problem, batchSize, offerName: blueprint.offer.offerName });
  const thresholds = f.thresholds({ successThreshold: blueprint.firstRevenuePath.successThreshold, batchSize });
  const contracts = actionContracts(blueprint, verdict);
  const nextDays = blueprint.dailyCalendar.map((legacy, index) => {
    const day = index + 1;
    const { content } = dayContent(day, blueprint, verdict);
    const assetSlug = assetNames[index].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const assetId = day === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(day).padStart(2, '0')}-${assetSlug}-v1`;
    const dayBuyerTarget = { ...buyerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-qualified-buyers-v1` };
    const dayOfferTarget = { ...offerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-offer-v1` };
    const dayEvidenceTarget = { ...evidenceTarget, targetId: `target-day-${String(day).padStart(2, '0')}-evidence-v1` };
    const dayLaunchSiteTarget = { ...launchSiteTarget, targetId: `target-day-${String(day).padStart(2, '0')}-launch-site-v1` };
    const dayFulfillmentTarget = { ...fulfillmentTarget, targetId: `target-day-${String(day).padStart(2, '0')}-fulfillment-v1` };
    const dayExistingContactTarget = { ...existingContactTarget, targetId: `target-day-${String(day).padStart(2, '0')}-delivered-buyer-v1` };
    const targetFor = { buyer: dayBuyerTarget, offer: dayOfferTarget, evidence: dayEvidenceTarget, launch_site: dayLaunchSiteTarget, fulfillment: dayFulfillmentTarget, existing_contact: dayExistingContactTarget };
    const targets: ExecutionTarget[] = targetKindsByDay[day].map(kind => targetFor[kind]);
    const targetIds = targets.map(target => target.targetId);
    const [instruction, quantity, evidenceExpected] = contracts[index];
    const fields = [...content.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]);
    const asset: DeliverableAsset = {
      assetId, dayNumber: day, type: 'finished_execution_asset', title: f.assetNames[index], finishedContent: content,
      contentType: day === 3 || day === 28 ? 'text/csv' : 'text/markdown',
      personalizationFields: [...new Set(fields)].map(name => ({ name, description: f.personalizationDescription(name), required: true })),
       usageInstructions: f.usageInstructions,
       targetIds, capabilities: { copyReady: true, editable: true, downloadable: true, openable: true },
       evidenceExpected: [...evidenceExpected], version: '1.0.0',
       lineage: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, sourceIds: [], sourceAssetIds: (assetParents[day] || []).map(parent => parent === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(parent).padStart(2, '0')}-${assetNames[parent - 1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-v1`) }
    };
    const packet: DailyExecutionPacket = {
      dayNumber: day, title: f.titles[index], objective: objectives[index],
      whyThisDayExists: f.rationale(blueprint.offer.targetCustomer, blueprint.offer.painfulProblem, `${blueprint.offer.offerName}: ${blueprint.offer.oneSentencePromise}`, blueprint.firstRevenuePath.firstPrice, objectives[index]),
      targets,
      actions: [{ actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1, instruction: f.initialActionInstruction(asset.title), quantity: f.initialQuantity(day === 4 || day === 10 || day === 16 || day === 27), targetIds, assetIds: [assetId], evidenceExpected: asset.evidenceExpected }],
      assets: [asset], expectedOutcome: f.expectedOutcome(asset.title),
      successThreshold: thresholds[index],
      failureThreshold: day === 1 ? f.failureDay1 : day === 4 ? f.failureDay4 : f.failureDefault(day),
       evidenceToCapture: asset.evidenceExpected, branchRules: branches(f, day, thresholds[index], day === 1 ? f.failureDay1 : day === 4 ? f.failureDay4 : f.branchFailureDefault(thresholds[index])), estimatedMinutes: minutes(day),
      completionDefinition: f.initialCompletion(day, asset.title)
    };
    // Action quantities and evidence must describe the actual work of this day,
    // rather than inherit a calendar-wide template.
    packet.actions = [{
      actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1,
      instruction, quantity, targetIds, assetIds: [assetId], evidenceExpected: [...evidenceExpected]
    }];
    packet.evidenceToCapture = [...evidenceExpected];
    packet.completionDefinition = f.completion(day, quantity, asset.title);
    return {
      ...legacy, dayNumber: day, title: packet.title, primaryObjective: packet.objective, whyItMatters: packet.whyThisDayExists,
      estimatedMinutes: packet.estimatedMinutes, requiredActions: packet.actions.map(action => action.instruction), preparedAssets: packet.assets.map(item => item.title), expectedDeliverable: packet.expectedOutcome,
      successMeasurement: packet.successThreshold, evidenceToRecord: packet.evidenceToCapture, ifThenBranches: packet.branchRules.map(rule => ({ condition: rule.condition, action: rule.action })), executionPacket: packet
    } as BlueprintDailyActionV21;
  });
  return { ...blueprint, dailyExecutionContractVersion: 'daily-execution-packet-v1', dailyCalendar: nextDays };
}

export function validateDailyExecutionPackets(blueprint: GhostTownLaunchBlueprintV21): string[] {
  const failures: string[] = [];
  if (blueprint.dailyExecutionContractVersion !== 'daily-execution-packet-v1') failures.push('Daily Execution Packet contract version is missing.');
  if (blueprint.dailyCalendar.length !== 30) failures.push('Daily Execution Packet requires exactly 30 days.');
  const ids = new Set<string>();
  const assetIds = new Set<string>();
  const knownSourceIds = new Set(blueprint.sources.map(source => source.sourceId));
  const knownChannelIds = new Set(blueprint.customerAccessPack.channels.map(channel => channel.channelId));
  for (const [index, day] of blueprint.dailyCalendar.entries()) {
    const packet = day.executionPacket;
    if (!packet || packet.dayNumber !== index + 1) { failures.push(`Day ${index + 1} is missing its canonical Daily Execution Packet.`); continue; }
    if (!packet.objective || !packet.whyThisDayExists || !packet.expectedOutcome || !packet.completionDefinition || !packet.successThreshold || !packet.failureThreshold || !packet.evidenceToCapture.length) failures.push(`Day ${packet.dayNumber} has an incomplete measurable execution contract.`);
    if (!packet.assets.length || packet.assets.some(asset => !asset.finishedContent.trim() || asset.finishedContent.trim() === asset.title.trim() || /^(prepared (asset|script|template)|create (a |an )?(asset|script|template))\.?$/i.test(asset.finishedContent.trim()))) failures.push(`Day ${packet.dayNumber} lacks a finished usable asset.`);
    if (!packet.branchRules.length || !packet.actions.length || !packet.targets.length) failures.push(`Day ${packet.dayNumber} lacks targets, actions, or branch rules.`);
    const targetIds = new Set(packet.targets.map(target => target.targetId));
    for (const target of packet.targets) {
      if (!target.targetId || !target.selectionOrQualificationRule || !target.minimumCount || target.sourceIds.some(sourceId => !knownSourceIds.has(sourceId))) failures.push(`Day ${packet.dayNumber} has an invalid target contract.`);
      if (target.kind === 'verified_channel' && (!target.channelId || !knownChannelIds.has(target.channelId) || !target.publicUrl)) failures.push(`Day ${packet.dayNumber} has an unresolved public channel.`);
    }
    for (const action of packet.actions) { if (ids.has(action.actionId)) failures.push(`Duplicate execution action ID: ${action.actionId}`); ids.add(action.actionId); if (!action.instruction || !action.quantity || !action.evidenceExpected.length || action.targetIds.length === 0 || action.assetIds.length === 0 || action.targetIds.some(value => !targetIds.has(value))) failures.push(`Day ${packet.dayNumber} has an unresolved action target.`); }
    for (const asset of packet.assets) {
      if (assetIds.has(asset.assetId)) failures.push(`Duplicate deliverable asset ID: ${asset.assetId}`); assetIds.add(asset.assetId);
      if (!asset.type || !asset.title || !asset.usageInstructions || !asset.contentType || !asset.version || !asset.evidenceExpected.length || Object.values(asset.capabilities).some(value => typeof value !== 'boolean') || asset.targetIds.some(value => !targetIds.has(value))) failures.push(`Day ${packet.dayNumber} has an unresolved asset target.`);
      if (asset.targetChannel && !packet.targets.some(target => target.kind === 'verified_channel' && target.name === asset.targetChannel)) failures.push(`Day ${packet.dayNumber} routes an asset to an undeclared public channel.`);
      const fields = [...asset.finishedContent.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]);
      const declared = new Set(asset.personalizationFields.map(field => field.name));
      if (fields.some(field => !declared.has(field))) failures.push(`Day ${packet.dayNumber} has an undeclared personalization field.`);
      if (asset.personalizationFields.some(field => field.required && !fields.includes(field.name))) failures.push(`Day ${packet.dayNumber} has an unused required personalization field.`);
      if (asset.lineage.blueprintId !== blueprint.blueprintId || asset.lineage.blueprintVersion !== blueprint.blueprintVersion || asset.lineage.sourceVerdictId !== blueprint.sourceVerdictId || asset.lineage.sourceIds.some(sourceId => !knownSourceIds.has(sourceId))) failures.push(`Day ${packet.dayNumber} has broken asset lineage.`);
    }
    if (day.primaryObjective !== packet.objective || day.whyItMatters !== packet.whyThisDayExists || day.expectedDeliverable !== packet.expectedOutcome || day.successMeasurement !== packet.successThreshold) failures.push(`Day ${packet.dayNumber} legacy aliases do not match its canonical packet.`);
  }
  const dayOne = blueprint.dailyCalendar[0]?.executionPacket?.assets[0]?.finishedContent || '';
  if (!dayOne.includes(blueprint.offer.oneSentencePromise)) failures.push('Day 1 packet is inconsistent with the canonical offer.');
  for (const day of blueprint.dailyCalendar) for (const asset of day.executionPacket?.assets || []) {
    if (asset.lineage.sourceAssetIds.some(sourceAssetId => !assetIds.has(sourceAssetId))) failures.push(`Day ${day.dayNumber} has an unresolved lineage asset.`);
    if (asset.lineage.sourceAssetIds.includes(asset.assetId)) failures.push(`Day ${day.dayNumber} has self-referential lineage.`);
  }
  for (const day of blueprint.dailyCalendar) for (const action of day.executionPacket?.actions || []) {
    if (action.assetIds.some(assetId => !assetIds.has(assetId))) failures.push(`Day ${day.dayNumber} has an unresolved action asset.`);
  }
  return [...new Set(failures)];
}
