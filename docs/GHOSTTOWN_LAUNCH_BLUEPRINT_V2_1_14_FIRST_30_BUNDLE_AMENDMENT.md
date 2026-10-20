# GhostTown Launch Blueprint v2.1.14: First 30 (Sprint and Website in One Payment)

Change ID: `GT-BP-2026-10-20-V2.1.14`
Previous change: `GT-BP-2026-10-20-V2.1.13`
Canonical base: `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (git blob `616c691e6b4c9cea93615963a07375d13ffba57f`, unchanged)

## Product decision

First 30 sells the same Launch Blueprint Sprint and the Get Me Live website together, for $297 paid once. The journey becomes Free Verdict -> First 30. The $97 Sprint and the separate Get Me Live purchase stay in the code, dormant behind their own switches.

Earlier amendments described the journey Free Verdict -> $97 Sprint -> Get Me Live and said the Sprint did not include a website. This amendment changes the offer, not the Blueprint: the artifact, its pipeline, its quality gates and its exports are the same.

## Rules

1. **One payment, both entitlements.** A paid First 30 checkout (`fulfillment_type = first30_v1`, offer `ghosttown_first_30_v1`, 29700 cents) unlocks the Blueprint Sprint and records a paid Get Me Live website row for the same owner and order, with `entitlement_source = 'first30'`. No second charge exists.
2. **The order decides the offer.** Payment verification compares the event against the offer stored on the order, never against what the event claims.
3. **Replays change nothing.** The unique (source order, owner) index makes a replayed payment a no-op, and an order that is already being fulfilled, ready or refunded is never moved back by a payment event.
4. **The website is never sold twice.** Get Me Live checkout for a First 30 order returns the included website instead of a payment page, and First 30 buyers never see the Get Me Live upsell.
5. **Refund rule.** Full refund until the website build starts; no refund after. The build starts the first time the founder asks for the website preview; `build_started_at` is stamped once, atomically, before any website generation. An owner refund first closes the website row only while `build_started_at` is empty, then asks Stripe to refund; if Stripe refuses, the website is restored. A refund recorded by Stripe closes the order and website. A Sprint that finishes building after a refund stays refunded.
6. **Sales are switched on deliberately.** `FIRST30_CHECKOUT_ENABLED` is `"false"` in production until the founder turns sales on, and the price comes from `STRIPE_FIRST_30_PRICE_ID`. With the switch off, checkout returns 410 and agents see First 30 as opening soon; with it on, agents see it as available at $297.
7. **Bilingual and honest.** The purchase panel, intake form and "website included" notices work in English and Spanish, state the refund rule and when the build starts, and promise no sales or income.

## Outcome protection

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment. The $97 Sprint and Get Me Live paths keep working as before.

Weakening approved outcomes remains prohibited.
