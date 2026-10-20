# GhostTown Launch Blueprint v2.1.12 Change Record

**Change ID:** `GT-BP-2026-10-20-V2.1.12`
**Date:** `2026-10-20`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `claude/ghosttown-free-verdict-phase1-rhpnxs`
**Base canonical version:** `2.1.1`
**Predecessor:** `2.1.11`
**Amendment version:** `2.1.12`

## Product decision

> **A Sprint has two languages: the one the founder reads the plan in, and the one their buyers read. Each is written natively in its own language, never translated afterwards. Everything the founder reads explains why it matters.**

Founder decisions of 20 October 2026: every surface works in English and Spanish, and every finding or step carries a brief, plain why.

## Confirmed gap

`founderConstraints.language` was never collected, so every plan, post and message was generated in English. Blueprint stages had no instruction to explain why each step matters.

## Implementation

- `PaidTestIntake.founderLanguage` and `buyerLanguage`, normalized at checkout; `LanguageChoices` asks for both in the intake form.
- `src/lib/blueprintLanguage.ts`: language resolution, the stage instruction and the audit statement.
- Strategy, asset, copy-edit and red-team stages receive the language instruction; strategy and asset stages and community research receive `EXPLAIN_WHY_FOR_DOCUMENTS`.
- Grounded customer-access search prefers Spanish-language communities when buyers speak Spanish.
- The English readability guard runs only when both languages are English.
- The Execution Coach answers in the founder's language.

## Focused validation

- languages, community research, surfaces, Vertex pipeline: **PASS**
- full fast suite: **661 passed**
- TypeScript: **PASS**

## Preserved boundaries

This change does not modify the canonical v2.1.1 base source, weaken any v2.1.7 to v2.1.11 rule, change pricing, mutate stored Sprints, or authorize production deployment.

**Weakening approved outcomes remains prohibited.**
