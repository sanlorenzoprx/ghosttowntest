#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const OUT = resolve(ROOT, 'github-acceptance/sprint-autopilot/step-00-baseline.json');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || '')
  };
}
function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}
function git(args) {
  const r = run('git', args);
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'git failed').trim());
  return r.stdout.trim();
}

const headSha = git(['rev-parse', 'HEAD']);
let mainSha;
try {
  mainSha = git(['rev-parse', 'origin/main']);
} catch {
  const fetched = run('git', ['fetch', 'origin', 'main', '--depth=1']);
  if (fetched.status !== 0) throw new Error((fetched.stderr || fetched.stdout || 'failed to fetch main').trim());
  mainSha = git(['rev-parse', 'FETCH_HEAD']);
}

const typeCheck = run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
const focused = run(process.execPath, [
  'node_modules/vitest/vitest.mjs',
  'run',
  'tests/generativeAIService.test.ts',
  'tests/customerAccessResearch.test.ts',
  'tests/customerAccessUncertaintyRouting.test.ts',
  'tests/competitorReviewIntelligence.test.ts',
  '--no-file-parallelism'
]);

const receipt = {
  schemaVersion: 'ghosttown-sprint-baseline-v1',
  recordedAt: new Date().toISOString(),
  headSha,
  mainSha,
  branch: process.env.GITHUB_REF_NAME || null,
  typeCheck: {
    exitCode: typeCheck.status,
    stdoutSha256: sha256(typeCheck.stdout),
    stderrSha256: sha256(typeCheck.stderr)
  },
  focusedTests: {
    exitCode: focused.status,
    stdoutSha256: sha256(focused.stdout),
    stderrSha256: sha256(focused.stderr)
  },
  lastKnownFreshSprintBlocker: {
    kind: 'provider_capacity_research_depth',
    detail: 'Latest inspected Fresh Sprint attempt retained 4 verified candidates where 10 are required; YouTube quota was exhausted and one Vertex grounded-research call returned HTTP 429.'
  },
  productionMutated: false,
  secretValuesRecorded: false
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(receipt, null, 2));
