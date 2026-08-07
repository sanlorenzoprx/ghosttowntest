# GhostTown Launch Blueprint v2 deployment

Launch Blueprint v2 is intentionally fail-closed. Do not enable paid v2 fulfillment until private storage, Cloudflare Workflows, all three distribution providers, Gemini structuring, Stripe test mode, and the complete purchase-to-dashboard acceptance test pass together.

## Product boundary

The paid customer product and the owner research console are separate systems.

### Paid customer product

The paid **Media & Distribution Network** uses:

1. A completed GhostTown verdict and paid Blueprint order.
2. A post-purchase intake where the customer confirms exactly two or three competitors, adjacent products, or current alternatives.
3. DataForSEO Backlinks API to identify referring pages and proven distribution footprints.
4. Podcast Index to identify relevant shows and hosts.
5. YouTube Data API to identify current creators and review coverage.
6. Direct verification of each original public source.
7. Gemini research selection to rank verified provider candidates without turning model references into evidence.
8. Vertex AI staged Blueprint generation using evidence normalization, strategy synthesis, asset generation, and an independent red-team review.
9. A strict release gate requiring 10-25 verified targets plus at least three independent verification dimensions of the business idea.

The delivered network prioritizes podcasts, YouTube creators, newsletters/publications, events, associations, review sites, and complementary partners. Generic communities are secondary.

### Owner-only Google console

`/internal-research` is a standalone live Google-grounded research console for allowlisted owner accounts. It:

- is not connected to Stripe, customer orders, Blueprint generation, PDFs, D1, R2, or the distribution engine;
- returns `Cache-Control: no-store`;
- does not crawl or automatically process Google-returned links;
- displays the grounded answer and Google Search Suggestions together;
- stores no application-side result after the browser session.

Do not add an export-to-Blueprint action to this console.

## Runtime architecture

- Existing Cloudflare Worker: checkout, Stripe webhook, seed intake, authenticated APIs, PDF rendering, and owner-only Google console.
- Cloudflare Workflow: durable distribution-provider calls, retries, verification, Gemini selection, Blueprint generation, PDF rendering, and persistence.
- D1: canonical Blueprint JSON, research receipt, and customer execution progress.
- Private R2: generated PDF and canonical JSON download objects.
- KV: existing orders, account index, Stripe receipts, retry locks, and lightweight Blueprint pointers.
- React/Vite SPA: post-purchase seed confirmation, status, Media Network dashboard, evidence capture, metrics, final decision, and downloads.

No separate application server is introduced.

## Required Cloudflare resources

Create a dedicated D1 database and private R2 bucket. Never reuse the public video bucket for paid customer artifacts.

```powershell
cd "C:\repos\ghosttowntest"

npx wrangler d1 create ghosttowntest-blueprints
npx wrangler r2 bucket create ghosttowntest-private-blueprints
```

Copy the returned D1 database ID into the `DB` binding in `wrangler.toml`. Enable the `BLUEPRINTS` R2 binding and the `LAUNCH_BLUEPRINT_WORKFLOW` binding. The Workflow `class_name` must remain `LaunchBlueprintWorkflow`, matching the class exported by `src/api/worker.ts`.

Apply the migration:

```powershell
npx wrangler d1 migrations apply ghosttowntest-blueprints `
  --env production `
  --remote
```

Cloudflare creates or updates the bound Workflow when the Worker is deployed:

```powershell
npx wrangler deploy --env production
```

Do not deploy until every production secret below is present.

## Required secrets and private configuration

Enter secret values only in the authenticated Wrangler prompt. Do not commit them or paste them into chat.

```powershell
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_EMAIL --env production
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY --env production
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID --env production
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put DATAFORSEO_LOGIN --env production
npx wrangler secret put DATAFORSEO_PASSWORD --env production
npx wrangler secret put PODCAST_INDEX_API_KEY --env production
npx wrangler secret put PODCAST_INDEX_API_SECRET --env production
npx wrangler secret put YOUTUBE_API_KEY --env production
npx wrangler secret put INTERNAL_RESEARCH_OWNER_EMAILS --env production
```

`INTERNAL_RESEARCH_OWNER_EMAILS` is a comma-separated allowlist. It protects only the standalone Google console and does not grant access to another customer’s paid order.

Only the service-account private key is inherently secret, but keep the service-account email and key ID in the Cloudflare secret store with it to reduce accidental exposure. Never record the private key, signed JWT assertion, or OAuth access token.

Keep these non-secret variables:

```toml
VERTEX_BLUEPRINT_REQUIRED = "true"
VERTEX_PROJECT_ID = "REPLACE_WITH_VERTEX_PROJECT_ID"
VERTEX_LOCATION = "us-central1"
VERTEX_BLUEPRINT_MODEL = "gemini-2.5-flash"
GEMINI_RESEARCH_MODEL = "gemini-2.5-flash"
GEMINI_GOOGLE_SEARCH_MODEL = "gemini-2.5-flash"
DISTRIBUTION_FOOTPRINT_BATCH_SIZE = "3"
DISTRIBUTION_FOOTPRINT_ENABLED = "false"
```

Enable the paid provider only in the test environment after D1, R2, Workflow, and all provider credentials are confirmed:

```toml
DISTRIBUTION_FOOTPRINT_ENABLED = "true"
```

## Stripe and seed-intake behavior

The existing paid checkout remains the purchase boundary.

After `checkout.session.completed`:

1. The webhook verifies Stripe signature, metadata, payment status, price mode, owner, and order.
2. The order becomes `awaiting_seeds`.
3. Stripe is acknowledged after the paid state is safely stored.
4. The success page generates verified suggestions and asks the customer to confirm exactly two or three seeds.
5. Research API charges do not begin until those seeds are confirmed.
6. Seed confirmation creates the durable Workflow instance and changes the order to `researching`.
7. The Workflow advances through `researching`, `generating`, and `ready`.

A customer who closes the browser can resume seed intake from the account dashboard.

## Paid research quality gate

A paid Blueprint must fail rather than deliver an incomplete network unless all of these conditions pass:

- exactly two or three distinct confirmed seed domains;
- at least six provider tasks attempted;
- required provider and original-source verification tasks executed;
- at least ten verified candidates before selection;
- at least three independent verification dimensions of the business idea;
- 10-25 final verified distribution targets;
- every target has a public HTTPS URL, source ID, research date, and confidence;
- every target includes audience fit, public access path, prepared asset, matching script, risk, and first action;
- unknown model-selected candidate references are discarded/recovered from provider-verified research and never treated as evidence by themselves;
- Gemini cannot introduce a delivered target, URL, metric, rule, or contact without independent verification.

Provider or storage failure leaves the order failed and retryable. It must never become ready with fabricated or incomplete research.

## Provider-specific acceptance

### DataForSEO

Confirm the live Backlinks endpoint accepts Basic authentication and returns referring pages for both board-game seed domains. Inspect whether referring pages are actual media, review, event, association, or partner targets—not merely low-quality backlinks.

### Podcast Index

Confirm the signed request headers work from Cloudflare and that returned shows have reachable public homepages. Dead feeds and unreachable homepages must be rejected.

### YouTube Data API

Confirm the project has enough `search.list` quota for the expected paid-order volume. The implementation searches current videos and normalizes unique public channel URLs. Do not permanently depend on frozen subscriber/view counts.

### Gemini research selection

Confirm the configured Gemini research model returns valid structured JSON. Unknown candidate references must be ignored and recovered only from provider-verified candidates; the order fails only when the canonical research outcomes cannot be satisfied.

### Vertex Blueprint generation

For acceptance and production, explicitly configure `VERTEX_BLUEPRINT_REQUIRED=true`, the intended project, location, and model, plus the service-account email/private key/key ID in Cloudflare secrets. Confirm OAuth succeeds, exactly four ordered stage receipts are produced, the red-team review passes with no blocking finding, and the generation evidence contains the normalized input SHA-256 and exact canonical Blueprint SHA-256. Never log or record the private key, signed JWT assertion, or OAuth access token.

## Full Stripe test-mode acceptance

Use the board-game subscription case that exposed the previous generic artifact failure.

1. Complete checkout with a Stripe test card.
2. Confirm the order appears as `awaiting_seeds` and no research Workflow exists yet.
3. Confirm GhostTown proposes real, reachable direct or adjacent seeds.
4. Select or replace suggestions and confirm exactly two or three domains, such as KiwiCo and BoardGameGeek plus one additional relevant seed.
5. Confirm a Workflow instance is created and the order changes to `researching`.
6. Confirm all three provider integrations are called and original public sources are verified.
7. Confirm the final network contains 10-25 verified targets and the research/intake evidence spans at least three independent verification dimensions of the idea.
8. Confirm the SPA groups podcasts, creators, publications, events, associations, review sites, and partners.
9. Confirm every target shows competitor evidence, audience owner, access path, prepared asset, matching script, risk, and first action.
10. Confirm the staged Vertex Blueprint pipeline produces exactly four ordered receipts, a passing red-team result, the configured project/location/model identity, normalized input SHA-256, and exact canonical Blueprint SHA-256.
11. Confirm the professional PDF contains the same proof and execution instructions.
12. Confirm offer, pricing, five finished assets, twelve scripts, landing copy, Launch Site configuration, milestones, and thirty days are populated.
13. Confirm progress, evidence notes, metrics, and final decision survive refresh and another authenticated device.
14. Confirm JSON and PDF are downloadable only by the purchasing account.
15. Force one provider failure and one storage failure; verify retries occur and an incomplete order never becomes ready.
16. Open `/internal-research` as an allowlisted owner and confirm the Google result is live, no-store, separate from the customer Blueprint, and inaccessible to a non-owner account.

## Production release gate

Keep PR #7 in draft until:

- CI passes strict TypeScript, tests, Worker dry-run, and production SPA build;
- provider credentials and private Cloudflare resource IDs are configured outside Git;
- the complete Stripe test-mode acceptance run is recorded;
- the acceptance receipt records Vertex project/location/model, service-account email identifier/key ID, four-stage receipt count, red-team result, normalized input SHA-256, and exact canonical Blueprint SHA-256 without recording any private key or token;
- the generated board-game Media & Distribution Network and PDF are manually inspected for real customer value;
- the production domain configuration is reconciled with the actually deployed GhostTown domains.

Only then mark the PR ready, merge, and deploy.
