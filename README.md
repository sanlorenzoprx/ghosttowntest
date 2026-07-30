# LIT: Ghost Town Test

Validate a startup idea before investing months in the wrong product. The app combines a 17-question LIT evaluation (Leverage, Insight, and Timing) with Ghost Town risk, Business DNA, and defensibility analysis.

## Paid GhostTown Test

The verdict screen now offers the Personalized 30-Day Idea-to-Evidence Implementation Plan for **$97.00 one time**. Its checkout is deliberately separate from the existing assessment-credit checkout: access is granted only by a verified Stripe webhook, then the owner can securely download truth-labelled canonical JSON and a printable PDF. If a founder declines the 30-day plan, the existing assessment-credit option remains available as a lower-commitment fallback. See [the paid-plan deployment contract](docs/PAID_GHOSTTOWN_TEST.md) before configuring Stripe.

The funnel includes a persistent English/Spanish switch. See [Cloudflare deployment](docs/CLOUDFLARE_DEPLOYMENT.md) for the domain map and Pages/Worker configuration.

## What is implemented

- React, TypeScript, Vite, and Tailwind frontend
- Cloudflare Worker API with local KV support
- Configurable Workers AI model with deterministic fallback
- Three-stage AI pipeline: analyze, score, verdict
- Email/password accounts, signed sessions, usage accounting, and dashboard
- One earned bonus assessment through share rewards and Stripe checkout for additional tests
- Shareable landscape and square verdict-card images with private-by-default idea names
- Curated example-idea gallery with `?example=<slug>` video deep links and editable prefill
- Five-stage mobile assessment flow with automatic local progress saving and resume
- Signed Stripe webhook verification
- KV verdict caching and browser result storage
- Automated scoring, validator, and Worker integration tests
- Contract-first Shorts Factory verdict API with deterministic scoring and optional bearer auth
- Strict rich-verdict provider boundary, schema, validator, and deterministic mock provider

## Run locally

Requirements: Node.js 20+ and a Cloudflare account if you want to exercise remote Workers AI.

```bash
npm install
npm run dev:api
```

In a second terminal:

```bash
npm run dev
```

Open `http://127.0.0.1:5300`. The frontend proxies `/api` to `http://127.0.0.1:8787`. In fully local Worker mode, the AI binding is unavailable and the verdict endpoint intentionally exercises the deterministic fallback; this is also the production safety path when AI fails.

## Configure the AI model

The model is not hardwired. Set `AI_MODEL` in `wrangler.toml` under the environment you are running:

```toml
[env.development.vars]
AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"
```

Any compatible Cloudflare Workers AI text-generation model can be substituted without changing application code. The current default replaced the deprecated Mistral model from the original build specification.

## Validate

```bash
npm run check
```

That runs TypeScript, Vitest, the production frontend build, and a Worker dry-run bundle check.

## Production configuration

Before deployment:

1. Replace the placeholder KV namespace IDs in `wrangler.toml`.
2. Set Worker secrets for `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_30_DAY_PLAN_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` using Wrangler secrets or the Cloudflare dashboard. Keep `STRIPE_PAID_TEST_PRICE_ID` only if you need to fulfill old pending seven-day orders.
3. Set `FRONTEND_URL` and `AI_MODEL` for the target environment.
4. Set the frontend `VITE_API_URL=https://api.ghosttowntest.com` and `VITE_30_DAY_PLAN_DISPLAY_PRICE=$97.00` for production. The frontend also infers this API origin on `ghosttowntest.com`.
5. Configure Stripe to send `checkout.session.completed` events to `/api/webhook/stripe`.

Build and deploy:

```bash
npm run build
npx wrangler deploy --env production
```

Deploy `dist/` to your static frontend host.

## Main API routes

- `POST /api/verdict` (browser assessment and Shorts Factory contract)
- `POST /api/lit-verdict` (alias for `/api/verdict`)
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/checkout`
- `POST /api/webhook/stripe`
- `POST /api/referral/create`
- `GET /api/referral/claim?ref=...`
- `POST /api/share/reward`

## Product model

- Free: one assessment without registration
- Share rewards: registered members can unlock one bonus assessment by sharing one completed result
- Recipients: no registration required to open a shared result link
- Paid fallback: ten additional tests for $14.97 through Stripe Checkout when the 30-day plan is declined or a testing allowance is exhausted
- Paid plan: one Personalized 30-Day Idea-to-Evidence Implementation Plan for $97.00 through Stripe Checkout

The deterministic engine is always calculated and returned. AI analysis is used only when all three model stages return valid structured output.

The Shorts Factory contract now returns a validated rich idea evaluation through
the local `VerdictProvider` boundary. Phase 4F uses the deterministic
`MockVerdictProvider` by default, so tests and local contract calls require no
AI key or network call. The provider is explicitly identified as `mock` in
provenance; no live-provider claim is made.

Rich output is validated for required fields, enums, score range, specific
advice, fake certainty, unsupported market claims, warnings, and provenance
before the endpoint returns it. See
`docs/contracts/LIT_VERDICT_CONTRACT.md`.

### Shorts Factory API contract

Requests with `source: "shorts_factory"` or an `idea.name` field use the normalized,
fully deterministic integration response. The existing browser payload (`idea.ideaName`)
continues to use the hybrid AI and deterministic-fallback flow.

```bash
curl -X POST "http://localhost:8787/api/verdict" \
  -H "Content-Type: application/json" \
  -d '{"idea":{"name":"AI UGC Creator Agency","description":"AI video agency for ecommerce brands","target_user":"small ecommerce brands","market":"US"},"answers":{"q0":4,"q1":4,"q2":3},"source":"shorts_factory","locale":"en-US"}'
```

Set the Worker secret `LIT_API_KEY` to require `Authorization: Bearer <key>` for
Shorts Factory requests. Leave it blank or unset for local development. Portable
`q0`, `q1`, and similar 1–5 answers are distributed deterministically across the
existing LIT scoring categories; native Ghost Town answer IDs are also accepted.

Video campaigns can open an editable starter directly, for example:

```text
https://lit-ghosttown.com/?example=ai-agency-qa
```
