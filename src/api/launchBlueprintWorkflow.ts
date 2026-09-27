import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import type { WorkflowEvent } from 'cloudflare:workers';
import type { Env } from './env';
import {
  loadLaunchBlueprintWorkflowContext,
  type LaunchBlueprintWorkflowParams
} from './blueprintFulfillment';
import {
  completeLaunchBlueprintOrderV21,
  failLaunchBlueprintOrderV21,
  markLaunchBlueprintGeneratingV21,
  markLaunchBlueprintResearchBlockedV21,
  markLaunchBlueprintUncertaintyV21
} from './blueprintFulfillmentV21';
import {
  finalizeCustomerAccessResearch,
  planCustomerAccessResearch,
  runResearchBatch,
  type ResearchBatchResult
} from './customerAccessResearch';
import { researchCompetitorReviews } from './competitorReviewIntelligence';
import { createGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';
import {
  applyVertexPipelineDraft,
  createLaunchBlueprintVertexContext,
  finalizeLaunchBlueprintVertexPipeline,
  markVertexPipelineSkipped,
  runVertexAssetGenerationStage,
  runVertexCustomerCopyEditStage,
  runVertexEvidenceNormalizationStage,
  runVertexRedTeamReviewStage,
  runVertexStrategicCoherenceAssessmentStage,
  runVertexStrategySynthesisStage
} from './launchBlueprintVertexPipeline';
import { assertVertexDailyAssetCompleteness } from './launchBlueprintVertexAssetGuard';
import {
  assertVertexEvidenceClassification,
  synchronizeVertexBlueprintSurfaces
} from './launchBlueprintVertexGuards';
import { vertexBlueprintRequired } from './vertexStructuredGeneration';
import { researchEnvForPaidBlueprint } from './paidBlueprintResearch';
import type { VertexStrategicCoherenceGate } from './launchBlueprintVertexPipeline';
import { isResearchOutcomeError } from './researchOutcome';

function batchSize(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(6, Math.max(2, Math.floor(parsed))) : 3;
}

export function customerAccessResearchUncertaintyGate(
  context: Awaited<ReturnType<typeof loadLaunchBlueprintWorkflowContext>>,
  reason: string
): VertexStrategicCoherenceGate {
  const { order, verdict } = context;
  const supported = [
    ['customer', order.intake.targetBuyer, 'Founder supplied a narrow target customer for the Sprint.'],
    ['problem', order.intake.problem || verdict.idea.painfulProblem, 'Founder supplied the problem to test.'],
    ['buyer_payer', order.intake.targetBuyer, 'The current intake identifies the intended first buyer/payer; this remains a hypothesis until customer evidence confirms it.'],
    ['current_alternative', order.intake.currentWorkaround || verdict.idea.currentAlternative, 'Founder supplied the current workaround.'],
    ['test', order.intake.offerHypothesis || verdict.deterministicScores.recommendedNextTest, 'The current intake/verdict supplies a bounded first test.'],
    ['commitment', order.intake.expectedPrice ? `A paid test at ${order.intake.expectedPrice}` : 'A concrete observable commitment', 'The Sprint has a defined commitment hypothesis.'],
    ['fulfillment', order.intake.offerHypothesis || 'Manual founder-delivered pilot', 'The first test is intended to be manually fulfillable before software is built.']
  ] as const;

  return {
    passed: false,
    chainSummary: 'GhostTown could not verify a direct path to at least three current prospective buyers. The 30-Day Sprint is paused until customer access is resolved.',
    links: [
      ...supported.map(([link, value, linkReason]) => ({
        link,
        value: value || 'Founder hypothesis',
        status: 'testable_hypothesis' as const,
        reason: linkReason,
        evidenceIds: [],
        channelIds: []
      })),
      {
        link: 'access_path',
        value: 'No release-safe direct customer-access path verified',
        status: 'unresolved',
        reason,
        evidenceIds: [],
        channelIds: []
      }
    ],
    blockers: [{
      code: 'ACCESS_PATH_NOT_VERIFIED',
      link: 'access_path',
      message: 'GhostTown could not verify at least three current places where you can directly reach the intended buyer or payer.',
      requiredEvidence: 'Name or verify at least three current communities, discussion threads, groups, customer lists, events, or other direct routes where the intended buyer/payer can actually be reached.'
    }]
  };
}

export function isCustomerAccessResearchUncertainty(error: unknown): boolean {
  return isResearchOutcomeError(error, 'INSUFFICIENT_EVIDENCE');
}

export class LaunchBlueprintWorkflow extends WorkflowEntrypoint<Env, LaunchBlueprintWorkflowParams> {
  async run(event: WorkflowEvent<LaunchBlueprintWorkflowParams>, step: WorkflowStep): Promise<{ orderId: string; status: string }> {
    const { orderId } = event.payload;
    try {
      const context = await step.do('load paid order, verdict, and confirmed seeds', async () =>
        loadLaunchBlueprintWorkflowContext(this.env, orderId)
      );

      const researchEnv = researchEnvForPaidBlueprint(this.env, context.order);

      const competitorReviewIntelligence = await step.do(
        'research product-specific competitor reviews',
        { retries: { limit: 2, delay: '15 seconds', backoff: 'linear' } },
        async () => researchCompetitorReviews(researchEnv, context.order, context.verdict)
      );

      const plan = await step.do('plan competitor media distribution footprint', async () =>
        planCustomerAccessResearch(
          context.order,
          context.verdict,
          competitorReviewIntelligence.customerLanguagePhrases
        )
      );
      const completedBatches: ResearchBatchResult[] = [];
      const size = batchSize(this.env.DISTRIBUTION_FOOTPRINT_BATCH_SIZE);
      for (let index = 0; index < plan.sourceIds.length; index += size) {
        const sourceIds = plan.sourceIds.slice(index, index + size);
        const batch = await step.do(
          `research distribution batch ${Math.floor(index / size) + 1}`,
          { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' } },
          async () => runResearchBatch(researchEnv, context.order, plan, sourceIds)
        );
        completedBatches.push(batch);
      }

      let result;
      try {
        result = await step.do(
          'verify and structure media distribution network',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'linear' } },
          async () => finalizeCustomerAccessResearch(researchEnv, context.order, context.verdict, plan, completedBatches, competitorReviewIntelligence)
        );
      } catch (error) {
        if (isResearchOutcomeError(error, 'PROVIDER_BLOCKED')) {
          const order = await step.do('persist research-blocked provider receipt', async () =>
            markLaunchBlueprintResearchBlockedV21(this.env, orderId, error)
          );
          return { orderId, status: order.status };
        }
        if (!isResearchOutcomeError(error, 'INSUFFICIENT_EVIDENCE')) throw error;
        const gate = customerAccessResearchUncertaintyGate(context, error.customerSafeMessage);
        const order = await step.do('persist 3-day customer-access uncertainty Sprint', async () =>
          markLaunchBlueprintUncertaintyV21(this.env, orderId, gate)
        );
        return { orderId, status: order.status };
      }

      await step.do('mark canonical blueprint v2.1 generating', async () =>
        markLaunchBlueprintGeneratingV21(this.env, orderId)
      );

      const draft = await step.do('build deterministic canonical blueprint v2.1 draft', async () =>
        createGhostTownLaunchBlueprintV21(
          context.order,
          context.verdict,
          result.research,
          context.order.paidAt
        )
      );

      const vertexRequired = vertexBlueprintRequired(this.env);
      let blueprint = draft;

      if (vertexRequired) {
        const vertexContext = createLaunchBlueprintVertexContext(
          context.order,
          context.verdict,
          result,
          draft
        );

        const evidence = await step.do(
          'vertex stage 1 evidence normalization',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexEvidenceNormalizationStage(this.env, vertexContext)
        );

        await step.do('validate vertex evidence truth labels', async () =>
          assertVertexEvidenceClassification(vertexContext, evidence.data)
        );

        const strategy = await step.do(
          'vertex stage 2 strategy synthesis',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexStrategySynthesisStage(this.env, vertexContext, evidence.data)
        );

        const coherence = await step.do(
          'vertex strategic coherence gate',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexStrategicCoherenceAssessmentStage(this.env, vertexContext, evidence.data, strategy.data)
        );

        if (!coherence.data.passed) {
          const order = await step.do('persist 3-day strategic uncertainty Sprint', async () =>
            markLaunchBlueprintUncertaintyV21(this.env, orderId, coherence.data)
          );
          return { orderId, status: order.status };
        }

        const assets = await step.do(
          'vertex stage 3 asset generation',
          { retries: { limit: 2, delay: '20 seconds', backoff: 'exponential' } },
          async () => {
            const generated = await runVertexAssetGenerationStage(this.env, vertexContext, strategy.data);
            assertVertexDailyAssetCompleteness(generated.data);
            return generated;
          }
        );

        const copyEdit = await step.do(
          'vertex stage 4 customer copy edit',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexCustomerCopyEditStage(this.env, vertexContext, strategy.data, assets.data)
        );

        const candidate = synchronizeVertexBlueprintSurfaces(
          applyVertexPipelineDraft(
            vertexContext,
            evidence.data,
            strategy.data,
            copyEdit.data
          )
        );

        const redTeam = await step.do(
          'vertex stage 5 independent red-team review',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexRedTeamReviewStage(this.env, vertexContext, candidate)
        );

        blueprint = await step.do('stage 6 validate canonical blueprint schema and receipts', async () =>
          synchronizeVertexBlueprintSurfaces(
            finalizeLaunchBlueprintVertexPipeline(
              vertexContext,
              evidence,
              strategy,
              coherence,
              assets,
              copyEdit,
              redTeam
            )
          )
        );
      } else {
        blueprint = await step.do('record deterministic Vertex opt-out', async () =>
          markVertexPipelineSkipped(
            draft,
            'VERTEX_BLUEPRINT_REQUIRED=false; deterministic v2.1 generation was explicitly selected for this environment.'
          )
        );
      }

      const order = await step.do(
        'persist canonical blueprint v2.1 artifacts before ready',
        { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' } },
        async () => completeLaunchBlueprintOrderV21(this.env, orderId, result, {
          blueprint,
          vertexRequired
        })
      );
      return { orderId, status: order.status };
    } catch (error) {
      if (isResearchOutcomeError(error, 'PROVIDER_BLOCKED')) {
        const order = await markLaunchBlueprintResearchBlockedV21(this.env, orderId, error);
        return { orderId, status: order.status };
      }
      if (isResearchOutcomeError(error, 'INSUFFICIENT_EVIDENCE')) {
        const context = await loadLaunchBlueprintWorkflowContext(this.env, orderId);
        const gate = customerAccessResearchUncertaintyGate(context, error.customerSafeMessage);
        const order = await markLaunchBlueprintUncertaintyV21(this.env, orderId, gate);
        return { orderId, status: order.status };
      }
      await failLaunchBlueprintOrderV21(this.env, orderId, error);
      throw error;
    }
  }
}
