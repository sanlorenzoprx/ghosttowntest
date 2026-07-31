# GhostTown Launch Blueprint — Cursor/Codex Implementation Handoff

**Repository:** `sanlorenzoprx/ghosttowntest`  
**Target branch:** `feat/launch-blueprint-spa`  
**Pull request:** `#7`  
**Status:** Draft implementation branch; do not merge or deploy until the complete acceptance run passes.  
**Updated:** July 31, 2026

---

## 1. Purpose

This document is the execution handoff for finishing the paid **GhostTown Launch Blueprint** as one coherent customer product.

The paid deliverable must not become a collection of unrelated bonuses. The Blueprint, Media & Distribution research, Cloudflare Launch Site, PDF, JSON, downloadable assets, execution calendar, account dashboard, and customer progress must all be generated from the same canonical Blueprint record.

Cursor or Codex must work from the current repository state. Do not replace existing working systems with speculative architecture.

---

## 2. Grounding and implementation rules

Before modifying code:

1. Inspect the current branch and all files listed in this document.
2. Treat current repository code, tests, CI receipts, Stripe metadata, Cloudflare configuration, and live environment receipts as authoritative.
3. Surface conflicts or missing evidence instead of guessing.
4. Reuse the existing order, authentication, Stripe, Workflow, D1, R2, KV, PDF, and SPA implementations.
5. Do not create a second Blueprint schema, second paid-order store, second fulfillment controller, or unrelated provider layer.
6. Do not reintroduce Google Search Grounding into paid customer fulfillment.
7. Keep the owner-only Google research console isolated from paid artifacts and customer accounts.
8. Gemini may classify, rank, and write from verified provider candidates, but it may not invent channels, URLs, organizations, contacts, activity claims, or participation rules.
9. Do not expose secrets in Git, logs, screenshots, generated files, or chat.
10. Keep PR #7 in draft until the full test-mode purchase and artifact inspection pass.

### Required completion receipt

At the end of implementation, provide:

- branch name and head commit;
- complete changed-file list;
- tests added and tests changed;
- exact CI run ID and conclusion;
- Cloudflare resources created or reused;
- required secrets by environment-variable name only;
- D1 migration receipt;
- one complete Stripe test-mode checkout receipt;
- one generated Blueprint ID;
- one PDF artifact receipt;
- one asset ZIP receipt;
- one public Launch Site URL;
- one test lead-capture receipt;
- one account-recovery and repeat-download receipt;
- one forced-failure and retry receipt;
- all remaining blockers.

---

## 3. Immutable customer promise

The customer purchases one product named **GhostTown Launch Blueprint**.

The paid customer receives:

1. Personalized 30-day launch roadmap.
2. Clear offer and pricing strategy.
3. Target-customer and positioning plan.
4. Current customer-access research and Media & Distribution Network.
5. Landing-page messaging and sales copy.
6. Customer outreach scripts and action plan.
7. Weekly priorities, milestones, and success metrics.
8. Thirty-day daily execution calendar.
9. Personalized Cloudflare Launch Site Starter.
10. Downloadable plan and finished assets saved to the customer account.

### Product invariant: the website is part of the Blueprint

The Cloudflare Launch Site Starter is not a separate, unrelated bonus.

It is the working implementation of:

- `blueprint.offer`;
- `blueprint.positioning`;
- `blueprint.landingPageCopy`;
- `blueprint.launchSite`;
- the validation-stage proof boundaries;
- the lead-capture call to action.

The same canonical Blueprint record must drive:

```text
Authenticated Blueprint dashboard
        +
Professional PDF
        +
Canonical JSON
        +
Downloadable finished-asset ZIP
        +
Public Cloudflare Launch Site
```

No output surface may maintain its own hand-edited offer, price, positioning, or landing-page copy.

---

## 4. Current repository truth

### 4.1 Built on the current branch

Preserve these implementations:

- canonical `ghosttown-launch-blueprint-v2` type contract;
- business-model-aware offer and pricing generator;
- target-customer and positioning plan;
- current Media & Distribution target structure;
- DataForSEO competitor-footprint research;
- Podcast Index discovery;
- YouTube Data API creator and review discovery;
- direct verification of original public sources;
- Gemini selection constrained to provider candidate IDs;
- post-purchase `awaiting_seeds` status;
- verified selection of two or three competitor or adjacent-product domains;
- Cloudflare Workflow fulfillment;
- D1 canonical Blueprint and customer-progress design;
- private R2 PDF and JSON storage design;
- professional PDF renderer;
- authenticated executable Blueprint SPA;
- thirty-day progress, evidence notes, metrics, commitments, revenue, and final decision;
- paid-order recovery in the user dashboard;
- authenticated PDF and JSON downloads;
- separate owner-only Google research console;
- strict TypeScript, unit tests, Worker dry run, and production build in CI.

### 4.2 Partially built

#### Cloudflare Launch Site Starter

Already present:

- `LaunchSiteConfig` schema;
- generated offer, problem, solution, positioning, proof boundaries, FAQ, CTA, and legal flags;
- authenticated launch-copy preview;
- Launch Site content included in the PDF.

Still missing:

- public customer-specific URL;
- publish and unpublish controls;
- public server-rendered or edge-rendered page;
- public lead capture;
- persisted lead records;
- customer lead list and CSV export;
- safe slug creation and collision handling;
- cache policy and security headers;
- proof that the live page uses the exact canonical Blueprint values.

#### Downloadable finished assets

Already present:

- PDF download;
- canonical JSON download;
- repeat download from the account.

Still missing:

- one downloadable ZIP containing finished research, copy, scripts, posts, Launch Site configuration, calendar, metrics template, and sources.

### 4.3 Not yet built

#### Pre-purchase micro-commitments

The free flow currently captures the core idea, target user, problem, current alternative, and founder motivation.

It does not yet capture:

1. one brand or product the target customer already buys;
2. one podcast, YouTube channel, or creator the customer consumes;
3. one association, event, newsletter, publication, or community the customer trusts.

These signals must be collected before purchase through small optional interactions, immediately rewarded with a useful insight, and carried into checkout and post-purchase confirmation without asking the customer again.

---

## 5. Authoritative files to inspect

### Product contracts

- `src/types/lit.ts`
- `src/types/paidTest.ts`
- `src/types/launchBlueprint.ts`
- `src/lib/ghosttownOffer.ts`
- `docs/LAUNCH_BLUEPRINT_V2.md`
- `docs/launch-blueprint-v2-acceptance.md`
- `docs/LAUNCH_BLUEPRINT_V2_DEPLOYMENT.md`

### Free verdict and conversion

- `src/components/IdeaIntake.tsx`
- `src/components/QuestionFlow.tsx`
- `src/components/ResultReport.tsx`
- `src/components/ActionPlanModal.tsx`
- `src/api/verdict.ts`
- `src/api/paidTest.ts`

### Paid intake and fulfillment

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

- `tests/paidTest.test.ts`
- `tests/integration.test.ts`
- `tests/mobileFunnel.test.ts`
- `tests/customerAccessResearch.test.ts`
- `tests/launchBlueprintGenerator.test.ts`
- `tests/blueprintPdf.test.ts`

---

## 6. Target customer journey

Implement this sequence without adding another large questionnaire after purchase.

```text
1. Customer enters the idea.
2. Customer completes the free GhostTown assessment.
3. Free verdict is shown immediately.
4. Result page offers three optional micro-commitments.
5. Each answer produces an immediate useful insight.
6. The page previews the paid Media & Distribution opportunity.
7. Customer opens the paid Blueprint checkout intake.
8. Checkout is prefilled from verdict plus micro-commitments.
9. Stripe payment succeeds.
10. Customer sees a confirmation map, not a blank intake form.
11. Customer confirms two or three commercial seed domains.
12. Audience and ecosystem signals are already carried forward.
13. Cloudflare Workflow starts.
14. DataForSEO, Podcast Index, and YouTube research runs.
15. Original public sources are verified.
16. Gemini ranks and structures only immutable candidate IDs.
17. Canonical Blueprint passes quality gates.
18. PDF, JSON, ZIP, dashboard, and Launch Site are generated from the same record.
19. Customer can publish the Launch Site and receive leads.
20. All paid artifacts, progress, leads, and downloads remain available from the account.
```

### Placement rule

The free verdict must never be delayed by the optional research-signal questions.

Place the micro-commitment component in `ResultReport.tsx` after the verdict evidence and before the paid Blueprint offer.

---

## 7. Pre-purchase micro-commitments

### 7.1 UX requirements

Each card must:

- ask one concrete question;
- fit on a mobile screen;
- accept a typed answer or suggested choice;
- include `Show suggestions`;
- include `I’m not sure`;
- remain optional;
- save automatically;
- provide immediate useful feedback;
- avoid showing raw search snippets;
- avoid repeating the question after purchase.

### 7.2 Commercial signal

Question:

> What is one brand or product your customer already buys?

Possible actions:

- type a brand or product;
- select a verified suggestion;
- choose `I’m not sure`.

Example feedback:

> KiwiCo suggests this audience already pays for curated family activities. The paid Blueprint can reverse-engineer which creators, publications, podcasts, reviewers, and partners already send attention to similar products.

### 7.3 Attention signal

Question:

> What might they watch or listen to?

Accepted types:

- podcast;
- YouTube channel;
- creator.

Example feedback:

> The Dice Tower gives GhostTown an audience starting point for related reviewers, channels, podcasts, sponsorship paths, and partnership targets.

### 7.4 Trust and ecosystem signal

Question:

> Where might they learn or gather?

Accepted types:

- association;
- event;
- newsletter;
- publication;
- public community.

Example feedback:

> Gen Con is an ecosystem signal. It can reveal speakers, sponsors, publications, creators, adjacent events, and partners already trusted by this market.

### 7.5 New client component

Create:

```text
src/components/PrePurchaseResearchSignals.tsx
```

Responsibilities:

- render the three optional cards;
- request suggestions only after user action;
- show no more than six suggestions per card;
- allow direct text entry;
- show the immediate insight;
- save local draft by verdict/result ID;
- return one normalized signal object to `ResultReport`;
- pass the object into `ActionPlanModal`;
- support keyboard use and accessible mobile tap targets.

### 7.6 Data contract

Create:

```text
src/types/researchSignals.ts
```

Recommended types:

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
  type:
    | 'association'
    | 'event'
    | 'newsletter'
    | 'publication'
    | 'community';
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

Add to `PaidTestIntake`:

```ts
researchSignals?: PrePurchaseResearchSignals;
```

Do not put these private customer signals into public video metadata.

### 7.7 Persistence

Before purchase:

- store a versioned local draft using the result ID;
- do not require an account;
- never store raw provider responses.

At checkout creation:

- normalize selected signals;
- include them in `PaidTestIntake`;
- persist them inside the existing paid order;
- preserve the typed customer language.

After payment:

- show the carried-forward map;
- allow editing before Workflow start;
- lock changes once status becomes `researching`.

---

## 8. Lightweight suggestion API

### 8.1 Endpoint

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

Required headers:

```text
Cache-Control: private, no-store
Content-Type: application/json
```

### 8.2 Provider routing

#### Commercial signal

Use DataForSEO live organic search only.

Run at most:

- one direct-category query;
- one alternatives query;
- one adjacent-paid-product query.

Return no more than six verified suggestions.

Do not run the expensive Backlinks API before purchase.

#### Attention signal

Use:

- Podcast Index for podcast candidates;
- YouTube Data API for creator/channel candidates.

Return a mixed maximum of six suggestions.

#### Ecosystem signal

Use the smallest appropriate query:

- DataForSEO for associations, events, publications, newsletters, and public communities;
- Podcast Index or YouTube only when the typed clue is media-specific.

### 8.3 Data rules

- raw provider responses remain in memory only;
- raw snippets are never stored;
- only normalized user-selected fields enter the paid order;
- public URLs must be HTTPS and reachable;
- reject localhost, private IP ranges, URL credentials, dead pages, redirects to private locations, and duplicate domains;
- a suggestion is never treated as confirmed until the customer selects it.

### 8.4 Abuse and cost controls

Use current Cloudflare infrastructure.

Required:

- existing Turnstile boundary where available;
- privacy-preserving KV request limits;
- maximum three unauthenticated suggestion requests per free result;
- maximum six authenticated suggestion requests per result;
- request timeouts;
- provider-specific failure isolation;
- useful fallback copy when providers are unavailable;
- no backlink graph or full paid research before payment.

### 8.5 Gemini boundary

Gemini may:

- classify provider candidates;
- generate the immediate insight;
- rank only provider candidate IDs.

Gemini may not:

- introduce a new brand, URL, creator, event, publication, or association;
- invent a contact method;
- invent audience statistics;
- claim current activity without provider evidence.

---

## 9. Post-purchase confirmation map

Replace the feeling of a new paid intake questionnaire with a confirmation screen.

Suggested structure:

```text
Customer
Families with children ages 5–15

Commercial seeds
✓ KiwiCo
✓ UnboxBoardom

Audience signals
✓ The Dice Tower
✓ Parents Together

Ecosystem signals
✓ Gen Con
✓ Local libraries

[Edit map] [Start my research]
```

### Required behavior

- commercial seeds still require two or three verified public domains;
- pre-purchase commercial signals should appear first as candidates;
- customer may replace any suggestion;
- audience and ecosystem signals carry directly into research planning;
- do not require URLs for every customer-entered audience/ecosystem clue before payment;
- verify and normalize them during paid research;
- lock the map after Workflow creation.

### Recommended contract extension

Extend the existing paid order intake rather than adding a second store:

```ts
interface PaidTestIntake {
  // existing fields
  researchSignals?: PrePurchaseResearchSignals;
  competitorSeeds?: CompetitorSeed[];
}
```

---

## 10. Media & Distribution research engine

### 10.1 Commercial seeds

Use DataForSEO to find:

- referring pages;
- referring domains;
- competitor-domain intersections;
- publications;
- review sites;
- newsletters and blogs;
- associations;
- events;
- complementary partners.

### 10.2 Audience seeds

Use Podcast Index and YouTube to find:

- related shows;
- competitor mentions;
- category episodes;
- active creators;
- reviewers;
- educational channels;
- adjacent audiences.

### 10.3 Ecosystem seeds

Use the verified original source and provider discovery to expand:

- event partners;
- sponsors;
- speakers;
- media partners;
- member publications;
- chapter directories;
- related associations;
- cross-promotion opportunities.

### 10.4 Verification

For each delivered target, verify:

- public HTTPS URL;
- source remains reachable;
- target is relevant to the customer;
- activity is supported by current evidence;
- access route is public;
- recommended approach matches the target type;
- source IDs and research date exist.

### 10.5 Delivered target contract

Each target should contain:

```ts
{
  targetName,
  targetType,
  publicUrl,
  discoveredThrough,
  competitorEvidence,
  audienceOwner,
  audienceFit,
  activityAssessment,
  accessPath,
  recommendedApproach,
  preparedAsset,
  outreachScriptId,
  risk,
  confidence,
  verifiedAt,
  sourceIds
}
```

### 10.6 Quality gate

A paid Blueprint must fail closed unless it has:

- exactly two or three confirmed commercial seed domains;
- at least six research tasks attempted;
- at least four successful tasks;
- at least two successful provider types;
- at least ten verified candidates;
- 10–25 final targets;
- at least three target categories;
- public source, research date, evidence, access path, prepared asset, script, risk, confidence, and first action for every delivered target.

---

## 11. Canonical Blueprint requirements

The finished `GhostTownLaunchBlueprint` must continue to include:

- executive launch decision;
- offer and pricing;
- positioning plan;
- Media & Distribution Network;
- useful public posts or educational assets;
- relationship-specific outreach scripts;
- landing-page and sales copy;
- Launch Site configuration;
- weekly milestones;
- exactly thirty daily actions;
- final continue, revise, pivot, and stop rules;
- sources;
- generation receipt;
- quality-gate result.

### Daily calendar requirement

Every day must contain:

- one primary objective;
- required actions;
- prepared assets;
- expected deliverable;
- success measurement;
- evidence to record;
- completion key.

The customer must not be told to create assets GhostTown promised to deliver.

---

## 12. Working Cloudflare Launch Site

### 12.1 Architecture

Do not create a separate website repository.

Use the existing Cloudflare Worker and canonical Blueprint storage.

Recommended public route:

```text
https://<approved-domain>/launch/<public-slug>
```

The current production-domain conflict must be resolved before deployment. Do not assume whether the final domain is `ghosttowntest.com` or the currently deployed `lit-ghosttown.app` family.

### 12.2 Site record

Add a D1 table similar to:

```sql
CREATE TABLE launch_sites (
  site_id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  public_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  published_at TEXT,
  unpublished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Allowed status values:

```text
draft
published
unpublished
```

### 12.3 Lead records

Add:

```sql
CREATE TABLE launch_site_leads (
  lead_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT,
  source_path TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES launch_sites(site_id)
);
```

Do not store unnecessary tracking data.

### 12.4 Owner routes

Add authenticated routes:

```text
GET  /api/paid-test/orders/:orderId/launch-site
POST /api/paid-test/orders/:orderId/launch-site/publish
POST /api/paid-test/orders/:orderId/launch-site/unpublish
GET  /api/paid-test/orders/:orderId/launch-site/leads
GET  /api/paid-test/orders/:orderId/launch-site/leads.csv
```

Owner authorization must use the same paid-order ownership rules as PDF and JSON downloads.

### 12.5 Public routes

Add:

```text
GET  /launch/:slug
POST /launch/:slug/leads
```

### 12.6 Public renderer

The page must use only the canonical Blueprint:

- business name;
- target-customer callout;
- headline;
- subheadline;
- problem section;
- offer;
- price;
- deliverables;
- how it works;
- proof boundary;
- risk reversal;
- FAQ;
- primary CTA;
- legal links and disclaimer.

No separate CMS copy is allowed in v1.

### 12.7 Publishing rules

A site cannot publish unless:

- Blueprint quality gate passed;
- order is ready;
- headline and CTA are present;
- proof status remains `validation-stage`;
- forbidden unsupported claims are absent;
- privacy, terms, refund, and disclaimer flags are present;
- slug is valid and unique.

### 12.8 Security and cache policy

Public page:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

Owner endpoints and leads:

```text
Cache-Control: private, no-store
```

Lead submission requires:

- server-side validation;
- rate limiting;
- bot protection where available;
- maximum field lengths;
- no HTML execution;
- clear consent language;
- generic public errors that do not expose internal state.

### 12.9 Dashboard controls

Add to `LaunchBlueprintView.tsx`:

- Preview Launch Site;
- Publish;
- Unpublish;
- Copy public link;
- View leads;
- Export leads CSV;
- visible `validation-stage` badge;
- warning against unsupported proof claims.

---

## 13. Downloadable finished-asset ZIP

### 13.1 Endpoint

Add:

```text
GET /api/paid-test/orders/:orderId/blueprint-assets.zip
```

Authenticated owner only.

### 13.2 Required ZIP contents

```text
ghosttown-launch-blueprint/
├── README.md
├── blueprint.json
├── launch-blueprint.pdf
├── executive-summary.md
├── offer-and-pricing.md
├── positioning.md
├── media-and-distribution-network.csv
├── outreach-scripts.md
├── helpful-posts.md
├── landing-page-copy.md
├── launch-site-config.json
├── thirty-day-calendar.csv
├── weekly-milestones.md
├── metrics-template.csv
├── decision-rules.md
└── sources.csv
```

### 13.3 ZIP requirements

- generated from the same canonical Blueprint;
- no provider raw payloads;
- no secrets;
- no internal prompts;
- no owner-only Google results;
- stable filenames;
- UTF-8 text;
- CSV properly escaped;
- saved privately to R2;
- repeat-downloadable from the account;
- regenerated when the canonical Blueprint version changes.

### 13.4 Dashboard controls

When ready, show:

- Open Blueprint;
- Open Launch Site;
- Download PDF;
- Download asset ZIP;
- Download canonical JSON.

JSON may remain available as a technical option, but the ZIP should be the main customer-facing asset download.

---

## 14. Storage boundaries

### KV

Use only for:

- existing order records;
- lightweight account indexes;
- Stripe receipts and idempotency;
- rate limits;
- lightweight pointers.

Do not put complete paid Blueprint assets or lead databases in KV.

### D1

Use for:

- canonical Blueprint metadata/record;
- customer progress;
- Launch Site lifecycle;
- lead records;
- source and artifact metadata where already designed.

### Private R2

Use for:

- PDF;
- canonical JSON object;
- asset ZIP;
- any future customer-owned generated files.

Never use the public video bucket for paid customer assets.

---

## 15. Owner-only Google research console

Preserve `/internal-research` as a separate owner tool.

Requirements:

- authenticated owner allowlist;
- `Cache-Control: no-store`;
- no KV, D1, or R2 storage;
- no customer-account attachment;
- no PDF or Blueprint export;
- no automatic crawling or processing of Google-returned links;
- no use inside paid fulfillment;
- clear visual label that it is an owner research console.

Do not weaken this boundary while implementing the paid research preview.

---

## 16. API and environment contract

Expected private configuration names include:

```text
GEMINI_API_KEY
DATAFORSEO_LOGIN
DATAFORSEO_PASSWORD
PODCAST_INDEX_API_KEY
PODCAST_INDEX_API_SECRET
YOUTUBE_API_KEY
INTERNAL_RESEARCH_OWNER_EMAILS
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SESSION_SECRET or current JWT/session secret
```

Expected bindings include:

```text
KV
DB
BLUEPRINTS
LAUNCH_BLUEPRINT_WORKFLOW
```

Feature flag:

```text
DISTRIBUTION_FOOTPRINT_ENABLED
```

Do not place secret values in `wrangler.toml`.

---

## 17. Required tests

### 17.1 Micro-commitment tests

Add tests proving:

- free verdict renders before optional signal completion;
- customer can skip every card;
- suggestions are requested only after explicit action;
- no more than six suggestions render;
- selected signals persist locally;
- signals reach checkout intake;
- `I’m not sure` does not block purchase;
- Spanish locale routing remains supported.

### 17.2 Suggestion API tests

Test:

- request validation;
- rate limits;
- no-store headers;
- provider timeouts;
- provider partial failure;
- URL safety rejection;
- duplicate removal;
- no raw snippets in response storage;
- Gemini cannot add a candidate outside supplied IDs.

### 17.3 Post-purchase map tests

Test:

- carried-forward signals appear;
- two or three verified commercial seeds are required;
- audience and ecosystem clues do not need to be retyped;
- edits lock after research starts;
- Workflow starts only after confirmation.

### 17.4 Research tests

Preserve and extend tests proving:

- DataForSEO mapping;
- Podcast Index mapping;
- YouTube mapping;
- original-page verification;
- candidate-ID constraint;
- 10–25 final targets;
- at least three target categories;
- fail-closed behavior.

### 17.5 Launch Site tests

Test:

- only owner can publish/unpublish;
- wrong account receives 404 or equivalent privacy-safe response;
- unpublished slug is not public;
- published page renders canonical Blueprint values;
- unsupported proof claims prevent publishing;
- slug collisions resolve safely;
- lead validation;
- lead rate limiting;
- owner lead list and CSV export;
- public cache versus private no-store headers.

### 17.6 Asset ZIP tests

Test:

- owner authentication;
- complete file manifest;
- PDF/JSON consistency;
- CSV escaping;
- no secrets or prompts;
- no owner-only Google data;
- R2 storage and repeat download;
- another account cannot download.

### 17.7 Full integration test

Run a board-game or family-activity subscription fixture through:

```text
free idea intake
→ assessment
→ verdict
→ pre-purchase micro-commitments
→ paid Blueprint modal
→ Stripe test checkout
→ payment webhook
→ carried-forward confirmation map
→ Workflow
→ provider research
→ quality gate
→ D1/R2 storage
→ PDF/JSON/ZIP
→ account Blueprint
→ Launch Site publish
→ public test lead
→ private lead view/export
→ progress save
→ sign out/in
→ repeat download
→ forced provider failure
→ retry
```

---

## 18. Acceptance criteria

The implementation is not complete until all conditions below pass.

### Product

- paid product is consistently named **GhostTown Launch Blueprint**;
- all ten promised deliverables exist;
- Launch Site visibly implements the Blueprint’s landing-page section;
- the customer is not told to create promised assets;
- no old seven-day-plan or generic-task language appears in the current product path.

### Pre-purchase

- three optional micro-commitments appear after the verdict and before the paid offer;
- each provides immediate value;
- lightweight suggestions work;
- skipping does not block checkout;
- answers prefill the paid flow.

### Research

- current, source-backed Media & Distribution Network;
- 10–25 verified targets;
- at least three target categories;
- every target contains proof, access path, prepared asset, script, risk, date, confidence, and first action.

### Launch Site

- one working public customer URL;
- publish/unpublish works;
- page uses canonical Blueprint values;
- mobile and desktop layouts pass visual review;
- lead capture works;
- owner can see/export leads;
- validation-stage proof boundaries remain visible.

### Artifacts

- professional PDF;
- canonical JSON;
- complete asset ZIP;
- all saved privately;
- all repeat-downloadable;
- another account cannot access them.

### Account

- Blueprint opens from dashboard;
- site and downloads remain available after refresh and sign-in on another device;
- progress and evidence persist;
- failed orders are clear and retryable.

### Operations

- strict TypeScript passes;
- all tests pass;
- Worker dry run passes;
- production build passes;
- D1 migration applied;
- secrets configured outside Git;
- one complete Stripe test-mode receipt recorded;
- actual PDF and public site visually inspected.

---

## 19. Implementation order

Follow this order to avoid duplicate work.

### Phase 1 — contracts and persistence

1. Add research-signal types.
2. Extend paid intake/order normalization.
3. Add local draft utilities.
4. Add D1 Launch Site and lead migration.
5. Add asset metadata fields if required.

### Phase 2 — pre-purchase UX

1. Build `PrePurchaseResearchSignals.tsx`.
2. Add preview suggestion endpoint.
3. Add provider adapters using existing credentials and fetch patterns.
4. Wire to `ResultReport`.
5. Prefill `ActionPlanModal`.
6. Add immediate insights and preview value statement.

### Phase 3 — post-purchase confirmation

1. Update `CompetitorSeedStep` into a research-map confirmation.
2. Preserve two-to-three commercial-domain gate.
3. Carry audience and ecosystem signals.
4. Lock after Workflow start.

### Phase 4 — research enrichment

1. Feed signal types into existing provider planning.
2. Preserve candidate-ID constraints.
3. Extend quality-gate coverage.
4. Ensure target-specific prepared assets and scripts.

### Phase 5 — public Launch Site

1. Add D1 tables.
2. Add owner lifecycle routes.
3. Add public renderer.
4. Add publish/unpublish UI.
5. Add lead endpoint.
6. Add lead list and CSV export.
7. Add security and cache headers.

### Phase 6 — asset ZIP

1. Build deterministic asset renderer.
2. Save ZIP to private R2.
3. Add authenticated download route.
4. Add dashboard action.

### Phase 7 — acceptance

1. Run unit/integration tests.
2. Run Worker dry run and production build.
3. Configure test environment.
4. Apply migration.
5. Complete Stripe test purchase.
6. Inspect PDF.
7. Inspect public site on mobile and desktop.
8. Submit test lead.
9. Verify private lead view/export.
10. Verify account recovery and repeat downloads.
11. Force failure and verify retry.
12. Record final receipt.

---

## 20. Explicit non-goals

Do not add during this finishing pass:

- a separate CMS;
- custom domains for every customer;
- a drag-and-drop page builder;
- multiple Launch Site themes;
- CRM automation;
- automatic cold-email sending;
- Facebook, LinkedIn, Reddit, private Discord, or private Slack scraping;
- reusable cross-account research caches;
- a new generalized orchestration framework;
- a second paid-product repository.

These may be evaluated after one paying customer receives and uses the complete Blueprint.

---

## 21. Definition of Done

The work is done only when a Stripe test customer can:

1. complete the free GhostTown assessment;
2. answer or skip three pre-purchase micro-commitments;
3. receive immediate useful insights;
4. purchase the GhostTown Launch Blueprint;
5. confirm the prefilled starting research map;
6. receive a current Media & Distribution Network;
7. open a complete executable Blueprint;
8. download the PDF and finished-asset ZIP;
9. publish a working Cloudflare Launch Site generated from that Blueprint;
10. receive a test lead through the site;
11. view/export the lead privately;
12. return later or use another device and recover all paid artifacts and progress;
13. experience safe failure and retry when a provider is deliberately unavailable.

Until that complete path passes, PR #7 remains draft and production fulfillment remains disabled.
