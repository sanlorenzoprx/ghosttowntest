# GhostTown Customer Journey Product Reference

Date: 2026-09-25
Status: Product/design reference only. This document is not a production route or runtime feature.

## Purpose

This reference preserves the useful product logic that was previously explored in the local `CustomerJourneyPreview` prototype without coupling a mock page to the production application router.

The customer should experience GhostTown as one continuous path:

**Free Verdict → 30-Day Sprint → Get Me Live → First Video**

Each product should earn the next one through customer evidence rather than through an arbitrary upsell.

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

Natural handoff:

**Get Me Live produces a real offer, real page and early customer language. The First Video should use that evidence rather than inventing a fresh marketing story.**

## Stage 4 — First Video / StoryFactory

Customer question:

> How do I get more of the right people to notice this?

Intended product promise:
- create one finished customer-facing video first;
- use the real offer, customer language and evidence from the prior GhostTown stages;
- connect the CTA to the live page;
- return the finished media and status into the GhostTown customer journey.

Current boundary:

The Story Studio handoff exists, but the fully realized bridge should return the completed first video to GhostTown instead of ending at an external/open-Studio handoff.

## Product rule

The customer journey should remain evidence-linked:

1. Verdict identifies uncertainty.
2. Sprint turns uncertainty into tests.
3. Get Me Live exposes the tested offer to real customers.
4. First Video amplifies the real offer using evidence gathered before it.

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
