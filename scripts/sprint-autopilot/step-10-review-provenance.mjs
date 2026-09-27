#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const review = readFileSync(resolve(ROOT, 'src/api/competitorReviewIntelligence.ts'), 'utf8');
const tests = readFileSync(resolve(ROOT, 'tests/reviewProvenance.test.ts'), 'utf8');

const checks = [
  [review.includes('hasFirstPersonUserSignal'), 'first-person/user-content gate is missing'],
  [review.includes('isEligibleReviewSource'), 'review-source eligibility gate is missing'],
  [review.includes('competitorOwned') && review.includes('community|forum|discuss|discussion|support'), 'competitor-owned page restrictions are missing'],
  [review.includes('phraseSupportedByObservations'), 'model-returned language is not validated against observed source text'],
  [review.includes('sourceIds.length < 2'), 'single-observation patterns are not prevented from becoming repeated patterns'],
  [review.includes('Product implications are hypotheses to test, not facts.'), 'pattern-vs-hypothesis separation is missing'],
  [tests.includes('rejects competitor-owned marketing pages') && tests.includes('traceable to verified observation text'), 'review provenance tests are incomplete']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 10 competitor-review provenance invariants verified.');
