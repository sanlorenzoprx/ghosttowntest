# GhostTown Customer Journey Product Reference

Date: 2026-09-25
Status: Product/design reference only. This document is not a production route or runtime feature.

## Purpose

This reference preserves the useful product logic that was previously explored in the local `CustomerJourneyPreview` prototype without coupling a mock page to the production application router.

GhostTown should be complete as a self-contained product path:

**Free Verdict → 30-Day Sprint → Get Me Live → Post-launch customer activity**

Each paid step should earn the next one through customer evidence rather than through an arbitrary upsell. StoryFactory is a future optional extension, not a dependency of the current GhostTown product.

## Stage 1 — Free Verdict

Customer question:

> Should I keep testing this idea?

Product promise:
- give a clear decision rather than a giant report;
- identify the biggest unknown;
- identify the fastest next test;
- define what a useful result would look like;
- define when to stop or revise.

Natural handoff:

**The verdict identifies the risk. The 30-Day Sprint turns that risk into a concrete evidence plan.**

## Stage 2 — 30-Day Sprint

Customer question:

> What do I do next?

Product promise:
- tell the customer what to do today;
- keep tasks bounded and observable;
- capture replies, objections, commitments and money evidence;
- branch the plan when evidence changes;
- end with a decision, not just activity.

Natural handoff:

**The Sprint finds or sharpens the offer. Get Me Live puts that exact offer in front of real people.**

## Stage 3 — Get Me Live

Customer question:

> Can I put this offer in front of real customers now?

Product promise:
- start from the Sprint instead of rebuilding from scratch;
- let the customer approve only the choices that matter;
- create a real customer page;
- publish into infrastructure the customer owns;
- capture leads and customer activity;
- show what happened after launch;
- produce a release receipt proving the page was published and checked.

Current proven acceptance behavior:
- Cloudflare-connected page publication;
- stable public `pages.dev` URL;
- public lead submission and confirmation;
- lead appears back inside GhostTown;
- page visits, people interested, shares, sales and sales value are visible;
- Launch Share Pack is available;
- release receipt verifies the deployed page, lead capture and activity tracking.

Natural continuation inside GhostTown:

**Get Me Live stays useful after publication: review customer activity, follow up with interested people, share the live page, and re-check the release receipt.**

## Future optional extension — StoryFactory

StoryFactory is deliberately not part of the current customer journey. GhostTown must remain useful and complete without it.

A dormant backend handoff contract may be preserved so a future StoryFactory integration can consume the live offer, Sprint lineage, canonical live URL and customer activity without redesigning GhostTown. The customer UI should not advertise or depend on that integration until StoryFactory itself is ready.

## Product rule

The customer journey should remain evidence-linked:

1. Verdict identifies uncertainty.
2. Sprint turns uncertainty into tests.
3. Get Me Live exposes the tested offer to real customers.
4. Post-launch activity helps the owner act on real customer response.

A future StoryFactory extension may later amplify the real offer using that evidence, but it is outside the current GhostTown product boundary.

Do not replace this with four disconnected products or a mock journey page in production.

## Implementation rule

Production application:
- contains only real customer behavior and real product state.

Tests:
- contain durable customer-journey automation.

Documentation:
- preserves product intent and handoff rules.

Local debug tooling:
- remains outside Git when it contains browser profiles, storage state, screenshots, temporary scripts or credentials.

## Follow-up

When the current Get Me Live checkpoint is stable on the remote branch, extract the reusable portions of the local Playwright journey into a clean committed E2E suite, with authentication supplied at runtime rather than saved in the repository.
