import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import type { WorkflowEvent } from 'cloudflare:workers';
import type { Env } from './env';
import {
  completeLaunchBlueprintOrder,
  failLaunchBlueprintOrder,
  loadLaunchBlueprintWorkflowContext,
  markLaunchBlueprintGenerating,
  type LaunchBlueprintWorkflowParams
} from './blueprintFulfillment';
import {
  finalizeCustomerAccessResearch,
  planCustomerAccessResearch,
  runResearchBatch,
  type ResearchBatchResult
} from './customerAccessResearch';

function batchSize(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(8, Math.max(4, Math.floor(parsed))) : 6;
}

function maximumSources(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(60, Math.max(30, Math.floor(parsed))) : 50;
}

export class LaunchBlueprintWorkflow extends WorkflowEntrypoint<Env, LaunchBlueprintWorkflowParams> {
  async run(event: WorkflowEvent<LaunchBlueprintWorkflowParams>, step: WorkflowStep): Promise<{ orderId: string; status: string }> {
    const { orderId } = event.payload;
    try {
      const context = await step.do('load paid order and verdict', async () =>
        loadLaunchBlueprintWorkflowContext(this.env, orderId)
      );

      const plan = await step.do('plan governed source federation', async () =>
        planCustomerAccessResearch(context.order, context.verdict, maximumSources(this.env.SOURCE_FEDERATION_MAX_SOURCES))
      );

      const completedBatches: ResearchBatchResult[] = [];
      const size = batchSize(this.env.SOURCE_FEDERATION_BATCH_SIZE);
      for (let index = 0; index < plan.sourceIds.length; index += size) {
        const sourceIds = plan.sourceIds.slice(index, index + size);
        const batch = await step.do(
          `research source batch ${Math.floor(index / size) + 1}`,
          { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' } },
          async () => runResearchBatch(this.env, context.order, plan, sourceIds)
        );
        completedBatches.push(batch);
      }

      const result = await step.do(
        'verify, select, and structure customer access pack',
        { retries: { limit: 2, delay: '15 seconds', backoff: 'linear' } },
        async () => finalizeCustomerAccessResearch(this.env, context.order, context.verdict, plan, completedBatches)
      );

      await step.do('mark blueprint generating', async () => markLaunchBlueprintGenerating(this.env, orderId));
      const order = await step.do(
        'generate PDF and persist canonical blueprint',
        { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' } },
        async () => completeLaunchBlueprintOrder(this.env, orderId, result)
      );
      return { orderId, status: order.status };
    } catch (error) {
      await failLaunchBlueprintOrder(this.env, orderId, error);
      throw error;
    }
  }
}
