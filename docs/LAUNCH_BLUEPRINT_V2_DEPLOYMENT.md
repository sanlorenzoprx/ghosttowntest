# GhostTown Launch Blueprint v2 deployment

Launch Blueprint v2 is intentionally fail-closed. Do not enable paid v2 fulfillment until Google grounding, D1, private R2, Stripe test mode, and the complete checkout-to-dashboard acceptance test pass together.

## Runtime architecture

- Existing Cloudflare Worker: checkout, Stripe webhook, Google-grounded research, URL verification, Blueprint generation, PDF rendering, authenticated API routes.
- D1: canonical Blueprint JSON, research receipt, and customer progress.
- Private R2: generated PDF and canonical JSON download objects.
- KV: existing orders, account index, idempotency receipts, and lightweight Blueprint pointers only.
- Existing React/Vite SPA: post-checkout status, account access, execution dashboard, evidence capture, metrics, and final decision.

No separate application service is introduced.

## Required private resources

Create a dedicated D1 database and private R2 bucket. Do not reuse the public video bucket for paid customer files.

```powershell
npx wrangler d1 create ghosttowntest-blueprints
npx wrangler r2 bucket create ghosttowntest-private-blueprints
```

Copy the returned D1 database ID into the commented `DB` binding in `wrangler.toml`, and enable the `BLUEPRINTS` R2 binding.

Apply the migration in both preview/test and production as appropriate:

```powershell
npx wrangler d1 migrations apply ghosttowntest-blueprints --env production --remote
```

## Google Search grounding

Create a restricted Gemini API authorization key and store it only as a Worker secret:

```powershell
npx wrangler secret put GEMINI_API_KEY --env production
```

The research provider uses the model configured in `GEMINI_RESEARCH_MODEL`. It performs one grounded generation request, normalizes the structured result, verifies each proposed public HTTPS page directly, rejects unsafe/dead/duplicate URLs, and passes only when 10-25 sourced channels survive.

After the key, D1, and private R2 bindings are confirmed, change:

```toml
GOOGLE_SEARCH_GROUNDING_ENABLED = "true"
```

Do not enable this flag before storage is configured. A paid webhook will fail and Stripe will retry rather than issuing an incomplete artifact.

## Stripe behavior

The existing `$97` product and checkout route remain in use. The webhook recognizes the current `execution_plan_30day_v1` fulfillment metadata as the migration boundary and writes a `launch_blueprint_v2` artifact after successful fulfillment.

A Stripe event receipt is stored only after:

1. Signature and metadata verification.
2. Current Google-grounded customer-access research.
3. Direct public-page verification.
4. Blueprint v2 quality gate.
5. Professional PDF rendering.
6. D1 and private R2 storage.
7. Account order-index update.

Failures return HTTP 500 with `Retry-After`, allowing Stripe to retry.

## Acceptance test

Use Stripe test mode and the board-game subscription fixture that exposed the old artifact failure.

Confirm all of the following:

- Checkout completes with a Stripe test card.
- Success page advances through research/generation and reaches ready.
- Dashboard shows `GhostTown Launch Blueprint`, version `2.0`.
- Blueprint opens as an executable SPA.
- At least 10 current public customer-access channels have HTTPS source links, research dates, and source IDs.
- Offer, pricing, five posts, twelve relationship scripts, landing-page copy, Launch Site configuration, four weekly milestones, and thirty days are populated.
- Day 1 activates the prepared Launch Site instead of assigning the buyer to write a brief.
- Progress, evidence notes, metrics, and final decision survive refresh and another authenticated device.
- PDF opens and contains the branded cover, contents, complete sections, calendar, decision rules, and source appendix.
- JSON and PDF are downloadable only by the owning account.
- A forced Google/storage failure leaves the order failed and retryable; it must never become ready.

## Production release gate

Keep PR #7 in draft until CI passes and the complete Stripe test-mode acceptance test above is recorded. Merge and deploy only after the private resource IDs and secret are configured without exposing their values in Git or chat.
