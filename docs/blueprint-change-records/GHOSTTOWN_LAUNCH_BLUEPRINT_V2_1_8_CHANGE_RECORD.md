# GhostTown Launch Blueprint v2.1.8 Change Record

**Change ID:** `GT-BP-2026-09-26-V2.1.8`
**Date:** `2026-09-26`
**Repository:** `sanlorenzoprx/ghosttowntest`
**Branch:** `fix/strategic-coherence-gate`
**Base canonical version:** `2.1.1`
**Prior amendments:** `2.1.2`, `2.1.3`, `2.1.4`, `2.1.5`, `2.1.6`, `2.1.7`
**Amendment version:** `2.1.8`

## Explicit product decision

GhostTown must separate four different forms of research before any target can influence execution:

> **Direct Customer Access | Market Evidence | Media / PR | Partnership**

Only **Direct Customer Access** may drive the first-revenue channel or the three approaches on the 48-Hour Launch Card.

This change addresses a confirmed pattern in saved paid Sprints: competitor backlinks, creators, podcasts, publications, events, associations, and similar ecosystem evidence were being presented as if they were practical customer-acquisition channels.

## Why this is required

The v2.1.7 Strategic Coherence Gate correctly established that research evidence and customer access are different concepts, but the underlying research pipeline still concentrated on:

- competitor backlinks;
- podcasts; and
- YouTube creators.

That provider mix was good at proving that a market and ecosystem existed. It was not designed to answer the separate execution question:

> Where is a public route to the intended buyer/payer for a direct conversation or commercial test?

Without an explicit evidence-role contract, list order could cause media targets to become `firstRevenuePath.firstChannel`.

## Implementation decision

Every researched target now receives one deterministic evidence role:

- `customer_access`
- `market_evidence`
- `media_pr`
- `partnership`

The provider/page-derived target type is authoritative for role assignment. The model may rank or explain a target, but may not relabel media or partnership evidence into customer access.

## Dedicated direct-customer-access research

The Distribution Footprint plan now includes two separate grounded customer-access searches in addition to the existing competitor/media research:

- problem-centered public community search;
- buyer-centered public community search.

These searches use the existing Vertex grounded-research path with Google Search and only retain public discussion/community sources.

No new infrastructure provider or orchestration layer was introduced.

## Release and strategy protections

The following are now blocking rules:

- research must retain at least three direct `customer_access` targets;
- `firstRevenuePath.firstChannel` must resolve to a direct customer-access target;
- all three 48-Hour Launch Card approaches must resolve to direct customer-access targets;
- Strategic Coherence Gate `access_path` channel references must resolve only to direct customer-access targets.

Media, market, and partnership targets remain available as supporting strategy evidence and opportunities.

## Customer-facing output

The Blueprint dashboard and PDF now group researched targets as:

1. Direct Customer Access
2. Market Evidence
3. Media / PR Opportunities
4. Partnership Opportunities

The existing ZIP CSV filename is preserved for artifact compatibility, while two authoritative columns are added:

- `evidence_role`
- `role_boundary`

## Historical falsification

Saved paid-Sprint outputs were replayed through the deterministic role classifier.

### Longevity / health Sprint

- 12 researched targets
- 0 direct customer-access targets
- 7 media / PR
- 3 partnership
- 2 market evidence
- original first-revenue target: podcast
- v2.1.8 outcome: blocked

### SureDose Sprint

- 12 researched targets
- 0 direct customer-access targets
- 9 media / PR
- 3 partnership
- original first-revenue target: YouTube creator
- v2.1.8 outcome: blocked

The old outputs therefore reproduce the exact defect this amendment is intended to prevent.

## Implementation surfaces

Changed:

- `src/types/launchBlueprint.ts`
- `src/api/customerAccessResearch.ts`
- `src/api/distributionFootprintResearch.ts`
- `src/api/blueprintReleaseQualityGateV21.ts`
- `src/api/launchBlueprintGeneratorV21.ts`
- `src/api/launchBlueprintVertexPipeline.ts`
- `src/api/blueprintDocumentModel.ts`
- `src/api/blueprintPdfV21.ts`
- `src/api/blueprintAssets.ts`
- `src/components/LaunchBlueprintViewV21.tsx`

Added:

- `src/api/researchEvidenceRole.ts`
- `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_8_RESEARCH_ROLE_AND_CUSTOMER_ACCESS_AMENDMENT.md`
- `docs/blueprint-change-records/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_8_CHANGE_RECORD.md`
- `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1.8-research-role-customer-access-evidence.json`

## Validation

Completed locally on the governed branch:

- `npx tsc --noEmit` — PASS
- focused research / generator / Vertex / release / document / PDF / ZIP suite — 63 passed, 0 failed
- dashboard / customer-access / release regression — 53 passed, 0 failed
- historical saved-Sprint deterministic role replay — both previously accepted examples fail the new direct-customer-access requirement
- `npm run verify:blueprint` — PASS at evidence-chain tip v2.1.8
- `npm run build` — PASS, including Vite production build plus 40 generated discovery routes and their verification

## Preserved boundaries

This change does not:

- change the canonical base Blueprint blob;
- change the $97 Sprint price;
- change the Free Verdict -> Sprint -> Get Me Live journey;
- discard market/media/partnership evidence;
- create lists of private individuals;
- authorize mass unsolicited outreach;
- alter accepted historical artifacts in place;
- authorize production deployment; or
- weaken v2.1.7 Strategic Coherence Gate behavior.

No production deployment is authorized by this change record.

**Weakening approved outcomes remains prohibited.**
