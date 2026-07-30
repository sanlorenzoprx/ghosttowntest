# GhostTown Test on Cloudflare

## Domain roles

| Hostname | Purpose |
| --- | --- |
| `ghosttowntest.com` | Canonical English/Spanish GhostTown Test website and app |
| `app.ghosttowntest.com` | Optional alias to the canonical app |
| `api.ghosttowntest.com` | Cloudflare Worker API |
| `lit-ghosttown.app` | Legacy redirect to `ghosttowntest.com` |

## Pages

Create one Cloudflare Pages project named `ghosttowntest` from this repository. Build command: `npm run build`. Output directory: `dist`. Add `ghosttowntest.com`, `www.ghosttowntest.com`, and `app.ghosttowntest.com` as custom domains. Set `VITE_API_URL=https://api.ghosttowntest.com` and `VITE_30_DAY_PLAN_DISPLAY_PRICE=$97.00` in the Pages production environment.

## Worker

Deploy the Worker with `npx wrangler deploy --env production` after setting production KV IDs and Worker secrets. The Wrangler configuration attaches `api.ghosttowntest.com` as a Worker Custom Domain, so Cloudflare creates and manages the DNS record and certificate. Set `FRONTEND_URL=https://ghosttowntest.com`. The Worker CORS allow-list covers the root, `www`, optional `app`, Pages previews, and the legacy domain. The read-only Shorts Factory handshake is `GET /api/integrations/shorts-factory/health`; verdict generation remains `POST /api/verdict`.

Required secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_30_DAY_PLAN_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`. Keep `STRIPE_PAID_TEST_PRICE_ID` only for old pending seven-day paid-report orders. Set `LIT_API_KEY` to require bearer authentication from Shorts Factory.

## Website policy and Stripe settings

The canonical website is `https://ghosttowntest.com`. Publish and keep linked from the site footer:

- `https://ghosttowntest.com/privacy`
- `https://ghosttowntest.com/terms`
- `https://ghosttowntest.com/refunds`
- `https://ghosttowntest.com/disclaimer`

In Stripe Checkout settings, configure the business identity `Zayas House LLC`, support contact, terms URL, privacy URL, and refund-policy URL. Confirm that the one-time price attached to `STRIPE_30_DAY_PLAN_PRICE_ID` is exactly **$97.00** in the same mode as the Worker secret. The lower-priced assessment-credit checkout remains a decline-path fallback, not the 30-day plan.

## Spanish

The funnel has a persistent EN/ES switch in the app header and `/es` links to Spanish mode. The selected language is stored locally. Keep legal, checkout, and automated email copy in the same selected language before sending live traffic.
