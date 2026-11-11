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
  checkout setting. Do not run a workflow whose name starts with "Production", or any workflow that
  uses a production secret or the production environment (for example `Execution Product Learning
  Review`). Acceptance is the only environment the loop may deploy to.
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

### Q02 — Land the production customer journey test — `blocked`

Blocked on 11 November. The test is pinned to the old address (`ghosttowntest.com`, which now
redirects to `ghosttownverdict.app`), to an old Worker version and to an old `main` commit, and it
walks the old $97 Sprint offer, which production no longer shows. Fixing it means rewriting it against
what production serves today, and agents may not run anything against production to check the
rewrite. Pull request #50 stays open and untouched. The founder decides in Q09: rewrite it with a
person running it, or close it.

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

### Q03 — Land the Learning Coach — `done`

Merged on 11 November as a new pull request that replaces #63. The Coach's Sprint boundary now accepts
Spanish, its fixed boundary answers and every new Coach string are in English and Spanish, and tests
prove the Spanish prompts get the same boundary result as the English ones. No Blueprint amendment:
the plan, PDF and ZIP are unchanged. It adds one manual workflow, `Execution Product Learning Review`,
that uses a production secret; the loop must not run it.

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

### Q04 — Spanish for the entry screens — `done`

Done on 11 November. The idea form, the assessment questions, the progress bar, login, the paywall
and the contact page now work in Spanish; the question flow passes the language down and uses the
Spanish question text that already existed for agents. `Landing.tsx` was a one-line alias and is
removed. Not covered: error messages that come from the server are still English, and the idea
form's consent still mentions a generated video although Q01 retired automatic video (see Q09).

`IdeaIntake`, `QuestionCard`, `ProgressBar`, `Landing`, `LoginModal`, `PaywallModal`, `Contact`.

Done when: each takes a `locale`, keeps its words in a typed `COPY` object with `en` and `es`, has a
Spanish render assertion, and is removed from `LEGACY_WITHOUT_OWN_SPANISH` in
`tests/bilingualComponents.test.ts`, with the size limit in that test lowered to match. If a component
is not reachable from `src/app/App.tsx` or any other live component, delete it and its list entry
instead of translating it.

### Q05 — Spanish for the verdict and paid screens — `done`

Done on 11 November for the four screens a customer reaches today: the verdict unlock page, the
screen after payment, the competitor step and the agent handoff. Three files stay on the legacy list:
`PrePurchaseResearchSignals` shows nothing (a contract test requires it to return null), and
`LaunchBlueprintView` with `LaunchSitePanel` only open for old-format orders; they moved to Q11.

`VerdictUnlockPage`, `PrePurchaseResearchSignals`, `CompetitorSeedStep`, `ActionPlanSuccess`,
`AgentHandoff`, `LaunchBlueprintView`, `LaunchSitePanel`.

Done when: the same as Q04.

### Q06 — Spanish for Get Me Live — `done`

Done on 11 November for the Get Me Live offer card, the landing page and the "putting your website
online" tab. The setup workspace (`GetMeLiveWorkspace.tsx`, 323 long lines, also driven by the
acceptance test) and its one-line alias `GetMeLiveStudio.tsx` moved to Q12.

`GetMeLiveLanding`, `GetMeLiveOpening`, `GetMeLiveStudio`, `GetMeLiveUpsell`, `GetMeLiveWorkspace`.

Done when: the same as Q04, and the legacy list in the test is empty.

### Q07 — Make the docs tell the truth — `done`

Done on 11 November. The nine root files and `docs/PRODUCTION_READINESS.md` were leftovers from the
first code generation ("44 files, ready to ship") and described nothing true today; all ten are
deleted, and nothing linked to them. `README.md` now describes what GhostTown sells today, and
`docs/CURRENT_STATE.md` opens with the state on 11 November, with the older sections kept as history.

`GO_LIVE_GOAL.md` and `docs/PRODUCTION_READINESS.md` describe an early $97 product with 46 tests. The
root also holds `READY_TO_SHIP.txt`, `PUSH_TO_GITHUB.sh`, `START_HERE.md`, `FINAL_DELIVERY_SUMMARY.md`,
`GENERATION_COMPLETE_SUMMARY.md`, `CODEBASE_COMPLETION_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md` and
`PHASE_2A_RECEIPT.md`, last touched in September.

Done when: every one of those files has been read and either deleted (when nothing in it is still
true or needed) or corrected; `README.md` and `docs/CURRENT_STATE.md` describe the product as it is on
`main` now (free verdict, First 30 at $297, Get Me Live included, English and Spanish, what is live in
production and what is not); and no file in the repository links to a deleted one.

### Q08 — Prove `main` on acceptance — `blocked`

Run 43105507992 tested 5b234cb (after #87 and #88). Fixture, runtime inputs, front door, Get Me Live
and owner controls passed. The Sprint stopped at Day 2 again with "automatic UI learning review was
not durably persisted", and Sprint without Get Me Live failed only because the Sprint never reached
30 days. Root cause was in the acceptance test, not the product: it waited for the region named
"GhostTown daily review" without an exact match, and from Day 2 on the screen also shows "Previous
GhostTown daily review", so the wait passed at once and the test read saved reviews before Day 2's
review existed. Day 1 has no previous panel, which is why only Day 2 failed, before and after #87.
The wait now requires the exact name and "GhostTown reviewed Day N" for the day just completed. Stripe
and OAuth still need the founder's two proofs. Rerun Acceptance on the merged fix.

Run 43071614954 tested cd92715 with deploy and full tests enabled. Fixture, inputs, front door,
Get Me Live and owner controls passed; Day 2 Coach persistence failed, causing the no-GML proof
also to fail. PR #87 fixes the Coach routing; #88 prepares an exact-version OAuth verifier. Stripe
needs a completed test payment. Rerun on the final main head after these inputs/fixes. See
`docs/ACCEPTANCE_STATUS_2026_11_11.md`. Read `execution-receipt.json` stage outcomes, not GitHub's
continue-on-error step conclusions. No gate was weakened.

Take this only when Q01 to Q06 and Q10 to Q12 are `done` or `blocked`.

Done when: the `Acceptance` workflow has run on the head of `main` with deploy on, and every automated
stage passes: fixture, runtime inputs, front door, 30-day Sprint, Get Me Live, owner controls, and
Sprint without Get Me Live. The Stripe payment and Cloudflare OAuth stages need a person and are
expected to fail; record them for Q09. If an automated stage fails, fix the cause in a pull request and
run it again. Write the run link, the commit and each stage result under this item.

### Q09 — Write the founder's release checklist — `blocked`

The ordered checklist and merged-branch inventory are prepared in this pull request. Its remaining
blocker is Q08: the final passing release SHA is not known yet. The checklist links the exact failed
run and explains the required provider input, recovery paths and the separate ShortsFactory dependency.

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
9. The idea form asks every visitor to accept that "the generated video" is public content that
   Shorts Factory may distribute. Q01 retired automatic video. The founder decides whether that
   consent wording should change; it is legal text, so the loop did not change its meaning.
10. Pull request #50 (production customer journey test): rewrite with a person, or close.

It names the exact `main` commit that Q08 proved, and lists any item left `blocked` with its reason.
`docs/CURRENT_STATE.md` links to it.

### Q10 — Say "First 30 is open" everywhere once it is on sale — `done`

Done on 11 November. The shared copy is `GHOSTTOWN_FIRST_30_OPEN_COPY` in `src/lib/ghosttownOffer.ts`.
With First 30 on sale, the landing page shows the price, what it covers and the refund rule, and its
button starts a free verdict; the FAQ, the About page and the agent handoff say it is open. With it
off, all three are unchanged. The agent surface was already right: it reports `available` only when
the Worker has `FIRST30_CHECKOUT_ENABLED`.

Added on 11 November. Take this before Q08. When the site is built with
`VITE_POST_VERDICT_OFFER=first30`, the verdict page sells First 30, but the landing page
(`LandingCommercial.tsx`), the About page (`AboutPage.tsx`) and the agent handoff (`AgentHandoff.tsx`)
still say "First 30 opens soon", and the landing page still shows the email list. A buyer would read
"nothing is for sale yet" one click away from the checkout.

Done when: with `FIRST30_OFFER_ACTIVE` true, those three screens say First 30 is open, show the
price and what is included from `src/lib/ghosttownOffer.ts`, and send the visitor to a free verdict
(the purchase happens on the verdict page); with it false they are unchanged; both are in English and
Spanish; and a test renders each state. Check the agent surface (`src/api/agentVerdict.ts`, the MCP
offer) reports `available` only when the Worker has `FIRST30_CHECKOUT_ENABLED`, and fix it if not.
No price, checkout or production setting changes.

### Q11 — Spanish for the old-format Blueprint view — `done`

Translated the legacy Blueprint navigation, controls, status and the Launch Site panel. Historical
plan content remains as stored. A browser test walks all sections in Spanish and publishes a
fixture site. The router passes locale to the legacy view and on to the site panel.

Added on 11 November, split from Q05 because it is about 1,280 lines. `LaunchBlueprintView.tsx` and
`LaunchSitePanel.tsx` open only for orders made before Blueprint v2.1 (`LaunchBlueprintRouter`,
`legacy` branch).

Done when: the same as Q04 for both files. If no order in the acceptance database uses the old
format and the code path cannot be reached by a new order, it is also acceptable to mark this
`blocked` with that finding and leave the decision (translate or retire the old view) to the founder
in Q09; do not delete the old view without that decision.

### Q12 — Spanish for the Get Me Live setup workspace — `done`

The ten-step workspace now takes the app locale, with typed English/Spanish copy for labels,
notices, errors and post-launch controls. Removed the unused Studio alias. A browser test walks
all ten Spanish steps, confirms provider choices remain stable and proves autosave. PR #84.

Added on 11 November, split from Q06. `GetMeLiveWorkspace.tsx` is the ten-step screen where a buyer
names the business, picks the look, connects Cloudflare and goes live. A First 30 buyer who reads
Spanish reaches it, so this matters for the goal. Take it before Q11.

Done when: the same as Q04 for this file, including the step names, the look names, every button,
message and error it writes itself. The English text stays exactly as it is, because
`tests/e2e/get-me-live-acceptance.mjs`, `tests/getMeLiveBrowser.test.ts` and the contract tests find
the screen by its English labels; run `npm run test:browser` as well as the usual checks. Text that
comes back from the server stays as the server wrote it.

### Q13 — Prepare the guarded First 30 migration release — `done`

Prepared in this pull request. Production Release gains a manual `migrate-0011-0012` operation,
accepts only 0011+0012 or 0012 alone, captures the schema, and verifies both schemas after apply.
Tests exercise allowed and rejected migration ledgers. No production workflow has been run.

### Q14 — Make the Pages release offer choice explicit — `done`

The direct-upload Pages workflow now takes a validated offer choice, defaults to waitlist, and
passes it into the local Vite build. Its release receipt records the choice. Updated the First 30
activation and undo instructions. No production release or setting has changed.

### Q15 — Persist automatic Coach reviews without automatic outside research — `done`

Acceptance run 43071614954 exposed a Day 2 review that returned boundary text without persisting.
Automatic review/checkpoint phases now disable outside research regardless of prompt wording;
manual research retains its relevance gate. The UI requires a persistence acknowledgement, and
cached persisted responses provide it. Regression coverage checks both languages for all 30 days.
The full acceptance journey must be rerun on the merged fix.

### Q16 — Pin the OAuth acceptance probe to its deployed version — `done`

Run 43071614954 hit the canonical Worker's 404 after deploying the temporary OAuth verifier.
The probe now records Wrangler's version UUID and requests that exact acceptance Worker version.
It still requires a real consent callback and successful refresh. The manual OAuth workflow also
accepts the actual acceptance test account email instead of requiring its historical default.
Unit tests reject unknown versions and every production hostname. No production changes.
