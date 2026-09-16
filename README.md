# LIT: Ghost Town Test

Validate a startup idea before investing months in the wrong product. The app combines a 17-question LIT evaluation (Leverage, Insight, and Timing) with Ghost Town risk, Business DNA, and defensibility analysis.

## Evidence-before-Verdict and commercial ladder

GhostTown now runs a bounded **Evidence Scan before the verdict**. The scan checks public market signals such as comparable offers, problem/search footprint, and possible buyer-access surfaces. Those signals are **market evidence only**. They must never be presented as proof that a customer wants the offer or will pay.

The browser verdict uses **Verdict Decision V3** and keeps three evidence tiers separate:

- **Market evidence:** public signs that a market, alternatives, or access paths exist.
- **Customer evidence:** observed buyer actions such as useful replies, conversations, proposal requests, bookings, or similar next steps.
- **Buying evidence:** observed commercial actions such as deposits or payments.

Evidence-aware caching prevents an older verdict from silently overriding materially different evidence. A usable Evidence Scan is cached for 1 hour; an unavailable scan for 5 minutes. Verdict V3 cache identity includes `idea + answers + evidenceScanFingerprint` and is cached for 30 days. Individual delivered result records are retained in KV for 90 days.

The commercial ladder is intentionally separate:

- **Free - Evidence Scan + Verdict:** understand outside market signs, what remains unproven, and whether the idea is clear enough to test.
- **$97 - 30-Day Evidence Sprint:** decide what to test, what to do next, and what result means keep going, revise, pause, or stop.
- **$119 - Get My Test Live:** **upcoming; not shipped in this release.** It will turn the Sprint test into a live customer-facing lead-generation page.
- **Story Studio:** separate acquisition/distribution upsell after a test exists.

The **$97 Evidence Sprint does not include a live website, domain, publishing, or payment setup**. Existing Launch Site infrastructure remains reusable implementation capability; it is not part of the current $97 customer promise.

Observed evidence can already flow back into the canonical Evidence Ledger. Consented Launch Site lead submissions project as customer evidence, and the authenticated Story Studio integration records qualified-click signals as market evidence. This preserves the market/customer/buying hierarchy instead of treating every event as validation.

See [the paid-plan deployment contract](docs/PAID_GHOSTTOWN_TEST.md) before configuring Stripe. The funnel includes a persistent English/Spanish switch. See [Cloudflare deployment](docs/CLOUDFLARE_DEPLOYMENT.md) for the domain map and Pages/Worker configuration.
## What is implemented

- React, TypeScript, Vite, and Tailwind frontend
- Cloudflare Worker API with KV, D1, private R2, Workflows, and Browser Rendering bindings where required
- Evidence-before-Verdict flow with bounded provider scan, evidence fingerprinting, and Verdict Decision V3
- Explicit market / customer / buying evidence hierarchy in verdict and observed-evidence ingestion
- Google Vertex AI generative tasks routed through Cloudflare AI Gateway with task-specific model configuration
- Deterministic scoring fallback for browser verdict analysis when generative analysis fails; evidence boundaries remain enforced
- Email/password accounts, signed sessions, usage accounting, and dashboard
- One earned bonus assessment through share rewards and Stripe checkout for additional tests
- Shareable landscape and square verdict-card images with private-by-default idea names
- Curated example-idea gallery with `?example=<slug>` video deep links and editable prefill
- Five-stage mobile assessment flow with automatic local progress saving and resume
- Signed Stripe webhook verification and idempotent paid-order fulfillment
- Evidence-aware KV caching: Evidence Scan 1h/5m unavailable, Verdict V3 30d, delivered results 90d
- Automatic observed-evidence ingestion from consented Launch Site leads and authenticated Story Studio qualified-click events
- D1-backed canonical Blueprint progress/evidence ledger plus private artifact storage
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

## Configure generative AI

Production generative tasks use **Google Vertex AI through Cloudflare AI Gateway**. Model selection is task-specific rather than controlled by one global model switch:

- `VERTEX_VERDICT_MODEL`
- `VERTEX_SELECTION_MODEL`
- `VERTEX_RESEARCH_MODEL`
- `VERTEX_BLUEPRINT_MODEL`
- `VERTEX_WEBSITE_MODEL`

Runtime configuration also requires the Vertex project/location, service-account credentials, `AI_GATEWAY_ID`, and the `AI_GATEWAY_TOKEN` secret. Keep private-key material and gateway tokens in Cloudflare secrets.

The legacy `AI_MODEL`, `ACTION_PLAN_AI_MODEL`, `GEMINI_RESEARCH_MODEL`, and `GEMINI_GOOGLE_SEARCH_MODEL` fields remain optional compatibility fields during migration only. Runtime generative inference must not depend on them.
## Validate

```bash
npm run check
```

That runs TypeScript, Vitest, the production frontend build, and a Worker dry-run bundle check.

## Production configuration

Before deployment:

1. Confirm the environment-specific KV, D1, private R2, Workflow, AI, and Browser bindings in `wrangler.toml`.
2. Set Worker secrets for authentication, Stripe, provider research, Vertex service-account credentials, `AI_GATEWAY_TOKEN`, and any enabled integration keys using Wrangler secrets or the Cloudflare dashboard. Never commit secret values.
3. Keep production `FRONTEND_URL=https://ghosttowntest.com` and the Worker custom domain `api.ghosttowntest.com` aligned with the current production domain pair.
4. Set the frontend `VITE_API_URL=https://api.ghosttowntest.com` and `VITE_30_DAY_PLAN_DISPLAY_PRICE=$97.00` for production.
5. Configure Stripe to send the required production events to `/api/webhook/stripe`; webhook signature verification remains the payment authority.
6. Apply pending D1 migrations before deploying code that depends on them. Evidence-before-Verdict requires `0007_observed_evidence_events.sql`.
Build and deploy:

```bash
npm run build
npx wrangler deploy --env production
```

Deploy `dist/` to your static frontend host.

## Main API routes

- `POST /api/verdict` (browser assessment and Shorts Factory contract; browser path runs Evidence Scan before Verdict V3)
- `POST /api/lit-verdict` (alias for `/api/verdict`)
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/checkout`
- `POST /api/webhook/stripe`
- `POST /api/referral/create`
- `GET /api/referral/claim?ref=...`
- `POST /api/share/reward`
- `POST /api/launch-sites/:slug/leads` (public consented lead capture for a published Launch Site; projects observed customer evidence)
- `POST /api/integrations/story-studio/evidence` (bearer-authenticated observed-evidence ingestion for Story Studio qualified-click signals)

## Product model

- Free: Evidence Scan + Verdict before registration limits are exhausted
- Share rewards: registered members can unlock one bonus assessment by sharing one completed result
- Recipients: no registration required to open a shared result link
- Paid fallback: ten additional tests for $14.97 through Stripe Checkout when the testing allowance is exhausted
- Paid plan: one **30-Day Evidence Sprint** for $97.00 through Stripe Checkout
- Upcoming separate product: **Get My Test Live — $119**; not included in the Sprint and not marked shipped until its release is complete
- Separate acquisition upsell: **Story Studio**

The deterministic engine is always calculated and returned. On the browser path, the Evidence Scan runs first; generative analyze/score/verdict stages use Vertex through AI Gateway when configured, while deterministic scoring remains the fallback if those generative stages fail. The evidence hierarchy and Verdict V3 truth boundaries still apply to fallback output.
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
