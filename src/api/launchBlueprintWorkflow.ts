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
  markLaunchBlueprintGeneratingV21
} from './blueprintFulfillmentV21';
import {
  finalizeCustomerAccessResearch,
  planCustomerAccessResearch,
  runResearchBatch,
  type ResearchBatchResult
} from './customerAccessResearch';
import { createGhostTownLaunchBlueprintV21 } from './launchBlueprintGeneratorV21';
import {
  applyVertexPipelineDraft,
  createLaunchBlueprintVertexContext,
  finalizeLaunchBlueprintVertexPipeline,
  markVertexPipelineSkipped,
  runVertexAssetGenerationStage,
  runVertexEvidenceNormalizationStage,
  runVertexRedTeamReviewStage,
  runVertexStrategySynthesisStage
} from './launchBlueprintVertexPipeline';
import { assertVertexDailyAssetCompleteness } from './launchBlueprintVertexAssetGuard';
import {
  assertVertexEvidenceClassification,
  synchronizeVertexBlueprintSurfaces
} from './launchBlueprintVertexGuards';
import { vertexBlueprintRequired } from './vertexStructuredGeneration';
import { researchEnvForPaidBlueprint } from './paidBlueprintResearch';

function batchSize(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(6, Math.max(2, Math.floor(parsed))) : 3;
}

export class LaunchBlueprintWorkflow extends WorkflowEntrypoint<Env, LaunchBlueprintWorkflowParams> {
  async run(event: WorkflowEvent<LaunchBlueprintWorkflowParams>, step: WorkflowStep): Promise<{ orderId: string; status: string }> {
    const { orderId } = event.payload;
    try {
      const context = await step.do('load paid order, verdict, and confirmed seeds', async () =>
        loadLaunchBlueprintWorkflowContext(this.env, orderId)
      );

      const plan = await step.do('plan competitor media distribution footprint', async () =>
        planCustomerAccessResearch(context.order, context.verdict)
      );

      const researchEnv = researchEnvForPaidBlueprint(this.env, context.order);
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

      const result = await step.do(
        'verify and structure media distribution network',
        { retries: { limit: 2, delay: '15 seconds', backoff: 'linear' } },
        async () => finalizeCustomerAccessResearch(researchEnv, context.order, context.verdict, plan, completedBatches)
      );

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

        const assets = await step.do(
          'vertex stage 3 asset generation',
          { retries: { limit: 2, delay: '20 seconds', backoff: 'exponential' } },
          async () => {
            const generated = await runVertexAssetGenerationStage(this.env, vertexContext, strategy.data);
            assertVertexDailyAssetCompleteness(generated.data);
            return generated;
          }
        );

        const candidate = synchronizeVertexBlueprintSurfaces(
          applyVertexPipelineDraft(
            vertexContext,
            evidence.data,
            strategy.data,
            assets.data
          )
        );

        const redTeam = await step.do(
          'vertex stage 4 independent red-team review',
          { retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' } },
          async () => runVertexRedTeamReviewStage(this.env, vertexContext, candidate)
        );

        blueprint = await step.do('stage 5 validate canonical blueprint schema and receipts', async () =>
          synchronizeVertexBlueprintSurfaces(
            finalizeLaunchBlueprintVertexPipeline(
              vertexContext,
              evidence,
              strategy,
              assets,
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
      await failLaunchBlueprintOrderV21(this.env, orderId, error);
      throw error;
    }
  }
}
