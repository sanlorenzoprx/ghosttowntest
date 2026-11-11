# GhostTown build queue

Started 11 November 2026 from `main` at `51a766d`. The founder set the goal and the limits below and is not
in the loop while the queue runs.

## Goal

**First 30 is ready to sell.** Everything on `main` is finished, clean and proven on acceptance, and
production is prepared so the founder can release it and switch First 30 on from one short checklist.

Year Squared stays as offer text only. Do not build its checkout or fulfilment here.

## How the loop works

Every session, whether started by a person or by the hourly scheduled task, does this:

1. Read this file on the latest `main`, and list the open pull requests.
2. If an open pull request has a title that starts with a queue id such as `[Q03]`, that item is taken.
   - If it is yours to finish, or it has had no new commit for two hours, finish it: fix failing checks,
     bring in the latest `main`, and merge it under the rule in `AGENTS.md`.
   - Otherwise leave it alone.
3. Take the first item below that is `todo` and not taken. Take one item only.
4. Do the work on your session's branch. Open a pull request whose title starts with the item's id.
5. In the same pull request, set the item's status here to `done` and add one line under it: what
   changed, and the pull request number.
6. Run the checks in `AGENTS.md` ("Before you push"). Merge under the `AGENTS.md` merge rule when every
   condition is true. If one is false, fix it. If you cannot fix it, set the item to `blocked`, write
   the reason under it in one or two plain sentences, merge only that note, and take the next item.
7. When no item is `todo`, switch the hourly scheduled task off and stop.

Keep each pull request to its one item. Do not widen an item. If you find new work, add a new item at
the end of the queue in your pull request and say why in one line.

## Limits that always hold

- **Never touch production.** No production deploy, release, migration, secret, price, payment or
  checkout setting. Do not run a workflow whose name starts with "Production". Acceptance is the only
  environment the loop may deploy to.
- **Never weaken a gate.** Do not skip, delete or loosen a test, the Blueprint contract check, the
  language check or the bilingual list to get green.
- A change to what the paid Blueprint promises or produces needs a new amendment version, a change
  record and regenerated evidence (`AGENTS.md`, "Contract changes").
- Follow the language, "explain why" and copy rules in `AGENTS.md` for every customer-facing change.
- Never put a secret value in a file, a commit, a pull request or a log.

## Queue

Status is one of `todo`, `done`, `blocked`.

### Q01 — Land the retired public video change — `done`

Merged as pull request #64 on 11 November. Its description says the ShortsFactory consumer must be
removed alongside it (`sanlorenzoprx/shortsfactory` pull request #82); that check is a step in Q09.

Pull request #64 (`fix/retire-legacy-public-video`). It stops fresh and cached verdicts from creating
public video work and keeps finished media.

Done when: the branch includes the latest `main`, the pull request is marked ready, every check passes,
and it is merged. If the branch cannot be updated in place, carry its two commits onto a new pull
request and close #64.

### Q02 — Land the production customer journey test — `todo`

Pull request #50 (`test/autonomous-production-customer-journey`). It adds a black-box test of the live
customer journey and manual workflows to run it.

Found on 11 November: four of its five workflows (`production-canary-entitlement-probe`,
`production-canary-inventory`, `production-customer-journey-full-proof`,
`production-stripe-mode-probe`) start on a push to the `test/autonomous-production-customer-journey`
branch. Only `production-customer-journey.yml` is manual.

Done when: the work is on `main` with all five workflows manual-only (`workflow_dispatch`, with a
typed confirmation like the one `production-customer-journey.yml` already has), every check passes,
and #50 is closed. Carry the files onto your session's branch and open a new pull request; do not
push to the old branch, because a push there can start a production probe. Merging is allowed;
**running** any of these workflows is not.

### Q03 — Land the Learning Coach — `todo`

Pull request #63 (`feature/learning-coach-full-integration`), 39 commits. It conflicts with `main` in
`src/components/LaunchBlueprintCopilotV21.tsx`, `src/components/LaunchBlueprintExecutionHomeV21.tsx`
and `tests/e2e/30-day-sprint-acceptance.mjs`.

Done when: the work is merged into the latest `main` with the conflicts resolved, keeping everything
`main` added since (Spanish and locale handling, `founderLanguage` and `buyerLanguage`, the "explain
why" instructions, First 30). Every new Coach string the customer sees is in English and Spanish, and
every Coach prompt includes the shared instruction from `src/lib/explainWhy.ts`. Migration `0011` is
already on `main`; do not add a second copy.

Found on 11 November: the Coach's Sprint boundary (`evaluateExecutionInteraction` in
`src/lib/blueprintExecutionIntelligence.ts`) decides what is in scope with English-only word
patterns, and the "boundary" answers in `src/api/blueprintExecutionCopilot.ts` are English-only. A
founder who writes in Spanish could be refused. This must be fixed before the Coach merges: the
patterns accept Spanish, the boundary answers are written in the founder's language, and tests prove
a Spanish Sprint question is allowed and a Spanish off-topic question is refused in Spanish. If the Coach changes what the paid Blueprint promises or
produces, add the amendment. Open a new pull request from your session's branch and close #63 once
it merges.

### Q04 — Spanish for the entry screens — `todo`

`IdeaIntake`, `QuestionCard`, `ProgressBar`, `Landing`, `LoginModal`, `PaywallModal`, `Contact`.

Done when: each takes a `locale`, keeps its words in a typed `COPY` object with `en` and `es`, has a
Spanish render assertion, and is removed from `LEGACY_WITHOUT_OWN_SPANISH` in
`tests/bilingualComponents.test.ts`, with the size limit in that test lowered to match. If a component
is not reachable from `src/app/App.tsx` or any other live component, delete it and its list entry
instead of translating it.

### Q05 — Spanish for the verdict and paid screens — `todo`

`VerdictUnlockPage`, `PrePurchaseResearchSignals`, `CompetitorSeedStep`, `ActionPlanSuccess`,
`AgentHandoff`, `LaunchBlueprintView`, `LaunchSitePanel`.

Done when: the same as Q04.

### Q06 — Spanish for Get Me Live — `todo`

`GetMeLiveLanding`, `GetMeLiveOpening`, `GetMeLiveStudio`, `GetMeLiveUpsell`, `GetMeLiveWorkspace`.

Done when: the same as Q04, and the legacy list in the test is empty.

### Q07 — Make the docs tell the truth — `todo`

`GO_LIVE_GOAL.md` and `docs/PRODUCTION_READINESS.md` describe an early $97 product with 46 tests. The
root also holds `READY_TO_SHIP.txt`, `PUSH_TO_GITHUB.sh`, `START_HERE.md`, `FINAL_DELIVERY_SUMMARY.md`,
`GENERATION_COMPLETE_SUMMARY.md`, `CODEBASE_COMPLETION_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md` and
`PHASE_2A_RECEIPT.md`, last touched in September.

Done when: every one of those files has been read and either deleted (when nothing in it is still
true or needed) or corrected; `README.md` and `docs/CURRENT_STATE.md` describe the product as it is on
`main` now (free verdict, First 30 at $297, Get Me Live included, English and Spanish, what is live in
production and what is not); and no file in the repository links to a deleted one.

### Q08 — Prove `main` on acceptance — `todo`

Take this only when Q01 to Q06 are `done` or `blocked`.

Done when: the `Acceptance` workflow has run on the head of `main` with deploy on, and every automated
stage passes: fixture, runtime inputs, front door, 30-day Sprint, Get Me Live, owner controls, and
Sprint without Get Me Live. The Stripe payment and Cloudflare OAuth stages need a person and are
expected to fail; record them for Q09. If an automated stage fails, fix the cause in a pull request and
run it again. Write the run link, the commit and each stage result under this item.

### Q09 — Write the founder's release checklist — `todo`

Take this last.

Done when: `docs/FOUNDER_RELEASE_CHECKLIST.md` exists and gives the founder one ordered list, each
step with the exact command, workflow name or screen, what it does and how to undo it:

1. The two acceptance proofs that need a person (Stripe test card, Cloudflare OAuth consent), then
   one more `Acceptance` run.
2. Production D1 migrations not yet applied (`0011`, `0012`).
3. Production Worker release, then production site release, from the commit named in the checklist.
4. Turning First 30 on (`docs/FIRST_30_TURN_ON.md`), the real-card test purchase and its refund.
5. Emailing the First 30 list.
6. Decisions still open: lawyer review of the legal pages, and the $14.95 10-verdict pack.
7. Before the Worker release: confirm the ShortsFactory consumer is gone
   (`sanlorenzoprx/shortsfactory` pull request #82), because Q01 makes the old video endpoints
   answer 410.
8. Branch clean-up. Agents in this setup cannot delete branches. List the branches that are fully
   merged into `main` so the founder can delete them from GitHub's Branches page, and suggest
   turning on "Automatically delete head branches".

It names the exact `main` commit that Q08 proved, and lists any item left `blocked` with its reason.
`docs/CURRENT_STATE.md` links to it.
