import type { GhostTownLaunchBlueprintV21, DailyExecutionPacket, DeliverableAsset } from '../types/launchBlueprintV21';
import type { TruthLabel } from '../types/paidTest';

/**
 * A read-only, deterministic presentation projection.  The v2.1 Blueprint is
 * still the only canonical customer record; this model deliberately contains
 * references back to that record instead of becoming another persistence
 * format.
 */
export const BLUEPRINT_DOCUMENT_MODEL_VERSION = 'ghosttown-blueprint-document-model-v1' as const;
export const BLUEPRINT_DOCUMENT_PRIORITY_IDS = [
  '48_hour_launch_card', 'first_customer', 'first_offer', 'first_revenue',
  'customer_access_network', 'today'
] as const;
export type BlueprintDocumentPriorityId = typeof BLUEPRINT_DOCUMENT_PRIORITY_IDS[number];

export interface BlueprintDocumentEvidence {
  evidenceId: string;
  statement: string;
  truthLabel: TruthLabel;
  sourceRefs: string[];
}
export interface BlueprintDocumentAsset {
  assetId: string;
  title: string;
  finishedContent: string;
  usageInstructions: string;
  targetIds: string[];
  sourceRefs: string[];
}
export interface BlueprintDocumentMeasurement {
  successThreshold: string;
  failureThreshold: string;
  evidenceToCapture: string[];
  completionDefinition: string;
}
export interface BlueprintDocumentAdaptation {
  adaptationId: string;
  condition: string;
  action: string;
  route: string;
  evidenceRequired: string[];
}
export interface BlueprintPrioritySection {
  sectionId: BlueprintDocumentPriorityId;
  blockIds: { decision: string; why: string; evidence: string; assets: string; measurement: string; adaptation: string };
  title: string;
  decision: string;
  why: string;
  evidence: BlueprintDocumentEvidence[];
  readyToUseAssets: BlueprintDocumentAsset[];
  measurement: BlueprintDocumentMeasurement;
  adaptationRule: BlueprintDocumentAdaptation[];
  sourceRefs: string[];
}
export interface BlueprintSupportingDocumentSection { sectionId: string; title: string; content: string[]; sourceRefs: string[]; }
export interface BlueprintDocumentModel {
  schemaVersion: typeof BLUEPRINT_DOCUMENT_MODEL_VERSION;
  documentId: string;
  sourceBlueprint: { blueprintId: string; blueprintVersion: string; sourceVerdictId: string; canonicalSourceHash: string };
  customerActions: ['open_blueprint', 'download_pdf'];
  prioritySections: BlueprintPrioritySection[];
  supportingSections: BlueprintSupportingDocumentSection[];
  manifest: { sectionIds: string[]; assetIds: string[]; targetIds: string[]; sourceIds: string[]; lineage: string[] };
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const packet = (blueprint: GhostTownLaunchBlueprintV21, day: number): DailyExecutionPacket => {
  const value = blueprint.dailyCalendar.find(item => item.dayNumber === day)?.executionPacket;
  if (!value) throw new Error(`Q3 document projection requires the Q2 packet for day ${day}`);
  return value;
};
const asset = (item: DeliverableAsset): BlueprintDocumentAsset => ({
  assetId: item.assetId, title: item.title, finishedContent: item.finishedContent,
  usageInstructions: item.usageInstructions, targetIds: [...item.targetIds], sourceRefs: [...item.lineage.sourceIds]
});
const evidence = (id: string, statement: string, truthLabel: TruthLabel, sourceRefs: string[] = []): BlueprintDocumentEvidence => ({ evidenceId: id, statement, truthLabel, sourceRefs });
const section = (
  sectionId: BlueprintDocumentPriorityId, title: string, decision: string, why: string,
  items: BlueprintDocumentEvidence[], assets: BlueprintDocumentAsset[], measurement: BlueprintDocumentMeasurement,
  adaptationRule: BlueprintDocumentAdaptation[], sourceRefs: string[]
): BlueprintPrioritySection => ({
  sectionId, title, decision, why, evidence: items, readyToUseAssets: assets, measurement, adaptationRule, sourceRefs,
  blockIds: {
    decision: `${sectionId}:decision`, why: `${sectionId}:why`, evidence: `${sectionId}:evidence`,
    assets: `${sectionId}:ready_to_use_assets`, measurement: `${sectionId}:measurement`, adaptation: `${sectionId}:adaptation_rule`
  }
});
function packetMeasurement(value: DailyExecutionPacket): BlueprintDocumentMeasurement {
  return { successThreshold: value.successThreshold, failureThreshold: value.failureThreshold, evidenceToCapture: [...value.evidenceToCapture], completionDefinition: value.completionDefinition };
}
function packetAdaptation(value: DailyExecutionPacket): BlueprintDocumentAdaptation[] {
  return value.branchRules.map(rule => ({ adaptationId: rule.branchId, condition: rule.condition, action: rule.action, route: rule.route, evidenceRequired: [...rule.evidenceRequired] }));
}

export function composeBlueprintDocumentModel(blueprint: GhostTownLaunchBlueprintV21, selectedDay = 1): BlueprintDocumentModel {
  const sources = blueprint.sources.map(source => source.sourceId);
  const day1 = packet(blueprint, 1); const day2 = packet(blueprint, 2); const day4 = packet(blueprint, 4);
  const day7 = packet(blueprint, 7); const day9 = packet(blueprint, 9); const day14 = packet(blueprint, 14);
  const day16 = packet(blueprint, 16); const day20 = packet(blueprint, 20); const day21 = packet(blueprint, 21);
  const today = packet(blueprint, Math.min(30, Math.max(1, selectedDay)));
  const channels = blueprint.customerAccessPack.channels;
  const channelRefs = unique(channels.flatMap(channel => channel.sourceIds));
  const prioritySections = [
    section('48_hour_launch_card', '48-Hour Launch Card', blueprint.launchCard48Hour.firstCommitmentRequest,
      `Reach ${blueprint.launchCard48Hour.firstCustomer} before building. The first 48 hours produce commitment evidence.`,
      [evidence('launch-card:customer', blueprint.launchCard48Hour.firstCustomer, 'Inferred'), ...blueprint.launchCard48Hour.firstThreeApproaches.map((approach, index) => evidence(`launch-card:approach:${index + 1}`, `${approach.name}: ${approach.publicUrl}; ${approach.firstAction}`, 'Verified', channels.find(channel => channel.channelId === approach.channelId)?.sourceIds || []))],
      day1.assets.map(asset), packetMeasurement(day1), packetAdaptation(day1), unique([...day1.targets.flatMap(target => target.sourceIds), ...channelRefs])),
    section('first_customer', 'First Customer', blueprint.executiveDecision.recommendedInitialCustomer,
      blueprint.positioning.positioningStatement,
      [evidence('customer:profile', blueprint.positioning.firstTargetCustomer, 'Inferred'), ...blueprint.positioning.triggerEvents.map((value, index) => evidence(`customer:trigger:${index + 1}`, value, 'Inferred')), ...blueprint.positioning.currentAlternatives.map((value, index) => evidence(`customer:alternative:${index + 1}`, value, 'Inferred'))],
      [...day2.assets, ...day4.assets].map(asset), packetMeasurement(day4), [...packetAdaptation(day7), ...packetAdaptation(day4)], unique([...day2.targets.flatMap(target => target.sourceIds), ...day4.targets.flatMap(target => target.sourceIds)])),
    section('first_offer', 'First Offer', `${blueprint.offer.offerName} — ${blueprint.offer.oneSentencePromise}`,
      `${blueprint.businessModelLane.rationale} Proof boundary: ${blueprint.foundingCustomerPilotBrief.proofBoundary}`,
      [evidence('offer:price', blueprint.offer.initialTestPrice, blueprint.offer.truthLabel), evidence('offer:lane', blueprint.businessModelLane.firstMeaningfulTest, 'Inferred')],
      [9, 10, 11].flatMap(day => packet(blueprint, day).assets).map(asset), packetMeasurement(day9), packetAdaptation(day14), unique([...day9.targets.flatMap(target => target.sourceIds), ...sources])),
    section('first_revenue', 'First Revenue Path', blueprint.firstRevenuePath.firstAsk,
      `${blueprint.firstRevenuePath.firstOfferFormat}; ask ${blueprint.firstRevenuePath.minimumQualifiedAsks} qualified buyers by Day ${blueprint.firstRevenuePath.targetDay}.`,
      [evidence('revenue:buyer', blueprint.firstRevenuePath.firstBuyer, 'Inferred'), evidence('revenue:price', blueprint.firstRevenuePath.firstPrice, blueprint.offer.truthLabel), ...blueprint.firstRevenuePath.requiredProof.map((value, index) => evidence(`revenue:proof:${index + 1}`, value, 'Test'))],
      [...day16.assets, ...day20.assets, ...day21.assets].map(asset), packetMeasurement(day21), packetAdaptation(day21), unique([...day16.targets.flatMap(target => target.sourceIds), ...sources])),
    section('customer_access_network', 'Customer Access Network', 'Run the Priority Five first; hold the Reserve Five until evidence changes the route.',
      'Each target is public, source-linked, qualified, and paired with a safe first action rather than invented access.',
      channels.map(channel => evidence(`access:${channel.channelId}`, `${channel.community} | ${channel.publicUrl} | ${channel.relevance} | risk: ${channel.risk} | first action: ${channel.firstAction}`, channel.confidence === 'high' ? 'Verified' : 'Inferred', channel.sourceIds)),
      [day1, day4].flatMap(value => value.assets).map(asset), packetMeasurement(day4), packetAdaptation(day7), channelRefs),
    section('today', `Today: Day ${today.dayNumber} — ${today.title}`, today.objective, today.whyThisDayExists,
      today.targets.map(target => evidence(`today:target:${target.targetId}`, `${target.name}: ${target.selectionOrQualificationRule}`, target.identityStatus === 'verified_public' ? 'Verified' : 'Inferred', target.sourceIds)),
      today.assets.map(asset), packetMeasurement(today), packetAdaptation(today), unique(today.targets.flatMap(target => target.sourceIds)))
  ];
  const supportingSections: BlueprintSupportingDocumentSection[] = [
    { sectionId: 'starting_state_audit', title: 'Starting-State Audit', content: [blueprint.startingStateAudit.currentStage.statement, ...blueprint.startingStateAudit.verifiedFacts.map(item => `${item.truthLabel}: ${item.statement}`)], sourceRefs: sources },
    { sectionId: 'fulfillment_economics', title: 'Fulfillment and Economics', content: [blueprint.manualFulfillmentPlan.successfulDeliveryDefinition, blueprint.manualFulfillmentPlan.grossMarginGuardrail], sourceRefs: [] },
    { sectionId: 'prepared_content', title: 'Prepared Content and Conversations', content: [...blueprint.customerAccessPack.helpfulPosts.map(post => post.body), blueprint.customerInterviewGuide.opening, blueprint.offerConversationGuide.opening], sourceRefs: [] },
    { sectionId: 'launch_site', title: 'Launch Site', content: [blueprint.launchSite.offer.headline, blueprint.launchSite.offer.callToAction], sourceRefs: [] },
    { sectionId: 'full_30_day_plan', title: 'Full 30-Day Plan', content: blueprint.dailyCalendar.map(day => `Day ${day.dayNumber}: ${day.executionPacket?.completionDefinition || day.expectedDeliverable}`), sourceRefs: unique(blueprint.dailyCalendar.flatMap(day => day.executionPacket?.targets.flatMap(target => target.sourceIds) || [])) },
    { sectionId: 'evidence_checkpoints', title: 'Evidence and Checkpoints', content: blueprint.adaptiveCheckpoints.flatMap(checkpoint => [checkpoint.title, ...checkpoint.evidenceRequired]), sourceRefs: [] },
    { sectionId: 'sources_receipt', title: 'Sources and Receipt', content: blueprint.sources.map(source => `${source.title} — ${source.url}`), sourceRefs: sources }
  ];
  const allAssets = prioritySections.flatMap(value => value.readyToUseAssets);
  const allTargets = blueprint.dailyCalendar.flatMap(day => day.executionPacket?.targets.map(target => target.targetId) || []);
  return {
    schemaVersion: BLUEPRINT_DOCUMENT_MODEL_VERSION,
    documentId: `blueprint-document:${blueprint.blueprintId}:v1`,
    sourceBlueprint: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, canonicalSourceHash: blueprint.generationReceipt.canonicalContract.gitBlobSha1 },
    customerActions: ['open_blueprint', 'download_pdf'], prioritySections, supportingSections,
    manifest: { sectionIds: [...BLUEPRINT_DOCUMENT_PRIORITY_IDS, ...supportingSections.map(value => value.sectionId)], assetIds: unique(allAssets.map(value => value.assetId)), targetIds: unique(allTargets), sourceIds: unique(sources), lineage: [`${blueprint.sourceVerdictId}->${blueprint.blueprintId}`, ...allAssets.map(value => `${blueprint.blueprintId}->${value.assetId}`)] }
  };
}

export function validateBlueprintDocumentModel(model: BlueprintDocumentModel): string[] {
  const failures: string[] = [];
  if (model.schemaVersion !== BLUEPRINT_DOCUMENT_MODEL_VERSION) failures.push('document-model-version');
  if (model.customerActions.join(',') !== 'open_blueprint,download_pdf') failures.push('customer-actions');
  if (model.prioritySections.map(value => value.sectionId).join(',') !== BLUEPRINT_DOCUMENT_PRIORITY_IDS.join(',')) failures.push('priority-section-order');
  const ids = new Set<string>();
  for (const value of model.prioritySections) {
    if (!value.decision || !value.why || !value.evidence.length || !value.readyToUseAssets.length || !value.measurement.successThreshold || !value.measurement.failureThreshold || !value.measurement.completionDefinition || !value.adaptationRule.length) failures.push(`incomplete:${value.sectionId}`);
    // Assets may intentionally appear in more than one decision section. Their
    // canonical asset IDs stay stable; section and evidence block IDs may not.
    for (const id of [value.sectionId, ...Object.values(value.blockIds), ...value.evidence.map(item => item.evidenceId)]) { if (ids.has(id)) failures.push(`duplicate-id:${id}`); ids.add(id); }
    if (value.evidence.some(item => !item.statement || !item.truthLabel)) failures.push(`evidence:${value.sectionId}`);
    if (value.readyToUseAssets.some(item => !item.finishedContent || !item.usageInstructions || !item.targetIds.length)) failures.push(`asset:${value.sectionId}`);
  }
  if (!model.supportingSections.some(value => value.sectionId === 'full_30_day_plan' && value.content.length === 30)) failures.push('full-30-day-plan');
  return failures;
}
