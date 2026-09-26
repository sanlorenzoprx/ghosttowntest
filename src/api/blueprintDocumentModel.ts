import type { GhostTownLaunchBlueprintV21, DailyExecutionPacket, DeliverableAsset } from '../types/launchBlueprintV21';
import type { ResearchEvidenceRole } from '../types/launchBlueprint';
import type { TruthLabel } from '../types/paidTest';
import { researchEvidenceRole } from './researchEvidenceRole';

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
  accessGroups?: Array<{ groupId: ResearchEvidenceRole; title: string; targets: BlueprintDocumentAccessTarget[] }>;
}
export type BlueprintDocumentAccessResourceKind = 'helpful_post' | 'outreach_script' | 'daily_asset';
export interface BlueprintDocumentAccessResource {
  kind: BlueprintDocumentAccessResourceKind;
  resourceId: string;
  title: string;
  targetIds: string[];
  sourceRefs: string[];
  lineage: string;
}
export interface BlueprintDocumentAccessTarget {
  targetId: string; name: string; publicUrl: string; sourceRefs: string[]; researchDate: string;
  targetType: string; evidenceRole: ResearchEvidenceRole; confidence: string; accessPath: string; risk: string;
  evidenceDate?: string; evidenceRecency: string; currentActivityStatus: string; currentActivityVerifiedAt?: string; currentActivityEvidence: string;
  matchedAssetOrScript: BlueprintDocumentAccessResource; firstAction: string;
}
export interface BlueprintSupportingDocumentSection { sectionId: string; title: string; content: string[]; sourceRefs: string[]; }
export interface BlueprintDocumentModel {
  schemaVersion: typeof BLUEPRINT_DOCUMENT_MODEL_VERSION;
  documentId: string;
  sourceBlueprint: { blueprintId: string; blueprintVersion: string; contractVersion: string; sourceVerdictId: string; canonicalSourceHash: string };
  presentation: { title: string; subtitle: string; customer: string };
  customerActions: ['open_blueprint', 'download_pdf'];
  prioritySections: BlueprintPrioritySection[];
  supportingSections: BlueprintSupportingDocumentSection[];
  manifest: { sectionIds: string[]; assetIds: string[]; targetIds: string[]; sourceIds: string[]; lineage: string[] };
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const packet = (blueprint: GhostTownLaunchBlueprintV21, day: number): DailyExecutionPacket => {
  const value = blueprint.dailyCalendar.find(item => item.dayNumber === day)?.executionPacket;
  if (value) return value;
  // Older v2.1 records predate Q2. They stay readable and downloadable; this
  // projection is explicitly a compatibility view and never mutates storage.
  const legacy = blueprint.dailyCalendar.find(item => item.dayNumber === day);
  if (!legacy) throw new Error(`Blueprint has no day ${day} action`);
  const legacyAsset: DeliverableAsset = {
    assetId: `legacy-document-asset-day-${String(day).padStart(2, '0')}-v1`, dayNumber: day,
    type: 'legacy_execution_reference', title: legacy.preparedAssets[0] || legacy.expectedDeliverable,
    finishedContent: `${legacy.expectedDeliverable}\n\n${legacy.requiredActions.join('\n')}`,
    contentType: 'text/plain', personalizationFields: [], usageInstructions: 'Use this compatibility reference in the authenticated Blueprint; it preserves the original v2.1 record.', targetIds: [`legacy-target-day-${day}`], capabilities: { copyReady: false, editable: false, downloadable: false, openable: true }, evidenceExpected: legacy.evidenceToRecord, version: 'legacy-v2.1',
    lineage: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, sourceIds: [], sourceAssetIds: [] }
  };
  return { dayNumber: day, title: legacy.title, objective: legacy.primaryObjective, whyThisDayExists: legacy.whyItMatters, targets: [{ targetId: `legacy-target-day-${day}`, kind: 'evidence_set', name: blueprint.offer.targetCustomer, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Compatibility projection of the original v2.1 action.', minimumCount: 1, excluded: [], sourceIds: [] }], actions: [{ actionId: `legacy-action-day-${day}`, sequence: 1, instruction: legacy.requiredActions.join(' '), quantity: legacy.estimatedEffort, targetIds: [`legacy-target-day-${day}`], assetIds: [legacyAsset.assetId], evidenceExpected: legacy.evidenceToRecord }], assets: [legacyAsset], expectedOutcome: legacy.expectedDeliverable, successThreshold: legacy.successMeasurement, failureThreshold: 'Record the original v2.1 evidence and revise only after a checkpoint.', evidenceToCapture: legacy.evidenceToRecord, branchRules: legacy.ifThenBranches.map((branch, index) => ({ branchId: `legacy-branch-day-${day}-${index + 1}`, condition: branch.condition, action: branch.action, route: 'revise', evidenceRequired: legacy.evidenceToRecord })), estimatedMinutes: legacy.estimatedMinutes, completionDefinition: `${legacy.completionKey}: ${legacy.expectedDeliverable}`, nonAssetJustification: 'Legacy v2.1 compatibility projection.' };
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
  const dailyAssets = blueprint.dailyCalendar.flatMap(day => day.executionPacket?.assets || []);
  const helpfulPosts = blueprint.customerAccessPack.helpfulPosts;
  const outreachScripts = blueprint.customerAccessPack.outreachScripts;
  const accessResource = (channel: typeof channels[number]): BlueprintDocumentAccessResource => {
    const declaredAsset = dailyAssets.find(item => item.assetId === channel.preparedAsset || item.title === channel.preparedAsset);
    const declaredScript = outreachScripts.find(item => item.scriptId === channel.outreachScriptId);
    const matchedPost = helpfulPosts.find(item => item.postId === channel.preparedAsset || item.title === channel.preparedAsset || item.intendedCommunity === channel.community);
    const role = researchEvidenceRole(channel);
    const semanticRelationship = channel.targetType === 'association'
      ? 'association_member'
      : role === 'partnership'
        ? 'referral_partner'
        : role === 'customer_access'
          ? 'community_member'
          : 'interview_invitation';
    const semanticScript = outreachScripts.find(item => item.relationship === semanticRelationship)
      || outreachScripts.find(item => item.relationship === 'interview_invitation');
    const resource = declaredAsset
      ? { kind: 'daily_asset' as const, resourceId: declaredAsset.assetId, title: declaredAsset.title }
      : declaredScript
        ? { kind: 'outreach_script' as const, resourceId: declaredScript.scriptId, title: declaredScript.title }
        : matchedPost
          ? { kind: 'helpful_post' as const, resourceId: matchedPost.postId, title: matchedPost.title }
          : semanticScript
            ? { kind: 'outreach_script' as const, resourceId: semanticScript.scriptId, title: semanticScript.title }
            : (() => { throw new Error(`No canonical access asset or script resolves for ${channel.channelId}`); })();
    return {
      ...resource,
      targetIds: [channel.channelId],
      sourceRefs: [...channel.sourceIds],
      lineage: `${blueprint.blueprintId}->${resource.resourceId}->${channel.channelId}`
    };
  };
  const accessTarget = (channel: typeof channels[number]): BlueprintDocumentAccessTarget => ({
    targetId: channel.channelId, name: channel.community, publicUrl: channel.publicUrl,
    sourceRefs: channel.sourceIds, researchDate: channel.researchDate,
    targetType: channel.targetType || 'community', evidenceRole: researchEvidenceRole(channel), confidence: channel.confidence,
    evidenceDate: channel.evidenceDate, evidenceRecency: channel.evidenceRecency || 'unknown',
    currentActivityStatus: channel.currentActivityStatus || 'unverified', currentActivityVerifiedAt: channel.currentActivityVerifiedAt,
    currentActivityEvidence: channel.currentActivityEvidence || 'Current activity was not independently verified.',
    accessPath: channel.accessPath || channel.recommendedApproach || channel.platform,
    risk: channel.risk, matchedAssetOrScript: accessResource(channel), firstAction: channel.firstAction
  });
  const grouped = {
    customer_access: channels.filter(channel => researchEvidenceRole(channel) === 'customer_access'),
    market_evidence: channels.filter(channel => researchEvidenceRole(channel) === 'market_evidence'),
    media_pr: channels.filter(channel => researchEvidenceRole(channel) === 'media_pr'),
    partnership: channels.filter(channel => researchEvidenceRole(channel) === 'partnership')
  };
  const accessGroups = [
    { groupId: 'customer_access' as const, title: 'Direct Customer Access', targets: grouped.customer_access.map(accessTarget) },
    { groupId: 'market_evidence' as const, title: 'Market Evidence', targets: grouped.market_evidence.map(accessTarget) },
    { groupId: 'media_pr' as const, title: 'Media / PR Opportunities', targets: grouped.media_pr.map(accessTarget) },
    { groupId: 'partnership' as const, title: 'Partnership Opportunities', targets: grouped.partnership.map(accessTarget) }
  ];
  const prioritySections = [
    section('48_hour_launch_card', '48-Hour Launch Card', blueprint.launchCard48Hour.firstCommitmentRequest,
      `Reach ${blueprint.launchCard48Hour.firstCustomer} before building. The first 48 hours produce commitment evidence.`,
      [evidence('launch-card:customer', blueprint.launchCard48Hour.firstCustomer, 'Inferred'), ...blueprint.launchCard48Hour.firstThreeApproaches.map((approach, index) => evidence(`launch-card:approach:${index + 1}`, `${approach.name}: ${approach.publicUrl}; ${approach.firstAction}`, 'Verified', channels.find(channel => channel.channelId === approach.channelId)?.sourceIds || []))],
      day1.assets.map(asset), packetMeasurement(day1), packetAdaptation(day1), unique([...day1.targets.flatMap(target => target.sourceIds), ...channelRefs])),
    section('first_customer', 'First Customer', blueprint.executiveDecision.recommendedInitialCustomer,
      blueprint.positioning.positioningStatement,
      [evidence('customer:profile', blueprint.positioning.firstTargetCustomer, 'Inferred'), ...blueprint.positioning.triggerEvents.map((value, index) => evidence(`customer:trigger:${index + 1}`, value, 'Inferred')), ...blueprint.positioning.currentAlternatives.map((value, index) => evidence(`customer:alternative:${index + 1}`, value, 'Inferred'))],
      [...day2.assets, ...day4.assets].map(asset), packetMeasurement(day4), [...packetAdaptation(day7), ...packetAdaptation(day4)], unique([...day2.targets.flatMap(target => target.sourceIds), ...day4.targets.flatMap(target => target.sourceIds)])),
    section('first_offer', 'First Offer', `${blueprint.offer.offerName} - ${blueprint.offer.oneSentencePromise}`,
      `${blueprint.businessModelLane.rationale} Proof boundary: ${blueprint.foundingCustomerPilotBrief.proofBoundary}`,
      [evidence('offer:price', blueprint.offer.initialTestPrice, blueprint.offer.truthLabel), evidence('offer:lane', blueprint.businessModelLane.firstMeaningfulTest, 'Inferred')],
      [9, 10, 11].flatMap(day => packet(blueprint, day).assets).map(asset), packetMeasurement(day9), packetAdaptation(day14), unique([...day9.targets.flatMap(target => target.sourceIds), ...sources])),
    section('first_revenue', 'First Revenue Path', blueprint.firstRevenuePath.firstAsk,
      `${blueprint.firstRevenuePath.firstOfferFormat}; ask ${blueprint.firstRevenuePath.minimumQualifiedAsks} qualified buyers by Day ${blueprint.firstRevenuePath.targetDay}.`,
      [evidence('revenue:buyer', blueprint.firstRevenuePath.firstBuyer, 'Inferred'), evidence('revenue:price', blueprint.firstRevenuePath.firstPrice, blueprint.offer.truthLabel), ...blueprint.firstRevenuePath.requiredProof.map((value, index) => evidence(`revenue:proof:${index + 1}`, value, 'Test'))],
      [...day16.assets, ...day20.assets, ...day21.assets].map(asset), packetMeasurement(day21), packetAdaptation(day21), unique([...day16.targets.flatMap(target => target.sourceIds), ...sources])),
    { ...section('customer_access_network', 'Research and Customer Access', 'Use Direct Customer Access for first-revenue work. Keep market evidence, media/PR, and partnerships in their own lanes.',
      'Each target is public and source-linked, but only targets classified as customer_access are eligible to drive direct buyer acquisition.',
      channels.map(channel => evidence(`access:${channel.channelId}`, `${channel.community} | ${channel.publicUrl} | evidence dated: ${channel.evidenceDate || 'unknown'} (${channel.evidenceRecency || 'unknown'}) | researched: ${channel.researchDate} | current activity: ${channel.currentActivityStatus || 'unverified'}${channel.currentActivityVerifiedAt ? ` verified ${channel.currentActivityVerifiedAt}` : ''} | evidence confidence: ${channel.confidence} | access: ${channel.accessPath || channel.platform} | risk: ${channel.risk} | first action: ${channel.firstAction}`, channel.confidence === 'high' ? 'Verified' : 'Inferred', channel.sourceIds)),
      [day1, day4].flatMap(value => value.assets).map(asset), packetMeasurement(day4), packetAdaptation(day7), channelRefs), accessGroups },
    section('today', `Today: Day ${today.dayNumber} — ${today.title}`, today.objective, today.whyThisDayExists,
      today.targets.map(target => evidence(`today:target:${target.targetId}`, `${target.name}: ${target.selectionOrQualificationRule}`, target.identityStatus === 'verified_public' ? 'Verified' : 'Inferred', target.sourceIds)),
      today.assets.map(asset), packetMeasurement(today), packetAdaptation(today), unique(today.targets.flatMap(target => target.sourceIds)))
  ];
  const supportingSections: BlueprintSupportingDocumentSection[] = [
    { sectionId: 'starting_state_audit', title: 'Starting-State and Evidence Audit', content: [blueprint.startingStateAudit.currentStage.statement, ...blueprint.startingStateAudit.verifiedFacts.map(item => `${item.truthLabel}: ${item.statement}`)], sourceRefs: sources },
    { sectionId: 'fulfillment_economics', title: 'Manual Fulfillment and Economics', content: [blueprint.firstRevenuePath.firstOfferFormat, blueprint.manualFulfillmentPlan.successfulDeliveryDefinition, blueprint.manualFulfillmentPlan.grossMarginGuardrail], sourceRefs: [] },
    { sectionId: 'first_revenue_legacy_reference', title: 'First-Revenue Path', content: [blueprint.firstRevenuePath.firstAsk, blueprint.firstRevenuePath.successThreshold], sourceRefs: [] },
    { sectionId: 'prepared_content', title: 'Prepared Content and Conversations', content: [...blueprint.customerAccessPack.helpfulPosts.map(post => post.body), blueprint.customerInterviewGuide.opening, blueprint.offerConversationGuide.opening], sourceRefs: [] },
    { sectionId: 'launch_site', title: 'Launch Site', content: [blueprint.launchSite.offer.headline, blueprint.launchSite.offer.callToAction], sourceRefs: [] },
    { sectionId: 'full_30_day_plan', title: 'Full 30-Day Plan', content: blueprint.dailyCalendar.map(day => `Day ${day.dayNumber}: ${day.executionPacket?.completionDefinition || day.expectedDeliverable}`), sourceRefs: unique(blueprint.dailyCalendar.flatMap(day => day.executionPacket?.targets.flatMap(target => target.sourceIds) || [])) },
    { sectionId: 'evidence_checkpoints', title: 'Behavioral Evidence Hierarchy and Adaptive Checkpoint Reviews', content: [...blueprint.evidenceHierarchy.strong, ...blueprint.adaptiveCheckpoints.flatMap(checkpoint => [checkpoint.title, ...checkpoint.evidenceRequired])], sourceRefs: [] },
    { sectionId: 'sources_receipt', title: 'Sources and Receipt', content: [...blueprint.sources.map(source => `${source.title} — ${source.url}`), `Canonical Git blob SHA-1: ${blueprint.generationReceipt.canonicalContract.gitBlobSha1}`, 'Every Factory slice must revalidate its exact hash before execution.'], sourceRefs: sources }
  ];
  const allAssets = prioritySections.flatMap(value => value.readyToUseAssets);
  const allTargets = blueprint.dailyCalendar.flatMap(day => day.executionPacket?.targets.map(target => target.targetId) || []);
  return {
    schemaVersion: BLUEPRINT_DOCUMENT_MODEL_VERSION,
    documentId: `blueprint-document:${blueprint.blueprintId}:v1`,
    sourceBlueprint: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, contractVersion: blueprint.contractVersion, sourceVerdictId: blueprint.sourceVerdictId, canonicalSourceHash: blueprint.generationReceipt.canonicalContract.gitBlobSha1 },
    presentation: { title: blueprint.offer.offerName, subtitle: blueprint.offer.oneSentencePromise, customer: blueprint.offer.targetCustomer },
    customerActions: ['open_blueprint', 'download_pdf'], prioritySections, supportingSections,
    manifest: { sectionIds: [...BLUEPRINT_DOCUMENT_PRIORITY_IDS, ...supportingSections.map(value => value.sectionId)], assetIds: unique(allAssets.map(value => value.assetId)), targetIds: unique(allTargets), sourceIds: unique(sources), lineage: [`${blueprint.sourceVerdictId}->${blueprint.blueprintId}`, ...allAssets.map(value => `${blueprint.blueprintId}->${value.assetId}`)] }
  };
}

export function validateBlueprintDocumentModel(model: BlueprintDocumentModel): string[] {
  const failures: string[] = [];
  if (model.schemaVersion !== BLUEPRINT_DOCUMENT_MODEL_VERSION) failures.push('document-model-version');
  if (model.customerActions.join(',') !== 'open_blueprint,download_pdf') failures.push('customer-actions');
  if (!model.presentation.title || !model.presentation.subtitle || !model.presentation.customer) failures.push('presentation');
  if (model.prioritySections.map(value => value.sectionId).join(',') !== BLUEPRINT_DOCUMENT_PRIORITY_IDS.join(',')) failures.push('priority-section-order');
  const ids = new Set<string>();
  for (const value of model.prioritySections) {
    if (!value.decision || !value.why || !value.evidence.length || !value.readyToUseAssets.length || !value.measurement.successThreshold || !value.measurement.failureThreshold || !value.measurement.completionDefinition || !value.adaptationRule.length) failures.push(`incomplete:${value.sectionId}`);
    // Assets may intentionally appear in more than one decision section. Their
    // canonical asset IDs stay stable; section and evidence block IDs may not.
    for (const id of [value.sectionId, ...Object.values(value.blockIds), ...value.evidence.map(item => item.evidenceId)]) { if (ids.has(id)) failures.push(`duplicate-id:${id}`); ids.add(id); }
    if (value.evidence.some(item => !item.statement || !item.truthLabel)) failures.push(`evidence:${value.sectionId}`);
    if (value.readyToUseAssets.some(item => !item.finishedContent || !item.usageInstructions || !item.targetIds.length || /^prepared asset\s*:/i.test(item.finishedContent.trim()))) failures.push(`asset:${value.sectionId}`);
    if (/<script|<\/script|-----BEGIN PRIVATE KEY-----|access[_-]?token|systemInstruction|rawModelResponse/i.test(JSON.stringify(value))) failures.push(`private-or-injected:${value.sectionId}`);
    if (/unlock your potential|revolutionize your workflow|\bsmall businesses\b/i.test(`${value.decision} ${value.why}`)) failures.push(`generic-copy:${value.sectionId}`);
  }
  const access = model.prioritySections.find(value => value.sectionId === 'customer_access_network');
  const targets = access?.accessGroups?.flatMap(group => group.targets) || [];
  if (targets.length < 10 || targets.length > 25) failures.push('access-target-count');
  if (!access?.accessGroups || access.accessGroups.map(group => group.groupId).join(',') !== 'customer_access,market_evidence,media_pr,partnership') failures.push('access-groups');
  const targetIds = targets.map(target => target.targetId);
  if (new Set(targetIds).size !== targets.length) failures.push('access-target-duplicate');
  if (targets.some(target => !target.publicUrl || !target.sourceRefs.length || !target.researchDate || !target.confidence || !target.evidenceRecency || !target.currentActivityStatus || !target.currentActivityEvidence || !target.accessPath || !target.risk || !target.matchedAssetOrScript?.resourceId || !target.firstAction)) failures.push('access-target-metadata');
  for (const group of access?.accessGroups || []) {
    if (group.targets.some(target => target.evidenceRole !== group.groupId)) failures.push(`access-role-classification:${group.groupId}`);
  }
  if (!model.supportingSections.some(value => value.sectionId === 'full_30_day_plan' && value.content.length === 30)) failures.push('full-30-day-plan');
  return failures;
}

/** Cross-surface validation is intentionally separate from composition so it can
 * reject an externally supplied/altered projection without changing canonical data. */
export function validateBlueprintDocumentAgainstCanonical(model: BlueprintDocumentModel, blueprint: GhostTownLaunchBlueprintV21): string[] {
  const failures = validateBlueprintDocumentModel(model);
  const sources = new Set(blueprint.sources.map(source => source.sourceId));
  const assets = new Set(blueprint.dailyCalendar.flatMap(day => day.executionPacket?.assets.map(asset => asset.assetId) || []));
  const targets = new Set(blueprint.dailyCalendar.flatMap(day => day.executionPacket?.targets.map(target => target.targetId) || []));
  const posts = new Set(blueprint.customerAccessPack.helpfulPosts.map(item => item.postId));
  const scripts = new Set(blueprint.customerAccessPack.outreachScripts.map(item => item.scriptId));
  for (const section of model.prioritySections) {
    if (section.evidence.some(item => item.sourceRefs.some(ref => !sources.has(ref)))) failures.push(`unresolved-source:${section.sectionId}`);
    if (section.readyToUseAssets.some(item => item.targetIds.some(id => !targets.has(id) && !id.startsWith('legacy-target-')) || (!assets.has(item.assetId) && !item.assetId.startsWith('legacy-document-')))) failures.push(`unresolved-asset-or-target:${section.sectionId}`);
  }
  const byId = new Map(model.prioritySections.map(section => [section.sectionId, section]));
  if (byId.get('48_hour_launch_card')?.decision !== blueprint.launchCard48Hour.firstCommitmentRequest) failures.push('cross-surface:launch-card-decision');
  if (byId.get('first_customer')?.decision !== blueprint.executiveDecision.recommendedInitialCustomer || byId.get('first_customer')?.why !== blueprint.positioning.positioningStatement) failures.push('cross-surface:first-customer');
  if (byId.get('first_offer')?.decision !== `${blueprint.offer.offerName} - ${blueprint.offer.oneSentencePromise}`) failures.push('cross-surface:first-offer');
  if (byId.get('first_revenue')?.decision !== blueprint.firstRevenuePath.firstAsk) failures.push('cross-surface:first-revenue');
  if (!byId.get('first_revenue')?.evidence.some(item => item.evidenceId === 'revenue:price' && item.statement === blueprint.firstRevenuePath.firstPrice)) failures.push('cross-surface:revenue-price');
  const launchSite = model.supportingSections.find(section => section.sectionId === 'launch_site');
  if (!launchSite || launchSite.content[0] !== blueprint.launchSite.offer.headline || launchSite.content[1] !== blueprint.launchSite.offer.callToAction) failures.push('cross-surface:launch-site');
  if (model.presentation.title !== blueprint.offer.offerName || model.presentation.subtitle !== blueprint.offer.oneSentencePromise || model.presentation.customer !== blueprint.offer.targetCustomer) failures.push('cross-surface:presentation');
  const accessTargets = byId.get('customer_access_network')?.accessGroups?.flatMap(group => group.targets) || [];
  for (const target of accessTargets) {
    const resource = target.matchedAssetOrScript;
    const resolves = resource.kind === 'daily_asset' ? assets.has(resource.resourceId) : resource.kind === 'helpful_post' ? posts.has(resource.resourceId) : scripts.has(resource.resourceId);
    if (!resolves || resource.targetIds.join(',') !== target.targetId || resource.sourceRefs.some(ref => !sources.has(ref)) || resource.lineage !== `${blueprint.blueprintId}->${resource.resourceId}->${target.targetId}`) failures.push(`access-resource:${target.targetId}`);
  }
  if (!byId.get('today')?.readyToUseAssets.length || !byId.get('today')?.adaptationRule.length) failures.push('today-incomplete');
  if (model.sourceBlueprint.blueprintId !== blueprint.blueprintId || model.sourceBlueprint.sourceVerdictId !== blueprint.sourceVerdictId) failures.push('lineage');
  return unique(failures);
}
