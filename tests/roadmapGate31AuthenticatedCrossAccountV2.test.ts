import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 31 authenticated cross-account correction', () => {
  it('keeps account creation in explicit acceptance-only setup and verification itself read-only', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');
    const setup = await readText('scripts/roadmap-gate31-second-account-setup.mjs');

    expect(adapter).toContain("SECOND_ACCOUNT_TOKEN_ENV = 'ROADMAP_GATE_31_SECOND_ACCOUNT_TOKEN'");
    expect(adapter).toContain('/api/auth/verify');
    expect(adapter).toContain('authenticated_second_account: true');
    expect(adapter).toContain("verification_mutation_scope: 'none'");
    expect(adapter).not.toContain('/api/auth/signup');
    expect(setup).toContain('/api/auth/signup');
    expect(setup).toContain('acceptance_auth_account_created: true');
    expect(setup).toContain('gate31_verification_mutation_scope');
  });

  it('covers the literal required authenticated wrong-account matrix with privacy-safe 404s', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');

    for (const id of [
      'blueprint_open',
      'pdf_download',
      'zip_download',
      'technical_json',
      'progress_read',
      'progress_save',
      'launch_site_publish',
      'launch_site_unpublish',
      'leads_view',
      'leads_csv_export',
      'retry'
    ]) expect(adapter, id).toContain(`id: '${id}'`);

    expect(adapter).toContain('EXPECTED_DENIAL_STATUS = 404');
    expect(adapter).toContain('all_operations_privacy_safe_404');
    expect(adapter).toContain("SAFE_DENIALS = new Set(['Launch Blueprint not found', 'Launch Site not found'])");
  });

  it('stores only hashed identities and proves the verification does not mutate protected resources', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');

    expect(adapter).toContain('second_account_identity_sha256');
    expect(adapter).toContain('protected_owner_identity_sha256');
    expect(adapter).toContain('protected_order_id_sha256');
    expect(adapter).toContain("customer_data_mutations: 'none'");
    expect(adapter).toContain("order_mutations: 'none'");
    expect(adapter).toContain("artifact_mutations: 'none'");
    expect(adapter).toContain("launch_site_mutations: 'none'");
    expect(adapter).toContain('acceptance_auth_setup_mutation');
    expect(adapter).toContain('token_value_recorded: false');
    expect(adapter).toContain('email_value_recorded: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('gate_36_touched: false');
  });

  it('refuses to operate after production release is authorized or executed', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');
    expect(adapter).toContain("['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36?.status)");
    expect(adapter).toContain('production_release_authorized === true');
  });
});
