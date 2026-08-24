# GhostTown Launch Blueprint v2.1.5 Change Record

**Change ID:** `GT-BP-2026-08-18-V2.1.5`  
**Date:** `2026-08-18`  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**PR:** `#7`  
**Base canonical version:** `2.1.1`  
**Platform amendment:** `2.1.2`  
**Custom Website amendment:** `2.1.3`  
**Cloudflare SPA template amendment:** `2.1.4`  
**Amendment version:** `2.1.5`

## Explicit product decision

The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.

Each day dynamically exposes the specific prepared assets, instructions, evidence inputs, and decision context required for that day's work. Assets remain independently accessible and exportable, but customers should not need to search through documents to execute the plan.

The paid experience therefore follows this customer flow:

```text
Open paid Blueprint
→ 30-Day Execution Calendar
→ select/current day
→ exact actions + targets
→ prepared assets in context
→ execute
→ record evidence
→ evaluate success/failure threshold and branch rules
→ complete day
→ next action / checkpoint
```

The PDF and asset bundle remain durable exports and recovery artifacts. They are not the primary interaction model for day-to-day execution.

## Why

The existing v2.1 architecture already contains a complete `DailyExecutionPacket` for each day, including exact targets, actions, finished assets, evidence requirements, success and failure thresholds, branch rules, estimated effort, and completion definition. The account surface also already persists completed days, evidence notes, structured evidence, checkpoints, reminders, working asset copies, and commercial measurements.

Presenting those capabilities mainly through separate tabs and downloadable files forces the customer to reconstruct the execution sequence manually. That adds friction at the point where GhostTown should reduce uncertainty and keep the founder moving.

Making the calendar the execution home converts the Blueprint from a collection of outputs into a guided operating system for the first 30 days.

## Customer-facing requirements

1. A paid v2.1 Blueprint opens into the 30-Day Execution interface by default.
2. The first incomplete day is visibly identified as the next action.
3. All 30 days remain directly selectable.
4. Selecting a day exposes that day's objective, why it matters, estimated effort, exact actions, exact targets, expected outcome, success threshold, failure threshold, completion definition, evidence requirements, and branch rules.
5. Prepared assets for that day are rendered in context and may be opened/read without leaving the day's workflow.
6. Asset capabilities continue to support copy, customer working-copy editing, and export where the underlying asset contract allows them.
7. Day 7, 14, 21, and 30 surface their adaptive evidence checkpoint questions, required evidence, and decision branches in context.
8. The customer can record an execution note from the day and can enter the existing structured evidence/review workspace when richer evidence capture is needed.
9. Completing a day persists through the existing Blueprint progress API and commercial measurement contract.
10. Assets remain independently accessible through an Asset Library and as a complete export bundle.
11. The standalone Blueprint PDF remains downloadable.
12. The public landing page explicitly positions the paid product as a guided 30-day execution system in which each day brings forward the required actions, prepared assets, evidence prompts, and decision context.

## Commercial positioning

The paid product is not positioned as "a PDF plus a folder of files."

The customer promise is:

> A guided 30-day idea-to-evidence execution system. Open today's work, use the prepared assets, record what happened, and let the evidence determine what happens next.

This positioning is intended to increase product use because the customer returns to GhostTown to execute the next action rather than downloading the package once and leaving the application.

Engagement itself is not treated as proof of business success. The governing progression evidence remains behavioral and commercial: qualified conversations, commitments, revenue, fulfillment evidence, and the explicit checkpoint criteria in the Blueprint.

## Measurement consequences

The existing Q5 commercial measurement contract remains authoritative. The guided execution home must continue to produce or preserve:

- `blueprint_opened`;
- `daily_packet_opened` with day identity;
- `day_completed` with day identity;
- `evidence_recorded` when structured evidence is saved;
- progress and checkpoint persistence tied to the canonical account/Blueprint/version.

No browser event can create purchase or revenue proof.

## Export and compatibility boundary

This amendment does not delete or weaken the canonical JSON, PDF, ZIP, D1, R2, integrity-receipt, or recovery contracts already accepted through Production Gates 26 and 27.

For Gate 28 and later acceptance, the PDF and ZIP are treated as secondary durable exports that must still satisfy their current integrity and content requirements. A future packaging simplification may remove redundant customer-facing files only through a separate explicit product amendment and regenerated acceptance evidence; it is not silently introduced here.

## Preserved boundaries

This change does not alter:

- the $97 price or Stripe fulfillment contract;
- the canonical base Blueprint blob `616c691e6b4c9cea93615963a07375d13ffba57f`;
- the v2.1.1 schema and normalized execution architecture;
- the v2.1.2 Vertex + Cloudflare AI Gateway architecture;
- the v2.1.3/v2.1.4 Custom Website separation and SPA manufacturing contract;
- D1 or R2 identity;
- paid-order ownership and cross-account protections;
- research-provider or evidence requirements;
- truth labels;
- checkpoint semantics;
- the Launch Site contract;
- the prohibition on automatic production release;
- Gate 36 as an explicit human production-release decision.

**Weakening approved outcomes remains prohibited.**
