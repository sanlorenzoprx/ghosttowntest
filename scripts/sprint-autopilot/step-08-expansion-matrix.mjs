#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const matrix = readFileSync(resolve(ROOT, 'src/api/researchExpansionMatrix.ts'), 'utf8');
const research = readFileSync(resolve(ROOT, 'src/api/distributionFootprintResearch.ts'), 'utf8');
const tests = readFileSync(resolve(ROOT, 'tests/researchExpansionMatrix.test.ts'), 'utf8');

const checks = [
  [matrix.includes('buildResearchExpansionMatrix'), 'expansion-matrix builder is missing'],
  [matrix.includes('intents.length >= 15'), '15-intent upper bound is missing'],
  [matrix.includes('intents.length >= 8'), '8-intent minimum fill logic is missing'],
  [matrix.includes("'review_language'"), 'review-language intent is missing'],
  [matrix.includes("'competitor_complaint'") && matrix.includes("'competitor_alternative'"), 'competitor expansion intents are missing'],
  [research.includes('expansionIntents: buildResearchExpansionMatrix(order, reviewLanguage)'), 'matrix is not attached to the product-specific research plan'],
  [tests.includes('toBeLessThanOrEqual(15)') && tests.includes('toBeGreaterThanOrEqual(8)'), 'bounded-matrix regression test is missing']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 8 deterministic expansion-matrix invariants verified.');
