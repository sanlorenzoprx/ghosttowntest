# Production Customer Journey Harness

This directory is a black-box production canary harness for GhostTown. It is intentionally independent from GhostTown application code so it can be extracted into its own repository after the first production proof.

## Safety model

The harness never completes a Stripe purchase, never publishes or republishes a website, never attaches or removes a domain, never changes payment/email/provider configuration, and never writes Sprint progress. Those actions remain covered by pre-live acceptance.

Production coverage is split into two scopes:

- `surface` — health/version attribution, English + Spanish landing experience, mobile layout, anonymous free verdict, paid-offer modal, protected-route rejection, and visible-language checks.
- `full` — everything in `surface`, plus login to a dedicated production canary account, dashboard persistence, a pre-provisioned ready Sprint, a pre-provisioned Get Me Live order, all Get Me Live checklist surfaces, and the already-published public canary page.

The full scope deliberately uses **pre-provisioned canary paid state** instead of automating a real credit-card purchase. It verifies the production checkout offer/boundary in the UI and verifies the post-payment products through known canary orders. Real money is never spent by this harness.

## Required runtime values

Always:

- `PCJ_BASE_URL=https://ghosttowntest.com`
- `PCJ_API_URL=https://api.ghosttowntest.com`
- `PCJ_EXPECTED_WORKER_VERSION=<exact Cloudflare Worker UUID>`
- `PCJ_CONFIRM=RUN PRODUCTION CUSTOMER JOURNEY`

For `PCJ_SCOPE=full`:

- `PCJ_CANARY_EMAIL`
- `PCJ_CANARY_PASSWORD`
- `PCJ_SPRINT_ORDER_ID`
- `PCJ_GML_ORDER_ID`
- `PCJ_LIVE_URL`

Credentials are supplied only as GitHub Environment secrets. They must never be committed or written to artifacts.

## What a PASS means

A PASS proves the exact expected Worker is answering production, the customer can understand and complete the free-test path on the live site, Spanish and mobile surfaces remain usable, authentication works for the dedicated canary, saved product state is recoverable, the known Sprint opens read-only, the known Get Me Live workspace opens across every checklist surface, and the already-published canary page is reachable.

It does **not** claim that the harness made a real purchase or mutated external providers. The JSON receipt explicitly records those boundaries.

## Extraction rule

Do not import application source files here. Keep selectors, guards, and journey logic self-contained. After the GhostTown production proof is stable, copy this directory plus its workflow into a dedicated repository for reuse across future products.
