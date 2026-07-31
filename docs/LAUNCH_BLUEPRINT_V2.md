# GhostTown Launch Blueprint v2

## Purpose

Launch Blueprint v2 replaces the generic 30-day task dump with a complete, executable launch package. The generator must produce finished commercial assets and must fail closed when current customer-access research is missing.

## Canonical contract

`src/types/launchBlueprint.ts` defines the complete artifact:

- Executive launch decision
- Finished offer and pricing strategy
- Target-customer and positioning plan
- Research-backed Customer Access Pack
- Five finished helpful community posts
- Twelve relationship-specific outreach scripts
- Complete landing-page and confirmation copy
- Populated Launch Site Starter configuration
- Four weekly milestones
- Thirty integrated daily actions
- Final continue, revise, pivot, or stop criteria
- Sources, research date, confidence, generation receipt, and quality gate

## Generator

`src/api/launchBlueprintGenerator.ts` generates completed assets from the paid order, GhostTown verdict, and a current `CustomerAccessResearchInput` bundle.

The generator classifies the initial business model and creates a business-model-aware pilot instead of inserting the buyer and problem into a generic sentence. Current supported starting models are:

- Subscription
- SaaS
- Local service
- Consulting
- Marketplace
- Digital product
- Physical product
- General service

## Fail-closed quality gate

A Blueprint cannot reach `ready` status unless it includes:

- At least four finished offer deliverables
- At least five objection responses
- At least one named current alternative
- 10–25 current prioritized customer-access channels
- Complete research status and research date
- Public HTTPS links and source attribution for every channel
- Exactly five substantive helpful posts
- All twelve outreach relationship scripts
- Complete landing-page FAQ and Launch Site data
- Exactly thirty daily actions
- Prepared assets, deliverable, measurement, and evidence fields for every day
- No old generic offer or price placeholders

## Current integration boundary

This phase intentionally does not replace the live fulfillment route yet. The current production flow remains on `execution-plan-30day-v1` until a current customer-access research provider populates the research bundle and the v2 generator passes repository checks. This prevents another paid customer from receiving a falsely complete Blueprint.

The next phase is to implement the research provider and then switch webhook fulfillment, storage, PDF rendering, and the executable SPA to `ghosttown-launch-blueprint-v2` as one coordinated migration.
