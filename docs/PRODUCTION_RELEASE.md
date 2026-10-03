# GhostTown Production Release

Production release is intentionally separated from merges to `main`.

Cloudflare Workers Builds may upload a new Worker version from `main`, but its deploy command is `npx wrangler versions upload`. A merge therefore does not move production traffic.

## Production boundary

The GitHub `production` environment is restricted to protected branches and requires an explicit environment approval. The release workflow also requires the exact current `main` SHA and an operation-specific confirmation phrase.

The workflow expects these credentials:

- Repository secret: `CLOUDFLARE_ACCOUNT_ID`
- Production environment secret: `CLOUDFLARE_PRODUCTION_RELEASE_TOKEN`

Create a dedicated Cloudflare token named `ghosttowntest-production-release` with only the account permissions needed for this gate:

- D1 — Edit
- Workers Scripts — Edit

Do not add Pages, DNS, Registrar, OAuth Client, R2, Email Routing, or account-administration permissions to this release token unless a future production release operation demonstrably requires them.

## Release sequence

Always use the current full SHA from protected `main`. Do not reuse a SHA from an earlier release.

### 1. Preflight

Run **Production Release** from `main` with:

- Operation: `preflight`
- `expected_main_sha`: current full `main` SHA
- Confirmation: `PREFLIGHT PRODUCTION`

Approve the `production` environment when GitHub asks.

Preflight is read-only. It records the D1 migration ledger, recent Worker versions, active deployment, and production health.

### 2. Apply migration 0010

Run the same workflow with:

- Operation: `migrate-0010`
- same exact current `main` SHA
- Confirmation: `APPLY 0010 TO PRODUCTION`

Approve the production environment again.

The workflow refuses to continue unless the only pending D1 migration is `0010_get_me_live_hosting_releases.sql`. It captures the production schema before applying the migration, runs Wrangler's remote migration command, verifies the migration ledger, then proves the new columns, tables, and indexes exist. The currently deployed Worker remains on its existing version and traffic allocation.

### 3. Stage a Worker version

Only after the production migration ledger is clean, run:

- Operation: `stage-version`
- same exact current `main` SHA
- Confirmation: `STAGE VERSION FOR PRODUCTION`

Approve the production environment.

This operation uploads a fresh Worker version from that exact SHA. It creates a deployment with:

- previous production version: 100%
- new candidate version: 0%

Normal users therefore remain on the previous version. The workflow sends Cloudflare's version-override header through the real production route and requires the health endpoint to return the candidate's exact Worker version ID.

Record the candidate version UUID from the workflow summary/artifact.

### 4. Promote the tested candidate

Run:

- Operation: `promote-version`
- same exact current `main` SHA
- `version_id`: the exact UUID produced by the successful stage operation
- Confirmation: `PROMOTE VERSION TO PRODUCTION`

Approve the production environment again.

Promotion refuses any version that is not already staged in the current deployment at 0%. The workflow re-smokes that exact candidate, then moves it to 100% production traffic.

After promotion it checks the normal production route and requires that route to report the promoted version ID. If the post-promotion smoke fails, the workflow automatically restores the previously active version to 100% and fails the run.

## Evidence

Every production operation uploads `github-production-release` evidence for 30 days. Preserve the migration and release run IDs with the production change record.

## Current migration checkpoint

At the time this gate was designed, the production D1 ledger showed exactly one pending migration:

`0010_get_me_live_hosting_releases.sql`

The active production deployment before this release work was:

- deployment: `1c777fd9-ce08-42d1-bcb4-24ce866be498`
- version: `7c9a1db4-c3d2-473f-98ee-9e905c10b4d3`
- traffic: 100%

Treat those IDs as historical evidence only. The workflow reads the live state again on every operation and does not trust the runbook values.

## Safety rules

- Never use `wrangler deploy --env production` in this release path.
- Never stage or promote while D1 migrations are pending.
- Never promote a version ID that did not pass the 0% production-route smoke.
- Never bypass the exact-SHA check because `main` changed while a release was being prepared.
- A migration run does not authorize a Worker promotion. A stage run does not authorize a promotion. Each operation requires a separate manual dispatch and production-environment approval.
