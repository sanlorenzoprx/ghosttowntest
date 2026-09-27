#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const adaptive = readFileSync(resolve(ROOT, 'src/api/adaptiveResearch.ts'), 'utf8');
const workflow = readFileSync(resolve(ROOT, 'src/api/launchBlueprintWorkflow.ts'), 'utf8');
const outcome = readFileSync(resolve(ROOT, 'src/api/researchOutcome.ts'), 'utf8');
const tests = readFileSync(resolve(ROOT, 'tests/adaptiveResearch.test.ts'), 'utf8');

const checks = [
  [adaptive.includes('summarizeResearchGap'), 'research gap analysis is missing'],
  [adaptive.includes('missingVerifiedCandidates') && adaptive.includes('missingCurrentCustomerAccess') && adaptive.includes('missingProviderTypes'), 'gap dimensions are incomplete'],
  [adaptive.includes('buildAdaptiveExpansionPlan') && adaptive.includes('maxTasks = 8'), 'bounded adaptive expansion is missing'],
  [adaptive.includes("web:adaptive:"), 'adaptive research does not use the independent web-search path'],
  [workflow.includes("'research adaptive second pass'"), 'Workflow does not execute the adaptive second pass'],
  [workflow.includes('providerBreakers'), 'adaptive pass does not preserve provider breaker state'],
  [outcome.includes('successfulProviderTypes >= 2'), 'terminal insufficient-vs-blocked classification does not account for healthy alternate providers'],
  [tests.includes('canonical evidence gate') && tests.includes('skips adaptive research'), 'adaptive research completion regression is missing']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 9 adaptive second-pass research invariants verified.');
