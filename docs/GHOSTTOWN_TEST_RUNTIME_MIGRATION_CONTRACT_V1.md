# GhostTown Test Runtime Migration Contract v1

Status: active migration contract

## Objective

Replace handwritten Cloudflare platform semantics as a source of release confidence with Cloudflare's supported local Workers runtime while preserving useful business and failure-injection tests.

## Known-outcome rule

Cloudflare owns the semantics of D1, KV, R2 and the Workers runtime. GhostTown tests those semantics through the platform-native local runtime rather than recreating them in handwritten JavaScript objects.

## Runtime layers

1. Pure/business tests remain ordinary Vitest tests.
2. D1/KV/R2 tests use `@cloudflare/vitest-pool-workers`.
3. D1 schema tests apply the repository's real `migrations/` files through `readD1Migrations()` and `applyD1Migrations()`.
4. Production Worker HTTP integration uses Wrangler `createTestHarness()`.
5. Browser evidence remains Playwright and executes sequentially.
6. Stripe, Vertex and research providers remain deterministic provider-contract boundaries in local tests.
7. Existing mock-heavy business/failure tests may be grandfathered, but no new Cloudflare platform emulators are permitted.

## Commercial stop rule

After the paid-path D1/R2/KV runtime, production Worker harness, security regressions and acceptance dry-run are green, stop infrastructure work. The next mission is external Stripe/customer acceptance and the first real $97 purchase.

## External acceptance boundary

This migration must not push, merge, deploy, charge a card, mutate production/acceptance storage, or invoke live paid providers.
