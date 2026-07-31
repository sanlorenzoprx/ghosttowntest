# GhostTown Launch Blueprint — Cursor/Codex Implementation Handoff

**Date:** 2026-07-31  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Target branch:** `feat/launch-blueprint-spa`  
**Current pull request:** PR #7  
**Purpose:** Finish the paid GhostTown Launch Blueprint as one coherent customer product—not a PDF, website, research report, and calendar assembled as unrelated bonuses.

---

## 1. Execution contract for Cursor/Codex

This handoff is an implementation directive, not a brainstorming document.

Before changing code:

1. Read the current files listed in **Section 4**.
2. Treat current repository code, tests, CI receipts, and live configuration as authoritative.
3. Do not reintroduce Google Search Grounding into paid customer fulfillment.
4. Do not add a second Blueprint schema, second order store, second workflow engine, or unrelated provider abstraction.
5. Extend the existing `ghosttown-launch-blueprint-v2` contract, Stripe order, Cloudflare Workflow, D1/R2 storage, PDF, dashboard, and seed-confirmation flow.
6. Preserve legacy paid artifacts while making `launch_blueprint_v2` the complete current product.
7. Keep every external-data provider fail-closed and every model output constrained to provider-owned candidate IDs.
8. Do not expose credentials in Git, logs, generated artifacts, screenshots, or chat.
9. Do not merge or deploy until all repository checks and the full Stripe test-mode acceptance run pass.

When implementation is complete, provide:

- changed-file list;
- exact tests added or changed;
- CI run ID and conclusion;
- remaining owner-controlled secrets/resources;
- one full acceptance receipt from free verdict through paid Blueprint, public Launch Site, downloads, and account recovery.

---

## 2. Immutable customer promise

The paid customer receives one product named **GhostTown Launch Blueprint**.

It must include:

1. Personalized 30-day launch roadmap.
2. Clear offer and pricing strategy.
3. Target-customer and positioning plan.
4. Current customer-access and Media & Distribution Network research.
5. Landing-page messaging and sales copy.
6. Customer outreach scripts and action plan.
7. Weekly priorities, milestones, and success metrics.
8. Thirty-day daily execution calendar.
9. Personalized Cloudflare Launch Site Starter.
10. Downloadable plan and finished assets saved to the customer account.

### Product invariant: the website is part of the Blueprint

The Cloudflare Launch Site Starter is **not** a separate unrelated bonus.

It is the working implementation of:

- `blueprint.landingPageCopy`;
- `blueprint.launchSite`;
- `blueprint.offer`;
- `blueprint.positioning`;
- the Blueprint’s validation-stage proof boundaries;
- the Blueprint’s lead-capture action.

The same canonical Blueprint record must drive:

```text
Authenticated Blueprint dashboard
        +
Professional PDF
        +
Canonical JSON
        +
Downloadable asset bundle
        +
Public Cloudflare Launch Site
```

No surface may maintain a separate hand-edited version of the offer or landing-page copy.

---

## 3. Grounded repository audit

### 3.1 Already implemented on the current branch

The following are present in code and must be preserved:

- `ghosttown-launch-blueprint-v2` canonical type contract.
- Business-model-aware offer and pricing generator.
- Target-customer and positioning plan.
- Media & Distribution Network target types:
  - podcasts;
  - YouTube creators;
  - newsletters/publications;
  - events;
  - associations;
  - review sites;
  - complementary partners;
  - public communities when appropriate.
- Post-purchase `awaiting_seeds` state.
- Guided competitor/adjacent-brand suggestions after payment.
- Verification of two or three public HTTPS commercial seed domains.
- DataForSEO/Podcast Index/YouTube distribution-footprint engine.
- Gemini selection constrained to immutable provider candidate IDs.
- Cloudflare Workflow orchestration.
- D1 canonical Blueprint and progress design.
- Private R2 PDF and JSON design.
- Professional PDF renderer.
- Executable authenticated Blueprint dashboard.
- Thirty-day completion tracking, evidence notes, metrics, and final decision.
- Dashboard recovery for paid orders.
- Authenticated PDF and JSON downloads.
- Separate owner-only Google research console.
- CI coverage for Blueprint generation, distribution-footprint research, PDF rendering, Worker dry run, and production build.

### 3.2 Partially implemented

#### Personalized Cloudflare Launch Site Starter

Present:

- `LaunchSiteConfig` canonical schema;
- generated site identity, offer, problem, solution, positioning, proof boundaries, FAQ, lead-capture configuration, and legal flags;
- launch-copy preview inside the authenticated Blueprint SPA;
- Launch Site content rendered into the PDF.

Missing:

- a public customer-specific URL;
- publish/unpublish controls;
- a public renderer driven from the canonical Blueprint;
- public lead capture;
- persisted lead records;
- owner lead view/export;
- safe slug lifecycle;
- public cache and security policy;
- proof that the public page and the Blueprint use the same canonical values.

#### Downloadable plan and assets

Present:

- private PDF download;
- private canonical JSON download;
- account history and repeat download.

Missing:

- a finished asset bundle containing the generated launch copy, outreach scripts, helpful posts, calendar, Media & Distribution targets, and Launch Site configuration in usable formats.

### 3.3 Not implemented

#### Pre-purchase micro-commitments

The current free intake captures:

- idea name;
- description;
- target user;
- painful problem;
- current alternative;
- founder motivation.

It does **not** yet capture the three pre-purchase attention signals:

1. A brand/product the target customer already buys.
2. A podcast, YouTube channel, or creator the target customer consumes.
3. An association, event, newsletter, publication, or community the customer trusts.

The current seed suggestion engine runs only after payment and primarily uses Gemini model knowledge plus homepage verification. It does not yet run the approved lightweight DataForSEO/Podcast Index/YouTube suggestion flow before purchase.

---

## 4. Authoritative files to inspect first

Do not begin implementation without reading these current files:

### Product and data contracts

- `src/types/lit.ts`
- `src/types/paidTest.ts`
- `src/types/launchBlueprint.ts`
- `src/lib/ghosttownOffer.ts`
- `docs/LAUNCH_BLUEPRINT_V2.md`
- `docs/launch-blueprint-v2-acceptance.md`
- `docs/LAUNCH_BLUEPRINT_V2_DEPLOYMENT.md`

### Free verdict and paid conversion

- `src/components/IdeaIntake.tsx`
- `src/components/QuestionFlow.tsx`
- `src/components/ResultReport.tsx`
- `src/components/ActionPlanModal.tsx`
- `src/api/paidTest.ts`

### Post-purchase intake and fulfillment

- `src/components/CompetitorSeedStep.tsx`
- `src/api/blueprintSeeds.ts`
- `src/api/blueprintFulfillment.ts`
- `src/api/launchBlueprintWorkflow.ts`
- `src/api/distributionFootprintResearch.ts`
- `src/api/customerAccessResearch.ts`
- `src/api/webhook.ts`

### Blueprint generation and delivery

- `src/api/launchBlueprintGenerator.ts`
- `src/api/blueprintApi.ts`
- `src/api/blueprintStore.ts`
- `src/api/blueprintPdf.ts`
- `src/components/LaunchBlueprintView.tsx`
- `src/components/ActionPlanSuccess.tsx`
- `src/components/UserDashboard.tsx`

### Runtime and deployment

- `src/api/env.ts`
- `src/api/index.ts`
- `src/api/worker.ts`
- `wrangler.toml`
- `migrations/0002_launch_blueprints.sql`
- `.github/workflows/*`

### Tests

- `tests/launchBlueprintGenerator.test.ts`
- `tests/customerAccessResearch.test.ts`
- `tests/blueprintPdf.test.ts`
- `tests/paidTest.test.ts`
- `tests/integration.test.ts`
- `tests/mobileFunnel.test.ts`

---

## 5. Target customer journey

Implement this exact sequence.

```text
1. Customer enters idea
2. Customer completes free GhostTown assessment
3. Free verdict is generated immediately
4. Result page presents three optional micro-commitments
5. Each answer produces an immediate useful insight
6. GhostTown previews the paid Media & Distribution opportunity
7. Customer opens paid Blueprint checkout
8. Checkout intake is prefilled from verdict + micro-commitments
9. Stripe payment succeeds
10. Customer sees “Confirm your starting research map,” not a new blank questionnaire
11. Customer confirms 2–3 commercial seed domains
12. Audience and ecosystem signals are already carried forward
13. Cloudflare Workflow starts
14. Distribution-footprint providers run
15. Original public sources are verified
16. Gemini ranks only provider candidate IDs
17. Canonical Blueprint passes quality gate
18. PDF, JSON, asset ZIP, and public Launch Site are created from the same Blueprint
19. Customer opens the executable Blueprint and public Launch Site from the account
20. Progress, leads, downloads, and final decision remain available after sign-out and on another device
```

### Conversion rule

The free verdict must never be blocked by the optional micro-commitments.

The recommended placement is on `ResultReport.tsx`, after the free verdict evidence and before the paid Blueprint offer. This preserves the immediate free result while keeping all micro-commitments pre-purchase.

---

## 6. Pre-purchase micro-commitment implementation

### 6.1 UX principles

Each interaction must:

- ask for one concrete signal;
- fit on one mobile card;
- accept a typed answer or a suggested choice;
- include **Show suggestions**;
- include **I’m not sure**;
- never block purchase;
- give an immediate analysis sentence after selection;
- take seconds, not minutes;
- save automatically;
- avoid repeating information after payment.

### 6.2 Exact questions

#### Card A — Commercial signal

**Question:** `What is one brand or product your customer already buys?`

Actions:

- Enter a brand/product.
- Show suggestions.
- I’m not sure.

Example immediate insight:

> KiwiCo suggests this audience already pays for curated family activities. The paid Blueprint can reverse-engineer which creators, publications, podcasts, and partners send attention to similar products.

#### Card B — Attention signal

**Question:** `What might they watch or listen to?`

Signal types:

- podcast;
- YouTube channel;
- creator.

Example immediate insight:

> The Dice Tower gives GhostTown an audience starting point for related reviewers, channels, shows, and sponsorship paths.

#### Card C — Trust/ecosystem signal

**Question:** `Where might they learn or gather?`

Signal types:

- association;
- event;
- newsletter;
- publication;
- community.

Example immediate insight:

> Gen Con is an ecosystem clue: it can reveal speakers, sponsors, media partners, reviewers, and adjacent events already trusted by this market.

### 6.3 New client component

Add:

```text
src/components/PrePurchaseResearchSignals.tsx
```

Responsibilities:

- display the three cards;
- call the suggestion endpoint only when requested;
- show a maximum of six choices per card;
- allow one primary selection plus optional typed value per card;
- display the immediate insight;
- persist draft state locally;
- expose one complete `PrePurchaseResearchSignals` object to `ResultReport` and `ActionPlanModal`;
- preserve keyboard navigation and mobile tap targets;
- never render raw provider snippets.

### 6.4 Data contract

Create or add the following types without weakening existing required fields:

```ts
export type PrePurchaseSignalOrigin =
  | 'customer_entered'
  | 'provider_suggestion'
  | 'not_sure';

export interface CommercialAttentionSignal {
  name: string;
  publicUrl?: string;
  relationship?:
    | 'direct_competitor'
    | 'adjacent_product'
    | 'current_alternative';
  origin: PrePurchaseSignalOrigin;
  verified?: boolean;
}

export interface AudienceAttentionSignal {
  name: string;
  publicUrl?: string;
  type: 'podcast' | 'youtube_channel' | 'creator';
  origin: PrePurchaseSignalOrigin;
  verified?: boolean;
}

export interface EcosystemAttentionSignal {
  name: string;
  publicUrl?: string;
  type: 'association' | 'event' | 'newsletter' | 'publication' | 'community';
  origin: PrePurchaseSignalOrigin;
  verified?: boolean;
}

export interface PrePurchaseResearchSignals {
  schemaVersion: 'prepurchase-research-signals-v1';
  resultId: string;
  targetCustomerConfirmed: string;
  commercial: CommercialAttentionSignal[];
  audience: AudienceAttentionSignal[];
  ecosystem: EcosystemAttentionSignal[];
  updatedAt: string;
}
```

Recommended location:

```text
src/types/researchSignals.ts
```

Add this as an optional field to `PaidTestIntake`:

```ts
researchSignals?: PrePurchaseResearchSignals;
```

Do not add it to public video metadata or public Shorts Factory payloads.

### 6.5 Persistence

Before purchase:

- persist locally under a versioned result-specific key;
- do not require an account;
- when logged in, optional account synchronization may be added only if it reuses the existing authenticated result store.

At checkout creation:

- send the selected signal map inside `PaidTestIntake`;
- persist it into the existing paid order intake;
- include only normalized selected fields, not raw provider responses.

After payment:

- show the carried-forward map;
- do not ask the three questions again;
- allow editing before research starts;
- lock changes once the Workflow begins.

---

## 7. Lightweight pre-purchase suggestion API

### 7.1 Purpose

This endpoint exists only to help a free user recognize likely seeds.

It must not perform the paid backlink graph or complete Media & Distribution research.

### 7.2 Endpoint

Add:

```text
POST /api/research-preview/suggestions
```

Request:

```ts
{
  resultId: string;
  idea: {
    ideaName: string;
    description: string;
    targetUser: string;
    painfulProblem: string;
    currentAlternative?: string;
  };
  signalType: 'commercial' | 'audience' | 'ecosystem';
  typedSeed?: string;
  locale: 'en-US' | 'es-PR';
}
```

Response:

```ts
{
  suggestions: Array<{
    suggestionId: string;
    name: string;
    publicUrl?: string;
    type: string;
    reason: string;
    verified: boolean;
    sourceProvider: 'dataforseo' | 'podcast_index' | 'youtube';
  }>;
  insight: string;
}
```

Headers:

```text
Cache-Control: private, no-store
Content-Type: application/json
```

### 7.3 Provider routing

#### Commercial

Use a small DataForSEO live SERP query set:

- direct category query;
- alternatives query;
- adjacent paid-product query.

Maximum:

- three searches;
- ten organic candidates per search;
- six verified suggestions returned.

Do not run the Backlinks API before purchase.

#### Audience

Use:

- Podcast Index for show candidates;
- YouTube Data API for channel/video candidates.

Return a mixed maximum of six verified suggestions.

#### Ecosystem

Use the smallest appropriate provider query:

- DataForSEO organic search for associations, events, publications, or newsletters;
- YouTube/Podcast Index only when the typed clue is clearly media-oriented.

### 7.4 Data handling

- Keep raw provider responses in memory only.
- Do not write preview responses to D1 or R2.
- Do not store search snippets in the paid order.
- Verify the final public URL before returning a suggestion.
- Store only the customer-selected normalized signal at checkout.
- Reject private IPs, localhost, credentials in URLs, non-HTTPS URLs, dead pages, and duplicate domains.

### 7.5 Abuse and cost controls

Use existing Cloudflare primitives; do not introduce another service.

Required:

- Turnstile or equivalent existing bot boundary if available;
- KV rate limit by privacy-preserving request key;
- maximum three suggestion calls per free result without account;
- maximum six with authenticated account;
- request timeout;
- provider-specific failure isolation;
- generic fallback choices when a provider is unavailable;
- no full paid research before Stripe payment.

### 7.6 Gemini role

Gemini may:

- classify provider candidates;
- produce the one-sentence immediate insight;
- rank only returned candidate IDs.

Gemini may not:

- invent a brand;
- invent a URL;
- invent a contact;
- invent an event;
- add a candidate not returned by a provider;
- claim a search occurred when no provider call succeeded.

---

## 8. Post-purchase confirmation map

Refactor the current `CompetitorSeedStep` from a paid blank intake into a confirmation map.

### 8.1 Required screen

```text
Confirm the starting map for your research

Target customer
[pre-filled target customer]

Commercial footprints
[2–3 selected/verified brands or alternatives]

Audience signals
[podcast / YouTube / creator selections]

Trusted ecosystems
[association / event / newsletter / publication / community selections]

[Edit map] [Start my research]
```

### 8.2 Commercial seed rule

Keep the existing quality boundary:

- exactly two or three distinct commercial seed domains must be confirmed before the Workflow starts.

When the pre-purchase map does not contain enough commercial seeds:

- run the lightweight DataForSEO seed suggestion search after payment;
- display the results;
- require confirmation;
- do not use Gemini-only brand/domain guesses as the primary path.

### 8.3 Audience and ecosystem signals

These do not replace the two-to-three commercial seed requirement.

They enrich provider queries:

- audience signals feed Podcast Index and YouTube expansion;
- ecosystem signals feed association/event/publication discovery and original-source verification;
- all confirmed signals are stored in the paid order intake and research receipt.

---

## 9. Media & Distribution Network integration

Extend the existing research input without rebuilding the provider layer.

### 9.1 Research map

```ts
interface DistributionResearchMap {
  targetCustomer: string;
  commercialSeeds: CompetitorSeed[];
  audienceSignals: AudienceAttentionSignal[];
  ecosystemSignals: EcosystemAttentionSignal[];
}
```

### 9.2 Provider use

#### DataForSEO Backlinks

Use confirmed commercial domains to identify:

- referring publications;
- reviewers;
- events;
- associations;
- directories;
- complementary partners;
- educational resources;
- sponsorship and referral footprints.

#### Podcast Index

Query:

- confirmed commercial names;
- category/problem terms;
- selected podcast or creator signals;
- adjacent audience terms.

#### YouTube Data API

Query:

- confirmed commercial names;
- product category;
- customer problem;
- selected channels or creators;
- recent reviewers and educators.

### 9.3 Final target requirements

Every delivered target must contain:

- target type;
- public name;
- public URL;
- source attribution;
- research date;
- activity/confidence;
- audience owner;
- competitor or audience evidence;
- access path;
- recommended approach;
- prepared asset;
- matching outreach script;
- risk;
- first action.

The existing 10–25 target and three-category quality gate remains mandatory.

---

## 10. Canonical Blueprint integration

Do not create a separate “research report.”

The micro-commitments and distribution research must improve the existing fields:

### Executive launch decision

Use the signals to sharpen:

- recommended initial customer;
- strongest opportunity;
- validation objective;
- biggest access risk.

### Offer and pricing

Use competitor/adjacent-product context to improve:

- current alternatives;
- offer scope;
- pricing rationale;
- objection handling;
- risk reversal.

Do not copy competitor claims or prices without verified source support.

### Positioning

Use verified footprints to improve:

- alternative weaknesses;
- differentiator;
- buyer language hypotheses;
- trigger events;
- rejection reasons.

### Media & Distribution Network

This remains the primary customer-access section.

### Landing-page copy

Reference the same:

- target customer;
- problem;
- offer;
- pricing;
- differentiation;
- proof boundary;
- CTA.

### Outreach scripts and action plan

Assign each priority target:

- one prepared asset;
- one outreach script;
- one first action;
- one follow-up path;
- one evidence field.

### Weekly milestones and daily calendar

The calendar must use the actual generated assets and targets.

It must not tell the customer to create assets GhostTown promised to deliver.

---

## 11. Working Cloudflare Launch Site Starter

### 11.1 Architecture decision

Do **not** create and manage a separate Cloudflare Pages project for every customer.

Implement one multi-tenant Launch Site renderer using the existing GhostTown Cloudflare application.

Recommended public route:

```text
https://launch.<confirmed-production-domain>/<slug>
```

or, until a dedicated subdomain is configured:

```text
https://<confirmed-production-domain>/launch/<slug>
```

The current repository has conflicting historical domain references (`ghosttowntest.com` and `lit-ghosttown.app`). Inspect the actual deployed Cloudflare route and settle the domain before writing production URLs.

### 11.2 New D1 migration

Add a new migration after `0002_launch_blueprints.sql`.

Tables:

```sql
CREATE TABLE launch_sites (
  site_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft','published','unpublished')),
  config_json TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_launch_sites_owner ON launch_sites(owner_id, updated_at DESC);

CREATE TABLE launch_site_leads (
  lead_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT,
  consent_text TEXT NOT NULL,
  source_path TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(site_id) REFERENCES launch_sites(site_id)
);

CREATE INDEX idx_launch_site_leads_site ON launch_site_leads(site_id, created_at DESC);
```

Add only fields that are actually required. Do not store unnecessary visitor data.

### 11.3 Owner API

Add authenticated endpoints:

```text
GET  /api/paid-test/orders/:orderId/launch-site
POST /api/paid-test/orders/:orderId/launch-site/publish
POST /api/paid-test/orders/:orderId/launch-site/unpublish
GET  /api/paid-test/orders/:orderId/launch-site/leads
GET  /api/paid-test/orders/:orderId/launch-site/leads.csv
```

Rules:

- owner-only access;
- order must be a ready `launch_blueprint_v2` order;
- config is copied from the canonical Blueprint on first publish;
- safe edits must update the canonical Blueprint or a versioned explicit override record—never a hidden second source of truth;
- publish is idempotent;
- slug conflicts are resolved deterministically;
- unpublish removes public access without deleting the Blueprint.

### 11.4 Public API

Add:

```text
GET  /api/public/launch-sites/:slug
POST /api/public/launch-sites/:slug/leads
```

Public response must expose only the fields needed to render the page.

Do not expose:

- owner email unless explicitly chosen as the public contact;
- order ID;
- internal source receipts;
- private research notes;
- account identifiers;
- Stripe details;
- D1/R2 keys.

### 11.5 Public React route

Add a route and component:

```text
src/components/PublicLaunchSite.tsx
/launch/:slug
```

Render:

- business/offer identity;
- target-customer callout;
- headline and subheadline;
- problem;
- offer description;
- finished deliverables;
- how it works;
- price presentation;
- risk reversal;
- FAQ;
- primary CTA;
- validation-stage proof language;
- privacy/terms/refund/disclaimer links;
- lead-capture form when configured.

The public renderer must use the canonical `LaunchSiteConfig` type.

### 11.6 Dashboard controls

In `LaunchBlueprintView` add a dedicated **Launch Site** section with:

- preview;
- publish button;
- unpublish button;
- public URL;
- copy URL;
- open public site;
- leads count;
- download leads CSV;
- clear explanation that this is the working landing-page implementation from the Blueprint.

### 11.7 Security and abuse controls

- Turnstile or equivalent on public lead submission.
- Email normalization and validation.
- Rate limit by site and privacy-preserving request key.
- No arbitrary HTML.
- No user-supplied scripts.
- No remote iframe embedding.
- Escape all rendered text.
- Content Security Policy.
- `X-Content-Type-Options: nosniff`.
- conservative cache policy for draft/published transitions.
- optional honeypot field.
- consent text stored with each lead.

---

## 12. Downloadable asset bundle

### 12.1 New authenticated download

Add:

```text
GET /api/paid-test/orders/:orderId/blueprint-assets.zip
```

The ZIP must be generated from the canonical stored Blueprint and saved privately to R2 for repeat download.

### 12.2 Required files

```text
ghosttown-launch-blueprint.pdf
ghosttown-launch-blueprint.json
README-FIRST.md
01-executive-decision.md
02-offer-and-pricing.md
03-positioning.md
04-media-distribution-network.csv
05-media-distribution-network.md
06-helpful-posts.md
07-outreach-scripts.md
08-outreach-scripts.csv
09-landing-page-copy.md
10-launch-site-config.json
11-30-day-calendar.csv
12-30-day-calendar.md
13-success-metrics.csv
14-source-list.csv
```

`README-FIRST.md` must explain:

- what each file is;
- which files may be edited;
- that the public Launch Site is the working implementation of the landing-page section;
- how to use the first seven days;
- how to record evidence;
- how to decide continue/revise/pivot/stop.

### 12.3 Account UI

Add one clear button:

```text
Download All Assets (.zip)
```

Keep individual PDF and JSON downloads.

---

## 13. Offer and conversion copy

Replace legacy customer-facing language such as only “30-Day Plan” or “implementation plan” with the product name:

```text
GhostTown Launch Blueprint
```

Recommended headline:

> Turn your verdict into a researched offer, working launch site, customer-access network, and 30-day execution system.

The paid offer must visibly list:

- personalized 30-day launch roadmap;
- offer and pricing strategy;
- target-customer and positioning plan;
- current Media & Distribution Network research;
- landing-page messaging and sales copy;
- outreach scripts and action plan;
- weekly priorities, milestones, and success metrics;
- thirty-day execution calendar;
- personalized Cloudflare Launch Site Starter;
- downloadable plan and assets saved to the account.

Add this sentence near the Launch Site item:

> Your Launch Site is not a separate template or unrelated bonus. It is the working implementation of the landing-page messaging, offer, pricing, and call to action created in your Blueprint.

Do not promise:

- guaranteed sales;
- guaranteed product-market fit;
- guaranteed media placement;
- guaranteed search ranking;
- guaranteed revenue.

---

## 14. Storage and canonical ownership

### D1

D1 remains authoritative for:

- canonical Blueprint JSON;
- research receipt;
- customer execution progress;
- Launch Site publication metadata;
- public leads.

### R2

Private R2 remains authoritative for:

- PDF;
- canonical JSON download object;
- asset ZIP.

Do not place paid customer files in the public video bucket.

### KV

KV remains limited to:

- existing paid orders;
- account order index;
- Stripe event receipts;
- retry/idempotency locks;
- lightweight Blueprint/site pointers;
- rate-limit counters.

Do not move canonical Blueprint or lead records into KV.

---

## 15. API and status compatibility

Preserve the existing paid order progression:

```text
pending
→ checkout_created
→ awaiting_seeds
→ researching
→ generating
→ ready
```

`failed` must remain retryable.

Pre-purchase micro-commitments do not add another paid-order status.

The public Launch Site has its own status:

```text
draft | published | unpublished
```

A Blueprint can be `ready` while its Launch Site remains `draft`.

---

## 16. Tests required

### 16.1 Pre-purchase micro-commitment component

Add tests proving:

- free verdict remains visible without answering any signal;
- each card supports typed input;
- each card supports suggestion selection;
- **I’m not sure** does not block purchase;
- signals persist through refresh;
- selected signals prefill checkout intake;
- mobile interaction does not require horizontal scrolling;
- keyboard focus order is correct.

### 16.2 Preview suggestion API

Test:

- commercial routing to DataForSEO SERP, not Backlinks;
- audience routing to Podcast Index and YouTube;
- raw provider snippets are not returned or stored;
- unsafe URLs are rejected;
- duplicate domains are removed;
- suggestion limits are enforced;
- provider failure returns a safe partial/fallback response;
- rate limits are enforced;
- Gemini cannot add an unknown candidate ID.

### 16.3 Post-purchase confirmation

Test:

- pre-purchase signals appear after payment;
- no duplicate questionnaire is shown;
- two or three commercial domains remain required;
- audience/ecosystem signals persist into the paid order;
- Workflow does not start before confirmation;
- signals lock after Workflow start.

### 16.4 Blueprint generation

Extend the board-game regression fixture:

- commercial seed: KiwiCo or comparable verified adjacent product;
- audience signal: The Dice Tower or another provider-returned verified channel;
- ecosystem signal: a verified event/association/publication;
- final network includes at least three target categories;
- every priority target has proof, access path, prepared asset, and script;
- calendar references generated assets and actual target IDs.

### 16.5 Public Launch Site

Test:

- owner can publish only their ready Blueprint;
- non-owner receives 404/authorization-safe response;
- public slug returns only public fields;
- headline, price, deliverables, FAQ, and CTA exactly match canonical Blueprint values;
- lead submission requires validation/anti-abuse boundary;
- lead is saved to the correct site;
- owner can list and export leads;
- unpublish returns public 404 or explicit unavailable response;
- no internal IDs/secrets appear in public HTML or API JSON;
- no arbitrary HTML/script injection renders.

### 16.6 Asset ZIP

Test:

- owner-only access;
- all required files exist;
- PDF and JSON match the stored Blueprint;
- CSV fields escape commas, quotes, and line breaks;
- ZIP is stored in private R2;
- repeated download reuses the stored object;
- another account cannot access it.

### 16.7 Full integration

Add or extend integration coverage for:

```text
free verdict
→ optional micro-commitments
→ paid checkout creation
→ Stripe webhook
→ awaiting_seeds
→ confirmation map
→ Workflow
→ provider research
→ Blueprint ready
→ PDF/JSON/ZIP
→ Launch Site publish
→ public lead
→ account lead view
→ progress save
→ sign out/in recovery
```

---

## 17. Acceptance criteria

The implementation is not complete until all of the following are true.

### Free experience

- Free verdict is delivered before purchase.
- Three optional micro-commitments appear before the paid CTA.
- Every micro-commitment produces immediate visible value.
- Skipping all three does not block checkout.

### Paid conversion

- Paid offer uses the name **GhostTown Launch Blueprint**.
- The exact ten-item customer promise is visible.
- The Launch Site relationship is explicitly explained.
- Checkout intake reuses verdict and pre-purchase answers.

### Post-purchase

- Customer confirms rather than re-enters the research map.
- Two or three commercial seeds are verified.
- Audience and ecosystem signals are carried forward.
- Workflow starts only after confirmation.

### Delivered Blueprint

- Personalized offer and price.
- Narrow target customer and positioning.
- 10–25 current sourced distribution targets across at least three target types.
- Complete landing-page and sales copy.
- Finished outreach scripts and prepared assets.
- Four weekly milestones with success metrics.
- Thirty complete daily actions.
- Canonical PDF, JSON, and ZIP.
- Saved to the owner account.

### Working Launch Site

- Public customer-specific URL exists.
- Site renders canonical Blueprint content.
- Owner can publish/unpublish.
- Public lead capture works.
- Leads are private to owner.
- Public page contains validation-stage proof boundaries and legal links.

### Reliability

- Failed provider/storage/site publication does not falsely mark fulfillment complete.
- Stripe event handling remains idempotent.
- Workflow retries are bounded.
- CI passes.
- Actual generated PDF and public Launch Site are visually inspected on mobile and desktop.

---

## 18. Definition of Done

Run and record:

```powershell
npm ci
npm run type-check
npm run test
npx wrangler deploy --dry-run --env production
npm run build
```

Then complete one Stripe test-mode board-game purchase.

The acceptance receipt must include:

- free verdict result ID;
- selected/skipped micro-commitment signals;
- Stripe test checkout session ID;
- paid order ID;
- confirmed commercial/audience/ecosystem map;
- Workflow instance ID;
- provider task counts and successful provider types;
- final target count and category count;
- D1 Blueprint record confirmation;
- private R2 PDF/JSON/ZIP object confirmation;
- PDF page count and visual inspection notes;
- public Launch Site URL;
- one test lead receipt;
- owner lead-list verification;
- account repeat-download verification;
- forced-failure and retry result;
- final CI run ID.

Do not mark PR #7 ready, merge, or deploy until this receipt exists.

---

## 19. Recommended implementation order

### Phase 1 — Product contract and copy

1. Update `src/lib/ghosttownOffer.ts` display name and promise.
2. Update result-page and checkout copy to the exact ten-item deliverable.
3. Update canonical documentation and acceptance fixture.

### Phase 2 — Pre-purchase signals

4. Add research-signal types.
5. Add local persistence.
6. Add preview suggestion API.
7. Add `PrePurchaseResearchSignals` component.
8. Insert it into `ResultReport` before the paid CTA.
9. Pass signals into `ActionPlanModal` and paid checkout.

### Phase 3 — Confirmation and research enrichment

10. Refactor `CompetitorSeedStep` into the confirmation map.
11. Replace Gemini-only seed discovery with DataForSEO preview search as the primary path.
12. Carry audience/ecosystem signals into the Workflow.
13. Extend provider queries and research receipts.
14. Extend quality-gate tests.

### Phase 4 — Working Launch Site

15. Add D1 migration.
16. Add owner/public Launch Site APIs.
17. Add public renderer route.
18. Add publish/unpublish and lead controls to Blueprint SPA.
19. Add lead export.
20. Add security and abuse controls.

### Phase 5 — Asset bundle and acceptance

21. Generate/store authenticated ZIP.
22. Add dashboard download.
23. Complete integration tests.
24. Run Stripe test-mode end to end.
25. Inspect PDF and public site visually.
26. Update PR description and deployment receipt.

---

## 20. Explicit non-goals

Do not add during this finishing pass:

- a separate CMS;
- custom domains per customer;
- automatic paid ad campaigns;
- automated email sending to discovered targets;
- scraping login-walled/private groups;
- Reddit/Facebook/LinkedIn/Discord automation;
- a second search index;
- cross-account research caching;
- Google-grounded paid research;
- guaranteed performance claims;
- a second payment product.

Finish the promised paid customer experience first.
