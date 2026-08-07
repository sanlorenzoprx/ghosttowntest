# GhostTown Daily Execution Log v1 — Normalized Architecture Receipt

Repository: `sanlorenzoprx/ghosttowntest`  
Branch: `feat/launch-blueprint-spa`  
Draft PR: `#7`  
Production deployment: prohibited in this slice  
PR merge: prohibited in this slice

## Product basis

This implementation integrates the GhostTown Execution Journal recommendation as the customer-facing **GhostTown Daily Execution Log** rather than as a personal-journaling feature.

Customer-facing execution components remain:

- **Today**
- **Reminders**
- **Record Results**
- **Follow-ups**
- **Evidence**
- **Weekly Review**

The execution layer records what the customer tried, what customers said, what commitments occurred, and what requires follow-up. It does not silently alter the purchased canonical Blueprint.

## Normalized persistence architecture

Migration: `migrations/0004_blueprint_execution_log.sql`

The D1 execution architecture now contains:

- `accounts`
- `blueprints`
- `blueprint_actions`
- `action_progress`
- `journal_entries`
- `journal_evidence`
- `reminder_preferences`
- `scheduled_reminders`
- `checkpoint_reviews`
- `acs_readiness_assessments`

The existing `launch_blueprint_progress.progress_json` record remains temporarily as a compatibility projection for the current account UI. It is no longer the only durable execution/evidence representation for Blueprint v2.1 writes.

## Version attachment

Every normalized journal revision is attached to:

- `account_id`
- `blueprint_id`
- `blueprint_version`
- `action_id`
- `checkpoint_id`
- `created_at`

The API canonicalizes those references from the authenticated owner and stored Blueprint. Client-provided Blueprint identity cannot silently redirect evidence to another plan/version.

Daily actions use stable `day-N` action IDs and are grouped into the canonical Day 7, Day 14, Day 21, and Day 30 evidence windows.

## Evidence preservation

`blueprints` and `blueprint_actions` use immutable insert semantics for a given Blueprint/version.

Journal edits do not destroy the earlier customer-entered result. Each distinct journal state receives a content SHA-256 and immutable `entry_revision_id`; duplicate saves are ignored while genuine edits create a new revision.

The same append-only rule is applied to:

- `journal_evidence`
- `checkpoint_reviews`
- `acs_readiness_assessments`

Mutable operating state remains mutable where appropriate:

- action completion/status
- reminder preferences
- scheduled-reminder due date/status

## Governance rule

The Daily Execution Log cannot silently rewrite the Blueprint.

`assertBlueprintRegenerationGovernance(...)` requires any future evidence-led regeneration to:

1. Identify the original Blueprint/version.
2. Create a different Blueprint version.
3. Record the reason for the change.
4. Preserve and reference the original evidence.
5. Regenerate the evidence chain.
6. Revalidate the canonical Blueprint source hash.

The normalized `blueprints` table includes parent-version and regeneration-reason fields for the future governed regeneration path, but this slice does **not** enable automatic regeneration.

## ACS readiness

`acs_readiness_assessments` is implemented as derived, recommendation-only evidence. A journal entry by itself does not make a customer ACS-eligible.

Current meaningful triggers are limited to evidence the system can actually support from the execution record:

- Day 21 or Day 30 reached.
- A commercial commitment or revenue signal recorded.
- Repeated overdue follow-up risk.
- `Continue` or `Continue with revision` decision recorded.

The assessment cannot alter the Blueprint and is stored append-only with the Blueprint/version that produced it.

## API integration

`src/api/blueprintApi.ts` now:

- attaches canonical Blueprint/version/action/checkpoint references to v2.1 execution evidence;
- keeps owner responses private/no-store;
- retains `progress_json` as the compatibility projection;
- writes v2.1 execution state through `src/api/blueprintExecutionStore.ts` into the normalized architecture;
- returns the Daily Execution Log schema version and current derived ACS-readiness metadata.

## Tests

`tests/blueprintExecutionArchitecture.test.ts` verifies:

- the full normalized table set;
- required journal identity/version references;
- canonical checkpoint windows;
- canonical account/Blueprint/action/checkpoint attachment;
- no ACS eligibility from journaling alone;
- meaningful ACS evidence triggers;
- new-version/evidence-chain/canonical-hash regeneration governance;
- append-only evidence/checkpoint/assessment persistence semantics.

## Release boundary

This receipt does not authorize production migration, production deployment, PR merge, automatic Blueprint regeneration, email/push/SMS reminders, or an ACS purchase prompt. Those remain later acceptance/release decisions.
