import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import type { GhostTownLaunchBlueprint } from '../types/launchBlueprint';
import type { PaidTestOrder, TruthLabel } from '../types/paidTest';
import type {
  AdaptiveCheckpoint,
  BlueprintDailyActionV21,
  BlueprintEvidenceStatement,
  BusinessModelExecutionLane,
  BusinessModelLane,
  CustomerInterviewGuide,
  EvidenceHierarchy,
  FirstRevenuePath,
  FoundingCustomerPilotBrief,
  GhostTownLaunchBlueprintV21,
  LaunchCard48Hour,
  ManualFulfillmentPlan,
  OfferConversationGuide,
  StartingStateAudit
} from '../types/launchBlueprintV21';
import {
  createGhostTownLaunchBlueprint,
  validateGhostTownLaunchBlueprint,
  type CustomerAccessResearchInput
} from './launchBlueprintGenerator';
import { synchronizeDailyExecutionPackets, validateDailyExecutionPackets } from './launchBlueprintDailyExecution';
import { currentCustomerAccessChannels } from './researchEvidenceRole';

export const CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1 = '616c691e6b4c9cea93615963a07375d13ffba57f' as const;

function clean(value: string | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() || '';
}

function evidence(
  value: string,
  truthLabel: TruthLabel,
  source: BlueprintEvidenceStatement['source']
): BlueprintEvidenceStatement {
  return { statement: value, truthLabel, source };
}

function supplied(value: string | undefined, missing: string): BlueprintEvidenceStatement {
  const normalized = clean(value);
  return normalized
    ? evidence(normalized, 'Verified', 'customer_input')
    : evidence(missing, 'Test', 'missing_input');
}

function classifyLane(order: PaidTestOrder, verdict: EvaluationResult): BusinessModelExecutionLane {
  const text = [
    verdict.deterministicScores.businessDnaType,
    verdict.idea.ideaName,
    verdict.idea.description,
    verdict.idea.targetUser,
    verdict.idea.painfulProblem,
    order.intake.currentStage,
    order.intake.offerHypothesis
  ].map(value => clean(value)).join(' ').toLowerCase();

  // Prefer explicit commercial/product mechanics over media or acquisition descriptors.
  // A hybrid concept such as "newsletter + backend SaaS" must execute in the SaaS lane;
  // creator/media remains the fallback only when no more specific business model is present.
  if (/marketplace|directory|match buyers|match customers|connect .* providers/.test(text)) return 'marketplace';
  if (/contractor|repair|installation|local service|home service|clinic|appointment|reservation/.test(text)) return 'local_business';
  if (/software|saas|app|platform|dashboard|automation|workflow tool/.test(text)) return 'saas';
  if (/course|template|guide|download|digital product|playbook|workshop/.test(text)) return 'digital_product';
  if (/physical product|device|kit|shipment|delivery|inventory|subscription box|monthly box/.test(text)) return 'physical_product';
  if (/creator|media|newsletter|podcast|youtube|sponsor|audience/.test(text)) return 'creator_or_media';
  return 'service_or_consulting';
}

const LANE_CONFIG: Record<BusinessModelExecutionLane, Omit<BusinessModelLane, 'lane'>> = {
  service_or_consulting: {
    rationale: 'The first useful result can be delivered manually through a bounded professional engagement.',
    firstMeaningfulTest: 'Ask a qualified buyer to purchase a paid diagnostic, fixed-scope pilot, or manually delivered engagement.',
    earliestCommercialAskDay: 8,
    intentionallyDeferred: ['Broad service catalog', 'Long-term retainer', 'Automation before repeatable delivery', 'Hiring before paid demand']
  },
  saas: {
    rationale: 'The workflow can be validated before a full software product exists.',
    firstMeaningfulTest: 'Offer a concierge workflow, working demonstration, paid design-partner pilot, or deposit tied to one narrow process.',
    earliestCommercialAskDay: 10,
    intentionallyDeferred: ['Full multi-tenant product', 'Large integration surface', 'Self-service onboarding', 'Feature expansion without workflow evidence']
  },
  digital_product: {
    rationale: 'A complete early edition can be sold and used before a larger content catalog is produced.',
    firstMeaningfulTest: 'Request a presale, paid workshop registration, founding-member purchase, or preorder for a complete initial resource.',
    earliestCommercialAskDay: 8,
    intentionallyDeferred: ['Large course library', 'Membership platform', 'Affiliate program', 'Content expansion before purchase evidence']
  },
  physical_product: {
    rationale: 'A small-batch or manually assembled version can test purchase and use before inventory is scaled.',
    firstMeaningfulTest: 'Request a preorder, deposit, prototype evaluation, or retailer conversation with written delivery boundaries.',
    earliestCommercialAskDay: 12,
    intentionallyDeferred: ['Large production run', 'Broad inventory', 'Retail expansion', 'Unsupported safety or performance claims']
  },
  marketplace: {
    rationale: 'The transaction can be tested by manually matching one narrow buyer and provider segment.',
    firstMeaningfulTest: 'Complete one manually qualified match and request a concierge fee, transaction commitment, or explicit access from both sides.',
    earliestCommercialAskDay: 10,
    intentionallyDeferred: ['Self-service marketplace', 'Mass provider acquisition', 'Automated matching', 'Multiple market sides at once']
  },
  local_business: {
    rationale: 'Demand can be tested through a real appointment, estimate, reservation, deposit, or paid service.',
    firstMeaningfulTest: 'Ask a qualified local buyer for an appointment, estimate approval, reservation, deposit, or fixed-scope paid service.',
    earliestCommercialAskDay: 7,
    intentionallyDeferred: ['New location', 'Large equipment purchase', 'Staff expansion', 'Broad service area before local conversion evidence']
  },
  creator_or_media: {
    rationale: 'Audience quality is better tested through a qualified subscriber action, sponsor conversation, or paid product than through views alone.',
    firstMeaningfulTest: 'Request a qualified subscriber action, sponsor conversation, paid workshop, or purchase connected to one audience problem.',
    earliestCommercialAskDay: 10,
    intentionallyDeferred: ['High-volume publishing', 'Multiple channels', 'Large production spend', 'Treating views or likes as demand']
  }
};

function startingStateAudit(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  lane: BusinessModelExecutionLane
): StartingStateAudit {
  const notes = clean(order.intake.customerNotes);
  const landingPage = clean(order.intake.landingPageLink);
  const price = clean(order.intake.expectedPrice);
  const signals = order.intake.researchSignals;
  const audienceSignals = [signals?.audience?.value, signals?.ecosystem?.value]
    .filter((value): value is string => Boolean(value));
  const targetBuyer = clean(order.intake.targetBuyer) || clean(verdict.verdictDecisionV2?.customer.initialCustomer) || clean(verdict.idea.targetUser) || 'not supplied';
  const problem = clean(order.intake.problem) || clean(verdict.idea.painfulProblem) || 'not supplied';
  const workaround = clean(order.intake.currentWorkaround) || clean(verdict.idea.currentAlternative) || 'not supplied';

  const verifiedFacts = [
    evidence(`Target buyer supplied by the founder: ${targetBuyer}.`, 'Verified', 'customer_input'),
    evidence(`Problem supplied by the founder: ${problem}.`, 'Verified', 'customer_input'),
    evidence(`Current workaround supplied by the founder: ${workaround}.`, 'Verified', 'customer_input')
  ];
  if (price) verifiedFacts.push(evidence(`Founder-entered price hypothesis: ${price}.`, 'Verified', 'customer_input'));
  if (landingPage) verifiedFacts.push(evidence(`Founder supplied an existing landing page: ${landingPage}.`, 'Verified', 'customer_input'));

  return {
    currentStage: supplied(order.intake.currentStage, 'Current business stage was not supplied; confirm it before increasing investment.'),
    existingOffer: supplied(order.intake.offerHypothesis, 'No existing offer was supplied; the generated founding-customer offer remains a test.'),
    existingLandingPage: landingPage
      ? evidence(landingPage, 'Verified', 'customer_input')
      : evidence('No existing landing page was supplied.', 'Verified', 'customer_input'),
    previousOutreach: notes
      ? evidence(`Customer notes supplied for review: ${notes}`, 'Verified', 'customer_input')
      : evidence('Previous outreach attempts and results were not supplied.', 'Test', 'missing_input'),
    existingCustomersAudienceOrPartners: audienceSignals.length
      ? evidence(`Founder identified these audience or ecosystem starting points: ${audienceSignals.join(', ')}.`, 'Verified', 'customer_input')
      : evidence('Existing customers, audience, contacts, and partners were not supplied.', 'Test', 'missing_input'),
    existingSkillsAndAssets: [
      supplied(order.intake.offerHypothesis, 'No founder-authored offer asset was supplied.'),
      landingPage
        ? evidence(`Existing landing-page asset: ${landingPage}.`, 'Verified', 'customer_input')
        : evidence('No existing landing-page asset was supplied.', 'Test', 'missing_input'),
      order.intake.competitorSeeds?.length
        ? evidence(`${order.intake.competitorSeeds.length} confirmed commercial seed domains are available for research.`, 'Verified', 'customer_input')
        : evidence('Confirmed commercial seed domains are not yet available.', 'Test', 'missing_input')
    ],
    founderConstraints: {
      hoursPerWeek: evidence('Founder hours per week were not supplied; use the Blueprint time ceiling until confirmed.', 'Test', 'missing_input'),
      testBudget: evidence('Founder test budget was not supplied; use the Blueprint cash-risk ceiling until confirmed.', 'Test', 'missing_input'),
      geography: supplied(order.intake.geography, 'Geographic constraints were not supplied.'),
      language: evidence('Language constraints were not supplied; current customer artifacts are generated in English.', 'Test', 'missing_input'),
      technicalCapability: evidence('Technical capability was not supplied and must not be assumed.', 'Test', 'missing_input')
    },
    manualFulfillmentReadiness: evidence(
      `The ${lane.replace(/_/g, ' ')} lane appears manually testable, but the founder must confirm tools, capacity, permissions, and delivery competence before the first paid ask.`,
      'Inferred',
      'system_inference'
    ),
    priorSignals: notes
      ? [evidence('Customer notes may contain prior market signals; separate exact behavior from interpretation during Day 1.', 'Inferred', 'system_inference')]
      : [],
    priorNoSignals: notes
      ? [evidence('Customer notes may contain failed attempts; record the exact audience, message, quantity, and response before repeating them.', 'Inferred', 'system_inference')]
      : [],
    verifiedFacts,
    inferences: [
      evidence(`GhostTown recommends the initial customer: ${targetBuyer}.`, 'Inferred', 'ghosttown_verdict'),
      evidence(`The recommended execution lane is ${lane.replace(/_/g, ' ')}.`, 'Inferred', 'system_inference'),
      evidence(clean(verdict.verdictDecisionV2?.confidence.rationale) || clean(verdict.deterministicScores.oneSentenceAdvice), 'Inferred', 'ghosttown_verdict')
    ].filter(item => item.statement),
    criticalTests: [
      { assumptionId: 'critical-test-problem', assumption: 'Qualified buyers experienced the problem recently and consider it meaningful.', failureConsequence: 'Narrow, pivot, or stop the customer/problem pair.', evidenceRequired: 'Recent concrete examples, consequences, and current workarounds from qualified buyers.' },
      { assumptionId: 'critical-test-access', assumption: 'The first customer can be reached through at least one repeatable channel.', failureConsequence: 'Change the access plan before increasing outreach volume.', evidenceRequired: 'Qualified replies, interviews, introductions, or direct buyer access from a tracked channel.' },
      { assumptionId: 'critical-test-offer', assumption: 'The fixed-scope offer can earn a meaningful commitment.', failureConsequence: 'Revise customer, urgency, trust, scope, or proof before building more.', evidenceRequired: 'Payment, deposit, accepted pilot scope, access, referral, or another explicit buying action.' },
      { assumptionId: 'critical-test-price', assumption: 'The test price is credible for the buyer and sustainable for delivery.', failureConsequence: 'Separate price objections from fit, trust, timing, and scope before changing price.', evidenceRequired: 'Real purchase behavior and exact objections from qualified buyers.' },
      { assumptionId: 'critical-test-fulfillment', assumption: 'The founder can deliver within the time, cost, quality, and risk boundaries.', failureConsequence: 'Revise delivery before acquiring more customers.', evidenceRequired: 'A fulfillment rehearsal or paid pilot with founder hours, direct cost, defects, and buyer outcome.' }
    ]
  };
}

function evidenceHierarchy(): EvidenceHierarchy {
  return {
    strong: ['Payment', 'Deposit', 'Paid pilot', 'Accepted pilot scope', 'Access to data, systems, staff, or facilities', 'Meaningful time commitment', 'Introduction to a decision maker'],
    moderate: ['Qualified sales conversation', 'Proposal request', 'Trial or demonstration request', 'Specific buying-process objection', 'Referral to another qualified buyer'],
    early: ['Qualified reply', 'Customer interview', 'Landing-page lead', 'Relevant question or direct inquiry'],
    weak: ['Likes', 'Generic compliments', 'Unqualified waitlist entries', 'Friends saying they would use it', 'Traffic without a meaningful action'],
    rankingRule: 'Prefer observed behavior over stated interest. Never treat weak evidence as proof of demand when stronger evidence can be requested ethically.'
  };
}

function firstRevenuePath(base: GhostTownLaunchBlueprint, lane: BusinessModelLane): FirstRevenuePath {
  const channel = currentCustomerAccessChannels(base.customerAccessPack.channels)[0];
  const script = base.customerAccessPack.outreachScripts.find(item => item.relationship === 'offer_test_invitation');
  return {
    firstOfferFormat: lane.firstMeaningfulTest,
    firstBuyer: base.executiveDecision.recommendedInitialCustomer,
    firstChannel: channel ? `${channel.community} via ${channel.platform}` : 'Highest-priority verified customer-access channel',
    firstAsk: script?.message || `Review the written scope for ${base.offer.offerName} and decide whether the ${base.offer.initialTestPrice} founding-customer pilot fits.`,
    firstPrice: base.offer.initialTestPrice,
    requiredProof: ['Written fixed scope', 'Explicit deliverables and exclusions', 'Validation-stage proof boundary', 'First-result timeline', 'Payment or commitment method'],
    commitmentMethod: 'Use a real payment link, deposit, accepted written scope, booked paid appointment, preorder, or another lane-appropriate commitment. Do not count compliments.',
    targetDay: lane.earliestCommercialAskDay,
    minimumQualifiedAsks: 5,
    followUpSequence: ['Send the first ask to a qualified buyer.', 'Follow up once after at least three business days when appropriate.', 'Record the exact objection or commitment.', 'Stop after a clear rejection or the stated no-response limit.'],
    successThreshold: 'At least one qualified buyer makes a strong commitment, or multiple qualified buyers provide specific buying-process evidence that identifies one correctable constraint.'
  };
}

function fulfillmentPlan(base: GhostTownLaunchBlueprint, lane: BusinessModelExecutionLane): ManualFulfillmentPlan {
  const capacity = lane === 'physical_product' || lane === 'local_business' ? 1 : lane === 'digital_product' ? 3 : 2;
  return {
    onboardingSteps: ['Confirm buyer qualification and the recent problem.', 'Review scope, exclusions, price, timeline, and responsibilities.', 'Collect only required inputs.', 'Confirm payment or commitment before unbounded work.'],
    customerInputs: base.offer.buyerResponsibilities,
    founderWork: base.offer.deliverables.map(item => `${item.name}: ${item.description}`),
    expectedDeliveryTime: base.offer.timeToFirstUsefulResult,
    toolsRequired: ['Email and calendar', 'Payment or commitment method', 'Written scope and checklist', 'Evidence and time tracker', 'Only tools required for the fixed-scope pilot'],
    customerCommunicationPoints: ['Fit confirmation', 'Scope and payment confirmation', 'Delivery start', 'First useful result', 'Evidence review and next decision'],
    successfulDeliveryDefinition: 'Every promised deliverable is complete, exclusions were respected, and time, direct cost, defects, and buyer feedback were recorded.',
    qualityChecklist: ['Buyer and problem match the qualification criteria.', 'Scope, price, timeline, responsibilities, and exclusions are written.', 'No unsupported guarantee or fabricated proof appears.', 'The first useful result is documented.', 'Founder hours and variable costs are recorded before deciding to repeat.'],
    capacityPerWeek: capacity,
    estimatedVariableCost: 'Record the real direct cost before the first ask. Do not use a guessed margin as evidence.',
    estimatedFounderHours: lane === 'physical_product' || lane === 'local_business' ? 'Initial guardrail: no more than 8 founder hours per pilot.' : 'Initial guardrail: no more than 6 founder hours per pilot.',
    grossMarginGuardrail: 'Do not scale acquisition when direct variable cost plus founder labor at the chosen internal hourly rate exceeds 70% of collected pilot revenue.',
    intentionallyManual: ['Qualification', 'Onboarding', 'Core delivery', 'Buyer communication', 'Evidence capture', 'Post-pilot review']
  };
}

function checkpoints(): AdaptiveCheckpoint[] {
  return [
    { checkpointId: 'day-7', dayNumber: 7, title: 'Customer, problem, and access review', questions: ['Is the customer definition coherent?', 'Can qualified people be reached?', 'Which assumptions remain unsupported?', 'Should the offer or customer change before more outreach?'], evidenceRequired: ['Completed first actions', 'Qualified target list', 'Exact replies or non-response counts', 'Updated critical-test register'], branches: [{ condition: 'Ten qualified messages produce no replies.', action: 'Stop increasing volume. Review customer fit, channel relevance, and the opening message.' }, { condition: 'Qualified people cannot be identified or reached.', action: 'Revise the access path or customer segment before continuing.' }] },
    { checkpointId: 'day-14', dayNumber: 14, title: 'Conversation and problem-evidence review', questions: ['Are qualified conversations occurring?', 'Is the problem recent and meaningful?', 'Which alternatives recur?', 'Has a transparent commercial ask been made?'], evidenceRequired: ['Interview notes', 'Exact customer language', 'Current alternatives', 'Commercial asks and responses'], branches: [{ condition: 'Prospects reply but refuse calls.', action: 'Reduce the requested commitment and test a smaller next step.' }, { condition: 'The problem is not recent or costly.', action: 'Narrow or pivot the problem before revising copy.' }] },
    { checkpointId: 'day-21', dayNumber: 21, title: 'Commitment and fulfillment review', questions: ['Is there meaningful commitment?', 'Which channel produces the strongest signal?', 'What is the main conversion constraint?', 'Is fulfillment practical and sustainable?'], evidenceRequired: ['Payments or commitments', 'Objection categories', 'Channel comparison', 'Founder hours and direct cost'], branches: [{ condition: 'Calls occur but nobody accepts the offer.', action: 'Examine urgency, trust, scope, price, and proof; change only the strongest supported constraint.' }, { condition: 'Customers accept but fulfillment is unprofitable or unsafe.', action: 'Revise delivery before acquiring more customers.' }] },
    { checkpointId: 'day-30', dayNumber: 30, title: 'Evidence-led business decision', questions: ['What is the strongest behavioral evidence?', 'Which critical assumption failed?', 'Is the acquisition path repeatable?', 'Is delivery viable within the risk boundaries?'], evidenceRequired: ['Evidence ledger', 'Commitment and revenue record', 'Fulfillment economics', 'Decision memo with missing evidence'], branches: [{ condition: 'Strong demand and viable fulfillment exist.', action: 'Continue with one bounded next test before broad automation.' }, { condition: 'One correctable constraint blocks credible evidence.', action: 'Continue with revision and test one variable.' }, { condition: 'Customer, problem, or offer evidence points elsewhere.', action: 'Issue an explicit pivot and preserve the evidence chain.' }, { condition: 'Critical evidence remains missing.', action: 'Pause rather than manufacture confidence.' }, { condition: 'Qualified buyers show no meaningful problem or commitment.', action: 'Stop and archive the evidence.' }] }
  ];
}

function dailyCalendar(base: GhostTownLaunchBlueprint): BlueprintDailyActionV21[] {
  const checkpointSet = checkpoints();
  return base.dailyCalendar.map(day => ({
    ...day,
    whyItMatters: day.primaryObjective,
    estimatedMinutes: day.estimatedEffort === 'light' ? 30 : day.estimatedEffort === 'moderate' ? 60 : 90,
    ifThenBranches: checkpointSet.find(item => item.dayNumber === day.dayNumber)?.branches || [
      { condition: 'Required evidence is missing.', action: 'Mark the item unsupported and collect the evidence before treating the action as complete.' },
      { condition: 'New evidence contradicts the recommendation.', action: 'Preserve the original recommendation, record the contradiction, and route it to the next checkpoint.' }
    ]
  }));
}

function interviewGuide(base: GhostTownLaunchBlueprint): CustomerInterviewGuide {
  return {
    opening: `I am researching how people currently handle ${base.offer.painfulProblem}. This is not a sales call.`,
    problemHistoryQuestions: ['When did this first become a problem?', 'How often has it happened?', 'Who experiences the consequence most directly?'],
    lastOccurrenceQuestions: ['Tell me about the most recent occurrence.', 'What triggered it?', 'What did you do first?', 'What happened after that?'],
    currentWorkaroundQuestions: ['What do you use today?', 'Why did you choose it?', 'Where does it fail or create extra work?'],
    costAndConsequenceQuestions: ['What did the last occurrence cost?', 'What happens when nothing changes?'],
    buyingProcessQuestions: ['Who decides whether to spend money?', 'Who can block the decision?', 'What must be true before approval?'],
    existingSpendingQuestions: ['Have you paid for an alternative?', 'How much and how recently?', 'What made that purchase acceptable?'],
    switchingFrictionQuestions: ['What would make switching risky?', 'What data, access, training, habit, or trust would slow adoption?'],
    closingAndReferralQuestions: ['What did I fail to ask?', 'May I follow up with the findings?', 'Who else has dealt with this recently?']
  };
}

function offerGuide(base: GhostTownLaunchBlueprint): OfferConversationGuide {
  return {
    opening: `Confirm the recent problem and scope before discussing the ${base.offer.initialTestPrice} test price.`,
    problemConfirmation: ['Confirm the recent problem and consequence.', 'Confirm the buyer and decision maker.', 'Confirm the current workaround.'],
    offerExplanation: `${base.offer.oneSentencePromise} The pilot is fixed-scope and validation-stage.`,
    scopeConfirmation: [...base.offer.deliverables.map(item => item.name), ...base.offer.exclusions.map(item => `Not included: ${item}`)],
    pricePresentation: `The founding-customer test price is ${base.offer.initialTestPrice}; final pricing remains unproven.`,
    objectionCapture: ['Record the objection exactly.', 'Classify it as fit, urgency, access, trust, scope, fulfillment, price, or message.', 'Do not discount before identifying the constraint.'],
    commitmentRequest: 'Would you like to approve the written scope and take the lane-appropriate payment or commitment step?',
    followUpAgreement: 'Agree on one dated next step or close the opportunity respectfully.'
  };
}

function pilotBrief(base: GhostTownLaunchBlueprint): FoundingCustomerPilotBrief {
  return {
    problem: base.offer.painfulProblem,
    scope: base.offer.deliveryMethod,
    deliverables: base.offer.deliverables.map(item => `${item.name}: ${item.description}`),
    timeline: base.offer.timeToFirstUsefulResult,
    price: base.offer.initialTestPrice,
    buyerResponsibilities: base.offer.buyerResponsibilities,
    proofBoundary: 'Validation-stage offer. No fabricated testimonial, guaranteed result, invented scarcity, or unsupported performance claim is permitted.',
    nextStep: base.landingPageCopy.primaryCallToAction
  };
}

export function validateGhostTownLaunchBlueprintV21(
  blueprint: GhostTownLaunchBlueprintV21
): GhostTownLaunchBlueprintV21['qualityGate'] {
  const baseGate = validateGhostTownLaunchBlueprint({ ...blueprint, blueprintVersion: '2.0' } as GhostTownLaunchBlueprint);
  const failures = [...baseGate.failures];
  const warnings = [...baseGate.warnings];

  if (blueprint.blueprintVersion !== '2.1') failures.push('Executable Blueprint version must be 2.1.');
  if (blueprint.contractVersion !== '2.1.1') failures.push('Canonical Blueprint contract version must be 2.1.1.');
  if (blueprint.generationReceipt.canonicalContract.gitBlobSha1 !== CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1) failures.push('Canonical Blueprint hash does not match the approved v2.1 source.');
  if (blueprint.startingStateAudit.criticalTests.length < 1 || blueprint.startingStateAudit.criticalTests.length > 5) failures.push('Starting-state audit must identify between one and five critical tests.');
  if (!blueprint.businessModelLane.firstMeaningfulTest) failures.push('Business-model execution lane is missing its first meaningful test.');
  if (!blueprint.firstRevenuePath.firstAsk || blueprint.firstRevenuePath.minimumQualifiedAsks < 1) failures.push('First-revenue path is incomplete.');
  if (!blueprint.manualFulfillmentPlan.qualityChecklist.length || !blueprint.manualFulfillmentPlan.grossMarginGuardrail) failures.push('Manual fulfillment and economics guardrail are incomplete.');
  if (blueprint.launchCard48Hour.firstThreeApproaches.length !== 3) failures.push('48-hour Launch Card must include exactly three first approaches.');
  if (!blueprint.launchCard48Hour.exactFirstMessage || !blueprint.launchCard48Hour.firstCommitmentRequest) failures.push('48-hour Launch Card is missing the first message or commitment request.');
  if (!blueprint.evidenceHierarchy.strong.length || !blueprint.evidenceHierarchy.weak.length) failures.push('Behavioral evidence hierarchy is incomplete.');
  if (blueprint.adaptiveCheckpoints.map(item => item.dayNumber).join(',') !== '7,14,21,30') failures.push('Adaptive checkpoints must exist at Days 7, 14, 21, and 30.');
  if (blueprint.adaptiveCheckpoints.some(item => !item.questions.length || !item.branches.length || !item.evidenceRequired.length)) failures.push('Every adaptive checkpoint must include questions, evidence, and branches.');
  if (blueprint.dailyCalendar.some(day => !day.whyItMatters || day.estimatedMinutes <= 0 || !day.ifThenBranches.length)) failures.push('Every v2.1 daily action must include why it matters, time, and an if-then branch.');
  failures.push(...validateDailyExecutionPackets(blueprint));
  if (!blueprint.customerInterviewGuide.lastOccurrenceQuestions.length || !blueprint.offerConversationGuide.commitmentRequest) failures.push('Interview or offer-conversation guide is incomplete.');
  if (!blueprint.foundingCustomerPilotBrief.deliverables.length || !blueprint.foundingCustomerPilotBrief.proofBoundary) failures.push('Founding Customer Pilot Brief is incomplete.');
  if (blueprint.startingStateAudit.founderConstraints.hoursPerWeek.source === 'missing_input') warnings.push('Founder hours per week remain unconfirmed.');
  if (blueprint.startingStateAudit.founderConstraints.testBudget.source === 'missing_input') warnings.push('Founder test budget remains unconfirmed.');

  return { passed: failures.length === 0, failures: [...new Set(failures)], warnings: [...new Set(warnings)] };
}

export function upgradeGhostTownLaunchBlueprintToV21(
  base: GhostTownLaunchBlueprint,
  order: PaidTestOrder,
  verdict: EvaluationResult
): GhostTownLaunchBlueprintV21 {
  const lane = classifyLane(order, verdict);
  const businessModelLane: BusinessModelLane = { lane, ...LANE_CONFIG[lane] };
  const revenue = firstRevenuePath(base, businessModelLane);
  const approaches = currentCustomerAccessChannels(base.customerAccessPack.channels).slice(0, 3).map(channel => ({
    name: channel.community,
    channelId: channel.channelId,
    publicUrl: channel.publicUrl,
    firstAction: channel.firstAction
  }));
  const launchCard: LaunchCard48Hour = {
    firstCustomer: base.executiveDecision.recommendedInitialCustomer,
    firstOffer: `${base.offer.offerName} at ${base.offer.initialTestPrice}`,
    firstThreeApproaches: approaches,
    exactFirstMessage: revenue.firstAsk,
    firstCommitmentRequest: revenue.commitmentMethod,
    launchSitePreviewReady: Boolean(base.launchSite.offer.headline && base.launchSite.leadCapture.destination),
    completionDeadlineHours: 48
  };

  const upgraded = {
    ...base,
    blueprintVersion: '2.1' as const,
    contractVersion: '2.1.1' as const,
    startingStateAudit: startingStateAudit(order, verdict, lane),
    businessModelLane,
    firstRevenuePath: revenue,
    manualFulfillmentPlan: fulfillmentPlan(base, lane),
    launchCard48Hour: launchCard,
    evidenceHierarchy: evidenceHierarchy(),
    adaptiveCheckpoints: checkpoints(),
    customerInterviewGuide: interviewGuide(base),
    offerConversationGuide: offerGuide(base),
    foundingCustomerPilotBrief: pilotBrief(base),
    dailyCalendar: dailyCalendar(base),
    generationReceipt: {
      ...base.generationReceipt,
      canonicalContract: {
        version: '2.1.1' as const,
        gitBlobSha1: CANONICAL_BLUEPRINT_V21_GIT_BLOB_SHA1,
        sourcePath: 'docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md' as const,
        changeRecordPath: 'docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md' as const,
        evidenceManifestPath: 'docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json' as const,
        verifiedAt: base.generationReceipt.generatedAt
      }
    },
    qualityGate: { passed: false, failures: [], warnings: [] }
  } as GhostTownLaunchBlueprintV21;
  const synchronized = synchronizeDailyExecutionPackets(upgraded, verdict);
  synchronized.qualityGate = validateGhostTownLaunchBlueprintV21(synchronized);
  synchronized.status = synchronized.qualityGate.passed ? 'ready' : 'failed_quality_gate';
  return synchronized;
}

export function createGhostTownLaunchBlueprintV21(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  research: CustomerAccessResearchInput,
  generatedAt = order.paidAt || order.updatedAt || order.createdAt
): GhostTownLaunchBlueprintV21 {
  hydrateEvaluationResultDecisionV2(verdict);
  return upgradeGhostTownLaunchBlueprintToV21(
    createGhostTownLaunchBlueprint(order, verdict, research, generatedAt),
    order,
    verdict
  );
}
