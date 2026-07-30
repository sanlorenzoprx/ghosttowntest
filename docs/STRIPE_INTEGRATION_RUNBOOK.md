# Stripe integration audit and runbook

Audit date: 2026-07-30

## Verified architecture

- React/Vite calls the Cloudflare Worker; Stripe Checkout Sessions are created only by the Worker.
- The $97 plan flow creates `paid_test_order_<orderId>` before redirect, associates the authenticated normalized email as the existing internal user ID, and fulfills only from a verified webhook.
- Purchase records include the internal order/user, Checkout Session, PaymentIntent, Customer, Price, amount, currency, payment/fulfillment state, artifact ID, refund records, and timestamps.
- JSON/PDF downloads require authentication, matching order ownership, fulfilled state, and a stored artifact.
- The production JSON API currently responds at `https://api.ghosttowntest.com`; `https://api.lit-ghosttown.app` returns HTML for the same health path and is not currently the Worker API.

## Stripe tooling and resource verification

- The official Stripe CLI is installed and authenticated to the **Zayas House sandbox**.
- Six official `stripe/ai` skills were installed for Codex and become available in a new session.
- No Stripe MCP tools or `stripe_implementation_planner` were active in the audit session.
- The authenticated sandbox has two active one-time USD Prices, at $697 and $1,747. It has no active $97 or $14.97 Price.
- Cloudflare production has `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PAID_TEST_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`; it is missing `STRIPE_30_DAY_PLAN_PRICE_ID`.

No Stripe resources or deployed configuration were changed during the audit.

## Required Stripe resources

In the Zayas House sandbox, create or select:

1. **GhostTown Launch Blueprint: Your personalized 30-day validated idea to market-ready offer** — Product `prod_Uyw4i87a8qRReT`, with an active one-time USD Price for exactly **9700 cents**.
2. **GhostTown Verdict Pack — 10 Additional Tests** — Product `prod_Uyxf3Bm5FCwAKu`, with an active one-time USD Price for exactly **1497 cents**.

The supplied `prod_...` values are Product IDs, not Price IDs. Put the corresponding `price_...` values into the Worker secrets. The Worker retrieves each configured Price with its active API key before creating Checkout and checks `active`, `livemode`, `type`, `currency`, and `unit_amount`. In live mode it also requires each Price to belong to the expected Product above.

## Cloudflare secrets

Enter values only at Wrangler's secure interactive prompt:

```powershell
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_30_DAY_PLAN_PRICE_ID --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

`STRIPE_PAID_TEST_PRICE_ID` is legacy-only. Hosted Checkout does not require a frontend publishable key.

## Webhook destination

Register this sandbox endpoint first:

`https://api.ghosttowntest.com/api/webhook/stripe`

Subscribe only to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `refund.created`
- `refund.updated`
- `refund.failed`

Use that endpoint's sandbox signing secret for test mode. Stripe creates a distinct signing secret for each endpoint and mode.

## Sandbox acceptance procedure

1. Confirm the expected Price without printing any key:

   ```powershell
   stripe prices retrieve <TEST_PRICE_ID>
   ```

   Verify `active=true`, `livemode=false`, `type=one_time`, `currency=usd`, and `unit_amount=9700`.

2. Put test-only local values in an untracked `.dev.vars.development` file, start `npm run dev:api`, and start the Vite frontend separately.
3. For local webhook forwarding:

   ```powershell
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.payment_failed,refund.created,refund.updated,refund.failed --forward-to http://127.0.0.1:8787/api/webhook/stripe
   ```

4. Sign up, complete and save an assessment, open the $97 checkout, and pay with Stripe's sandbox card `4242 4242 4242 4242`, any future expiry, and any CVC.
5. Confirm the success page says it is confirming payment until the webhook finishes. Confirm the dashboard shows one plan and both PDF/JSON downloads work.
6. Log in as a second user and request the first order URL. Confirm `404` and no artifact content.
7. Resend the same completed event and confirm no second artifact or analytics record is created:

   ```powershell
   stripe events resend <EVENT_ID> --webhook-endpoint=<ENDPOINT_ID>
   ```

8. Exercise an official Stripe sandbox decline card and confirm no plan is fulfilled. If delayed payment methods are enabled, test both async success and async failure.
9. Create a partial sandbox refund, then the remaining refund. Confirm partial status preserves access and a completed full refund changes the order to refunded/revoked.
10. Confirm Stripe Workbench shows `2xx` for successful deliveries and that an intentionally unknown order receives `500` and remains retryable.

Automated Stripe mocks prove application behavior only; they do not prove the sandbox or live resources.

## Validation and deployment

Before deployment:

```powershell
npm ci
npm run check
npx wrangler deploy --dry-run --env production
```

After all sandbox acceptance steps pass and deployment is explicitly approved:

```powershell
npx wrangler deploy --env production
```

Deploy the frontend through its existing pipeline after the API. Do not switch to live keys until the same resource checks, webhook endpoint, and end-to-end acceptance have passed in sandbox mode.

## Known limitation

Workers KV is eventually consistent and does not provide atomic compare-and-set. The report path uses stable order IDs, deterministic artifact IDs/content, deterministic analytics keys, and per-event markers so normal retries are idempotent. Strict atomic protection against simultaneous delivery of the same event in different Cloudflare locations would require a Durable Object or transactional database. That architecture was not added without approval.

## Rollback

Keep the previous Worker version available:

```powershell
npx wrangler versions list --env production
npx wrangler rollback --env production
```

Rollback the frontend with its existing deployment provider. Do not delete Stripe Prices or webhook endpoints during rollback; disable the new endpoint only if the previous Worker cannot process its event set, then resend failed sandbox events after recovery.
