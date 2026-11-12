# First 30 release checklist

Prepared 11 November 2026. This is an ordered release plan, not a record that production has changed.
Release commit: `16debd92322a1b1ac741df92abb9ac76c095d986` (`main` after #98, the lighter site design).

Acceptance on that commit, 12 November:
- https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43233081863 (`on_track`): every stage
  passed and the go-live gate reported PASS with 33 checks and 0 blockers. Stages: fixture, runtime
  inputs, front door, the full 30-day Sprint, Get Me Live, owner controls, Sprint without Get Me Live,
  Stripe payment, Cloudflare OAuth and the go-live gate. This run did not include the full test suite
  (`run_full_tests` was off); the full suite passed in CI on #98.
- `plan_change` has **not** been run on this commit. Run it before step 4 (see step 1).

The commit before it, `760345c8470ec0c02d133e7088fdfd8cbd56493e`, passed both scenarios with 33 of 33
go-live checks:
- https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43199131996 (`on_track`)
- https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43201680974 (`plan_change`)

The only product change between the two commits is #98. It changes how the site looks (colors, fonts,
layout of the home page, forms and panels). It does not change copy, prices, offers, checkout or the
Blueprint.

Provider proofs used by the `760345c` runs:
- Stripe: https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43186905529 (test-mode $97 payment,
  signed webhook created the Sprint order, a replay was rejected as a duplicate)
- Cloudflare OAuth: https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43198509260 (consent saved,
  forced token expiry refreshed on its own)

Step 2 is done. Step 1 is done for `on_track` and still needs `plan_change` on `16debd9`. Once that
passes, use `16debd9` as `RELEASE_SHA` from step 4 on. Nothing below has been done; each production
step still needs your approval.

1. **Prove the release commit on acceptance.** Done for `on_track` on `16debd9` (run above); `plan_change` is still to run. The commands, from the repository:
   ```sh
   gh workflow run acceptance.yml --repo sanlorenzoprx/ghosttowntest --ref main -f deploy=true -f run_full_tests=true -f sprint_scenario=on_track
   ```
   When it finishes, run it once more with `-f sprint_scenario=plan_change`. The first run uses
   synthetic replies that should keep the plan unchanged for all 30 days; the second uses replies that
   should change one named part of the plan at each checkpoint (message, price, offer, customer). Both
   must pass `sprint.scenario.routes` in the go-live report. Do not run them at the same time.
   Record the run URL, its full `headSha`, and the uploaded `execution-receipt.json`. Require fixture,
   runtime inputs, front door, 30-day Sprint, Get Me Live, owner controls and Sprint without Get Me Live
   to pass. The release is still blocked if Stripe, OAuth or the aggregate go-live gate fails.
   Undo: acceptance uses disposable fixtures; its cleanup step removes them. No production change.

2. **Complete the two real-provider proofs.** Done (runs above). The Acceptance gate accepts a Stripe
   test payment only for 24 hours, so a repeat needs a fresh one. Run `Stripe Payment Proof` from `main`. Use the acceptance
   site and a Stripe **test-mode** card to complete its dormant Sprint checkout; do not use a real card
   here. Run `Cloudflare OAuth Proof` with `test_owner` set to the email of the acceptance account that
   will authorize Cloudflare; open the `setupUrl` in its `cloudflare-oauth-fixture.json` artifact,
   sign in as that fixture's owner, and authorize the requested Cloudflare access. Rerun each proof
   after the required input, then rerun `Acceptance` on the same release SHA. Preserve the provider
   proof artifacts. Undo: revoke the test OAuth grant in Cloudflare and remove acceptance fixtures;
   Stripe test payments have no real charge. Do not run these workflows concurrently with Acceptance:
   each temporarily deploys the same acceptance Worker/site.

3. **Resolve the dependent consumer before the Worker release.** Confirm
   [ShortsFactory PR #82](https://github.com/sanlorenzoprx/shortsfactory/pull/82) is merged and its retired
   consumer is no longer running. It was still open during this review and spans 38 files, including story rendering and a PageFactory
   handoff. Review that broader change independently; do not merge it solely to satisfy this dependency.
   GhostTown's retired video
   endpoints return 410. This checklist does not authorize unrelated ShortsFactory changes.
   Undo: coordinate consumer and Worker rollback; do not revive a consumer against retired endpoints.

4. **Read production state.** Set `RELEASE_SHA` to the full SHA proven above. Run:
   ```sh
   gh workflow run production-release.yml --ref main -f operation=preflight -f expected_main_sha="$RELEASE_SHA" -f confirm='PREFLIGHT PRODUCTION'
   ```
   Approve the protected `production` environment in GitHub when required. Save the active Worker
   version, deployment, health and migration ledger artifacts. Confirm the ledger matches step 5.
   Undo: none; preflight is read-only.

5. **Apply the reviewed migrations.** If the only pending migrations are `0011_execution_learning_coach.sql`
   and `0012_first30_included_website.sql`, or 0012 alone, run:
   ```sh
   gh workflow run production-release.yml --ref main -f operation=migrate-0011-0012 -f expected_main_sha="$RELEASE_SHA" -f confirm='APPLY 0011 AND 0012 TO PRODUCTION'
   ```
   Require the post-apply ledger to be clean and both schema checks and health to pass. The workflow
   captures the pre-change schema. Before applying, retain the D1 Time Travel recovery point from
   Cloudflare; the schema-only export is not a data backup. If unexpected migrations exist, stop and
   review them. Undo: these additions can remain during a Worker rollback; do not drop populated
   columns/tables. A database restore requires a separately reviewed recovery plan.

6. **Stage, then promote the exact Worker.** Run:
   ```sh
   gh workflow run production-release.yml --ref main -f operation=stage-version -f expected_main_sha="$RELEASE_SHA" -f confirm='STAGE VERSION FOR PRODUCTION'
   ```
   Require the candidate's 0% traffic smoke test to pass. Record its UUID as `CANDIDATE_VERSION` and
   the previous version as `PREVIOUS_VERSION`. Then run:
   ```sh
   gh workflow run production-release.yml --ref main -f operation=promote-version -f expected_main_sha="$RELEASE_SHA" -f version_id="$CANDIDATE_VERSION" -f confirm='PROMOTE VERSION TO PRODUCTION'
   ```
   Require the live health response to identify that exact UUID. Undo: the workflow automatically
   restores the previous version if its post-promotion smoke fails. For a later failure, restore
   `PREVIOUS_VERSION` to 100% with Cloudflare's Worker deployment controls and retain the evidence.

7. **Release the site, then activate First 30.** First run `Production Pages Release` with
   `expected_main_sha=$RELEASE_SHA`, `post_verdict_offer=waitlist`, and confirmation
   `DEPLOY PAGES TO PRODUCTION`. Require its custom-domain asset verification to pass. Then follow
   [FIRST_30_TURN_ON.md](FIRST_30_TURN_ON.md): create the live $297 USD one-time Stripe price, put its ID
   in the production Worker's `STRIPE_FIRST_30_PRICE_ID` secret, and configure the listed webhook events.
   Do not put secret values in chat or the repository. After the proven Worker release, set the deployed
   Worker's text variable `FIRST30_CHECKOUT_ENABLED=true` in Cloudflare settings. The release uses
   `--keep-vars`, so changing `wrangler.toml` alone does not activate it. Run `Production Pages Release`
   again with `post_verdict_offer=first30` and the same SHA/confirmation. Check English and Spanish
   landing, About, handoff and verdict pages. Undo: set the deployed checkout flag to false and release
   Pages with `post_verdict_offer=waitlist`; existing purchased orders continue to work. To undo a site
   regression, use Cloudflare Pages' deployment rollback and verify its served asset.

8. **Prove the real purchase and refund before building the website.** Complete one live First 30
   purchase with the founder's real card. Verify one $297 charge, the plan entitlement, the website-included
   notice and no second website charge. Do not open the website workspace or request its preview before
   the refund test: that can start the build and close the refund window. Refund through the authenticated
   owner endpoint `POST /api/internal/first30/refund` with `{ "orderId": "gtf_…" }`; verify the refund and
   closed website entitlement. Keep only redacted evidence. Undo: refund is the financial reversal;
   investigate any unexpected charge or entitlement before announcing availability.

9. **Announce only after all checks pass.** Preview the existing English and Spanish templates through
   the authenticated owner endpoint `GET /api/internal/first30-email-preview?locale=en&format=json`
   (and `locale=es`). The source is `src/lib/first30Email.ts`; do not maintain a separate launch copy.
   Export the First 30 list through the authenticated owner
   endpoint `GET /api/internal/first30-waitlist`. Send the reviewed “First 30 is open” message through
   the email service, using each entry's locale and signed unsubscribe link, retaining the postal footer and
   `List-Unsubscribe` / `List-Unsubscribe-Post` headers from the template. Check the sender service
   suppresses bounced, complained or unsubscribed addresses before sending. Sending
   cannot be undone; review the actual recipients and final copy before sending.

10. **Close the outstanding decisions and cleanup.** Obtain legal review; decide the $14.95 ten-verdict
    pack; review the intake consent that still mentions a public generated video; and decide whether to
    replace or close stale [PR #50](https://github.com/sanlorenzoprx/ghosttowntest/pull/50). Do not push its
    existing branch: four workflows there can trigger production probes. Its old domain, pinned Worker
    version and $97 journey are stale. Year Squared remains offer text only for this release.
    Review [the merged branch inventory](MERGED_BRANCHES_2026_11_11.md) on GitHub's Branches page before
    deleting branches, preserving `main` and any active work. Consider enabling “Automatically delete
    head branches.” Undo: record branch head SHAs first so deleted refs can be recreated.
