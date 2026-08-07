# GhostTown Launch Blueprint v2.1 — Step 5 Release Quality Gate Receipt

## Source authority

Step 5 is implemented from the canonical Phase Completion and Environment Acceptance Plan: **Strengthen the v2.1 release quality gate — Add explicit blockers for every required customer outcome.** No additional blocker category was substituted for the five source-defined groups.

Canonical Git blob SHA-1: `a6dd1fa9e8f59417b7ce00b032eabf3793537abd`.

## Implementation

- Central release-gate module: `src/api/blueprintReleaseQualityGateV21.ts`.
- Five source-defined blocker groups: strategy, research, asset, calendar, delivery.
- Every source bullet has a stable blocker code and fail-closed predicate.
- The real v2.1 paid fulfillment runs the gate before persistence and again after exact-byte persistence verification.
- The order cannot become `ready` until the post-persistence delivery gate passes.
- Research candidate selection now rejects any model-returned candidate ID outside the immutable candidate set.
- Required provider attempts are evaluated against the actual planned/seed-derived count rather than only a fixed minimum.
- Delivery verification re-reads D1 and PDF/JSON/ZIP from private R2, verifies exact hashes, checks owner identity, and proves repeated artifact retrieval before customer release.

## Explicit blocker coverage

Strategy: 9 blockers.
Research: 9 blockers.
Assets: 7 blockers.
Calendar: 7 blockers.
Delivery: 7 blockers.
Total: 39 explicit source-derived blockers.

## Tests

`tests/blueprintReleaseQualityGateV21.test.ts` contains a passing complete fixture plus a table-driven failure assertion for every one of the 39 blocker codes.

## Release boundary

This is a Gate A code-completion slice. It does not claim that the isolated Cloudflare/Stripe/Vertex acceptance environment has passed. PR #7 remains draft and production deployment remains disabled.
