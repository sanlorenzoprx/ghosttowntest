# GhostTown durable E2E acceptance

This directory contains credential-free test code for the real customer journey.

No browser profile, cookies, localStorage snapshot, OAuth token, Stripe secret, or customer credential belongs in Git.

## Required runtime variables

- `GHOSTTOWN_E2E_BASE_URL` — acceptance API base, for example the acceptance Worker URL.
- `GHOSTTOWN_E2E_AUTH_TOKEN` — a short-lived GhostTown owner bearer token supplied only at runtime.
- `GHOSTTOWN_E2E_GML_ORDER_ID` — Get Me Live order under test.
- `GHOSTTOWN_E2E_LIVE_URL` — canonical public customer-page URL.

Run the non-mutating proof with:

`npm run test:e2e`

The suite skips when the runtime variables are absent.

## Optional lead mutation

Set `GHOSTTOWN_E2E_SUBMIT_LEAD=1` only when the acceptance environment is allowed to create one disposable test lead. The test generates a unique `@example.test` email and verifies that the lead returns to the GhostTown owner API.

## Scope

The durable suite intentionally proves only the high-value customer loop:

1. live page opens;
2. lead form exists;
3. release receipt reports HTTP 200 plus lead/activity wiring;
4. optional test lead can be submitted and observed in GhostTown.

Cloudflare OAuth, Stripe checkout, domain purchase, and any irreversible provider action stay outside unattended E2E automation.
