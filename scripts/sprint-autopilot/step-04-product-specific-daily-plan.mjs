#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const source = readFileSync(resolve(ROOT, 'src/api/launchBlueprintDailyExecution.ts'), 'utf8');

const checks = [
  [source.includes('const substantiveTitle = legacy.title?.trim() || titles[index]'), 'daily title is not preserved from the generated strategy'],
  [source.includes('const substantiveObjective = legacy.primaryObjective?.trim() || objectives[index]'), 'daily objective is not preserved from the generated strategy'],
  [source.includes('const substantiveActions = legacy.requiredActions'), 'generated daily actions are not preserved'],
  [source.includes('const substantiveSuccess = legacy.successMeasurement?.trim() || thresholds[index]'), 'generated success measurement is not preserved'],
  [source.includes("channel.evidenceRole === 'customer_access'"), 'outreach is not restricted to Customer Access'],
  [source.includes("channel.currentActivityStatus === 'verified_current'"), 'outreach is not restricted to verified-current channels'],
  [source.includes("kind: 'verified_channel'"), 'daily packets do not carry verified channel targets'],
  [source.includes('Offer Evidence Consistency Checklist'), 'Day 12 has not been converted to evidence work'],
  [!source.includes('# Launch Site Activation Checklist'), '$97 Sprint still contains Launch Site activation work'],
  [source.includes('what did you use instead?'), 'discovery copy is still B2B-only']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 4 daily-plan preservation invariants verified.');
