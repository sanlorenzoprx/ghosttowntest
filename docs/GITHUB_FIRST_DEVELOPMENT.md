# GitHub-First Development and Acceptance

## Purpose

GhostTown uses GitHub as the primary development and repeatable execution platform. Local machines are optional helpers, not release infrastructure.

## Operating model

1. Create a focused branch from `main`.
2. Make the bounded change.
3. Run focused tests.
4. Open a pull request.
5. Let CI validate the branch.
6. Merge only after review.
7. Run the manual **Acceptance** workflow against the merged commit.
8. Inspect the uploaded acceptance evidence.
9. Keep production deployment separate and human-authorized.

## Acceptance environment setup

Create a GitHub Environment named `acceptance` and add these Environment Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare token should be scoped only to the GhostTown resources needed by Wrangler for the acceptance deployment. Do not put production application secrets into GitHub unless a future workflow genuinely requires them.

Stripe, Vertex, DataForSEO, Podcast Index, YouTube and other runtime secrets remain stored on the Cloudflare acceptance Worker and are not duplicated into GitHub by this workflow.

## Current Acceptance workflow

`.github/workflows/acceptance.yml` is manual-only.

It performs:

- dependency installation
- Chromium installation
- focused September 26 closeout regressions
- TypeScript validation
- frontend build
- acceptance Worker dry-run
- optional full test suite
- optional `wrangler deploy --env acceptance`
- upload of an execution receipt and deployment log

The workflow deliberately does **not** deploy production.

## Next acceptance extension

The next slice is to move the fresh Sprint acceptance harness into the repository so GitHub Actions can execute the complete real path:

```
new acceptance case
→ new verdict/order
→ $97 test-mode fulfillment path
→ confirmed competitor seeds
→ Cloudflare Workflow
→ Strategic Coherence Gate
→ uncertainty Sprint OR full 30-Day Sprint
→ persisted D1/KV/R2 state
→ JSON/PDF/16-file ZIP retrieval
→ semantic and source-truth audit
→ uploaded acceptance evidence
```

The September 26 evaluation remains open until a completely new persisted Sprint passes that real artifact audit.

## Production rule

Production is a separate workflow and requires explicit human authorization. Acceptance success must never silently promote code to production.

## Local-machine rule

Desktop Commander or a local terminal may still be used for local-only files, device-specific checks, or emergency recovery. Normal build, test, acceptance deployment, evidence collection, and release verification should be runnable from GitHub.
