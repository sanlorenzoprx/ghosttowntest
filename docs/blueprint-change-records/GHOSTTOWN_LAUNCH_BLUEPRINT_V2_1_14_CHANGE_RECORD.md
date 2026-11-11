# GhostTown Launch Blueprint v2.1.14 Change Record

**Change ID:** `GT-BP-2026-10-20-V2.1.14`
**Date:** `2026-10-20`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `claude/ghosttown-free-verdict-phase1-rhpnxs`
**Base canonical version:** `2.1.1`
**Predecessor:** `2.1.13`
**Amendment version:** `2.1.14`

## Product decision

> **First 30 sells the same Launch Blueprint Sprint and the Get Me Live website together, for $297 paid once.**

Founder decision of 20 October 2026: build the First 30 order and checkout, with approval for all steps. Turning sales on in production (the switch and the Stripe price) remains a separate, explicit founder action.

## Implementation

- `POST /api/first30/checkout` (shared plan-checkout flow, `gtf_` orders, offer `ghosttown_first_30_v1`).
- Webhook branch for `first30_v1`; `src/api/first30Purchase.ts` grants the included website and handles refunds.
- Migration `0012_first30_included_website.sql`: `entitlement_source`, `build_started_at`.
- `POST /api/internal/first30/refund` (owner only); `charge.refunded` handling.
- Verdict-page purchase panel, bilingual intake form, "website included" notices.
- Agent surface reports First 30 as available only when the switch is on.

## Validation

- Real local D1/KV runtime tests for checkout, payment, replay, tampered amount, no second website sale, refund before and after build start, Stripe refusal, owner-only refunds and Stripe-reported refunds.
- full fast suite, Worker runtime, TypeScript: **PASS**.

## Preserved boundaries

No production deployment, no production switch change, no price created. The $97 Sprint and Get Me Live paths are unchanged.

**Weakening approved outcomes remains prohibited.**
