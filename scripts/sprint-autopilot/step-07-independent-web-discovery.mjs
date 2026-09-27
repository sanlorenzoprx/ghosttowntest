#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(process.cwd());
const brave = readFileSync(resolve(ROOT, 'src/api/braveSearchProvider.ts'), 'utf8');
const search = readFileSync(resolve(ROOT, 'src/api/searchProvider.ts'), 'utf8');
const research = readFileSync(resolve(ROOT, 'src/api/distributionFootprintResearch.ts'), 'utf8');
const paid = readFileSync(resolve(ROOT, 'src/api/paidBlueprintResearch.ts'), 'utf8');

const checks = [
  [search.includes('export interface SearchProvider'), 'SearchProvider interface is missing'],
  [brave.includes('https://api.search.brave.com/res/v1/web/search'), 'Brave Web Search endpoint is missing'],
  [brave.includes("'X-Subscription-Token'"), 'Brave API key is not sent through the provider header'],
  [brave.includes('BRAVE_MONTHLY_BUDGET_USD = 25'), '$25 Brave budget guard is missing'],
  [brave.includes('BRAVE_WARNING_FRACTION = 0.8'), '80% Brave budget warning is missing'],
  [research.includes("'brave_search'") && research.includes("taskId.startsWith('web:')"), 'Brave is not wired into the paid research task pool'],
  [research.includes('rankParseCoverageSufficient') && research.indexOf('rankParseCandidates(env, seed)') < research.indexOf('dataForSeoCandidates(env, seed)'), 'RankParse is not preferred before selective DataForSEO top-up'],
  [research.includes('MIN_RANKPARSE_VERIFIED_PAGES_BEFORE_DATAFORSEO = 4'), 'RankParse verified-page threshold is missing'],
  [research.includes('MIN_RANKPARSE_EVIDENCE_ROLES_BEFORE_DATAFORSEO = 2'), 'RankParse evidence-role threshold is missing'],
  [paid.includes('YOUTUBE_API_KEY_PAID') && paid.includes('researchEnv.YOUTUBE_API_KEY'), 'paid Sprint YouTube capacity is not isolated from free scans']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}

if (process.env.CI === 'true') {
  const result = spawnSync('npx', ['wrangler', 'secret', 'list', '--env', 'acceptance'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env
  });
  if ((result.status ?? 1) !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'wrangler secret list failed');
    process.exit(3);
  }
  const listed = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (!listed.includes('BRAVE_SEARCH_API_KEY')) {
    console.error('EXTERNAL_INPUT_REQUIRED: install BRAVE_SEARCH_API_KEY in the Cloudflare acceptance Worker.');
    process.exit(2);
  }
}

console.log('Step 7 independent web discovery and provider-budget invariants verified.');
