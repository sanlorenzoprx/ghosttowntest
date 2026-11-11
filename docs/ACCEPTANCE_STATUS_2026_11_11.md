# Acceptance status — 11 November 2026

**The exact-commit milestone is not yet complete. Do not release production from this record.**

Run: https://github.com/sanlorenzoprx/ghosttowntest/actions/runs/43071614954

Tested commit: `cd92715f9decb4e715fe415bcd45429f51c5b96c`.
Deploy and full tests were enabled. [The execution receipt](evidence/acceptance-43071614954.json)
records the actual step outcomes. GitHub's step `conclusion` can be `success` after an error when
`continue-on-error` is set; use this receipt's `stages` and the detailed proof artifacts.

| Stage | Actual outcome |
| --- | --- |
| Full tests, type check, build, Worker checks | Passed |
| Fixture and runtime inputs | Passed |
| Login, free verdict, waitlist and Stripe test checkout handoff | Passed |
| Full 30-day Sprint | Failed: Day 2 automatic Coach review was not durably persisted |
| Get Me Live journey and owner controls | Passed |
| Sprint without Get Me Live | Failed after the incomplete Sprint |
| Completed Stripe test payment and webhook | Input required: no qualifying recent test payment |
| Cloudflare OAuth consent and refresh | Failed: temporary verifier returned canonical API 404 |
| Aggregate go-live gate | BLOCKED |

The Sprint failure exposed a real bug: the automatic prompt prohibits outside research, but keyword
matching treated its mention of research as a request. Day 2 received boundary text without a saved
review. PR #87 fixes automatic review/checkpoint routing and requires the daily UI to receive a saved
memory acknowledgement. Cached stored responses provide that acknowledgement. Unit regression
coverage checks the English and Spanish automatic prompts for every day; Worker tests pass.

PR #88 adds an exact-version OAuth probe, using the UUID reported by Wrangler and an
acceptance-only version-override header. It does not bypass consent or refresh. The manual OAuth
workflow accepts `test_owner` so the fixture can belong to the operator's actual acceptance account.
It is merged; its runtime result still needs verification on the final main head.

Next: complete the acceptance Stripe test payment; prepare/authorize the OAuth fixture for that
acceptance account; then run Acceptance again with deployment enabled on the current main head.
Keep the acceptance environment free of concurrent deployment/proof workflows while a journey is
running. The Stripe proof workflow builds the dormant $97 Sprint offer for its test; First 30's live
$297 purchase/refund is a separate later release check.

The [founder release checklist](FOUNDER_RELEASE_CHECKLIST.md) gives the remaining ordered steps.
ShortsFactory PR #82 remains an independent pre-release dependency. No production deploy, migration,
secret, price, payment or checkout setting was changed during this work.
