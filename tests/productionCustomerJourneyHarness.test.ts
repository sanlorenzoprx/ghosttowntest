import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/production-customer-journey.yml', import.meta.url), 'utf8');
const runner = readFileSync(new URL('../production-customer-journey/run.mjs', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../production-customer-journey/README.md', import.meta.url), 'utf8');

describe('autonomous production customer journey harness', () => {
  it('is manual-only, exact-version guarded, and isolated behind its own environment', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\n\s+push:/);
    expect(workflow).not.toMatch(/\n\s+pull_request:/);
    expect(workflow).toContain('name: production-customer-journey');
    expect(workflow).toContain('expected_main_sha');
    expect(workflow).toContain('expected_worker_version');
    expect(workflow).toContain('RUN PRODUCTION CUSTOMER JOURNEY');
    expect(workflow).toContain('refs/heads/main');
  });

  it('hard-codes production identity checks and blocks dangerous mutations', () => {
    expect(runner).toContain("new URL(BASE_URL).hostname !== 'ghosttowntest.com'");
    expect(runner).toContain("new URL(API_URL).hostname !== 'api.ghosttowntest.com'");
    expect(runner).toContain("body?.version_id !== EXPECTED_WORKER_VERSION");
    expect(runner).toContain("p === '/api/paid-test/checkout'");
    expect(runner).toContain("p === '/api/get-me-live/checkout'");
    expect(runner).toContain("p.includes('/cloudflare/connect')");
    expect(runner).toContain("realPurchasesCompleted: false");
    expect(runner).toContain("providerMutationsAllowed: false");
    expect(runner).toContain("sprintProgressWritesAllowed: false");
  });

  it('keeps full production continuity on pre-provisioned canary state instead of real payment automation', () => {
    expect(runner).toContain('PCJ_CANARY_EMAIL');
    expect(runner).toContain('PCJ_SPRINT_ORDER_ID');
    expect(runner).toContain('PCJ_GML_ORDER_ID');
    expect(runner).toContain('PCJ_LIVE_URL');
    expect(runner).toContain("item?.status === 'ready'");
    expect(runner).toContain("gmlCandidate?.status !== 'live'");
    expect(runner).toContain('eligiblePairs.length !== 1');
    expect(runner).toContain("30-day execution calendar");
    expect(runner).toContain("Launch checklist");
    expect(readme).toContain('pre-provisioned canary paid state');
    expect(readme).toContain('Real money is never spent by this harness');
  });

  it('covers the production surface in English, Spanish, mobile, free verdict, auth boundary, Sprint and Get Me Live', () => {
    for (const marker of [
      'landing-english',
      'landing-spanish',
      'mobile-landing',
      'anonymous-free-verdict',
      'negative-auth-boundary',
      'ready-sprint-readonly',
      'get-me-live-owner-workspace',
      'published-canary-page',
    ]) {
      expect(runner).toContain(marker);
    }
  });

  it('parses as valid Node syntax', () => {
    execFileSync(process.execPath, ['--check', new URL('../production-customer-journey/run.mjs', import.meta.url).pathname], {
      stdio: 'pipe',
    });
  });
});
