import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function readText(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Gate 31 authenticated cross-account correction', () => {
  it('requires an existing authenticated second account and never creates one', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');

    expect(adapter).toContain("SECOND_ACCOUNT_TOKEN_ENV = 'ROADMAP_GATE_31_SECOND_ACCOUNT_TOKEN'");
    expect(adapter).toContain('/api/auth/verify');
    expect(adapter).toContain('authenticated_second_account: true');
    expect(adapter).toContain('account_created_for_probe: false');
    expect(adapter).not.toContain('/api/auth/signup');
    expect(adapter).toContain('EXISTING second acceptance account');
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

  it('stores only hashed identities and proves the correction is non-mutating', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');

    expect(adapter).toContain('second_account_identity_sha256');
    expect(adapter).toContain('protected_owner_identity_sha256');
    expect(adapter).toContain('protected_order_id_sha256');
    expect(adapter).toContain("customer_data_mutations: 'none'");
    expect(adapter).toContain("order_mutations: 'none'");
    expect(adapter).toContain("artifact_mutations: 'none'");
    expect(adapter).toContain("launch_site_mutations: 'none'");
    expect(adapter).toContain('token_value_recorded: false');
    expect(adapter).toContain('email_value_recorded: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('gate_36_touched: false');
  });

  it('refuses to operate after production release is authorized or PASS', async () => {
    const adapter = await readText('scripts/roadmap-gate31-cross-account-security-v2.mjs');
    expect(adapter).toContain("gate36?.status === 'PASS' || gate36?.status === 'AUTHORIZED'");
  });
});
