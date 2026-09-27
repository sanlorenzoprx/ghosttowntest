# GhostTown Sprint Roadmap Autopilot — Implementation Checklist

This document defines the automation machinery required to execute the canonical 17-step GhostTown 30-Day Sprint generation roadmap with human involvement only for genuinely external inputs.

## Automation components

1. **Authoritative human guide** — the holistic 17-step Sprint implementation plan remains the governing product/engineering reference.
2. **Machine-readable roadmap contract** — ordered steps, dependencies, handlers, gates, safety invariants, external-input requirements, and completion evidence.
3. **Persistent roadmap state** — current step, per-step status, attempt count, last good SHA, external-input request, timestamps, and receipts.
4. **Autopilot runner** — validates the contract, executes the current step, verifies its gates, records evidence, advances automatically, and stops only on a classified blocker.
5. **Step handler interface** — one deterministic implementation/verification handler per roadmap step. Known changes should be encoded rather than performed ad hoc.
6. **Gate executor** — runs only the tests/checks required by the current step, then stronger checkpoint/pre-merge gates at the defined milestones.
7. **Failure classifier** — distinguishes internal code failures, transient provider failures, evidence outcomes, and hard external inputs.
8. **External-input protocol** — emits one precise request containing the system/account action required; never asks for secret values in logs or chat.
9. **Resume semantics** — reruns start from persisted state and the last verified corpus/receipt instead of restarting completed work.
10. **Git branch safety** — development remains on `acceptance/fresh-sprint-e2e` until pre-merge gates pass; production auto-deploy remains disabled.
11. **Acceptance deployment safety** — temporary Worker tests must restore the exact captured `main` SHA after success, failure, or cancellation.
12. **Single acceptance concurrency lock** — acceptance workflows cannot deploy over one another.
13. **Provider/cost guardrails** — provider quota and budget conditions are explicit gates; no acceptance condition may be weakened to save cost.
14. **Secret hygiene** — automation records secret names only, never values; artifacts and git diffs are checked before commits.
15. **Evidence receipts** — every step writes a machine-readable receipt with SHA, commands, outcomes, and evidence paths.
16. **Autopilot commits** — successful deterministic changes and state advancement are committed with a dedicated bot-style message and pushed to the working branch.
17. **No self-green rule** — autopilot may repair implementation, but may never bypass the role-based evidence-sufficiency gate, source verification, Strategic Coherence, failing tests, or convert provider failure into founder uncertainty.
18. **Debug/checkpoint/pre-merge modes** — cheap tests during iteration; READY/uncertainty/provider-blocked checkpoint; four-lane matrix only before merge.
19. **PR/merge gate** — no merge until type-check, build, focused regression, artifact audit, source-truth audit, and four-lane acceptance are complete.
20. **Production boundary** — merging code is allowed after roadmap gates; production release/deployment remains a separate explicitly controlled action.
21. **Customer-runtime retries** — 48-hour provider retry/refund behavior belongs in the Cloudflare product Workflow, not in a 48-hour GitHub Actions sleep.
22. **Auditability** — state changes, implementation commits, acceptance artifacts, and final merge SHA must be reconstructible from GitHub.

## State classes

- `RUNNING` — controller can continue without human input.
- `BLOCKED_INTERNAL` — implementation or test failure we control; not a user action.
- `WAITING_EXTERNAL_INPUT` — account, credential, billing, OAuth, provider enablement, or deliberate human approval is required.
- `COMPLETE` — every roadmap step and final gate passed.

## Hard external inputs allowed to stop autopilot

Only actions such as these should become `WAITING_EXTERNAL_INPUT`:

- create/enable an external provider account;
- place a secret in GitHub/Cloudflare;
- approve billing or quota changes;
- complete OAuth/domain/account verification;
- approve a deliberately manual production action;
- perform a specifically declared human artifact review when the roadmap requires human judgment.

TypeScript errors, failing tests, implementation bugs, provider failover logic, query construction, state routing, and ordinary acceptance failures are **not** external inputs.

## Development controller vs. product runtime

The GitHub Roadmap Autopilot builds and validates GhostTown.

The Cloudflare runtime ultimately owns customer-order behavior such as provider circuit breakers, persisted research corpus, delayed retries, and the 48-hour refund safeguard.

Do not make GitHub Actions sleep for customer-order retry windows.

## Current execution order

0. Freeze baseline
1. Repair branch compilation/review plumbing
2. Make canonical harness safe
3. Fix product-specific search construction
4. Preserve product-specific daily strategy
5. Typed research outcomes
6. Provider states and circuit breakers
7. Independent web discovery / Brave
8. Deterministic expansion matrix
9. Adaptive role-gap research
10. Harden review intelligence
11. Produce one genuine READY Sprint
12. READY / uncertainty / provider-blocked checkpoint
13. Four-lane pre-merge acceptance
14. Merge to main
15. Persistence, caching, retries, refund protection
16. Gate hardening and production measurement

The machine-readable contract in `config/sprint-generation-autopilot-v1.json` is the executable representation of this order.

## Step 11 — evidence sufficiency law

Step 11 is complete only when GhostTown has **enough independent evidence, across the right roles, to produce an executable product-specific Sprint**.

The initial evidence-sufficiency contract is:

- at least **3 current verified Customer Access paths** where the intended buyer can actually be reached;
- at least **3 independent verified first-person problem-language observations**;
- at least **2 independent competitive/alternative evidence sources**;
- all three strategic evidence roles must be present: `customer_access`, `problem_language`, and `competitive_alternative`.

There is no universal minimum total-page count. Five high-signal distribution targets plus separately verified review observations can be sufficient when the required roles are covered. Ten weak pages cannot pass merely by reaching a count.

Provider diversity and provider-attempt count remain research-system health signals. They are recorded in receipts and may determine `PROVIDER_BLOCKED` when infrastructure prevents completion, but they are not customer-readiness evidence by themselves.

After role-based research sufficiency passes, the **Strategic Coherence Gate still decides whether the evidence can support a coherent Sprint**. READY therefore requires both evidence sufficiency and executable product-specific strategy; the evidence gate does not substitute for strategy validation.

Adaptive distribution research only repeats work for evidence gaps it can directly improve, such as Customer Access or competitive/alternative coverage. Missing first-person problem language is reported as that specific evidence gap rather than being disguised as a generic request for more pages or more providers.
