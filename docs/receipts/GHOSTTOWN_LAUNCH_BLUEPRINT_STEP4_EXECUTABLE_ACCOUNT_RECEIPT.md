# GhostTown Launch Blueprint v2.1 — Step 4 Executable Account Receipt

Repository: `sanlorenzoprx/ghosttowntest`  
Branch: `feat/launch-blueprint-spa`  
Draft PR: `#7`  
Successful Step 4 CI run: `31155000575`  
Production deployment: prohibited in this slice  
PR merge: prohibited in this slice

## Governing source

Step 4 is implemented against the canonical GhostTown Launch Blueprint v2.1 contract and the attached GhostTown Execution Journal recommendation. The Blueprint remains immutable customer guidance: execution evidence may recommend a future change, but this surface never rewrites the original Blueprint.

## v2.1 routing and legacy preservation

- `GhostTownLaunchBlueprintV21.blueprintVersion` is now the literal discriminator `"2.1"`.
- The base Blueprint type accepts `"2.0" | "2.1"` so legacy records remain type-safe.
- `LaunchBlueprintRouter.tsx` routes `blueprint.blueprintVersion === "2.1"` to `LaunchBlueprintViewV21.tsx` and sends earlier records to the existing `LaunchBlueprintView.tsx`.
- The legacy component remains intact.

## Executable account Blueprint

The v2.1 account surface exposes first-class customer features for:

- 48-hour Launch Card.
- First customer, first offer, first three approaches, exact first message, first measurable commitment.
- Launch Site preview access.
- Founder time and cash boundaries.
- Day-30 evidence requirement.
- Starting-state audit, skills/assets, founder constraints, verified facts, inferences, and critical tests.
- Accessible truth labels that include visible text/symbols rather than color alone.
- Business-model execution lane and complete first-revenue path.
- Copyable Founding Customer Pilot Brief.
- Manual fulfillment plan and economics guardrails.
- Exactly thirty visible daily actions with why, time, actions, assets, deliverable, success measure, evidence, explicit IF/THEN branch rules, and completion state.
- Day 7/14/21/30 checkpoint reviews with metrics, evidence strength, primary constraint, evidence summary, next action, and explicit save.
- Launch Site owner controls through the existing canonical Launch Site panel.

## GhostTown Daily Execution Log integration

The customer-facing execution loop is integrated as:

- **Today** — next incomplete Blueprint action, prepared assets, branch rule, mark complete, reminder, and result capture.
- **Record Results** — structured evidence entry form.
- **Follow-ups** — dated next actions derived from recorded evidence.
- **Evidence** — behavioral evidence history and metric summary.
- **Weekly Review** — canonical checkpoints without automatic regeneration.
- **Reminders** — in-app daily-action, follow-up, and checkpoint reminder state.

Evidence entries carry optional immutable references for `blueprintId`, `blueprintVersion`, `actionId`, `checkpointId`, and `createdAt`. Reminder records carry `blueprintId` and `blueprintVersion` plus the relevant action, entry, or checkpoint reference.

This first implementation deliberately reuses the existing D1 `launch_blueprint_progress.progress_json` operating record instead of creating a second journal truth store. It preserves the existing normalized/deduplicated evidence backend and avoids splitting customer evidence across competing databases before first-customer usage evidence exists.

Normalized `journal_entries`, `reminder_preferences`, `scheduled_reminders`, and `acs_readiness_assessments` tables remain a scale/post-first-customer option. If introduced, they must retain the same canonical Blueprint/version references and must not replace or overwrite historical evidence.

## Governance

The Execution Log cannot silently alter a Blueprint.

Any future evidence-based regeneration must:

1. Create a new Blueprint version.
2. Preserve the original recommendations and customer evidence.
3. Record the reason for the change.
4. Regenerate the evidence chain.
5. Revalidate against the canonical Blueprint hash.

Automatic Day 7/14/21 regeneration remains intentionally deferred until after the first accepted customer, consistent with the Blueprint phase plan.

## Save and resilience contract

- Optimistic local state.
- 650 ms debounced save for execution notes.
- Explicit checkpoint review save.
- Pending progress snapshot stored locally before network persistence.
- Failed sync restores the pending state after reopening.
- Visible `Retry save` state; no silent loss on a failed request.
- Owner progress GET and POST responses use `Cache-Control: private, no-store`.

## Reminder scope

Included now:

- In-app daily action reminders.
- In-app follow-up reminders.
- In-app checkpoint reminders.
- Blueprint/version/action linkage.

Deliberately deferred:

- Email delivery.
- Browser/mobile push.
- SMS.
- Habit streaks.
- Calendar integrations.
- Automatic adaptive Blueprint regeneration.

## Tests

`tests/launchBlueprintViewV21.test.ts` covers:

- v2.1 route selection.
- Legacy v2 compatibility.
- 48-hour card surface.
- First-revenue surface.
- Evidence entry creation/edit behavior.
- Checkpoint review replacement/save behavior.
- Daily branch visibility.
- Fulfillment economics.
- Mobile navigation.
- Retry/local-loss protection.
- Execution Log governance language.

`tests/blueprintExecutionLogV21.test.ts` covers:

- Blueprint/version/action/checkpoint references on normalized evidence.
- Reminder preference normalization.
- Version-attached reminder normalization.

## Validation evidence

GitHub Actions run `31155000575` passed through:

- canonical Blueprint source verification;
- TypeScript type-check;
- complete Vitest suite;
- Cloudflare Worker dry-run;
- production Vite build.

This receipt does not authorize production deployment, merge, or automatic Blueprint regeneration.
