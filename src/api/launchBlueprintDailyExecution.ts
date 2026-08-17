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
    5: `# Customer Interview Worksheet\n\nOpening: ${blueprint.customerInterviewGuide.opening}\n\n## Problem history\n${blueprint.customerInterviewGuide.problemHistoryQuestions.map(q => `- ${q}`).join('\n')}\n\n## Last occurrence\n${blueprint.customerInterviewGuide.lastOccurrenceQuestions.map(q => `- ${q}`).join('\n')}\n\n## Current workaround\n${blueprint.customerInterviewGuide.currentWorkaroundQuestions.map(q => `- ${q}`).join('\n')}\n\n## Cost and consequence\n${blueprint.customerInterviewGuide.costAndConsequenceQuestions.map(q => `- ${q}`).join('\n')}\n\n## Buying process\n${blueprint.customerInterviewGuide.buyingProcessQuestions.map(q => `- ${q}`).join('\n')}\n\n## Existing spending and switching friction\n${blueprint.customerInterviewGuide.existingSpendingQuestions.concat(blueprint.customerInterviewGuide.switchingFrictionQuestions).map(q => `- ${q}`).join('\n')}\n\n## Close\n${blueprint.customerInterviewGuide.closingAndReferralQuestions.map(q => `- ${q}`).join('\n')}\n\nCapture exact words, incident, alternative, consequence, authority, and referral. Do not present the offer until the problem is understood.`,
    6: `# Urgency Scorecard\n\nScore each conversation 0–2 for: recent occurrence, consequence, existing spend, decision authority, access, and willingness to change.\n\n12–9: qualified, make a transparent ask. 8–5: learn more. 4–0: do not increase outreach volume.`,
    7: `# Week 1 Decision Memo\n\nQualified targets: \nReplies: \nInterviews: \nRecent incidents: \nNamed alternatives: \nExact quote: \nMain constraint: \n\nDecision: CONTINUE | NARROW | REVISE | PAUSE\n\nEvidence reason: \nOwner and due action: \n\nIf 10 qualified messages produce 0 replies, stop volume and revise access, customer, or opening. If replies show no recent pain, revise the problem before more copy.`,
    8: `# Current Alternatives Map\n\nFor each qualified buyer: current alternative, what it costs, where it fails, switching friction, and the exact language they use.\n\nDo not call an alternative weak without customer evidence.`,
    9: `# Founding Customer Pilot Brief\n\nProblem: ${blueprint.foundingCustomerPilotBrief.problem}\nScope: ${blueprint.foundingCustomerPilotBrief.scope}\nDeliverables:\n${blueprint.foundingCustomerPilotBrief.deliverables.map(x => `- ${x}`).join('\n')}\nTimeline: ${blueprint.foundingCustomerPilotBrief.timeline}\nPrice: ${blueprint.foundingCustomerPilotBrief.price}\nProof boundary: ${blueprint.foundingCustomerPilotBrief.proofBoundary}\nNext step: ${blueprint.foundingCustomerPilotBrief.nextStep}`,
    10: `# Pricing and Objection Sheet\n\nPrice hypothesis: ${price}\n\n| Objection | Truthful response | Evidence to record | Next action |\n|---|---|---|---|\n| Price | Compare the bounded scope and customer consequence; do not discount before diagnosis. | Exact price words | Test scope only if price is the dominant recorded constraint. |\n| Trust | State the validation-stage proof boundary; do not invent results. | Proof requested | Offer the Pilot Brief. |\n| Scope | Restate inclusions and exclusions. | Missing deliverable | Revise one scope variable. |\n| Timing | Ask for the recent trigger and dated next step. | Trigger/date | Follow up once. |\n| Fit | Confirm buyer, problem, and authority. | Qualification gap | Stop or refer. |\n\nFor every objection record exact words, category, evidence strength, and one next experiment.`,
    11: `# Offer Conversation and Follow-up\n\nOpening: ${blueprint.offerConversationGuide.opening}\n\nProblem confirmation:\n${blueprint.offerConversationGuide.problemConfirmation.map(x => `- ${x}`).join('\n')}\n\nOffer: ${blueprint.offerConversationGuide.offerExplanation}\n\nScope:\n${blueprint.offerConversationGuide.scopeConfirmation.map(x => `- ${x}`).join('\n')}\n\nPrice: ${blueprint.offerConversationGuide.pricePresentation}\n\nObjections:\n${blueprint.offerConversationGuide.objectionCapture.map(x => `- ${x}`).join('\n')}\n\nCommitment request: ${blueprint.offerConversationGuide.commitmentRequest}\n\nFollow-up: ${blueprint.offerConversationGuide.followUpAgreement}`,
    12: `# Launch Site Activation Checklist\n\n## Canonical page copy\nHeadline: ${blueprint.landingPageCopy.headline}\n\nSubheadline: ${blueprint.landingPageCopy.subheadline}\n\nProblem: ${blueprint.landingPageCopy.problemSection}\n\nOffer: ${blueprint.landingPageCopy.offerDescription}\n\nPrice: ${blueprint.landingPageCopy.pricePresentation}\n\nCTA: ${blueprint.landingPageCopy.primaryCallToAction}\n\nOpen the existing validation-stage Launch Site from the Blueprint account. Confirm every field above matches; record the URL, source code, and any changed claim. Publish or share privately only after claims match recorded evidence.`,
    13: `# Evidence Capture Checklist\n\nFor each action record: contact or channel, date, action, exact response, customer language, alternative, objection, commitment requested/received, revenue, founder minutes, direct cost, follow-up, and evidence strength.`,
    14: `# Week 2 Offer and Fulfillment Review\n\nConversations: \nTransparent asks: \nAlternatives: \nObjections: \nScope understood: \nFounder hours (must be <= 6 unless lane guardrail says otherwise): \nDirect cost: \nPrice response: \n\nDecision: MAKE ASK | REDUCE COMMITMENT | REVISE SCOPE | PAUSE\n\nMake one variable change only, tied to named evidence.`,
    15: `# Purchase-to-Delivery Dry Run\n\nWalk one qualified scenario through: qualification → written scope → payment/commitment → required buyer inputs → delivery start → first useful result → evidence review. Stop if scope, permissions, capacity, or direct cost is unknown.`,
    16: `# Paid Pilot Invitation\n\nSubject: a bounded checkout accessibility pilot\n\nHi {{firstName}} — based on what you described about ${problem}, I can offer a fixed-scope validation-stage pilot: ${q1.offer}. The test price is ${price}. It includes an agreed checkout path, prioritized findings, and a 30-minute review; it excludes broad monitoring, integrations, automation, and untested guarantees.\n\nWould you like the one-page brief and a 15-minute scope check? I can do {{timeOptionOne}} or {{timeOptionTwo}}.\n\nIf it is not relevant, a short no or current alternative is useful and I will close the loop.`,
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

/**
 * This is deliberately a day contract, not a calendar template.  The only
 * shared code is the serializer; each entry owns its public/internal routing,
 * evidence requirement, measurable failure, and the asset it actually builds
 * on.  That makes an accidental "30 copies of one task" detectable.
 */
const publicRouteDays = new Set([4, 5, 11, 12, 16, 18, 22, 27]);
const assetParents: Record<number, number[]> = {
  6: [5], 7: [3, 4, 5, 6], 8: [5], 9: [7, 8], 10: [9], 11: [9, 10],
  13: [3, 4, 5, 11], 14: [7, 10, 11, 13], 15: [9, 11, 14], 16: [9, 10, 11],
  17: [16], 18: [17], 19: [17, 18], 20: [9, 15, 19], 21: [20], 22: [21],
  23: [13, 17, 21, 22], 24: [23], 25: [20, 21], 26: [24, 25], 27: [26],
  28: [17, 21, 25, 27], 29: [23, 28], 30: [29]
};

function branches(day: number, threshold: string, failure: string): BranchRule[] {
  const checkpoint = day === 7 || day === 14 || day === 21 || day === 30;
  const rule: BranchRule = checkpoint
    ? { branchId: id(day, 'branch'), condition: `FAIL when ${failure}`, action: `Do not increase activity volume. Compare the recorded result with “${threshold}”, name one constraint, and revise only that constraint.`, route: day === 30 ? 'pause' : 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: ['Dated outcome count', 'Exact buyer or delivery evidence', 'Named owner and next date'] }
    : { branchId: id(day, 'branch'), condition: `IF ${failure}`, action: `Keep the original asset visible, record the contradiction, and route one bounded revision to Day ${Math.min(30, day + 1)}.`, route: 'revise', targetDay: Math.min(30, day + 1), evidenceRequired: ['Named target or internal record', 'Exact observed outcome', 'Dated next action'] };
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
  const evidenceTarget: ExecutionTarget = { targetId: 'target-evidence-ledger-v1', kind: 'evidence_set', name: 'Recorded execution evidence', identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Use only dated ledger entries, exact buyer language, commitments, revenue, hours, and costs.', minimumCount: 1, excluded: ['Hypothetical interest', 'Unrecorded activity'], sourceIds: [] };
  const launchSiteTarget: ExecutionTarget = { targetId: 'target-launch-site-v1', kind: 'launch_site', name: blueprint.launchSite.offer.headline || blueprint.landingPageCopy.headline, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Open the founder-owned validation Launch Site and compare only the canonical offer, price, CTA, and recorded claims.', minimumCount: 1, excluded: ['A new public site', 'Unrecorded claims'], sourceIds: [] };
  const objectives = [
    'Use the Q1 first action to create the first commitment evidence.', 'Select only buyers with recent checkout friction and authority.', 'Create a trackable batch of ten qualified prospects.', 'Send a finished discovery sequence to the qualified batch.', 'Learn recent problem behavior without pitching.', 'Rank urgency before making the paid ask.', 'Decide whether access, customer, or opening is the largest Week 1 constraint.', 'Compare named current alternatives and switching friction.', 'Prepare a bounded paid pilot brief before presenting price.', 'Capture price, trust, scope, and timing objections verbatim.',
    'Make a transparent scope-and-price conversation possible.', 'Verify the existing validation site carries the canonical offer and CTA.', 'Make every outreach and conversation observable in the ledger.', 'Choose the one evidence-backed Week 2 offer or fulfillment change.', 'Prove the founder can take a payment through first useful result manually.', 'Ask qualified prospects to buy the bounded pilot.', 'Classify every paid ask outcome without inventing pipeline status.', 'Follow up with a specific useful reason and dated next step.', 'Choose whether to close, continue, refer, or stop each open opportunity.', 'Confirm written scope and buyer responsibilities before delivery.',
    'Deliver the bounded audit and review commitment plus economics.', 'Ask for evidence-backed feedback, renewal, referral, or a respectful no.', 'Separate verified behavior from inference and next tests.', 'Change exactly one supported constraint.', 'Check whether manual fulfillment is viable before acquiring more buyers.', 'Design a controlled second test with one changed variable.', 'Run the second-test batch without changing another variable.', 'Calculate revenue, time, and direct-cost evidence.', 'Select the allowed decision from accumulated behavioral evidence.', 'Write the bounded next sprint or an explicit stop record.'
  ];
  const thresholds = [
    '3 qualified conversations or commitments from 10 targets within 5 business days.', '10 targets meet all qualification fields.', '10 dated prospect records with qualification evidence.', '3 qualified replies or 2 interviews after the full batch and follow-up.', '2 interviews with recent incident, alternative, and exact language.', 'At least 2 targets score 9/12 or higher for urgency.', 'A CONTINUE, NARROW, REVISE, or PAUSE memo names counts and one owner.', 'Two recurring alternatives and switching barriers recorded.', 'One buyer-ready brief with scope, exclusions, price, and next step.', 'Every objection is classified from at least 3 conversations.',
    'One qualified prospect receives a transparent scope, price, and commitment request.', 'Site copy, offer, price boundary, and CTA exactly match canonical fields.', 'All activity has an evidence-ledger entry with exact outcome.', '3 qualified conversations, 1 transparent ask, and <=6 founder hours planned.', 'One completed dry run reveals no unknown scope, permissions, capacity, or cost.', 'At least 3 transparent paid invitations sent to qualified prospects.', 'Every paid invitation has one classified outcome and dated next action.', 'All interested prospects receive one value-specific follow-up.', 'Every open opportunity is closed, continued, referred, or stopped with evidence.', 'One accepted scope has buyer inputs, owner, timeline, and exclusions.',
    'Delivery is complete with buyer feedback, founder hours, and direct cost recorded.', 'One feedback request is sent after delivery or a respectful stop is recorded.', 'Scoreboard has verified, inferred, and test items with sources.', 'One constraint and one changed variable are documented.', 'Founder labor plus direct cost remains within the gross-margin guardrail.', 'Second test names one hypothesis, constant fields, batch, and stop rule.', 'Second batch has a complete message, follow-up, and results.', 'Revenue, founder minutes, and direct cost are calculated from ledger entries.', 'Decision memo names behavioral evidence, unknown, and next bounded test.', 'Next sprint has 3 milestones, 5 actions, and an observable stop rule.'
  ];
  const nextDays = blueprint.dailyCalendar.map((legacy, index) => {
    const day = index + 1;
    const { content, sourceIds: channelSourceIds, channel: dayChannel } = dayContent(day, blueprint, verdict);
    const assetSlug = assetNames[index].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const assetId = day === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(day).padStart(2, '0')}-${assetSlug}-v1`;
    const dayBuyerTarget = { ...buyerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-qualified-buyers-v1` };
    const dayOfferTarget = { ...offerTarget, targetId: `target-day-${String(day).padStart(2, '0')}-offer-v1` };
    const dayChannelTarget = dayChannel ? { ...baseTarget, targetId: `target-day-${String(day).padStart(2, '0')}-verified-channel-v1` } : undefined;
    const internal = !publicRouteDays.has(day);
    const targets: ExecutionTarget[] = internal
      ? [{ ...evidenceTarget, targetId: `target-day-${String(day).padStart(2, '0')}-evidence-v1` }, ...(day === 1 || day === 9 || day === 10 || day === 15 || day === 20 || day === 21 || day === 25 || day === 26 ? [dayOfferTarget] : [])]
      : [dayBuyerTarget, dayOfferTarget, ...(day === 12 ? [{ ...launchSiteTarget, targetId: `target-day-${String(day).padStart(2, '0')}-launch-site-v1` }] : []), ...(dayChannelTarget ? [dayChannelTarget] : [])];
    const targetIds = targets.map(target => target.targetId);
    const fields = [...content.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map(match => match[1]);
    const asset: DeliverableAsset = {
      assetId, dayNumber: day, type: 'finished_execution_asset', title: assetNames[index], finishedContent: content,
      contentType: day === 3 || day === 28 ? 'text/csv' : 'text/markdown',
      personalizationFields: [...new Set(fields)].map(name => ({ name, description: `Founder-supplied ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, required: true })),
       usageInstructions: internal ? 'Open this finished internal operating document, enter only observed evidence, then save the working copy. The canonical Blueprint remains unchanged.' : 'Open the finished asset, replace only declared fields when present, use it with the named public or buyer target, and record the specified evidence.',
       targetChannel: !internal && dayChannel ? dayChannel.community : undefined, targetIds, capabilities: { copyReady: true, editable: true, downloadable: true, openable: true },
       evidenceExpected: internal ? ['Dated ledger or delivery record', 'Count or calculated value', 'Exact evidence reference', 'Next owner and date'] : ['Named target', 'Dated action', 'Exact response or observed behavior', 'Next action'], version: '1.0.0',
       lineage: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, sourceIds: internal ? [] : channelSourceIds, sourceAssetIds: (assetParents[day] || []).map(parent => parent === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(parent).padStart(2, '0')}-${assetNames[parent - 1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-v1`) }
    };
    const packet: DailyExecutionPacket = {
      dayNumber: day, title: titles[index], objective: objectives[index],
      whyThisDayExists: legacy.whyItMatters || `This is the next smallest action that can reduce uncertainty without broad building.`,
      targets,
      actions: [{ actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1, instruction: `Use “${asset.title}” with the named target and record the result before interpreting it.`, quantity: day === 4 || day === 10 || day === 16 || day === 27 ? '10 qualified targets' : '1 completed operating action', targetIds, assetIds: [assetId], evidenceExpected: asset.evidenceExpected }],
      assets: [asset], expectedOutcome: `${asset.title} is used and an evidence record exists.`,
      successThreshold: thresholds[index],
      failureThreshold: day === 1 ? '0 qualified conversations or commitments after the full batch.' : day === 4 ? 'Zero qualified replies after the full batch and follow-up.' : `The stated Day ${day} threshold is not met with dated evidence.`,
       evidenceToCapture: asset.evidenceExpected, branchRules: branches(day, thresholds[index], day === 1 ? '0 qualified conversations or commitments after the full batch.' : day === 4 ? 'Zero qualified replies after the full batch and follow-up.' : `no dated evidence satisfies ${thresholds[index]}`), estimatedMinutes: minutes(day),
      completionDefinition: `Day ${day} is complete only when “${asset.title}” is used with its named target and the evidence ledger contains the exact outcome, count, source, and next action.`
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
