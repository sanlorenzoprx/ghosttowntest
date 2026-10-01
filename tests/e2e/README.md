# GhostTown durable E2E acceptance

This directory contains credential-free test code for the real customer journey.

No browser profile, cookies, localStorage snapshot, OAuth token, Stripe secret, or customer credential belongs in Git.

## Required runtime variables

- `GHOSTTOWN_E2E_BASE_URL` — acceptance API base, for example the acceptance Worker URL.
- `GHOSTTOWN_E2E_AUTH_TOKEN` — a short-lived GhostTown owner bearer token supplied only at runtime.
- `GHOSTTOWN_E2E_GML_ORDER_ID` — Get Me Live order under test.
- `GHOSTTOWN_E2E_LIVE_URL` — the order's stable Pages URL (`https://<project>.pages.dev`, no deployment hash). The test cross-checks it against the receipt's `pagesUrl`.

Run the non-mutating proof with:

`npm run test:e2e`

The suite skips when the runtime variables are absent.

## Optional lead mutation

Set `GHOSTTOWN_E2E_SUBMIT_LEAD=1` only when the acceptance environment is allowed to create one disposable test lead. The test generates a unique `@example.test` email and verifies that the lead returns to the GhostTown owner API.

## Scope

The durable suite intentionally proves only the high-value customer loop:

1. live page opens on the stable `pagesUrl`;
2. lead form exists;
3. the stored launch receipt (v2) reports HTTP 200 plus lead/activity wiring, reads back byte-identical, and the page serves the latest release marker;
4. optional test lead can be submitted, returns to `?lead=received` on the order's own `pagesUrl`, and is observed in GhostTown.

Cloudflare OAuth, Stripe checkout and any irreversible provider action stay outside unattended E2E automation. GhostTown never buys domains.

## Custom-domain acceptance

`get-me-live-custom-domain-acceptance.mjs` runs from `.github/workflows/custom-domain-acceptance.yml` (manual or nightly, not a per-PR gate). After the fixture publishes an order, it attaches `gml-accept-<run>.<test zone>` through `POST /custom-domain`, reconciles until active (20-minute cap), checks the activation release marker and canonical over HTTPS and that the launch receipt is unchanged, then always disconnects the host. It needs `GHOSTTOWN_E2E_TEST_ZONE` (default `musecreativestudios.com`), an active zone in the acceptance Cloudflare account, and an acceptance token with Zone Read and DNS Edit.
