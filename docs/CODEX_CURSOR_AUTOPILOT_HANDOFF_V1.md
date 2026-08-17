# GhostTown Codex / Cursor Autopilot Handoff v1.0

**Purpose:** Eliminate repetitive operator copy/paste during GhostTown + Story Studio development while preserving the authoritative contracts, Infrastructure Freeze, acceptance evidence, and Gate 36 human release.

**Repository:** `sanlorenzoprx/ghosttowntest`  
**Local path:** `C:\repos\ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**Primary command:** `npm run roadmap:autopilot`  
**Production release:** NEVER automatic. Gate 36 remains explicit human authorization.  
**Current blocker at handoff creation:** Gate 21 — `ROADMAP_GATE_21_COMMAND` adapter missing.

---

# 1. Operating role

The coding agent is the **development operator**, not the product owner.

It should autonomously perform the repetitive development loop:

```text
read governing contracts
↓
confirm branch / working tree
↓
pull latest branch
↓
run roadmap:status
↓
run roadmap:autopilot
↓
identify exactly one current blocker
↓
inspect authoritative code + evidence
↓
implement the smallest compliant fix or adapter
↓
run focused tests
↓
run broader required validation
↓
commit
↓
push branch
↓
rerun roadmap:autopilot
↓
repeat until human/product/manual boundary
```

The human should be interrupted only for:

- an explicit manual roadmap gate;
- Gate 36 production release;
- secret/account/billing actions that cannot be completed safely by the agent;
- product/visual judgment where the governing contract requires human review;
- a conflict between authoritative contracts;
- a proposed Infrastructure Freeze exception;
- an irreversible external action not already authorized.

Do not ask the human to copy/paste routine hashes, status commands, test outputs, or known receipts when the agent can inspect them directly.

---

# 2. Governing source order

Before substantive work, read in this order:

1. `docs/GHOSTTOWN_COMMERCIAL_QUALITY_AUTOPILOT_DEVELOPMENT_CONTRACT_V1.md`
2. `config/infrastructure-freeze-policy-v1.json`
3. `config/commercial-quality-roadmap-v1.json`
4. `config/production-roadmap-47-gates.json`
5. `docs/STORY_STUDIO_BASELINE_001_OPERATING_CONTRACT.md`
6. authoritative GhostTown Launch Blueprint / canonical contract and source-lock files referenced by the existing verifier
7. current roadmap state in `.roadmap-autopilot/` when available locally

Do not substitute chat summaries for tracked source files.

---

# 3. Non-negotiable safety rules

1. Do not merge PR #7.
2. Do not deploy production.
3. Do not enable production research.
4. Do not bypass or auto-pass Gate 36.
5. Do not create another Stripe purchase to satisfy Gates 21–25. Reuse the existing verified paid acceptance order and receipts.
6. Do not log, print, commit, or echo secret values.
7. Do not weaken canonical validation, provenance, ownership, privacy, red-team, persistence, or release gates merely to make tests pass.
8. Do not renumber Production Gates 1–47.
9. Do not reset `.roadmap-autopilot` state unless a governing migration explicitly requires it.
10. Infrastructure Freeze is active. New architecture requires a valid exception manifest.
11. Fix only the current blocker before moving forward.
12. Preserve working integrations and wrappers unless the current blocker proves they are insufficient.

---

# 4. Model routing policy

Use the lowest-cost model that can reliably complete the task. Escalate only when the task is ambiguous, quality-critical, architectural, or visually demanding.

## GPT-5.6 Luna — Operator / Verifier

Use Luna for deterministic and repetitive work:

- run roadmap/status/test/typecheck/build commands;
- inspect hashes, file existence, receipts, JSON state, and command output;
- make tiny mechanical edits with an exact pattern already present;
- update docs after an already-decided change;
- create straightforward regression tests from an existing nearby test pattern;
- verify generated artifacts and acceptance receipts;
- perform repeated batch checks;
- execute Story Studio observation/status collection once contracts are implemented.

Do **not** use Luna as the sole model for a new quality contract, ambiguous bug, major frontend design decision, or cross-system architecture decision.

## GPT-5.6 Terra — Default Builder

Terra is the default model for most implementation work:

- acceptance adapters such as Gates 21–35;
- API/Worker/TypeScript implementation;
- D1/R2/KV read-only verification logic;
- idempotency and recovery adapters;
- schema implementation from an approved contract;
- Q1/Q2/Q3/Q4/Q5 code once the quality design is explicit;
- refactors that remain inside established architecture;
- React component implementation from an approved design direction;
- tests, fixtures, migration-safe compatibility adapters;
- Story Studio treatment registry, lineage, analytics and experiment-ledger implementation;
- Slice A/B/C production readiness work.

Escalate to Sol if Terra encounters an ambiguous root cause after one disciplined attempt, if multiple contracts conflict, or if the work materially defines product quality.

## GPT-5.6 Sol — Architect / Product-Quality Reviewer

Reserve Sol for the work where better reasoning or design judgment materially affects customer value:

- Q1 Verdict Decision v2 product logic and quality review;
- Q2 30/30 DailyExecutionPacket / DeliverableAsset quality architecture and golden-output review;
- Q3 Blueprint high-value section design and premium document composition strategy;
- Q4 Launch Site direct-response redesign, copy hierarchy, visual hierarchy and browser screenshot critique;
- cross-surface consistency when verdict, Blueprint, daily assets and Launch Site disagree;
- difficult production bugs after normal debugging fails;
- Show/Treatment Portfolio Review;
- definition of the exact ten Baseline 001 treatments;
- interpretation of early Baseline findings where causal/segment reasoning is difficult;
- final quality review before Gates 34–36.

Sol is **overkill** for routine hash checking, running commands, simple acceptance adapters, or obvious test repairs.

## Optional Sol review pattern

For the most important customer-facing slices:

```text
SOL
plan / quality contract / acceptance examples
        ↓
TERRA
implement + tests
        ↓
LUNA
mechanical verification
        ↓
SOL
final quality / design review
```

This is preferred for Q1–Q4 and the Story Studio treatment portfolio.

---

# 5. Phase-by-phase model assignment

| Work | Primary model | Reviewer / escalation | Reason |
|---|---|---|---|
| Gate 21 webhook/idempotency adapter | Terra | Sol only if evidence semantics conflict | Defined backend acceptance work |
| Gate 22 seed/workflow adapter | Terra | Sol only for historical retry ambiguity | Mostly deterministic evidence reconciliation |
| Gate 23 paid provider research adapter | Terra | Sol if candidate semantics conflict | Read-only receipt validation |
| Gate 24 Vertex quality adapter | Terra | Sol for quality-contract ambiguity | Existing Vertex/quality architecture |
| Gate 25 READY Workflow receipt adapter | Terra | Luna verification | Deterministic completion evidence |
| Gates 26–33 | Terra | Luna verification; Sol only for difficult defect | Acceptance/security/recovery implementation |
| Gate 34 visual certification | Sol | Terra implements repairs | Visual/customer-quality judgment |
| Gate 35 acceptance receipt | Luna/Terra | — | Mechanical evidence synthesis |
| Gate 36 | HUMAN | — | Never delegated |
| Q1 Verdict product definition | Sol | Terra implements | Core product reasoning |
| Q1 implementation | Terra | Sol final review | Structured coding after design |
| Q2 DailyExecutionPacket contract | Sol | Terra implements | Highest deliverable-value redesign |
| Q2 30/30 implementation | Terra | Sol golden-output review | Large structured implementation |
| Q3 Blueprint section quality | Sol | Terra implementation | Copy/content/product quality |
| Q3 premium PDF/document engine | Terra | Sol design review | Deterministic rendering after design |
| Q4 Launch Site redesign | Sol | Terra implementation | Frontend aesthetics + direct response |
| Q4 browser repair iterations | Terra | Sol when judgment is needed | Controlled implementation loop |
| Q5 commercial measurement | Terra | Luna verification | Instrumentation and attribution |
| Story Studio Show/Treatment Review | Sol | Human only if product choice remains | High-leverage creative strategy |
| Treatment Registry / lineage | Terra | Luna verification | Structured implementation |
| Slice A/B/C machine readiness | Terra | Luna operational checks | Production pipeline work |
| Baseline 001 production operation | Luna/Terra | Sol not required per item | High-volume execution, not deep reasoning |
| Winner/segment analysis | Terra | Sol for strategic interpretation | Statistical/commercial reasoning |
| Winner mutations / new concepts | Sol + Terra | — | Creative hypothesis + implementation |

---

# 6. Immediate mission — Gate 21

Current roadmap stop:

```text
Gate 21 / Phase 6
Verify signed webhook, duplicate idempotency,
exactly one order, and no premature Workflow

ROADMAP_GATE_21_COMMAND is not configured.
```

## Model

**Primary: GPT-5.6 Terra.**

Sol is not justified unless the existing purchase evidence creates a genuine semantic conflict that cannot be resolved from code and receipts.

## Required outcome

Create a first-party, read-only/safe Gate 21 adapter and wire it as the sanctioned default in the existing roadmap wrapper, following the established Gate 14/15/18/19/20 adapter pattern.

The adapter must prove from the existing acceptance purchase evidence:

1. the Stripe webhook was signed/accepted according to the existing first-party webhook state;
2. duplicate handling is idempotent;
3. the Checkout Session maps to exactly one paid order;
4. the webhook/payment state did not start the Launch Blueprint Workflow before valid seed/domain confirmation;
5. no second charge or second purchase is created;
6. no secret values are printed or written to receipts.

Reuse `.roadmap-autopilot/gate20-purchase.json` and existing acceptance KV/D1/Stripe identifiers where the current code already exposes safe read-only access.

Do not replay a charge. If duplicate-event verification requires replay, use the existing exact event identifier through a safe acceptance-only idempotency path and prove no duplicate order/workflow/charge. Prefer inspection of persisted idempotency evidence when it is sufficient.

## Gate 21 implementation loop

```text
read gate 21 config
read gate 20 verifier
read Stripe webhook handler
read paid-order persistence
read Workflow-start conditions
read acceptance state/receipt formats
↓
design smallest Gate 21 adapter
↓
add regression tests
↓
wire ROADMAP_GATE_21_COMMAND default in wrapper
↓
focused tests
↓
typecheck
↓
run adapter directly
↓
npm run roadmap:autopilot
```

If Gate 21 passes, continue to the next roadmap blocker without human involvement unless one of the interrupt conditions in this document applies.

---

# 7. Gates 22–25 autonomy mandate

After Gate 21, continue autonomously through Gates 22–25 using the **existing successful paid order**.

## Gate 22

Prove seed confirmation, 2–3 valid commercial domains, validation, and the initial Workflow-start semantics. Distinguish the initial Workflow from later legitimate repair/retry runs. Do not classify repair retries as a duplicate purchase or duplicate initial fulfillment start.

**Model:** Terra.

## Gate 23

Prove paid provider research produced the required candidate evidence and provider diversity from existing receipts/runtime records.

**Model:** Terra; Luna can verify counts and receipt hashes.

## Gate 24

Prove Vertex AI Gateway stages, immutable/supplied candidate-ID constraints, 10–25 verified targets, fail-closed validation, and red-team quality behavior using existing successful Workflow evidence.

**Model:** Terra. Escalate to Sol only if the quality semantics in source contracts are ambiguous.

## Gate 25

Prove the Workflow reached READY with complete generation/transition/persistence receipt state.

**Model:** Terra or Luna if the adapter is purely mechanical.

After Gate 25 passes, stop normal production progression before Gate 26 and allow the master roadmap to enter Infrastructure Freeze + Q1 as designed.

---

# 8. Q1 autonomy handoff

When Q1 becomes the current blocker:

## Pass 1 — Sol

Read the Commercial Quality contract and current verdict implementation. Produce an implementation plan that maps every `VerdictDecisionV2` field to existing intake/evidence or a new derived field. Identify compatibility requirements and golden fixtures. Do not code unrelated architecture.

## Pass 2 — Terra

Implement the approved plan inside the existing verdict pipeline, types, API/UI, deterministic validation and tests.

## Pass 3 — Luna

Run focused tests, typecheck, build, acceptance dry-runs and golden-fixture structural checks.

## Pass 4 — Sol

Review actual rendered/user-facing verdicts for specificity, falsifiability, confidence clarity, evidence labeling, first-action usefulness and cross-surface consistency. Return concrete defects; Terra repairs only those defects.

Q1 passes only when the roadmap adapter produces receipt-backed evidence.

---

# 9. Q2 autonomy handoff

Q2 is quality-critical because it converts the Blueprint from advice into execution.

## Sol responsibilities

- define representative excellent Day Packets;
- ensure asset descriptions become finished customer-usable assets;
- review Day 1, 4, 7, 14, 21 and 30 golden outputs;
- check branch rules, evidence requirements, success/failure thresholds and target specificity;
- ensure 30-day flow forms a coherent commercial learning sequence rather than 30 isolated tasks.

## Terra responsibilities

- implement `DailyExecutionPacket`, `DeliverableAsset`, target/action/branch types;
- compatibility mapping;
- generation and validation;
- Today UI copy/open/edit/download controls where applicable;
- 30/30 completeness checks;
- tests and receipts.

## Luna responsibilities

- verify 30/30 packet counts;
- verify non-empty finished assets;
- run deterministic validations/tests/builds;
- compare hashes/receipts and detect regression.

---

# 10. Q3 premium document / 30-day Blueprint

**Sol:** content architecture, section quality, document hierarchy, visual/presentation review.  
**Terra:** HTML/CSS DocumentModel, browser-render integration, persistence/hashing, tests.  
**Luna:** render/check PDFs, file hashes, required sections, repeat-download verification.

Do not spend Sol cycles manually checking hashes.

---

# 11. Q4 web redesign

Use **Sol deliberately here**. It is not overkill.

The Launch Site is a customer-facing conversion surface and the governing problem is visual hierarchy, direct-response copy, offer presentation, imagery, proof, objections and mobile composition—not merely code correctness.

Recommended loop:

```text
SOL
analyze customer / offer / screenshots / current page
→ conversion architecture + design direction

TERRA
implement controlled React/Vite components/templates

LUNA
build + run mechanical browser checks

SOL
review desktop/mobile screenshots
→ concrete visual/copy defects

TERRA
bounded repair
```

Do not create a new website architecture or Container merely for redesign. Stay inside the approved controlled-template/component architecture unless an Infrastructure Freeze exception is approved.

---

# 12. Story Studio development handoff

After Gate 36 human release, follow the Story Studio Baseline contract.

## Show/Treatment Portfolio Review

**Sol.** This is a high-leverage creative/product decision.

Review:

- GhostTown Verdict
- Founder Court
- Build It / Forget It
- Founder Intervention
- GhostTown Rescue
- Killer Assumption
- First Customer
- The $100 Test
- Idea Autopsy
- Customer Says No

Classify canonical shows `KEEP / EVOLVE / REPLACE / MERGE / RETIRE`, then define ten genuinely differentiated Baseline treatments.

## Treatment registry / experiment lineage

**Terra.** Implement exact contracts and versioning.

## Slice A/B/C

**Terra**, with **Luna** handling repetitive operational verification.

## Baseline 001 operations

Do not use Sol for each of 1,000 production units. The point is high-volume controlled exploration. Use the runtime Story Studio production models/providers and use Luna/Terra for development/operator work.

## Learning

Use Terra for normalized analysis and winner classification. Use Sol when interpreting difficult interaction effects, defining winner mutations, or deciding new treatment hypotheses.

---

# 13. Commit / push protocol

After each resolved roadmap blocker:

1. run focused tests;
2. run the minimum broader validation required by the touched surface;
3. ensure no secrets are in diff/logged receipts;
4. verify authoritative source locks still pass;
5. commit with one blocker-focused message;
6. push `feat/launch-blueprint-spa`;
7. rerun `npm run roadmap:autopilot`;
8. continue if the next blocker is agent-solvable.

Do not create a new branch for each roadmap gate unless explicitly requested.

Do not merge.

---

# 14. Stop conditions

Stop and report to the human only when:

```text
MANUAL_GATE
GATE_36_RELEASE
SECRET_OR_ACCOUNT_ACTION_REQUIRED
CONTRACT_CONFLICT
INFRASTRUCTURE_FREEZE_EXCEPTION_REQUIRED
PRODUCT_DECISION_NOT_GOVERNED_BY_SOURCE
VISUAL_HUMAN_REVIEW_REQUIRED
IRREVERSIBLE_EXTERNAL_ACTION
PRODUCTION_MUTATION_REQUESTED
```

A normal test failure, missing adapter, hash mismatch, type error, build error, deterministic regression or acceptance-code bug is **not** a stop condition. Diagnose and repair it.

---

# 15. Suggested one-shot prompt for Codex in Cursor / Codex CLI

```text
You are the autonomous development operator for C:\repos\ghosttowntest on branch feat/launch-blueprint-spa.

Read docs/CODEX_CURSOR_AUTOPILOT_HANDOFF_V1.md first and obey it as the execution handoff. Then read the governing Commercial Quality, Infrastructure Freeze, production-roadmap, canonical Blueprint, and Story Studio Baseline sources referenced there.

Current roadmap blocker is Gate 21: ROADMAP_GATE_21_COMMAND is not configured. Implement the smallest first-party Gate 21 acceptance adapter using the existing successful $97 acceptance purchase evidence. Do not create another purchase. Do not merge. Do not deploy production. Do not reveal secrets. Preserve Gate 36 as manual.

After Gate 21 passes, rerun npm run roadmap:autopilot and continue autonomously through agent-solvable blockers, including Gates 22–25, committing and pushing blocker-focused changes as you go. Stop only at a stop condition defined in the handoff.

For this first mission use GPT-5.6 Terra. Escalate to GPT-5.6 Sol only for a genuine contract/quality ambiguity; use GPT-5.6 Luna for repetitive verification where available.
```

---

# 16. Human role after this handoff

The human should primarily do:

```text
product judgment
visual judgment when requested
external account actions
explicit manual acceptance
Gate 36 production decision
commercial interpretation where strategic choice is required
```

The coding agent should do the terminal/operator work.

That is the purpose of this handoff.
