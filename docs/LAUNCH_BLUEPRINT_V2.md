# GhostTown Launch Blueprint v2.1 — Implementation Summary

## Canonical authority and mandatory preflight

The authoritative product and implementation contract is:

`docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md`

Canonical version: `2.1.0`  
Canonical Git blob SHA-1: `a6dd1fa9e8f59417b7ce00b032eabf3793537abd`

Before any Factory slice, implementation pass, test slice, build, or Worker dry run, execute:

```text
npm run verify:blueprint
```

The verifier fails closed when the canonical source is missing, the exact hash has changed, the authority clause is absent, or the evidence manifest permits weakening the approved customer outcome.

Any amendment requires:

1. A versioned canonical source update.
2. An explicit change record.
3. A regenerated evidence chain.
4. An explicit product decision when the amendment would weaken, remove, substitute, or materially alter the approved customer outcome.

Evidence files:

- `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_CHANGE_RECORD.md`
- `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json`

This file is an implementation summary. It cannot override the canonical contract.

## Purpose

GhostTown Launch Blueprint replaces the generic thirty-day task dump with one complete, executable paid launch product. The customer receives finished strategy, current distribution research, prepared commercial assets, a working Launch Site, and an adaptive thirty-day evidence plan focused on the first meaningful customer commitment.

The system must fail closed when required research, source attribution, canonical validation, storage, or customer assets are incomplete.

## Customer promise

The paid customer receives:

1. A business idea reduced to a testable offer.
2. A clearly identified first customer.
3. A credible path to reaching that customer.
4. A starting-state and prior-evidence audit.
5. A business-model-specific execution lane.
6. An explicit first-revenue path.
7. A manual fulfillment and economics guardrail.
8. Current customer-access and Media & Distribution Network research.
9. Five finished helpful posts and relationship-specific outreach assets.
10. A working, previewable, publishable, and recoverable Cloudflare Launch Site.
11. Exactly thirty adaptive daily actions with evidence and branching rules.
12. Day 7, 14, 21, and 30 evidence checkpoints.
13. A disciplined continue, revise, pivot, pause, or stop decision.
14. A professional PDF, canonical JSON, and finished-assets ZIP saved to the customer account.

The outcome is not a promise that the customer has launched a successful business. The outcome is a focused commercial test with finished assets, recorded behavioral evidence, and a disciplined decision.

## Launch Site invariant

The website is not a separate unrelated bonus.

The Cloudflare Launch Site is the working implementation of the Blueprint’s canonical offer, positioning, pricing, proof boundary, landing-page copy, and lead-capture action. The same canonical Blueprint fields must drive the authenticated SPA, PDF, JSON, downloadable assets, and public Launch Site.

No surface may maintain a separate hand-edited offer, price, positioning, or landing-page version.

## Canonical product structure

The v2.1 contract requires:

1. Executive Launch Decision and 48-Hour Launch Card.
2. Starting-State and Evidence Audit.
3. First-Customer Definition.
4. Offer and Pricing Strategy.
5. First-Revenue and Fulfillment Plan.
6. Customer Access and Distribution Network.
7. Helpful Content Pack.
8. Outreach, Interview, and Sales Pack.
9. Launch Site and Campaign Kit.
10. Adaptive 30-Day Calendar.
11. Evidence Ledger and Checkpoint Reviews.
12. Interview and Evidence Synthesis.
13. Sources, Assumptions, and Generation Receipt.

The customer sees only the execution lane relevant to their business model.

## Evidence hierarchy

The system must prioritize behavioral evidence.

Strong evidence includes payment, deposit, paid pilot, accepted pilot scope, access to data or facilities, meaningful time commitment, or an introduction to a decision maker.

Moderate evidence includes a qualified sales conversation, proposal request, demonstration request, specific buying-process objection, or referral to a qualified buyer.

Early evidence includes qualified replies, interviews, leads, and direct inquiries.

Likes, generic compliments, unqualified waitlist entries, hypothetical interest, and traffic without meaningful action remain weak evidence.

## Canonical contract in code

`src/types/launchBlueprint.ts` remains the current runtime artifact contract and must be extended rather than replaced.

The runtime contract must support the v2.1 product structure while preserving:

- the existing Stripe paid order;
- the existing Cloudflare Workflow binding;
- D1 canonical Blueprint and progress persistence;
- private R2 artifacts;
- current artifact keys and recovery paths;
- the Launch Site lifecycle;
- provider-backed customer-access research;
- the 16-file ZIP acceptance gate until the first successful paid delivery proves a safe expansion path.

Do not create a second schema, second order store, second workflow engine, second paid-product repository, or unrelated provider abstraction.

## Vertex Gemini production role

Gemini must not produce one unrestricted long report.

Use a staged pipeline:

1. Evidence normalization.
2. Strategy synthesis.
3. Asset generation.
4. Independent red-team review.
5. Controlled schema validation.
6. Deterministic rendering from the validated canonical record.

Gemini may rank and explain verified provider candidates, but it must not invent channels, organizations, URLs, contacts, activity claims, participation rules, or customer evidence.

## Fail-closed quality gate

A Blueprint cannot reach `ready` unless it includes:

- one first customer;
- one primary problem;
- one offer;
- one fulfillment method;
- one price hypothesis;
- one first meaningful commitment;
- founder time and budget limits;
- no more than five critical assumptions;
- two or three verified commercial seed domains;
- 10–25 verified distribution targets across at least three categories;
- source, date, confidence, access path, asset, script, risk, and first action for every delivered target;
- exactly five substantive helpful posts;
- required relationship-specific outreach scripts;
- completed landing-page and Launch Site configuration;
- first-revenue brief, interview guide, and offer conversation guide;
- exactly thirty actions with prepared asset, deliverable, success measure, evidence field, and required branching rules;
- workload within the founder’s stated time limit;
- no fabricated testimonials, invented results, fake scarcity, unsupported guarantees, invented contacts, private personal information, or concealed access restrictions;
- Verified, Inferred, or Test truth labels;
- successful D1/R2 persistence;
- PDF, ZIP, Launch Site, repeat download, ownership verification, artifact hashes, and generation receipt.

## Highest-priority implementation work before first paid delivery

1. Extend the canonical runtime schema for the starting-state audit.
2. Add the business-model execution lane.
3. Add the explicit first-revenue path.
4. Add manual fulfillment economics and capacity guardrails.
5. Add the behavioral-evidence hierarchy.
6. Add the 48-Hour Launch Card.
7. Add daily branching rules.
8. Organize the PDF around decisions and execution rather than volume.
9. Use Vertex Gemini staged structured generation with red-team validation.
10. Complete one real Stripe test-mode purchase through the existing Workflow and inspect all artifacts.

## Preserve the current PR #7 architecture

Implemented on `feat/launch-blueprint-spa` and to be preserved:

- canonical Blueprint v2 contract and generator;
- post-purchase competitor-seed confirmation;
- DataForSEO, Podcast Index, and YouTube Media & Distribution research;
- direct public-source verification;
- Gemini ranking constrained to provider candidate IDs;
- Cloudflare Workflow orchestration;
- D1/R2 storage design;
- professional PDF and canonical JSON;
- 16-file finished-assets ZIP;
- authenticated executable Blueprint;
- account history, repeat downloads, progress, metrics, and final decision;
- Launch Site preview, publish/unpublish, lead capture, and owner export;
- owner-only Google research console kept separate from paid fulfillment.

## Production acceptance remains blocked until

1. The isolated acceptance environment is provisioned.
2. Migrations are applied.
3. Required secret names are configured privately.
4. Provider smoke tests pass.
5. One complete Stripe test-mode purchase reaches `ready` through the real Workflow.
6. D1 and private R2 persistence are verified.
7. PDF and the 16-file ZIP are inspected.
8. Launch Site publishing, lead capture, owner export, and unpublishing pass.
9. Account recovery and cross-account denial pass.
10. Controlled provider/storage failure and retry pass without a second charge.
11. The real PDF and public site pass mobile and desktop visual inspection.
12. The production frontend/API domain pair is explicitly selected and recorded.
13. The acceptance receipt is complete and reviewed.

## Current execution documents

Use only these current documents for implementation and acceptance work:

- Canonical product and implementation contract: `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md`
- Environment acceptance handoff: `docs/GHOSTTOWN_ENVIRONMENT_ACCEPTANCE_CURSOR_CODEX_HANDOFF.md`
- Change record: `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_CHANGE_RECORD.md`
- Evidence chain: `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json`

Older Cursor/Codex implementation handoff files are obsolete and must not be restored or referenced.
