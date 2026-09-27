#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const research = readFileSync(resolve(ROOT, 'src/api/customerAccessResearch.ts'), 'utf8');
const reviews = readFileSync(resolve(ROOT, 'src/api/competitorReviewIntelligence.ts'), 'utf8');

const checks = [
  [research.includes('CompetitorReviewIntelligence'), 'customerAccessResearch must import/use CompetitorReviewIntelligence'],
  [research.includes('competitorReviewIntelligence?: CompetitorReviewIntelligence'), 'wrapper must accept review intelligence'],
  [research.includes('competitorReviewIntelligence?.customerLanguagePhrases || []'), 'research wrapper must feed review language to planning'],
  [research.includes('competitorReviewIntelligence\n    );') || research.includes('competitorReviewIntelligence\r\n    );'), 'wrapper must pass review intelligence to finalization/recovery'],
  [reviews.includes('extractEvidenceDateFromHtml(html, finalUrl, title)'), 'review evidence date must use final URL and title'],
  [reviews.includes('evidenceRecencyFromDate(evidenceDate)'), 'review recency must be derived from evidence date'],
  [reviews.includes('evidenceDateSource: extractedDate.source'), 'review evidence-date source must be preserved']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 1 branch plumbing invariants verified.');
