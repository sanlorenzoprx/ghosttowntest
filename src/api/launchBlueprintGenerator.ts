import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder, TruthLabel } from '../types/paidTest';
import type {
  BlueprintDailyAction,
  BlueprintSource,
  CustomerAccessChannel,
  GhostTownLaunchBlueprint,
  HelpfulPost,
  LandingPageCopy,
  LaunchSiteConfig,
  OfferAndPricing,
  OutreachScript,
  PositioningPlan,
  WeeklyMilestone
} from '../types/launchBlueprint';

export interface CustomerAccessResearchInput {
  status: 'complete' | 'partial' | 'not_run';
  researchDate?: string;
  sources: BlueprintSource[];
  channels: CustomerAccessChannel[];
  publicExpertsAndPartners: Array<{
    name: string;
    role: string;
    publicUrl: string;
    relevance: string;
    sourceIds: string[];
  }>;
}

type BusinessModel = 'subscription' | 'saas' | 'local_service' | 'consulting' | 'marketplace' | 'digital_product' | 'physical_product' | 'service';

const REQUIRED_RELATIONSHIPS: OutreachScript['relationship'][] = [
  'warm_contact',
  'former_colleague_or_customer',
  'community_member',
  'linkedin_connection',
  'association_member',
  'referral_partner',
  'interview_invitation',
  'offer_test_invitation',
  'follow_up_no_response',
  'follow_up_interest',
  'follow_up_rejection',
  'referral_request'
];

function clean(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/\s+/g, ' ').trim().replace(/\.{2,}$/g, '.');
  return normalized || fallback;
}

function sentence(value: string): string {
  const normalized = clean(value, '');
  if (!normalized) return '';
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'blueprint';
}

function classifyBusinessModel(verdict: EvaluationResult): BusinessModel {
  const text = `${verdict.idea.ideaName} ${verdict.idea.description} ${verdict.idea.targetUser} ${verdict.idea.painfulProblem}`.toLowerCase();
  if (/subscription|monthly|membership|box|recurring delivery/.test(text)) return 'subscription';
  if (/marketplace|match buyers|match customers|connect .* providers|directory/.test(text)) return 'marketplace';
  if (/software|saas|app|platform|dashboard|automation|workflow tool/.test(text)) return 'saas';
  if (/consult|agency|advisory|coach|audit|done-with-you/.test(text)) return 'consulting';
  if (/contractor|repair|installation|local service|home service|clinic|tutoring/.test(text)) return 'local_service';
  if (/course|template|guide|download|digital product|playbook/.test(text)) return 'digital_product';
  if (/physical product|device|kit|shipment|delivery|inventory/.test(text)) return 'physical_product';
  return 'service';
}

function parsedPrice(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, '').match(/(?:\$|USD\s*)?(\d+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function priceRange(model: BusinessModel, supplied?: string): { initial: string; lower: string; upper: string; rationale: string } {
  const numeric = parsedPrice(supplied);
  if (numeric) {
    const lower = Math.max(1, Math.round(numeric * 0.8));
    const upper = Math.max(lower + 1, Math.round(numeric * 1.25));
    return {
      initial: clean(supplied, `$${numeric}`),
      lower: `$${lower}`,
      upper: `$${upper}`,
      rationale: 'The founder supplied the initial price. The lower and upper boundaries create a controlled willingness-to-pay test around that hypothesis.'
    };
  }

  const defaults: Record<BusinessModel, [string, string, string, string]> = {
    subscription: ['$39 founding-member month', '$29', '$59', 'A low-friction founding-member month is large enough to test payment behavior while keeping the first fulfillment batch operationally manageable.'],
    saas: ['$149 implementation pilot', '$99', '$249', 'The first price tests the value of a manually supported workflow before recurring software pricing is treated as proven.'],
    local_service: ['$497 fixed-scope pilot', '$297', '$797', 'The range is designed to test a meaningful service commitment without requiring a broad long-term contract.'],
    consulting: ['$750 fixed-scope pilot', '$500', '$1,250', 'The price tests a bounded professional outcome rather than an open-ended advisory engagement.'],
    marketplace: ['$49 concierge-match pilot', '$25', '$99', 'A concierge transaction or access fee tests whether buyers value the match before marketplace automation is built.'],
    digital_product: ['$49 founding-customer edition', '$29', '$99', 'The range is appropriate for testing a complete but early digital deliverable without claiming established demand.'],
    physical_product: ['$79 founding-customer pilot', '$59', '$129', 'The range leaves room to learn about fulfillment cost while asking for a real purchase commitment.'],
    service: ['$297 fixed-scope pilot', '$197', '$497', 'The range tests a narrow manual outcome before the founder invests in automation or a larger delivery organization.']
  };
  const [initial, lower, upper, rationale] = defaults[model];
  return { initial, lower, upper, rationale };
}

function offerFor(model: BusinessModel, order: PaidTestOrder, verdict: EvaluationResult): OfferAndPricing {
  const buyer = clean(order.intake.targetBuyer, verdict.idea.targetUser || 'the initial customer');
  const problem = clean(order.intake.problem, verdict.idea.painfulProblem || 'the stated problem');
  const ideaName = clean(verdict.idea.ideaName, 'New Business');
  const prices = priceRange(model, order.intake.expectedPrice);
  const suppliedOffer = order.intake.offerHypothesis?.trim();

  const modelContent: Record<BusinessModel, {
    offerName: string;
    promise: string;
    deliveryMethod: string;
    timeToValue: string;
    deliverables: Array<{ name: string; description: string; timeToValue?: string }>;
    responsibilities: string[];
    exclusions: string[];
    riskReversal: string;
  }> = {
    subscription: {
      offerName: `${ideaName} Founding Member Pilot`,
      promise: `Help ${buyer} discover a better-fit recurring selection without repeatedly paying for choices that go unused.`,
      deliveryMethod: 'Concierge founding-member subscription fulfilled manually before automation or large inventory commitments.',
      timeToValue: 'A personalized first selection within seven days of completing the preference profile.',
      deliverables: [
        { name: 'Preference profile', description: 'A short onboarding profile covering household needs, age or experience range, preferences, constraints, and prior disappointments.' },
        { name: 'Curated first selection', description: `A manually selected first delivery or recommendation specifically matched to ${buyer}.`, timeToValue: 'Within seven days' },
        { name: 'Use guide', description: 'A practical guide explaining why the selection fits, how to get value from it, and what to notice during use.' },
        { name: 'Fit review', description: 'A structured follow-up that records satisfaction, usage, objections, and what should change in the next cycle.' },
        { name: 'Founding-member decision', description: 'A clear renewal, exchange, or stop decision based on the first-cycle evidence.' }
      ],
      responsibilities: ['Complete the preference profile accurately.', 'Use or evaluate the first selection during the agreed period.', 'Provide direct feedback before renewal or exchange.'],
      exclusions: ['Unlimited exchanges or replacements.', 'Guaranteed preference match.', 'Large inventory commitments before the pilot proves repeat demand.', 'Unsupported performance or savings claims.'],
      riskReversal: 'If the promised onboarding, curated selection, use guide, or fit-review deliverable is missing, GhostTown recommends completing that missing deliverable at no additional charge.'
    },
    saas: {
      offerName: `${ideaName} Assisted Workflow Pilot`,
      promise: `Help ${buyer} complete one high-friction workflow related to ${problem} with manual support before a full software product is built.`,
      deliveryMethod: 'Done-with-you setup using a manual or lightweight workflow, with software automation added only after evidence supports it.',
      timeToValue: 'First working workflow within seven days.',
      deliverables: [
        { name: 'Workflow review', description: 'Document the current steps, delays, handoffs, and failure points.' },
        { name: 'Configured pilot workflow', description: 'Set up one narrow workflow around the most costly or frustrating step.' },
        { name: 'Tracking view', description: 'Provide a simple way to see status, exceptions, and next action.' },
        { name: 'Team handoff guide', description: 'Explain how the buyer uses the pilot without depending on the founder for every step.' },
        { name: 'Seven-day review', description: 'Compare the pilot with the current alternative and identify the next constraint.' }
      ],
      responsibilities: ['Provide access to the current workflow and sample data that may be used safely.', 'Name one owner for the pilot.', 'Use the pilot during the agreed test period.'],
      exclusions: ['Full product migration.', 'Enterprise integrations.', 'Guaranteed efficiency or revenue improvement.', 'Features not required for the tested workflow.'],
      riskReversal: 'If a listed setup deliverable is missing, complete it at no additional charge before the pilot is considered delivered.'
    },
    local_service: {
      offerName: `${ideaName} Fixed-Scope Pilot`,
      promise: `Give ${buyer} a clear, bounded first result for ${problem} without an open-ended engagement.`,
      deliveryMethod: 'A fixed-scope local or remote service with written inclusions, exclusions, scheduling, and completion criteria.',
      timeToValue: 'Initial assessment or first deliverable within seven days.',
      deliverables: [
        { name: 'Initial assessment', description: 'Confirm fit, urgency, location or access requirements, and the precise outcome being requested.' },
        { name: 'Written scope', description: 'List the work included, the work excluded, timeline, price, and buyer responsibilities.' },
        { name: 'Pilot delivery', description: 'Complete one narrow service result tied directly to the problem.' },
        { name: 'Completion evidence', description: 'Provide photos, notes, checklist, report, or another appropriate proof of work.' },
        { name: 'Next-step recommendation', description: 'Recommend continue, revise, refer, or stop based on the delivered result.' }
      ],
      responsibilities: ['Provide safe and timely access.', 'Disclose relevant constraints before work begins.', 'Approve the written scope before delivery.'],
      exclusions: ['Emergency or regulated work outside the founder’s qualifications.', 'Unpriced change orders.', 'Guaranteed downstream approvals or outcomes.', 'Work not listed in the written scope.'],
      riskReversal: 'Any listed pilot deliverable that is not completed will be completed or removed from the final invoice according to the written scope.'
    },
    consulting: {
      offerName: `${ideaName} Decision Sprint`,
      promise: `Help ${buyer} make one clearer decision about ${problem} using a fixed-scope analysis and action plan.`,
      deliveryMethod: 'A short done-with-you sprint with defined inputs, analysis, working session, and final action plan.',
      timeToValue: 'First decision framework within five business days.',
      deliverables: [
        { name: 'Current-state review', description: 'Review the buyer’s current approach, constraints, and recent examples.' },
        { name: 'Decision framework', description: 'Provide criteria for comparing the most realistic paths forward.' },
        { name: 'Working session', description: 'Apply the framework to the buyer’s actual situation.' },
        { name: 'Action plan', description: 'Provide prioritized next actions, owners, and evidence to collect.' },
        { name: 'Follow-up review', description: 'Review what changed after the buyer acts on the plan.' }
      ],
      responsibilities: ['Provide accurate context and relevant examples.', 'Attend the working session.', 'Choose an owner for each accepted action.'],
      exclusions: ['Open-ended implementation.', 'Guaranteed business outcomes.', 'Legal, medical, tax, or investment advice unless separately qualified.', 'Work outside the written sprint scope.'],
      riskReversal: 'If a listed analysis, working-session, or action-plan deliverable is missing, complete it before closing the sprint.'
    },
    marketplace: {
      offerName: `${ideaName} Concierge Match Pilot`,
      promise: `Help ${buyer} reach one better-qualified option for ${problem} without waiting for a full marketplace to exist.`,
      deliveryMethod: 'A manual concierge matching service using explicit qualification and introduction criteria.',
      timeToValue: 'First qualified match or transparent no-match result within seven days.',
      deliverables: [
        { name: 'Buyer brief', description: 'Capture the buyer’s need, timing, budget, location, and disqualifiers.' },
        { name: 'Provider qualification', description: 'Check candidate fit against the buyer brief using public or directly supplied information.' },
        { name: 'Curated shortlist', description: 'Provide a small, explained shortlist rather than a generic directory.' },
        { name: 'Warm introduction', description: 'Facilitate the agreed introduction when both sides consent.' },
        { name: 'Match outcome review', description: 'Record whether the introduction progressed and why.' }
      ],
      responsibilities: ['Provide a specific brief and realistic constraints.', 'Respond to qualified matches promptly.', 'Report whether the introduction progressed.'],
      exclusions: ['Guaranteed transaction completion.', 'Private-data scraping.', 'Mass unsolicited outreach.', 'A full self-service marketplace during the pilot.'],
      riskReversal: 'If no candidate meets the written qualification criteria, provide a transparent no-match result and the reason rather than an unqualified introduction.'
    },
    digital_product: {
      offerName: `${ideaName} Founding Customer Edition`,
      promise: `Give ${buyer} a complete, usable first resource for ${problem}, supported by a feedback and revision cycle.`,
      deliveryMethod: 'A complete early edition delivered digitally with a guided implementation session.',
      timeToValue: 'Immediate access after purchase and a first useful action within one day.',
      deliverables: [
        { name: 'Complete core resource', description: 'Deliver the full early version rather than a teaser or unfinished outline.' },
        { name: 'Quick-start guide', description: 'Show the buyer what to do first and what result to expect from that action.' },
        { name: 'Implementation worksheet', description: 'Help the buyer apply the resource to a real situation.' },
        { name: 'Founding-customer session', description: 'Review obstacles and collect exact language and missing use cases.' },
        { name: 'Revision entitlement', description: 'Provide the first evidence-backed revision to the founding customer.' }
      ],
      responsibilities: ['Use the resource on a real situation.', 'Complete the implementation worksheet.', 'Provide specific feedback rather than general impressions.'],
      exclusions: ['Guaranteed results.', 'Unlimited consulting.', 'Content outside the promised scope.', 'Invented testimonials or credentials.'],
      riskReversal: 'If a listed resource component is missing, provide it before the founding-customer edition is considered complete.'
    },
    physical_product: {
      offerName: `${ideaName} Founding Customer Pilot`,
      promise: `Let ${buyer} evaluate a narrowly defined first version addressing ${problem} before large production commitments.`,
      deliveryMethod: 'A small-batch or manually assembled first version with explicit fit, delivery, use, and feedback expectations.',
      timeToValue: 'First usable product within the stated pilot fulfillment window.',
      deliverables: [
        { name: 'Fit confirmation', description: 'Confirm the buyer’s use case, constraints, and acceptance criteria.' },
        { name: 'First product version', description: 'Deliver the smallest complete version that can create the proposed useful outcome.' },
        { name: 'Use instructions', description: 'Explain setup, use, care, and known limitations.' },
        { name: 'Feedback review', description: 'Collect observed use, defects, confusion, and willingness to purchase again.' },
        { name: 'Revision decision', description: 'Choose what to change before another batch.' }
      ],
      responsibilities: ['Confirm fit and delivery information.', 'Use the product under normal intended conditions.', 'Report defects or confusion promptly.'],
      exclusions: ['Mass production.', 'Unsupported safety or performance claims.', 'Unlimited replacements.', 'Features outside the pilot specification.'],
      riskReversal: 'Replace or correct a missing listed deliverable or a product that materially differs from the written pilot specification.'
    },
    service: {
      offerName: `${ideaName} Outcome Pilot`,
      promise: `Help ${buyer} make measurable progress on ${problem} through a narrow, manually delivered first engagement.`,
      deliveryMethod: 'A fixed-scope manual service with explicit deliverables, timeline, evidence, and next-step decision.',
      timeToValue: 'First useful deliverable within seven days.',
      deliverables: [
        { name: 'Fit and problem review', description: 'Confirm the buyer, recent problem, current alternative, and desired outcome.' },
        { name: 'Written pilot scope', description: 'Define what will be delivered, when, and what is excluded.' },
        { name: 'First useful result', description: 'Deliver one complete outcome tied directly to the stated problem.' },
        { name: 'Evidence summary', description: 'Record what changed, what did not, and what remains unproven.' },
        { name: 'Next-step decision', description: 'Recommend continue, revise, refer, or stop.' }
      ],
      responsibilities: ['Provide the required inputs.', 'Review the written scope.', 'Participate in the outcome review.'],
      exclusions: ['Open-ended work.', 'Unlisted deliverables.', 'Guaranteed commercial results.', 'Automation before the manual value path is proven.'],
      riskReversal: 'Complete any missing listed deliverable before the pilot is closed.'
    }
  };

  const content = modelContent[model];
  const promise = suppliedOffer
    ? `${sentence(suppliedOffer)} The first test should remain fixed-scope and evidence-seeking.`
    : content.promise;

  return {
    offerName: content.offerName,
    targetCustomer: buyer,
    painfulProblem: problem,
    desiredOutcome: clean(verdict.deterministicScores.oneSentenceAdvice, `Make meaningful progress on ${problem}`),
    oneSentencePromise: promise,
    deliverables: content.deliverables,
    deliveryMethod: content.deliveryMethod,
    timeToFirstUsefulResult: content.timeToValue,
    buyerResponsibilities: content.responsibilities,
    exclusions: content.exclusions,
    initialTestPrice: prices.initial,
    lowerTestBoundary: prices.lower,
    upperTestBoundary: prices.upper,
    pricingRationale: prices.rationale,
    objections: [
      { objection: 'I am not sure this will fit my situation.', response: 'Use the qualification and onboarding step to confirm fit before payment or delivery begins.' },
      { objection: 'The price feels high for an unproven offer.', response: `The offer is a bounded founding-customer pilot at ${prices.initial}, with written deliverables and no long-term commitment.` },
      { objection: 'I already use another option.', response: `The pilot does not require replacing ${clean(order.intake.currentWorkaround, verdict.idea.currentAlternative || 'the current approach')} before the buyer sees a useful first result.` },
      { objection: 'I do not have time for a complicated implementation.', response: `The first useful result is designed for ${content.timeToValue.toLowerCase()}, with buyer responsibilities stated before the pilot starts.` },
      { objection: 'What happens if the pilot is not useful?', response: content.riskReversal }
    ],
    riskReversal: content.riskReversal,
    truthLabel: 'Test'
  };
}

function positioningFor(model: BusinessModel, order: PaidTestOrder, verdict: EvaluationResult, offer: OfferAndPricing): PositioningPlan {
  const buyer = offer.targetCustomer;
  const problem = offer.painfulProblem;
  const workaround = clean(order.intake.currentWorkaround, verdict.idea.currentAlternative || 'the current approach');
  const triggersByModel: Record<BusinessModel, string[]> = {
    subscription: ['A recent purchase went unused or disappointed the household.', 'A recurring occasion creates demand for fresh options.', 'The buyer is tired of researching and choosing repeatedly.'],
    saas: ['A manual workflow causes a visible delay or error.', 'Volume increased beyond what spreadsheets or reminders can handle.', 'A deadline, client complaint, or missed handoff exposed the current process.'],
    local_service: ['A specific job, repair, inspection, deadline, or customer complaint became urgent.', 'The buyer cannot confidently complete the work internally.', 'Delay now has a visible cost or operational consequence.'],
    consulting: ['A decision is blocked by uncertainty or disagreement.', 'A deadline or costly commitment is approaching.', 'The buyer has tried to solve the issue internally without a clear path.'],
    marketplace: ['The buyer needs a qualified option now, not a broad directory.', 'A prior search produced weak, risky, or irrelevant choices.', 'Timing, trust, or qualification matters more than browsing volume.'],
    digital_product: ['The buyer must complete a task soon and lacks a usable process.', 'Free information has created overload rather than action.', 'A recent failure made a structured resource more valuable.'],
    physical_product: ['The current product is unavailable, poorly fitted, unreliable, or expensive.', 'A specific upcoming use makes the purchase timely.', 'The buyer is willing to evaluate a first version with clear limitations.'],
    service: ['A recent failure or delay made the problem visible.', 'The current workaround now consumes too much time, money, or attention.', 'The buyer has authority to test a bounded alternative.']
  };

  return {
    firstTargetCustomer: buyer,
    triggerEvents: triggersByModel[model],
    currentAlternatives: workaround.split(/,|;|\bor\b/i).map(item => item.trim()).filter(Boolean),
    alternativeWeaknesses: [
      `The current approach still leaves the buyer responsible for solving ${problem}.`,
      'Generic alternatives may not account for the buyer’s specific constraints.',
      'The buyer may receive options or activity without a clear first useful result.'
    ],
    buyerLanguage: [
      `“I do not want to waste more money trying the wrong option.”`,
      `“I need a simpler way to handle ${problem}.”`,
      '“I need to know exactly what I receive and what happens next.”'
    ],
    actionTriggers: ['A recent concrete problem.', 'A visible deadline or cost.', 'A clear fixed-scope pilot.', 'Low switching risk and transparent next steps.'],
    rejectionReasons: ['The buyer has no recent instance of the problem.', 'The offer sounds broad or generic.', 'The first result takes too long.', 'The price is presented without a concrete scope.', 'The founder makes unsupported claims.'],
    notFor: ['People who cannot describe a recent instance of the problem.', 'Buyers outside the initial segment during the first 30 days.', 'Anyone requiring guarantees that the validation-stage offer cannot support.'],
    positioningStatement: `For ${buyer}, who is struggling with ${problem}, GhostTown recommends ${offer.offerName}, which helps them reach ${offer.desiredOutcome.toLowerCase()} without depending entirely on ${workaround}.`,
    differentiator: `A narrow, manually supported first result designed specifically around ${problem}, with explicit deliverables, exclusions, evidence, and a decision after the pilot.`
  };
}

function channelName(research: CustomerAccessResearchInput, index: number, fallback: string): string {
  return research.channels[index]?.community || fallback;
}

function helpfulPosts(offer: OfferAndPricing, positioning: PositioningPlan, research: CustomerAccessResearchInput): HelpfulPost[] {
  const buyer = offer.targetCustomer;
  const problem = offer.painfulProblem;
  const alternative = positioning.currentAlternatives[0] || 'the current approach';
  return [
    {
      postId: 'post-1-checklist',
      platform: research.channels[0]?.platform || 'Best-fit researched community',
      intendedCommunity: channelName(research, 0, 'Highest-priority customer community'),
      objective: 'Help the buyer avoid an expensive or frustrating first mistake.',
      title: `A practical checklist before spending more on ${problem}`,
      body: `Before choosing another option, I would check five things:\n\n1. What happened the last time this problem appeared?\n2. Which part created the most cost, delay, or frustration?\n3. What are you using today, and where does it fail?\n4. What would a useful first result look like within one week?\n5. What would make the change feel too risky?\n\nFor ${buyer}, the useful conversation is usually not “Would you use a new product?” It is “What happened last time, what did you try, and what did you do next?”`,
      closingQuestion: `Which of these five questions is hardest to answer for ${problem}?`,
      softCallToAction: 'I can share the one-page version of this checklist if it would be useful.',
      responseSignals: ['A detailed recent example.', 'A named current alternative.', 'A request for the checklist.', 'A direct message describing the problem.'],
      commentResponsePlan: 'Acknowledge the exact situation, ask one factual follow-up about recent behavior, and do not pitch unless the person asks for help.'
    },
    {
      postId: 'post-2-breakdown',
      platform: research.channels[1]?.platform || 'Second-priority researched community',
      intendedCommunity: channelName(research, 1, 'Second-priority customer community'),
      objective: 'Explain how to compare the current alternatives without promoting the offer.',
      title: `How I would compare the real alternatives to ${alternative}`,
      body: `A useful comparison should include more than price. I would score each option on:\n\n• Time to the first useful result\n• Fit for the specific buyer\n• Work the buyer must still do\n• Switching risk\n• Ongoing cost\n• What happens when the first attempt is wrong\n\nThe “do nothing” option belongs in the comparison too. Sometimes the current workaround is good enough. The test is whether the remaining cost or frustration is large enough to justify change.`,
      closingQuestion: 'Which comparison factor matters most in your situation?',
      responseSignals: ['Named alternatives.', 'Price or switching objections.', 'Descriptions of failed prior attempts.', 'Requests for a comparison template.'],
      commentResponsePlan: 'Ask how the commenter currently evaluates options and record the words they use for trust, price, and switching risk.'
    },
    {
      postId: 'post-3-observation',
      platform: research.channels[2]?.platform || 'Professional social channel',
      intendedCommunity: channelName(research, 2, 'Professional customer discussion'),
      objective: 'Share an evidence-seeking observation that invites real examples.',
      title: `The hidden cost is often choosing again, not only buying once`,
      body: `One pattern worth testing: people often describe the visible cost of ${problem}, but the larger burden may be repeating the search, comparison, setup, or decision every time the first choice disappoints.\n\nThat suggests a useful early offer should not promise a perfect answer. It should reduce the cost of making and correcting the first decision.`,
      closingQuestion: 'Where does the repeated decision or rework show up in your process?',
      responseSignals: ['Examples of repeated work.', 'Mentions of unused purchases or failed implementations.', 'Comments describing who makes the decision.', 'Interest in a pilot.'],
      commentResponsePlan: 'Separate agreement from evidence. Ask for the last real instance and what the person did after the first option failed.'
    },
    {
      postId: 'post-4-resource',
      platform: research.channels[3]?.platform || 'Resource-friendly community',
      intendedCommunity: channelName(research, 3, 'Resource-friendly customer community'),
      objective: 'Give the community an immediately usable mini-template.',
      title: `A one-page “first useful result” template for ${problem}`,
      body: `Use this before buying or building a larger solution:\n\nBuyer: [one narrow segment]\nRecent problem: [what happened]\nCurrent alternative: [what they used]\nFirst useful result: [what must be true in seven days]\nBuyer responsibility: [what they must provide]\nNot included: [three exclusions]\nEvidence: [payment, action, or measurable behavior]\nStop condition: [what would make you stop]\n\nA clear first-result definition makes it easier to compare offers and harder to hide behind activity.`,
      closingQuestion: 'What would you put in the “first useful result” line?',
      softCallToAction: 'Use the template freely and adapt it to the community’s rules.',
      responseSignals: ['Completed template examples.', 'Questions about scope.', 'Requests for feedback.', 'Mentions of a current buying decision.'],
      commentResponsePlan: 'Help commenters narrow the result without turning the thread into a sales pitch.'
    },
    {
      postId: 'post-5-validation',
      platform: research.channels[4]?.platform || 'Conversation-oriented community',
      intendedCommunity: channelName(research, 4, 'Conversation-oriented customer community'),
      objective: 'Start a candid conversation about how buyers currently solve the problem.',
      title: `When ${problem.toLowerCase()}, what do you actually do next?`,
      body: `I am trying to understand the real workflow behind this problem—not collect “would you use it?” opinions.\n\nWhen this happened most recently:\n• What triggered it?\n• What did you try first?\n• What was frustrating about that option?\n• Did you spend money, time, or both?\n• What would have made the first attempt more useful?\n\nNo product link. I am interested in the current behavior and the language people use to describe it.`,
      closingQuestion: 'What happened the last time you dealt with it?',
      responseSignals: ['Detailed recent stories.', 'Named paid alternatives.', 'Specific objections.', 'Volunteers for a 15-minute conversation.'],
      commentResponsePlan: 'Thank each participant, ask only one follow-up at a time, and offer a short findings summary after enough evidence is collected.'
    }
  ];
}

function outreachScripts(offer: OfferAndPricing, _positioning: PositioningPlan): OutreachScript[] {
  const buyer = offer.targetCustomer;
  const problem = offer.painfulProblem;
  const offerName = offer.offerName;
  const price = offer.initialTestPrice;
  const interviewCore = `I’m researching how ${buyer} currently handle ${problem}. I’m not trying to sell anything during the conversation. I’m looking for 15 minutes to understand what happened most recently, what you tried, and what remains frustrating. In return, I can send you the short findings summary when it is complete.`;
  const scripts: Record<OutreachScript['relationship'], Omit<OutreachScript, 'scriptId' | 'relationship'>> = {
    warm_contact: { title: 'Warm contact', purpose: 'Request a candid introduction or interview.', useWhen: 'You know the person and can reference the relationship honestly.', message: `Hi [Name] — I’m testing a very narrow idea for ${buyer} dealing with ${problem}. ${interviewCore} You came to mind because [specific honest reason]. Would you be open to a short conversation, or is there one person you think I should speak with?` },
    former_colleague_or_customer: { title: 'Former colleague or customer', purpose: 'Use relevant shared context without assuming they are a buyer.', useWhen: 'The prior relationship is relevant to the problem.', message: `Hi [Name] — our past work on [specific context] made me think you may have a useful perspective on ${problem}. ${interviewCore} I will keep it focused and will not turn the call into a pitch.` },
    community_member: { title: 'Community member', purpose: 'Move from a useful public exchange to a private research conversation.', useWhen: 'The person publicly described a relevant situation.', message: `Your comment about [specific public point] was useful. I’m researching how ${buyer} handle ${problem}, and your example sounded directly relevant. Would you be open to a 15-minute conversation about what happened and what you tried? I’m not selling during the interview.` },
    linkedin_connection: { title: 'LinkedIn connection', purpose: 'Request a specific research conversation.', useWhen: 'The person’s public role or post indicates relevant experience.', message: `Hi [Name] — I noticed your work with [specific public role/company/context]. I’m researching ${problem} among ${buyer}. I’m looking for a 15-minute conversation about the current workflow, not a general “pick your brain” call. I can send the summarized findings afterward.` },
    association_member: { title: 'Association member', purpose: 'Request insight grounded in the association’s field.', useWhen: 'The person is publicly listed as a member, organizer, speaker, or chapter contact.', message: `Hi [Name] — I found your public association role while researching how ${buyer} deal with ${problem}. I’m speaking with a small number of people about the current process and common mistakes. Would you be open to a short research conversation or point me to the most relevant public resource?` },
    referral_partner: { title: 'Potential referral partner', purpose: 'Explore a complementary relationship without asking for mass promotion.', useWhen: 'The partner serves the same buyer but does not directly compete.', message: `Hi [Name] — you help ${buyer} with [their public specialty]. I’m testing ${offerName}, a narrow pilot focused on ${problem}. I’m not asking you to promote an unproven offer. I’d value 15 minutes to understand whether this problem appears in your work and what a responsible referral would require if the pilot proves useful.` },
    interview_invitation: { title: 'Interview invitation', purpose: 'Book a behavior-focused customer interview.', useWhen: 'The prospect matches the qualification criteria.', message: `${interviewCore} Would [time option one] or [time option two] work?` },
    offer_test_invitation: { title: 'Offer test invitation', purpose: 'Ask a qualified buyer for a transparent pilot commitment.', useWhen: 'The person has described a recent problem and fits the initial segment.', message: `Based on what you described about ${problem}, I’ve prepared ${offerName}. It includes ${offer.deliverables.slice(0, 3).map(item => item.name).join(', ')}, with the first useful result in ${offer.timeToFirstUsefulResult.toLowerCase()}. The founding-customer test price is ${price}. This is a validation-stage pilot, not a promise of guaranteed results. Would you like to review the written scope and decide whether it fits?` },
    follow_up_no_response: { title: 'Follow-up after no response', purpose: 'Give the person one clear, respectful second opportunity.', useWhen: 'At least three business days passed after a relevant first message.', message: `Hi [Name] — one brief follow-up on my note about ${problem}. I’m still looking for a small number of recent, real examples from ${buyer}. A simple “not relevant” is helpful too, and I won’t keep following up.` },
    follow_up_interest: { title: 'Follow-up after interest', purpose: 'Convert interest into a defined next step.', useWhen: 'The person asked a question or expressed relevant interest.', message: `Thanks for the interest. The clearest next step is [15-minute fit call / written pilot scope / payment link]. I’ll confirm the deliverables, exclusions, ${price} test price, and the first-result timeline before you commit. Would [option one] or [option two] work?` },
    follow_up_rejection: { title: 'Follow-up after rejection', purpose: 'Learn from a specific rejection without pressuring the prospect.', useWhen: 'The person declined and the relationship permits one learning question.', message: `Thanks for the direct answer. I won’t push the offer. For the research record, was the main issue buyer fit, problem urgency, trust, timing, scope, or price? A one-line answer is enough and will help me avoid making the wrong change.` },
    referral_request: { title: 'Referral request', purpose: 'Request one relevant introduction after value or useful research participation.', useWhen: 'The person received value or clearly understands the target buyer.', message: `Thank you for the help with ${problem}. Is there one ${buyer} who has dealt with this recently and might be willing to share their experience? A direct introduction is useful only if you believe the conversation would be relevant; please do not send a list or private information.` }
  };

  return REQUIRED_RELATIONSHIPS.map((relationship, index) => ({
    scriptId: `script-${String(index + 1).padStart(2, '0')}-${relationship}`,
    relationship,
    ...scripts[relationship]
  }));
}

function landingPageCopy(offer: OfferAndPricing, positioning: PositioningPlan): LandingPageCopy {
  const deliverableNames = offer.deliverables.map(item => item.name);
  return {
    metadataTitle: `${offer.offerName} | Founding-customer pilot`,
    metadataDescription: `${offer.oneSentencePromise} Review the fixed scope, ${offer.initialTestPrice} test price, timeline, and next step.`,
    socialDescription: `${offer.offerName}: a validation-stage pilot for ${offer.targetCustomer}.`,
    targetCustomerCallout: `For ${offer.targetCustomer}`,
    headline: offer.oneSentencePromise.replace(/[.]$/, ''),
    subheadline: `${offer.offerName} is a fixed-scope founding-customer pilot designed to produce a first useful result in ${offer.timeToFirstUsefulResult.toLowerCase()}.`,
    problemSection: `${sentence(offer.painfulProblem)} The current alternatives still leave the buyer with research, coordination, uncertainty, rework, or the risk of choosing incorrectly.`,
    currentAlternativeSection: `Buyers currently rely on ${positioning.currentAlternatives.join(', ') || 'their existing workaround'}. The pilot does not require them to abandon that approach before seeing a first useful result.`,
    offerDescription: `${offer.deliveryMethod} The scope is intentionally narrow so the buyer can evaluate fit, usefulness, delivery effort, and the next decision without a long-term commitment.`,
    deliverables: offer.deliverables.map(item => `${item.name}: ${item.description}`),
    howItWorks: [
      { step: '1. Confirm fit', description: 'Review the buyer, recent problem, constraints, responsibilities, and exclusions.' },
      { step: '2. Approve the pilot', description: `Approve the written scope and ${offer.initialTestPrice} test price.` },
      { step: '3. Receive the first result', description: `Complete the required inputs and receive the first useful result in ${offer.timeToFirstUsefulResult.toLowerCase()}.` },
      { step: '4. Review the evidence', description: 'Record what was useful, what failed, and whether to continue, revise, refer, or stop.' }
    ],
    expectedTimeline: offer.timeToFirstUsefulResult,
    pricePresentation: `${offer.initialTestPrice} founding-customer pilot. The controlled test range is ${offer.lowerTestBoundary} to ${offer.upperTestBoundary}; the final price is not treated as proven until qualified buyers act.`,
    faq: [
      { question: 'Who is this for?', answer: `The first 30-day test is only for ${offer.targetCustomer} who can describe a recent instance of ${offer.painfulProblem}.` },
      { question: 'What exactly do I receive?', answer: deliverableNames.join(', ') + '.' },
      { question: 'How quickly will I receive something useful?', answer: offer.timeToFirstUsefulResult + '.' },
      { question: 'Is this a finished, proven product?', answer: 'No. This is a transparent founding-customer pilot designed to validate fit and delivery through real buyer behavior.' },
      { question: 'What is not included?', answer: offer.exclusions.join('; ') + '.' },
      { question: 'What happens if a listed deliverable is missing?', answer: offer.riskReversal },
      { question: 'Do I have to replace my current option?', answer: 'No. The pilot is designed to create a comparable first result before a broader switching decision.' }
    ],
    proofPlaceholders: ['Founding-customer result with permission.', 'Verified before-and-after workflow metric.', 'Customer quotation used only with explicit permission.'],
    riskReversal: offer.riskReversal,
    primaryCallToAction: 'Apply for the founding-customer pilot',
    secondaryCallToAction: 'Ask a question before applying',
    thankYouPageCopy: 'Thank you. Your request has been received. We will confirm fit, scope, responsibilities, timeline, and the validation-stage nature of the pilot before asking you to commit.',
    confirmationEmailSubject: `Your ${offer.offerName} request`,
    confirmationEmailBody: `Thank you for your interest in ${offer.offerName}. Your request is not yet an acceptance or charge. The next step is a short fit review covering your recent problem, current alternative, required inputs, written deliverables, exclusions, ${offer.initialTestPrice} test price, and first-result timeline.`
  };
}

function launchSiteConfig(offer: OfferAndPricing, positioning: PositioningPlan, copy: LandingPageCopy, ownerEmail: string, ideaName: string): LaunchSiteConfig {
  return {
    schemaVersion: 'launch-site-config-v1',
    site: {
      businessName: ideaName,
      logoUrl: null,
      primaryDomain: null,
      contactEmail: ownerEmail,
      phone: null,
      location: null
    },
    offer: {
      offerName: offer.offerName,
      targetCustomer: offer.targetCustomer,
      headline: copy.headline,
      subheadline: copy.subheadline,
      primaryOutcome: offer.desiredOutcome,
      price: offer.initialTestPrice,
      priceExplanation: 'Founding-customer pilot price; final pricing remains a test.',
      deliveryMethod: offer.deliveryMethod,
      timeToFirstValue: offer.timeToFirstUsefulResult,
      callToAction: copy.primaryCallToAction,
      secondaryCallToAction: copy.secondaryCallToAction
    },
    problem: {
      summary: offer.painfulProblem,
      painPoints: [offer.painfulProblem, ...positioning.alternativeWeaknesses.slice(0, 2)]
    },
    solution: {
      summary: offer.oneSentencePromise,
      deliverables: copy.deliverables,
      exclusions: offer.exclusions
    },
    positioning: {
      currentAlternatives: positioning.currentAlternatives,
      differentiator: positioning.differentiator,
      idealFor: [offer.targetCustomer, ...positioning.actionTriggers.slice(0, 2)],
      notFor: positioning.notFor
    },
    proof: {
      status: 'validation-stage',
      claimsAllowed: [],
      proofPlaceholders: copy.proofPlaceholders
    },
    riskReversal: {
      type: 'deliverable',
      text: offer.riskReversal
    },
    faq: copy.faq,
    leadCapture: {
      mode: 'email',
      destination: ownerEmail,
      buttonLabel: copy.primaryCallToAction
    },
    legal: {
      privacyPolicy: true,
      termsOfService: true,
      refundPolicy: true,
      disclaimer: true
    }
  };
}

function weeklyMilestones(_offer: OfferAndPricing): WeeklyMilestone[] {
  return [
    {
      weekNumber: 1,
      objective: 'Activate the Launch Site Starter and verify the initial customer, problem, offer, price, and customer-access priorities.',
      priorities: ['Review the populated site.', 'Verify assumptions against public customer conversations.', 'Select five priority customer channels.', 'Prepare the first outreach batch.'],
      milestone: 'A coherent, visible offer with one customer, one problem, one pilot, one price hypothesis, and five prioritized access channels.',
      successMetrics: ['Launch Site Starter version 1 saved.', 'One target-customer definition.', 'One primary problem.', 'One initial offer.', 'Five priority channels selected.']
    },
    {
      weekNumber: 2,
      objective: 'Publish the site, contribute useful material, and begin qualified customer conversations.',
      priorities: ['Publish or privately share the site.', 'Use the prepared scripts.', 'Publish helpful posts one and two.', 'Record exact buyer language and objections.'],
      milestone: 'The offer is visible and qualified customer conversations have begun.',
      successMetrics: ['Landing page published or privately shared.', 'Tracking active.', 'Outreach batch completed.', 'Qualified conversations booked.', 'Two helpful posts published.']
    },
    {
      weekNumber: 3,
      objective: 'Ask qualified buyers for a meaningful commitment and identify the largest conversion constraint.',
      priorities: ['Send transparent pilot invitations.', 'Test the initial price.', 'Contact complementary partners.', 'Compare channel results.', 'Record commitment behavior.'],
      milestone: 'The founder has behavioral evidence rather than compliments.',
      successMetrics: ['Qualified replies.', 'Buying conversations.', 'Deposits, payments, or serious commitments.', 'Objections grouped by frequency.', 'Channel-by-channel evidence.']
    },
    {
      weekNumber: 4,
      objective: 'Correct one primary constraint, run a focused second test, and make a disciplined decision.',
      priorities: ['Select the largest constraint.', 'Make one evidence-backed revision.', 'Run a second acquisition test.', 'Compile the evidence.', 'Choose continue, revise, pivot, or stop.'],
      milestone: 'A documented decision supported by observable evidence.',
      successMetrics: ['Commitment rate.', 'Qualified conversations.', 'Acquisition effort per prospect.', 'Expected delivery cost and gross margin.', 'Final decision recorded.']
    }
  ];
}

function effort(day: number): BlueprintDailyAction['estimatedEffort'] {
  return [1, 8, 11, 15, 21, 25, 28, 29].includes(day) ? 'heavy' : [4, 6, 7, 13, 14, 20, 22, 23, 27, 30].includes(day) ? 'moderate' : 'light';
}

function dailyCalendar(offer: OfferAndPricing, _positioning: PositioningPlan, research: CustomerAccessResearchInput): BlueprintDailyAction[] {
  const channelNames = research.channels.slice(0, 5).map(channel => channel.community);
  const priorities = channelNames.length ? channelNames.join(', ') : 'the five researched priority channels';
  const entries: Array<[string, string, string[], string[], string, string, string[]]> = [
    ['Activate your website draft', 'Review and personalize the populated Launch Site Starter.', ['Confirm the business name and contact details.', 'Confirm the target customer, problem, offer, price, and calls to action.', 'Mark any unsupported assumptions for revision.'], ['Populated Launch Site Starter', 'Landing-page copy', 'Offer and positioning section'], 'Launch Site Starter version 1.', 'A qualified prospective buyer can identify who it is for, what is offered, and what action to take.', ['Fields changed.', 'Unsupported assumptions.', 'Questions raised during review.']],
    ['Verify your target customer', `Confirm that ${offer.targetCustomer} is narrow, reachable, and associated with a recent version of the problem.`, ['Review the prepared customer profile and disqualifiers.', 'Check public conversations in the highest-priority channels.', 'Remove any customer claim not supported by current evidence.'], ['Target-customer profile', 'Trigger events', 'Not-for list'], 'Verified target-customer statement.', 'The customer definition includes a recent trigger, clear fit criteria, and explicit exclusions.', ['Exact customer language.', 'Trigger examples.', 'Disqualifying evidence.']],
    ['Finalize the test offer', `Confirm the scope of ${offer.offerName}.`, ['Review every deliverable, responsibility, exclusion, and the first-result timeline.', `Confirm the ${offer.initialTestPrice} initial test price and the controlled boundaries.`, 'Remove any promise that cannot be delivered manually.'], ['Completed offer section', 'Pricing rationale', 'Objection responses'], 'Offer version 1.', 'A buyer can understand the pilot and price in under one minute.', ['Scope changes.', 'Price concerns.', 'Delivery constraints.']],
    ['Review customer-access channels', 'Examine the current communities, associations, creators, and partners found during Blueprint research.', ['Open every recommended public source.', 'Verify access and promotional rules.', 'Flag inactive, closed, or weak-fit channels.'], ['Customer Access Pack', 'Research sources', 'Channel confidence labels'], 'Reviewed customer-access list.', 'Every selected channel has a current source, relevance explanation, and first action.', ['Verified activity.', 'Rule changes.', 'Access restrictions.']],
    ['Select five priority channels', 'Choose the five most credible paths to qualified customer conversations.', [`Prioritize ${priorities}.`, 'Choose a mix of direct, community, association, content, or partner access.', 'Assign one first action to each channel.'], ['Prioritized Customer Access Pack'], 'Five-channel launch list.', 'Each selected channel can plausibly produce a qualified conversation during the next 14 days.', ['Selection reason.', 'Channel owner.', 'First-action date.']],
    ['Observe customer conversations', `Record how ${offer.targetCustomer} describe ${offer.painfulProblem}.`, ['Review recent public discussions before posting.', 'Capture recurring phrases, alternatives, triggers, and objections.', 'Do not copy private information or infer facts not stated publicly.'], ['Buyer-language prompts', 'Response tracking columns'], 'Customer-language log.', 'At least ten relevant public comments, questions, or statements are recorded with source links.', ['Exact phrases.', 'Source URL.', 'Observed alternative.', 'Observed trigger.']],
    ['Complete Week 1 review', 'Decide whether the initial customer, problem, offer, and access plan are coherent enough to test.', ['Compare the site, offer, and customer language.', 'Confirm five usable channels.', 'Choose continue or revise before publishing.'], ['Week 1 scorecard'], 'Week 1 decision.', 'Customer, problem, offer, price, and access path are specific enough for a qualified buyer test.', ['Continue/revise decision.', 'Largest remaining assumption.']],
    ['Prepare the landing page', 'Apply only evidence-supported revisions to the generated Launch Site Starter.', ['Update the headline and problem language from the customer-language log.', 'Confirm the deliverables, exclusions, price, FAQ, proof placeholders, and legal links.', 'Test the lead or purchase action.'], ['Launch Site Starter', 'Landing-page copy', 'FAQ and confirmation copy'], 'Publishable landing page version 2.', 'The page works on mobile and the primary action reaches the configured destination.', ['Copy changes.', 'CTA test receipt.', 'Mobile issues.']],
    ['Publish helpful post one', 'Publish the prepared practical checklist in an appropriate priority community.', ['Read the community rules.', 'Adapt only the tone and formatting, not the substance.', 'Participate genuinely before including any optional soft call to action.'], ['Helpful post 1'], 'One useful community contribution.', 'Relevant comments, questions, profile visits, or interview volunteers—not merely reactions.', ['Post URL.', 'Comments.', 'Repeated language.', 'Interview volunteers.']],
    ['Begin customer outreach', 'Send the first prepared interview invitations to qualified people.', ['Select prospects who meet the qualification criteria.', 'Use the correct relationship-specific script.', 'Log every message and source.'], ['Interview invitation', 'Warm-contact script', 'Community-member script', 'Response tracker'], 'First outreach batch.', 'At least ten qualified messages are sent with no mass unsolicited promotion.', ['Messages sent.', 'Replies.', 'Bookings.', 'Declines.']],
    ['Conduct customer conversations', 'Learn from recent behavior and current alternatives.', ['Use the prepared behavior-focused questions.', 'Ask about the last real occurrence, not hypothetical interest.', 'Record exact wording, cost, delay, approval, and workaround.'], ['Interview script', 'Evidence tracker'], 'Customer conversation notes.', 'At least two qualified conversations contain a recent problem and a real current alternative.', ['Exact quotes with permission status.', 'Current spend or effort.', 'Decision process.']],
    ['Publish helpful post two', 'Share the prepared alternatives breakdown in a second appropriate channel.', ['Adapt the format to the channel.', 'Do not add a promotional link unless rules allow it.', 'Track named alternatives and switching objections.'], ['Helpful post 2'], 'Second useful contribution.', 'The discussion produces named alternatives, buying criteria, or specific objections.', ['Post URL.', 'Alternatives named.', 'Switching concerns.']],
    ['Revise the message', 'Change only claims contradicted or clarified by customer evidence.', ['Compare the prepared copy with exact buyer language.', 'Update the headline, subheadline, and one objection response if necessary.', 'Preserve version 1 for comparison.'], ['Landing-page copy', 'Positioning statement', 'Objection responses'], 'Message version 2.', 'Every change is tied to recorded evidence rather than preference.', ['Before/after copy.', 'Evidence supporting each change.']],
    ['Complete Week 2 review', 'Measure conversations, replies, community response, and recurring objections.', ['Update the weekly scorecard.', 'Rank objections by frequency and seriousness.', 'Confirm whether the offer is ready for a paid ask.'], ['Week 2 scorecard'], 'Week 2 decision.', 'The founder can state what buyers care about, what they use today, and what blocks action.', ['Reply rate.', 'Conversation count.', 'Top objections.', 'Offer-ready decision.']],
    ['Publish or privately share the offer', 'Make the proposed offer available to qualified prospects.', ['Publish the Launch Site Starter or use a private preview.', 'Verify tracking and confirmation messages.', 'Share only with prospects who fit the initial customer definition.'], ['Launch Site Starter', 'Thank-you copy', 'Confirmation email'], 'Live or private offer page.', 'A qualified prospect can review the complete scope and take the next action.', ['Page URL.', 'CTA test.', 'Qualified views.']],
    ['Send pilot invitations', 'Use the prepared transparent offer-test script.', ['Invite the strongest interview participants and qualified prospects.', `State the ${offer.initialTestPrice} test price, deliverables, exclusions, and timeline.`, 'Ask for a concrete next step.'], ['Offer-test invitation', 'Written offer scope'], 'Pilot invitation batch.', 'At least five qualified buyers receive a direct, transparent offer.', ['Invitations.', 'Replies.', 'Calls.', 'Checkout or deposit actions.']],
    ['Follow up with interested prospects', 'Answer questions and record objections without expanding the scope casually.', ['Use the prepared interest follow-up.', 'Classify each objection as fit, problem, trust, timing, scope, or price.', 'Confirm the next step in writing.'], ['Interest follow-up', 'Objection responses'], 'Qualified follow-up log.', 'Every interested prospect has a clear next step or recorded reason for no action.', ['Objections.', 'Next steps.', 'Decision dates.']],
    ['Publish helpful post three', 'Share the prepared original market observation.', ['Use the channel most suited to discussion.', 'Ask for recent examples.', 'Separate agreement from evidence.'], ['Helpful post 3'], 'Third useful contribution.', 'The post produces specific stories, repeated-work examples, or buying triggers.', ['Post URL.', 'Specific examples.', 'Trigger language.']],
    ['Contact potential partners', 'Approach complementary public experts, associations, or service providers.', ['Use the referral-partner or association script.', 'Ask about the problem and responsible referral criteria.', 'Do not request promotion of an unproven offer.'], ['Referral-partner script', 'Association-member script', 'Public expert and partner list'], 'Partner outreach batch.', 'At least three relevant partners receive a specific, responsible request.', ['Partners contacted.', 'Responses.', 'Referral requirements.']],
    ['Review pricing resistance', 'Separate price objections from trust, timing, fit, and scope objections.', ['Review every direct ask.', 'Compare stated objections with buyer behavior.', 'Keep the price unchanged unless evidence points to price specifically.'], ['Pricing rationale', 'Objection log'], 'Pricing evidence note.', 'The founder can explain whether price is the primary constraint.', ['Price objections.', 'Non-price objections.', 'Commitment behavior.']],
    ['Complete Week 3 review', 'Identify the largest constraint affecting commitment.', ['Compare channels, messages, calls, and commitment behavior.', 'Choose one constraint only.', 'Define the smallest evidence-backed revision.'], ['Week 3 scorecard'], 'Primary-constraint decision.', 'One constraint is selected from buyer, problem, offer, trust, channel, price, or copy.', ['Constraint selected.', 'Evidence.', 'Planned revision.']],
    ['Select one constraint', 'Turn the Week 3 finding into a controlled change.', ['State the failed assumption.', 'State what will change and what will remain fixed.', 'Set the second-test pass and fail condition.'], ['Constraint decision template'], 'Second-test brief.', 'The second test changes one primary variable and has a measurable result.', ['Changed variable.', 'Control variables.', 'Thresholds.']],
    ['Revise the constrained component', 'Make one evidence-backed change to the offer, copy, channel, price, or trust mechanism.', ['Apply the selected revision.', 'Preserve the prior version.', 'Update the page and script only where necessary.'], ['Offer assets', 'Launch Site Starter', 'Outreach scripts'], 'Revised test asset.', 'The revision is traceable to the selected evidence and introduces no unsupported claims.', ['Before/after asset.', 'Reason for change.']],
    ['Publish helpful post four', 'Share the prepared practical resource or template.', ['Choose a resource-friendly community.', 'Offer immediate value without requiring a sale.', 'Track completed examples and questions.'], ['Helpful post 4'], 'Fourth useful contribution.', 'The resource generates completed examples, detailed questions, or qualified conversations.', ['Post URL.', 'Uses of the template.', 'Follow-up questions.']],
    ['Run the revised test', 'Present the revised offer to a fresh qualified group.', ['Use the revised page and message.', 'Keep the batch controlled.', 'Track source, version, action, and outcome.'], ['Revised Launch Site Starter', 'Revised offer script', 'Second-test tracker'], 'Second offer-test batch.', 'The new batch produces comparable or stronger qualified response and commitment behavior.', ['Qualified views.', 'Replies.', 'Calls.', 'Commitments.']],
    ['Complete follow-ups', 'Recontact interested prospects with the revised offer.', ['Use the prepared follow-up scripts.', 'Explain the specific revision honestly.', 'Ask for a concrete yes, no, or next step.'], ['No-response follow-up', 'Interest follow-up', 'Rejection follow-up'], 'Final follow-up log.', 'Every viable prospect has a recorded outcome.', ['Yes/no/next step.', 'Reason.', 'Date.']],
    ['Publish helpful post five', 'Start the prepared customer conversation around the central problem.', ['Use a conversation-oriented community.', 'State that no product link is being shared.', 'Ask about recent real behavior.'], ['Helpful post 5'], 'Fifth useful contribution.', 'The discussion produces detailed recent examples or qualified interview volunteers.', ['Post URL.', 'Recent stories.', 'Volunteers.']],
    ['Compile the evidence', 'Summarize outreach, conversations, commitments, objections, channels, and delivery economics.', ['Update strong, medium, and weak evidence.', 'Calculate time and cash spent.', 'Compare the first and second tests.'], ['Evidence scoreboard', 'Response tracker', 'Weekly scorecards'], '30-day evidence summary.', 'Every major conclusion links to observable behavior or a clearly labeled assumption.', ['Strong evidence.', 'Medium evidence.', 'Weak evidence.', 'Costs.']],
    ['Make the business decision', 'Choose continue, revise, pivot, or stop.', ['Apply the decision criteria.', 'Write the decision and supporting evidence.', 'Name the next irreversible action that is still not justified.'], ['Final-decision criteria'], 'Final decision memo.', 'The decision is tied to evidence and not excitement, fear, or sunk cost.', ['Decision.', 'Supporting evidence.', 'Unresolved risks.']],
    ['Prepare the next plan', 'Create the next 30-day plan only when the evidence supports continuing.', ['Select the next riskiest assumption.', 'Define three weekly milestones and one stop condition.', 'List the first five actions.'], ['Final decision memo', 'Evidence summary'], 'Next bounded 30-day roadmap or archived stop record.', 'The next plan targets a specific risk and does not default to broad product building.', ['Next objective.', 'Milestones.', 'Stop condition.', 'First five actions.']]
  ];

  return entries.map((entry, index) => ({
    dayNumber: index + 1,
    title: entry[0],
    primaryObjective: entry[1],
    estimatedEffort: effort(index + 1),
    requiredActions: entry[2],
    preparedAssets: entry[3],
    expectedDeliverable: entry[4],
    successMeasurement: entry[5],
    evidenceToRecord: entry[6],
    completionKey: `day-${String(index + 1).padStart(2, '0')}-${slug(entry[0])}`
  }));
}

function placeholderFailures(blueprint: GhostTownLaunchBlueprint): string[] {
  const text = JSON.stringify({
    executiveDecision: blueprint.executiveDecision,
    offer: blueprint.offer,
    positioning: blueprint.positioning,
    landingPageCopy: blueprint.landingPageCopy,
    launchSite: blueprint.launchSite
  });
  const patterns: Array<[RegExp, string]> = [
    [/\bTBD\b|to be determined|coming soon/i, 'Contains an unfinished placeholder.'],
    [/supplied by the founder or discovered during interviews/i, 'Contains the old generic price placeholder.'],
    [/a narrow manual pilot that helps/i, 'Contains the old generic offer placeholder.'],
    [/owner@example\.com/i, 'Contains a placeholder contact email.'],
    [/\.\./, 'Contains repeated punctuation.']
  ];
  return patterns.filter(([pattern]) => pattern.test(text)).map(([, failure]) => failure);
}

export function validateGhostTownLaunchBlueprint(blueprint: GhostTownLaunchBlueprint): GhostTownLaunchBlueprint['qualityGate'] {
  const failures: string[] = [];
  const warnings: string[] = [];
  if (blueprint.schemaVersion !== 'ghosttown-launch-blueprint-v2') failures.push('Wrong Blueprint schema version.');
  if (blueprint.offer.deliverables.length < 4) failures.push('Offer must include at least four finished deliverables.');
  if (blueprint.offer.objections.length < 5) failures.push('Offer must answer at least five objections.');
  if (blueprint.positioning.currentAlternatives.length < 1) failures.push('Positioning must name at least one current alternative.');
  if (blueprint.customerAccessPack.channels.length < 10 || blueprint.customerAccessPack.channels.length > 25) failures.push('Customer Access Pack must contain 10–25 prioritized channels.');
  if (blueprint.generationReceipt.researchStatus !== 'complete') failures.push('Current customer-access research is incomplete.');
  if (!blueprint.generationReceipt.researchDate) failures.push('Research date is missing.');
  if (blueprint.sources.length < 1) failures.push('No public research sources were stored.');
  for (const channel of blueprint.customerAccessPack.channels) {
    if (!/^https:\/\//.test(channel.publicUrl)) failures.push(`Channel ${channel.community} lacks a public HTTPS URL.`);
    if (!channel.sourceIds.length) failures.push(`Channel ${channel.community} lacks source attribution.`);
    if (!channel.researchDate) failures.push(`Channel ${channel.community} lacks a research date.`);
  }
  if (blueprint.customerAccessPack.helpfulPosts.length !== 5) failures.push('Exactly five finished helpful posts are required.');
  if (blueprint.customerAccessPack.helpfulPosts.some(post => post.body.length < 180)) failures.push('Every helpful post must contain a substantive finished draft.');
  const scriptRelationships = new Set(blueprint.customerAccessPack.outreachScripts.map(script => script.relationship));
  for (const relationship of REQUIRED_RELATIONSHIPS) if (!scriptRelationships.has(relationship)) failures.push(`Missing outreach script: ${relationship}.`);
  if (blueprint.landingPageCopy.deliverables.length < 4) failures.push('Landing-page copy is missing complete deliverables.');
  if (blueprint.landingPageCopy.faq.length < 6) failures.push('Landing-page copy must include at least six objection FAQs.');
  if (!blueprint.launchSite.offer.headline || !blueprint.launchSite.leadCapture.destination) failures.push('Launch Site configuration is incomplete.');
  if (blueprint.dailyCalendar.length !== 30) failures.push('Daily calendar must contain exactly 30 actions.');
  if (blueprint.dailyCalendar.some((day, index) => day.dayNumber !== index + 1)) failures.push('Daily calendar day numbering is invalid.');
  if (blueprint.dailyCalendar.some(day => !day.requiredActions.length || !day.preparedAssets.length || !day.expectedDeliverable || !day.successMeasurement || !day.evidenceToRecord.length)) failures.push('Every day must include actions, prepared assets, deliverable, measurement, and evidence.');
  failures.push(...placeholderFailures(blueprint));

  if (blueprint.sources.length < blueprint.customerAccessPack.channels.length / 2) warnings.push('Research source diversity may be too low for the number of channels.');
  if (blueprint.customerAccessPack.channels.some(channel => channel.confidence === 'low' || channel.confidence === 'unverified')) warnings.push('One or more customer channels require manual verification before use.');
  return { passed: failures.length === 0, failures: [...new Set(failures)], warnings: [...new Set(warnings)] };
}

export function createGhostTownLaunchBlueprint(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  research: CustomerAccessResearchInput,
  generatedAt = order.paidAt || order.updatedAt || order.createdAt
): GhostTownLaunchBlueprint {
  const model = classifyBusinessModel(verdict);
  const offer = offerFor(model, order, verdict);
  const positioning = positioningFor(model, order, verdict, offer);
  const posts = helpfulPosts(offer, positioning, research);
  const scripts = outreachScripts(offer, positioning);
  const copy = landingPageCopy(offer, positioning);
  const site = launchSiteConfig(offer, positioning, copy, order.email, clean(verdict.idea.ideaName, 'New Business'));
  const days = dailyCalendar(offer, positioning, research);
  const blueprintId = `blueprint_${slug(order.orderId)}`;
  const strongestOpportunity = offer.oneSentencePromise;
  const biggestRisk = clean(verdict.deterministicScores.doNotBuildUntil, `Do not scale until qualified ${offer.targetCustomer} take a meaningful action.`);
  const truthLabel: TruthLabel = 'Test';

  const blueprint: GhostTownLaunchBlueprint = {
    schemaVersion: 'ghosttown-launch-blueprint-v2',
    blueprintId,
    blueprintVersion: '2.0',
    status: 'in_progress',
    orderId: order.orderId,
    ownerId: order.email,
    sourceVerdictId: verdict.resultId,
    createdAt: generatedAt,
    executiveDecision: {
      originalIdea: `${clean(verdict.idea.ideaName, 'Untitled idea')}: ${clean(verdict.idea.description, 'No description supplied')}`,
      verdict: `${clean(verdict.deterministicScores.verdictHeadline, 'Test before building')}. ${clean(verdict.deterministicScores.verdictExplanation, 'Collect behavioral evidence before increasing investment.')}`,
      strongestOpportunity,
      biggestRisk,
      recommendedInitialCustomer: offer.targetCustomer,
      validationObjective: `Within 30 days, determine whether qualified ${offer.targetCustomer} will engage with, discuss, and make a meaningful commitment to ${offer.offerName}.`,
      founderTimeRiskHours: 45,
      founderCashRiskMaximum: model === 'physical_product' || model === 'subscription' ? 300 : 150,
      currency: 'USD',
      continueEvidence: ['Repeated qualified buyers describe a recent painful problem.', 'At least one buyer pays, deposits, signs, or takes another serious buying action.', 'The first result can be delivered within the planned effort and cost.', 'At least one acquisition path can be repeated.'],
      stopEvidence: ['Qualified buyers cannot be reached after honest channel testing.', 'Buyers do not describe a recent meaningful problem.', 'The transparent paid ask produces no commitment and no sharper learning.', 'Delivery requires unrealistic cost, time, risk, or unsupported capability.']
    },
    offer,
    positioning,
    customerAccessPack: {
      initialCustomerProfile: `${offer.targetCustomer} who can describe a recent instance of ${offer.painfulProblem}, currently use one of the named alternatives, and can influence or make the buying decision.`,
      buyerTriggerEvents: positioning.triggerEvents,
      searchPhrases: [
        `"${offer.painfulProblem}"`,
        `"${offer.targetCustomer}" ${offer.painfulProblem}`,
        `${offer.targetCustomer} community`,
        `${offer.targetCustomer} association`,
        `${offer.targetCustomer} forum`,
        `${offer.targetCustomer} ${positioning.currentAlternatives[0] || 'alternative'}`
      ],
      channels: research.channels,
      publicExpertsAndPartners: research.publicExpertsAndPartners,
      helpfulPosts: posts,
      outreachScripts: scripts,
      thirtyDayContactSchedule: days
        .filter(day => [6, 9, 10, 11, 12, 16, 17, 18, 19, 24, 26, 27].includes(day.dayNumber))
        .map(day => ({ dayNumber: day.dayNumber, action: day.primaryObjective, channelIds: research.channels.slice(0, 5).map(channel => channel.channelId) })),
      responseTrackingColumns: ['Date', 'Source', 'Channel', 'Person or organization', 'Qualification reason', 'Message version', 'Status', 'Exact response', 'Problem trigger', 'Current alternative', 'Objection category', 'Commitment evidence', 'Next action', 'Follow-up date', 'Source link']
    },
    landingPageCopy: copy,
    launchSite: site,
    weeklyMilestones: weeklyMilestones(offer),
    dailyCalendar: days,
    finalDecision: {
      options: ['continue', 'revise', 'pivot', 'stop'],
      criteria: [
        { decision: 'continue', condition: 'Repeated qualified buyers show recent pain, at least one meaningful commitment exists, and delivery appears repeatable within the risk limits.', nextAction: 'Run another focused paid-pilot batch before broad automation.' },
        { decision: 'revise', condition: 'The buyer and problem remain credible, but one constraint—offer, trust, channel, copy, delivery, or price—blocks action.', nextAction: 'Change one constraint and run a smaller controlled test.' },
        { decision: 'pivot', condition: 'Evidence supports a related problem or customer, but the current buyer/problem pair or business model does not produce commitment.', nextAction: 'Preserve the evidence, define the new hypothesis, and issue a separate bounded test.' },
        { decision: 'stop', condition: 'Qualified buyers cannot be reached, do not report recent pain, reject the transparent paid ask, and show no credible workaround budget.', nextAction: 'Archive the evidence and redirect effort to a sharper opportunity.' }
      ]
    },
    sources: research.sources,
    qualityGate: { passed: false, failures: [], warnings: [] },
    generationReceipt: {
      sourceVerdictId: verdict.resultId,
      generatedAt,
      generatorVersion: 'launch-blueprint-v2.0',
      researchStatus: research.status,
      researchDate: research.researchDate,
      sourceCount: research.sources.length,
      fallbackStatus: 'deterministic_only',
      fallbackReason: truthLabel === 'Test' ? 'The deterministic generator produced completed commercial assets; customer-access findings must come from the supplied current research bundle.' : undefined
    }
  };

  blueprint.qualityGate = validateGhostTownLaunchBlueprint(blueprint);
  blueprint.status = blueprint.qualityGate.passed ? 'ready' : 'failed_quality_gate';
  return blueprint;
}
