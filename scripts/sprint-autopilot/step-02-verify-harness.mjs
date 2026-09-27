#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const workflow = readFileSync(resolve(ROOT, '.github/workflows/fresh-sprint-acceptance.yml'), 'utf8');
const harness = readFileSync(resolve(ROOT, 'scripts/fresh-sprint-acceptance.mjs'), 'utf8');

const checks = [
  [!/^\s*push:\s*$/m.test(workflow), 'Fresh Sprint must not run against paid providers on ordinary pushes'],
  [workflow.includes('group: ghosttown-acceptance'), 'Fresh Sprint must share the canonical acceptance concurrency lock'],
  [workflow.includes('cancel-in-progress: false'), 'Acceptance runs must not be cancelled before restore'],
  [workflow.includes('environment: acceptance'), 'Fresh Sprint must use the acceptance environment'],
  [workflow.includes('fetch-depth: 0'), 'Fresh Sprint checkout must contain main history for exact restore'],
  [workflow.includes('- name: Type check'), 'Fresh Sprint must run type-check'],
  [harness.includes("MAIN_SHA = git(['rev-parse', 'origin/main'])"), 'Harness must capture exact main SHA'],
  [harness.includes("git(['checkout', '--detach', MAIN_SHA])"), 'Harness must checkout exact main SHA before restore deployment'],
  [harness.includes("restoredSha: MAIN_SHA"), 'Harness must write a restore receipt'],
  [harness.includes("git(['checkout', '--detach', ORIGINAL_HEAD])"), 'Harness must restore the original checkout after canonical deployment']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Step 2 acceptance-harness safety invariants verified.');
