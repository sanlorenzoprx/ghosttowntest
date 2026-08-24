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
    16: `# Paid Pilot Invitation\n\nSubject: a bounded ${blueprint.offer.offerName} pilot\n\nHi {{firstName}} — based on what you described about ${problem}, I can offer this fixed-scope validation-stage pilot: ${q1.offer}. The test price is ${price}.\n\nIncluded deliverables:\n${blueprint.foundingCustomerPilotBrief.deliverables.map(item => `- ${item}`).join('\n')}\n\nExplicit boundary: ${blueprint.foundingCustomerPilotBrief.proofBoundary}\n\nWould you like the one-page brief and a 15-minute scope check? I can do {{timeOptionOne}} or {{timeOptionTwo}}.\n\nIf it is not relevant, a short no or current alternative is useful and I will close the loop.`,
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
  // Every finished asset carries the same canonical commercial context.  This
  // is deliberate: a downloaded worksheet must not lose the customer,
  // problem, offer, or price that makes the execution decision intelligible.
  const canonicalContext = `Canonical commercial context\nCustomer: ${customer}\nProblem: ${problem}\nOffer: ${blueprint.offer.offerName} — ${blueprint.offer.oneSentencePromise}\nPrice boundary: ${price}`;
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
  const customer = q1.customer;
  const problem = q1.problem;
  const offer = blueprint.offer.offerName;
  const price = blueprint.firstRevenuePath.firstPrice;
  const requested = q1.commitment;
  const q1Batch = `${verdict?.verdictDecisionV2?.cheapestFalsification.target || ''} ${q1.firstAction}`.match(/\b([1-9]\d?)\b/);
  const batchSize = q1Batch ? Number(q1Batch[1]) : Math.max(1, blueprint.firstRevenuePath.minimumQualifiedAsks || 10);
  return [
  ['Send the exact Q1 discovery message to each selected buyer before changing the offer.', `${batchSize} qualified targets matching ${customer}; record all ${batchSize}; PASS requires the Q1 commitment threshold within the validation window.`, [`Buyer name and qualification fields for all ${batchSize}`, 'Dated first-message record for the full batch', 'Qualified conversation or commitment count']],
  ['Apply every qualification field before a prospect enters the active batch.', `${batchSize} candidate targets matching ${customer} reviewed; each must show a recent instance of ${problem}, a current alternative, and decision authority.`, [`${batchSize} completed qualification records`, 'Recent incident and current alternative per buyer', 'Authority or influence note per buyer']],
  ['Create the working prospect tracker from the qualified buyers only.', `${batchSize} qualified buyer records with owner, next step, and follow-up date.`, ['Tracker export or screenshot', `${batchSize} dated buyer rows`, 'Qualification source for each row']],
  ['Send the finished discovery message and one permitted follow-up to the qualified batch.', `${batchSize} qualified buyers; one first message each and one follow-up only after 3 business days.`, [`Send dates for all ${batchSize}`, 'Reply text or no-response outcome', 'Follow-up date and stop-rule compliance']],
  ['Run problem interviews without presenting the pilot before the problem is understood.', '2 qualified buyer interviews of 15 minutes each.', ['Dated interview notes', 'Last incident and current alternative', 'Exact buyer language and authority signal']],
  ['Score urgency from observed interview evidence before making a price ask.', '2 scored buyers; identify any buyer scoring 9/12 or higher.', ['Completed scorecards', 'Component scores and rationale', 'Named high-urgency buyer or no-ask decision']],
  ['Write the Week 1 decision from the recorded batch rather than optimism.', `One memo using all ${batchSize} outreach outcomes and the two interview records.`, ['Counts for messages, replies, and interviews', 'One exact buyer quote', 'Named constraint, decision, owner, and due date']],
  ['Map the alternatives buyers actually name and the friction to switching.', '2 qualified buyers with a named alternative and barrier each.', ['Alternative names', 'Exact cost or consequence language', 'Switching barrier by buyer']],
  ['Turn the evidence into one bounded pilot brief before any price presentation.', `1 buyer-ready ${offer} brief with scope, exclusions, ${price} price boundary, and next step.`, ['Completed pilot brief', 'Scope and exclusion confirmation', 'Price boundary and buyer-ready next step']],
  ['Ask qualified buyers about the canonical offer and price boundary; do not ask generic respondents.', `3 qualified buyer price conversations matching ${customer}; one transparent ${offer} and ${price} presentation in each.`, ['Three qualified buyer identities', 'Exact price words and objection category', 'Offer/price presentation and dated next step']],
  ['Use the completed conversation guide to make one transparent commitment request.', '1 qualified buyer receives the canonical scope, price boundary, and commitment request.', ['Buyer qualification record', 'Exact scope and price presented', 'Commitment response and follow-up date']],
  ['Compare the existing validation Launch Site to the canonical commercial ledger before sharing it.', '1 URL and source-code review; every customer, problem, offer, price, and CTA claim matches or is logged as changed.', ['Validation-site URL', 'Source-code or rendered-copy capture', 'Each changed claim and correction decision']],
  ['Record every observed action in the evidence ledger before interpreting results.', 'All completed actions from Days 1-12 have a dated ledger entry.', ['Ledger rows for each action', 'Exact response or observed behavior', 'Evidence source and next action']],
  ['Choose one Week 2 change from behavior, not multiple simultaneous edits.', '1 review with 3 qualified conversations, 1 transparent ask, and founder plan at or below 6 hours.', ['Conversation and ask counts', 'Founder-hours plan', 'One variable, evidence, owner, and date']],
  ['Walk a qualified buyer scenario through payment to first useful result manually.', '1 dry run covering scope, permission, capacity, direct cost, and delivery handoff.', ['Dry-run timestamp and scenario', 'Unknowns found or explicit none', 'Owner for each resolved gap']],
  ['Send the paid pilot invitation only to qualified buyers with the canonical scope and price.', `3 qualified prospects matching ${customer} receive one ${offer} invitation at ${price} with the requested commitment: ${requested}.`, ['Three qualified recipient records', 'Invitation send dates and exact price', 'Accept, decline, delay, or no-response outcome']],
  ['Classify each paid ask without inflating pipeline status.', 'Every paid invitation sent has one dated outcome classification.', ['Prospect and qualification status', 'Outcome and exact objection', 'Commitment/revenue field and next date']],
  ['Send one value-specific follow-up only where a qualified buyer has an open next step.', 'One follow-up for each interested qualified prospect; no repeated chase sequence.', ['Interested buyer identity', 'Specific prior problem referenced', 'Follow-up date and reply or stop result']],
  ['Close, continue, refer, or stop each open qualified opportunity using the evidence ledger.', 'Every open qualified opportunity has one status and dated next action.', ['Opportunity status list', 'Dominant constraint with exact evidence', 'Owner and date for every continuation']],
  ['Confirm written scope and buyer responsibilities before any manual delivery begins.', '1 accepted-scope record with buyer, exclusions, price, inputs, timeline, and approval contact.', ['Accepted scope record', 'Buyer inputs and approval contact', 'Price/commitment and delivery date']],
  [`Deliver the bounded ${offer} and review the buyer commitment without unsupported outcome claims.`, '1 fulfillment run with completed scope, feedback request, founder hours, and direct cost.', ['Delivery checklist', 'Buyer feedback or delivery receipt', 'Founder labor and direct-cost fields']],
  ['Ask a delivered buyer for useful feedback, renewal, referral, or a respectful no.', '1 delivered buyer receives one feedback request.', ['Delivered buyer identity', 'Feedback/referral/renewal response', 'Respectful stop or next-step date']],
  ['Separate verified behavior, inference, and the next test in the scoreboard.', '1 scoreboard with at least one item in VERIFIED, INFERRED, and TEST.', ['Verified source references', 'Inference label and rationale', 'Next test and owner']],
  ['Revise only the constraint supported by the evidence scoreboard.', '1 documented constraint and exactly 1 changed variable.', ['Constraint and supporting evidence', 'Unchanged controls', 'Success and failure thresholds with test date']],
  ['Calculate whether manual fulfillment can support the canonical price before acquiring more buyers.', '1 SOP with labor minutes, direct cost, price, and gross-margin result.', ['Labor minutes by step', 'Direct-cost field by step', 'Price, margin calculation, and scale/stop decision']],
  ['Design the next test so exactly one variable changes against the same customer and problem.', `1 plan with ${batchSize} qualified buyers, one changed variable, constants, and stop rule.`, ['Hypothesis and changed variable', `${batchSize}-buyer batch definition`, 'Success, failure, and stop rule']],
  ['Run the second-test message sequence without changing a second variable mid-batch.', `${batchSize} qualified buyers receive the controlled message and permitted follow-up.`, [`${batchSize} send records`, 'Controlled message version', 'Reply/outcome ledger and stop-rule result']],
  ['Calculate revenue, founder time, and direct cost from dated ledger entries.', '1 complete unit-economics row using actual commitments, revenue, minutes, and costs.', ['Revenue or zero-revenue evidence', 'Founder-minute total', 'Direct-cost total and calculation source']],
  ['Choose the allowed commercial decision from the full evidence ledger.', '1 decision memo naming behavior, unknown, constraint, and next bounded test.', ['Behavioral count and evidence references', 'Largest remaining unknown', 'Allowed decision and rationale']],
  ['Write the next sprint or a stop record without treating inference as proof.', '1 bounded sprint with 3 milestones, 5 actions, and one observable stop rule.', ['Decision evidence references', 'Three milestones and five actions', 'Observable stop rule and owner']]
  ] as const;
}

function rationale(customer: string, problem: string, offer: string, price: string, objective: string) {
  return `For ${customer} facing ${problem}, use ${offer} at ${price}; ${objective}`;
}

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
  const decision = sourceDecision(blueprint, verdict);
  const q1Batch = `${verdict?.verdictDecisionV2?.cheapestFalsification.target || ''} ${decision.firstAction}`.match(/\b([1-9]\d?)\b/);
  const batchSize = q1Batch ? Number(q1Batch[1]) : Math.max(1, blueprint.firstRevenuePath.minimumQualifiedAsks || 10);
  const offerTarget: ExecutionTarget = { targetId: 'target-canonical-offer-v1', kind: 'offer', name: blueprint.offer.offerName, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Use the canonical offer, scope, price boundary, and proof boundary only.', minimumCount: 1, excluded: ['Unapproved discounts', 'Unsupported guarantees'], sourceIds: [] };
  const buyerTarget: ExecutionTarget = { targetId: 'target-qualified-buyer-batch-v1', kind: 'qualified_buyer_batch', name: blueprint.executiveDecision.recommendedInitialCustomer, identityStatus: 'founder_must_select', selectionOrQualificationRule: 'Select 10 people with a recent concrete problem, current alternative, and potential decision authority.', minimumCount: 10, excluded: ['Friends giving hypothetical feedback', 'Broad or anonymous traffic'], sourceIds: [] };
  const evidenceTarget: ExecutionTarget = { targetId: 'target-evidence-ledger-v1', kind: 'evidence_set', name: 'Recorded execution evidence', identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Use only dated ledger entries, exact buyer language, commitments, revenue, hours, and costs.', minimumCount: 1, excluded: ['Hypothetical interest', 'Unrecorded activity'], sourceIds: [] };
  const launchSiteTarget: ExecutionTarget = { targetId: 'target-launch-site-v1', kind: 'launch_site', name: blueprint.launchSite.offer.headline || blueprint.landingPageCopy.headline, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Open the founder-owned validation Launch Site and compare only the canonical offer, price, CTA, and recorded claims.', minimumCount: 1, excluded: ['A new public site', 'Unrecorded claims'], sourceIds: [] };
  const fulfillmentTarget: ExecutionTarget = { targetId: 'target-fulfillment-run-v1', kind: 'fulfillment_run', name: `${blueprint.offer.offerName} manual fulfillment`, identityStatus: 'canonical_internal', selectionOrQualificationRule: 'Use an accepted written scope, buyer inputs, price boundary, and the manual fulfillment plan only.', minimumCount: 1, excluded: ['Unaccepted scope', 'Unsupported guarantee', 'Unrecorded direct cost'], sourceIds: [] };
  const existingContactTarget: ExecutionTarget = { targetId: 'target-delivered-buyer-v1', kind: 'existing_contact', name: 'Delivered qualified pilot buyer', identityStatus: 'founder_supplied', selectionOrQualificationRule: 'Use only a buyer who received the bounded pilot or record a respectful stop when no delivery occurred.', minimumCount: 1, excluded: ['Unqualified contact', 'Undelivered prospect'], sourceIds: [] };
  const objectives = [
    'Use the Q1 first action to create the first commitment evidence.', `Select only buyers matching ${decision.customer} with recent evidence of ${decision.problem} and decision authority.`, `Create a trackable batch of ${batchSize} qualified prospects.`, 'Send a finished discovery sequence to the qualified batch.', 'Learn recent problem behavior without pitching.', 'Rank urgency before making the paid ask.', 'Decide whether access, customer, or opening is the largest Week 1 constraint.', 'Compare named current alternatives and switching friction.', `Prepare a bounded ${blueprint.offer.offerName} pilot brief before presenting price.`, 'Capture price, trust, scope, and timing objections verbatim.',
    'Make a transparent scope-and-price conversation possible.', 'Verify the existing validation site carries the canonical offer and CTA.', 'Make every outreach and conversation observable in the ledger.', 'Choose the one evidence-backed Week 2 offer or fulfillment change.', 'Prove the founder can take a payment through first useful result manually.', 'Ask qualified prospects to buy the bounded pilot.', 'Classify every paid ask outcome without inventing pipeline status.', 'Follow up with a specific useful reason and dated next step.', 'Choose whether to close, continue, refer, or stop each open opportunity.', 'Confirm written scope and buyer responsibilities before delivery.',
    `Deliver the bounded ${blueprint.offer.offerName} and review commitment plus economics.`, 'Ask for evidence-backed feedback, renewal, referral, or a respectful no.', 'Separate verified behavior from inference and next tests.', 'Change exactly one supported constraint.', 'Check whether manual fulfillment is viable before acquiring more buyers.', 'Design a controlled second test with one changed variable.', 'Run the second-test batch without changing another variable.', 'Calculate revenue, time, and direct-cost evidence.', 'Select the allowed decision from accumulated behavioral evidence.', 'Write the bounded next sprint or an explicit stop record.'
  ];
  const thresholds = [
    blueprint.firstRevenuePath.successThreshold, `${batchSize} targets meet all qualification fields.`, `${batchSize} dated prospect records with qualification evidence.`, '3 qualified replies or 2 interviews after the full batch and follow-up.', '2 interviews with recent incident, alternative, and exact language.', 'At least 2 targets score 9/12 or higher for urgency.', 'A CONTINUE, NARROW, REVISE, or PAUSE memo names counts and one owner.', 'Two recurring alternatives and switching barriers recorded.', 'One buyer-ready brief with scope, exclusions, price, and next step.', 'Every objection is classified from at least 3 conversations.',
    'One qualified prospect receives a transparent scope, price, and commitment request.', 'Site copy, offer, price boundary, and CTA exactly match canonical fields.', 'All activity has an evidence-ledger entry with exact outcome.', '3 qualified conversations, 1 transparent ask, and <=6 founder hours planned.', 'One completed dry run reveals no unknown scope, permissions, capacity, or cost.', 'At least 3 transparent paid invitations sent to qualified prospects.', 'Every paid invitation has one classified outcome and dated next action.', 'All interested prospects receive one value-specific follow-up.', 'Every open opportunity is closed, continued, referred, or stopped with evidence.', 'One accepted scope has buyer inputs, owner, timeline, and exclusions.',
    'Delivery is complete with buyer feedback, founder hours, and direct cost recorded.', 'One feedback request is sent after delivery or a respectful stop is recorded.', 'Scoreboard has verified, inferred, and test items with sources.', 'One constraint and one changed variable are documented.', 'Founder labor plus direct cost remains within the gross-margin guardrail.', `Second test names one hypothesis, constant fields, a ${batchSize}-buyer batch, and stop rule.`, 'Second batch has a complete message, follow-up, and results.', 'Revenue, founder minutes, and direct cost are calculated from ledger entries.', 'Decision memo names behavioral evidence, unknown, and next bounded test.', 'Next sprint has 3 milestones, 5 actions, and an observable stop rule.'
  ];
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
      assetId, dayNumber: day, type: 'finished_execution_asset', title: assetNames[index], finishedContent: content,
      contentType: day === 3 || day === 28 ? 'text/csv' : 'text/markdown',
      personalizationFields: [...new Set(fields)].map(name => ({ name, description: `Founder-supplied ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, required: true })),
       usageInstructions: 'Open the finished asset, use it only with its declared canonical target, record the listed evidence, and save the working copy without changing the canonical Blueprint.',
       targetIds, capabilities: { copyReady: true, editable: true, downloadable: true, openable: true },
       evidenceExpected: [...evidenceExpected], version: '1.0.0',
       lineage: { blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId, sourceIds: [], sourceAssetIds: (assetParents[day] || []).map(parent => parent === 4 ? 'asset-day-04-discovery-sequence-v1' : `asset-day-${String(parent).padStart(2, '0')}-${assetNames[parent - 1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-v1`) }
    };
    const packet: DailyExecutionPacket = {
      dayNumber: day, title: titles[index], objective: objectives[index],
      whyThisDayExists: rationale(blueprint.offer.targetCustomer, blueprint.offer.painfulProblem, `${blueprint.offer.offerName}: ${blueprint.offer.oneSentencePromise}`, blueprint.firstRevenuePath.firstPrice, objectives[index]),
      targets,
      actions: [{ actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1, instruction: `Use “${asset.title}” with the named target and record the result before interpreting it.`, quantity: day === 4 || day === 10 || day === 16 || day === 27 ? '10 qualified targets' : '1 completed operating action', targetIds, assetIds: [assetId], evidenceExpected: asset.evidenceExpected }],
      assets: [asset], expectedOutcome: `${asset.title} is used and an evidence record exists.`,
      successThreshold: thresholds[index],
      failureThreshold: day === 1 ? '0 qualified conversations or commitments after the full batch.' : day === 4 ? 'Zero qualified replies after the full batch and follow-up.' : `The stated Day ${day} threshold is not met with dated evidence.`,
       evidenceToCapture: asset.evidenceExpected, branchRules: branches(day, thresholds[index], day === 1 ? '0 qualified conversations or commitments after the full batch.' : day === 4 ? 'Zero qualified replies after the full batch and follow-up.' : `no dated evidence satisfies ${thresholds[index]}`), estimatedMinutes: minutes(day),
      completionDefinition: `Day ${day} is complete only when “${asset.title}” is used with its named target and the evidence ledger contains the exact outcome, count, source, and next action.`
    };
    // Action quantities and evidence must describe the actual work of this day,
    // rather than inherit a calendar-wide template.
    packet.actions = [{
      actionId: day === 4 ? 'action-day-04-send-discovery-v1' : id(day, 'action'), sequence: 1,
      instruction, quantity, targetIds, assetIds: [assetId], evidenceExpected: [...evidenceExpected]
    }];
    packet.evidenceToCapture = [...evidenceExpected];
    packet.completionDefinition = `Day ${day} is complete only when ${quantity.toLowerCase()} is completed, the finished “${asset.title}” is used, and the day-specific evidence is recorded in the evidence ledger.`;
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
