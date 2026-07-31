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

Required secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_30_DAY_PLAN_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`. Configure the matching mode-specific Product IDs as `STRIPE_VERDICT_PACK_PRODUCT_ID` and `STRIPE_30_DAY_PLAN_PRODUCT_ID`. Keep `STRIPE_PAID_TEST_PRICE_ID` only for old pending seven-day paid-report orders. Set `LIT_API_KEY` to require bearer authentication from Shorts Factory.

## Website policy and Stripe settings

The canonical website is `https://ghosttowntest.com`. Publish and keep linked from the site footer:

- `https://ghosttowntest.com/privacy`
- `https://ghosttowntest.com/terms`
- `https://ghosttowntest.com/refunds`
- `https://ghosttowntest.com/disclaimer`

In Stripe Checkout settings, configure the business identity `Zayas House LLC`, support contact, terms URL, privacy URL, and refund-policy URL. The confirmed sandbox Products are Launch Blueprint `prod_Uyw4i87a8qRReT` with a one-time **$97.00** Price and Verdict Pack `prod_Uyxf3Bm5FCwAKu` with a one-time **$14.97** Price. Configure these IDs only with a sandbox key. Live mode requires separately created live Products and Prices, with their IDs configured in the same variables. Product IDs (`prod_...`) cannot be used in place of Price IDs (`price_...`).

## Spanish

The funnel has a persistent EN/ES switch in the app header and `/es` links to Spanish mode. The selected language is stored locally. Keep legal, checkout, and automated email copy in the same selected language before sending live traffic.
