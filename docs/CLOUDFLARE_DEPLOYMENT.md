# GhostTown Test on Cloudflare

## Domain roles

| Hostname | Purpose |
| --- | --- |
| `ghosttowntest.com` | Canonical English/Spanish GhostTown Test website and app |
| `app.ghosttowntest.com` | Optional alias to the canonical app |
| `api.ghosttowntest.com` | Cloudflare Worker API |
| `lit-ghosttown.app` | Legacy redirect to `ghosttowntest.com` |

## Pages

Create one Cloudflare Pages project named `ghosttowntest` from this repository. Build command: `npm run build`. Output directory: `dist`. Add `ghosttowntest.com`, `www.ghosttowntest.com`, and `app.ghosttowntest.com` as custom domains. Set `VITE_API_URL=https://api.ghosttowntest.com` in both Pages production and preview environments.

## Worker

Deploy the Worker with `npx wrangler deploy --env production` after setting production KV IDs and Worker secrets. The Wrangler configuration attaches `api.ghosttowntest.com` as a Worker Custom Domain, so Cloudflare creates and manages the DNS record and certificate. Set `FRONTEND_URL=https://ghosttowntest.com`. The Worker CORS allow-list covers the root, `www`, optional `app`, Pages previews, and the legacy domain. The read-only Shorts Factory handshake is `GET /api/integrations/shorts-factory/health`; verdict generation remains `POST /api/verdict`.

Required secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PAID_TEST_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`. Set `LIT_API_KEY` to require bearer authentication from Shorts Factory.

## Spanish

The funnel has a persistent EN/ES switch in the app header and `/es` links to Spanish mode. The selected language is stored locally. Keep legal, checkout, and automated email copy in the same selected language before sending live traffic.
