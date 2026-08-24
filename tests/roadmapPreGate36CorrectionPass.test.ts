import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readText = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('pre-Gate-36 correction pass runner', () => {
  it('creates the literal second acceptance account without exposing its credentials and does not require a manual owner JWT', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    const secondAccount = await readText('scripts/roadmap-gate31-second-account-setup.mjs');
    const ownerSetup = await readText('scripts/roadmap-gate34-owner-session-setup.mjs');
    expect(runner).toContain('roadmap-gate31-second-account-setup.mjs');
    expect(runner).toContain('prepareAcceptanceOwnerSession');
    expect(runner).not.toContain('ownerCredentialGuard');
    expect(runner).not.toContain('INPUT_REQUIRED: set ROADMAP_GATE_34_OWNER_TOKEN');
    expect(secondAccount).toContain('/api/auth/signup');
    expect(secondAccount).toContain('acceptance_auth_account_created: true');
    expect(secondAccount).toContain('password_value_recorded: false');
    expect(secondAccount).toContain('token_value_recorded: false');
    expect(ownerSetup).toContain('acceptance_auth_restored_before_gate34: true');
    expect(ownerSetup).toContain('owner_user_record_restored_exactly: true');
    expect(ownerSetup).toContain('token_value_recorded: false');
  });

  it('requires Gates 1-35 PASS and refuses an authorized/executed Gate 36', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain('for (let id = 1; id <= 35; id += 1)');
    expect(runner).toContain("['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status)");
    expect(runner).toContain('production_release_authorized === true');
    expect(runner).toContain('HARD STOP');
  });

  it('requires local, origin and draft/open/unmerged PR #7 heads to match', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain("git', ['ls-remote', 'origin'");
    expect(runner).toContain("'gh', ['pr', 'view'");
    expect(runner).toContain('localHead !== originHead');
    expect(runner).toContain('localHead !== pr.headRefOid');
    expect(runner).toContain("pr.isDraft !== true");
    expect(runner).toContain("pr.state !== 'OPEN'");
    expect(runner).toContain('pr.mergedAt != null');
  });

  it('runs only additive correction evidence and final refresh, never Autopilot or reset', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain('roadmap-gate31-second-account-setup.mjs');
    expect(runner).toContain('roadmap-gate34-owner-session-setup.mjs');
    expect(runner).toContain("roadmap-gate34-visual-certification.mjs', '--correction'");
    expect(runner).toContain('roadmap-gate34-canonical-visual-matrix.mjs');
    expect(runner).toContain("roadmap-gate35-authoritative-receipt.mjs', '--final-refresh'");
    expect(runner).toContain("npm', ['run', 'roadmap:status'");
    expect(runner).not.toContain('roadmap:autopilot');
    expect(runner).not.toContain('roadmap:reset');
  });

  it('gives the serialized Gate 34 visual matrix enough parent-process runtime', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain("roadmap-gate34-canonical-visual-matrix.mjs'], { timeout: 600000 }");
  });

  it('is idempotent for completed corrected evidence', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain('receiptPasses');
    expect(runner).toContain('no additional second acceptance account will be created');
    expect(runner).toContain('existing read-only evidence will be reused');
  });

  it('performs validation without production deployment, merge, push, or purchase commands', async () => {
    const runner = await readText('scripts/roadmap-pre-gate36-correction-pass.mjs');
    expect(runner).toContain("npm', ['run', 'verify:blueprint'");
    expect(runner).toContain("npm', ['run', 'type-check'");
    expect(runner).toContain("npm', ['run', 'build'");
    expect(runner).toContain("npm', ['run', 'worker:check:acceptance'");
    expect(runner).toContain("git', ['diff', '--check'");
    expect(runner).not.toContain("git', ['push'");
    expect(runner).not.toContain('merge_pull_request');
    expect(runner).not.toContain('wrangler deploy --env production');
    expect(runner).not.toContain('/paid-test/checkout');
    expect(runner).toContain('second_purchase_created: false');
    expect(runner).toContain('production_deployed: false');
    expect(runner).toContain('merge_performed: false');
  });

  it('is exposed through one explicit npm command', async () => {
    const pkg = JSON.parse(await readText('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['roadmap:pre-gate36-corrections']).toBe('node scripts/roadmap-pre-gate36-correction-pass.mjs');
  });
});
