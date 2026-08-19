import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function source() {
  return readFile(new URL('../scripts/roadmap-gate30-acceptance-password-reset.mjs', import.meta.url), 'utf8');
}

describe('Gate 30 acceptance password reset helper', () => {
  it('is acceptance-only and mutates only the paid owner auth KV record', async () => {
    const text = await source();
    expect(text).toContain("const NEW_PASSWORD_ENV = 'ROADMAP_GATE_30_NEW_PASSWORD'");
    expect(text).toContain("env.KV.put('user_' + ownerEmail");
    expect(text).toContain("acceptance_auth_kv_mutated: true");
    expect(text).toContain("password_value_recorded: false");
    expect(text).toContain("password_hash_recorded: false");
    expect(text).toContain("gate20_owner_verified: true");

    expect(text).not.toContain('api.stripe.com');
    expect(text).not.toContain('/paid-test/checkout');
    expect(text).not.toContain('/blueprint/retry');
    expect(text).not.toContain('/publish');
    expect(text).not.toContain('/unpublish');
    expect(text).not.toContain('/rematerialize');
    expect(text).not.toContain("'deploy'");
    expect(text).not.toContain('--env production');
  });
});
