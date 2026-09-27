#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const source = readFileSync(resolve(ROOT, 'src/api/distributionFootprintResearch.ts'), 'utf8');

const checks = [
  [source.includes('export function searchTerms'), 'searchTerms() is missing'],
  [source.includes("match(/[a-z0-9][a-z0-9.+-]{1,}/g)"), 'search tokenizer does not preserve short content terms'],
  [source.includes("customer_access:buyer_problem"), 'buyer × problem task is missing'],
  [source.includes("customer_access:review_"), 'separate review-language tasks are missing'],
  [source.includes("_complaint"), 'competitor × complaint task is missing'],
  [source.includes("_alternatives"), 'competitor × alternatives task is missing'],
  [!source.includes("`${verdict.idea.ideaName} ${order.intake.targetBuyer} ${order.intake.problem}`"), 'ideaName is still injected into the core discovery topic'],
  [source.includes('search-intent anchor terms'), 'intent-specific verification anchor is missing']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 3 product-specific search invariants verified.');
