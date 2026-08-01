# GhostTown Launch Blueprint Acceptance Receipt

Status: pending live acceptance run. PR #7 must remain draft until every pending item below is completed and reviewed.

## Repository

- Branch: `agent/environment-acceptance`
- Base branch: `origin/feat/launch-blueprint-spa`
- Base SHA: `85775b656da77d0f899b1f8e58d1e155f82216cb`
- Implementation SHA: see final Codex completion receipt; commit hashes cannot be self-recorded inside the same commit
- Acceptance receipts directory: `.acceptance-receipts/` (local only, not committed)

## Isolated Cloudflare Acceptance Resources

- Worker env: `acceptance`
- Worker exposure: `workers.dev`
- KV namespace: `ghosttown-acceptance`
- KV namespace ID: `849e13521d454361aea286b8e1a5e4c7`
- D1 database: `ghosttowntest-blueprints-acceptance`
- D1 database ID: `9863d883-3c31-4268-9a98-8392fa3b9f8f`
- R2 bucket: `ghosttowntest-private-blueprints-acceptance`
- Workflow binding/name: `LAUNCH_BLUEPRINT_WORKFLOW` / `ghosttown-launch-blueprint-acceptance`
- Workflow class: `LaunchBlueprintWorkflow`
- Production research flag: `DISTRIBUTION_FOOTPRINT_ENABLED = "false"`
- Acceptance research flag before provider smoke tests: `DISTRIBUTION_FOOTPRINT_ENABLED = "false"`

## Required Secret Names

Configure these privately through `wrangler secret put --env acceptance`. Record names only in receipts.

- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `STRIPE_PAID_TEST_PRICE_ID`
- `STRIPE_30_DAY_PLAN_PRICE_ID`
- `LIT_API_KEY`
- `GEMINI_API_KEY`
- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`
- `PODCAST_INDEX_API_KEY`
- `PODCAST_INDEX_API_SECRET`
- `YOUTUBE_API_KEY`
- `INTERNAL_RESEARCH_OWNER_EMAILS`

## Local And CI Validation

- `npm ci`: passed locally on August 1, 2026; npm reported 4 high-severity audit findings
- `npm run check`: passed locally on August 1, 2026
- `npm run worker:check:acceptance`: passed dry-run locally on August 1, 2026 with Workflow, acceptance KV, acceptance D1, private `BLUEPRINTS` R2, AI, and research disabled
- `git diff --check`: blocked only by the pre-existing Windows case-collision handoff doc whitespace at `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CURSOR_CODEX_IMPLEMENTATION_HANDOFF.md:5` and `:6`; staged/committed acceptance patch passed `git diff --cached --check` and `git show --check`
- CI run ID/conclusion: pending

## Migrations

- `0002_launch_blueprints.sql`: applied remotely to acceptance D1 on August 1, 2026
- `0003_launch_sites.sql`: applied remotely to acceptance D1 on August 1, 2026
- Required D1 tables: `launch_blueprints`, `launch_blueprint_progress`, `launch_sites`, `launch_site_leads`
- Migration receipts: `.acceptance-receipts/09-migrations-before.txt`, `10-migrations-apply.txt`, `11-migrations-after.txt`, `12-d1-tables.txt`

## Domain Decision

- Acceptance API URL: pending first acceptance deploy
- Acceptance frontend URL: pending Pages preview or dedicated acceptance project
- Production frontend/API decision: pending owner approval in `.acceptance-receipts/20-production-domain-decision.md`
- Rollback frontend/API pair: pending

## Stripe Test-Mode Receipt

- Stripe account/mode verified: pending
- Webhook endpoint: pending
- Webhook event ID: pending
- Checkout Session ID: pending
- Order ID: pending
- Duplicate webhook idempotency: pending
- Confirmation creates exactly one Workflow: pending
- Workflow instance ID: pending
- State transitions: pending

## Provider Smoke Tests

- DataForSEO authentication and candidate filtering: pending
- Podcast Index signatures, feeds, and homepage verification: pending
- YouTube key, channel normalization, and quota handling: pending
- Gemini supplied-ID-only selection and invented-ID rejection: pending
- Provider counts and category counts: pending

## D1 And Private R2 Verification

- Canonical Blueprint D1 record: pending
- Progress D1 record: pending
- Launch Site D1 record: pending
- Lead D1 record: pending
- PDF R2 object: `orders/<orderId>/ghosttown-launch-blueprint-v2.pdf` pending
- JSON R2 object: `orders/<orderId>/ghosttown-launch-blueprint-v2.json` pending
- ZIP R2 object: `orders/<orderId>/ghosttown-launch-blueprint-v2-assets.zip` pending
- Private R2 public-domain check: pending

## Artifact Inspection

- Blueprint ID/schema: pending
- PDF visual inspection: pending
- ZIP expected 16 files: pending
- `blueprint.json` inside ZIP matches canonical record: pending
- No secrets, raw provider payloads, prompts, or owner Google results: pending

## Launch Site And Leads

- Buyer preview: pending
- Public URL: pending
- Public signed-out render from canonical Blueprint: pending
- Consented test lead: pending
- Owner lead list: pending
- CSV export: pending
- Unpublish removes public access: pending
- Republish slug behavior: pending
- D1 lifecycle/lead confirmation: pending
- KV used only for rate limits/pointers/caches: pending

## Account Recovery And Denial Matrix

- Recover Blueprint after sign-out/sign-in: pending
- Recover on second authenticated device: pending
- Recover PDF/ZIP/technical JSON: pending
- Recover Launch Site state and leads: pending
- Deny second account Blueprint access: pending
- Deny second account PDF/ZIP/technical JSON download: pending
- Deny second account publish/unpublish: pending
- Deny second account lead list/export: pending
- Deny second account retry: pending

## Forced Failure And Retry

- Provider failure remains failed/retryable: pending
- Incomplete research cannot become ready: pending
- Provider restore/retry does not charge again: pending
- Storage failure blocks ready: pending
- Storage restore/retry does not duplicate order/workflow: pending

## Visual Inspection

- `375x667`: pending
- `390x844`: pending
- `768x1024`: pending
- `1366x768`: pending
- `1440x900`: pending

## Blockers

- Acceptance secrets are not configured in this repository and must be entered privately.
- Acceptance Worker has not been deployed yet, so `wrangler secret list --env acceptance` currently reports the Worker is not found.
- `FRONTEND_URL` must be updated after the acceptance frontend is deployed.
- Provider smoke tests must pass before enabling `DISTRIBUTION_FOOTPRINT_ENABLED = "true"` in acceptance.
- The complete Stripe test-mode journey and forced-failure retry run still require live operator execution.

## Owner Approval

- Approval to enable acceptance research: pending
- Approval of production domain pair: pending
- Approval to move PR #7 out of draft: pending
