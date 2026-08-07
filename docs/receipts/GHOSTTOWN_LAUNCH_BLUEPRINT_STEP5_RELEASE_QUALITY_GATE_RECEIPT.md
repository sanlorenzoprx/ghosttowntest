# GhostTown Launch Blueprint v2.1 — Step 5 Release Quality Gate Receipt

## Source authority

Step 5 follows the canonical Blueprint contract as amended by explicit product decision in v2.1.1.

Canonical version: `2.1.1`  
Canonical Git blob SHA-1: `616c691e6b4c9cea93615963a07375d13ffba57f`  
Change record: `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_1_CHANGE_RECORD.md`

## Implementation

- Central release-gate module: `src/api/blueprintReleaseQualityGateV21.ts`.
- Five blocker groups remain: strategy, research, asset, calendar, delivery.
- The real v2.1 paid fulfillment runs the gate before persistence and again after exact-byte persistence verification.
- The order cannot become `ready` until the post-persistence delivery gate passes.
- Required provider attempts are evaluated against the actual planned/seed-derived count rather than only a fixed minimum.
- Research quality is measured by independent idea-verification dimensions rather than provider-count or content-format quotas.
- Current verification dimensions include customer/problem definition, competitor/alternative evidence, customer access, audience reach, ecosystem/partner evidence, and verified prior market behavior; later commercial evidence can extend this model.
- At least three independent dimensions are required.
- Multiple provider types and multiple content/channel categories are diagnostic signals, not release blockers by themselves.
- An unknown model candidate reference is not evidence and is not a release blocker by itself. The unverified selection is discarded and the research layer recovers from provider-verified candidates; the real research minimums still fail closed if they cannot be satisfied.
- Delivery verification re-reads D1 and PDF/JSON/ZIP from private R2, verifies exact hashes, checks owner identity, and proves repeated artifact retrieval before customer release.

## Explicit Step 5 blocker coverage

- Strategy: 9 blockers.
- Research: 7 blockers.
- Assets: 7 blockers.
- Calendar: 7 blockers.
- Delivery: 7 blockers.
- Total: 37 explicit Step 5 blocker codes.

The research gate no longer contains `RESEARCH_UNKNOWN_CANDIDATE_ID`, `RESEARCH_FEWER_THAN_TWO_SUCCESSFUL_PROVIDER_TYPES`, or `RESEARCH_FEWER_THAN_THREE_TARGET_CATEGORIES`. Those constraints were replaced by `RESEARCH_INSUFFICIENT_VERIFICATION_DIMENSIONS` plus verified-candidate/source/metadata requirements.

## Tests

`tests/blueprintReleaseQualityGateV21.test.ts` contains a passing complete fixture, a table-driven failure assertion for every current Step 5 blocker code, and an explicit test proving that one content format can pass when the idea has at least three independent verification dimensions.

`tests/customerAccessResearch.test.ts` verifies that an unknown model candidate reference recovers through the provider-verified candidate pool instead of wasting an otherwise valid paid research run.

## Validation

GitHub Actions run `31164515531` passed:

- canonical Blueprint v2.1.1 source verification;
- TypeScript type-check;
- full Vitest suite;
- Cloudflare Worker dry-run;
- production Vite build.

The authoritative final branch head remains maintained in PR #7 so this receipt does not create a recursive head/receipt chain.

## Release boundary

This is a Gate A code-completion slice. It does not claim that the isolated Cloudflare/Stripe/Vertex acceptance environment has passed. PR #7 remains draft and production deployment remains disabled.
