# GhostTown Launch Blueprint v2.1.10 Change Record

**Change ID:** `GT-BP-2026-09-26-V2.1.10`
**Date:** `2026-09-26`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `fix/copy-language-quality`
**Base canonical version:** `2.1.1`
**Predecessor:** `2.1.9`
**Amendment version:** `2.1.10`

## Product decision

> **Source meaning is authoritative. Customer-facing wording is editable.**

GhostTown corrects obvious spelling, grammar, punctuation, readability, generic-template leakage, and audience mismatch before releasing paid Sprint customer-facing copy.

The final editor targets approximately 8th-grade comprehension and may not change facts, evidence, prices, dates, counts, thresholds, URLs, IDs, execution timing, or strategy.

## Confirmed defects

The paid Sprint comparison confirmed two repeated defects:

1. unrelated Sprints shared too many identical customer-facing text blocks even when their customers and problems were materially different;
2. obvious founder misspellings propagated into polished customer artifacts.

SureDose also exposed B2B discovery language in a consumer medication context.

## Implementation

Production Vertex generation advances from five stages to six:

`evidence_normalization -> strategy_synthesis -> strategic_coherence_gate -> asset_generation -> customer_copy_edit -> red_team_review`

Pipeline version: `vertex-blueprint-staged-v3`.

The copy editor receives the actual customer, buyer, problem, current alternatives, offer, business-model lane, founder-input meaning, and generated surface copy.

Deterministic guards:

- normalize known obvious spelling errors;
- preserve protected prices, percentages, dates/counts, URLs, emails, and numeric constraints;
- preserve all Day 1-30 estimated minutes;
- reject known generic resource-template leakage;
- reject unsupported B2B phrases in consumer copy;
- estimate English readability and fail above grade 10 while prompting the editor toward grade 8.

The deterministic generator applies the same spelling normalization to display text and replaces the known generic resource block with customer/problem-specific language.

## Temporary repository wrapper

`scripts/check-language-quality.mjs` is wired into type-check, tests, builds, and Worker dry-runs.

It has an explicit review/removal date of `2026-10-10`.

A broader local spell scan of tracked docs/source/tests/scripts produced no remaining obvious static-repository errors after excluding legitimate Spanish words and code symbols. No spell-check package was added to repository dependencies.

## Focused validation

- customer copy / Vertex / receipt / deterministic generator: **19 passed, 0 failed**
- real Worker D1/R2/KV persistence: **3 passed, 0 failed**
- TypeScript: **PASS**
- temporary language wrapper: **PASS** after governance examples were normalized

## Preserved boundaries

This change does not:

- mutate historical stored Sprints;
- modify the canonical v2.1.1 base source;
- weaken v2.1.7 Strategic Coherence;
- weaken v2.1.8 research-role separation;
- weaken v2.1.9 recency rules;
- change pricing;
- change the Free Verdict -> Sprint -> Get Me Live journey; or
- authorize production deployment.

**Weakening approved outcomes remains prohibited.**
