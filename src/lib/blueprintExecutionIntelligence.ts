import type { BusinessModelExecutionLane, GhostTownLaunchBlueprintV21 } from '../types/launchBlueprintV21';

export type ExecutionVariable = 'customer' | 'problem' | 'access' | 'message' | 'offer' | 'price' | 'fulfillment';
export type ExecutionBranchRoute =
  | 'continue'
  | 'revise_customer'
  | 'revise_problem'
  | 'revise_access'
  | 'revise_trust'
  | 'revise_offer'
  | 'revise_fulfillment'
  | 'revise_price'
  | 'revise_message'
  | 'pause_missing_evidence'
  | 'stop';

export type ExecutionCopilotMode = 'current_experiment' | 'strategy_room';
export type ExecutionCapability = 'fast_assistant' | 'strategy_reasoner' | 'critic' | 'grounded_research';

export interface ExecutionLaneProfile {
  lane: BusinessModelExecutionLane;
  label: string;
  commitmentMechanism: string;
  firstCommercialProof: string;
  fulfillmentProof: string;
  economicsFocus: string;
  scaleQuestion: string;
  preferredTerms: string[];
}

export interface ExecutionEvidenceLike {
  entryId?: string;
  actionId?: string;
  checkpointId?: string;
  date?: string;
  contactOrChannel?: string;
  action?: string;
  response?: string;
  customerLanguage?: string;
  alternativeMentioned?: string;
  objection?: string;
  commitmentOffered?: string;
  commitmentReceived?: string;
  revenueCents?: number;
  founderMinutes?: number;
  variableCostCents?: number;
  evidenceStrength?: string;
  sourceNote?: string;
}

export interface ExecutionCheckpointReviewLike {
  dayNumber: number;
  completedAt?: string;
  evidenceSummary?: string;
  strongestEvidence?: string;
  primaryConstraint?: string;
  nextAction?: string;
}

export interface ExecutionProgressLike {
  completedDays?: number[];
  evidenceNotes?: Record<string, string>;
  evidenceLedger?: ExecutionEvidenceLike[];
  checkpointReviews?: ExecutionCheckpointReviewLike[];
  metrics?: {
    outreachSent?: number;
    replies?: number;
    interviews?: number;
    qualifiedConversations?: number;
    commitments?: number;
    revenueCents?: number;
    founderMinutes?: number;
    variableCostCents?: number;
    leads?: number;
  };
  finalDecision?: string;
}

export interface FormalCheckpointBranch {
  checkpointDay: number | null;
  route: ExecutionBranchRoute;
  primaryConstraint: string;
  mayChange: ExecutionVariable[];
  mustKeep: ExecutionVariable[];
  reason: string;
  nextAction: string;
  evidenceStrength: string;
  source: 'checkpoint_review' | 'final_decision' | 'no_checkpoint_yet';
}

export interface ExecutionRetrievedEvidence {
  entryId: string;
  actionId: string;
  date: string;
  evidenceStrength: string;
  contactOrChannel: string;
  response: string;
  customerLanguage: string;
  objection: string;
  commitmentReceived: string;
  revenueCents: number;
  sourceNote: string;
}

export interface ExecutionRetrievedSource {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  supports: string[];
}

export interface ExecutionRagContext {
  schemaVersion: 'ghosttown-execution-context-v1';
  blueprint: {
    blueprintId: string;
    blueprintVersion: string;
    sourceVerdictId: string;
    lane: BusinessModelExecutionLane;
    laneProfile: ExecutionLaneProfile;
    customer: string;
    problem: string;
    offer: string;
    price: string;
  };
  experiment: {
    dayNumber: number;
    title: string;
    objective: string;
    whyThisDayExists: string;
    exactActions: Array<{ actionId: string; instruction: string; quantity: string; evidenceExpected: string[] }>;
    exactTargets: Array<{ targetId: string; kind: string; name: string; minimumCount: number; qualificationRule: string }>;
    assets: Array<{ assetId: string; title: string; usageInstructions: string; content: string }>;
    successThreshold: string;
    failureThreshold: string;
    completionDefinition: string;
    evidenceToCapture: string[];
  };
  branch: FormalCheckpointBranch;
  progress: {
    completedDays: number[];
    metrics: ExecutionProgressLike['metrics'];
    relevantEvidence: ExecutionRetrievedEvidence[];
    latestCheckpointReview: ExecutionCheckpointReviewLike | null;
  };
  research: ExecutionRetrievedSource[];
  coachMemory?: ExecutionCoachMemoryContext;
  immutableRules: string[];
}

const VARIABLES: ExecutionVariable[] = ['customer', 'problem', 'access', 'message', 'offer', 'price', 'fulfillment'];

const LANE_PROFILES: Record<BusinessModelExecutionLane, ExecutionLaneProfile> = {
  service_or_consulting: {
    lane: 'service_or_consulting', label: 'Service / consulting',
    commitmentMechanism: 'paid diagnostic, fixed-scope pilot, deposit, or accepted paid scope',
    firstCommercialProof: 'a qualified buyer accepts a bounded paid engagement',
    fulfillmentProof: 'deliver the bounded service manually and record buyer feedback, founder time, direct cost, and defects',
    economicsFocus: 'price versus founder hours, direct cost, capacity, and gross-margin guardrail',
    scaleQuestion: 'Can the engagement be repeated profitably before adding automation or staff?',
    preferredTerms: ['engagement', 'scope', 'pilot', 'diagnostic', 'delivery']
  },
  saas: {
    lane: 'saas', label: 'SaaS',
    commitmentMechanism: 'paid design partner, concierge workflow, deposit, or workflow access',
    firstCommercialProof: 'a qualified buyer commits money, access, or meaningful operating time to the narrow workflow',
    fulfillmentProof: 'deliver the workflow manually or concierge-style and identify which repeated step is actually worth productizing',
    economicsFocus: 'willingness to pay, concierge delivery cost, repeated workflow value, and eventual automation leverage',
    scaleQuestion: 'Which validated manual workflow deserves software, and what must remain unbuilt?',
    preferredTerms: ['design partner', 'concierge workflow', 'workflow', 'manual prototype', 'productize']
  },
  digital_product: {
    lane: 'digital_product', label: 'Digital product',
    commitmentMechanism: 'presale, paid workshop registration, founding purchase, or preorder',
    firstCommercialProof: 'a qualified buyer pays for the complete first useful edition or event',
    fulfillmentProof: 'deliver the promised first edition/workshop and record completion, usage, refund pressure, and buyer outcome',
    economicsFocus: 'purchase conversion, production time, support load, refund/cancellation pressure, and contribution margin',
    scaleQuestion: 'Does purchase and usage justify expanding the catalog or distribution?',
    preferredTerms: ['presale', 'founding edition', 'workshop', 'preorder', 'resource']
  },
  physical_product: {
    lane: 'physical_product', label: 'Physical product',
    commitmentMechanism: 'preorder, deposit, prototype evaluation, or retailer commitment',
    firstCommercialProof: 'a qualified buyer or retailer commits money or documented shelf/testing access to the bounded first batch',
    fulfillmentProof: 'produce or assemble the smallest safe batch/prototype and record delivery, defects, use feedback, COGS, and shipping',
    economicsFocus: 'unit cost, packaging, shipping, returns, minimum batch size, price, and gross margin',
    scaleQuestion: 'Do preorder/use evidence and unit economics justify increasing production?',
    preferredTerms: ['preorder', 'prototype', 'first batch', 'unit cost', 'delivery']
  },
  marketplace: {
    lane: 'marketplace', label: 'Marketplace',
    commitmentMechanism: 'manually qualified match, concierge fee, transaction commitment, or explicit access from both sides',
    firstCommercialProof: 'one narrow buyer/provider pair takes a real transaction step',
    fulfillmentProof: 'manually complete the match/transaction and record friction, trust, time, take-rate potential, and failure points on both sides',
    economicsFocus: 'match rate, transaction value, manual coordination cost, take rate, trust burden, and side-specific acquisition cost',
    scaleQuestion: 'Can one narrow market side and transaction repeat before building self-service matching?',
    preferredTerms: ['match', 'buyer', 'provider', 'transaction', 'concierge']
  },
  local_business: {
    lane: 'local_business', label: 'Local business',
    commitmentMechanism: 'appointment, estimate approval, reservation, deposit, or paid service',
    firstCommercialProof: 'a qualified local customer books or pays for the bounded service',
    fulfillmentProof: 'complete the local service/appointment and record lead source, conversion, time, direct cost, quality, and repeat/referral signal',
    economicsFocus: 'lead-to-booking conversion, average ticket, labor/time, travel/direct cost, capacity, and local acquisition cost',
    scaleQuestion: 'Can the local service convert and fulfill profitably before expanding area, equipment, or staff?',
    preferredTerms: ['appointment', 'estimate', 'reservation', 'deposit', 'service']
  },
  creator_or_media: {
    lane: 'creator_or_media', label: 'Creator / media',
    commitmentMechanism: 'qualified subscriber action, paid subscription/product, sponsor conversation, or paid event/workshop',
    firstCommercialProof: 'an audience member or sponsor takes a commercial action beyond views, likes, or generic praise',
    fulfillmentProof: 'deliver the promised content/product/sponsor placement and record consumption, response, renewal, and production cost',
    economicsFocus: 'qualified audience conversion, revenue per buyer/sponsor, production cost, retention/renewal, and distribution efficiency',
    scaleQuestion: 'Does paid audience/sponsor behavior justify increasing publishing and distribution volume?',
    preferredTerms: ['subscriber', 'sponsor', 'paid product', 'audience', 'distribution']
  }
};

export function executionLaneProfile(lane: BusinessModelExecutionLane): ExecutionLaneProfile {
  return LANE_PROFILES[lane];
}

function variablePlan(route: ExecutionBranchRoute): { mayChange: ExecutionVariable[]; reason: string } {
  switch (route) {
    case 'revise_customer': return { mayChange: ['customer'], reason: 'Customer evidence is the named constraint; change the customer definition only.' };
    case 'revise_problem': return { mayChange: ['problem'], reason: 'Urgency/problem evidence is the named constraint; change the problem or trigger definition only.' };
    case 'revise_access': return { mayChange: ['access'], reason: 'Access is the named constraint; change the customer-access path only.' };
    case 'revise_trust': return { mayChange: ['message'], reason: 'Trust/proof is the named constraint; change proof framing or message only without inventing proof.' };
    case 'revise_offer': return { mayChange: ['offer'], reason: 'Offer/scope is the named constraint; change the bounded offer only.' };
    case 'revise_fulfillment': return { mayChange: ['fulfillment'], reason: 'Fulfillment is the named constraint; repair delivery before acquiring more customers.' };
    case 'revise_price': return { mayChange: ['price'], reason: 'Price is the named constraint; test price only while holding customer/problem/access/offer constant.' };
    case 'revise_message': return { mayChange: ['message'], reason: 'Message is the named constraint; change the opening/message only.' };
    case 'pause_missing_evidence': return { mayChange: [], reason: 'Evidence is insufficient; collect the missing evidence before changing the hypothesis.' };
    case 'stop': return { mayChange: [], reason: 'The recorded decision is to stop this bounded experiment.' };
    default: return { mayChange: [], reason: 'The current evidence supports continuing without changing the active hypothesis.' };
  }
}

function routeForConstraint(constraint: string): ExecutionBranchRoute {
  switch (constraint) {
    case 'customer': return 'revise_customer';
    case 'urgency': return 'revise_problem';
    case 'access': return 'revise_access';
    case 'trust': return 'revise_trust';
    case 'offer': return 'revise_offer';
    case 'fulfillment': return 'revise_fulfillment';
    case 'price': return 'revise_price';
    case 'message': return 'revise_message';
    case 'missing_evidence': return 'pause_missing_evidence';
    default: return 'continue';
  }
}

function explicitFinalDecisionRoute(value: string | undefined): ExecutionBranchRoute | null {
  switch (value) {
    case 'stop': return 'stop';
    case 'pause_missing_evidence': return 'pause_missing_evidence';
    case 'pivot_customer': return 'revise_customer';
    case 'pivot_problem': return 'revise_problem';
    case 'pivot_offer': return 'revise_offer';
    case 'continue': return 'continue';
    default: return null;
  }
}

export function formalCheckpointBranch(progress: ExecutionProgressLike, dayNumber = 30): FormalCheckpointBranch {
  const reviews = [...(progress.checkpointReviews || [])]
    .filter(review => review.dayNumber <= dayNumber && Boolean(review.completedAt))
    .sort((left, right) => right.dayNumber - left.dayNumber);
  const latest = reviews[0];
  const constraint = latest?.primaryConstraint?.trim() || 'none';
  const finalDecision = latest?.dayNumber === 30 ? progress.finalDecision : undefined;
  const explicitFinalRoute = explicitFinalDecisionRoute(finalDecision);
  let route = explicitFinalRoute || (latest ? routeForConstraint(constraint) : 'continue');
  const revisionDecision = finalDecision === 'revise' || finalDecision === 'continue_with_revision';
  const strength = latest?.strongestEvidence?.trim() || 'none';
  const metrics = progress.metrics || {};

  // A generic "revise" decision never means "revise offer" by default. The
  // named checkpoint constraint selects the one permitted variable. If the
  // checkpoint did not identify a constraint, pause and collect evidence rather
  // than inventing a revision target.
  if (revisionDecision && route === 'continue') route = 'pause_missing_evidence';
  if (latest && constraint === 'none' && route === 'continue' && strength === 'none' && !(metrics.commitments || 0) && !(metrics.revenueCents || 0)) {
    route = 'pause_missing_evidence';
  }
  const plan = variablePlan(route);
  return {
    checkpointDay: latest?.dayNumber || null,
    route,
    primaryConstraint: constraint,
    mayChange: plan.mayChange,
    mustKeep: VARIABLES.filter(variable => !plan.mayChange.includes(variable)),
    reason: plan.reason,
    nextAction: latest?.nextAction?.trim() || (route === 'continue' ? 'Complete the current declared experiment before changing a variable.' : plan.reason),
    evidenceStrength: strength,
    source: finalDecision ? 'final_decision' : latest ? 'checkpoint_review' : 'no_checkpoint_yet'
  };
}

function words(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
}

function overlapScore(query: Set<string>, values: string[]): number {
  if (!query.size) return 0;
  const candidate = words(values.join(' '));
  let score = 0;
  for (const word of query) if (candidate.has(word)) score += 1;
  return score;
}

function sourceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function currentDayEvidence(blueprint: GhostTownLaunchBlueprintV21, progress: ExecutionProgressLike, dayNumber: number): ExecutionEvidenceLike[] {
  const day = blueprint.dailyCalendar.find(item => item.dayNumber === dayNumber);
  const ids = new Set([`day-${dayNumber}`, ...(day?.executionPacket?.actions || []).map(action => action.actionId)]);
  return (progress.evidenceLedger || []).filter(entry => Boolean(entry.actionId && ids.has(entry.actionId)));
}

function asRetrievedEvidence(entry: ExecutionEvidenceLike): ExecutionRetrievedEvidence {
  return {
    entryId: entry.entryId || '', actionId: entry.actionId || '', date: entry.date || '', evidenceStrength: entry.evidenceStrength || 'weak',
    contactOrChannel: entry.contactOrChannel || '', response: entry.response || '', customerLanguage: entry.customerLanguage || '', objection: entry.objection || '',
    commitmentReceived: entry.commitmentReceived || '', revenueCents: Number(entry.revenueCents) || 0, sourceNote: entry.sourceNote || ''
  };
}

function retrieveEvidence(blueprint: GhostTownLaunchBlueprintV21, progress: ExecutionProgressLike, dayNumber: number, question: string): ExecutionRetrievedEvidence[] {
  const exact = currentDayEvidence(blueprint, progress, dayNumber).slice(-14);
  const query = words(question);
  const others = (progress.evidenceLedger || [])
    .filter(entry => !exact.includes(entry))
    .map(entry => ({ entry, score: overlapScore(query, [entry.response || '', entry.customerLanguage || '', entry.objection || '', entry.alternativeMentioned || '', entry.sourceNote || '']) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, 14 - exact.length))
    .map(item => item.entry);
  return [...exact, ...others].map(asRetrievedEvidence);
}

function retrieveSources(blueprint: GhostTownLaunchBlueprintV21, question: string): ExecutionRetrievedSource[] {
  const query = words(question);
  const raw = (blueprint.sources || []) as unknown[];
  return raw.map(source => {
    const item = sourceRecord(source);
    const supports = strings(item.supports);
    const result: ExecutionRetrievedSource = {
      sourceId: String(item.sourceId || ''), title: String(item.title || ''), publisher: String(item.publisher || ''),
      url: String(item.url || ''), supports
    };
    return { result, score: overlapScore(query, [result.title, result.publisher, result.url, ...supports]) };
  }).sort((left, right) => right.score - left.score).slice(0, 6).map(item => item.result);
}

export function buildExecutionRagContext(
  blueprint: GhostTownLaunchBlueprintV21,
  progress: ExecutionProgressLike,
  dayNumber: number,
  question = ''
): ExecutionRagContext {
  const day = blueprint.dailyCalendar.find(item => item.dayNumber === dayNumber) || blueprint.dailyCalendar.find(item => !(progress.completedDays || []).includes(item.dayNumber)) || blueprint.dailyCalendar[29];
  const packet = day.executionPacket;
  if (!packet) throw new Error(`Day ${day.dayNumber} is missing its Daily Execution Packet`);
  const reviews = [...(progress.checkpointReviews || [])].filter(review => review.dayNumber <= day.dayNumber && Boolean(review.completedAt)).sort((a, b) => b.dayNumber - a.dayNumber);
  return {
    schemaVersion: 'ghosttown-execution-context-v1',
    blueprint: {
      blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceVerdictId: blueprint.sourceVerdictId,
      lane: blueprint.businessModelLane.lane, laneProfile: executionLaneProfile(blueprint.businessModelLane.lane), customer: blueprint.offer.targetCustomer,
      problem: blueprint.offer.painfulProblem, offer: blueprint.offer.oneSentencePromise, price: blueprint.firstRevenuePath.firstPrice
    },
    experiment: {
      dayNumber: day.dayNumber, title: day.title, objective: packet.objective, whyThisDayExists: packet.whyThisDayExists,
      exactActions: packet.actions.map(action => ({ actionId: action.actionId, instruction: action.instruction, quantity: action.quantity, evidenceExpected: action.evidenceExpected })),
      exactTargets: packet.targets.map(target => ({ targetId: target.targetId, kind: target.kind, name: target.name, minimumCount: target.minimumCount, qualificationRule: target.selectionOrQualificationRule })),
      assets: packet.assets.map(asset => ({ assetId: asset.assetId, title: asset.title, usageInstructions: asset.usageInstructions, content: asset.finishedContent })),
      successThreshold: packet.successThreshold, failureThreshold: packet.failureThreshold, completionDefinition: packet.completionDefinition,
      evidenceToCapture: packet.evidenceToCapture
    },
    branch: formalCheckpointBranch(progress, day.dayNumber),
    progress: {
      completedDays: [...(progress.completedDays || [])], metrics: progress.metrics || {}, relevantEvidence: retrieveEvidence(blueprint, progress, day.dayNumber, question),
      latestCheckpointReview: reviews[0] || null
    },
    research: retrieveSources(blueprint, question),
    immutableRules: [
      'Recorded customer behavior outranks model opinion.',
      'Do not mark a day complete unless deterministic completion requirements pass.',
      'Do not invent evidence, customers, commitments, revenue, sources, or proof.',
      'In Current Experiment mode, change only variables permitted by the formal checkpoint branch and keep all frozen variables unchanged.',
      'Strategy Room may explore alternatives, but exploration does not mutate the live experiment.',
      'Canonical Blueprint recommendations and prior evidence are never silently overwritten.'
    ]
  };
}

export function routeExecutionCapability(question: string, mode: ExecutionCopilotMode, context: ExecutionRagContext): ExecutionCapability {
  const value = question.toLowerCase();
  if (/\b(latest|current market|research|competitor|external source|look up|web)\b/.test(value)) return 'grounded_research';
  if (/\b(challenge|critic|contradict|are you sure|overinterpret|weak evidence)\b/.test(value)) return 'critic';
  if (mode === 'strategy_room' || context.branch.route !== 'continue' || /\b(pivot|change|price|strategy|customer segment|offer|should i|what next)\b/.test(value)) return 'strategy_reasoner';
  return 'fast_assistant';
}
