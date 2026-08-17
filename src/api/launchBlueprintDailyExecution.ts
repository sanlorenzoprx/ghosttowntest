import type { EvaluationResult } from '../types/lit';
import type {
  BlueprintDailyActionV21,
  BranchRule,
  DailyExecutionPacket,
  DeliverableAsset,
  ExecutionTarget,
  GhostTownLaunchBlueprintV21
} from '../types/launchBlueprintV21';

/**
 * Q2 is a logical factory only: it derives executable customer assets from the
 * canonical Blueprint and never adds a provider, storage surface, or workflow.
 */
const titles = [
  'Start with the riskiest commitment', 'Qualify the first customer', 'Build the prospect tracker', 'Run the discovery sequence', 'Conduct the interview', 'Score urgency', 'Make the Week 1 decision', 'Map alternatives', 'Prepare the Pilot Brief', 'Prepare price and objections',
  'Run the offer conversation', 'Open the validation site', 'Set the evidence ledger', 'Make the Week 2 review', 'Dry-run purchase to delivery', 'Send the paid invitation', 'Record sales outcomes', 'Send the value follow-up', 'Score open opportunities', 'Confirm onboarding and scope',
  'Deliver and review commitment', 'Request feedback, renewal, or referral', 'Read the truth-labeled scoreboard', 'Revise one constraint', 'Check the delivery economics', 'Plan one-variable second test', 'Run the second-test sequence', 'Calculate unit economics', 'Write the evidence decision', 'Choose the bounded next sprint'
] as const;

const assetNames = [
  '48-Hour Evidence Brief', 'Qualification Checklist', 'Prospect Tracker', 'Discovery Sequence', 'Customer Interview Worksheet', 'Urgency Scorecard', 'Week 1 Decision Memo', 'Current Alternatives Map', 'Founding Customer Pilot Brief', 'Pricing and Objection Sheet',
  'Offer Conversation and Follow-up', 'Launch Site Activation Checklist', 'Evidence Capture Checklist', 'Week 2 Offer and Fulfillment Review', 'Purchase-to-Delivery Dry Run', 'Paid Pilot Invitation', 'Sales Outcome Sheet', 'Value Follow-up', 'Close Scorecard', 'Onboarding and Scope Form',
  'Delivery Cover Note and Quality Checklist', 'Feedback, Renewal, and Referral Message', 'Truth-Labeled Scoreboard', 'One-Constraint Revision Worksheet', 'Delivery SOP and Economics Worksheet', 'One-Variable Second Test Plan', 'Second-Test Sequence', 'Unit Economics CSV', 'Evidence Decision Memo', 'Final Decision and Bounded Next Sprint'
] as const;

function id(day: number, suffix: string) { return `${suffix}-day-${String(day).padStart(2, '0')}-v1`; }
function minutes(day: number) { return [1, 4, 7, 14, 21, 29, 30].includes(day) ? 90 : [5, 11, 16, 25, 28].includes(day) ? 75 : 45; }
function first<T>(items: T[]) { return items[0]; }

function sourceDecision(blueprint: GhostTownLaunchBlueprintV21, verdict?: EvaluationResult) {
  const decision = verdict?.verdictDecisionV2;
  return {
    customer: decision?.customer.initialCustomer || blueprint.executiveDecision.recommendedInitialCustomer,
    problem: decision?.problem.painfulProblem || blueprint.offer.painfulProblem,
    offer: decision?.offerHypothesis.offer || blueprint.offer.oneSentencePromise,
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
  const exactDiscovery = `Hi {{firstName}} — I’m researching how ${customer} handle ${problem}. When did this last affect your work, and what did your team use to catch it? I’m not pitching on this message; a two-sentence reply is useful.`;
  const content: Record<number, string> = {
    1: `# 48-Hour Evidence Brief\n\n**Customer:** ${customer}\n\n**Problem:** ${problem}\n\n**Offer:** ${q1.offer}\n\n**Canonical offer:** ${blueprint.offer.oneSentencePromise}\n\n**Commitment requested:** ${q1.commitment}\n\n## Do this first\n${q1.firstAction}\n\nPASS: at least 3 qualified commitments or conversations from the first 10 contacts within 5 business days.\nFAIL: 0 qualified commitments or conversations after the full batch.\nINCONCLUSIVE: 1–2 signals; change one supported constraint.\n\nDo not build broad monitoring, integrations, or automation before commitment evidence.`,
    2: `# Qualification Checklist\n\nA target qualifies only when it matches **${customer}**, has experienced **${problem}** recently, can describe a current alternative, and can take or influence the requested commitment. Exclude friends, broad audiences, and targets without a recent concrete problem.\n\nRecord: name, role, recent trigger, current alternative, decision authority, and next step.`,
    3: `target_name,role,recent_trigger,current_alternative,qualification_status,source_or_channel,next_step,follow_up_date\n,,,,,,,`,
    4: `# Discovery Sequence\n\n${exactDiscovery}\n\n## Follow-up — after 3 business days\nHi {{firstName}} — a quick “not relevant” or the current alternative your team uses would still help the research. I will not follow up again after this.\n\n## Reply transition\nThanks. Would a 15-minute comparison be useful? I can do {{timeOptionOne}} or {{timeOptionTwo}}.\n\n## Stop rule\nAfter this follow-up, do not contact this person again without a new, relevant reason.`,
    5: `# Customer Interview Worksheet\n\nOpening: ${blueprint.customerInterviewGuide.opening}\n\nAsk:\n${blueprint.customerInterviewGuide.lastOccurrenceQuestions.map(q => `- ${q}`).join('\n')}\n\nCapture exact words, recent incident, current alternative, consequence, buying process, and referral. Do not present the offer until the problem is understood.`,
    6: `# Urgency Scorecard\n\nScore each conversation 0–2 for: recent occurrence, consequence, existing spend, decision authority, access, and willingness to change.\n\n12–9: qualified, make a transparent ask. 8–5: learn more. 4–0: do not increase outreach volume.`,
    7: `# Week 1 Decision Memo\n\nQualified targets: \nReplies: \nInterviews: \nRecent incidents: \nNamed alternatives: \nExact quote: \nMain constraint: \n\nDecision: CONTINUE | NARROW | REVISE | PAUSE\n\nEvidence reason: \nOwner and due action: \n\nIf 10 qualified messages produce 0 replies, stop volume and revise access, customer, or opening. If replies show no recent pain, revise the problem before more copy.`,
    8: `# Current Alternatives Map\n\nFor each qualified buyer: current alternative, what it costs, where it fails, switching friction, and the exact language they use.\n\nDo not call an alternative weak without customer evidence.`,
    9: `# Founding Customer Pilot Brief\n\nProblem: ${blueprint.foundingCustomerPilotBrief.problem}\nScope: ${blueprint.foundingCustomerPilotBrief.scope}\nDeliverables:\n${blueprint.foundingCustomerPilotBrief.deliverables.map(x => `- ${x}`).join('\n')}\nTimeline: ${blueprint.foundingCustomerPilotBrief.timeline}\nPrice: ${blueprint.foundingCustomerPilotBrief.price}\nProof boundary: ${blueprint.foundingCustomerPilotBrief.proofBoundary}\nNext step: ${blueprint.foundingCustomerPilotBrief.nextStep}`,
    10: `# Pricing and Objection Sheet\n\nPrice hypothesis: ${price}\n\nFor every objection record the exact words, category (fit, urgency, access, trust, scope, fulfillment, price, message), evidence strength, and one next experiment. Do not discount before identifying the constraint.`,
    11: `# Offer Conversation and Follow-up\n\n${blueprint.offerConversationGuide.opening}\n\n${blueprint.offerConversationGuide.offerExplanation}\n\nCommitment request: ${blueprint.offerConversationGuide.commitmentRequest}\n\nFollow-up agreement: ${blueprint.offerConversationGuide.followUpAgreement}`,
    12: `# Launch Site Activation Checklist\n\nOpen the existing validation-stage Launch Site. Confirm target customer, problem, offer, price boundary, CTA, privacy/terms placeholders, and source tracking. Publish or share privately only after claims match recorded evidence.`,
    13: `# Evidence Capture Checklist\n\nFor each action record: contact or channel, date, action, exact response, customer language, alternative, objection, commitment requested/received, revenue, founder minutes, direct cost, follow-up, and evidence strength.`,
    14: `# Week 2 Offer and Fulfillment Review\n\nConversations: \nTransparent asks: \nAlternatives: \nObjections: \nScope understood: \nFounder hours (must be <= 6 unless lane guardrail says otherwise): \nDirect cost: \nPrice response: \n\nDecision: MAKE ASK | REDUCE COMMITMENT | REVISE SCOPE | PAUSE\n\nMake one variable change only, tied to named evidence.`,
    15: `# Purchase-to-Delivery Dry Run\n\nWalk one qualified scenario through: qualification → written scope → payment/commitment → required buyer inputs → delivery start → first useful result → evidence review. Stop if scope, permissions, capacity, or direct cost is unknown.`,
    16: `# Paid Pilot Invitation\n\nHi {{firstName}} — based on what you described about ${problem}, I can offer a fixed-scope validation-stage pilot: ${q1.offer}. The test price is ${price}. It includes the agreed scope and excludes untested guarantees. Would you like the one-page brief and a 15-minute scope check?`,
    17: `# Sales Outcome Sheet\n\nProspect: \nQualified: yes/no\nAsk made: \nOutcome: accepted | declined | delayed | referral | no response\nExact objection: \nCommitment: \nRevenue: \nNext action and date:`,
    18: `# Value Follow-up\n\nHi {{firstName}} — following up on the specific issue you named: ${problem}. The useful next step is to compare the current alternative against the fixed-scope pilot, not to make a broad promise. Would {{timeOptionOne}} or {{timeOptionTwo}} work for a short scope check?`,
    19: `# Close Scorecard\n\nCount qualified opportunities, asks, accepts, declines, delays, referrals, and no responses. Name the dominant constraint using exact evidence. Do not call a lead “lost” without recording the outcome.`,
    20: `# Onboarding and Scope Form\n\nBuyer: \nRecent problem: \nAgreed scope: \nExclusions: \nPrice/commitment: \nRequired inputs: \nTimeline: \nFirst useful result: \nApproval contact: \nEvidence to capture:`,
    21: `# Delivery Cover Note and Quality Checklist\n\nSubject: Your ${blueprint.offer.offerName} is ready\n\nThe agreed scope is attached. Findings are separated from recommendations; no result is guaranteed. Which finding is most useful, what is missing, and is there a next paid step, referral, or respectful stop?\n\nQuality check: scope complete; customer inputs received; findings labeled; founder hours and direct cost recorded; no unsupported claim.`,
    22: `# Feedback, Renewal, and Referral Message\n\nHi {{firstName}} — thank you for the pilot. Which result was useful, what was missing, and would a bounded next step be valuable? If not, is there one person with the same recent problem who would be appropriate to ask? A no is useful evidence too.`,
    23: `# Truth-Labeled Scoreboard\n\nVERIFIED: payments, deposits, accepted scope, exact buyer quotes.\nINFERRED: likely constraint or channel fit.\nTEST: next assumption.\n\nNever convert an inferred explanation into a verified claim without evidence.`,
    24: `# One-Constraint Revision Worksheet\n\nConstraint: customer | urgency | access | trust | offer | fulfillment | price | message\nEvidence: \nSingle variable to change: \nWhat remains unchanged: \nSuccess threshold: \nFailure threshold: \nNext test date:`,
    25: `# Delivery SOP and Economics Worksheet\n\nStep,owner,minutes,direct_cost,quality_check\nQualification,,,\nScope confirmation,,,\nDelivery,,,\nReview,,,\n\nDo not scale acquisition if direct cost plus founder labor exceeds the Blueprint guardrail.`,
    26: `# One-Variable Second Test Plan\n\nHypothesis: \nChange only: \nKeep constant: customer, problem, evidence method\nBatch size: 10 qualified targets\nMessage: \nSuccess: \nFailure: \nStop rule:`,
    27: `# Second-Test Sequence\n\nMessage: Hi {{firstName}} — I’m testing one narrower approach to ${problem}. Is this a recent issue for your team, and what do you use today?\n\nFollow-up after 3 business days: a current alternative or “not relevant” is enough; no more follow-up after this.\n\nRecord results before changing another variable.`,
    28: `metric,value,evidence\nqualified_conversations,,\ntransparent_asks,,\ncommitments,,\nrevenue_cents,,\nfounder_minutes,,\nvariable_cost_cents,,`,
    29: `# Evidence Decision Memo\n\nBehavioral evidence: \nConversations: \nAsks: \nCommitments: \nRevenue: \nFounder hours: \nDirect cost: \nLargest unknown: \nMain constraint: \n\nDecision: CONTINUE | REVISE | PIVOT | PAUSE | STOP\n\nReason and next bounded test:`,
    30: `# Final Decision and Bounded Next Sprint\n\nAllowed decision: CONTINUE | CONTINUE WITH REVISION | PIVOT CUSTOMER | PIVOT PROBLEM | PIVOT OFFER | PAUSE FOR MISSING EVIDENCE | STOP\n\nBehavioral evidence: \nUnknown: \nConstraint: \nOne next objective: \nThree milestones: \nFive actions: \nObservable stop rule: \n\nThe next irreversible build decision is not justified until the selected commitment evidence exists.`
  };
  return { content: content[day], sourceIds: source, channel };
}

function branches(day: number): BranchRule[] {
  const checkpoint = day === 7 || day === 14 || day === 21 || day === 30;
  const rule: BranchRule = checkpoint
    ? { branchId: id(day, 'branch'), condition: 'The stated threshold is not met with recorded evidence.', action: 'Do not increase activity volume. Name the strongest constraint and make one evidence-backed revision.', route: day === 30 ? 'pause' : 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: ['Exact responses or outcomes', 'Counts', 'Next owner and due date'] }
    : { branchId: id(day, 'branch'), condition: 'Required evidence is missing or contradicts the current recommendation.', action: 'Preserve the original recommendation, mark it unsupported, and route the contradiction to the next review.', route: 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: ['Source or prospect', 'Exact response or observed behavior'] };
  return [rule];
}

export function synchronizeDailyExecutionPackets(
  blueprint: GhostTownLaunchBlueprintV21,
  verdict?: EvaluationResult
): GhostTownLaunchBlueprintV21 {
  const channel = first(blueprint.customerAccessPack.channels);
  const baseTarget: ExecutionTarget = channel ? {
    targetId: 'target-verified-channel-v1', kind: 'verified_channel', name: channel.community, identityStatus: 'verified_public',
    selectionOrQualificationRule: 'Use only the public route and participation rules in the canonical customer-access record.', minimumCount: 1,
    excluded: ['Unverified or private channels', 'Channels without current participation rules'], channelId: channel.channelId, publicUrl: channel.publicUrl, sourceIds: channel.sourceIds
  } : { targetId: 'target-founder-select-v1', kind: 'qualified_buyer_batch', name: 'Founder-selected qualified buyers', identityStatus: 'founder_must_select', selectionOrQualificationRule: 'Select only buyers matching the canonical customer and recent problem.', minimumCount: 10, excluded: ['Broad audience', 'Unqualified contacts'], sourceIds: [] };
  const offerTarget: ExecutionTarget = { targetId: 'target-canonical-offer-v1', kind: 'offer', name: blueprint.offer.offerName, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Use the canonical offer, scope, price boundary, and proof boundary only.', minimumCount: 1, excluded: ['Unapproved discounts', 'Unsupported guarantees'], sourceIds: [] };
  const buyerTarget: ExecutionTarget = { targetId: 'target-qualified-buyer-batch-v1', kind: 'qualified_buyer_batch', name: blueprint.executiveDecision.recommendedInitialCustomer, identityStatus: 'founder_must_select', selectionOrQualificationRule: 'Select 10 people with a recent concrete problem, current alternative, and potential decision authority.', minimumCount: 10, excluded: ['Friends giving hypothetical feedback', 'Broad or anonymous traffic'], sourceIds: [] };
  const nextDays = blueprint.dailyCalendar.map((legacy, index) => {
    const day = index + 1;
    const { content, sourceIds, channel: dayChannel } = dayContent(day, blueprint, verdict);
    const assetSlug = assetNames[index].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const assetId = day === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(day).padStart(2, '0')}-${assetSlug}-v1`;
    const dayBuyerTarget = { ...buyerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-qualified-buyers-v1` };
    const dayOfferTarget = { ...offerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-offer-v1` };
    const dayChannelTarget = dayChannel ? { ...baseTarget, targetId: `target-day-${String(day).padStart(2, '0')}-verified-channel-v1` } : undefined;
    const targets: ExecutionTarget[] = [dayBuyerTarget, dayOfferTarget, ...(dayChannelTarget ? [dayChannelTarget] : [])];
    const targetIds = targets.map(target => target.targetId);
    const fields = [...content.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]);
    const asset: DeliverableAsset = {
      assetId, dayNumber: day, type: 'finished_execution_asset', title: assetNames[index], finishedContent: content,
      contentType: day === 3 || day === 28 ? 'text/csv' : 'text/markdown',
      personalizationFields: [...new Set(fields)].map(name => ({ name, description: `Founder-supplied ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, required: true })),
      usageInstructions: 'Open the finished asset, replace only declared fields when present, use it with the named target, and record the specified evidence.',
      targetChannel: dayChannel?.community, targetIds, capabilities: { copyReady: true, editable: true, downloadable: true, openable: true },
      evidenceExpected: ['Action completed', 'Source or prospect', 'Exact response or observed behavior', 'Next action'], version: '1.0.0',
      lineage: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, sourceIds, sourceAssetIds: day > 1 ? [day - 1 === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(day - 1).padStart(2, '0')}-${assetNames[day - 2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-v1`] : [] }
    };
    const packet: DailyExecutionPacket = {
      dayNumber: day, title: titles[index], objective: `Produce usable evidence about ${blueprint.offer.targetCustomer} and ${blueprint.offer.offerName}.`,
      whyThisDayExists: legacy.whyItMatters || `This is the next smallest action that can reduce uncertainty without broad building.`,
      targets,
      actions: [{ actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1, instruction: `Use “${asset.title}” with the named target and record the result before interpreting it.`, quantity: day === 4 || day === 10 || day === 16 || day === 27 ? '10 qualified targets' : '1 completed operating action', targetIds, assetIds: [assetId], evidenceExpected: asset.evidenceExpected }],
      assets: [asset], expectedOutcome: `${asset.title} is used and an evidence record exists.`,
      successThreshold: day === 4 ? 'At least 3 qualified replies or 2 interviews after the full batch and follow-up.' : day === 14 ? 'At least 3 qualified conversations, one transparent ask, and a manually deliverable scope.' : day === 1 ? 'At least 3 qualified commitments or conversations from 10 contacts within 5 business days.' : 'The named action and its required evidence are recorded.',
      failureThreshold: day === 4 ? 'Zero qualified replies after the full batch and follow-up.' : day === 1 ? 'Zero qualified commitments or conversations after the full batch.' : 'No completed action or no usable evidence by the review point.',
      evidenceToCapture: asset.evidenceExpected, branchRules: branches(day), estimatedMinutes: minutes(day),
      completionDefinition: `The finished asset was used with its target and the evidence ledger contains the exact outcome, not merely an intention.`
    };
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
  for (const [index, day] of blueprint.dailyCalendar.entries()) {
    const packet = day.executionPacket;
    if (!packet || packet.dayNumber !== index + 1) { failures.push(`Day ${index + 1} is missing its canonical Daily Execution Packet.`); continue; }
    if (!packet.objective || !packet.whyThisDayExists || !packet.expectedOutcome || !packet.completionDefinition || !packet.successThreshold || !packet.failureThreshold || !packet.evidenceToCapture.length) failures.push(`Day ${packet.dayNumber} has an incomplete measurable execution contract.`);
    if (!packet.assets.length || packet.assets.some(asset => !asset.finishedContent.trim() || asset.finishedContent.trim() === asset.title.trim() || /^(prepared (asset|script|template)|create (a |an )?(asset|script|template))\.?$/i.test(asset.finishedContent.trim()))) failures.push(`Day ${packet.dayNumber} lacks a finished usable asset.`);
    if (!packet.branchRules.length || !packet.actions.length || !packet.targets.length) failures.push(`Day ${packet.dayNumber} lacks targets, actions, or branch rules.`);
    const targetIds = new Set(packet.targets.map(target => target.targetId));
    for (const action of packet.actions) { if (ids.has(action.actionId)) failures.push(`Duplicate execution action ID: ${action.actionId}`); ids.add(action.actionId); if (action.targetIds.some(value => !targetIds.has(value))) failures.push(`Day ${packet.dayNumber} has an unresolved action target.`); }
    for (const asset of packet.assets) {
      if (assetIds.has(asset.assetId)) failures.push(`Duplicate deliverable asset ID: ${asset.assetId}`); assetIds.add(asset.assetId);
      if (asset.targetIds.some(value => !targetIds.has(value))) failures.push(`Day ${packet.dayNumber} has an unresolved asset target.`);
      const fields = [...asset.finishedContent.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]);
      const declared = new Set(asset.personalizationFields.map(field => field.name));
      if (fields.some(field => !declared.has(field))) failures.push(`Day ${packet.dayNumber} has an undeclared personalization field.`);
      if (asset.personalizationFields.some(field => field.required && !fields.includes(field.name))) failures.push(`Day ${packet.dayNumber} has an unused required personalization field.`);
      if (asset.lineage.blueprintId !== blueprint.blueprintId || asset.lineage.sourceVerdictId !== blueprint.sourceVerdictId) failures.push(`Day ${packet.dayNumber} has broken asset lineage.`);
    }
    if (day.primaryObjective !== packet.objective || day.whyItMatters !== packet.whyThisDayExists || day.expectedDeliverable !== packet.expectedOutcome || day.successMeasurement !== packet.successThreshold) failures.push(`Day ${packet.dayNumber} legacy aliases do not match its canonical packet.`);
  }
  const dayOne = blueprint.dailyCalendar[0]?.executionPacket?.assets[0]?.finishedContent || '';
  if (!dayOne.includes(blueprint.offer.oneSentencePromise)) failures.push('Day 1 packet is inconsistent with the canonical offer.');
  for (const day of blueprint.dailyCalendar) for (const asset of day.executionPacket?.assets || []) {
    if (asset.lineage.sourceAssetIds.some(sourceAssetId => !assetIds.has(sourceAssetId))) failures.push(`Day ${day.dayNumber} has an unresolved lineage asset.`);
  }
  return [...new Set(failures)];
}
