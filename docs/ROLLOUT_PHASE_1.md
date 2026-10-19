# Rollout phase 1: free verdict live

Source plan: `claude/rollout-ghosttown-first.md` (Meta Harness project), phase 1.
Founder decision for step 1 (19 October 2026): after the verdict, replace the $97 Sprint offer with
"First 30 opens soon" plus an email list.

## What changed in the code

| Area | Behavior |
|---|---|
| Verdict page | Shows a "First 30 opens soon" panel with an email signup (`First30Waitlist`). The Sprint panel, sticky button, checkout modal and decline modal are still in `ResultReport.tsx`, dormant. |
| Landing page | Sprint, Get Me Live and price sections are hidden. A First 30 section with the same signup replaces them. FAQ and final call to action no longer mention $97. |
| Agent surface | `/api/v1/product`, the free-verdict response and the MCP `ghosttown.get_offer` tool report First 30 with `status: "opens_soon"` and `price_usd: null`. |
| Sprint checkout | `POST /api/paid-test/checkout` returns `410 SPRINT_CHECKOUT_CLOSED` unless the Worker var `SPRINT_CHECKOUT_ENABLED` is `"true"`. Production sets `"false"`; acceptance and development set `"true"` so the dormant Sprint stays proven. Fulfillment, dashboards and Get Me Live for existing orders are unchanged. |
| Email list | `POST /api/first30/waitlist` stores one KV entry per email (`waitlist:first30:<sha256>`), with the server's consent text, source, locale and verdict id. Five signups per connection per hour. Owners listed in `INTERNAL_RESEARCH_OWNER_EMAILS` can export it from `GET /api/internal/first30-waitlist`. No new D1 migration. |
| Legal pages | `/terms`, `/refunds`, `/privacy` and `/disclaimer` show phase 1 text: free verdict, public-content consent, providers that process the idea, fair-use limits, the optional 10-verdict pack, and the email list. The Sprint text returns when the Sprint does. |
| `POST /api/verdict` limits | 10 verdicts per connection per hour and 10 per account per hour (`VERDICT_IP_HOURLY_LIMIT`, `VERDICT_ACCOUNT_HOURLY_LIMIT`), stored in the existing `runtime_rate_limits` table. Over the limit returns `429 VERDICT_RATE_LIMITED` with `Retry-After`. The agent free-verdict route keeps its own limit and is not counted twice. Limits fail open if D1 is unavailable, with a warning in the logs. |
| Cost tracking | Every delivered verdict logs one `verdict_cost` JSON line: AI calls, prompt, output and thinking tokens, searches per provider, and an estimated cost in USD. Failures log `verdict_error`. |
| Daily cost alarm | Estimated spend and verdict count add up per UTC day in `runtime_rate_limits` (scopes `verdict_cost_micro_usd` and `verdict_count`). The first verdict that crosses `VERDICT_DAILY_COST_ALARM_USD` (production: $5) logs `verdict_daily_cost_alarm` and, if the secret `VERDICT_COST_ALARM_WEBHOOK_URL` is set, posts to it once that day. |

### The setting

- Frontend (build time): `VITE_POST_VERDICT_OFFER`. Unset means the First 30 list. `sprint` brings back the Sprint panel, landing sections and Sprint legal text.
- Worker: `SPRINT_CHECKOUT_ENABLED`. Only `"true"` opens new Sprint checkouts.

Turning the Sprint back on needs both.

### Cost estimate rates

`VERDICT_COST_RATES_USD` in `src/api/verdictBudget.ts` holds planning rates, not invoice rates:
$0.10 per million input tokens, $0.40 per million output and thinking tokens, $0.015 per DataForSEO
query, and $0 for YouTube Data API and Podcast Index (quota-based). The log line keeps raw counts, so the
measured cost can be recomputed from invoices. Confirm or correct these rates once the first Vertex and
DataForSEO invoices arrive.

## Founder steps

1. **Check the legal pages locally.** `npm install`, then `npm run dev` and open `/terms`, `/refunds`,
   `/privacy` and `/disclaimer`. They have not had a lawyer's review.
2. **Decide on the 10-verdict pack** ($14.95). It is still reachable when the free allowance is used up,
   and the phase 1 terms describe it. The refund page commits only to adding missing credits or refunding a
   duplicate charge. If you want it gone in phase 1, say so and it can go behind the same setting.
3. **Optional secrets** on the production Worker: `VERDICT_COST_ALARM_WEBHOOK_URL` and
   `INTERNAL_RESEARCH_OWNER_EMAILS`.
4. **Production release workflow** (`docs/PRODUCTION_RELEASE.md`): `preflight` → `migrate-0011` →
   `stage-version` → `promote-version`, approving each.
5. **Pages production settings:** custom domains `ghosttowntest.com`, `www` and `app`;
   `VITE_API_URL=https://api.ghosttowntest.com`; remove `VITE_30_DAY_PLAN_DISPLAY_PRICE`; leave
   `VITE_POST_VERDICT_OFFER` unset. Then run `Production Pages Release`.

## Measuring the exit criteria

Exit: 50 real verdicts, verdict error rate under 2%, measured cost per verdict recorded against $0.04.

- Verdicts and estimated cost per day (production D1):
  `SELECT scope, window_key, used FROM runtime_rate_limits WHERE scope IN ('verdict_count', 'verdict_cost_micro_usd') ORDER BY window_key;`
  Divide `verdict_cost_micro_usd` by 1,000,000 for USD.
- Error rate: in Workers Logs, count `"event":"verdict_error"` against `"event":"verdict_cost"` over the
  same window.
- Fallbacks: `verdict_cost` lines with `"usedAI":false` were answered by the deterministic fallback
  instead of Vertex. They are not errors, but a high share means the AI path needs attention.
- Real cost: sum the token and search fields from `verdict_cost` lines and price them from the invoices.
