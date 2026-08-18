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
  base.offer.desiredOutcome = 'A prioritized view of checkout accessibility friction before the next support or abandoned-purchase incident.';
  base.offer.deliverables = [
    { name: 'Prioritized checkout accessibility issue list', description: 'Ranked findings from one active checkout path.' },
    { name: 'Annotated checkout-path evidence record', description: 'Observed friction and the current alternative.' },
    { name: 'Written scope and exclusion summary', description: 'Bounded work, buyer inputs, and no-guarantee boundary.' },
    { name: 'Thirty-minute review of findings and next step', description: 'Review the prioritized findings with the qualified buyer.' }
  ];
  base.offer.deliveryMethod = 'Manual review of one active ecommerce checkout path.';
  base.offer.timeToFirstUsefulResult = 'Five business days after buyer inputs are received.';
  base.offer.buyerResponsibilities = ['Provide one active checkout path and required access', 'Confirm scope and attend a 30-minute review'];
  base.offer.exclusions = ['No broad monitoring', 'No integrations or automation', 'No compliance, conversion, or revenue guarantee'];
  base.offer.lowerTestBoundary = '$300';
  base.offer.upperTestBoundary = '$500';
  base.offer.pricingRationale = 'A $300-$500 fixed-scope range tests willingness to pay for one bounded checkout accessibility audit before any scale decision.';
  base.offer.objections = [
    { objection: 'The scope may not fit our checkout.', response: 'Confirm one checkout path and written exclusions before commitment.' },
    { objection: 'The $300-$500 price needs context.', response: 'Compare the bounded findings and review against the recent support or checkout friction.' },
    { objection: 'We already use QA scans.', response: 'Record what the current alternative misses in the active checkout path.' },
    { objection: 'We need proof.', response: 'State the validation-stage proof boundary; findings are not a conversion guarantee.' },
    { objection: 'Timing is difficult.', response: 'Record the recent trigger and agree a dated scope review or respectful no.' }
  ];
  base.offer.riskReversal = 'Validation-stage audit findings are separated from recommendations; no outcome is guaranteed.';
  base.positioning.firstTargetCustomer = base.offer.targetCustomer;
  base.positioning.positioningStatement = `For ${base.offer.targetCustomer}: ${base.offer.oneSentencePromise}`;
  base.positioning.triggerEvents = ['A recent customer-support issue during checkout', 'A checkout accessibility barrier observed in QA or support', 'A conversion-risk review before a campaign'];
  base.positioning.currentAlternatives = ['Sporadic QA and generic scans'];
  base.positioning.alternativeWeaknesses = ['Sporadic QA and generic scans can miss checkout accessibility friction until support work or abandoned purchase risk appears.'];
  base.positioning.buyerLanguage = ['We need to know why a customer could not complete checkout.', 'We need a bounded prioritized audit, not broad monitoring.'];
  base.positioning.actionTriggers = ['A recent checkout accessibility incident', 'Support work tied to checkout friction'];
  base.positioning.rejectionReasons = ['No recent checkout friction', 'No buyer authority', 'A request for unbounded monitoring or guarantees'];
  base.positioning.notFor = ['Teams without active checkout traffic', 'Teams seeking broad monitoring, integrations, automation, or guaranteed conversion outcomes'];
  base.positioning.differentiator = 'A fixed-scope manual audit of one checkout path with prioritized findings, explicit exclusions, and a 30-minute review.';
  base.executiveDecision = {
    ...base.executiveDecision,
    originalIdea: 'Fixed-scope checkout accessibility audit for one active ecommerce checkout path.',
    verdict: 'WORTH TESTING only as a bounded evidence-seeking paid pilot.',
    strongestOpportunity: base.offer.oneSentencePromise,
    biggestRisk: 'Qualified ecommerce buyers may not see recent checkout accessibility friction as worth a $300-$500 commitment.',
    recommendedInitialCustomer: base.offer.targetCustomer,
    validationObjective: 'Determine whether ten qualified independent ecommerce stores will discuss or commit to the fixed-scope checkout accessibility audit within five business days.',
    continueEvidence: ['Three qualified conversations or commitments from ten buyers.', 'At least one transparent paid pilot commitment.', 'Manual fulfillment labor and direct cost remain viable.'],
    stopEvidence: ['No qualified buyer reports recent checkout accessibility friction.', 'No qualified buyer responds after the controlled batch and follow-up.', 'Manual fulfillment exceeds the $300-$500 economics guardrail.']
  };
  base.firstRevenuePath = {
    ...base.firstRevenuePath,
    firstOfferFormat: 'Fixed-scope checkout accessibility audit', firstBuyer: base.offer.targetCustomer,
    firstChannel: 'Founder-selected qualified ecommerce buyer batch', firstAsk: 'Ask for a paid $300-$500 checkout accessibility audit pilot.',
    firstPrice: '$300-$500', commitmentMethod: 'Paid pilot commitment after a transparent scope conversation',
    successThreshold: 'Three qualified conversations or commitments from ten qualified ecommerce stores within five business days.'
  };
  base.launchCard48Hour = {
    ...base.launchCard48Hour, firstCustomer: base.offer.targetCustomer, firstOffer: base.offer.oneSentencePromise,
    exactFirstMessage: 'Hi {{firstName}} — I am researching recent checkout accessibility friction for independent ecommerce teams. What workaround does your team use when a customer cannot complete checkout?',
    firstCommitmentRequest: 'Would you discuss a fixed-scope $300-$500 checkout accessibility audit pilot?'
  };
  base.foundingCustomerPilotBrief = {
    ...base.foundingCustomerPilotBrief, problem: base.offer.painfulProblem,
    scope: 'Audit one active ecommerce checkout path for accessibility friction and prioritize findings.',
    deliverables: ['Prioritized checkout accessibility issue list', 'Thirty-minute review of findings and next step'],
    timeline: 'Five business days after buyer inputs are received.', price: '$300-$500 fixed-scope pilot',
    proofBoundary: 'Validation-stage audit findings; no conversion, compliance, or revenue outcome is guaranteed.',
    nextStep: 'Confirm scope, buyer inputs, price, and a review time with one qualified ecommerce buyer.'
  };
  base.offerConversationGuide = {
    ...base.offerConversationGuide,
    opening: 'I am learning how independent ecommerce teams handle recent checkout accessibility friction.',
    problemConfirmation: ['What happened the last time a customer could not complete checkout?', 'What workaround did the team use?'],
    offerExplanation: base.offer.oneSentencePromise,
    scopeConfirmation: ['One active checkout path', 'Prioritized findings and a 30-minute review', 'No broad monitoring, integration, or outcome guarantee'],
    pricePresentation: '$300-$500 for the fixed-scope checkout accessibility audit pilot.',
    objectionCapture: ['What part of the scope, price, timing, trust, or fit is difficult?', 'What exact alternative would you use instead?'],
    commitmentRequest: 'Would a fixed-scope $300-$500 pilot be a useful next step?',
    followUpAgreement: 'Record a dated next step or a respectful no.'
  };
  base.landingPageCopy = {
    metadataTitle: 'Fixed-Scope Checkout Accessibility Audit | Ecommerce pilot', metadataDescription: 'A $300-$500 fixed-scope checkout accessibility audit for independent ecommerce teams with active checkout traffic.', socialDescription: 'Find checkout accessibility friction before customers report it.', targetCustomerCallout: base.offer.targetCustomer,
    headline: 'Find checkout accessibility friction before customers report it.', subheadline: 'A fixed-scope checkout accessibility audit for independent ecommerce teams with active checkout traffic.', problemSection: 'Checkout accessibility friction creates support work and abandoned purchase risk.', currentAlternativeSection: 'Sporadic QA and generic scans leave checkout accessibility friction undiscovered.', offerDescription: base.offer.oneSentencePromise,
    deliverables: ['Prioritized checkout accessibility issue list', 'Annotated checkout-path evidence record', 'Written scope and exclusion summary', 'Thirty-minute review of findings and next step'],
    howItWorks: [{ step: '1. Confirm fit', description: 'Confirm a recent checkout accessibility incident, current alternative, and decision authority.' }, { step: '2. Approve scope', description: 'Approve one active checkout path, written exclusions, and the $300-$500 price boundary.' }, { step: '3. Receive findings', description: 'Receive prioritized checkout accessibility findings within five business days after buyer inputs.' }, { step: '4. Review evidence', description: 'Review findings, labor, direct cost, and the bounded next decision.' }],
    expectedTimeline: 'Five business days after buyer inputs are received.', pricePresentation: '$300-$500 fixed-scope pilot; final price is tested only with qualified buyers.',
    faq: [{ question: 'Who is this for?', answer: 'Independent ecommerce teams with active checkout traffic and a recent accessibility friction incident.' }, { question: 'What do I receive?', answer: 'A prioritized issue list, checkout-path evidence record, written scope, and a 30-minute review.' }, { question: 'What is excluded?', answer: 'Broad monitoring, integrations, automation, and conversion, compliance, or revenue guarantees.' }, { question: 'What does it cost?', answer: '$300-$500 for one fixed-scope checkout accessibility audit pilot.' }, { question: 'Do we replace our current QA process?', answer: 'No. The audit records where sporadic QA and generic scans leave checkout accessibility friction unresolved.' }, { question: 'Is a result guaranteed?', answer: 'No. This is a validation-stage audit with bounded deliverables and no compliance, conversion, or revenue guarantee.' }],
    proofPlaceholders: ['Validation-stage evidence only; no fabricated proof or outcome claim.'], riskReversal: 'Any missing listed deliverable is completed before the bounded pilot is closed.', primaryCallToAction: 'Request a checkout accessibility audit scope check', secondaryCallToAction: 'Ask a checkout accessibility scope question', thankYouPageCopy: 'Thank you. The next step is a fit review of your recent checkout accessibility friction, scope, buyer inputs, and price boundary.', confirmationEmailSubject: 'Your checkout accessibility audit scope request', confirmationEmailBody: 'Your request is not an acceptance or charge. We will confirm one checkout path, recent friction, scope, exclusions, $300-$500 price boundary, and review time.'
  };
  base.launchSite = {
    ...base.launchSite,
    site: { ...base.launchSite.site, businessName: 'Fixed-Scope Checkout Accessibility Audit' },
    offer: { offerName: base.offer.offerName, targetCustomer: base.offer.targetCustomer, headline: base.landingPageCopy.headline, subheadline: base.landingPageCopy.subheadline, primaryOutcome: 'Prioritized checkout accessibility findings for one active checkout path.', price: '$300-$500', priceExplanation: base.landingPageCopy.pricePresentation, deliveryMethod: 'Manual audit of one active ecommerce checkout path.', timeToFirstValue: 'Five business days after buyer inputs are received.', callToAction: base.landingPageCopy.primaryCallToAction, secondaryCallToAction: base.landingPageCopy.secondaryCallToAction },
    problem: { summary: base.landingPageCopy.problemSection, painPoints: ['Checkout accessibility friction', 'Support work and abandoned purchase risk'] },
    solution: { summary: base.offer.oneSentencePromise, deliverables: base.landingPageCopy.deliverables, exclusions: base.offer.exclusions },
    positioning: { currentAlternatives: ['Sporadic QA and generic scans'], differentiator: base.positioning.differentiator, idealFor: [base.offer.targetCustomer], notFor: base.positioning.notFor },
    proof: { status: 'validation-stage', claimsAllowed: ['Bounded manual audit scope and listed deliverables only.'], proofPlaceholders: ['Record buyer evidence before making an outcome claim.'] },
    riskReversal: { type: 'deliverable', text: base.landingPageCopy.riskReversal }, faq: base.landingPageCopy.faq, leadCapture: { ...base.launchSite.leadCapture, buttonLabel: 'Request checkout audit scope check' }
  };
  base.sources = base.sources.map((source, index) => ({ ...source, title: `Ecommerce checkout accessibility source ${index + 1}`, publisher: 'Checkout accessibility research fixture', supports: [`checkout-channel-${index + 1}`] }));
  base.customerAccessPack.initialCustomerProfile = base.offer.targetCustomer;
  base.customerAccessPack.buyerTriggerEvents = ['Recent checkout accessibility friction', 'Customer support work linked to checkout completion'];
  base.customerAccessPack.searchPhrases = ['independent ecommerce checkout accessibility', 'checkout support accessibility friction', 'ecommerce checkout QA accessibility'];
  base.customerAccessPack.thirtyDayContactSchedule = base.customerAccessPack.thirtyDayContactSchedule.map(item => ({ ...item, action: 'Contact only qualified independent ecommerce buyers about recent checkout accessibility friction.' }));
  base.customerAccessPack.responseTrackingColumns = ['Date', 'Qualified ecommerce buyer', 'Recent checkout incident', 'Current alternative', 'Exact response', 'Price objection', 'Commitment evidence', 'Next action'];
  base.customerAccessPack.channels = base.customerAccessPack.channels.map((channel, index) => ({ ...channel, channelId: `checkout-channel-${index + 1}`, community: `Independent ecommerce checkout community ${index + 1}`, relevance: 'Independent ecommerce operators discuss checkout support friction and conversion risk.', usefulTopic: 'Reducing checkout accessibility friction without broad monitoring.', firstAction: 'Read current public discussion before contributing a useful accessibility observation.', sourceIds: [`source-${index}`] }));
  base.customerAccessPack.publicExpertsAndPartners = base.customerAccessPack.publicExpertsAndPartners.map((person, index) => ({ ...person, name: `Checkout accessibility organizer ${index + 1}`, role: 'Ecommerce accessibility organizer', relevance: 'Public ecommerce accessibility educator.', sourceIds: [`source-${index}`] }));
  base.customerAccessPack.helpfulPosts = base.customerAccessPack.helpfulPosts.map((post, index) => ({ ...post, title: `Checkout accessibility note ${index + 1}`, body: 'Independent ecommerce checkout teams can document the last support incident, the accessibility barrier, and the current workaround before choosing a fixed-scope audit. This finished fixture post is specific to checkout accessibility, uses no unverified outcome claim, and asks the operator to record a dated customer observation before presenting the offer.', closingQuestion: 'Which checkout friction incident did your team last have to resolve?' }));
  base.customerAccessPack.outreachScripts = base.customerAccessPack.outreachScripts.map((script, index) => ({ ...script, title: `Checkout accessibility outreach ${index + 1}`, message: `Hi {{firstName}} — I am researching recent checkout accessibility friction for independent ecommerce teams. What current workaround does your team use when a customer cannot complete checkout?`, purpose: 'Learn recent checkout accessibility behavior before a bounded audit offer.' }));
  const output = upgradeGhostTownLaunchBlueprintToV21(base, order, verdict);
  output.foundingCustomerPilotBrief = {
    problem: 'Checkout accessibility friction/support', scope: 'Audit one active ecommerce checkout path for accessibility friction and prioritize findings.',
    deliverables: ['Prioritized checkout accessibility issue list', 'Annotated checkout-path evidence record', 'Written scope and exclusion summary', 'Thirty-minute review of findings and next step'],
    timeline: 'Five business days after buyer inputs are received.', price: '$300-$500 fixed-scope pilot',
    buyerResponsibilities: ['Provide one active checkout path and required access', 'Confirm scope and attend a 30-minute review'],
    proofBoundary: 'Validation-stage audit findings are separated from recommendations; no conversion, compliance, or revenue outcome is guaranteed.',
    nextStep: 'Confirm scope, buyer inputs, $300-$500 price, and a review time with one qualified ecommerce buyer.'
  };
  output.offerConversationGuide = {
    opening: 'I am learning how independent ecommerce teams handle recent checkout accessibility friction.',
    problemConfirmation: ['What happened the last time a customer could not complete checkout?', 'What workaround did the team use?'],
    offerExplanation: output.offer.oneSentencePromise,
    scopeConfirmation: ['One active checkout path', 'Prioritized findings and a 30-minute review', 'No broad monitoring, integration, automation, or outcome guarantee'],
    pricePresentation: '$300-$500 for the fixed-scope checkout accessibility audit pilot.',
    objectionCapture: ['Record the exact scope, price, timing, trust, or fit objection.', 'Record the current alternative and next action.'],
    commitmentRequest: 'Would a fixed-scope $300-$500 audit pilot be a useful next step?',
    followUpAgreement: 'Record a dated next step or respectful no.'
  };
  output.launchCard48Hour = {
    ...output.launchCard48Hour, firstCustomer: output.offer.targetCustomer, firstOffer: `${output.offer.offerName} at $300-$500`,
    exactFirstMessage: 'Hi {{firstName}} — I am researching recent checkout accessibility friction for independent ecommerce teams. What workaround does your team use when a customer cannot complete checkout?',
    firstCommitmentRequest: 'Would you discuss a fixed-scope $300-$500 checkout accessibility audit pilot?'
  };
  output.startingStateAudit = {
    ...output.startingStateAudit,
    currentStage: { ...output.startingStateAudit.currentStage, statement: 'Validation-stage service test for a fixed-scope checkout accessibility audit.' },
    existingOffer: { ...output.startingStateAudit.existingOffer, statement: 'Founder is testing a fixed-scope checkout accessibility audit at a $300-$500 boundary.' },
    existingLandingPage: { ...output.startingStateAudit.existingLandingPage, statement: 'Existing validation Launch Site must match the checkout accessibility customer, problem, offer, price, and CTA ledger.' },
    previousOutreach: { ...output.startingStateAudit.previousOutreach, statement: 'No ecommerce checkout outreach evidence is assumed; record the first qualified batch.' },
    existingCustomersAudienceOrPartners: { ...output.startingStateAudit.existingCustomersAudienceOrPartners, statement: 'No existing ecommerce buyer audience is assumed; select qualified buyers by recent checkout friction and authority.' },
    existingSkillsAndAssets: output.startingStateAudit.existingSkillsAndAssets.map((entry, index) => ({ ...entry, statement: [`Founder can conduct a manual checkout accessibility audit after confirming scope and capability.`, 'Validation Launch Site copy is limited to the canonical ecommerce offer.', 'Research sources support ecommerce checkout accessibility buyer access.'][index] || 'Record only checkout accessibility assets that are actually available.' })),
    manualFulfillmentReadiness: { ...output.startingStateAudit.manualFulfillmentReadiness, statement: 'Manual fulfillment is limited to one active ecommerce checkout path, prioritized findings, and a 30-minute review; capacity, permissions, labor, and direct cost must be recorded.' },
    priorSignals: [{ statement: 'Checkout support friction is supplied context and remains unverified until qualified buyer evidence is recorded.', truthLabel: 'INFERRED', source: 'ghosttown_verdict' }],
    priorNoSignals: [{ statement: 'No checkout accessibility demand result is assumed before the qualified buyer batch is completed.', truthLabel: 'UNKNOWN', source: 'missing_input' }],
    verifiedFacts: [{ statement: 'Founder supplied the independent ecommerce checkout target, checkout accessibility problem, sporadic QA alternative, fixed-scope audit offer, and $300-$500 price hypothesis.', truthLabel: 'VERIFIED', source: 'customer_input' }],
    inferences: [{ statement: 'The checkout accessibility audit can be tested manually before broad monitoring, integrations, or automation.', truthLabel: 'INFERRED', source: 'ghosttown_verdict' }],
    criticalTests: [
      { assumptionId: 'checkout-problem', assumption: 'Qualified ecommerce buyers recently experienced checkout accessibility friction.', failureConsequence: 'Narrow or revise the customer/problem pair.', evidenceRequired: 'Recent incident, current alternative, and exact buyer language.' },
      { assumptionId: 'checkout-offer', assumption: 'Qualified buyers will discuss or commit to the fixed-scope $300-$500 audit.', failureConsequence: 'Revise one constraint before building more.', evidenceRequired: 'Transparent ask outcomes and exact price objections.' },
      { assumptionId: 'checkout-fulfillment', assumption: 'The audit can be delivered within labor and direct-cost guardrails.', failureConsequence: 'Pause acquisition and revise manual fulfillment.', evidenceRequired: 'Delivery record, buyer feedback, founder labor, and direct cost.' }
    ]
  };
  output.manualFulfillmentPlan = {
    ...output.manualFulfillmentPlan,
    onboardingSteps: ['Confirm one active checkout path, buyer inputs, scope, exclusions, and $300-$500 price boundary.'],
    customerInputs: ['One active checkout path and agreed review contact.'],
    founderWork: ['Review checkout accessibility friction', 'Prepare prioritized issue list', 'Run 30-minute review'],
    expectedDeliveryTime: 'Five business days after buyer inputs are received.', toolsRequired: ['Existing manual QA and documentation tools only.'],
    customerCommunicationPoints: ['Written scope confirmation', 'Delivery review', 'Feedback request'],
    successfulDeliveryDefinition: 'Buyer receives the agreed prioritized findings and review; no outcome is guaranteed.',
    qualityChecklist: ['Scope complete', 'Findings labeled', 'Labor and direct cost recorded', 'No unsupported claim'],
    estimatedVariableCost: 'Record actual direct cost per audit.', estimatedFounderHours: 'Record actual founder labor per audit.',
    grossMarginGuardrail: 'Do not scale when founder labor plus direct cost makes the $300-$500 audit uneconomic.',
    intentionallyManual: ['One checkout-path audit', 'Prioritized findings', 'Thirty-minute review']
  };
  return synchronizeDailyExecutionPackets(output, verdict);
}

function nonEcommerceBlueprint() {
  const familyVerdict = {
    ...verdict,
    resultId: 'q2-family-game-pilot',
    idea: {
      ideaName: 'Family Game Night', description: 'A manually curated family game-night plan.',
      targetUser: 'Families with children choosing a game for mixed ages', painfulProblem: 'Choosing a suitable family game is difficult and purchased games often go unused.',
      currentAlternative: 'Buying a broadly reviewed game without matching the household constraints.', motivation: 'Avoid another unused purchase.'
    },
    deterministicScores: {
      ...verdict.deterministicScores, verdictHeadline: 'Test one curated family game-night plan',
      verdictExplanation: 'The buyer, problem, and manually fulfilled offer are specific but commitment remains unproven.',
      recommendedNextTest: 'Ask ten qualified families for a paid curated-plan conversation.',
      doNotBuildUntil: 'Do not buy inventory or build matching software before paid commitment evidence.',
      oneSentenceAdvice: 'Sell one manually curated plan before building or stocking.'
    },
    verdictDecisionV2: {
      ...verdict.verdictDecisionV2!,
      predictionTarget: 'Whether ten qualified families will discuss or buy one manually curated family game-night plan.',
      customer: { initialCustomer: 'Families with children choosing a game for mixed ages', whyThisCustomer: 'They recently experienced the selection problem.', excludedBroadAudiences: ['All parents'] },
      problem: { painfulProblem: 'Choosing a suitable family game is difficult and purchased games often go unused.', existingAlternative: 'Buying a broadly reviewed game without matching household constraints.', urgencyEvidence: ['A recent unsuitable or unused game purchase'] },
      offerHypothesis: { offer: 'One manually curated family game-night plan', commitmentRequested: 'Paid pilot at $49', priceOrCommitmentRange: '$49' },
      largestUncertainty: { assumption: 'Qualified families will pay $49 for one curated plan.', whyItMatters: 'A paid commitment is stronger than hypothetical interest.' },
      cheapestFalsification: { test: 'Send the family-game discovery message to ten qualified families.', target: 'Ten qualified families', successThreshold: 'At least three qualified conversations or commitments within five business days.', failureThreshold: 'Zero qualified conversations after the full batch.', maximumTime: 'Five business days', maximumCash: '$0' },
      firstAction: { action: 'Send the exact family-game discovery message to ten qualified families.', preparedAssetRequired: true },
      whatWouldChangeTheVerdict: ['Three paid curated-plan commitments']
    }
  } as EvaluationResult;
  const familyOrder = {
    ...order, orderId: 'q2-family-order', verdictId: familyVerdict.resultId,
    intake: {
      verdictId: familyVerdict.resultId, targetBuyer: 'Families with children choosing a game for mixed ages',
      problem: 'Choosing a suitable family game is difficult and purchased games often go unused.',
      currentWorkaround: 'Buying a broadly reviewed game without matching household constraints.',
      offerHypothesis: 'One manually curated family game-night plan', expectedPrice: '$49'
    }
  } as PaidTestOrder;
  return upgradeGhostTownLaunchBlueprintToV21(launchBlueprintFixture(), familyOrder, familyVerdict);
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
    expect(day1.targets.some(target => target.kind === 'qualified_buyer_batch' && target.minimumCount === 10)).toBe(true);
    expect(day1.actions[0].quantity).toContain('10 qualified targets matching');
    expect(output.dailyCalendar[1].executionPacket?.targets.some(target => target.kind === 'qualified_buyer_batch')).toBe(true);
    expect(output.dailyCalendar[9].executionPacket?.actions[0].quantity).toContain('3 qualified buyer price conversations');
    expect(output.dailyCalendar[11].executionPacket?.evidenceToCapture).toContain('Validation-site URL');
    expect(output.dailyCalendar[11].executionPacket?.evidenceToCapture).toContain('Source-code or rendered-copy capture');
    expect(output.dailyCalendar[24].executionPacket?.evidenceToCapture).toContain('Labor minutes by step');
    expect(output.dailyCalendar[24].executionPacket?.evidenceToCapture).toContain('Direct-cost field by step');
    expect(new Set(output.dailyCalendar.map(day => day.executionPacket?.actions[0].instruction)).size).toBe(30);
    expect(new Set(output.dailyCalendar.map(day => day.executionPacket?.evidenceToCapture.join('|'))).size).toBe(30);
    expect(output.foundingCustomerPilotBrief.problem).toContain('Checkout accessibility');
    expect(output.landingPageCopy.offerDescription).toContain('checkout accessibility audit');
    const governedSurfaces = { executiveDecision: output.executiveDecision, offer: output.offer, startingStateAudit: output.startingStateAudit, positioning: output.positioning, customerAccessPack: output.customerAccessPack, foundingCustomerPilotBrief: output.foundingCustomerPilotBrief, landingPageCopy: output.landingPageCopy, launchSite: output.launchSite, manualFulfillmentPlan: output.manualFulfillmentPlan, q1: verdict.verdictDecisionV2, dailyCalendar: output.dailyCalendar };
    for (const [name, surface] of Object.entries(governedSurfaces)) {
      expect(JSON.stringify(surface), `${name} must not carry the legacy fixture`).not.toMatch(/Family Game Night|Families with children|Choosing games|\$297/i);
      expect(JSON.stringify(surface), `${name} must carry ecommerce canonical context`).toMatch(/checkout|ecommerce|\$300-\$500/i);
    }
    for (const dayNumber of [1, 4, 7, 14, 21, 30]) expect(output.dailyCalendar[dayNumber - 1].executionPacket?.assets[0].finishedContent).toBeTruthy();
    const files = buildBlueprintAssetFiles(output, new Uint8Array([37, 80, 68, 70]));
    expect(files).toHaveLength(16);
    expect(new TextDecoder().decode(files.find(file => file.name.endsWith('thirty-day-calendar.csv'))!.data)).toContain('finished_asset_content');
  });

  it('projects a non-ecommerce Blueprint through all 30 packets without ecommerce fixture literals', () => {
    const output = nonEcommerceBlueprint();
    const canonicalTerms = [output.offer.targetCustomer, output.offer.painfulProblem, output.offer.offerName, output.firstRevenuePath.firstPrice];
    expect(output.dailyCalendar).toHaveLength(30);
    expect(validateDailyExecutionPackets(output)).toEqual([]);
    for (const day of output.dailyCalendar) {
      const packet = JSON.stringify(day.executionPacket);
      for (const term of canonicalTerms) expect(packet).toContain(term);
      expect(packet).not.toMatch(/checkout|ecommerce|accessibility|\baudit\b|\$300-\$500/i);
    }
    expect(output.dailyCalendar[15].executionPacket?.assets[0].finishedContent).toContain(output.offer.offerName);
    expect(output.dailyCalendar[15].executionPacket?.assets[0].finishedContent).toContain(output.firstRevenuePath.firstPrice);
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
    if (destination) {
      const canonicalTerms = [output.offer.targetCustomer, output.offer.painfulProblem, output.offer.offerName, output.firstRevenuePath.firstPrice];
      const nonEcommerce = nonEcommerceBlueprint();
      const nonEcommerceTerms = [nonEcommerce.offer.targetCustomer, nonEcommerce.offer.painfulProblem, nonEcommerce.offer.offerName, nonEcommerce.firstRevenuePath.firstPrice];
      const serializedOutput = JSON.stringify({
        dailyCalendar: output.dailyCalendar, executiveDecision: output.executiveDecision, offer: output.offer,
        positioning: output.positioning, firstRevenuePath: output.firstRevenuePath, launchCard48Hour: output.launchCard48Hour,
        foundingCustomerPilotBrief: output.foundingCustomerPilotBrief, offerConversationGuide: output.offerConversationGuide,
        landingPageCopy: output.landingPageCopy, launchSite: output.launchSite, customerAccessPack: output.customerAccessPack,
        startingStateAudit: output.startingStateAudit, manualFulfillmentPlan: output.manualFulfillmentPlan
      });
      writeFileSync(destination, JSON.stringify({
        schema_version: 'ghosttown-q2-daily-execution-golden-output-v1', fixture_id: 'specific-paid-pilot',
        canonical: { blueprintId: output.blueprintId, blueprintVersion: output.blueprintVersion, sourceVerdictId: output.sourceVerdictId, customer: output.offer.targetCustomer, problem: output.offer.painfulProblem, offer: output.offer.offerName, offerPromise: output.offer.oneSentencePromise, price: output.firstRevenuePath.firstPrice, launchSiteHeadline: output.launchSite.offer.headline, sourceIds: output.sources.map(source => source.sourceId), channels: output.customerAccessPack.channels.map(channel => ({ channelId: channel.channelId, community: channel.community, publicUrl: channel.publicUrl, sourceIds: channel.sourceIds })) },
        days: output.dailyCalendar.map(day => ({ day: day.dayNumber, packet: day.executionPacket, legacy: { objective: day.primaryObjective, why: day.whyItMatters, deliverable: day.expectedDeliverable, success: day.successMeasurement } })),
        representative_days: [1, 4, 7, 14, 21, 30],
        regression_cases: [{
          fixture_id: 'family-game-non-ecommerce',
          canonical: { customer: nonEcommerce.offer.targetCustomer, problem: nonEcommerce.offer.painfulProblem, offer: nonEcommerce.offer.offerName, price: nonEcommerce.firstRevenuePath.firstPrice },
          days: nonEcommerce.dailyCalendar.map(day => ({ day: day.dayNumber, packet: day.executionPacket }))
        }],
        semantic_checks: {
          all_30_packets: output.dailyCalendar.length === 30,
          q1_day1_action: output.dailyCalendar[0].executionPacket?.actions[0].quantity.includes('10 qualified targets matching') === true,
          all_finished_assets: validateDailyExecutionPackets(output).length === 0,
          aliases_match: output.dailyCalendar.every(day => day.executionPacket && day.primaryObjective === day.executionPacket.objective),
          canonical_terms_on_all_packets: output.dailyCalendar.every(day => canonicalTerms.every(term => JSON.stringify(day.executionPacket).includes(term))),
          no_legacy_concept_or_price: !/Family Game Night|Families with children|Choosing games|\$297/i.test(serializedOutput),
          coherent_ecommerce_fixture: output.customerAccessPack.channels.every(channel => channel.community.includes('ecommerce')) && output.landingPageCopy.problemSection.includes('Checkout accessibility') && output.landingPageCopy.pricePresentation.includes('$300-$500'),
          non_ecommerce_regression: nonEcommerce.dailyCalendar.length === 30 && validateDailyExecutionPackets(nonEcommerce).length === 0 && nonEcommerce.dailyCalendar.every(day => nonEcommerceTerms.every(term => JSON.stringify(day.executionPacket).includes(term)) && !/checkout|ecommerce|accessibility|\baudit\b|\$300-\$500/i.test(JSON.stringify(day.executionPacket)))
        }
      }, null, 2));
    }
    expect(output.dailyCalendar[29].executionPacket?.completionDefinition).toContain('evidence ledger');
  });
});
