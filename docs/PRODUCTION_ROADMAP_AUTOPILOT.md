# GhostTown + Story Studio Production Roadmap Autopilot

## Purpose

This runner turns the authoritative 31-page **GhostTown + Story Studio Production Roadmap** into one resumable execution loop. It is intended to replace the current one-command-at-a-time operator workflow.

The source roadmap's **Production Critical Path contains 25 numbered steps**. The requested 47-step operating checklist is implemented here as a **47-gate executable decomposition** of those source steps and phase exit gates. This does not rewrite the roadmap, reorder it, or weaken any exit criterion.

The governing commercial sequence remains:

`GhostTown acceptance → $97 test purchase → Workflow ready → artifact/security/failure/visual acceptance → explicit production release → Story Studio attribution → staged 1/3/10/100-verdict proofs → commercial evidence → repeatability → upsell → evidence feedback → ACS extraction`

## Operator contract

Start or resume:

```powershell
npm run roadmap:autopilot
```

Show current state without executing:

```powershell
npm run roadmap:status
```

Discard local runner state and start evidence collection again:

```powershell
npm run roadmap:reset
```

Runtime state and evidence are written only under `.roadmap-autopilot/`, which is Git-ignored.

The runner proceeds gate-by-gate and saves evidence after each successful gate. Re-running the command skips completed gates and resumes at the first incomplete gate.

## Stop policy

The runner does **not** ask the operator to execute routine inspection commands. It stops only when one of these conditions is true:

1. A required credential/configuration name is missing and only the operator can enter the secret value securely.
2. A roadmap gate requires an external-system adapter that is not yet represented by a sanctioned command. Hook gates accept `ROADMAP_GATE_<N>_COMMAND`; the command must exit `0` only when that gate's exact acceptance assertions pass.
3. The roadmap explicitly requires human/external behavior, especially the real Stripe **test-mode** purchase in Gate 20 or the explicit production-release decision in Gate 36.
4. A deterministic acceptance assertion fails. The runner fails closed instead of guessing, skipping, or marking the gate complete.

Secret **values** must never be supplied to the runner through tracked files, command text, receipts, Git, or chat. `wrangler secret list` is used only to inventory secret names.

## Production safety boundary

Autopilot is permitted to mutate the isolated **acceptance** environment when a gate explicitly requires it. It has a hard command guard against `--env production`, the production Pages project, and automatic production deployment.

Gate 36 is always manual. The runner never turns acceptance configuration into production configuration and never enables production paid research by itself.

## Built-in automation

The initial implementation directly automates the canonical hash/branch gate, acceptance reachability, Cloudflare resource reconciliation, CORS/frontend isolation, acceptance test suite, secret-name inventory, Stripe/auth/provider/Vertex configuration-name checks, D1 migration state, remote D1 schema inspection, DataForSEO live preview smoke, combined Podcast Index/YouTube live audience-provider smoke, acceptance Worker/Pages deployment/pairing, and auth signup/login/verify smoke.

Later external gates are represented explicitly rather than silently treated as complete. A sanctioned adapter can be attached without changing the 47-gate contract:

```powershell
$env:ROADMAP_GATE_14_COMMAND = "<sanctioned Gemini acceptance command>"
npm run roadmap:autopilot
```

Do not put secret values in hook command strings.

## 47 executable gates

| Gate | Phase | Acceptance gate | Execution |
|---:|---:|---|---|
| 1 | 0 | Freeze canonical GhostTown contract/hash | auto |
| 2 | 1 | Verify acceptance Worker and Pages are reachable | auto |
| 3 | 1 | Verify isolated KV, D1, private R2, and Workflow identities | auto |
| 4 | 1 | Verify acceptance bindings, URLs, Vertex requirement, research-off state, CORS, and frontend/API isolation | auto |
| 5 | 2 | Inventory acceptance secret names only | auto |
| 6 | 2 | Verify Stripe test, webhook, price, and JWT configuration names | auto |
| 7 | 2 | Verify DataForSEO, Podcast Index, YouTube, and Gemini secret names | auto |
| 8 | 2 | Verify Vertex identity variables and service-account secret names | auto |
| 9 | 3 | Verify GhostTown acceptance D1 migrations are fully applied | auto |
| 10 | 3 | Verify GhostTown acceptance D1 schema | auto |
| 11 | 4 | Run DataForSEO live acceptance smoke | auto |
| 12 | 4 | Run Podcast Index live acceptance smoke | auto |
| 13 | 4 | Run YouTube API live acceptance smoke | auto |
| 14 | 4 | Run Gemini supplied-candidate-only selection smoke | hook |
| 15 | 4 | Run Vertex OAuth plus seven-stage receipt-backed generation smoke | hook |
| 16 | 5 | Deploy and verify acceptance Worker/Pages pairing only | auto |
| 17 | 5 | Run acceptance signup/login authentication smoke | auto |
| 18 | 5 | Verify checkout session creation, cancellation/success routing, and no production redirect | hook |
| 19 | 5 | Verify remote Stripe test-mode webhook and endpoint signing-secret name | hook |
| 20 | 6 | Complete one real Stripe test purchase in a clean customer session | manual |
| 21 | 6 | Verify signed webhook, duplicate idempotency, exactly one order, and no premature Workflow | hook |
| 22 | 6 | Verify awaiting_seeds, 2-3 valid commercial domains, validation, and exactly one Workflow | hook |
| 23 | 6 | Verify paid research: >=2 provider types and >=10 verified candidates | hook |
| 24 | 6 | Verify Vertex stages, candidate-ID constraints, 10-25 targets, >=3 categories, and fail-closed gates | hook |
| 25 | 6 | Verify Workflow reaches ready with complete transition/generation receipt | hook |
| 26 | 7 | Inspect canonical D1 order/Blueprint/progress/evidence/checkpoint state | hook |
| 27 | 7 | Inspect private R2 JSON/PDF/ZIP identity, privacy, and repeat download | hook |
| 28 | 7 | Verify all 16 ZIP files and required PDF sections | hook |
| 29 | 8 | Verify Launch Site publish, public URL, lead capture, owner view/export, and unpublish | hook |
| 30 | 8 | Verify second-device/account recovery of Blueprint, artifacts, progress, evidence, checkpoints, and Launch Site | hook |
| 31 | 8 | Verify cross-account access/mutation/download/export/retry denials | hook |
| 32 | 9 | Force provider failure and prove fail-closed retry without a second charge | hook |
| 33 | 9 | Force R2 failure and prove persistence recovery without duplicate order/charge | hook |
| 34 | 10 | Certify the full paid journey at 375x667, 390x844, 768x1024, 1366x768, and 1440x900 | hook |
| 35 | 11 | Generate authoritative GhostTown acceptance receipt with secret names only | hook |
| 36 | 12 | Explicit GhostTown production-release decision and controlled release | manual |
| 37 | 13 | Verify Story Studio Baseline 001 100x10 contract and production preflight | hook |
| 38 | 14 | Verify publication-to-Stripe revenue attribution chain | hook |
| 39 | 15 | Run Story Studio Slice A: 1 verdict x 2 creatives x 1 platform | hook |
| 40 | 16 | Run Story Studio Slice B: 3 verdicts x several treatments x 2 platforms | hook |
| 41 | 17 | Run Story Studio Slice C: 10 verdicts x 10 treatments = 100 masters | hook |
| 42 | 18 | Run Baseline 001: 100 verdicts x 10 treatments = 1,000 master creatives | hook |
| 43 | 18 | Collect immutable 1h, 24h, 72h, and 7d observations | hook |
| 44 | 19 | Verify attention/traffic/revenue/economic winners, mutation, and adaptive allocation | hook |
| 45 | 20 | Produce Baseline 001 machine-readable decision report | hook |
| 46 | 21 | Prove first attributable stranger $97 purchase and repeatable acquisition economics | hook |
| 47 | 23 | Prove Story Studio upsell, feed earned evidence back, then authorize ACS extraction | hook |

## Evidence semantics

A gate can be:

- `PASS` — exact assertions were verified and evidence was persisted.
- `BLOCKED_INPUT` — a secret/external action or explicit decision genuinely requires operator input.
- `BLOCKED_ADAPTER` — the roadmap requirement is understood but no sanctioned automation adapter is configured; it is not waived.
- `FAIL` — an automated assertion failed. Later gates do not execute.
- `PENDING` — not yet reached.

A `PASS` is never inferred from code presence alone when the roadmap requires live acceptance.

## Current acceptance identities

The runner pins the acceptance identities already reconciled for this branch:

- Worker: `https://lit-ghost-town-api-acceptance.sanlorenzoprx.workers.dev`
- Pages: `https://ghosttown-acceptance.pages.dev`
- KV: `ghosttown-acceptance` / `849e13521d454361aea286b8e1a5e4c7`
- D1: `ghosttowntest-blueprints-acceptance` / `9863d883-3c31-4268-9a98-8392fa3b9f8f`
- R2: `ghosttowntest-private-blueprints-acceptance`
- Workflow: `ghosttown-launch-blueprint-acceptance`
- Blueprint canonical Git blob SHA-1: `616c691e6b4c9cea93615963a07375d13ffba57f`

If any pinned identity changes, the runner fails instead of silently accepting drift.
