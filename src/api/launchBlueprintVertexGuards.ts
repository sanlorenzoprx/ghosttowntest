import type { GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';
import {
  validateGhostTownLaunchBlueprintV21
} from './launchBlueprintGeneratorV21';
import type {
  LaunchBlueprintVertexContext,
  VertexEvidenceNormalization
} from './launchBlueprintVertexPipeline';

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function withoutTerminalPunctuation(value: string): string {
  return clean(value).replace(/[.!?]+$/g, '');
}

function sentence(value: string): string {
  const normalized = withoutTerminalPunctuation(value);
  return normalized ? `${normalized}.` : '';
}

export function assertVertexEvidenceClassification(
  context: LaunchBlueprintVertexContext,
  evidence: VertexEvidenceNormalization
): void {
  const byId = new Map(context.evidenceCatalog.map(item => [item.evidenceId, item]));
  const verified = new Set(evidence.verifiedEvidenceIds);
  const inferred = new Set(evidence.inferenceEvidenceIds);
  const overlap = [...verified].filter(id => inferred.has(id));
  if (overlap.length) {
    throw new Error(`Vertex Blueprint evidence IDs cannot be both verified and inferred: ${overlap.join(', ')}`);
  }

  const invalidVerified = [...verified].filter(id => byId.get(id)?.truthLabel !== 'Verified');
  if (invalidVerified.length) {
    throw new Error(
      `Vertex Blueprint attempted to promote non-verified evidence into verified facts: ${invalidVerified.join(', ')}`
    );
  }

  const invalidInferences = [...inferred].filter(id => byId.get(id)?.truthLabel !== 'Inferred');
  if (invalidInferences.length) {
    throw new Error(
      `Vertex Blueprint inference IDs must reference evidence already labeled Inferred: ${invalidInferences.join(', ')}`
    );
  }
}

export function synchronizeVertexBlueprintSurfaces(
  blueprint: GhostTownLaunchBlueprintV21
): GhostTownLaunchBlueprintV21 {
  const next = JSON.parse(JSON.stringify(blueprint)) as GhostTownLaunchBlueprintV21;
  const offer = next.offer;

  offer.timeToFirstUsefulResult = next.manualFulfillmentPlan.expectedDeliveryTime;
  next.executiveDecision.recommendedInitialCustomer = clean(
    next.executiveDecision.recommendedInitialCustomer || offer.targetCustomer
  );
  next.firstRevenuePath.firstBuyer = next.executiveDecision.recommendedInitialCustomer;
  next.firstRevenuePath.firstPrice = offer.initialTestPrice;
  next.customerAccessPack.initialCustomerProfile = offer.targetCustomer;

  next.positioning.firstTargetCustomer = offer.targetCustomer;
  next.positioning.positioningStatement =
    `For ${offer.targetCustomer}, ${offer.offerName} is a validation-stage, fixed-scope offer that ${withoutTerminalPunctuation(offer.oneSentencePromise)}.`;
  next.positioning.differentiator =
    `The first version is intentionally manual, evidence-led, and bounded by written scope, ${offer.initialTestPrice} test pricing, and explicit stop criteria.`;

  next.landingPageCopy = {
    ...next.landingPageCopy,
    metadataTitle: `${offer.offerName} | Founding-customer pilot`,
    metadataDescription: `${sentence(offer.oneSentencePromise)} Review the fixed scope, ${offer.initialTestPrice} test price, timeline, and next step.`,
    socialDescription: `${offer.offerName}: a validation-stage pilot for ${offer.targetCustomer}.`,
    targetCustomerCallout: `For ${offer.targetCustomer}`,
    problemSection: `${sentence(offer.painfulProblem)} The first test measures buyer commitment and delivery viability before broader investment.`,
    deliverables: offer.deliverables.map(item => `${item.name}: ${sentence(item.description)}`),
    howItWorks: [
      {
        step: '1. Confirm fit',
        description: 'Review the buyer, recent problem, constraints, responsibilities, and exclusions.'
      },
      {
        step: '2. Approve the pilot',
        description: `Approve the written scope and ${offer.initialTestPrice} test price.`
      },
      {
        step: '3. Receive the first result',
        description: `Complete the required inputs and receive the first useful result in ${withoutTerminalPunctuation(offer.timeToFirstUsefulResult).toLowerCase()}.`
      },
      {
        step: '4. Review the evidence',
        description: 'Record buyer behavior, delivery effort, direct cost, defects, and the next decision.'
      }
    ],
    expectedTimeline: sentence(offer.timeToFirstUsefulResult),
    pricePresentation: `${offer.initialTestPrice} founding-customer pilot. The final price remains unproven until qualified buyers act and delivery economics are recorded.`,
    riskReversal: sentence(offer.riskReversal),
    faq: [
      {
        question: 'Who is this for?',
        answer: `The first test is for ${offer.targetCustomer} who can describe a recent instance of ${withoutTerminalPunctuation(offer.painfulProblem)}.`
      },
      {
        question: 'What exactly do I receive?',
        answer: `${offer.deliverables.map(item => item.name).join(', ')}.`
      },
      {
        question: 'How quickly will I receive something useful?',
        answer: sentence(offer.timeToFirstUsefulResult)
      },
      {
        question: 'Is this a finished, proven product?',
        answer: 'No. This is a transparent validation-stage pilot designed to test buyer commitment and delivery through observed behavior.'
      },
      {
        question: 'What is not included?',
        answer: `${offer.exclusions.map(withoutTerminalPunctuation).join('; ')}.`
      },
      {
        question: 'What happens if a listed deliverable is missing?',
        answer: sentence(offer.riskReversal)
      }
    ]
  };

  next.launchSite.offer = {
    ...next.launchSite.offer,
    offerName: offer.offerName,
    targetCustomer: offer.targetCustomer,
    headline: next.landingPageCopy.headline,
    subheadline: next.landingPageCopy.subheadline,
    primaryOutcome: offer.desiredOutcome,
    price: offer.initialTestPrice,
    priceExplanation: offer.pricingRationale,
    deliveryMethod: offer.deliveryMethod,
    timeToFirstValue: offer.timeToFirstUsefulResult,
    callToAction: next.landingPageCopy.primaryCallToAction,
    secondaryCallToAction: next.landingPageCopy.secondaryCallToAction
  };
  next.launchSite.problem = {
    summary: offer.painfulProblem,
    painPoints: [offer.painfulProblem, ...next.positioning.alternativeWeaknesses.slice(0, 2)]
  };
  next.launchSite.solution = {
    summary: next.landingPageCopy.offerDescription,
    deliverables: next.landingPageCopy.deliverables,
    exclusions: offer.exclusions
  };
  next.launchSite.positioning = {
    ...next.launchSite.positioning,
    differentiator: next.positioning.differentiator,
    idealFor: [offer.targetCustomer, ...next.positioning.actionTriggers.slice(0, 2)]
  };
  next.launchSite.riskReversal = {
    type: 'deliverable',
    text: next.landingPageCopy.riskReversal
  };
  next.launchSite.faq = next.landingPageCopy.faq;
  next.launchSite.leadCapture = {
    ...next.launchSite.leadCapture,
    buttonLabel: next.landingPageCopy.primaryCallToAction
  };

  next.launchCard48Hour = {
    ...next.launchCard48Hour,
    firstCustomer: next.executiveDecision.recommendedInitialCustomer,
    firstOffer: `${offer.offerName} at ${offer.initialTestPrice}`,
    exactFirstMessage: next.firstRevenuePath.firstAsk,
    firstCommitmentRequest: next.firstRevenuePath.commitmentMethod,
    launchSitePreviewReady: Boolean(
      next.launchSite.offer.headline && next.launchSite.leadCapture.destination
    )
  };
  next.foundingCustomerPilotBrief = {
    ...next.foundingCustomerPilotBrief,
    problem: offer.painfulProblem,
    scope: offer.deliveryMethod,
    deliverables: offer.deliverables.map(item => `${item.name}: ${item.description}`),
    timeline: offer.timeToFirstUsefulResult,
    price: offer.initialTestPrice,
    buyerResponsibilities: offer.buyerResponsibilities,
    nextStep: next.landingPageCopy.primaryCallToAction
  };

  const gate = validateGhostTownLaunchBlueprintV21(next);
  next.qualityGate = gate;
  next.status = gate.passed ? 'ready' : 'failed_quality_gate';
  if (!gate.passed) {
    throw new Error(`Launch Blueprint v2.1 synchronized surface gate failed: ${gate.failures.join(' | ')}`);
  }
  return next;
}
