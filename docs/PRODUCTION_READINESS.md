# Production-Readiness Smoke Artifact for LIT-GhostTown

## Current Capabilities

- Frontend: React + TypeScript + Vite + Tailwind CSS, production build passes (46 modules transformed, 219 kB JS + 32.6 kB CSS gzipped)
- Worker API: Cloudflare Worker with local KV support, dry-run deploy check passes (68.09 KiB upload)
- TypeScript: type-check passes via `tsc --noEmit`
- Tests: 25 tests pass across 8 test files (Vitest)
- Full check: `npm run check` (type-check + test + build + worker:check) passes with exit code 0
- API endpoints: verdict, auth (signup/login/verify), checkout, webhook, referral, share reward
- Shorts Factory contract: normalized deterministic verdict provider with optional API key
- Deterministic fallback: when AI is unavailable, analysis falls back to deterministic scoring
- Dev servers: `npm run dev` (Vite), `npm run dev:api` (wrangler local)

## Test Results

All 25 tests pass across 8 test files:
- tests/verdictEngine.test.ts (2 tests)
- tests/verdictValidator.test.ts (2 tests)
- tests/verdictCardImage.test.ts (3 tests)
- tests/scoring.test.ts (3 tests)
- tests/mobileFunnel.test.ts (3 tests)
- tests/richVerdictValidator.test.ts (3 tests)
- tests/shortsFactoryVerdict.test.ts (7 tests)
- tests/integration.test.ts (2 tests)

AI-unavailable stderr output is expected in integration tests because local dev mode intentionally exercises deterministic fallback.

## Missing Items Before Consumer-Ready Production Use

1. **Secrets configuration**: Set Worker secrets for JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET via wrangler secrets or Cloudflare dashboard
2. **KV namespace**: Replace placeholder KV namespace IDs in wrangler.toml with production IDs
3. **Frontend URL**: Set FRONTEND_URL to the deployed Worker origin
4. **AI model**: Set AI_MODEL environment variable for the production environment (default is `@cf/meta/llama-3.1-8b-instruct-fast`)
5. **Static hosting**: Deploy dist/ to a static frontend host (e.g., Cloudflare Pages, Vercel, Netlify)
6. **Stripe webhook**: Configure Stripe to send checkout.session.completed events to /api/webhook/stripe
7. **Worker deploy**: Run `npx wrangler deploy --env production`
8. **CORS**: Ensure FRONTEND_URL matches the deployed frontend origin for CORS
9. **Monitoring**: No error tracking or logging infrastructure is configured yet
10. **CI/CD**: No automated deployment pipeline is set up
11. **Environment variables**: VITE_API_URL must point to deployed Worker origin

## Next Safest Production Task

Deploy the Worker to Cloudflare with production environment and configure necessary secrets. This can be validated by running:
```
npx wrangler deploy --env production
```
After deployment, verify the API responds with a health check or a simple verdict call using curl.
