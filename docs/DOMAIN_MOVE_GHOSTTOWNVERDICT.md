# Moving from ghosttowntest.com to ghosttownverdict.com

The code now treats `ghosttownverdict.com` as the production domain and `ghosttowntest.com` as a former
domain that keeps working. Resource names that only contain "ghosttowntest" do not change: the GitHub
repository, the Pages project `ghosttowntest`, the D1 database, the R2 buckets, the KV namespace and the
Google Cloud project `ghosttowntest`.

## What the code does

- The site, sitemap, robots.txt, llms.txt, agent files, OpenAPI, MCP server listing, discovery pages and
  outgoing links use `ghosttownverdict.com` and `api.ghosttownverdict.com`.
- The production Worker answers on both `api.ghosttownverdict.com` and `api.ghosttowntest.com`
  (`wrangler.toml`), so old links, saved agent configs and the existing Stripe webhook keep working.
- Production CORS accepts both domains, and a page still open on the old domain calls the new API.
- Acceptance safety checks refuse both production domains.
- `FRONTEND_URL` is `https://ghosttownverdict.com`, so Stripe returns, handoff links and emails use the new
  domain.

## Founder steps, in order

The production Worker deploy fails if `ghosttownverdict.com` is not yet a zone in the Cloudflare account,
because Wrangler cannot attach `api.ghosttownverdict.com`. Do steps 1–3 before releasing this code.

1. **Cloudflare zone.** Add `ghosttownverdict.com` to the Zayas House LLC Cloudflare account. If it was bought
   elsewhere, point its nameservers to Cloudflare and wait until the zone shows Active.
2. **Email.** In Email Routing for the new zone, create `support@ghosttownverdict.com` and
   `hello@ghosttownverdict.com` and forward them to your inbox. Send a test to each.
3. **Pages domains.** In the `ghosttowntest` Pages project, add the custom domains `ghosttownverdict.com`,
   `www.ghosttownverdict.com` and `app.ghosttownverdict.com`. Set `VITE_API_URL=https://api.ghosttownverdict.com`.
4. **Release.** Merge, then run the production release workflow (preflight → migrate → stage → promote) and
   `Production Pages Release`. The Worker picks up `api.ghosttownverdict.com` on deploy.
5. **Redirect the old domain.** In the `ghosttowntest.com` zone, add a redirect rule: hostnames
   `ghosttowntest.com`, `www.ghosttowntest.com` and `app.ghosttowntest.com` → `https://ghosttownverdict.com`
   with the same path and query string, status 301. Leave `api.ghosttowntest.com` alone. Then remove the
   old hostnames from the Pages project's custom domains.
6. **Cloudflare OAuth client (Get Me Live).** Add
   `https://api.ghosttownverdict.com/api/get-me-live/cloudflare/callback` as an allowed redirect URI. Keep the
   old one until the old API host is retired.
7. **Stripe.** In Settings → Public details, set the website to `https://ghosttownverdict.com`, the support email
   to `support@ghosttownverdict.com`, and the terms, privacy and refund links to the new domain. Optionally add a
   webhook endpoint on `api.ghosttownverdict.com`. The old endpoint keeps working while `api.ghosttowntest.com` is
   served.
8. **Search and listings.** In Google Search Console, add `ghosttownverdict.com` and use Change of Address from
   the old property. Update any MCP registry or directory listing that shows the old API URL.
9. **Integrations.** Point Shorts Factory and Story Studio at `api.ghosttownverdict.com`.

## Later

After about six months with no traffic on `api.ghosttowntest.com`, remove it from `wrangler.toml`, from the
CORS and frontend alias lists, and from the OAuth client, and keep only the 301 redirect for the old site.
