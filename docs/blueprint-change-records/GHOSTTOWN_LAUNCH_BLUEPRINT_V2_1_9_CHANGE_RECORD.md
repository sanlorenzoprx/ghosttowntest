# GhostTown Launch Blueprint v2.1.9 Change Record

**Change ID:** `GT-BP-2026-09-26-V2.1.9`
**Date:** `2026-09-26`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `fix/strategic-coherence-gate`
**Base canonical version:** `2.1.1`
**Prior amendments:** `2.1.2`, `2.1.3`, `2.1.4`, `2.1.5`, `2.1.6`, `2.1.7`, `2.1.8`
**Amendment version:** `2.1.9`

## Explicit product decision

GhostTown must keep three different dates/concepts separate:

> **Research/access date | underlying evidence date | current-activity verification**

Research performed today does not make old evidence current.

A 2015 article, 2018 conference page, 2022 event record, or 2025 event page may remain useful market, competitor, or historical evidence. It may not become a high-confidence current acquisition route unless a separate check establishes current activity and practical reachability.

## Confirmed defect

The saved SureDose Sprint reproduces the issue:

- a 2018 conference article was labeled `recent` with `high` confidence while its research date was September 25, 2026;
- a 2015 Dosecast article was labeled `active` with `high` confidence while its research date was September 25, 2026;
- a HIMSS 2025 event page was retained with a September 2026 research/access date.

The defect was not retaining old sources. The defect was allowing research/access freshness or backlink freshness to stand in for underlying evidence recency and present-day channel activity.

## Implementation decision

New research records explicitly separate:

- `researchDate` / `accessedAt`;
- `evidenceDate`;
- `evidenceDateSource`;
- `evidenceRecency`;
- `currentActivityStatus`;
- `currentActivityVerifiedAt`;
- `currentActivityEvidence`; and
- evidence `confidence`.

Initial deterministic thresholds:

- 0-90 days: `current`
- 91-365 days: `recent`
- over 365 days: `stale`
- no usable underlying date: `unknown`
- current acquisition activity: independently dated no older than 120 days

## Provider semantics

- DataForSEO backlink `last_seen` proves the backlink is observable, not that the publisher/event/organization is currently active.
- Podcast Index feed last-update time can establish current feed activity.
- YouTube matching-video publication time can establish creator activity for the discovery result.
- Grounded public customer-access pages require real dated page/activity metadata; a year appearing only in a title or URL is not enough.

## Release and strategy protections

The minimum direct-access rule from v2.1.8 now counts only `customer_access` targets with:

- `currentActivityStatus = verified_current`; and
- `currentActivityVerifiedAt` recorded.

Only those targets may drive first revenue, the 48-Hour Launch Card, or Strategic Coherence Gate `access_path` references.

New blocking codes:

- `RESEARCH_MISSING_EVIDENCE_RECENCY_METADATA`
- `RESEARCH_INCONSISTENT_CURRENT_ACTIVITY_CLAIM`

An `active` or `recent` label without independent current-activity verification is a blocking inconsistency.

## Recovery protection

Deterministic recovery now reserves currently verified customer-access candidates before filling remaining target slots by score. Media or market-evidence candidates cannot crowd out the buyer-access minimum after a model-selection failure.

## Customer-facing output

Dashboard, PDF, semantic document model, and ZIP CSV now show:

- Evidence dated
- Evidence recency
- Research checked
- Current activity
- Current activity verification
- Current activity evidence
- Evidence confidence

Historical v2.1 records remain readable. Missing recency fields display as `unknown` / `unverified`; old records are not silently rewritten.

## Implementation surfaces

Changed:

- `src/types/launchBlueprint.ts`
- `src/api/distributionFootprintResearch.ts`
- `src/api/customerAccessResearch.ts`
- `src/api/researchEvidenceRole.ts`
- `src/api/blueprintReleaseQualityGateV21.ts`
- `src/api/launchBlueprintGeneratorV21.ts`
- `src/api/launchBlueprintVertexPipeline.ts`
- `src/api/blueprintDocumentModel.ts`
- `src/api/blueprintDocumentHtml.ts`
- `src/api/blueprintPdfV21.ts`
- `src/api/blueprintAssets.ts`
- `src/components/LaunchBlueprintViewV21.tsx`
- `scripts/verify-blueprint-source.mjs`

Added:

- `src/api/evidenceRecency.ts`
- `tests/evidenceRecency.test.ts`
- `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_9_EVIDENCE_RECENCY_AND_CURRENT_ACTIVITY_AMENDMENT.md`
- `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_9_CHANGE_RECORD.md`
- `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.9-evidence-recency-current-activity-evidence.json`

## Validation

Completed locally before chain promotion:

- focused research / recency / generator / Vertex / release / document / PDF / ZIP / dashboard suite — **77 passed, 0 failed**
- `npx tsc --noEmit` — **PASS**
- production build payload — **PASS**
  - Vite: 78 modules transformed
  - 40 localized discovery routes generated
  - 20 semantic intents verified
- saved SureDose replay — reproduced the 2018 `recent/high` and 2015 `active/high` recency defect without mutating the historical artifact

After v2.1.9 was appended to the evidence chain:

- `npm run verify:blueprint` — **PASS**, chain tip `2.1.9`
- guarded `npm run build` — **PASS**
  - Vite: 78 modules transformed
  - 40 localized discovery routes generated
  - 20 semantic intents verified

The remote Windows command environment required `ComSpec=C:\\Windows\\System32\\cmd.exe` for npm script spawning; without it npm failed before executing the repository script with `ERR_INVALID_ARG_TYPE`. Direct Blueprint verification already passed, and setting `ComSpec` restored normal npm execution without changing repository behavior.

## Preserved boundaries

This change does not:

- delete old evidence merely because it is old;
- equate evidence age with evidence quality;
- claim that current activity proves buyer qualification;
- authorize unsolicited mass outreach;
- change the canonical base Blueprint blob;
- change the $97 Sprint price;
- change the Free Verdict -> Sprint -> Get Me Live journey;
- mutate accepted historical artifacts in place;
- add a new infrastructure provider;
- authorize production deployment; or
- weaken v2.1.8 research-role separation or v2.1.7 Strategic Coherence Gate behavior.

No production deployment is authorized by this change record.

**Weakening approved outcomes remains prohibited.**
