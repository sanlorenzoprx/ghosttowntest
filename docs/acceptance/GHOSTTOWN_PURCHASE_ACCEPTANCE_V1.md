# GhostTown Purchase Acceptance Contract v1

Status: authoritative acceptance contract for proving the first paid GhostTown Launch Blueprint purchase path.

## Governing outcome

A purchase is accepted only when one attributable visitor can move through the complete commercial path:

`qualified click -> GhostTown test start -> verdict completed -> $97 Launch Blueprint checkout -> Stripe payment -> webhook -> fulfillment -> downloadable artifact -> revenue attribution receipt`

Code presence is not acceptance. A Stripe checkout page opening is not acceptance. Acceptance requires the paid order and fulfilled artifact to be linked to the same source journey.

## Acceptance environment

Use Stripe test mode and non-production acceptance resources. Never use a real card. No secret values may appear in receipts.

Required configured values:

- `STRIPE_SECRET_KEY` in test mode
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_30_DAY_PLAN_PRICE_ID` mapped to the GhostTown Launch Blueprint offer
- `FRONTEND_URL`
- KV/D1/storage resources used by the current application

## Canonical commercial path

1. Visitor arrives with an attribution identity.
2. GhostTown records `qualified_click`.
3. Visitor starts a GhostTown test and records `test_started`.
4. The verdict completes and records `verdict_completed` with its canonical verdict/result ID.
5. User begins Launch Blueprint checkout.
6. Checkout session metadata retains the GhostTown order ID, owner, offer ID/version, plan version, Stripe price ID, and the attribution identity.
7. Stripe emits `checkout.session.completed`.
8. The signed webhook is verified and replay-protected.
9. The paid order transitions to fulfilled/ready only after artifact generation succeeds.
10. The Launch Blueprint artifact is retrievable by the purchaser.
11. Revenue is recorded once and linked back through order -> verdict -> attribution identity -> originating creative/publication when present.
12. A duplicate Stripe event must not double-grant fulfillment or double-count revenue.

## Required acceptance evidence

The final acceptance receipt must contain identifiers only, never secrets:

- acceptance run ID
- environment = `stripe_test`
- GhostTown user/account identifier or irreversible test alias
- attribution ID
- source creative ID, if present
- source publication ID, if present
- test-start ID
- verdict/result ID
- paid order ID
- Stripe checkout session ID
- Stripe event ID
- offer ID/version
- expected amount and currency
- paid amount and currency returned by Stripe
- fulfillment artifact ID/type/version
- artifact retrieval result
- webhook replay result
- revenue ledger event ID
- commercial attribution result
- start/end timestamps
- PASS/FAIL status
- failure reasons

## PASS criteria

The run passes only when all of the following are true:

- authenticated checkout succeeds;
- the configured 30-day-plan Stripe price is used;
- Stripe test checkout completes;
- webhook signature verification passes;
- the event is processed exactly once;
- the paid order is matched through `paid_test_order_id`;
- fulfillment produces the expected Launch Blueprint artifact;
- the artifact passes its quality gate;
- the purchaser can retrieve the artifact;
- one and only one revenue event exists for the purchase;
- attribution resolves back to the originating commercial journey;
- replaying the same Stripe event does not create duplicate fulfillment or revenue;
- no secret value is present in logs or receipts.

Any missing condition is a failed acceptance run.

## Failure injections

Acceptance must also deliberately prove:

- invalid Stripe signature -> rejected;
- stale Stripe signature -> rejected;
- duplicate event -> acknowledged without duplicate side effects;
- missing source verdict -> checkout blocked;
- missing `STRIPE_30_DAY_PLAN_PRICE_ID` -> checkout blocked;
- fulfillment failure -> order must not be represented as successfully fulfilled;
- attribution absent -> payment may fulfill, but the commercial attribution result must explicitly be `UNATTRIBUTED`, never fabricated.

## Revenue acceptance metric

The first commercial milestone is not traffic or a rendered video. It is:

`first_stranger_paid_launch_blueprint = 1`

Supporting funnel counts are:

- qualified clicks
- GhostTown tests started
- verdicts completed
- Launch Blueprint checkouts started
- Launch Blueprint purchases
- fulfilled Launch Blueprints
- attributed revenue

## Desktop execution checklist

When desktop access is available, execute one clean Stripe test-mode path end to end, capture the receipt, replay the Stripe event once, verify idempotency, then mark this contract PASS only if every criterion above is evidenced.
