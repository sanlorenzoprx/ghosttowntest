import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const readText = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Gate 35 authoritative acceptance receipt v2', () => {
  it('supports separate hook and post-PASS final-refresh modes', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain("FINAL_REFRESH = process.argv.includes('--final-refresh')");
    expect(adapter).toContain("requiredThrough = FINAL_REFRESH ? 35 : 34");
    expect(adapter).toContain("use --final-refresh for the post-PASS authoritative snapshot");
    expect(adapter).toContain("FINAL_RECEIPT_PATH = join(STATE_DIR, 'gate35-ghosttown-final-acceptance-receipt.json')");
    expect(adapter).toContain("mode: FINAL_REFRESH ? 'FINAL_REFRESH' : 'GATE_HOOK'");
  });

  it('requires an exact 35/35 PASS final snapshot and corrected Gate 31/34 evidence', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain('Gate 35 final refresh requires an exact 35/35 PASS snapshot');
    expect(adapter).toContain('exact_35_of_35_pass');
    expect(adapter).toContain('gate31-cross-account-security-receipt-v2.json');
    expect(adapter).toContain('gate34-visual-certification-receipt-v2.json');
    expect(adapter).toContain('gate34-visual-evidence-matrix.json');
  });

  it('refuses final authority after Gate 36 is authorized or executed', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain("['PASS', 'AUTHORIZED', 'EXECUTED'].includes(gate36Status)");
    expect(adapter).toContain('production_release_authorized === true');
    expect(adapter).toContain('authorized: false');
    expect(adapter).toContain('executed: false');
  });

  it('requires local, origin and PR #7 heads to match while PR remains draft/open/unmerged', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain("git', ['ls-remote', 'origin'");
    expect(adapter).toContain("'gh', ['pr', 'view'");
    expect(adapter).toContain("pr?.isDraft === true");
    expect(adapter).toContain("pr?.state === 'OPEN'");
    expect(adapter).toContain('pr?.mergedAt == null');
    expect(adapter).toContain('local_origin_pr_heads_equal');
  });

  it('records secret names only and actively rejects secret values', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain('secret_names_only: names');
    expect(adapter).toContain('secret_values_recorded: false');
    expect(adapter).toContain('assertNoSecretValues(serialized, names)');
    expect(adapter).toContain('refuses to write a receipt containing the value of secret');
  });

  it('records no second purchase, no production deploy, no merge and Story Studio not run', async () => {
    const adapter = await readText('scripts/roadmap-gate35-authoritative-receipt.mjs');
    expect(adapter).toContain('second_purchase_occurred: false');
    expect(adapter).toContain('second_charge_occurred: false');
    expect(adapter).toContain('production_deployed: false');
    expect(adapter).toContain('merge_performed: false');
    expect(adapter).toContain('gates_37_47_run: false');
    expect(adapter).toContain('completed_count: 0');
  });
});
