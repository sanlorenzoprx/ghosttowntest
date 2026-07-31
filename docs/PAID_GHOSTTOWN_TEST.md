# Paid GhostTown Test

**GhostTown Launch Blueprint: Your personalized 30-day validated idea to market-ready offer** starts from an existing LIT verdict and turns it into a personalized 30-day evidence plan. It costs **$97.00 one time** and does not claim product-market fit, revenue, investor readiness, demand research, professional advice, or certainty.

## Production configuration

In the confirmed Stripe sandbox, the Launch Blueprint is Product `prod_Uyw4i87a8qRReT` and the Verdict Pack is Product `prod_Uyxf3Bm5FCwAKu`. Set their separate one-time **Price IDs** (`price_...`) as `STRIPE_30_DAY_PLAN_PRICE_ID` and `STRIPE_PRICE_ID`. Configure the Product mappings as `STRIPE_30_DAY_PLAN_PRODUCT_ID` and `STRIPE_VERDICT_PACK_PRODUCT_ID`. Stripe test and live objects are separate, so production must use the corresponding live Product and Price IDs—not these sandbox IDs. The Worker also requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, KV, and the existing LIT bindings. Keep all Stripe keys and Price IDs as Worker secrets; Product IDs may be ordinary environment variables.

The public policy pages are:

- `/privacy`
- `/terms`
- `/refunds`
- `/disclaimer`

Business identity: **Zayas House LLC**. Jurisdiction: **Commonwealth of Puerto Rico, USA**. The published refund position is a **conditional 100% money-back guarantee**: the client must provide documented proof that they fully implemented the provided strategies, action steps, or deliverables and, despite full implementation, achieved no results. Configure the same policy links and support contact in Stripe Checkout settings before accepting live payments.

## Delivery contract

1. An authenticated user posts the intake and a source `verdictId` to `POST /api/paid-test/checkout`.
2. The service writes a `pending` order and passes only its opaque order ID to Stripe metadata.
3. A valid, non-duplicate `checkout.session.completed` webhook generates the report. Browser success redirects grant nothing.
4. The authenticated order owner can download `GET /api/paid-test/orders/:orderId/plan` (canonical JSON) and `GET /api/paid-test/orders/:orderId/plan.pdf` (printable PDF).

Legacy seven-day orders remain readable at the old `/report` and `/report.pdf` aliases.

Each plan carries its version, source verdict ID, quality-gate result, and generation receipt. Every conclusion is labelled `Verified`, `Inferred`, or `Test`. The deterministic generator deliberately does not invent customer quotes, competitor facts, citations, market size, pricing research, search demand, or sales evidence.

## Required Stripe setup

- Register the event set in `STRIPE_INTEGRATION_RUNBOOK.md` at `/api/webhook/stripe`.
- Copy Stripe's endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
- Use the Launch Blueprint Price, not the Verdict Pack `STRIPE_PRICE_ID`, for `STRIPE_30_DAY_PLAN_PRICE_ID`.
- Configure the deployed frontend URL before opening checkout in production.
