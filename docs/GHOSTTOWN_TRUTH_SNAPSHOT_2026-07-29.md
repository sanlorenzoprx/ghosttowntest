# GhostTown Truth Snapshot

Date: 2026-07-29

## Grounding Evidence

- Repository URL: `https://github.com/sanlorenzoprx/ghosttowntest.git`
- Local path: `C:\repos\ghosttowntest`
- Branch: `main`
- Commit: `1abecccdf7582689b73e35c8f803b4c0197fd2ac`
- Tracking status: `main...origin/main`
- Worktree status: clean
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Frontend entry point: `src/main.tsx`
- Worker entry point: `src/api/index.ts`
- Current auth implementation: JWT signed in `src/api/auth.ts`, token stored in KV under `user_<email>`
- Current persistence implementation: Cloudflare KV for users, verdicts, results, orders, and report artifacts; R2 for public video assets
- Current checkout route: `POST /api/paid-test/checkout`
- Current webhook route: `POST /api/webhook/stripe`
- Current order/history route: `GET /api/paid-test/orders`
- Current download routes: `GET /api/paid-test/orders/:orderId/report` and `GET /api/paid-test/orders/:orderId/report.pdf`
- Current PDF renderer: inline dependency-free PDF writer in `src/api/paidTest.ts`
- Current paid artifact type: seven-day validation report JSON plus PDF
- Current report/order types: `PaidTestOrder`, `PaidTestReport`, `PaidTestIntake`
- Existing scripts from `package.json`: `dev`, `dev:api`, `build`, `preview`, `type-check`, `test`, `worker:check`, `check`

## Live Origins

- Frontend origin currently responding with HTTP 200: `https://lit-ghosttown.app/`
- Frontend title: `GhostTown Test - Test Before You Build`
- API origin currently responding at `/`: `https://api.ghosttowntest.com/`
- Canonical domain in local config/docs: `ghosttowntest.com`
- Legacy alias in local config/docs: `lit-ghosttown.app`

## Stripe Configuration Status

- Stripe mode: not yet verifiable from the local repo alone
- Stripe product ID: not present in tracked source
- Stripe price ID: tracked only as env placeholders (`STRIPE_PRICE_ID`, `STRIPE_PAID_TEST_PRICE_ID`)
- Stripe webhook endpoint ID: not present in tracked source
- Stripe webhook secret: not present in tracked source
- Conclusion: Stripe identifiers still need owner-provided dashboard or secret access to verify

## Current Paid Journey Baseline

- The customer-facing paid offer is still the old `7-Day Validation Plan` priced at `$29`
- Checkout intake currently asks for buyer, problem, workaround, and expected price
- The current webhook fulfills only after `checkout.session.completed` and then stores a seven-day report
- The current dashboard shows `7-Day Validation Action Plans`
- The paid success page polls `/api/paid-test/orders/:orderId/report`
- The live site still serves the old brand/title copy rather than the new 30-day offer

## First Reproducible Failure

- The current paid journey does not expose the new `Personalized 30-Day Idea-to-Evidence Implementation Plan`
- There is no `/api/paid-test/orders/:orderId/plan` or `/api/paid-test/orders/:orderId/plan.pdf` route yet
- The UI still advertises the seven-day/$29 offer instead of the new versioned 30-day offer

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

- The live frontend is already on `lit-ghosttown.app`, while the API host `api.ghosttowntest.com` is active.
- The local Worker config still points production routes and CORS at GhostTown domains, so the implementation should preserve both the canonical and legacy hostnames.
