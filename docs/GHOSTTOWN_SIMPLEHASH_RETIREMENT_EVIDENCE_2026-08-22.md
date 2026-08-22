# GhostTown simpleHash Retirement Evidence — 2026-08-22

## Decision

Retire the legacy `simpleHash` password-verification compatibility path.

This decision is based on a read-only census of the configured production Workers KV account namespace, not on test fixtures or assumptions.

## Production census evidence

Audit command:

`npm run audit:simplehash-retirement`

Audit schema: `simplehash-retirement-audit-v1`

Audited repository head:

`57852b747f09c5ff282904ec3d6082801a7c0165`

Audit time:

`2026-08-22T18:19:31.864Z`

Production KV namespace identifier SHA-256:

`85d883d8a0634b0508ed7176092b9eb46b5b32950ac476d8c4c1ddb500177c62`

Aggregate account census:

| Measure | Count |
| --- | ---: |
| Account records | 2 |
| PBKDF2 password hashes | 2 |
| Legacy `simpleHash` password hashes | 0 |
| Unsupported password hashes | 0 |
| Missing password hashes | 0 |
| Account key/identity mismatches | 0 |
| Legacy migration markers | 0 |
| Non-account records sharing the `user_` prefix | 4 |

Audit decision:

`ELIGIBLE_FOR_SIMPLEHASH_REMOVAL`

The four non-account `user_`-prefix records were explicitly classified separately by the audit and are not account/hash anomalies. The zero migration-marker count does not prove that no account was ever migrated; it only states that neither current production account record contains that optional marker. The retirement decision depends on the current password-hash state: both account records use PBKDF2 and zero use `simpleHash`.

## Privacy and mutation boundary

The census was read-only and recorded aggregate counts only. It did not record emails, raw account records, password hashes, credentials, or tokens. It did not deploy a Worker and did not call `KV.put` or `KV.delete`.

## Retirement behavior

After retirement:

- signup continues to create PBKDF2 password hashes;
- login accepts only the supported PBKDF2 record format;
- a lower-case base-36 value that would previously have been interpreted as a historical `simpleHash` is rejected with the normal invalid-password response;
- login no longer rewrites a legacy hash or increments `authVersion` as part of password migration;
- explicit session revocation through `authVersion` remains unchanged;
- the optional `legacyPasswordMigratedAt` field remains stripped from public user output for compatibility with any historical non-production or acceptance record that may still contain it.

## Release boundary

This evidence authorizes removal of the legacy verifier only. It does not authorize production deployment, merge PR #7, Gate 36, or any other release action.
