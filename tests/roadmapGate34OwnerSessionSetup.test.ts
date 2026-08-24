import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readText = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Gate 34 owner-session setup', () => {
  it('uses a local dev bridge to remote acceptance KV and never deploys infrastructure', async () => {
    const setup = await readText('scripts/roadmap-gate34-owner-session-setup.mjs');
    expect(setup).toContain("'remote = true'");
    expect(setup).toContain("'workers_dev = false'");
    expect(setup).toContain("WRANGLER_CLI, 'dev'");
    expect(setup).not.toContain("'deploy'");
    expect(setup).toContain('infrastructure_deployed: false');
    expect(setup).toContain('production_deployed: false');
  });

  it('temporarily changes only the owner auth hash and restores the exact user record before Gate 34', async () => {
    const setup = await readText('scripts/roadmap-gate34-owner-session-setup.mjs');
    expect(setup).toContain("url.pathname === '/snapshot'");
    expect(setup).toContain("url.pathname === '/apply'");
    expect(setup).toContain("url.pathname === '/restore'");
    expect(setup).toContain('originalUserRaw');
    expect(setup).toContain('restoredExactly');
    expect(setup).toContain('owner_user_record_restored_exactly: true');
    expect(setup).toContain('acceptance_auth_restored_before_gate34: true');
    expect(setup).toContain("order_mutations: 'none'");
    expect(setup).toContain("artifact_mutations: 'none'");
    expect(setup).toContain("progress_mutations: 'none'");
    expect(setup).toContain("launch_site_mutations: 'none'");
    expect(setup).toContain('stripe_mutated: false');
  });

  it('does not record owner email, password, password hash or JWT', async () => {
    const setup = await readText('scripts/roadmap-gate34-owner-session-setup.mjs');
    expect(setup).toContain('owner_identity_sha256');
    expect(setup).toContain('password_value_recorded: false');
    expect(setup).toContain('password_hash_recorded: false');
    expect(setup).toContain('token_value_recorded: false');
    expect(setup).toContain('email_value_recorded: false');
    expect(setup).toContain('secret_values_recorded: false');
  });

  it('verifies the JWT after rollback and keeps Gate 36 hard-stopped', async () => {
    const setup = await readText('scripts/roadmap-gate34-owner-session-setup.mjs');
    expect(setup).toContain('/api/auth/login');
    expect(setup).toContain('/api/auth/verify');
    expect(setup).toContain('post_restore_token_verify_status');
    expect(setup).toContain("['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status)");
    expect(setup).toContain('gate_36_touched: false');
  });
});
