# GhostTown Current State

Date: 2026-10-01 (Get Me Live dev plan v4 completion); earlier sections dated 2026-09-25 are kept as history.
Purpose: evidence-backed handoff after the fresh acceptance customer-journey pass and Get Me Live stabilization.

## Get Me Live v4 — "website first, domain optional" (2026-10-01)

Get Me Live now delivers the working website on its stable Cloudflare Pages address (`https://<project>.pages.dev`) first. A custom domain is optional, bought by the customer in their own Cloudflare account, and connected after launch.

Merged to `main` (one slice per PR, each with `npm run check`, CI and, where it changes the published site or server, a green Acceptance run):

| Slice | PR | What it delivers |
|---|---|---|
| 1a | #29 | Stable `pagesUrl` from the provider-returned Pages subdomain; migration `0010` (`hosting_json`, `custom_domain_json`, releases, publish attempts) |
| 1b | #30 | One unverified publish attempt per order (D1-enforced), release marker verify loop, write discipline |
| 1c | #31 | Customer-friendly Pages project names with an overwrite guard |
| 2 | #34 | Immutable launch receipt (v2), legacy backfill, `/releases`, read-only `/health` |
| 3 | #35 | Lead/payment returns only to trusted origins (Pages host, preview hosts, active custom domain) |
| 4 | #36 | No domain step before launch; step `domain` → `name`; Registrar routes retired |
| 5 | #37 | "Your website is ready" screen; `/get-me-live/opening` tab |
| 6 | #38 | Optional "Want your own website address?" card linking to Cloudflare Registrar |
| 7 | #39 | "I bought it — connect it": zones, attach (apex + `www`), version compare-and-swap reconcile, verified activation republish |
| 8 | #41 | Business email only after the custom domain is active |
| 9 | #42 | Registrar OAuth scopes are never requested |
| Sprint fixes | #32, #40 | Progress saves are merged/queued; the workspace opens for the active day |

Acceptance proof: main Acceptance runs #68–#76 green on the slice heads (30-Day Sprint + Get Me Live journey, including republish, byte-identical launch receipt, served release marker, and lead return to `pagesUrl`).

Still needs a human (GhostTown never deploys to production or changes production secrets itself):

1. Production D1: `npx wrangler d1 migrations apply ghosttowntest-blueprints --env production --remote` (migration `0010`) before deploying this Worker.
2. `CLOUDFLARE_OAUTH_SCOPES`: remove Registrar scopes; include zone read, DNS edit and Pages edit (acceptance first, then production). Existing connections keep their grants until the customer reconnects.
3. Run **Custom Domain Acceptance** once (`gh workflow run "Custom Domain Acceptance" -f test_zone=musecreativestudios.com`); it then runs nightly.

## Repository checkpoint

- Repository: `sanlorenzoprx/ghosttowntest`
- Branch: `main`
- Product checkpoint: `ed5add0` — `fix: harden Get Me Live launch and customer proof`
- Product checkpoint `ed5add0` and documentation checkpoint `e57b7c9` were pushed to `origin/main`.
- Remote verification confirmed local `HEAD`, `origin/main`, and GitHub `refs/heads/main` all resolved to `e57b7c989fe9a3ae83f4a493671472c78a2fc07a` before the next self-contained-app slice began.
- Production route code no longer contains the local `/journey-preview` prototype.
- Local Playwright debug/auth material is ignored through `.phase1-playwright/`.

## Canonical product path

The intended customer journey is:

**Free Verdict → 30-Day Sprint → Get Me Live → Post-launch customer activity**

GhostTown is intentionally self-contained at this boundary. StoryFactory is a future optional extension, not a current customer dependency.

The detailed product/handoff logic is preserved in:

`docs/GHOSTTOWN_CUSTOMER_JOURNEY_PRODUCT_REFERENCE_2026-09-25.md`

## Proven in the fresh acceptance journey

### Free Verdict
- Fresh idea intake and all assessment questions completed.
- Free Verdict rendered successfully.
- Sprint CTA and account gate rendered.
- Previous stale-session behavior was bypassed with a fresh customer session.

### Paid Blueprint / 30-Day Sprint
- Existing paid test order was recovered.
- Legacy `http://` seed URLs are upgraded before the HTTPS verification gate.
- Manual retry recovered a malformed Vertex structured-generation response.
- Paid order reached `ready`.
- Vertex stage failures now identify the failing Blueprint stage rather than surfacing an unscoped JSON parse message.

### Get Me Live
- Dashboard → Get Me Live SPA routing bug reproduced and repaired.
- Acceptance frontend is built against the acceptance Worker, not production.
- Required acceptance D1 migration for Get Me Live assets/sharing was applied.
- Cloudflare OAuth account discovery uses the OAuth-compatible memberships endpoint.
- Website-generation response schema was repaired for Vertex compatibility.
- Cloudflare Pages direct upload now performs the required asset-hash registration step.
- A failed republish can no longer take a previously published business offline.
- Public lead redirects use mutable redirect responses and no longer fail during CORS header application.
- Existing stable customer site URL is preferred over transient deployment URLs.

## Proven post-launch customer loop

Acceptance business: **SureDose**

Proven loop:

**Get Me Live → Cloudflare publish → public page → visitor lead → confirmation → lead visible in GhostTown → Launch Share Pack → release receipt**

Observed acceptance proof:
- canonical public page returns HTTP 200;
- public lead form submits successfully;
- successful submit returns to the canonical page with `?lead=received`;
- customer sees “Thanks. Your message was sent.”;
- owner view shows customer activity and captured leads;
- owner view shows page visits, people interested, shares, sales and sales value;
- Launch Share Pack opens and provides three prepared posts;
- milestone content is generated;
- GhostTown remains useful after launch through customer activity, direct lead follow-up, sharing and release verification;
- no HTTP errors were observed in the final Playwright post-launch proof.

## Release receipt

A real Get Me Live release receipt is now available through the owner API and UI.

Schema (2026-09-25; superseded by the stored v2 launch receipt `ghosttown-get-me-live-release-receipt-v2` since Slice 2):

`ghosttown-get-me-live-release-receipt-v1`

The acceptance receipt verified:
- durable deployment recorded: true;
- customer page reachable: true;
- customer page HTTP status: 200;
- lead capture configured: true;
- activity tracking configured: true;
- Cloudflare connected: true;
- payment mode for the current SureDose acceptance configuration: `interest`.

The UI can refresh the receipt and download it as JSON.

## Current acceptance deployments

Worker:
- `lit-ghost-town-api-acceptance`
- version: `e51ee637-e4c5-436d-9deb-a66a81cea5f5`
- URL: `https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev`

Frontend:
- canonical acceptance URL: `https://ghosttown-acceptance.pages.dev`
- latest verified Pages deployment for the self-contained Get Me Live slice: `6e410814.ghosttown-acceptance.pages.dev`

Live SureDose acceptance page:
- `https://gt-gml-180b5e67-ef3e-4b9b-90cc-5cb8a9228ff5.pages.dev`

## Verification completed

Focused Get Me Live verification:
- 12/12 focused contract/provider tests passed.
- TypeScript `tsc --noEmit` passed.
- Production Vite build passed.
- Durable runtime-credential E2E passed against the live acceptance page and release receipt.
- Final mobile Playwright proof showed customer activity, self-contained next steps, release receipt, live-page link, no Story Studio UI, and zero HTTP errors.
- `git diff --check` passed.
- Staged diff audit found zero Stripe secrets, bearer tokens, JWTs, private keys, saved auth tokens or Windows user paths.
- Final Playwright post-launch proof successfully downloaded and parsed the release receipt.
- Downloaded receipt reported HTTP 200 for the customer page.

## Local-only Playwright material

`.phase1-playwright/` contains useful working evidence and debug tooling, but also browser profiles, saved storage state, screenshots and one-off repair scripts.

Policy:
- keep the whole directory out of Git;
- do not commit browser profiles or saved authentication state;
- preserve locally while this acceptance work is still useful;
- durable, credential-free acceptance coverage now lives under `tests/e2e/`;
- runtime authentication is supplied through environment variables rather than committed browser state.

## Reconciled prototype work

The former local `CustomerJourneyPreview.tsx` prototype was useful for clarifying the product path, but it was mock UI rather than real product state.

Decision:
- remove it from the production router;
- preserve its useful product logic as documentation;
- do not ship a hidden/mock `/journey-preview` route.

## Known boundaries / deferred work

- StoryFactory integration is deliberately deferred. A dormant backend handoff contract may remain for future compatibility, but the current GhostTown customer UI must not depend on or advertise StoryFactory.
- GhostTown never buys a domain; customers buy one in their own Cloudflare account and connect it after launch. Irreversible production changes remain human-authorized actions.
- Real customer Stripe payment testing is not required for the current acceptance checkpoint; the manual Stripe test completed separately and should not be conflated with the Playwright button-position issue.

## Immediate next queue

1. Keep GhostTown self-contained through the full post-launch loop: live page, leads, activity, sharing and release receipt.
2. Run the durable `tests/e2e/` acceptance proof using runtime-only credentials when a live acceptance re-proof is needed.
3. Keep the future StoryFactory handoff dormant until StoryFactory is ready, then integrate through the preserved contract rather than redesigning the GhostTown journey.
4. Continue GhostTown product hardening from observed customer friction instead of restarting already-proven phases.
