import type { IdeaIntake } from '../types/lit';
import type { EvaluationResult } from '../types/lit';

export type VerdictDecision =
  | 'WORTH_TESTING'
  | 'REVISE_BEFORE_TESTING'
  | 'WEAK_EVIDENCE'
  | 'DO_NOT_PURSUE_YET';

export type VerdictConfidenceLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type VerdictTruthLabel = 'VERIFIED' | 'INFERRED' | 'UNKNOWN';

/**
 * The customer-facing Q1 decision. This is deliberately bounded to the next
 * commitment test; it is not a prediction that a whole business will succeed.
 */
export interface VerdictDecisionV2 {
  decision: VerdictDecision;
  predictionTarget: string;
  confidence: { level: VerdictConfidenceLevel; rationale: string };
  customer: { initialCustomer: string; whyThisCustomer: string; excludedBroadAudiences: string[] };
  problem: { painfulProblem: string; existingAlternative: string; urgencyEvidence: string[] };
  offerHypothesis: { offer: string; commitmentRequested: string; priceOrCommitmentRange?: string };
  reasonsFor: string[];
  reasonsAgainst: string[];
  largestUncertainty: { assumption: string; whyItMatters: string };
  cheapestFalsification: {
    test: string;
    target: string;
    successThreshold: string;
    failureThreshold: string;
    maximumTime: string;
    maximumCash: string;
  };
  firstAction: { action: string; preparedAssetRequired: boolean };
  whatWouldChangeTheVerdict: string[];
  evidenceLabels: Array<{ statement: string; truthLabel: VerdictTruthLabel; sourceId?: string }>;
}

export interface VerdictDecisionV2Inputs {
  idea: Pick<IdeaIntake, 'ideaName' | 'description' | 'targetUser' | 'painfulProblem' | 'currentAlternative'>;
  priceOrCommitmentRange?: string;
  scores: {
    litScore: number;
    ghostTownRisk: string;
    insightScore: number;
    leverageScore: number;
    timingScore: number;
    highWallsScore: number;
  };
}

export interface VerdictDecisionV2Validation {
  valid: boolean;
  errors: string[];
  value?: VerdictDecisionV2;
}

const DECISIONS = new Set<VerdictDecision>([
  'WORTH_TESTING', 'REVISE_BEFORE_TESTING', 'WEAK_EVIDENCE', 'DO_NOT_PURSUE_YET'
]);
const CONFIDENCE = new Set<VerdictConfidenceLevel>(['LOW', 'MODERATE', 'HIGH']);
const TRUTH_LABELS = new Set<VerdictTruthLabel>(['VERIFIED', 'INFERRED', 'UNKNOWN']);
const UNSUPPORTED_OUTCOME_CLAIMS = [
  /\b(?:will|can) succeed\b/i,
  /\b(?:guaranteed|guarantee|certain|definitely)\b/i,
  /\b(?:product[- ]market fit|profitable business)\b/i
];
const BROAD_AUDIENCES = /^(everyone|anyone|all businesses|all founders|people|consumers|small businesses|startups|founders|parents|businesses|companies)$/i;
const GENERIC_OFFER = /\b(?:for everyone|for anyone|help people|help businesses|general purpose|all-in-one)\b|^(?:an?\s+)?(?:app|platform|tool|solution|service)\.?$/i;

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/g, ' ') : fallback;
}

function fragment(value: string): string {
  return value.replace(/[.!?]+$/g, '');
}

function hasSpecificCustomer(value: string | undefined): boolean {
  const normalized = text(value, '');
  return normalized.length >= 12 && !BROAD_AUDIENCES.test(normalized);
}

function hasSpecificProblem(value: string | undefined): boolean {
  return text(value, '').length >= 15;
}

function hasSpecificOffer(value: string | undefined): boolean {
  const normalized = text(value, '');
  return normalized.length >= 24 && !GENERIC_OFFER.test(normalized);
}

type IntakeSpecificity = {
  customer: boolean;
  problem: boolean;
  alternative: boolean;
  offer: boolean;
};

function intakeSpecificity(idea: VerdictDecisionV2Inputs['idea']): IntakeSpecificity {
  return {
    customer: hasSpecificCustomer(idea.targetUser),
    problem: hasSpecificProblem(idea.painfulProblem),
    alternative: hasSpecificProblem(idea.currentAlternative),
    offer: hasSpecificOffer(idea.description)
  };
}

function missingIntakeFields(specificity: IntakeSpecificity): string[] {
  return [
    !specificity.customer && 'specific customer',
    !specificity.problem && 'recent painful problem',
    !specificity.alternative && 'current alternative',
    !specificity.offer && 'fixed-scope offer'
  ].filter((field): field is string => Boolean(field));
}

function joinFields(fields: string[]): string {
  if (fields.length < 2) return fields[0] || 'specific customer, problem, alternative, and offer';
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
  return `${fields.slice(0, -1).join(', ')}, and ${fields.at(-1)}`;
}

function normalizedOffer(value: string): string {
  const normalized = fragment(value).replace(/^\s*(?:a|an|the)\s+/i, '');
  return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'A specific offer is not yet defined';
}

function narrowCustomer(idea: VerdictDecisionV2Inputs['idea']): string {
  if (!hasSpecificCustomer(idea.targetUser)) return 'an as-yet-unidentified qualified buyer with a recent version of the stated problem';
  const target = text(idea.targetUser, 'qualified prospective buyers');
  const alternative = text(idea.currentAlternative, 'a current workaround');
  return `10 ${target} who currently rely on ${fragment(alternative)}`;
}

function decisionFor(score: number, inputs: VerdictDecisionV2Inputs): VerdictDecision {
  const specificity = intakeSpecificity(inputs.idea);
  if (!specificity.customer || !specificity.problem || !specificity.alternative || !specificity.offer) {
    return 'DO_NOT_PURSUE_YET';
  }
  if (score >= 3.75) return 'WORTH_TESTING';
  if (score >= 2.5) return 'REVISE_BEFORE_TESTING';
  if (score >= 1.5) return 'WEAK_EVIDENCE';
  return 'DO_NOT_PURSUE_YET';
}

function confidenceFor(scores: VerdictDecisionV2Inputs['scores']): VerdictConfidenceLevel {
  const signalCount = [scores.insightScore, scores.leverageScore, scores.timingScore, scores.highWallsScore]
    .filter(score => Number.isFinite(score) && score >= 3).length;
  // Input answers can clarify a test, but they never verify market demand. Keep
  // the externally-facing confidence bounded below HIGH until market evidence exists.
  return signalCount >= 3 && scores.litScore >= 3 ? 'MODERATE' : 'LOW';
}

/** Build the same decision for the same supplied intake and deterministic scores. */
export function buildVerdictDecisionV2(inputs: VerdictDecisionV2Inputs): VerdictDecisionV2 {
  const { idea, scores } = inputs;
  const initialCustomer = narrowCustomer(idea);
  const problem = text(idea.painfulProblem, `the problem described for ${text(idea.ideaName, 'this idea')}`);
  const alternative = text(idea.currentAlternative, 'their current workaround');
  const offer = text(idea.description, text(idea.ideaName, 'a fixed-scope manual pilot'));
  const priceOrCommitmentRange = text(inputs.priceOrCommitmentRange, '');
  const specificity = intakeSpecificity(idea);
  const missingFields = missingIntakeFields(specificity);
  const completeIntake = missingFields.length === 0;
  const missingFieldList = joinFields(missingFields);
  const decision = decisionFor(scores.litScore, inputs);
  const confidence = completeIntake ? confidenceFor(scores) : 'LOW';
  const uncertainty = scores.insightScore < 3
    ? 'whether this problem is urgent enough to change current behavior'
    : scores.leverageScore < 3
      ? 'whether the founder can reach these buyers repeatedly'
      : 'whether qualified buyers will make a meaningful commitment before a full product exists';

  return {
    decision,
    predictionTarget: completeIntake
      ? `Given this customer, problem, offer, access path, and founder constraints, how plausible is it that ${initialCustomer} will make a meaningful customer commitment during the validation window?`
      : 'Given the incomplete or broad intake, whether a specifically identifiable buyer will make a meaningful customer commitment during the validation window is unknown.',
    confidence: {
      level: confidence,
      rationale: !completeIntake
        ? `LOW because the supplied intake still needs a ${missingFieldList}. Buyer commitment remains unknown.`
        : confidence === 'MODERATE'
        ? 'The supplied intake describes a customer, problem, and testable offer, but buyer commitment is still unverified.'
        : 'The supplied intake leaves important buyer, urgency, access, or commitment evidence unverified.'
    },
    customer: {
      initialCustomer,
      whyThisCustomer: specificity.customer
        ? 'This cohort is tied to the supplied problem and current alternative, so a direct commitment ask can produce clearer evidence than a broad audience survey.'
        : 'No specific first customer is supported by the supplied intake yet; do not infer one from a broad audience label.',
      excludedBroadAudiences: ['everyone with a similar interest', 'all businesses in the market', 'unqualified followers or survey respondents']
    },
    problem: {
      painfulProblem: problem,
      existingAlternative: alternative,
      urgencyEvidence: [
        specificity.problem ? `The founder supplied this problem: ${problem}` : 'A specific painful problem was not supplied.',
        specificity.alternative ? `The founder supplied this current alternative: ${alternative}` : 'A specific current alternative was not supplied.',
        'Whether buyers experience the problem recently enough to act is unknown.'
      ]
    },
    offerHypothesis: {
      offer: specificity.offer ? normalizedOffer(offer) : 'A concrete offer is unknown until the founder defines a fixed-scope outcome and delivery method.',
      commitmentRequested: completeIntake ? 'One paid pilot commitment with a fixed scope and a dated decision.' : `No paid-pilot commitment request until the ${missingFieldList} is specifically defined.`,
      ...(priceOrCommitmentRange ? { priceOrCommitmentRange } : {})
    },
    reasonsFor: [
      specificity.offer && specificity.customer && specificity.problem ? `The supplied offer (${normalizedOffer(offer)}) connects ${initialCustomer} to a stated painful problem rather than a broad audience claim.` : `Before any demand claim, define the missing ${missingFieldList}.`,
      specificity.alternative ? `The current alternative (${alternative}) gives the test a concrete behavior to replace or improve.` : 'A named current alternative must be collected before comparing the offer.',
      'A manual pilot can test commitment before substantial product work.'
    ],
    reasonsAgainst: [
      'The intake is founder-supplied evidence, not verified proof of market demand.',
      `It is unknown whether ${initialCustomer} will make one paid-pilot commitment before the full product exists.`,
      'Access to enough qualified buyers must be demonstrated through direct outreach or an existing channel.'
    ],
    largestUncertainty: {
      assumption: completeIntake ? uncertainty : `the missing ${missingFieldList} before a commitment ask is meaningful`,
      whyItMatters: 'A useful problem without a timely commitment does not justify substantial product investment.'
    },
    cheapestFalsification: {
      test: completeIntake
        ? `Prepare one concise paid-pilot invitation, send it to ${initialCustomer}, ask about the most recent problem and current alternative, then request one paid-pilot commitment with fixed scope${priceOrCommitmentRange ? ` at ${priceOrCommitmentRange}` : ' after setting a founder-owned price or deposit range'}. Classify 3 or more commitments as PASS, zero as FAIL, and 1–2 as INCONCLUSIVE.`
        : `Do not run paid-pilot outreach yet. Complete a one-page definition for the missing ${missingFieldList}; then rerun this verdict.`,
      target: completeIntake ? initialCustomer : `The founder’s ${missingFieldList} definition`,
      successThreshold: completeIntake ? 'PASS: at least 3 paid-pilot commitments from 10 qualified buyers within 5 business days.' : `PASS: the missing ${missingFieldList} is specific rather than broad or generic.`,
      failureThreshold: completeIntake ? 'FAIL: zero paid-pilot commitments from 10 qualified buyers within 5 business days. INCONCLUSIVE: 1–2 commitments; record objections, revise one constraint, and rerun.' : `FAIL: the ${missingFieldList} remains missing or generic. INCONCLUSIVE: it is plausible but not specific enough; tighten it before outreach.`,
      maximumTime: '5 business days',
      maximumCash: 'No paid spend required; use founder time and existing direct outreach only.'
    },
    firstAction: {
      action: completeIntake
        ? `Prepare the concise paid-pilot invitation, list 10 ${text(idea.targetUser, 'qualified prospective buyers')} who use ${fragment(alternative)}, and send the invitation today.`
        : `Create a one-page evidence brief defining the missing ${missingFieldList}. Do not prepare or send paid-pilot outreach yet.`,
      preparedAssetRequired: true
    },
    whatWouldChangeTheVerdict: [
      'Verified recent problem evidence from qualified buyers.',
      'Paid pilots, deposits, signed commitments, or repeated decision conversations.',
      'Evidence that a specific access path reaches qualified buyers repeatedly.',
      'Consistent rejection showing the customer, problem, offer, or commitment ask is wrong.'
    ],
    evidenceLabels: [
      { statement: `The founder supplied an idea named ${text(idea.ideaName, 'this idea')}.`, truthLabel: 'VERIFIED', sourceId: 'intake.ideaName' },
      { statement: specificity.customer ? `The initial customer is inferred as ${initialCustomer}.` : 'A specific initial customer is unknown because it was not supplied or is broad.', truthLabel: specificity.customer ? 'INFERRED' : 'UNKNOWN', sourceId: 'intake.targetUser' },
      { statement: specificity.problem ? `The stated problem is ${problem}.` : 'A specific painful problem is unknown because it was not supplied or is broad.', truthLabel: specificity.problem ? 'INFERRED' : 'UNKNOWN', sourceId: 'intake.painfulProblem' },
      { statement: specificity.alternative ? `The stated current alternative is ${alternative}.` : 'A specific current alternative is unknown because it was not supplied or is broad.', truthLabel: specificity.alternative ? 'INFERRED' : 'UNKNOWN', sourceId: 'intake.currentAlternative' },
      { statement: specificity.offer ? `The supplied offer is ${normalizedOffer(offer)}.` : 'A concrete offer is unknown because the description is missing or generic.', truthLabel: specificity.offer ? 'INFERRED' : 'UNKNOWN', sourceId: 'intake.description' },
      { statement: `Whether buyers will make a meaningful commitment is unknown until the falsification test is run.`, truthLabel: 'UNKNOWN' }
    ]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 10;
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function noUnsupportedOutcomeClaim(value: string): boolean {
  return !UNSUPPORTED_OUTCOME_CLAIMS.some(pattern => pattern.test(value));
}

/** Strict structural/usefulness guard for persisted, API, and UI decisions. */
export function validateVerdictDecisionV2(value: unknown): VerdictDecisionV2Validation {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['verdict decision must be an object'] };
  const required = [
    'decision', 'predictionTarget', 'confidence', 'customer', 'problem', 'offerHypothesis', 'reasonsFor',
    'reasonsAgainst', 'largestUncertainty', 'cheapestFalsification', 'firstAction', 'whatWouldChangeTheVerdict', 'evidenceLabels'
  ];
  for (const field of required) if (!(field in value)) errors.push(`missing required field: ${field}`);
  if (!DECISIONS.has(value.decision as VerdictDecision)) errors.push('decision is invalid');
  if (!validText(value.predictionTarget) || !/meaningful customer commitment/i.test(String(value.predictionTarget))) {
    errors.push('predictionTarget must bound the prediction to a meaningful customer commitment');
  }
  if (!isRecord(value.confidence) || !CONFIDENCE.has(value.confidence.level as VerdictConfidenceLevel) || !validText(value.confidence.rationale)) {
    errors.push('confidence must contain a valid level and rationale');
  }
  if (!isRecord(value.customer) || !validText(value.customer.initialCustomer) || !validText(value.customer.whyThisCustomer)
    || !Array.isArray(value.customer.excludedBroadAudiences) || value.customer.excludedBroadAudiences.length < 1) {
    errors.push('customer must contain a specific initial customer, rationale, and excluded broad audiences');
  } else if (BROAD_AUDIENCES.test(value.customer.initialCustomer.trim())) {
    errors.push('initialCustomer must not be a broad audience');
  }
  if (!isRecord(value.problem) || !validText(value.problem.painfulProblem) || !validText(value.problem.existingAlternative)
    || !Array.isArray(value.problem.urgencyEvidence) || value.problem.urgencyEvidence.length < 1) {
    errors.push('problem must contain a painful problem, current alternative, and urgency evidence');
  }
  if (!isRecord(value.offerHypothesis) || !validText(value.offerHypothesis.offer) || !validText(value.offerHypothesis.commitmentRequested)) {
    errors.push('offerHypothesis must contain an offer and commitment requested');
  }
  for (const field of ['reasonsFor', 'reasonsAgainst', 'whatWouldChangeTheVerdict'] as const) {
    if (!Array.isArray(value[field]) || value[field].length < 1 || value[field].some(item => !validText(item))) errors.push(`${field} must contain specific text`);
  }
  if (!isRecord(value.largestUncertainty) || !validText(value.largestUncertainty.assumption) || !validText(value.largestUncertainty.whyItMatters)) {
    errors.push('largestUncertainty must be explicit');
  }
  const falsification = value.cheapestFalsification;
  if (!isRecord(falsification) || ['test', 'target', 'successThreshold', 'failureThreshold']
    .some(field => !validText(falsification[field])) || ['maximumTime', 'maximumCash'].some(field => !nonEmptyText(falsification[field]))) {
    errors.push('cheapestFalsification must be complete and falsifiable');
  }
  if (!isRecord(value.firstAction) || !validText(value.firstAction.action) || typeof value.firstAction.preparedAssetRequired !== 'boolean') {
    errors.push('firstAction must contain an exact action and prepared-asset flag');
  } else if (/\b(build|develop|engineer)\b.*\b(product|app|platform|software)\b/i.test(value.firstAction.action)) {
    errors.push('firstAction must not recommend substantial building before demand evidence');
  }
  if (!Array.isArray(value.evidenceLabels) || value.evidenceLabels.length < 1) {
    errors.push('evidenceLabels are required');
  } else {
    for (const label of value.evidenceLabels) {
      if (!isRecord(label) || !validText(label.statement) || !TRUTH_LABELS.has(label.truthLabel as VerdictTruthLabel)
        || (label.sourceId !== undefined && !validText(label.sourceId))) errors.push('evidenceLabels contain an invalid label');
    }
  }
  const allText = JSON.stringify(value);
  if (!noUnsupportedOutcomeClaim(allText)) errors.push('verdict must not make an unsupported whole-business outcome claim');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], value: value as unknown as VerdictDecisionV2 };
}

/** Preserve old cached/API results while making the v2 decision canonical on read. */
export function hydrateVerdictDecisionV2(
  value: unknown,
  inputs: VerdictDecisionV2Inputs
): VerdictDecisionV2 {
  const validation = validateVerdictDecisionV2(value);
  return validation.value || buildVerdictDecisionV2(inputs);
}

/** Use at every result persistence boundary so legacy records acquire the same canonical decision. */
export function hydrateEvaluationResultDecisionV2<T extends EvaluationResult>(result: T): T {
  result.verdictDecisionV2 = hydrateVerdictDecisionV2(result.verdictDecisionV2, {
    idea: result.idea,
    scores: result.deterministicScores
  });
  return result;
}

export interface LegacyVerdictProjection {
  verdict_headline: string;
  top_reason: string;
  next_step: string;
  recommended_next_test: string;
  one_sentence_advice: string;
  do_not_build_until: string;
  why_it_might_work: string;
  why_it_might_fail: string;
  killer_question: string;
  mvp_test: string;
}

/** A compatibility projection for consumers that still render the rich v1 fields. */
export function projectVerdictDecisionV2ToLegacy(decision: VerdictDecisionV2): LegacyVerdictProjection {
  return {
    verdict_headline: decision.decision.replace(/_/g, ' '),
    top_reason: decision.reasonsFor[0],
    next_step: decision.firstAction.action,
    recommended_next_test: decision.cheapestFalsification.test,
    one_sentence_advice: decision.confidence.rationale,
    do_not_build_until: decision.largestUncertainty.whyItMatters,
    why_it_might_work: decision.reasonsFor.join(' '),
    why_it_might_fail: decision.reasonsAgainst.join(' '),
    killer_question: `${decision.largestUncertainty.assumption.replace(/[.!?]+$/g, '')}?`,
    mvp_test: decision.cheapestFalsification.test
  };
}

/** Exact legacy-shaped fields supplied to downstream Vertex stages. */
export function projectVerdictDecisionV2ToVertexInput(decision: VerdictDecisionV2) {
  const legacy = projectVerdictDecisionV2ToLegacy(decision);
  return {
    headline: legacy.verdict_headline,
    explanation: legacy.why_it_might_work,
    recommendedNextTest: legacy.recommended_next_test,
    doNotBuildUntil: legacy.do_not_build_until,
    verdictDecisionV2: decision
  };
}
