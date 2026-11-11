# Moving from ghosttowntest.com to ghosttownverdict.app

The code now treats `ghosttownverdict.app` as the production domain and `ghosttowntest.com` as a former
domain that keeps working. Resource names that only contain "ghosttowntest" do not change: the GitHub
repository, the Pages project `ghosttowntest`, the D1 database, the R2 buckets, the KV namespace and the
Google Cloud project `ghosttowntest`.

## What the code does

- The site, sitemap, robots.txt, llms.txt, agent files, OpenAPI, MCP server listing, discovery pages and
  outgoing links use `ghosttownverdict.app` and `api.ghosttownverdict.app`.
- `wrangler.toml` lists both `api.ghosttownverdict.app` and `api.ghosttowntest.com` as the production Worker's
  custom domains, so old links, saved agent configs and the existing Stripe webhook keep working. The release
  workflow deploys with `wrangler versions upload` and `versions deploy`, which never apply custom domains, and
  its token has no zone permissions. Attach `api.ghosttownverdict.app` once in the dashboard (step 4).
- The release workflow's health checks use `api.ghosttownverdict.app` when it answers and fall back to
  `api.ghosttowntest.com`, the same Worker, until then.
- Production CORS accepts both domains, and a page still open on the old domain calls the new API.
- Acceptance safety checks refuse both production domains.
- `FRONTEND_URL` is `https://ghosttownverdict.app`, so Stripe returns, handoff links and emails use the new
  domain.

`.app` domains only work over HTTPS: browsers refuse plain HTTP for every `.app` name. Cloudflare issues the
certificates automatically for proxied hostnames, so no extra step is needed, but nothing can be served on `http://`.

## Founder steps, in order

Do steps 1–4 before releasing. The new site calls `api.ghosttownverdict.app`, so that host must reach the Worker
before `Production Pages Release` runs.

1. **Cloudflare zone.** Add `ghosttownverdict.app` to the Zayas House LLC Cloudflare account. If it was bought
   elsewhere, point its nameservers to Cloudflare and wait until the zone shows Active.
2. **Email.** In Email Routing for the new zone, create `support@ghosttownverdict.app` and
   `hello@ghosttownverdict.app` and forward them to your inbox. Send a test to each.
3. **Pages domains.** In the `ghosttowntest` Pages project, add the custom domains `ghosttownverdict.app`,
   `www.ghosttownverdict.app` and `app.ghosttownverdict.app`. Set `VITE_API_URL=https://api.ghosttownverdict.app`.
   Do **not** add `api.ghosttownverdict.app` to Pages: that host belongs to the Worker.
4. **Worker domain.** Once the zone is Active: Workers & Pages → `lit-ghost-town-api-production` → Settings →
   Domains & Routes → Add → Custom domain → `api.ghosttownverdict.app`. Check that
   `https://api.ghosttownverdict.app/api/integrations/shorts-factory/health` returns `"status":"ok"`.
5. **Release.** Run the production release workflow (preflight → migrate-0011 → stage-version → promote-version),
   then `Production Pages Release`.
6. **Redirect the old domain.** In the `ghosttowntest.com` zone, add a redirect rule: hostnames
   `ghosttowntest.com`, `www.ghosttowntest.com` and `app.ghosttowntest.com` → `https://ghosttownverdict.app`
   with the same path and query string, status 301. Leave `api.ghosttowntest.com` alone. Then remove the
   old hostnames from the Pages project's custom domains.
7. **Cloudflare OAuth client (Get Me Live).** Add
   `https://api.ghosttownverdict.app/api/get-me-live/cloudflare/callback` as an allowed redirect URI. Keep the
   old one until the old API host is retired.
8. **Stripe.** In Settings → Public details, set the website to `https://ghosttownverdict.app`, the support email
   to `support@ghosttownverdict.app`, and the terms, privacy and refund links to the new domain. Optionally add a
   webhook endpoint on `api.ghosttownverdict.app`. The old endpoint keeps working while `api.ghosttowntest.com` is
   served.
9. **Search and listings.** In Google Search Console, add `ghosttownverdict.app` and use Change of Address from
   the old property. Update any MCP registry or directory listing that shows the old API URL.
10. **Integrations.** Point Shorts Factory and Story Studio at `api.ghosttownverdict.app`.

## Later

After about six months with no traffic on `api.ghosttowntest.com`, remove it from `wrangler.toml`, from the
CORS and frontend alias lists, and from the OAuth client, and keep only the 301 redirect for the old site.
