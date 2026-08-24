# GhostTown Cursor / DeepSeek Handoff — Gate 31 through Gate 36

## Purpose

Resume the existing GhostTown Production Roadmap Autopilot from **Gate 31**, finish the remaining automated GhostTown acceptance work through **Gate 35**, and then stop at **Gate 36**, which is intentionally a human-only production-release decision.

This handoff is for Cursor Agent using the newest DeepSeek / DeepSeek Flash model already available in the operator's Cursor installation. Do **not** spend roadmap time changing Cursor model-provider plumbing. The repository and acceptance evidence are the task; the coding model is only the implementation tool.

---

## Repository coordinates

- GitHub repository: `sanlorenzoprx/ghosttowntest`
- Local repository: `C:\repos\ghosttowntest`
- Required branch: `feat/launch-blueprint-spa`
- Draft PR: `#7` — `Finish and accept the evidence-led GhostTown Launch Blueprint v2.1`
- Base branch: `main`
- Known implementation head immediately before this handoff document was added: `bfe24e3cfb68d0b8f9a9f911060e52b2895b4e14`
- The handoff document itself advances the remote branch, so always run `git pull --ff-only origin feat/launch-blueprint-spa` and treat the pulled branch head as authoritative.

### Required initial commands

```powershell
cd C:\repos\ghosttowntest

git status --short
git branch --show-current
git pull --ff-only origin feat/launch-blueprint-spa
git rev-parse HEAD

npm run roadmap:status
```

Expected branch:

```text
feat/launch-blueprint-spa
```

Do not switch branches, merge, rebase, or deploy production.

---

## Operator state at handoff

The operator has reported that Production Roadmap Autopilot has successfully advanced past Gate 30 and is now at **Gate 31**.

Treat the operator's local `.roadmap-autopilot/` state and receipts as authoritative acceptance evidence. The directory is intentionally gitignored and exists only on the operator machine.

### Critical rule

**DO NOT RUN:**

```powershell
npm run roadmap:reset
```

Do not delete `.roadmap-autopilot/` and do not reconstruct prior gates from scratch.

Gates 1–30 are historical accepted state for this continuation unless the current Autopilot state explicitly says otherwise.

---

## Immediate next command

After reading this handoff and the governing repository sources, run:

```powershell
npm run roadmap:autopilot
```

The governing execution loop is:

1. Run Autopilot.
2. Read the **exact first blocker**.
3. Fix only that blocker.
4. Add or update a focused regression guard for the blocker when appropriate.
5. Run the smallest relevant test set.
6. Rerun `npm run roadmap:autopilot`.
7. Repeat until Gate 35 is PASS.
8. Stop when Gate 36 requests the human production-release decision.

Do not batch speculative architecture changes across future gates.

---

# Hard safety constraints

These constraints are non-negotiable.

1. **Do not merge PR #7.**
2. **Do not deploy production.**
3. **Do not authorize Gate 36.** Gate 36 is human-only.
4. **Do not make another Stripe purchase.** The required Gate-20 $97 test purchase already exists.
5. **Do not replay purchase, research, or Vertex generation merely to satisfy a later acceptance gate.** Reuse accepted evidence wherever the gate permits.
6. **Do not rerun Gate-28 artifact rematerialization** unless a new concrete integrity failure proves the accepted R2 artifacts themselves are invalid.
7. **Do not reset Autopilot state.**
8. **Do not log secrets, passwords, JWT values, Stripe keys, Vertex private keys, or other secret values.** Secret *names* may be recorded; secret values may not.
9. **Do not place credentials in source files, command strings committed to git, receipts, console output, PR comments, or handoff documentation.**
10. **Production research remains disabled until explicit production release.**
11. Acceptance-only mutations must remain within the gate's declared `mutation_scope`.
12. Never weaken an approved customer outcome merely to make a gate pass.
13. Do not hide a real defect by changing assertions unless the source contract proves the failing field is non-durable/derived/volatile.
14. Prefer existing first-party routes, stores, helpers, bridges, receipts, and tests. Do not introduce parallel providers or duplicate product paths.

---

# Authoritative product / Blueprint governance

Before materially changing Blueprint behavior, read:

1. `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md`
2. `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_5_CALENDAR_PRIMARY_EXECUTION_AMENDMENT.md`
3. `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_6_EXECUTION_INTELLIGENCE_AMENDMENT.md`
4. `docs/blueprint-evidence/ghosttown-launch-blueprint-v2.1-evidence-chain.json`
5. `config/production-roadmap-47-gates.json`

Canonical base:

- contract version: `2.1.1`
- canonical Git blob SHA-1: `616c691e6b4c9cea93615963a07375d13ffba57f`

Current extension chain includes:

- v2.1.2 Vertex/platform
- v2.1.3 Custom Website separation
- v2.1.4 Cloudflare SPA templates
- v2.1.5 Calendar-primary execution
- v2.1.6 Execution Intelligence

Governing rule:

> Weakening approved outcomes remains prohibited.

The 30-Day Calendar is the primary paid execution interface. PDF/ZIP are secondary durable exports. Custom Website remains a separate post-Blueprint product and is not part of the $97 Blueprint fulfillment path.

---

# Commercial priority

GhostTown is not an architecture exercise. The business priority is:

1. visitors
2. tests started
3. verdicts completed
4. paid Blueprints
5. revenue
6. Story Studio videos published
7. qualified clicks

Do not expand ACS or internal architecture unless it directly clears the current acceptance blocker or creates measurable customer/business value.

---

# Acceptance environment identities

Use only the existing acceptance resources.

## Worker / Pages

- Acceptance Worker: `https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev`
- Acceptance Pages: `https://ghosttown-acceptance.pages.dev`

## Cloudflare acceptance resources

- Account ID: `a5cf89bcebf34090a11f016c07967458`
- D1 name: `ghosttowntest-blueprints-acceptance`
- D1 ID: `9863d883-3c31-4268-9a98-8392fa3b9f8f`
- R2 bucket: `ghosttowntest-private-blueprints-acceptance`
- KV namespace ID: `849e13521d454361aea286b8e1a5e4c7`
- KV title: `ghosttown-acceptance`
- Workflow: `ghosttown-launch-blueprint-acceptance`
- Workflow script: `lit-ghost-town-api-acceptance`

Do not substitute production resources.

---

# Accepted local evidence that must be preserved

The operator's `.roadmap-autopilot/` directory contains the acceptance chain. Important files include, as applicable:

- `state.json`
- `latest-report.json`
- `gate20-purchase.json`
- `gate26-canonical-d1-artifacts-receipt.json`
- `gate27-private-r2-artifacts-receipt.json`
- `gate28-artifact-rematerialization-receipt.json`
- `gate29-launch-site-lead-receipt.json`
- `gate30-second-device-recovery-receipt.json`

Do not commit these files. Do not delete them.

### Gate 20

A real **Stripe TEST-mode** $97 purchase has already been completed and verified. No second purchase is allowed.

### Gate 26

Canonical D1 order/Blueprint/progress/evidence/checkpoint state was accepted.

### Gate 27

Private R2 JSON/PDF/ZIP identity, privacy, exact-byte hashes, and repeat reads were accepted.

### Gate 28

All 16 ZIP files and required premium PDF sections passed. Historical PDF/ZIP bytes were rematerialized once under the controlled acceptance repair path; do not repeat that process unless new artifact-integrity evidence requires it.

### Gate 29

Launch Site publish → public URL → consented lead capture → owner view → CSV export → unpublish passed. Gate 29 left the site `unpublished`.

### Gate 30

Second-device/account recovery has advanced successfully enough for Autopilot to move to Gate 31. The acceptance account password may have been reset locally during Gate-30 recovery. Do not try to recover or print the prior plaintext password. Do not repeat the password reset unless a concrete authentication blocker requires it.

---

# Gate 30 implementation history — important context, not current work

Files created during Gate-30 recovery include:

- `scripts/roadmap-gate30-second-device-recovery.mjs`
- `scripts/roadmap-gate30-second-device-recovery-v2.mjs`
- `scripts/roadmap-gate30-second-device-recovery-v3.mjs`
- `scripts/roadmap-gate30-acceptance-password-reset.mjs`
- associated Gate-30 regression tests

The source exposed volatile read-time timestamps in progress normalization. Do not reopen this work unless Gate 31+ produces concrete evidence that it remains relevant.

---

# Current roadmap position

From `config/production-roadmap-47-gates.json`:

## Gate 31 — CURRENT

- ID: `31`
- Phase: `8`
- slug: `cross-account-security`
- title: **Verify cross-account access/mutation/download/export/retry denials**
- mode: `hook`
- mutation scope: `none`
- requires user input: `false`
- hook env: `ROADMAP_GATE_31_COMMAND`

## Gate 32

- title: **Force provider failure and prove fail-closed retry without a second charge**
- mutation scope: `acceptance`
- hook env: `ROADMAP_GATE_32_COMMAND`

## Gate 33

- title: **Force R2 failure and prove persistence recovery without duplicate order/charge**
- mutation scope: `acceptance`
- hook env: `ROADMAP_GATE_33_COMMAND`

## Gate 34

- title: **Certify the full paid journey at 375x667, 390x844, 768x1024, 1366x768, and 1440x900**
- mutation scope: `none`
- requires user input: `true`
- hook env: `ROADMAP_GATE_34_COMMAND`

Do not waive the `requires_user_input` classification. Automate what can be automated, but if genuinely non-resolvable operator input is required, surface the exact requirement without exposing secrets.

## Gate 35

- title: **Generate authoritative GhostTown acceptance receipt with secret names only**
- mutation scope: `none`
- hook env: `ROADMAP_GATE_35_COMMAND`

## Gate 36 — HARD STOP

- title: **Explicit GhostTown production-release decision and controlled release**
- mode: `manual`
- mutation scope: `production`
- requires user input: `true`

Autopilot must stop here. Cursor must not approve, simulate approval, merge, or deploy production.

---

# Gate 31 source contract

Start with the existing owner-boundary regression:

`tests/blueprintOwnershipV21.test.ts`

It already proves privacy-safe cross-account `404` denials for:

- open Blueprint
- PDF download
- ZIP download
- technical JSON download
- progress read
- progress mutation
- Launch Site publish
- Launch Site unpublish
- owner lead view
- lead CSV export
- Blueprint retry

The test also verifies the denial body does **not** leak:

- owner email
- order ID
- Stripe checkout session ID
- R2 details
- site ID
- lead count
- source verdict identity

Relevant runtime owner check:

`src/api/blueprintApi.ts` → `ownedLaunchBlueprintOrder(...)`

A non-owner must receive privacy-safe `404`, not ownership details.

Relevant routes are in `src/api/index.ts`:

```text
GET  /api/paid-test/orders/:orderId/blueprint
GET  /api/paid-test/orders/:orderId/blueprint.json
GET  /api/paid-test/orders/:orderId/blueprint.pdf
GET  /api/paid-test/orders/:orderId/blueprint-assets.zip
GET  /api/paid-test/orders/:orderId/blueprint/progress
POST /api/paid-test/orders/:orderId/blueprint/progress
POST /api/paid-test/orders/:orderId/blueprint/retry
GET  /api/paid-test/orders/:orderId/launch-site
POST /api/paid-test/orders/:orderId/launch-site/publish
POST /api/paid-test/orders/:orderId/launch-site/unpublish
GET  /api/paid-test/orders/:orderId/launch-site/leads
GET  /api/paid-test/orders/:orderId/launch-site/leads.csv
```

### Gate 31 implementation rule

Do not merely set `ROADMAP_GATE_31_COMMAND` to `exit 0` or waive the gate.

Build the smallest sanctioned adapter that proves the actual cross-account contract while honoring `mutation_scope: none`.

Prefer this order of evidence:

1. Existing first-party handler/runtime owner-boundary tests.
2. Source contract checks proving every customer artifact/state route is routed through the owner check.
3. Live acceptance HTTP proof if it can be performed without violating `mutation_scope: none` or requiring new secret persistence.

Do **not** create or mutate acceptance accounts solely to manufacture a Gate-31 token if that contradicts the gate's `none` mutation scope. If live cross-account authentication cannot be obtained read-only from existing accepted state, prove the invariant through the first-party deterministic test/runtime boundary and record that limitation explicitly rather than secretly mutating acceptance.

A Gate-31 receipt should state what was tested, expected denial status, information-leak checks, mutation performed `false`, production deployed `false`, and secret values recorded `false`.

Then register the adapter in `scripts/roadmap-autopilot-wrapper.mjs` using the same sanctioned-command pattern already used for Gates 14–29, unless an existing explicit environment adapter is more appropriate.

Add a focused regression test preventing future wrapper/adapter drift.

---

# Gate 32 guidance — provider failure/retry

Do not implement this until Gate 31 passes and Autopilot reports Gate 32 as the active blocker.

Requirements from the gate title:

- deliberately force provider failure in **acceptance only**;
- prove the system fails closed;
- prove retry behavior is bounded/idempotent;
- prove there is **no second Stripe charge**;
- do not make a new checkout purchase;
- do not mutate production;
- restore acceptance configuration after the test;
- leave receipt-backed evidence.

Prefer an acceptance-scoped failpoint/wrapper or existing test seam rather than changing the production product contract. Any temporary acceptance Worker/configuration must be restored in `finally` and verified restored before PASS.

Use the existing Gate-20 purchase/session evidence to prove payment identity/count where possible. A forced failure must not replay the purchase.

---

# Gate 33 guidance — R2 failure/retry

Do not implement until Gate 32 passes and Autopilot reports Gate 33.

Requirements:

- force an R2 persistence failure in **acceptance only**;
- prove no duplicate order;
- prove no duplicate charge;
- prove recovery/persistence retry behavior;
- verify exact accepted artifact integrity after recovery;
- restore any temporary acceptance failpoint/configuration;
- no production mutation.

Do not automatically reuse the historical Gate-28 rematerialization path. Gate 33 is a failure/recovery acceptance test, not permission to rewrite accepted artifact bytes. Preserve the Gate-27 exact hashes unless the explicit Gate-33 contract requires an isolated test fixture/order.

---

# Gate 34 guidance — full visual certification

Do not implement until Gate 33 passes.

Required exact viewport sizes:

- `375x667`
- `390x844`
- `768x1024`
- `1366x768`
- `1440x900`

Use Playwright and the real paid-journey UI/acceptance environment wherever possible.

Certification should cover the actual paid journey and not only a static Launch Site. Preserve truthful fulfillment states, authentication, dashboard, Calendar-primary Blueprint execution, artifact access, and Launch Site controls.

Do not lower accessibility/responsive requirements to get a PASS.

Gate 34 is marked `requires_user_input: true`. If authentication/input is required, request only the minimum local operator input and never print/store the secret value.

---

# Gate 35 guidance — authoritative acceptance receipt

Do not implement until Gate 34 passes.

Generate one authoritative machine-readable GhostTown acceptance receipt that:

- references the canonical Blueprint/version/hash chain;
- summarizes Gates 1–35 from the actual local roadmap state;
- includes acceptance environment/resource identities;
- includes relevant receipt paths/hashes;
- records **secret names only**, never secret values;
- records that production deployment remains disabled;
- records Gate 36 as pending human decision;
- does not claim Story Studio Gates 37–47 have run;
- fails closed if required prior gates are not PASS.

Do not merge or deploy production after generating the receipt.

---

# Autopilot wrapper pattern

Current wrapper:

`scripts/roadmap-autopilot-wrapper.mjs`

It already provides repo-owned sanctioned adapters through Gate 29. Gate 30 was supplied explicitly during recovery. Gates 31+ are not yet generally registered.

When a new repo-owned adapter is accepted:

1. define its path as a constant;
2. create a `sanctionedGateXXCommand` with operator env override first and repo-owned default second;
3. pass it through `childEnv()`;
4. keep the command free of secret values;
5. add a regression assertion that the wrapper exposes the sanctioned adapter;
6. do not preconfigure unsafe future production hooks.

Do not auto-wire Gate 36.

---

# Validation policy

For each blocker, use the smallest sufficient validation first.

Typical sequence:

```powershell
node --check scripts/<new-adapter>.mjs
npx vitest run tests/<focused-regression>.test.ts tests/<existing-relevant-contract>.test.ts
npm run roadmap:autopilot
```

Use broader regression only when the change touches shared product/runtime behavior:

```powershell
npm run regression:blueprint-upgrade
```

Do not run large suites reflexively after every adapter-only change if the focused contract is sufficient.

Before any substantial product-code change, also run:

```powershell
npm run verify:blueprint
```

---

# Existing high-value files

## Roadmap / orchestration

- `config/production-roadmap-47-gates.json`
- `scripts/production-roadmap-autopilot.mjs`
- `scripts/roadmap-master-autopilot.mjs`
- `scripts/roadmap-autopilot-wrapper.mjs`
- `scripts/roadmap-windows-spawn-compat.cjs`

## Acceptance bindings / receipts

- `scripts/roadmap-r2-binding-bridge.mjs`
- `scripts/roadmap-r2-binding-worker.ts`
- Gate 20–30 adapters and tests under `scripts/` and `tests/`

## Blueprint customer API

- `src/api/blueprintApi.ts`
- `src/api/blueprintStore.ts`
- `src/api/blueprintStoreV21.ts`
- `src/api/blueprintExecutionStore.ts`
- `src/api/launchSite.ts`
- `src/api/index.ts`
- `src/api/auth.ts`

## Execution UI / intelligence

- `src/components/LaunchBlueprintExecutionHomeV21.tsx`
- `src/components/LaunchBlueprintViewV21.tsx`
- `src/lib/blueprintExecutionCompletion.ts`
- `src/lib/blueprintExecutionIntelligence.ts`
- `src/api/executionAIService.ts`

## Existing regression anchors

- `tests/blueprintOwnershipV21.test.ts`
- `tests/blueprintRecoveryV21.test.ts`
- `tests/blueprintProgressV21.test.ts`
- `tests/blueprintExecutionArchitecture.test.ts`
- `tests/gate28ArtifactRematerialization.test.ts`
- Gate 29/30 focused roadmap tests
- `tests/productionRoadmapAutopilot.test.ts`

---

# Important architecture boundaries

## Generative path

The approved generative path remains:

```text
Cloudflare Worker
  -> GenerativeAIService
  -> Cloudflare AI Gateway
  -> Google Vertex AI
```

Do not add a second production generative provider while clearing acceptance gates.

Execution Intelligence model slots include:

- `fast_assistant`
- `strategy_reasoner`
- `critic`
- `grounded_research`

Deterministic software remains authoritative for payments, ownership, evidence, completion, branch permissions, state transitions, hashes, acceptance, and release.

## Storage

- D1 = canonical Blueprint/progress/evidence/checkpoint persistence
- private R2 = JSON/PDF/ZIP artifacts
- KV = user/order/pointers/integrity and bounded operational state
- Workflow = Launch Blueprint fulfillment workflow

Respect existing ownership and storage contracts.

---

# What NOT to do

Do not:

- restart from Gate 1;
- reset state;
- make another Stripe purchase;
- merge PR #7;
- deploy production;
- approve Gate 36;
- replace Vertex with another provider;
- rebuild accepted PDF/ZIP without evidence;
- turn Gate adapters into general architecture projects;
- disable assertions merely to get green;
- store passwords/tokens in git;
- treat stderr from deterministic local fallback tests as a failure unless the test assertion actually fails;
- broaden work into Story Studio Gates 37–47 before the human Gate-36 decision.

---

# Definition of done for this Cursor session

Success means:

1. Gate 31 PASS.
2. Gate 32 PASS.
3. Gate 33 PASS.
4. Gate 34 PASS, with any genuinely required operator input handled securely and explicitly.
5. Gate 35 PASS and authoritative GhostTown acceptance receipt generated.
6. Autopilot reaches Gate 36 and stops for explicit human production-release authorization.
7. PR #7 remains draft/open/unmerged.
8. Production remains untouched.
9. No second Stripe purchase occurred.
10. No secret values were committed or logged.

At that point, report:

- final branch head;
- Gates 31–35 PASS evidence/receipt paths;
- focused tests run and results;
- any acceptance-only temporary mutations and proof they were restored;
- Gate 36 status = pending human decision;
- explicit statement: **no production deployment and no merge performed**.

---

# Cursor Agent execution prompt

Use the following as the operating instruction for the session:

> Continue the GhostTown Production Roadmap in `C:\repos\ghosttowntest`, branch `feat/launch-blueprint-spa`, draft PR #7. The operator reports Autopilot has advanced to Gate 31. Read this entire handoff, the canonical Blueprint contract/amendments, `config/production-roadmap-47-gates.json`, current `.roadmap-autopilot/state.json`, and the relevant existing Gate adapters/receipts before changing code. Do not reset roadmap state. Do not merge or deploy production. Do not make another Stripe purchase. Do not replay purchase/research/Vertex or rematerialize Gate-28 artifacts unless the active gate produces concrete evidence that it is necessary. Run `npm run roadmap:autopilot`, fix only the first reported blocker, add focused regression protection, rerun, and continue autonomously through Gates 31–35. Respect each gate's mutation scope. Gate 31 is cross-account security and must preserve privacy-safe 404 owner boundaries; begin from `tests/blueprintOwnershipV21.test.ts`. Gate 32 must force provider failure in acceptance and prove fail-closed retry without a second charge. Gate 33 must force R2 failure in acceptance and prove recovery without duplicate order/charge. Gate 34 must certify the full paid journey at the five exact required viewports. Gate 35 must generate the authoritative acceptance receipt with secret names only. Stop immediately when Gate 36 requests explicit human production-release authorization. Never waive a gate or convert a real defect into an ignored assertion without source-contract proof. Prioritize the smallest correct fix and commercial acceptance completion over new architecture. At the end, report the final head, Gate 31–35 receipts/tests, restoration of any acceptance-only failpoints, and confirm no merge or production deploy occurred.
