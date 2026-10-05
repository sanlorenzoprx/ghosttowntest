import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/production-release.yml', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8');
const env = readFileSync(new URL('../src/api/env.ts', import.meta.url), 'utf8');

describe('production release gate', () => {
  it('is manual-only and protected by the production environment', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\n\s+push:/);
    expect(workflow).toContain('name: production');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('EXPECTED_MAIN_SHA');
    expect(workflow).toContain('CLOUDFLARE_PRODUCTION_RELEASE_TOKEN');
    expect(workflow).not.toContain('npx wrangler deploy --env production');
  });

  it('requires a clean migration ledger and supports the guarded current migration before Worker staging or promotion', () => {
    expect(workflow).toContain('Require clean migration ledger before staging or promotion');
    expect(workflow).toContain('migrate-0011');
    expect(workflow).toContain('APPLY 0011 TO PRODUCTION');
    expect(workflow).toContain('0011_execution_learning_coach.sql');
    expect(workflow).toContain('wrangler d1 migrations apply DB --env production --remote');
    expect(workflow).toContain('schema-verification-0011.json');
    expect(workflow).toContain('execution_coach_responses');
    expect(workflow).toContain('execution_learning_candidates');
    expect(workflow).toContain('execution_product_knowledge');
    expect(workflow).toContain('idx_execution_product_knowledge_retrieval');
  });

  it('stages an exact version at zero percent before promotion', () => {
    expect(workflow).toContain('wrangler versions upload --env production --strict --keep-vars');
    expect(workflow).toContain("const commitSha = annotations['workers/commit_sha']");
    expect(workflow).toContain("!commitSha || commitSha === process.env.EXPECTED_MAIN_SHA");
    expect(workflow).toContain("const message = annotations['workers/message']");
    expect(workflow).toContain("message === `release-candidate:${process.env.EXPECTED_MAIN_SHA}`");
    expect(workflow).toContain('${NEW_VERSION_ID}@0%');
    expect(workflow).toContain('${PREVIOUS_VERSION_ID}@100%');
    expect(workflow).toContain('Cloudflare-Workers-Version-Overrides');
    expect(workflow).toContain("h.version_id!==process.env.NEW_VERSION_ID");
    expect(workflow).toContain('${VERSION_ID}@100%');
  });

  it('keeps a deterministic rollback path', () => {
    expect(workflow).toContain('Post-promotion smoke failed; rolling back');
    expect(workflow).toContain('${PREVIOUS_VERSION_ID}@100%');
    expect(workflow).toContain('automatic-rollback:');
    expect(workflow).toContain('deployment-rollback.json');
    expect(workflow).toContain('Rollback did not restore the previous version to 100% traffic.');
    const rollbackStep = workflow.split('- name: Smoke production and rollback on failure')[1]
      ?.split('- name: Upload production release evidence')[0] || '';
    expect(rollbackStep).not.toContain("node <<'NODE'");
    expect(rollbackStep).toContain("node -e \"const fs=require('fs');");
  });

  it('exposes Cloudflare version metadata for exact smoke attribution', () => {
    expect(wrangler).toContain('[env.production.version_metadata]');
    expect(wrangler).toContain('binding = "CF_VERSION_METADATA"');
    expect(env).toContain('CF_VERSION_METADATA?:');
    expect(api).toContain('version_id: env.CF_VERSION_METADATA?.id || null');
  });
});
