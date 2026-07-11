# GhostTown Test on Cloudflare

## Domain roles

| Hostname | Purpose |
| --- | --- |
| `ghosttowntest.com` | English/Spanish acquisition funnel and product pages |
| `app.ghosttowntest.com` | LIT verdict and paid GhostTown Test app |
| `api.ghosttowntest.com` | Cloudflare Worker API |
| `lit-ghosttown.app` | 301 redirect to `app.ghosttowntest.com` |

## Pages

Create one Cloudflare Pages project named `ghosttowntest` from this repository. Build command: `npm run build`. Output directory: `dist`. Add `ghosttowntest.com`, `www.ghosttowntest.com`, and `app.ghosttowntest.com` as custom domains. Set `VITE_API_URL=https://api.ghosttowntest.com` in both Pages production and preview environments.

## Worker

Deploy the Worker with `npx wrangler deploy --env production` after setting production KV IDs and Worker secrets. Bind `api.ghosttowntest.com/*` to the Worker. Set `FRONTEND_URL=https://app.ghosttowntest.com`; add the marketing hostname to the Worker CORS allow-list if the landing page calls the API directly.

Required secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PAID_TEST_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`.

## Spanish

The funnel has a persistent EN/ES switch in the app header and `/es` links to Spanish mode. The selected language is stored locally. Keep legal, checkout, and automated email copy in the same selected language before sending live traffic.
