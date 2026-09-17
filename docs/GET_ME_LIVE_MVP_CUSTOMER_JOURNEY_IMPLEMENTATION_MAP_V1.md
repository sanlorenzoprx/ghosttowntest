# Get Me Live MVP — Canonical Customer Journey + Implementation Map v1

Status: **FROZEN FOR MVP IMPLEMENTATION**
Date: 2026-09-17
Branch context: `feat/get-me-live-v1`

## Governing product contract

Get Me Live is not a website builder. GhostTown should turn Sprint/Blueprint knowledge into a customer-ready starting point, then ask the owner to approve a small number of business choices. The customer should arrive to something roughly 70–80% finished.

All customer-facing copy should target roughly a fifth-grade reading level without sounding childish: short sentences, familiar words, one idea at a time. Avoid internal terms such as evidence, activation, infrastructure, deployment, provider state, conversion intent, OAuth, scopes, tokens, and lead destination.

Core promise: **The customer makes the business choices. GhostTown handles the website work.**

MVP viral rule: **GhostTown makes the share content about 90% ready. The owner approves, edits if wanted, and shares.**

No setup-screen upsells. Outside provider charges must be shown plainly before the customer confirms them. Story Studio appears only after the site is live.

## Capability legend

- **E — Existing:** capability already exists in the current GML backend/UI and should be preserved.
- **M — Modify:** working capability exists, but customer experience/API shape must change.
- **N — New:** capability does not exist yet.

## Screen-to-implementation map
| Screen | Component / route | API | Storage | Capability | Acceptance test |
|---|---|---|---|---|---|
| 0. Sprint share moments | `SprintShareMoment`, inserted at selected Sprint milestones | New lightweight share-draft endpoint fed by existing Sprint/Blueprint data; existing commercial event recorder for impressions/clicks | Existing Sprint/Blueprint remains canonical; new `get_me_live_share_drafts` stores generated/edited draft only | N | At an eligible Sprint milestone, user sees a ready-made post, can edit/copy/share/skip, and no post is published without user action. |
| 1. Get Me Live landing page | `GetMeLiveLanding`; `/get-me-live` when no order id | Existing `/api/get-me-live/checkout` after CTA | No new durable state before checkout; analytics only | N/M | Landing page explains what is built, ownership, provider fees, and one-time offer in plain language; CTA opens checkout. |
| 2. Checkout | Existing Stripe Checkout handoff from landing | **E** `POST /api/get-me-live/checkout`; existing Stripe webhook fulfillment | Existing `get_me_live_orders` + Stripe metadata/payment ids | E | Paid test-mode checkout creates/fulfills one owned order and returns directly to purchased workspace. |
| 3. Starting-point reveal | `GetMeLiveReveal` inside workspace | **E** `GET /api/get-me-live/orders/:id`; preview endpoint; optionally build preview automatically after fulfillment | Existing order config + stored preview | M | First purchased screen shows a mostly completed site, not an empty form; offer/headline/site are derived from Sprint/Blueprint. |
| 4. Main workspace | `GetMeLiveWorkspace`, `LaunchChecklist`, `DecisionPanel`, `PersistentPreview`; `/get-me-live/setup?order_id=...` | Existing GET/PUT config + preview; add debounced autosave contract | Existing configuration/preview | M | Desktop keeps checklist + active decision + preview visible; mobile uses one guided column; edits autosave and survive reload. |
| 5. Cloudflare ownership | `CloudflareOwnershipStep` | **E** connect/disconnect/callback/accounts endpoints | Existing OAuth token in acceptance KV; provider state in order | M | Copy says where the website will live, who owns it, and that access can be removed; no OAuth/token wording. |
| 6. Create/connect Cloudflare | `CloudflareAccountChoice`, return-state banner | Existing OAuth connect/callback; external Cloudflare signup link | Existing provider state + OAuth token | M | User can choose “I have Cloudflare” or “Create my free account”; after authorization, workspace returns to same step and shows connected. |
| 7. Name + domain | `NameDomainStep`, `NameDomainOptionCard` | **E** domain search/check primitives; **N** `POST /orders/:id/name-options` to pair Sprint-derived names with checked domains/prices | Selected business name + requested/selected domain in existing config; no registration yet | M/N | Suggested names are not presented as final choices until their candidate domains have been checked; available/taken and provider price are shown. |
| 8. Confirm domain purchase | `DomainPurchaseConfirm` | **E** `POST /orders/:id/domains/register`; `GET .../domains/status` | Existing domain config/provider state | M | No provider charge occurs until user confirms exact domain and shown price; cancel returns to choices. |
| 9. Choose the look | `LookStep` using existing six curated directions | Existing config PUT + preview rebuild | Existing brand config | M | Clicking each look immediately changes preview; no CSS/font/grid controls are exposed. |
| 10. Logo | `LogoStep`, `SimpleLogoChooser` | **N** logo-option generator and asset-save endpoint | Selected logo metadata in config; generated SVG/asset copied into customer Cloudflare Pages asset store | N | User can upload, choose a simple generated logo, or use text only; selection appears in preview and survives reload. |
| 11. Photos | `PhotoStep`, `AssetUploader`, `AssetThumbnailGrid` | **N** upload/remove/reorder endpoints; optional recommended-image selector | Asset metadata in GML config/table; bytes stored in customer-owned Cloudflare Pages asset store after Cloudflare connection | N | No HTTPS URL is required; user can upload/remove/reorder photos and choose a main image; preview updates. |
| 12. Offer + copy | `OfferCopyStep`, shared high-contrast `GmlField` | Existing config PUT/preview; autosave | Existing offer config | M | Headline, offer, price and button text are prefilled from Sprint; inputs are visually obvious; edits immediately update preview. |
| 13. Visitor action | `VisitorActionStep` | Existing config PUT | Existing `offer.intent` + payments enabled | M | User chooses “Tell me they’re interested,” “Buy now,” or “Decide later”; no “conversion intent” wording appears. |
| 14. Lead magnet | `LeadMagnetStep` | **N** PDF upload/remove endpoint; optional simple Sprint-generated PDF endpoint if cheap enough | Lead magnet metadata + Pages asset; published file remains in customer Cloudflare account | N | Upload PDF and skip paths work in MVP; uploaded file is linked from preview/site and stored with customer site assets. |
| 15. Lead email | `LeadEmailStep` | Existing config PUT | Existing contact config | M | User sees “Where should new leads go?” and a normal email field; submitted live leads reach the configured path. |
| 16. Business email | `BusinessEmailStep` | **E** `POST /orders/:id/email/setup`; domain status | Existing config/provider state + Cloudflare Email Routing | M | User chooses local part, sees full address, receives clear verification instructions, and can retry after Cloudflare confirmation. |
| 17. Payments | `PaymentsStep` | **E** Stripe Connect + status endpoints | Existing connected account/status fields | M | Only shown as required for Buy mode; return lands back in same workspace; incomplete Stripe setup does not block lead-first launch. |
| 18. Review | `LaunchReviewStep`, `ReadinessChecklist` | Existing order/config/preview + provider statuses | Existing state only | N/M | One screen shows exact preview, completed/missing items, provider charges, and links back to edit each item. |
| 19. Go live | `GoLiveStep` | **E** `POST /orders/:id/publish` | Existing preview, provider state, deployment receipt | M | Button says “Go Live”; publish is blocked on required readiness and exact browser render; successful deploy records receipt. |
| 20. Live success | `LiveSuccessStep` | Existing order GET + publish result | Existing public URL/custom domain/deployment receipt | N/M | Success copy says: “You’re live. Your page is ready for real customers…” and shows the live URL plus View My Live Page. |
| 21. Launch Share Pack | `LaunchSharePack`, `ShareDraftCard` | **N** `GET/POST /orders/:id/share-pack`; existing commercial event recorder | New share drafts + approved/edited text; no automatic posting state | N | Three ready-made posts are generated from Sprint/GML data; user can edit, copy or native-share; nothing posts automatically. |
| 22. Social share image | `SocialPreviewCard` + site OG metadata | **N** social-card render/build step integrated with publish | `og.png`/social asset in customer Pages asset bundle + metadata reference in preview/build | N | Shared URL renders a branded preview with logo/name/promise/image/domain; site source contains valid OG/Twitter metadata. |
| 23. Friend share after signup | `LeadSuccessShare` in generated site | **N** native-share/copy-link behavior; existing lead endpoint remains canonical | No new required durable state; optional share-click analytics | N | After a lead succeeds, visitor sees a small “Know someone who might like this?” share action; it never interrupts the form. |
| 24. Built with GhostTown | Generated-site `GhostTownAttributionFooter` | Static link + optional referral query parameter | No new business state; attribution analytics only | N | Footer is small, never competes with customer CTA, points to a simple GhostTown landing path, and can be measured. |
| 25. First customer action | `CustomerActivityCard`, dashboard notification | Existing lead/payment ingestion; **N/M** plain-language activity projection endpoint/summary | Existing `get_me_live_leads` + observed commercial evidence; avoid duplicating canonical customer facts | M | Dashboard says “Someone is interested” or “You made a sale,” not “evidence event”; source lead/payment remains canonical. |
| 26. Milestone share | `MilestoneShareCard` | Reuse share-pack generator with milestone input | Share draft table + existing lead/payment facts | N | First lead/sale can create a ready-made optional post; no customer identity or private detail is included; user must approve sharing. |
| 27. Live business dashboard | Extend `UserDashboard` with `LiveBusinessCard` | **E/M** orders/leads; **N** lightweight visit/share metrics endpoint if needed | Existing GML order/leads/payments + new visit/share counters | M/N | User sees page URL, interested people, sales if enabled, recent plain-language activity, share action and Make Changes. |
| 28. Cross-device return | Existing auth + dashboard/reopen | Existing owned order GET/list | Existing D1/KV state | E/M | Sign out/in on another session and reopen same live business with config, provider status, URL and customer activity intact. |
| 29. Story Studio handoff | Existing live-only handoff section | **E** `/orders/:id/story-studio-handoff` | Existing lineage: Sprint → Blueprint → GML order + lead/payment summary | M | Story Studio appears only after live success; copy says it can help more people find the business and uses the context already created. |

## Cross-cutting implementation contracts
### 1. Plain-language UI contract

All headings, helper text, buttons, errors and success states must explain what the customer can see, do, or expect next. Internal/provider terms stay behind the API boundary.

Examples: `Publish` → `Go Live`; `Lead destination` → `Where should new leads go?`; `Conversion intent` → `What do you want visitors to do?`; `Observed evidence` → `Someone is interested` / `You made a sale`.

### 2. One-workspace contract

Purchased setup lives in one persistent workspace. Desktop keeps launch checklist, active decision and preview together. Mobile uses a guided single column with an easy preview action. External Cloudflare/Stripe steps return to the same order and active step.

### 3. Autosave + recovery contract

Normal edits autosave with debounce and visible `Saved` state. Manual Save is not the primary workflow. Configuration remains owner-scoped and durable. Reload/sign-out/sign-in must not lose progress.

### 4. Customer-owned asset contract

Logo, customer photos, lead magnet and social preview assets must ultimately live with the customer-owned Cloudflare Pages project. The UI never requires a public HTTPS URL. Metadata may remain in GhostTown D1; provider tokens remain server-side only.

### 5. Domain safety contract

Name suggestions and domain availability are separate facts. A suggested business name must not imply its domain is available. Domain registration always requires an explicit confirmation showing exact domain and provider price.

### 6. Virality contract

GhostTown may generate drafts, share images and share links, but never posts to the customer’s social account without a separate explicit future authorization. MVP sharing is user-triggered: native share, copy link, or platform share URL.

### 7. Canonical customer-action contract

Leads and connected Stripe payments remain canonical customer actions. Visit/share metrics are supporting activity only and must not be projected as stronger customer proof.
## Minimal data/API additions

Prefer extending existing GML configuration/order structures rather than creating parallel customer systems.

Proposed additions:

- Extend brand config with selected/generated logo asset metadata and ordered image asset ids.
- Replace `leadMagnet?: string` with a backward-compatible lead-magnet object (`kind`, title, asset id/url when published) while accepting legacy string during migration.
- Add lightweight asset metadata storage keyed by `get_me_live_order_id`; bytes live in the customer Cloudflare Pages asset store.
- Add lightweight share-draft storage keyed by Sprint/GML order; store generated text, edited text, draft type, created/approved/shared timestamps. Do not store social credentials.
- Add lightweight site-visit/share attribution storage only if dashboard counts require it; keep leads/payments in their existing canonical stores.

New/expanded endpoints expected:

- `POST /api/get-me-live/orders/:id/name-options`
- `POST /api/get-me-live/orders/:id/assets`
- `DELETE /api/get-me-live/orders/:id/assets/:assetId`
- `PUT /api/get-me-live/orders/:id/assets/order`
- `GET|POST /api/get-me-live/orders/:id/share-pack`
- Optional `POST /api/get-me-live/sites/:id/visit` for simple referral/visit counts

Existing endpoints remain the backbone: checkout, owned order/config, preview, Cloudflare OAuth/accounts, domain search/register/status, email setup, Stripe Connect/status, publish, public lead/buy, and Story Studio handoff.

## Implementation slices
### Slice A — Journey shell + copy convergence

Create dedicated landing page and purchased workspace shell; move current `GetMeLiveStudio` behavior behind guided steps; add strong field styling, autosave, progress/readiness, persistent preview, and fifth-grade copy. Preserve backend behavior.

### Slice B — Cloudflare first + name/domain truth

Move Cloudflare create/connect early. Add availability-backed business-name options. Keep explicit domain purchase confirmation. Complete OAuth error surfacing and scope-state handling.

### Slice C — Real customer assets

Add logo upload/simple deterministic logo choices, photo upload/reorder, and lead-magnet PDF upload. Store final assets in the customer-owned Cloudflare Pages project. Remove URL-first UI while retaining backward compatibility for existing configs.

### Slice D — Offer, leads, email, payments

Converge existing offer/intent/email/Stripe functions into plain-language guided steps. Keep lead-first fallback when Stripe is incomplete.

### Slice E — Review → Go Live → success

Build readiness screen, exact preview review, `Go Live` action, deployment success state, live URL, and recovery behavior. Preserve browser render gate and deployment receipt.

### Slice F — MVP viral loop

Add Sprint share moment hook, launch Share Pack, social/OG image, post-lead friend share, small `Built with GhostTown` attribution, milestone share drafts, and simple share/visit attribution. All sharing remains user-triggered.

### Slice G — Live dashboard + Story Studio bridge

Show plain-language leads/sales/activity, easy share/reopen/edit actions, cross-device recovery, then live-only Story Studio handoff.

## Release acceptance gates
1. A paid customer lands on a prebuilt starting point, not a blank setup form.
2. All customer copy passes the plain-language contract and avoids internal implementation terms.
3. A customer with no Cloudflare account can understand how to create one, return, authorize GhostTown, and continue without losing state.
4. Name options shown as available have been checked against the provider; unavailable options are clearly marked.
5. No domain purchase occurs without explicit confirmation of exact domain and provider price.
6. Logo, photos and PDF lead magnet can be supplied without entering URLs, and final assets live with the customer’s Cloudflare site.
7. Every important business edit autosaves, survives reload, and changes the preview.
8. Lead mode can go live without Stripe. Buy mode reaches connected Stripe Checkout when Stripe is ready and falls back safely when it is not.
9. Business email flow gives simple verification/retry instructions and does not expose DNS jargon.
10. `Go Live` deploys the exact reviewed site only after the existing browser render check succeeds and records the deployment receipt.
11. Live success uses: “You’re live. Your page is ready for real customers. People can now visit, sign up, or buy. GhostTown will show you what happens so you can see what’s working and what needs to change.”
12. Launch Share Pack is prefilled from existing work, editable, user-triggered, and includes a measurable live link.
13. Social sharing produces a useful preview image and does not expose private customer data.
14. A completed lead sees an optional friend-share action only after submission succeeds.
15. First lead/payment appears to the owner in plain language and remains grounded in the existing canonical lead/payment records.
16. Sign out/in and reopen on another session preserves the live business and setup state.
17. Story Studio is not shown as an upsell during setup; it appears only after the customer has gone live.
18. Focused GML contract/provider/fulfillment/browser tests, full tests, typecheck, build, Worker dry-runs and exact-head CI must be green before production promotion.

## MVP boundary — do not expand during this build

Do not add a full drag-and-drop site builder, CSS controls, large template marketplace, full analytics suite, CRM, blog, ecommerce catalog, social scheduler, automatic social posting, referral-credit system, advanced logo editor, or Story Studio production automation inside Get Me Live.

Get Me Live gives the owner a strong first push. Story Studio is the ongoing content/distribution system after the business is live.

**Frozen implementation sequence:** Slice A → B → C → D → E → F → G → full acceptance → price lock → PR/exact-head CI → production configuration/migration/deploy only with explicit release authorization.
