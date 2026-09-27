#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const outcome = readFileSync(resolve(ROOT, 'src/api/researchOutcome.ts'), 'utf8');
const workflow = readFileSync(resolve(ROOT, 'src/api/launchBlueprintWorkflow.ts'), 'utf8');
const fulfillment = readFileSync(resolve(ROOT, 'src/api/blueprintFulfillmentV21.ts'), 'utf8');
const paid = readFileSync(resolve(ROOT, 'src/types/paidTest.ts'), 'utf8');
const routingTest = readFileSync(resolve(ROOT, 'tests/researchOutcomeRouting.test.ts'), 'utf8');

const checks = [
  [outcome.includes("'COMPLETE' | 'INSUFFICIENT_EVIDENCE' | 'PROVIDER_BLOCKED'"), 'typed ResearchOutcome contract is missing'],
  [outcome.includes('attempts.some(attempt => !attempt.success)') && outcome.includes("'PROVIDER_BLOCKED'"), 'provider-incomplete shortfalls are not structurally classified'],
  [workflow.includes("isResearchOutcomeError(error, 'PROVIDER_BLOCKED')"), 'workflow does not route provider-blocked outcomes structurally'],
  [workflow.includes("isResearchOutcomeError(error, 'INSUFFICIENT_EVIDENCE')"), 'workflow does not route insufficient-evidence outcomes structurally'],
  [!workflow.includes('/(?:currently verified customer-access candidates'), 'legacy message-regex uncertainty routing remains'],
  [paid.includes("'research_blocked'"), 'paid order status does not include research_blocked'],
  [paid.includes('ghosttown-research-blocked-v1'), 'customer-safe research-blocked receipt is missing'],
  [fulfillment.includes('markLaunchBlueprintResearchBlockedV21'), 'research-blocked persistence function is missing'],
  [fulfillment.includes('research_blocked_diagnostic_'), 'private provider diagnostic receipt is missing'],
  [fulfillment.includes('customerSafeMessage'), 'customer-facing research-blocked message is not sanitized'],
  [routingTest.includes('PROVIDER_BLOCKED') && routingTest.includes('INSUFFICIENT_EVIDENCE'), 'typed routing regression test is incomplete']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 5 typed research-outcome invariants verified.');
