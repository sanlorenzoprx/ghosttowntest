# GhostTown Launch Blueprint v2

## Purpose

GhostTown Launch Blueprint replaces the generic thirty-day task dump with one complete, executable paid launch product. The customer receives finished strategy, current distribution research, prepared commercial assets, a working launch-site implementation, and a bounded thirty-day evidence plan.

The system must fail closed when required research, source attribution, storage, or customer assets are incomplete.

## Customer promise

The paid customer receives:

1. Personalized 30-day launch roadmap.
2. Clear offer and pricing strategy.
3. Target-customer and positioning plan.
4. Current customer-access and Media & Distribution Network research.
5. Landing-page messaging and sales copy.
6. Customer outreach scripts and action plan.
7. Weekly priorities, milestones, and success metrics.
8. Thirty-day daily execution calendar.
9. Personalized Cloudflare Launch Site Starter.
10. Downloadable plan and finished assets saved to the customer account.

## Launch Site invariant

The website is not a separate unrelated bonus.

The Cloudflare Launch Site Starter is the working implementation of the landing-page section of the Blueprint. The same canonical Blueprint fields must drive the authenticated SPA, PDF, JSON, downloadable assets, and public Launch Site:

- `offer`
- `positioning`
- `landingPageCopy`
- `launchSite`
- proof boundaries
- lead-capture action

No surface may maintain a separate hand-edited offer or landing-page version.

## Canonical contract

`src/types/launchBlueprint.ts` defines the complete artifact:

- Executive launch decision.
- Finished offer and pricing strategy.
- Target-customer and positioning plan.
- Research-backed Media & Distribution Network.
- Five finished helpful posts.
- Twelve relationship-specific outreach scripts.
- Complete landing-page, thank-you, and confirmation copy.
- Populated Launch Site configuration.
- Four weekly milestones.
- Thirty integrated daily actions.
- Final continue, revise, pivot, or stop criteria.
- Sources, research date, confidence, generation receipt, and quality gate.

## Generator

`src/api/launchBlueprintGenerator.ts` generates completed assets from the paid order, GhostTown verdict, and current customer-access research.

The generator creates business-model-aware pilots for subscription, SaaS, local service, consulting, marketplace, digital product, physical product, and general service ideas.

## Paid research architecture

Paid research uses the confirmed customer map and competitor-led distribution footprint:

- two or three verified commercial seed domains;
- DataForSEO backlinks;
- Podcast Index discovery;
- YouTube Data API discovery;
- original public-source verification;
- Gemini ranking constrained to provider candidate IDs.

Google Search Grounding is not part of paid fulfillment. The owner-only Google console remains session-only and separate from customer artifacts.

## Fail-closed quality gate

A Blueprint cannot reach `ready` unless it includes:

- at least four finished offer deliverables;
- at least five objection responses;
- at least one named current alternative;
- 10–25 current prioritized distribution targets;
- at least three target types;
- complete research status and research date;
- public HTTPS links and source attribution for every target;
- competitor/audience evidence, access path, prepared asset, script, risk, and first action for every priority target;
- exactly five substantive helpful posts;
- all twelve outreach relationship scripts;
- complete landing-page FAQ and Launch Site configuration;
- exactly thirty daily actions;
- prepared assets, deliverable, measurement, and evidence fields for every day;
- no generic offer, price, or content placeholders;
- successful private D1/R2 persistence.

## Current branch status

Implemented on `feat/launch-blueprint-spa`:

- canonical Blueprint v2 contract and generator;
- post-purchase competitor-seed confirmation;
- Media & Distribution Network providers and Workflow;
- D1/R2 storage design;
- professional PDF and canonical JSON;
- authenticated executable Blueprint;
- account history, repeat downloads, progress, metrics, and final decision;
- Launch Site configuration and authenticated preview;
- owner-only Google research console.

Still required before production acceptance:

1. Pre-purchase micro-commitments for commercial, audience, and ecosystem signals.
2. Lightweight provider-backed seed suggestions before purchase.
3. Post-purchase confirmation of the carried-forward map instead of a repeated questionnaire.
4. Public multi-tenant Cloudflare Launch Site publish/unpublish implementation.
5. Public lead capture and private owner lead access/export.
6. Downloadable finished asset ZIP.
7. Full Stripe test-mode acceptance with live providers, D1, private R2, Workflow, PDF visual review, public site, lead receipt, and account recovery.

The exact implementation directive is:

`docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CURSOR_CODEX_IMPLEMENTATION_HANDOFF.md`
