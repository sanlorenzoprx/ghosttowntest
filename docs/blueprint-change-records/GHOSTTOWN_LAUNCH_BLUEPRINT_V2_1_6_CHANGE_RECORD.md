# GhostTown Launch Blueprint v2.1.6 Change Record

**Change ID:** `GT-BP-2026-08-18-V2.1.6`  
**Date:** `2026-08-18`  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**PR:** `#7`  
**Base canonical version:** `2.1.1`  
**Prior amendments:** `2.1.2`, `2.1.3`, `2.1.4`, `2.1.5`  
**Amendment version:** `2.1.6`

## Explicit product decision

The paid GhostTown 30-Day Launch Blueprint is extended from a guided execution calendar into an evidence-aware **Execution Intelligence** surface with four coordinated layers:

1. the canonical 30-day execution spine remains authoritative;
2. business-model lane profiles make the commitment mechanism, fulfillment proof, economics focus, and scale question specific to the business being tested;
3. deterministic retrieval assembles the exact Blueprint/day/action/asset/checkpoint/evidence/research context required for the current task;
4. an interactive Execution Copilot explains, reasons, challenges, and researches inside those boundaries without receiving authority over evidence, completion, money, or experiment state.

The governing customer outcome is:

> GhostTown knows what kind of business I am testing, tells me exactly what to do today, gives me the asset to do it, knows what result I need to record, prevents me from pretending an incomplete test is complete, recognizes when the evidence contradicts the plan, changes only the part the evidence justifies changing, and tells me what experiment to run next.

This amendment implements that outcome as an execution-intelligence layer. It does not replace or weaken the canonical Blueprint.

## Canonical source basis

This amendment implements existing requirements already present in the canonical v2.1 source:

- Part 10 requires exactly thirty personalized daily actions, including exact actions, prepared assets, success measures, evidence, branches, and completion status.
- Part 11 makes the dashboard the primary operating surface and requires Day 7/14/21/30 evidence reviews plus evidence-supported final decisions.
- Part 11 requires checkpoint regeneration/versioning to preserve original recommendations, assets, evidence, thresholds, and customer results.
- Part 12 explicitly permits customer interview notes, transcripts, objections, email replies, surveys, and call summaries to be synthesized while distinguishing direct statements from model inference.
- Section 4 requires personalization by business model, including service, SaaS, digital product, physical product, marketplace, local business, and creator/media.
- The canonical source prohibits giving a proceed calendar when customer/problem/access evidence is too weak.

The canonical base source remains unchanged at Git blob SHA-1:

`616c691e6b4c9cea93615963a07375d13ffba57f`

## Execution Intelligence architecture

```text
Calendar + Execution Copilot
          ↓
Deterministic execution-context retrieval
          ↓
Canonical Blueprint + current DailyExecutionPacket
+ prepared assets + evidence + latest checkpoint + sources
          ↓
Formal checkpoint branch
  ├─ mayChange
  └─ mustKeep
          ↓
Capability router
  ├─ fast assistant
  ├─ strategy reasoner
  ├─ evidence critic
  └─ grounded research
          ↓
AI recommendation
          ↓
Deterministic product guardrails
          ↓
Founder action → recorded evidence → next state
```

The hierarchy is intentional:

**canonical Blueprint / deterministic evidence state > formal branch > model recommendation.**

A model response cannot supersede a deterministic completion or state-transition rule.

## Deterministic retrieval contract

The first retrieval tier is exact, identity-based retrieval rather than a generic vector-database query. Each Copilot request is assembled from the founder-owned paid Blueprint using:

- `blueprintId` and `blueprintVersion`;
- active `dayNumber`;
- the exact `DailyExecutionPacket`;
- action IDs and target IDs;
- prepared asset IDs and finished content;
- the active lane profile;
- current completion state and objective metrics;
- evidence attached to the active action/day;
- a bounded set of relevant prior evidence;
- the latest completed checkpoint review at or before the active day;
- existing canonical/public research sources relevant to the question.

Current-day evidence is prioritized. Bounded lexical relevance is used only to rank additional prior evidence and existing Blueprint sources. This avoids making vector retrieval an authority over the execution state.

A future semantic/vector retrieval layer may improve recall for large evidence histories. It must remain supplemental to exact Blueprint/action/evidence identity retrieval.

## Seven lane execution profiles

The v2.1 business-model classifier remains authoritative. The Execution Intelligence layer now gives each lane explicit commercial semantics:

- **Service / consulting:** paid diagnostic, fixed-scope pilot, deposit, or accepted paid scope; prove manual delivery and founder-hour economics.
- **SaaS:** paid design partner, concierge workflow, deposit, or workflow access; prove the workflow manually before deciding what deserves software.
- **Digital product:** presale, paid workshop, founding purchase, or preorder; prove purchase plus delivery/usage before expanding content.
- **Physical product:** preorder, deposit, prototype evaluation, or retailer commitment; prove small-batch delivery, COGS, shipping, defects, and use evidence before increasing production.
- **Marketplace:** manually qualified match, concierge fee, transaction commitment, or explicit access from both sides; prove one narrow transaction before self-service matching.
- **Local business:** appointment, estimate approval, reservation, deposit, or paid service; prove local conversion, delivery, capacity, and unit economics before expansion.
- **Creator / media:** qualified subscriber action, paid product/subscription, sponsor conversation, or paid event; commercial behavior outranks views, likes, and generic praise.

These profiles are consumed by the Copilot/context layer immediately. The underlying canonical DailyExecutionPacket remains the accepted common evidence spine. Further lane-specific rewriting of individual day asset vocabulary may be introduced only as a bounded generator improvement with regression tests; it must not create seven unrelated calendars or weaken the common evidence contract.

## Formal checkpoint branch contract

The latest completed Day 7/14/21/30 review is converted into a deterministic branch state.

Supported branch routes are:

- `continue`;
- `revise_customer`;
- `revise_problem`;
- `revise_access`;
- `revise_trust`;
- `revise_offer`;
- `revise_fulfillment`;
- `revise_price`;
- `revise_message`;
- `pause_missing_evidence`;
- `stop`.

Each non-terminal revision exposes:

- the one variable that `mayChange`;
- all other experiment variables that `mustKeep`;
- the evidence-backed reason;
- the checkpoint's recorded next action.

A generic `continue_with_revision` or `revise` final decision does not default to an offer change. The named checkpoint constraint selects the one permitted variable. If no defensible constraint is recorded, GhostTown routes to `pause_missing_evidence` instead of inventing a revision.

`none` remains a legitimate evidence-strength result. Missing evidence can support a pause; the system must never manufacture positive evidence to allow progression.

## Execution Copilot contract

The paid v2.1 route exposes an owner-authenticated Copilot attached to the selected/current day.

### Current Experiment mode

Default mode. The Copilot must:

- use the retrieved live experiment context;
- respect `mayChange` and `mustKeep`;
- distinguish recorded evidence from inference;
- point to the exact current asset when useful;
- identify contradictions between recorded behavior and the plan;
- prefer one bounded next experiment over broad simultaneous changes;
- never claim that a day is complete;
- never invent customers, quotes, commitments, payments, metrics, sources, or proof.

### Strategy Room mode

Strategy Room may explore alternate customers, offers, business models, pricing, channels, or broader business strategy. Strategy Room output is explicitly non-mutating. It does not modify the live 30-day experiment or its branch state.

A future product action may allow a Strategy Room idea to be proposed for a checkpoint. Adoption would still require evidence and an allowed state transition.

## AI capability routing

The product contracts are capability names rather than hard-coded model brands:

- `fast_assistant` — routine explanation and daily execution help;
- `strategy_reasoner` — high-impact business interpretation and bounded next-experiment reasoning;
- `critic` — challenge unsupported inference, weak-evidence overreach, and illegal multi-variable changes;
- `grounded_research` — questions requiring current external evidence.

The current implementation deliberately reuses the already accepted first-party `GenerativeAIService` through Cloudflare AI Gateway to Google Vertex AI. It does not add a second provider or six-model voting system before customer evidence justifies the complexity.

Capability-to-model mapping remains replaceable. Open-source or other approved models may later compete for a capability slot based on measured quality, latency, cost, and contract compliance without changing the Execution Intelligence product contract.

High-impact Current Experiment questions may receive a second evidence-critic pass. Routine questions should not incur unnecessary multi-model orchestration.

## Deterministic authority boundary

AI is advisory. Deterministic software remains authoritative for:

- paid-order ownership and authentication;
- canonical Blueprint identity/version;
- day completion eligibility;
- required evidence quantities;
- sequential completion;
- checkpoint completion requirements;
- stored evidence and its immutable revisions;
- revenue, founder time, and direct-cost arithmetic;
- formal branch `mayChange` / `mustKeep` permissions;
- Stripe/payment state;
- D1/R2 persistence;
- artifact hashes and integrity receipts;
- release gates and production deployment.

Copilot responses do not directly mutate the canonical Blueprint, evidence ledger, completion state, checkpoint state, or payment state.

## Preserved v2.1.5 execution safeguards

The v2.1.5 completion hardening remains part of the customer path:

- customer-facing/external days require meaningful structured evidence;
- declared action quantities are enforced before completion;
- later days cannot be completed while prior days remain incomplete;
- checkpoint days require a saved review;
- failed persistence does not emit a false `day_completed` event;
- unsynced work is preserved locally and can be retried;
- returning from the structured workspace reloads current account progress;
- objective commitment/revenue/founder-time/direct-cost totals are derived from evidence where deterministic derivation is safe.

## Acceptance boundaries

This amendment does **not**:

- alter the $97 price or Stripe purchase contract;
- alter or regenerate the already accepted Gate 20 purchase;
- alter accepted Gate 26/27 D1/R2 artifact bytes;
- weaken Gate 28 PDF/ZIP verification;
- alter the canonical base Blueprint blob;
- enable automatic production deployment;
- change Gate 36 from a human production-release decision;
- add an external vector database;
- add an additional model provider;
- allow chat to silently rewrite a Blueprint or customer evidence.

No production deployment is authorized by this change record.

## Implementation surfaces

Primary new or extended surfaces:

- `src/lib/blueprintExecutionIntelligence.ts`
- `src/api/executionAIService.ts`
- `src/api/blueprintExecutionCopilot.ts`
- `src/api/worker.ts`
- `src/components/LaunchBlueprintCopilotV21.tsx`
- `src/components/LaunchBlueprintRouter.tsx`
- `tests/blueprintExecutionIntelligence.test.ts`
- `tests/blueprintExecutionCopilotContract.test.ts`

Existing guardrails relied upon:

- `src/lib/blueprintExecutionCompletion.ts`
- `src/api/blueprintApiMeasurement.ts`
- `src/api/blueprintExecutionStore.ts`
- `src/components/LaunchBlueprintExecutionHomeV21.tsx`

## Release rule

This amendment is implementation-enabling, not a production release authorization. The branch remains draft/unmerged. Existing Production Roadmap acceptance continues in order. Gate 36 remains the explicit human release decision.
