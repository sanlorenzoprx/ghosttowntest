# GhostTown — Functional Discovery Surface 01

**Status:** implemented on `feat/functional-discovery-surface-01` pending CI/merge/deployment.

## Commercial outcome

Create many discoverable doors into one monetizable product function:

`intent page -> canonical free verdict -> secure human handoff -> saved verdict -> $97 Launch Blueprint -> Stripe attribution`

The slice does not create another verdict engine, checkout system, analytics stack, or orchestration layer.

## Executed slices

### FD-01 — Intent catalog

Ten high-intent business validation doors are defined in `config/functional-discovery-intents.json`: SaaS, AI startup, local business, ecommerce, service business, marketplace, app, side hustle, build-or-test, and cheapest-test intent.

### FD-02 — Functional static utilities

`scripts/generate-functional-discovery-pages.mjs` runs during every production build and emits real crawlable HTML plus a Markdown twin for every intent.

Each utility calls only `POST /api/v1/free-verdict`, renders `needs_input` questions without fabricating answers, and produces the secure expiring GhostTown handoff when complete.

### FD-03 — Search and AI discovery

- sitemap includes all ten utilities;
- `robots.txt` explicitly allows general crawlers, OAI-SearchBot, and ChatGPT-User;
- `llms.txt` and `llms-full.txt` index the utilities and machine interfaces;
- each utility includes canonical/meta/social tags and truthful WebPage + Service structured data.

### FD-04 — Multi-channel distribution

`/discovery-manifest.json` and `/distribution-channels.json` make the same utilities usable by Story Studio, partners, directories, newsletters, communities, and social distribution.

Supported acquisition dimensions include source, campaign, platform, creative ID, publication ID, experiment ID, distribution account ID, and share type.

### FD-05 — Commercial attribution continuity

Utility acquisition parameters are forwarded into the secure handoff. `AgentHandoff` captures the incoming utility parameters first, then records the agent handoff as last touch. The existing GhostTown commercial attribution and Stripe metadata path remains authoritative.

### FD-06 — IndexNow

A root verification key and `npm run indexnow:submit` command are present. Submission is intentionally run after the new URLs are publicly deployed.

### FD-07 — MCP Registry packaging

`server.json` describes the public GhostTown remote MCP server at `https://api.ghosttowntest.com/mcp` using the current MCP Registry remote-server schema. Registry publication occurs only after the endpoint carrying this release is publicly reachable.

### FD-08 — Contract tests

`tests/functionalDiscovery.test.ts` locks the ten-intent catalog, canonical verdict reuse, crawler surface, multi-channel link contract, and first-touch handoff preservation.

## Deliberately not added

- no generated review/rating claims;
- no 200-page content factory;
- no autonomous purchase;
- no duplicate verdict provider;
- no agent-only database;
- no proof/ranking bureaucracy before traffic exists.

## Release completion

1. Full PR CI green.
2. Merge to `main`.
3. Deploy Pages/Worker through the normal authorized production path.
4. Run IndexNow submission after URLs return publicly.
5. Publish MCP Registry metadata after `/mcp` is publicly reachable.
6. Feed Story Studio and external distribution links from `/discovery-manifest.json` rather than the generic homepage.
