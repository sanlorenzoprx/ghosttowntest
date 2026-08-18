# GhostTown Launch Blueprint v2.1.5 — Calendar-Primary Execution Amendment

**Amendment version:** `2.1.5`  
**Change ID:** `GT-BP-2026-08-18-V2.1.5`  
**Base canonical contract:** `2.1.1`  
**Predecessor amendment:** `2.1.4`

## Product decision

The 30-Day Calendar is the primary execution interface for the paid GhostTown Launch Blueprint.

The customer must not have to reconstruct execution from a PDF or folder of files. The paid account experience brings forward the current or selected day's exact objective, reason, target, action, quantity, prepared asset, expected outcome, success threshold, failure threshold, evidence requirement, branch rule, estimated effort, and completion definition.

The canonical Blueprint, PDF, JSON, ZIP, D1/R2 artifacts, integrity receipts, and evidence history remain preserved. The PDF and asset bundle remain durable exports and recovery artifacts; they are not the primary day-to-day interaction model.

## Customer execution contract

The intended operating flow is:

```text
Open paid Blueprint
→ 30-Day Execution Calendar
→ current / selected day
→ exact actions + targets
→ prepared assets in context
→ execute
→ record evidence
→ evaluate success / failure threshold and branch rule
→ complete day only when the execution contract is satisfied
→ next action / checkpoint
```

All thirty days remain directly viewable. Previewing future work does not waive the sequence or evidence requirements for completion.

Day 7, 14, 21, and 30 are evidence checkpoints. Their questions, required evidence, and decision branches are surfaced in the execution flow. A checkpoint is not decorative; progression must preserve its evidence review.

Prepared assets remain independently openable, readable, editable as customer working copies, copyable, and exportable when their canonical capability contract permits it. Customer edits never silently overwrite canonical Blueprint content.

## Execution integrity

A day may not be treated as complete merely because the founder clicked a button. Deterministic software must preserve the difference between a displayed completion definition and an actually satisfied completion contract.

The account progress system therefore remains authoritative for:

- completed-day state;
- structured evidence and execution notes;
- checkpoint reviews;
- working asset copies;
- reminder state;
- objective commercial metrics that can be derived safely;
- persistence/recovery state.

Recorded customer behavior remains stronger evidence than engagement with the GhostTown UI itself.

## Commercial positioning

The paid product is positioned as a guided 30-day idea-to-evidence execution system, not as a PDF plus a folder of files.

The customer promise is:

> Open today's work, use the prepared assets, record what happened, and let the evidence determine what happens next.

## Preserved boundaries

This amendment does not alter:

- the $97 price or Stripe fulfillment contract;
- the canonical base Blueprint source;
- the v2.1.1 schema/evidence architecture;
- the v2.1.2 Vertex + Cloudflare AI Gateway architecture;
- the v2.1.3/v2.1.4 Custom Website separation and Cloudflare SPA manufacturing contract;
- paid-order ownership protections;
- D1/R2 artifact identity;
- truth-label and evidence rules;
- Launch Site boundaries;
- the prohibition on automatic production release;
- Gate 36 as an explicit human production-release decision.

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment.

**Weakening approved outcomes remains prohibited.**
