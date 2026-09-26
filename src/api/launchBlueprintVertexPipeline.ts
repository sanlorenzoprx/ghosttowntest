import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2, projectVerdictDecisionV2ToVertexInput } from '../verdict/verdictDecisionV2';
import type { PaidTestOrder } from '../types/paidTest';
import type {
  BlueprintDecision,
  BlueprintSource,
  CustomerAccessChannel,
  HelpfulPost,
  OutreachScript
} from '../types/launchBlueprint';
import type {
  BlueprintEvidenceStatement,
  BlueprintVertexPipelineReceipt,
  BlueprintVertexRedTeamFinding,
  BlueprintVertexStageReceipt,
  GhostTownLaunchBlueprintV21
} from '../types/launchBlueprintV21';
import type { CustomerAccessResearchResult } from './customerAccessResearch';
import {
  runVertexStructuredStage,
  type VertexResponseSchema,
  type VertexStructuredStageResult
} from './vertexStructuredGeneration';
import { validateGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';
import { synchronizeDailyExecutionPackets } from './launchBlueprintDailyExecution';
import { directCustomerAccessChannels, isCustomerAccessChannel, researchEvidenceRole } from './researchEvidenceRole';

export const VERTEX_BLUEPRINT_PIPELINE_VERSION = 'vertex-blueprint-staged-v2' as const;

const STAGE_NAMES = [
  'evidence_normalization',
  'strategy_synthesis',
  'strategic_coherence_gate',
  'asset_generation',
  'red_team_review'
] as const;

type VertexBlueprintStageName = typeof STAGE_NAMES[number];

type RedTeamCheckName =
  | 'unsupportedClaims'
  | 'inventedSources'
  | 'contradictions'
  | 'genericLanguage'
  | 'businessModelMismatch'
  | 'impossibleWorkload'
  | 'missingDailyAssets'
  | 'unclearMeasurements'
  | 'softenedStopCriteria'
  | 'pricingFulfillmentMismatch';

export interface VertexEvidenceCatalogItem extends BlueprintEvidenceStatement {
  evidenceId: string;
  sourceIds: string[];
}

export interface LaunchBlueprintVertexContext {
  order: PaidTestOrder;
  verdict: EvaluationResult;
  research: CustomerAccessResearchResult;
  draft: GhostTownLaunchBlueprintV21;
  evidenceCatalog: VertexEvidenceCatalogItem[];
}

export interface VertexEvidenceNormalization {
  packetSummary: string;
  verifiedEvidenceIds: string[];
  inferenceEvidenceIds: string[];
  missingEvidence: string[];
  criticalAssumptions: Array<{
    assumptionId: string;
    assumption: string;
    failureConsequence: string;
    evidenceRequired: string;
  }>;
}

export interface VertexStrategySynthesis {
  executiveDecision: {
    strongestOpportunity: string;
    biggestRisk: string;
    recommendedInitialCustomer: string;
    validationObjective: string;
    continueEvidence: string[];
    stopEvidence: string[];
  };
  offer: {
    offerName: string;
    targetCustomer: string;
    painfulProblem: string;
    desiredOutcome: string;
    oneSentencePromise: string;
    initialTestPrice: string;
    pricingRationale: string;
    riskReversal: string;
  };
  firstRevenuePath: {
    firstOfferFormat: string;
    firstBuyer: string;
    firstAsk: string;
    firstPrice: string;
    commitmentMethod: string;
    targetDay: number;
    minimumQualifiedAsks: number;
    successThreshold: string;
  };
  manualFulfillmentPlan: {
    expectedDeliveryTime: string;
    successfulDeliveryDefinition: string;
    capacityPerWeek: number;
    estimatedVariableCost: string;
    estimatedFounderHours: string;
    grossMarginGuardrail: string;
  };
  channelPriorities: string[];
  decisionThresholds: Array<{
    decision: BlueprintDecision;
    condition: string;
    nextAction: string;
  }>;
}

export const STRATEGIC_COHERENCE_LINKS = [
  'customer',
  'problem',
  'buyer_payer',
  'current_alternative',
  'test',
  'commitment',
  'fulfillment',
  'access_path'
] as const;

export type StrategicCoherenceLink = typeof STRATEGIC_COHERENCE_LINKS[number];
export type StrategicCoherenceStatus = 'coherent' | 'testable_hypothesis' | 'unresolved' | 'contradictory';

export interface VertexStrategicCoherenceGate {
  passed: boolean;
  chainSummary: string;
  links: Array<{
    link: StrategicCoherenceLink;
    value: string;
    status: StrategicCoherenceStatus;
    reason: string;
    evidenceIds: string[];
    channelIds: string[];
  }>;
  blockers: Array<{
    code: string;
    link: StrategicCoherenceLink;
    message: string;
    requiredEvidence: string;
  }>;
}

export interface VertexAssetGeneration {
  helpfulPosts: Array<{
    postId: string;
    title: string;
    body: string;
    closingQuestion: string;
  }>;
  outreachScripts: Array<{
    scriptId: string;
    message: string;
  }>;
  landingPageCopy: {
    headline: string;
    subheadline: string;
    offerDescription: string;
    primaryCallToAction: string;
    confirmationEmailSubject: string;
    confirmationEmailBody: string;
  };
  customerInterviewGuide: {
    opening: string;
    lastOccurrenceQuestions: string[];
    currentWorkaroundQuestions: string[];
    costAndConsequenceQuestions: string[];
    buyingProcessQuestions: string[];
    closingAndReferralQuestions: string[];
  };
  offerConversationGuide: {
    opening: string;
    offerExplanation: string;
    pricePresentation: string;
    commitmentRequest: string;
    followUpAgreement: string;
  };
  dailyActions: Array<{
    dayNumber: number;
    title: string;
    requiredActions: string[];
    preparedAssets: string[];
    successMeasurement: string;
    evidenceToRecord: string[];
    whyItMatters: string;
    estimatedMinutes: number;
  }>;
}

export interface VertexRedTeamReview {
  passed: boolean;
  checks: Record<RedTeamCheckName, 'pass' | 'fail'>;
  findings: BlueprintVertexRedTeamFinding[];
}

const STRING: VertexResponseSchema = { type: 'STRING' };
const INTEGER: VertexResponseSchema = { type: 'INTEGER' };
const BOOLEAN: VertexResponseSchema = { type: 'BOOLEAN' };

function stringArray(minItems = 1, maxItems = 12): VertexResponseSchema {
  return { type: 'ARRAY', items: STRING, minItems, maxItems };
}

const EVIDENCE_NORMALIZATION_SCHEMA: VertexResponseSchema = {
  type: 'OBJECT',
  properties: {
    packetSummary: STRING,
    verifiedEvidenceIds: stringArray(1, 40),
    inferenceEvidenceIds: stringArray(0, 30),
    missingEvidence: stringArray(1, 12),
    criticalAssumptions: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'OBJECT',
        properties: {
          assumptionId: STRING,
          assumption: STRING,
          failureConsequence: STRING,
          evidenceRequired: STRING
        },
        required: ['assumptionId', 'assumption', 'failureConsequence', 'evidenceRequired']
      }
    }
  },
  required: [
    'packetSummary',
    'verifiedEvidenceIds',
    'inferenceEvidenceIds',
    'missingEvidence',
    'criticalAssumptions'
  ]
};

const STRATEGY_SYNTHESIS_SCHEMA: VertexResponseSchema = {
  type: 'OBJECT',
  properties: {
    executiveDecision: {
      type: 'OBJECT',
      properties: {
        strongestOpportunity: STRING,
        biggestRisk: STRING,
        recommendedInitialCustomer: STRING,
        validationObjective: STRING,
        continueEvidence: stringArray(2, 8),
        stopEvidence: stringArray(2, 8)
      },
      required: [
        'strongestOpportunity',
        'biggestRisk',
        'recommendedInitialCustomer',
        'validationObjective',
        'continueEvidence',
        'stopEvidence'
      ]
    },
    offer: {
      type: 'OBJECT',
      properties: {
        offerName: STRING,
        targetCustomer: STRING,
        painfulProblem: STRING,
        desiredOutcome: STRING,
        oneSentencePromise: STRING,
        initialTestPrice: STRING,
        pricingRationale: STRING,
        riskReversal: STRING
      },
      required: [
        'offerName',
        'targetCustomer',
        'painfulProblem',
        'desiredOutcome',
        'oneSentencePromise',
        'initialTestPrice',
        'pricingRationale',
        'riskReversal'
      ]
    },
    firstRevenuePath: {
      type: 'OBJECT',
      properties: {
        firstOfferFormat: STRING,
        firstBuyer: STRING,
        firstAsk: STRING,
        firstPrice: STRING,
        commitmentMethod: STRING,
        targetDay: INTEGER,
        minimumQualifiedAsks: INTEGER,
        successThreshold: STRING
      },
      required: [
        'firstOfferFormat',
        'firstBuyer',
        'firstAsk',
        'firstPrice',
        'commitmentMethod',
        'targetDay',
        'minimumQualifiedAsks',
        'successThreshold'
      ]
    },
    manualFulfillmentPlan: {
      type: 'OBJECT',
      properties: {
        expectedDeliveryTime: STRING,
        successfulDeliveryDefinition: STRING,
        capacityPerWeek: INTEGER,
        estimatedVariableCost: STRING,
        estimatedFounderHours: STRING,
        grossMarginGuardrail: STRING
      },
      required: [
        'expectedDeliveryTime',
        'successfulDeliveryDefinition',
        'capacityPerWeek',
        'estimatedVariableCost',
        'estimatedFounderHours',
        'grossMarginGuardrail'
      ]
    },
    channelPriorities: stringArray(3, 10),
    decisionThresholds: {
      type: 'ARRAY',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'OBJECT',
        properties: {
          decision: { type: 'STRING', enum: ['continue', 'revise', 'pivot', 'stop'] },
          condition: STRING,
          nextAction: STRING
        },
        required: ['decision', 'condition', 'nextAction']
      }
    }
  },
  required: [
    'executiveDecision',
    'offer',
    'firstRevenuePath',
    'manualFulfillmentPlan',
    'channelPriorities',
    'decisionThresholds'
  ]
};

// Keep the Vertex transport schema intentionally lighter than the product
// contract. Vertex can reject exact nested array bounds as an invalid request.
// validateStrategicCoherenceGate() remains authoritative for exactly eight
// unique links and the required access-path channel.
const STRATEGIC_COHERENCE_SCHEMA: VertexResponseSchema = {
  type: 'OBJECT',
  properties: {
    passed: BOOLEAN,
    chainSummary: STRING,
    links: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          link: { type: 'STRING', enum: [...STRATEGIC_COHERENCE_LINKS] },
          value: STRING,
          status: { type: 'STRING', enum: ['coherent', 'testable_hypothesis', 'unresolved', 'contradictory'] },
          reason: STRING,
          evidenceIds: stringArray(0, 20),
          channelIds: stringArray(0, 10)
        },
        required: ['link', 'value', 'status', 'reason', 'evidenceIds', 'channelIds']
      }
    },
    blockers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          code: STRING,
          link: { type: 'STRING', enum: [...STRATEGIC_COHERENCE_LINKS] },
          message: STRING,
          requiredEvidence: STRING
        },
        required: ['code', 'link', 'message', 'requiredEvidence']
      }
    }
  },
  required: ['passed', 'chainSummary', 'links', 'blockers']
};

const ASSET_GENERATION_SCHEMA: VertexResponseSchema = {
  type: 'OBJECT',
  properties: {
    helpfulPosts: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          postId: STRING,
          title: STRING,
          body: STRING,
          closingQuestion: STRING
        },
        required: ['postId', 'title', 'body', 'closingQuestion']
      }
    },
    outreachScripts: {
      type: 'ARRAY',
      minItems: 4,
      maxItems: 8,
      items: {
        type: 'OBJECT',
        properties: {
          scriptId: STRING,
          message: STRING
        },
        required: ['scriptId', 'message']
      }
    },
    landingPageCopy: {
      type: 'OBJECT',
      properties: {
        headline: STRING,
        subheadline: STRING,
        offerDescription: STRING,
        primaryCallToAction: STRING,
        confirmationEmailSubject: STRING,
        confirmationEmailBody: STRING
      },
      required: [
        'headline',
        'subheadline',
        'offerDescription',
        'primaryCallToAction',
        'confirmationEmailSubject',
        'confirmationEmailBody'
      ]
    },
    customerInterviewGuide: {
      type: 'OBJECT',
      properties: {
        opening: STRING,
        lastOccurrenceQuestions: stringArray(3, 6),
        currentWorkaroundQuestions: stringArray(3, 6),
        costAndConsequenceQuestions: stringArray(2, 5),
        buyingProcessQuestions: stringArray(2, 5),
        closingAndReferralQuestions: stringArray(2, 5)
      },
      required: [
        'opening',
        'lastOccurrenceQuestions',
        'currentWorkaroundQuestions',
        'costAndConsequenceQuestions',
        'buyingProcessQuestions',
        'closingAndReferralQuestions'
      ]
    },
    offerConversationGuide: {
      type: 'OBJECT',
      properties: {
        opening: STRING,
        offerExplanation: STRING,
        pricePresentation: STRING,
        commitmentRequest: STRING,
        followUpAgreement: STRING
      },
      required: [
        'opening',
        'offerExplanation',
        'pricePresentation',
        'commitmentRequest',
        'followUpAgreement'
      ]
    },
    dailyActions: {
      type: 'ARRAY',
      minItems: 30,
      maxItems: 30,
      items: {
        type: 'OBJECT',
        properties: {
          dayNumber: INTEGER,
          title: STRING,
          requiredActions: stringArray(1, 4),
          preparedAssets: stringArray(0, 4),
          successMeasurement: STRING,
          evidenceToRecord: stringArray(1, 4),
          whyItMatters: STRING,
          estimatedMinutes: INTEGER
        },
        required: [
          'dayNumber',
          'title',
          'requiredActions',
          'preparedAssets',
          'successMeasurement',
          'evidenceToRecord',
          'whyItMatters',
          'estimatedMinutes'
        ]
      }
    }
  },
  required: [
    'helpfulPosts',
    'outreachScripts',
    'landingPageCopy',
    'customerInterviewGuide',
    'offerConversationGuide',
    'dailyActions'
  ]
};

const RED_TEAM_CHECK_PROPERTIES = {
  unsupportedClaims: { type: 'STRING', enum: ['pass', 'fail'] },
  inventedSources: { type: 'STRING', enum: ['pass', 'fail'] },
  contradictions: { type: 'STRING', enum: ['pass', 'fail'] },
  genericLanguage: { type: 'STRING', enum: ['pass', 'fail'] },
  businessModelMismatch: { type: 'STRING', enum: ['pass', 'fail'] },
  impossibleWorkload: { type: 'STRING', enum: ['pass', 'fail'] },
  missingDailyAssets: { type: 'STRING', enum: ['pass', 'fail'] },
  unclearMeasurements: { type: 'STRING', enum: ['pass', 'fail'] },
  softenedStopCriteria: { type: 'STRING', enum: ['pass', 'fail'] },
  pricingFulfillmentMismatch: { type: 'STRING', enum: ['pass', 'fail'] }
} satisfies Record<RedTeamCheckName, VertexResponseSchema>;

const RED_TEAM_SCHEMA: VertexResponseSchema = {
  type: 'OBJECT',
  properties: {
    passed: BOOLEAN,
    checks: {
      type: 'OBJECT',
      properties: RED_TEAM_CHECK_PROPERTIES,
      required: Object.keys(RED_TEAM_CHECK_PROPERTIES)
    },
    findings: {
      type: 'ARRAY',
      maxItems: 20,
      items: {
        type: 'OBJECT',
        properties: {
          code: STRING,
          severity: { type: 'STRING', enum: ['warning', 'blocking'] },
          field: STRING,
          message: STRING
        },
        required: ['code', 'severity', 'field', 'message']
      }
    }
  },
  required: ['passed', 'checks', 'findings']
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function requireText(value: unknown, field: string): string {
  const normalized = clean(value);
  if (!normalized) throw new Error(`Vertex Blueprint stage returned an empty ${field}`);
  return normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function assertKnownIds(values: string[], known: Set<string>, field: string, minimum = 1): string[] {
  const normalized = unique(values);
  if (normalized.length < minimum) throw new Error(`Vertex Blueprint ${field} returned fewer than ${minimum} values`);
  const unknown = normalized.filter(value => !known.has(value));
  if (unknown.length) throw new Error(`Vertex Blueprint ${field} referenced unknown immutable IDs: ${unknown.join(', ')}`);
  return normalized;
}

function cloneBlueprint(blueprint: GhostTownLaunchBlueprintV21): GhostTownLaunchBlueprintV21 {
  return JSON.parse(JSON.stringify(blueprint)) as GhostTownLaunchBlueprintV21;
}

function addEvidence(
  items: VertexEvidenceCatalogItem[],
  statement: BlueprintEvidenceStatement,
  sourceIds: string[] = []
): void {
  const value = clean(statement.statement);
  if (!value) return;
  items.push({
    evidenceId: `evidence-${String(items.length + 1).padStart(3, '0')}`,
    statement: value,
    truthLabel: statement.truthLabel,
    source: statement.source,
    sourceIds: unique(sourceIds)
  });
}

export function buildVertexEvidenceCatalog(
  draft: GhostTownLaunchBlueprintV21,
  research: CustomerAccessResearchResult
): VertexEvidenceCatalogItem[] {
  const items: VertexEvidenceCatalogItem[] = [];
  const audit = draft.startingStateAudit;
  [
    audit.currentStage,
    audit.existingOffer,
    audit.existingLandingPage,
    audit.previousOutreach,
    audit.existingCustomersAudienceOrPartners,
    audit.manualFulfillmentReadiness,
    audit.founderConstraints.hoursPerWeek,
    audit.founderConstraints.testBudget,
    audit.founderConstraints.geography,
    audit.founderConstraints.language,
    audit.founderConstraints.technicalCapability,
    ...audit.existingSkillsAndAssets,
    ...audit.priorSignals,
    ...audit.priorNoSignals,
    ...audit.verifiedFacts,
    ...audit.inferences
  ].forEach(statement => addEvidence(items, statement));

  research.research.sources.forEach(source => addEvidence(items, {
    statement: `Verified public source ${source.title} at ${source.url} supports ${source.supports.join(', ') || 'the customer-access research record'}.`,
    truthLabel: 'Verified',
    source: 'provider_research'
  }, [source.sourceId]));

  return items;
}

export function createLaunchBlueprintVertexContext(
  order: PaidTestOrder,
  verdict: EvaluationResult,
  research: CustomerAccessResearchResult,
  draft: GhostTownLaunchBlueprintV21
): LaunchBlueprintVertexContext {
  return {
    order,
    verdict,
    research,
    draft,
    evidenceCatalog: buildVertexEvidenceCatalog(draft, research)
  };
}

function validateEvidenceNormalization(
  context: LaunchBlueprintVertexContext,
  data: VertexEvidenceNormalization
): VertexEvidenceNormalization {
  requireText(data.packetSummary, 'evidence packet summary');
  const known = new Set(context.evidenceCatalog.map(item => item.evidenceId));
  data.verifiedEvidenceIds = assertKnownIds(data.verifiedEvidenceIds, known, 'verified evidence IDs');
  data.inferenceEvidenceIds = assertKnownIds(data.inferenceEvidenceIds, known, 'inference evidence IDs', 0);
  data.missingEvidence = unique(data.missingEvidence).map((item, index) =>
    requireText(item, `missing evidence item ${index + 1}`)
  );
  if (!data.missingEvidence.length) throw new Error('Vertex Blueprint evidence normalization must identify missing evidence');
  if (data.criticalAssumptions.length < 1 || data.criticalAssumptions.length > 5) {
    throw new Error('Vertex Blueprint evidence normalization must return between one and five critical assumptions');
  }
  const assumptionIds = new Set<string>();
  data.criticalAssumptions.forEach((item, index) => {
    item.assumptionId = requireText(item.assumptionId, `critical assumption ${index + 1} ID`);
    item.assumption = requireText(item.assumption, `critical assumption ${index + 1}`);
    item.failureConsequence = requireText(item.failureConsequence, `critical assumption ${index + 1} failure consequence`);
    item.evidenceRequired = requireText(item.evidenceRequired, `critical assumption ${index + 1} evidence required`);
    if (assumptionIds.has(item.assumptionId)) throw new Error(`Duplicate critical assumption ID: ${item.assumptionId}`);
    assumptionIds.add(item.assumptionId);
  });
  return data;
}

export async function runVertexEvidenceNormalizationStage(
  env: Env,
  context: LaunchBlueprintVertexContext
): Promise<VertexStructuredStageResult<VertexEvidenceNormalization>> {
  const canonicalVerdict = hydrateEvaluationResultDecisionV2(context.verdict).verdictDecisionV2!;
  const vertexVerdict = projectVerdictDecisionV2ToVertexInput(canonicalVerdict);
  const result = await runVertexStructuredStage<VertexEvidenceNormalization>(env, {
    stage: 'evidence_normalization',
    systemInstruction: [
      'You are GhostTown Stage 1, an evidence normalization service.',
      'Use only the supplied immutable evidence IDs for verified facts and inferences.',
      'Never invent a source, fact, customer statement, payment, result, or credential.',
      'Missing evidence and critical assumptions must be explicit tests, not claims.',
      'Return only schema-controlled JSON.'
    ].join(' '),
    prompt: JSON.stringify({
      contractVersion: context.draft.contractVersion,
      verdict: vertexVerdict,
      paidIntake: context.order.intake,
      confirmedSeedDomains: context.research.receipt.seedDomains,
      evidenceCatalog: context.evidenceCatalog
    }),
    responseSchema: EVIDENCE_NORMALIZATION_SCHEMA,
    temperature: 0,
    maxOutputTokens: 4096,
    timeoutMs: 60_000
  });
  result.data = validateEvidenceNormalization(context, result.data);
  return result;
}

function validateStrategy(
  context: LaunchBlueprintVertexContext,
  data: VertexStrategySynthesis
): VertexStrategySynthesis {
  const channelIds = new Set(context.draft.customerAccessPack.channels.map(channel => channel.channelId));
  data.channelPriorities = assertKnownIds(data.channelPriorities, channelIds, 'channel priorities', 3);
  const customerAccess = directCustomerAccessChannels(context.draft.customerAccessPack.channels);
  if (customerAccess.length < 3) {
    throw new Error(`Vertex Blueprint requires at least three direct customer-access targets before strategy synthesis; found ${customerAccess.length}`);
  }
  if (data.firstRevenuePath.targetDay < 1 || data.firstRevenuePath.targetDay > 30) {
    throw new Error('Vertex Blueprint first-revenue target day must be between 1 and 30');
  }
  if (data.firstRevenuePath.minimumQualifiedAsks < 1 || data.firstRevenuePath.minimumQualifiedAsks > 50) {
    throw new Error('Vertex Blueprint minimum qualified asks must be between 1 and 50');
  }
  if (data.manualFulfillmentPlan.capacityPerWeek < 1 || data.manualFulfillmentPlan.capacityPerWeek > 100) {
    throw new Error('Vertex Blueprint fulfillment capacity must be between 1 and 100');
  }
  const decisions = data.decisionThresholds.map(item => item.decision);
  const expected: BlueprintDecision[] = ['continue', 'revise', 'pivot', 'stop'];
  if (unique(decisions).sort().join(',') !== [...expected].sort().join(',')) {
    throw new Error('Vertex Blueprint decision thresholds must contain continue, revise, pivot, and stop exactly once');
  }
  return data;
}

export async function runVertexStrategySynthesisStage(
  env: Env,
  context: LaunchBlueprintVertexContext,
  evidence: VertexEvidenceNormalization
): Promise<VertexStructuredStageResult<VertexStrategySynthesis>> {
  const byId = new Map(context.evidenceCatalog.map(item => [item.evidenceId, item]));
  const selectedEvidence = unique([
    ...evidence.verifiedEvidenceIds,
    ...evidence.inferenceEvidenceIds
  ]).map(id => byId.get(id)).filter((item): item is VertexEvidenceCatalogItem => Boolean(item));

  const result = await runVertexStructuredStage<VertexStrategySynthesis>(env, {
    stage: 'strategy_synthesis',
    systemInstruction: [
      'You are GhostTown Stage 2, an evidence-led business strategy service.',
      'Synthesize a bounded 30-day validation strategy from the normalized packet.',
      'Treat prices, positioning, and recommendations as hypotheses unless supported by observed behavior.',
      'Use only supplied channel IDs. Preserve explicit stop criteria and manual fulfillment constraints.',
      'Respect each channel evidenceRole. Only customer_access channels may drive first-revenue outreach or direct buyer acquisition; media_pr, market_evidence, and partnership channels are supporting evidence/opportunities only.',
      'Do not promise outcomes, fabricate proof, or recommend broad building before commitment evidence.',
      'Return only schema-controlled JSON.'
    ].join(' '),
    prompt: JSON.stringify({
      evidencePacket: {
        summary: evidence.packetSummary,
        selectedEvidence,
        missingEvidence: evidence.missingEvidence,
        criticalAssumptions: evidence.criticalAssumptions
      },
      businessModelLane: context.draft.businessModelLane,
      currentStrategy: {
        executiveDecision: context.draft.executiveDecision,
        offer: context.draft.offer,
        firstRevenuePath: context.draft.firstRevenuePath,
        manualFulfillmentPlan: context.draft.manualFulfillmentPlan,
        finalDecision: context.draft.finalDecision
      },
      immutableChannels: context.draft.customerAccessPack.channels.map(channel => ({
        channelId: channel.channelId,
        community: channel.community,
        platform: channel.platform,
        relevance: channel.relevance,
        evidenceRole: researchEvidenceRole(channel),
        evidenceRoleReason: channel.evidenceRoleReason,
        firstAction: channel.firstAction,
        confidence: channel.confidence,
        sourceIds: channel.sourceIds
      }))
    }),
    responseSchema: STRATEGY_SYNTHESIS_SCHEMA,
    temperature: 0.1,
    maxOutputTokens: 6144,
    timeoutMs: 75_000
  });
  result.data = validateStrategy(context, result.data);
  return result;
}

export function validateStrategicCoherenceGate(
  context: LaunchBlueprintVertexContext,
  data: VertexStrategicCoherenceGate
): VertexStrategicCoherenceGate {
  data.chainSummary = requireText(data.chainSummary, 'strategic coherence chain summary');

  const actual = data.links.map(item => item.link);
  const expected = [...STRATEGIC_COHERENCE_LINKS].sort();
  if (data.links.length !== STRATEGIC_COHERENCE_LINKS.length || new Set(actual).size !== STRATEGIC_COHERENCE_LINKS.length) {
    throw new Error('Strategic Coherence Gate must return each of the eight chain links exactly once');
  }
  if ([...actual].sort().join(',') !== expected.join(',')) {
    throw new Error('Strategic Coherence Gate returned an invalid chain-link set');
  }

  const knownEvidence = new Set(context.evidenceCatalog.map(item => item.evidenceId));
  const knownChannels = new Set(context.draft.customerAccessPack.channels.map(channel => channel.channelId));

  data.links.forEach(item => {
    item.value = requireText(item.value, `strategic coherence ${item.link} value`);
    item.reason = requireText(item.reason, `strategic coherence ${item.link} reason`);
    item.evidenceIds = assertKnownIds(item.evidenceIds, knownEvidence, `${item.link} evidence IDs`, 0);
    item.channelIds = assertKnownIds(item.channelIds, knownChannels, `${item.link} channel IDs`, 0);
    if (item.link === 'access_path') {
      if (item.channelIds.length < 1) {
        throw new Error('Strategic Coherence Gate access path must reference at least one verified channel ID');
      }
      const channelsById = new Map(context.draft.customerAccessPack.channels.map(channel => [channel.channelId, channel]));
      const nonCustomerAccessIds = item.channelIds.filter(id => {
        const channel = channelsById.get(id);
        return !channel || !isCustomerAccessChannel(channel);
      });
      if (nonCustomerAccessIds.length) {
        throw new Error(`Strategic Coherence Gate access path referenced non-customer-access channels: ${nonCustomerAccessIds.join(', ')}`);
      }
    }
  });

  data.blockers.forEach((blocker, index) => {
    blocker.code = requireText(blocker.code, `strategic coherence blocker ${index + 1} code`);
    blocker.message = requireText(blocker.message, `strategic coherence blocker ${index + 1} message`);
    blocker.requiredEvidence = requireText(blocker.requiredEvidence, `strategic coherence blocker ${index + 1} required evidence`);
  });

  const failedLinks = data.links.filter(item => item.status === 'unresolved' || item.status === 'contradictory');
  if (data.passed && (failedLinks.length || data.blockers.length)) {
    throw new Error('Strategic Coherence Gate result is internally inconsistent');
  }
  if (!data.passed && !failedLinks.length && !data.blockers.length) {
    throw new Error('Strategic Coherence Gate failed without identifying a blocking link');
  }
  return data;
}

export function assertStrategicCoherenceGate(data: VertexStrategicCoherenceGate): void {
  const failedLinks = data.links.filter(item => item.status === 'unresolved' || item.status === 'contradictory');
  if (data.passed && !failedLinks.length && !data.blockers.length) return;

  const reasons = [
    ...failedLinks.map(item => `${item.link}: ${item.reason}`),
    ...data.blockers.map(item => `${item.code}: ${item.message} Required: ${item.requiredEvidence}`)
  ];
  throw new Error(`Launch Blueprint strategic coherence gate failed: ${reasons.join(' | ') || 'commercial chain did not pass'}`);
}

export async function runVertexStrategicCoherenceGateStage(
  env: Env,
  context: LaunchBlueprintVertexContext,
  evidence: VertexEvidenceNormalization,
  strategy: VertexStrategySynthesis
): Promise<VertexStructuredStageResult<VertexStrategicCoherenceGate>> {
  const byId = new Map(context.evidenceCatalog.map(item => [item.evidenceId, item]));
  const selectedEvidence = unique([
    ...evidence.verifiedEvidenceIds,
    ...evidence.inferenceEvidenceIds
  ]).map(id => byId.get(id)).filter((item): item is VertexEvidenceCatalogItem => Boolean(item));

  const result = await runVertexStructuredStage<VertexStrategicCoherenceGate>(env, {
    stage: 'strategic_coherence_gate',
    systemInstruction: [
      'You are GhostTown Strategic Coherence Gate, an independent fail-closed reviewer.',
      'Do not improve, rewrite, or rescue the proposed strategy. Decide whether one coherent commercial chain exists before any 30-day Sprint assets may be generated.',
      'Evaluate exactly: customer -> problem -> buyer/payer -> current alternative -> test -> commitment -> fulfillment -> access path.',
      'The customer is the user or beneficiary. The buyer/payer is the person or organization able and willing to authorize the requested commitment; do not assume they are the same unless the supplied evidence or strategy makes that relationship explicit.',
      'The current alternative must be an observed or explicitly supplied behavior/workaround, not merely a competitor list.',
      'The test must exercise the same core value hypothesis as the proposed product. A manual proxy fails if it silently changes the business, buyer, value mechanism, risk, or operational burden being tested.',
      'For safety-sensitive products, fail any manual proxy whose promised monitoring, intervention, escalation, clinical, financial, legal, or other high-consequence responsibility is not clearly bounded and realistically fulfillable.',
      'The commitment must be observable and appropriate for the buyer/payer and test; compliments or generic interest are not commitment.',
      'Fulfillment must be specific, operationally feasible inside the stated founder time/cost/capability limits, and consistent with the offer.',
      'The access path must plausibly reach the stated buyer/payer. Media, PR, backlink, event, partner, or creator evidence is not automatically a customer-access path.',
      'A link may be testable_hypothesis only when it is explicit, internally consistent, bounded, and can be tested without assuming the answer. Mark missing identity, payer, fulfillment, or access logic unresolved.',
      'Fail the gate if any link is unresolved or contradictory. Identify the smallest missing evidence needed to continue.',
      'Use only supplied evidence IDs and channel IDs. Return only schema-controlled JSON.'
    ].join(' '),
    prompt: JSON.stringify({
      contractVersion: context.draft.contractVersion,
      sourceIdea: {
        name: context.verdict.idea.ideaName,
        description: context.verdict.idea.description,
        targetUser: context.verdict.idea.targetUser,
        painfulProblem: context.verdict.idea.painfulProblem,
        currentAlternative: context.verdict.idea.currentAlternative
      },
      paidIntake: context.order.intake,
      evidencePacket: {
        summary: evidence.packetSummary,
        selectedEvidence,
        missingEvidence: evidence.missingEvidence,
        criticalAssumptions: evidence.criticalAssumptions
      },
      proposedStrategy: strategy,
      businessModelLane: context.draft.businessModelLane,
      currentAlternatives: context.draft.positioning.currentAlternatives,
      founderConstraints: context.draft.startingStateAudit.founderConstraints,
      verifiedChannels: context.draft.customerAccessPack.channels.map(channel => ({
        channelId: channel.channelId,
        community: channel.community,
        platform: channel.platform,
        targetType: channel.targetType,
        evidenceRole: researchEvidenceRole(channel),
        relevance: channel.relevance,
        accessPath: channel.accessPath,
        recommendedApproach: channel.recommendedApproach,
        firstAction: channel.firstAction,
        confidence: channel.confidence,
        sourceIds: channel.sourceIds
      }))
    }),
    responseSchema: STRATEGIC_COHERENCE_SCHEMA,
    temperature: 0,
    maxOutputTokens: 6144,
    timeoutMs: 75_000
  });

  result.data = validateStrategicCoherenceGate(context, result.data);
  assertStrategicCoherenceGate(result.data);
  return result;
}

function validateAssets(
  context: LaunchBlueprintVertexContext,
  data: VertexAssetGeneration
): VertexAssetGeneration {
  const postIds = new Set(context.draft.customerAccessPack.helpfulPosts.map(post => post.postId));
  const scriptIds = new Set(context.draft.customerAccessPack.outreachScripts.map(script => script.scriptId));
  assertKnownIds(data.helpfulPosts.map(item => item.postId), postIds, 'helpful post IDs');
  assertKnownIds(data.outreachScripts.map(item => item.scriptId), scriptIds, 'outreach script IDs', 4);
  const days = data.dailyActions.map(item => item.dayNumber);
  const expectedDays = Array.from({ length: 30 }, (_, index) => index + 1);
  if (new Set(days).size !== 30 || [...days].sort((left, right) => left - right).join(',') !== expectedDays.join(',')) {
    throw new Error('Vertex Blueprint asset generation must return every day from 1 through 30 exactly once');
  }
  data.dailyActions.forEach(day => {
    if (day.estimatedMinutes < 10 || day.estimatedMinutes > 240) {
      throw new Error(`Vertex Blueprint Day ${day.dayNumber} estimated minutes must be between 10 and 240`);
    }
  });
  return data;
}

export async function runVertexAssetGenerationStage(
  env: Env,
  context: LaunchBlueprintVertexContext,
  strategy: VertexStrategySynthesis
): Promise<VertexStructuredStageResult<VertexAssetGeneration>> {
  const result = await runVertexStructuredStage<VertexAssetGeneration>(env, {
    stage: 'asset_generation',
    systemInstruction: [
      'You are GhostTown Stage 3, a practical customer-development asset service.',
      'Generate concise assets that a founder can use without further model calls.',
      'Use only the supplied post IDs, script IDs, channel context, and Day 1 through Day 30 skeleton.',
      'No fabricated testimonials, guarantees, fake scarcity, unsupported proof, or invented source claims.',
      'Every daily action must have one measurable outcome and evidence to record.',
      'Return only schema-controlled JSON.'
    ].join(' '),
    prompt: JSON.stringify({
      strategy,
      businessModelLane: context.draft.businessModelLane,
      channelContext: context.draft.customerAccessPack.channels.slice(0, 10).map(channel => ({
        channelId: channel.channelId,
        community: channel.community,
        platform: channel.platform,
        participationRules: channel.participationRules,
        usefulTopic: channel.usefulTopic
      })),
      helpfulPostSlots: context.draft.customerAccessPack.helpfulPosts.map(post => ({
        postId: post.postId,
        platform: post.platform,
        intendedCommunity: post.intendedCommunity,
        objective: post.objective
      })),
      outreachScriptSlots: context.draft.customerAccessPack.outreachScripts.map(script => ({
        scriptId: script.scriptId,
        relationship: script.relationship,
        purpose: script.purpose,
        useWhen: script.useWhen
      })),
      dailySkeleton: context.draft.dailyCalendar.map(day => ({
        dayNumber: day.dayNumber,
        title: day.title,
        primaryObjective: day.primaryObjective
      }))
    }),
    responseSchema: ASSET_GENERATION_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 12288,
    timeoutMs: 90_000
  });
  result.data = validateAssets(context, result.data);
  return result;
}

function reorderChannels(
  channels: CustomerAccessChannel[],
  priorities: string[]
): CustomerAccessChannel[] {
  const priority = new Map(priorities.map((id, index) => [id, index]));
  const roleRank = (channel: CustomerAccessChannel): number =>
    researchEvidenceRole(channel) === 'customer_access' ? 0
      : researchEvidenceRole(channel) === 'market_evidence' ? 1
        : researchEvidenceRole(channel) === 'partnership' ? 2
          : 3;
  return [...channels].sort((left, right) => {
    const roleDifference = roleRank(left) - roleRank(right);
    if (roleDifference) return roleDifference;
    const leftRank = priority.get(left.channelId) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = priority.get(right.channelId) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });
}

function patchPosts(base: HelpfulPost[], generated: VertexAssetGeneration['helpfulPosts']): HelpfulPost[] {
  const generatedById = new Map(generated.map(item => [item.postId, item]));
  return base.map(post => {
    const patch = generatedById.get(post.postId);
    return patch ? {
      ...post,
      title: requireText(patch.title, `${post.postId} title`),
      body: requireText(patch.body, `${post.postId} body`),
      closingQuestion: requireText(patch.closingQuestion, `${post.postId} closing question`)
    } : post;
  });
}

function patchScripts(base: OutreachScript[], generated: VertexAssetGeneration['outreachScripts']): OutreachScript[] {
  const generatedById = new Map(generated.map(item => [item.scriptId, item]));
  return base.map(script => {
    const patch = generatedById.get(script.scriptId);
    return patch ? { ...script, message: requireText(patch.message, `${script.scriptId} message`) } : script;
  });
}

function selectedEvidenceStatements(
  context: LaunchBlueprintVertexContext,
  ids: string[]
): BlueprintEvidenceStatement[] {
  const byId = new Map(context.evidenceCatalog.map(item => [item.evidenceId, item]));
  return unique(ids).map(id => byId.get(id)).filter((item): item is VertexEvidenceCatalogItem => Boolean(item))
    .map(({ statement, truthLabel, source }) => ({ statement, truthLabel, source }));
}

export function applyVertexPipelineDraft(
  context: LaunchBlueprintVertexContext,
  evidence: VertexEvidenceNormalization,
  strategy: VertexStrategySynthesis,
  assets: VertexAssetGeneration
): GhostTownLaunchBlueprintV21 {
  validateEvidenceNormalization(context, evidence);
  validateStrategy(context, strategy);
  validateAssets(context, assets);

  const next = cloneBlueprint(context.draft);
  next.startingStateAudit.verifiedFacts = selectedEvidenceStatements(context, evidence.verifiedEvidenceIds);
  next.startingStateAudit.inferences = [
    ...selectedEvidenceStatements(context, evidence.inferenceEvidenceIds),
    { statement: evidence.packetSummary, truthLabel: 'Inferred', source: 'system_inference' }
  ];
  next.startingStateAudit.priorNoSignals = [
    ...next.startingStateAudit.priorNoSignals,
    ...evidence.missingEvidence.map(statement => ({
      statement,
      truthLabel: 'Test' as const,
      source: 'missing_input' as const
    }))
  ];
  next.startingStateAudit.criticalTests = evidence.criticalAssumptions;

  next.executiveDecision = {
    ...next.executiveDecision,
    ...strategy.executiveDecision
  };
  next.offer = {
    ...next.offer,
    ...strategy.offer,
    truthLabel: 'Test'
  };
  next.firstRevenuePath = {
    ...next.firstRevenuePath,
    ...strategy.firstRevenuePath
  };
  next.manualFulfillmentPlan = {
    ...next.manualFulfillmentPlan,
    ...strategy.manualFulfillmentPlan
  };
  next.customerAccessPack.channels = reorderChannels(
    next.customerAccessPack.channels,
    strategy.channelPriorities
  );
  next.finalDecision.criteria = strategy.decisionThresholds;

  next.customerAccessPack.helpfulPosts = patchPosts(
    next.customerAccessPack.helpfulPosts,
    assets.helpfulPosts
  );
  next.customerAccessPack.outreachScripts = patchScripts(
    next.customerAccessPack.outreachScripts,
    assets.outreachScripts
  );
  next.landingPageCopy = {
    ...next.landingPageCopy,
    ...assets.landingPageCopy
  };
  next.launchSite.offer = {
    ...next.launchSite.offer,
    offerName: next.offer.offerName,
    targetCustomer: next.offer.targetCustomer,
    headline: next.landingPageCopy.headline,
    subheadline: next.landingPageCopy.subheadline,
    primaryOutcome: next.offer.desiredOutcome,
    price: next.offer.initialTestPrice,
    priceExplanation: next.offer.pricingRationale,
    timeToFirstValue: next.offer.timeToFirstUsefulResult,
    callToAction: next.landingPageCopy.primaryCallToAction
  };
  next.launchSite.solution = {
    ...next.launchSite.solution,
    summary: next.landingPageCopy.offerDescription
  };
  next.customerInterviewGuide = {
    ...next.customerInterviewGuide,
    ...assets.customerInterviewGuide
  };
  next.offerConversationGuide = {
    ...next.offerConversationGuide,
    ...assets.offerConversationGuide
  };

  const generatedDay = new Map(assets.dailyActions.map(day => [day.dayNumber, day]));
  next.dailyCalendar = next.dailyCalendar.map(day => {
    const patch = generatedDay.get(day.dayNumber);
    if (!patch) throw new Error(`Vertex Blueprint asset generation omitted Day ${day.dayNumber}`);
    return {
      ...day,
      title: patch.title,
      requiredActions: patch.requiredActions,
      preparedAssets: patch.preparedAssets,
      successMeasurement: patch.successMeasurement,
      evidenceToRecord: patch.evidenceToRecord,
      whyItMatters: patch.whyItMatters,
      estimatedMinutes: patch.estimatedMinutes
    };
  });

  const customerAccess = directCustomerAccessChannels(next.customerAccessPack.channels);
  const firstChannel = customerAccess[0];
  if (!firstChannel) throw new Error('Vertex Blueprint strategy left no direct customer-access channel');
  next.firstRevenuePath.firstChannel = `${firstChannel.community} via ${firstChannel.platform}`;
  next.launchCard48Hour = {
    ...next.launchCard48Hour,
    firstCustomer: next.executiveDecision.recommendedInitialCustomer,
    firstOffer: `${next.offer.offerName} at ${next.offer.initialTestPrice}`,
    firstThreeApproaches: customerAccess.slice(0, 3).map(channel => ({
      name: channel.community,
      channelId: channel.channelId,
      publicUrl: channel.publicUrl,
      firstAction: channel.firstAction
    })),
    exactFirstMessage: next.firstRevenuePath.firstAsk,
    firstCommitmentRequest: next.firstRevenuePath.commitmentMethod,
    launchSitePreviewReady: Boolean(next.launchSite.offer.headline && next.launchSite.leadCapture.destination)
  };
  next.foundingCustomerPilotBrief = {
    ...next.foundingCustomerPilotBrief,
    problem: next.offer.painfulProblem,
    scope: next.offer.deliveryMethod,
    timeline: next.offer.timeToFirstUsefulResult,
    price: next.offer.initialTestPrice,
    nextStep: next.landingPageCopy.primaryCallToAction
  };

  // Vertex may improve canonical offer, scripts, guides, and daily aliases. Rebuild
  // the additive Q2 packet projection after those changes so no surface drifts.
  return synchronizeDailyExecutionPackets(next, context.verdict);
}

function validateRedTeam(data: VertexRedTeamReview): VertexRedTeamReview {
  const failedChecks = Object.entries(data.checks).filter(([, value]) => value === 'fail').map(([key]) => key);
  const blockingFindings = data.findings.filter(finding => finding.severity === 'blocking');
  data.findings.forEach((finding, index) => {
    finding.code = requireText(finding.code, `red-team finding ${index + 1} code`);
    finding.field = requireText(finding.field, `red-team finding ${index + 1} field`);
    finding.message = requireText(finding.message, `red-team finding ${index + 1} message`);
  });
  if (data.passed && (failedChecks.length || blockingFindings.length)) {
    throw new Error('Vertex Blueprint red-team result is internally inconsistent');
  }
  return data;
}

export async function runVertexRedTeamReviewStage(
  env: Env,
  context: LaunchBlueprintVertexContext,
  candidate: GhostTownLaunchBlueprintV21
): Promise<VertexStructuredStageResult<VertexRedTeamReview>> {
  const result = await runVertexStructuredStage<VertexRedTeamReview>(env, {
    stage: 'red_team_review',
    systemInstruction: [
      'You are GhostTown Stage 4, an independent red-team reviewer.',
      'Fail only concrete customer-harm, evidence, contract, workload, measurement, or consistency defects.',
      'Do not rewrite the Blueprint. Identify exact fields and classify material defects as blocking.',
      'Verified source IDs and URLs are immutable and must not be treated as invented when present in the supplied source ledger.',
      'A passed result may contain warnings but cannot contain a failed check or blocking finding.',
      'Return only schema-controlled JSON.'
    ].join(' '),
    prompt: JSON.stringify({
      contractVersion: candidate.contractVersion,
      schemaVersion: candidate.schemaVersion,
      businessModelLane: candidate.businessModelLane,
      evidencePacket: {
        verifiedFacts: candidate.startingStateAudit.verifiedFacts,
        inferences: candidate.startingStateAudit.inferences,
        missingEvidence: candidate.startingStateAudit.priorNoSignals,
        criticalTests: candidate.startingStateAudit.criticalTests
      },
      strategy: {
        executiveDecision: candidate.executiveDecision,
        offer: candidate.offer,
        firstRevenuePath: candidate.firstRevenuePath,
        manualFulfillmentPlan: candidate.manualFulfillmentPlan,
        finalDecision: candidate.finalDecision
      },
      assets: {
        helpfulPosts: candidate.customerAccessPack.helpfulPosts,
        outreachScripts: candidate.customerAccessPack.outreachScripts,
        landingPageCopy: candidate.landingPageCopy,
        customerInterviewGuide: candidate.customerInterviewGuide,
        offerConversationGuide: candidate.offerConversationGuide,
        dailyCalendar: candidate.dailyCalendar
      },
      immutableSourceLedger: candidate.sources.map(source => ({
        sourceId: source.sourceId,
        url: source.url,
        supports: source.supports
      })),
      immutableChannels: candidate.customerAccessPack.channels.map(channel => ({
        channelId: channel.channelId,
        publicUrl: channel.publicUrl,
        sourceIds: channel.sourceIds
      })),
      fulfillmentReceipt: context.research.receipt
    }),
    responseSchema: RED_TEAM_SCHEMA,
    temperature: 0,
    maxOutputTokens: 4096,
    timeoutMs: 75_000
  });
  result.data = validateRedTeam(result.data);
  return result;
}

function stageReceipt<T>(result: VertexStructuredStageResult<T>): BlueprintVertexStageReceipt {
  const stage = result.receipt.stage as VertexBlueprintStageName;
  if (!STAGE_NAMES.includes(stage)) throw new Error(`Unexpected Vertex Blueprint stage receipt: ${result.receipt.stage}`);
  return { ...result.receipt, stage };
}

function sourceFingerprint(sources: BlueprintSource[]): string {
  return JSON.stringify(sources.map(source => ({
    sourceId: source.sourceId,
    url: source.url,
    supports: [...source.supports].sort()
  })).sort((left, right) => left.sourceId.localeCompare(right.sourceId)));
}

function channelFingerprint(channels: CustomerAccessChannel[]): string {
  return JSON.stringify(channels.map(channel => ({
    channelId: channel.channelId,
    publicUrl: channel.publicUrl,
    sourceIds: [...channel.sourceIds].sort()
  })).sort((left, right) => left.channelId.localeCompare(right.channelId)));
}

function assertImmutableContract(
  draft: GhostTownLaunchBlueprintV21,
  candidate: GhostTownLaunchBlueprintV21
): void {
  const immutablePairs: Array<[string, unknown, unknown]> = [
    ['schemaVersion', draft.schemaVersion, candidate.schemaVersion],
    ['contractVersion', draft.contractVersion, candidate.contractVersion],
    ['blueprintId', draft.blueprintId, candidate.blueprintId],
    ['orderId', draft.orderId, candidate.orderId],
    ['ownerId', draft.ownerId, candidate.ownerId],
    ['sourceVerdictId', draft.sourceVerdictId, candidate.sourceVerdictId],
    [
      'canonical hash',
      draft.generationReceipt.canonicalContract.gitBlobSha1,
      candidate.generationReceipt.canonicalContract.gitBlobSha1
    ],
    ['source ledger', sourceFingerprint(draft.sources), sourceFingerprint(candidate.sources)],
    [
      'channel source ledger',
      channelFingerprint(draft.customerAccessPack.channels),
      channelFingerprint(candidate.customerAccessPack.channels)
    ]
  ];
  const changed = immutablePairs.filter(([, before, after]) => before !== after).map(([field]) => field);
  if (changed.length) throw new Error(`Vertex Blueprint attempted to mutate immutable contract fields: ${changed.join(', ')}`);
}

export function finalizeLaunchBlueprintVertexPipeline(
  context: LaunchBlueprintVertexContext,
  evidence: VertexStructuredStageResult<VertexEvidenceNormalization>,
  strategy: VertexStructuredStageResult<VertexStrategySynthesis>,
  coherence: VertexStructuredStageResult<VertexStrategicCoherenceGate>,
  assets: VertexStructuredStageResult<VertexAssetGeneration>,
  redTeam: VertexStructuredStageResult<VertexRedTeamReview>
): GhostTownLaunchBlueprintV21 {
  validateStrategicCoherenceGate(context, coherence.data);
  assertStrategicCoherenceGate(coherence.data);
  validateRedTeam(redTeam.data);
  const failedChecks = Object.values(redTeam.data.checks).filter(value => value === 'fail');
  const blocking = redTeam.data.findings.filter(finding => finding.severity === 'blocking');
  if (!redTeam.data.passed || failedChecks.length || blocking.length) {
    const reasons = [
      ...Object.entries(redTeam.data.checks).filter(([, value]) => value === 'fail').map(([key]) => key),
      ...blocking.map(finding => `${finding.code}: ${finding.message}`)
    ];
    throw new Error(`Launch Blueprint v2.1 red-team gate failed: ${reasons.join(' | ') || 'review did not pass'}`);
  }

  const candidate = applyVertexPipelineDraft(context, evidence.data, strategy.data, assets.data);
  assertImmutableContract(context.draft, candidate);

  const receipts = [
    stageReceipt(evidence),
    stageReceipt(strategy),
    stageReceipt(coherence),
    stageReceipt(assets),
    stageReceipt(redTeam)
  ];
  const completedAt = receipts.map(receipt => receipt.completedAt).sort().at(-1) || new Date().toISOString();
  const pipelineReceipt: BlueprintVertexPipelineReceipt = {
    pipelineVersion: VERTEX_BLUEPRINT_PIPELINE_VERSION,
    required: true,
    status: 'complete',
    stages: receipts,
    redTeam: {
      passed: true,
      findings: redTeam.data.findings
    },
    completedAt
  };
  candidate.generationReceipt = {
    ...candidate.generationReceipt,
    model: receipts[0]?.model,
    promptVersion: VERTEX_BLUEPRINT_PIPELINE_VERSION,
    fallbackStatus: 'ai_enriched',
    fallbackReason: undefined,
    vertexPipeline: pipelineReceipt
  };

  const gate = validateGhostTownLaunchBlueprintV21(candidate);
  gate.warnings = unique([
    ...gate.warnings,
    ...redTeam.data.findings.filter(finding => finding.severity === 'warning')
      .map(finding => `${finding.code}: ${finding.message}`)
  ]);
  candidate.qualityGate = gate;
  candidate.status = gate.passed ? 'ready' : 'failed_quality_gate';
  if (!gate.passed) {
    throw new Error(`Launch Blueprint v2.1 schema gate failed: ${gate.failures.join(' | ')}`);
  }
  return candidate;
}

export function markVertexPipelineSkipped(
  draft: GhostTownLaunchBlueprintV21,
  reason: string
): GhostTownLaunchBlueprintV21 {
  const next = cloneBlueprint(draft);
  next.generationReceipt = {
    ...next.generationReceipt,
    promptVersion: 'distribution-footprint-v1+canonical-blueprint-v2.1',
    fallbackStatus: 'deterministic_only',
    fallbackReason: reason,
    vertexPipeline: {
      pipelineVersion: VERTEX_BLUEPRINT_PIPELINE_VERSION,
      required: false,
      status: 'skipped',
      stages: [],
      redTeam: { passed: false, findings: [] },
      completedAt: new Date().toISOString(),
      skippedReason: reason
    }
  };
  return next;
}
