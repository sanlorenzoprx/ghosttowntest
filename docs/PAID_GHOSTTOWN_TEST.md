# Paid GhostTown Test

The paid plan starts from an existing LIT verdict and turns it into a personalized 30-day idea-to-evidence implementation plan. It does not claim product-market fit, revenue, investor readiness, demand research, professional advice, or certainty.

## Production configuration

Create a separate Stripe one-time Price for the 30-day plan and set it as `STRIPE_30_DAY_PLAN_PRICE_ID`. The Worker also requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, KV, and the existing LIT bindings. Keep all Stripe values as Worker secrets in production; do not commit them.

## Delivery contract

1. An authenticated user posts the intake and a source `verdictId` to `POST /api/paid-test/checkout`.
2. The service writes a `pending` order and passes only its opaque order ID to Stripe metadata.
3. A valid, non-duplicate `checkout.session.completed` webhook generates the report. Browser success redirects grant nothing.
4. The authenticated order owner can download `GET /api/paid-test/orders/:orderId/plan` (canonical JSON) and `GET /api/paid-test/orders/:orderId/plan.pdf` (printable PDF).

Legacy seven-day orders remain readable at the old `/report` and `/report.pdf` aliases.

Each plan carries its version, source verdict ID, quality-gate result, and generation receipt. Every conclusion is labelled `Verified`, `Inferred`, or `Test`. The deterministic generator deliberately does not invent customer quotes, competitor facts, citations, market size, pricing research, search demand, or sales evidence.

## Required Stripe setup

- Register `checkout.session.completed` at `/api/webhook/stripe`.
- Copy Stripe's endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
- Use a paid-plan price, not the existing 10-assessment `STRIPE_PRICE_ID`, for `STRIPE_30_DAY_PLAN_PRICE_ID`.
- Configure the deployed frontend URL before opening checkout in production.
