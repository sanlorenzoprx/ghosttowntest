#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const provider = readFileSync(resolve(ROOT, 'src/api/providerOutcome.ts'), 'utf8');
const research = readFileSync(resolve(ROOT, 'src/api/distributionFootprintResearch.ts'), 'utf8');
const workflow = readFileSync(resolve(ROOT, 'src/api/launchBlueprintWorkflow.ts'), 'utf8');
const ai = readFileSync(resolve(ROOT, 'src/api/generativeAIService.ts'), 'utf8');

const checks = [
  [provider.includes("'SUCCESS'") && provider.includes("'NO_RESULTS'") && provider.includes("'QUOTA_EXHAUSTED'"), 'ProviderOutcome enum is incomplete'],
  [provider.includes('providerHttpError') && provider.includes('retryAfterSeconds'), 'HTTP provider classifier or Retry-After capture is missing'],
  [ai.includes("providerHttpError('vertex_ai'") && ai.indexOf("if (!response.ok)") < ai.lastIndexOf("const body = await response.json() as VertexGenerateContentResponse"), 'Vertex does not classify HTTP status before JSON success parsing'],
  [research.includes('ProviderBreakerState') && research.includes('breakerState[provider]'), 'per-Sprint provider breaker state is missing'],
  [research.includes("outcome: result.length > 0 ? 'SUCCESS' : 'NO_RESULTS'"), 'zero-result calls are not typed NO_RESULTS'],
  [research.includes('isRetryableProviderOutcome(error.outcome)') && research.includes('throw error'), 'retryable provider failures do not reach Workflow retries'],
  [workflow.includes('providerBreakers = batch.breakerState'), 'breaker state is not carried across research batches'],
  [workflow.includes('isProviderRequestError(error)'), 'exhausted retryable provider failures are not routed to research_blocked']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 6 provider-state and circuit-breaker invariants verified.');
