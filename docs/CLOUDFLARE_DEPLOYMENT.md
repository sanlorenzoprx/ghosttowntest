# GhostTown Test on Cloudflare

## Domain roles

| Hostname | Purpose |
| --- | --- |
| `ghosttownverdict.com` | Canonical English/Spanish GhostTown Test website and app |
| `app.ghosttownverdict.com` | Optional alias to the canonical app |
| `api.ghosttownverdict.com` | Cloudflare Worker API |
| `ghosttowntest.com`, `www.`, `app.` | Former domain: 301 redirect to the same path on `ghosttownverdict.com` |
| `api.ghosttowntest.com` | Former API host, still served by the same Worker during the move |
| `lit-ghosttown.app` | Legacy redirect to `ghosttownverdict.com` |

## Pages

Create one Cloudflare Pages project named `ghosttowntest` from this repository. Build command: `npm run build`. Output directory: `dist`. Add `ghosttownverdict.com`, `www.ghosttownverdict.com`, and `app.ghosttownverdict.com` as custom domains. Set `VITE_API_URL=https://api.ghosttownverdict.com` in the Pages production environment. During rollout phase 1, remove `VITE_30_DAY_PLAN_DISPLAY_PRICE` and leave `VITE_POST_VERDICT_OFFER` unset so the verdict page offers the First 30 email list instead of the dormant $97 Sprint (see `docs/ROLLOUT_PHASE_1.md`).

## Worker

Deploy the Worker with `npx wrangler deploy --env production` after setting production KV IDs and Worker secrets. The Wrangler configuration attaches `api.ghosttownverdict.com` as a Worker Custom Domain, so Cloudflare creates and manages the DNS record and certificate. Set `FRONTEND_URL=https://ghosttownverdict.com`. The Worker CORS allow-list covers the root, `www`, optional `app`, Pages previews, and the legacy domain. The read-only Shorts Factory handshake is `GET /api/integrations/shorts-factory/health`; verdict generation remains `POST /api/verdict`.

Required secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_30_DAY_PLAN_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`. Optional for rollout phase 1: `VERDICT_COST_ALARM_WEBHOOK_URL` (Slack or Discord incoming webhook for the daily verdict cost alarm) and `INTERNAL_RESEARCH_OWNER_EMAILS` (owners who may export the First 30 email list). Production `wrangler.toml` vars keep `SPRINT_CHECKOUT_ENABLED = "false"` while the Sprint is dormant. Keep `STRIPE_PAID_TEST_PRICE_ID` only for old pending seven-day paid-report orders. Set `LIT_API_KEY` to require bearer authentication from Shorts Factory.

## Website policy and Stripe settings

The canonical website is `https://ghosttownverdict.com`. Publish and keep linked from the site footer:

- `https://ghosttownverdict.com/privacy`
- `https://ghosttownverdict.com/terms`
- `https://ghosttownverdict.com/refunds`
- `https://ghosttownverdict.com/disclaimer`

In Stripe Checkout settings, configure the business identity `Zayas House LLC`, support contact, terms URL, privacy URL, and refund-policy URL. Confirm that the one-time price attached to `STRIPE_30_DAY_PLAN_PRICE_ID` is exactly **$97.00** in the same mode as the Worker secret. The lower-priced assessment-credit checkout remains a decline-path fallback, not the 30-day plan.

## Spanish

The funnel has a persistent EN/ES switch in the app header and `/es` links to Spanish mode. The selected language is stored locally. Keep legal, checkout, and automated email copy in the same selected language before sending live traffic.
