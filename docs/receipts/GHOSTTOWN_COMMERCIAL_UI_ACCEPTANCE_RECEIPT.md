# GhostTown Commercial UI Acceptance Receipt

Status: **COMMERCIAL LANDING UI REVIEWED / READY TO FREEZE**

Scope: the commercial acquisition surface on the authoritative GhostTown v2.1.1 acceptance branch. This receipt does **not** mark Production Roadmap Phase 10 complete; Phase 10 still requires visual certification across the complete paid journey after the acceptance environment and paid flow are available.

## Authoritative line

- Branch: `feat/launch-blueprint-spa`
- Product UI render head: `f48120597ee1dde297ac74ecfebae21d2784ddf9`
- Branch head before this receipt: `30a85b588d9527481029b5423c2a3705451011d8`
- PR: `#7`
- Production deploy: disabled

## User-reported UI issues closed

1. **The Cost image**
   - Replaced the older-couple/credit-card concept with an older woman at a table using a laptop.
   - Rendered image load is asserted by the visual-smoke workflow.

2. **Carousel title numbering**
   - Customer-facing English titles are: `The Idea`, `You Start`, `More Work`, `The Problem`, `The Reality`, `The Cost`, `Clarity`.
   - Numeric position is retained only for internal carousel navigation/accessibility.

3. **Ambiguous TEST NOW language**
   - `TEST NOW`, `Offer a simple pilot`, and `real commitment` are regression-blocked.
   - The free verdict uses `PROVE THEY'LL PAY` with the concrete instruction: `Ask likely customers to pay for a simple version before you build more.`
   - The carousel verdict uses `NEXT STEP` with: `Ask a few likely customers to buy a simple version before you build it.`

4. **Typography / contrast**
   - Supporting explanatory copy is rendered at 16px or larger in the audited commercial sections.
   - Recorded rendered measurements at 390px width:
     - hero body: 20px
     - verdict body: 18px
     - example body: 18px
     - proof body: 16px
   - Dark-section supporting copy and warm-background explanatory copy were strengthened for readability.

## Additional visual defects caught during review

Rendered tablet review exposed a real header collision at 768px: the centered Ghost Town Test wordmark overlapped the navigation. The header was changed from absolute-positioned navigation to a responsive stacked/grid layout and the visual-smoke workflow now rejects brand/navigation overlap.

Rendered mobile review also exposed founder-carousel min-content clipping. The carousel was constrained to the viewport and its controls were compacted while retaining visible keyboard focus and touch-sized vertical targets.

## Rendered visual evidence

GitHub Actions workflow: `UI Visual Smoke`

Successful rendered run: `31887447242`

The run builds the application, starts the built Vite app, renders it in Chromium, asserts no horizontal overflow, asserts the header does not overlap, verifies the Cost image loads, blocks TEST NOW regression, verifies supporting copy size, and uploads screenshots.

Hero viewport coverage:

- 375×667
- 390×844
- 768×1024
- 1366×768
- 1440×900

Additional rendered captures:

- The Cost at 1366×768
- verdict at 1366×768 and 390×844
- example ideas at 1366×768 and 390×844
- proof section at 1366×768 and 390×844

## Regression protection

`tests/commercialUiContract.test.ts` locks the user-requested corrections and the responsive-header contract.

## CI evidence

Current product/test head CI run before this documentation-only receipt: `31887590921` — PASS

Passed gates:

- canonical Blueprint verification
- TypeScript
- tests
- Cloudflare Worker check
- acceptance Worker dry-run
- production build
- UI build artifact upload
- repository diff check

## Decision

Freeze the commercial landing UI unless a later acceptance test reveals a customer-flow defect. Continue next with the Production Roadmap acceptance critical path. Do not merge to `main` or deploy production from this receipt.
