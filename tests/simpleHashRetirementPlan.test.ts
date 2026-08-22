import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const auditSource = readFileSync(new URL('../scripts/simplehash-retirement-audit.mjs', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/api/auth.ts', import.meta.url), 'utf8');

describe('simpleHash retirement evidence contract', () => {
  it('uses a read-only remote production-KV census and records counts only', () => {
    expect(auditSource).toContain("prefix: 'user_'");
    expect(auditSource).toContain("'remote = true'");
    expect(auditSource).toContain("readOnly: true");
    expect(auditSource).not.toContain('env.KV.put(');
    expect(auditSource).not.toContain('env.KV.delete(');
    expect(auditSource).toContain('Counts only. No emails, password hashes, raw account values, credentials, or tokens are recorded.');
  });

  it('blocks retirement when legacy or anomalous account hashes remain', () => {
    expect(auditSource).toContain("BLOCKED_LEGACY_ACCOUNTS_PRESENT");
    expect(auditSource).toContain("BLOCKED_ACCOUNT_HASH_ANOMALY");
    expect(auditSource).toContain("BLOCKED_NO_ACCOUNT_RECORDS_OBSERVED");
    expect(auditSource).toContain("ELIGIBLE_FOR_SIMPLEHASH_REMOVAL");
  });

  it('keeps the current one-way login migration until live state proves removal is safe', () => {
    expect(authSource).toContain('function legacySimpleHash(password: string): string');
    expect(authSource).toContain('if (passwordVerification.legacy)');
    expect(authSource).toContain('user.passwordHash = await hashPassword(password)');
    expect(authSource).toContain('user.legacyPasswordMigratedAt = new Date().toISOString()');
  });
});
