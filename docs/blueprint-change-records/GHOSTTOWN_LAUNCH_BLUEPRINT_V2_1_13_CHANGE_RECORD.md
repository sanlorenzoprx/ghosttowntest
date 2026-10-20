# GhostTown Launch Blueprint v2.1.13 Change Record

**Change ID:** `GT-BP-2026-10-20-V2.1.13`
**Date:** `2026-10-20`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `claude/ghosttown-free-verdict-phase1-rhpnxs`
**Base canonical version:** `2.1.1`
**Predecessor:** `2.1.12`
**Amendment version:** `2.1.13`

## Product decision

> **The fixed parts of the Sprint follow the same two languages as the AI-written parts: what the founder reads is in the founder's language, and what the founder sends to buyers is in the buyers' language.**

Founder decision of 20 October 2026: translate the paid Sprint's fixed parts into Spanish.

## Implementation

- `src/lib/blueprintFixedCopy.ts`: generator, daily-packet and document copy tables.
- `GhostTownLaunchBlueprintV21.languages`, set only when the order supplied a language.
- Generator V21, daily execution packets, document model, HTML, PDF and ZIP read the languages.
- PDF keeps Latin-1 characters with WinAnsi encoding when the Blueprint has Spanish text.
- Sprint screens take the site locale: dashboard, router, execution home, plan view, Coach, uncertainty panel, website evidence, share moment.

## Validation

- English output byte-identical across six fixtures (JSON, document model, HTML, PDF, ZIP).
- full fast suite: **PASS**; Worker runtime: **PASS**; TypeScript: **PASS**.

## Preserved boundaries

No change to the canonical base, the ZIP manifest, validator keys, pricing, stored Sprints, or production.

**Weakening approved outcomes remains prohibited.**
