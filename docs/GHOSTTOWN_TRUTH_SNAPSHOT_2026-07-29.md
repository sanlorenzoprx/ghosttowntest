# GhostTown Truth Snapshot

Date: 2026-07-29

## Grounding Evidence

- Repository URL: `https://github.com/sanlorenzoprx/ghosttowntest.git`
- Local path: `C:\repos\ghosttowntest`
- Branch: `main`
- Commit at review start: `12f8cfa7b2b8627275c53a580c16342ca011bac9`
- Tracking status at review start: `main...origin/main`
- Worktree status: implementation changes are deployed to Pages but remain uncommitted locally pending owner review
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Frontend entry point: `src/main.tsx`
- Worker entry point: `src/api/index.ts`
- Current auth implementation: JWT signed in `src/api/auth.ts`, token stored in KV under `user_<email>`
- Current persistence implementation: Cloudflare KV for users, verdicts, results, orders, and report artifacts; R2 for public video assets
- Current checkout route: `POST /api/paid-test/checkout`
- Current webhook route: `POST /api/webhook/stripe`
- Current order/history route: `GET /api/paid-test/orders`
- Current download routes: `GET /api/paid-test/orders/:orderId/plan`, `GET /api/paid-test/orders/:orderId/plan.pdf`, plus legacy `/report` and `/report.pdf` aliases
- Current PDF renderer: inline dependency-free PDF writer in `src/api/paidTest.ts`
- Current paid artifact types: `execution_plan_30day_v1` plus legacy seven-day report JSON/PDF
- Current report/order types: `PaidTestOrder`, `PaidTestReport`, `PaidTestIntake`
- Existing scripts from `package.json`: `dev`, `dev:api`, `build`, `preview`, `type-check`, `test`, `worker:check`, `check`

## Live Origins

- Canonical frontend origin currently responding with HTTP 200: `https://ghosttowntest.com/`
- Pages deployment preview for the current build: `https://bc69e448.ghosttowntest.pages.dev/`
- Frontend title: `GhostTown Test - Test Before You Build`
- API origin currently responding at `/`: `https://api.ghosttowntest.com/`
- Canonical domain in local config/docs: `ghosttowntest.com`
- Legacy alias in local config/docs: `lit-ghosttown.app`
- Live policy/support routes verified with HTTP 200: `/terms`, `/privacy`, `/refunds`, `/disclaimer`, `/contact`
- Published support contact: `support@ghosttowntest.com`

## Stripe Configuration Status

- Stripe mode: not yet verifiable from the local repo alone
- Stripe product ID: not present in tracked source
- Stripe price ID: tracked only as env placeholders (`STRIPE_PRICE_ID`, `STRIPE_PAID_TEST_PRICE_ID`)
- Stripe webhook endpoint ID: not present in tracked source
- Stripe webhook secret: not present in tracked source
- Conclusion: Stripe identifiers still need owner-provided dashboard or secret access to verify

## Current Paid Journey Baseline

- The customer-facing paid offer is the `Personalized 30-Day Idea-to-Evidence Implementation Plan` priced at `$97.00` one time
- Checkout intake currently asks for buyer, problem, workaround, and expected price
- The webhook fulfills only after a verified `checkout.session.completed` event and stores the canonical 30-day plan plus PDF
- The dashboard shows 30-day implementation plans and preserves legacy seven-day reports for compatibility
- The paid success page polls the order status and does not grant entitlement in the browser
- The live site serves the current 30-day offer, legal pages, support contact, and decline-path assessment option

## First Reproducible Failure / Remaining Gate

- The code path fails closed until `STRIPE_30_DAY_PLAN_PRICE_ID` is configured in the correct Stripe mode
- Stripe product, price, webhook endpoint, and signing secret require owner access to the new Stripe account
- A supervised Stripe test purchase remains the next end-to-end acceptance gate

## Files Expected to Change

- `src/api/paidTest.ts`
- `src/api/webhook.ts`
- `src/api/index.ts`
- `src/api/env.ts`
- `src/types/paidTest.ts`
- `src/types/stripe.ts`
- `src/components/ResultReport.tsx`
- `src/components/ActionPlanModal.tsx`
- `src/components/ActionPlanSuccess.tsx`
- `src/components/UserDashboard.tsx`
- `src/components/Landing.tsx`
- `src/components/Contact.tsx`
- `src/components/LegalPage.tsx`
- `src/app/App.tsx`
- `src/lib/api.ts`
- `index.html`
- `wrangler.toml`
- `.env.example`
- `README.md`
- `docs/PAID_GHOSTTOWN_TEST.md`
- `docs/CLOUDFLARE_DEPLOYMENT.md`
- `tests/paidTest.test.ts`
- `tests/integration.test.ts`
- `tests/mobileFunnel.test.ts`
- `tests/offerAndPolicy.test.ts`

## Files That Should Not Change

- `src/api/verdict.ts`
- `src/api/shortsFactoryVerdict.ts`
- `src/verdict/*`
- `src/lib/scoring.ts`
- `src/lib/businessDna.ts`
- `src/lib/evaluationStages.ts`
- `src/components/QuestionFlow.tsx`
- `src/components/QuestionCard.tsx`
- `src/components/ProofStandard.tsx`
- `src/components/ShareCard.tsx`
- `tests/verdictEngine.test.ts`
- `tests/verdictValidator.test.ts`
- `tests/shortsFactoryVerdict.test.ts`

## Notes

- The live frontend is now on the canonical `ghosttowntest.com` Pages custom domain; `lit-ghosttown.app` remains a legacy alias.
- The local Worker config still points production routes and CORS at GhostTown domains, so the implementation preserves both canonical and legacy hostnames.
- Stripe setup is intentionally deferred until the owner completes the new LLC account onboarding. No Stripe credentials were changed during this deployment.
