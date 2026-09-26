# GhostTown Launch Blueprint v2.1.7 Change Record

**Change ID:** `GT-BP-2026-09-26-V2.1.7`
**Date:** `2026-09-26`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `fix/strategic-coherence-gate`
**Base canonical version:** `2.1.1`
**Prior amendments:** `2.1.2`, `2.1.3`, `2.1.4`, `2.1.5`, `2.1.6`
**Amendment version:** `2.1.7`

## Explicit product decision

Before GhostTown is allowed to manufacture the paid 30-Day Sprint, the proposed strategy must pass one independent fail-closed chain:

> **Customer -> problem -> buyer/payer -> current alternative -> test -> commitment -> fulfillment -> access path**

This change addresses the failure pattern observed in real saved Sprints: GhostTown could produce a structurally complete plan even when the strategic spine underneath the plan was weak, mismatched, or unresolved.

## Why this is required

The existing pipeline already had:

- evidence normalization
- business-model strategy synthesis
- finished asset generation
- thirty daily actions
- independent red-team review
- deterministic release gates

The missing boundary was between strategy synthesis and asset generation.

Without that boundary, a weak strategic assumption could cascade into polished landing copy, outreach messages, fulfillment plans, prices, and thirty days of execution work. Completeness then created more apparent confidence than the evidence justified.

## Implementation decision

The staged Vertex pipeline now runs:

```text
evidence_normalization
strategy_synthesis
strategic_coherence_gate
asset_generation
red_team_review
```

The new gate is independent from strategy synthesis and is instructed not to rewrite or rescue the strategy.

It returns exactly eight chain links and classifies each link as:

- coherent
- testable hypothesis
- unresolved
- contradictory

Any unresolved or contradictory link blocks generation.

## Specific protections added

The gate explicitly prevents:

- treating the end user as the payer without establishing that relationship
- treating competitor/media/PR evidence as customer access by default
- turning a product hypothesis into a materially different consulting or manual-service business merely because a manual pilot is easier to describe
- accepting compliments or generic interest as commitment
- accepting fulfillment that conflicts with founder time, cost, capability, or safety constraints
- generating customer-facing assets when the commercial chain is incomplete

For safety-sensitive ideas, the gate specifically challenges manual monitoring, intervention, escalation, clinical, financial, legal, or similar high-consequence responsibilities that are not clearly bounded and realistically fulfillable.

## Failure contract

A gate failure is not a warning.

The paid workflow stops before asset generation and records a concrete failure message containing the unresolved or contradictory link and the smallest evidence needed to continue.

## Implementation surfaces

Changed:

- `src/api/launchBlueprintWorkflow.ts`
- `src/api/launchBlueprintVertexPipeline.ts`
- `src/api/blueprintFulfillmentV21.ts`
- `src/types/launchBlueprintV21.ts`
- `tests/launchBlueprintVertexPipeline.test.ts`

Added product-governance evidence:

- `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_7_STRATEGIC_COHERENCE_GATE_AMENDMENT.md`
- `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_7_CHANGE_RECORD.md`
- `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.7-strategic-coherence-evidence.json`

## Validation

Focused regression proves:

1. a passing chain is recorded in the staged Vertex receipt order
2. unresolved buyer/payer logic blocks Sprint generation
3. a test that changes the value mechanism blocks Sprint generation
4. the existing independent red-team gate still fails closed
5. TypeScript compilation remains clean

## Preserved boundaries

This change does not alter the canonical base Blueprint blob, the $97 commercial price, Get Me Live separation, existing accepted artifacts, ownership rules, or production-release authority.

No production deployment is authorized by this change record.

**Weakening approved outcomes remains prohibited.**
