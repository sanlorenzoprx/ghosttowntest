# GhostTown Launch Blueprint v2.1.11 Change Record

**Change ID:** `GT-BP-2026-10-20-V2.1.11`
**Date:** `2026-10-20`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `claude/ghosttown-free-verdict-phase1-rhpnxs`
**Base canonical version:** `2.1.1`
**Predecessor:** `2.1.10`
**Amendment version:** `2.1.11`

## Product decision

> **GhostTown reads the communities it found and keeps customer problems only in the customers' own words, linked to the page they came from.**

Founder decision of 20 October 2026: build the customer research loop into the product so the 30 days start from what likely customers actually say. The research is how GhostTown makes the website and outreach materials; it does not change the First 30 offer.

## Confirmed gap

Customer-access research verified that each community was relevant and current, then discarded the page text. Posts and messages were written per relationship type, not per community, and the asset stage never saw what customers said.

## Implementation

- `src/api/communityProblemResearch.ts` reads up to six current customer-access communities, asks Vertex (task `grounded_research`, no search) to group quotes into problems, and keeps only quotes that appear word for word on the linked page.
- New durable workflow step: `read customer communities and keep source-linked problems`, between research finalization and the canonical draft.
- Canonical field `communityResearch` (`ghosttown-community-problem-research-v1`).
- The asset-generation stage receives `customerResearch`: problems, customer words, contradicting words and each community's promotion rule.
- Dashboard card, document-model section `customer_problems`, and a section leading `helpful-posts.md`. The 16-file ZIP manifest is unchanged.

## Focused validation

- community research, surfaces, customer access, Vertex pipeline, assets, document model, PDF, AI architecture: **47 passed, 0 failed**
- full fast suite: **PASS**
- Worker runtime suite: **PASS**
- TypeScript: **PASS**

## Preserved boundaries

This change does not:

- modify the canonical v2.1.1 base source;
- weaken the v2.1.7 Strategic Coherence gate;
- weaken v2.1.8 research-role separation or its three-target release requirement;
- weaken v2.1.9 recency rules;
- weaken v2.1.10 copy integrity;
- change pricing or the ZIP file list;
- mutate stored Sprints; or
- authorize production deployment.

**Weakening approved outcomes remains prohibited.**
