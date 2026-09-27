# GhostTown Launch Blueprint — Environment Acceptance Handoff

> **CURRENT COMMERCIAL SCOPE — supersedes older Launch Site wording in this document**
>
> The active customer ladder is **Free Verdict → $97 30-Day Sprint → $297 Get Me Live**.
> The $97 Sprint does **not** include a live website, domain, publishing, or payment setup.
> Get Me Live is the separate $297 one-time implementation product. Older Launch Site language below is retained only where it documents historical implementation architecture or acceptance work.


**Repository:** `sanlorenzoprx/ghosttowntest`  
**Authoritative branch:** `feat/launch-blueprint-spa`  
**Pull request:** `#7`  
**Required baseline:** commit `4579cba191ba5e7f4e69a933bd5cfb76e36bfde5` or a direct descendant  
**Canonical contract:** v2.1.1, Git blob `616c691e6b4c9cea93615963a07375d13ffba57f`  
**Status:** PR remains draft. Do not merge or enable live fulfillment until this handoff passes completely.

---

## 1. Mission

Complete the environment acceptance phase for the GhostTown Launch Blueprint without replacing the architecture already implemented on PR #7.

This phase must prove the real customer path across:

```text
Free verdict
→ pre-purchase micro-commitments
→ Stripe test checkout
→ verified webhook
→ post-purchase research-map confirmation
→ Cloudflare Workflow
→ DataForSEO + Podcast Index + YouTube
→ original-source verification
→ Gemini candidate-ID selection
→ staged Vertex Blueprint generation
→ canonical Blueprint
→ D1 + private R2 persistence
→ PDF + asset ZIP
→ executable account Blueprint
→ public Launch Site
→ lead capture
→ account recovery
→ ownership denial
→ forced failure and retry
```

The work is not complete because individual provider calls work or unit tests pass. It is complete only when one real Stripe test customer completes the entire path and the evidence is recorded.

---

## 2. Non-negotiable architecture boundaries

Preserve these existing systems:

- `ghosttown-launch-blueprint-v2` as the canonical artifact.
- Stripe webhook as the payment authority.
- `awaiting_seeds → researching → generating → ready` order progression.
- Cloudflare Workflow as the durable research/generation executor.
- D1 as the canonical Blueprint, normalized execution log, progress, Launch Site, and lead database.
- Private `BLUEPRINTS` R2 bucket for PDF, canonical JSON, and asset ZIP.
- KV only for order/index compatibility, Stripe receipts, rate limits, locks, and lightweight pointers.
- DataForSEO, Podcast Index, YouTube, and direct-source verification as the paid research inputs.
- Gemini research selection limited to provider-verified candidates; unknown candidate references are selection drift, not evidence.
- Vertex AI as the staged paid Blueprint generation path when `VERTEX_BLUEPRINT_REQUIRED=true`.
- The owner-only Google console isolated from paid fulfillment and customer artifacts.

Do not:

- move Launch Sites or leads into KV;
- reuse the public `VIDEOS` bucket for paid artifacts;
- add a second paid-order store;
- add a second Workflow or orchestration framework;
- make the Stripe webhook wait for research or PDF generation;
- enable production before test acceptance;
- paste secret values into Git, documentation, logs, screenshots, or chat.

---

## 3. Canonical JSON decision

### Is a separate customer JSON download required?

**No. It is not required as a primary customer action.**

A normal customer needs:

1. the readable PDF;
2. the executable account Blueprint;
3. the finished-assets ZIP;
4. the working Launch Site.

### Why keep canonical JSON internally?

The canonical JSON remains necessary because it provides:

- one machine-readable source for the SPA, PDF, ZIP, and Launch Site;
- deterministic artifact regeneration without rerunning paid research;
- support and recovery when a PDF or ZIP must be rebuilt;
- schema/version auditing;
- future migration to new renderers or storage;
- future automation and integrations;
- evidence that all surfaces came from the same Blueprint rather than separate copy.

### Required product policy

- Continue generating and storing canonical JSON privately in `BLUEPRINTS` R2.
- Continue including `blueprint.json` inside the finished-assets ZIP.
- Do not make JSON one of the two primary post-purchase buttons.
- The primary buttons are **Download readable PDF** and **Download all finished assets**.
- A direct JSON endpoint may remain for support, technical export, and backward compatibility.
- If shown in the dashboard, label it **Technical JSON** rather than presenting it as a normal customer deliverable.

---

## 4. Phase 0 — repository and account preflight

Run from Windows PowerShell.

```powershell
cd "C:\repos\ghosttowntest"

git fetch origin
git switch feat/launch-blueprint-spa
git pull --ff-only origin feat/launch-blueprint-spa

git branch --show-current
git rev-parse HEAD
git status --short
```

Stop immediately if:

- the branch is not `feat/launch-blueprint-spa`;
- the current commit is not `4579cba…` or a direct descendant;
- tracked source files have unexplained local modifications;
- the pull is not a fast-forward.

Do not use `git reset --hard` or `git clean` to resolve an unexplained state.

Confirm local tools:

```powershell
node --version
npm --version
npx wrangler --version
npx wrangler whoami
stripe --version
stripe status
```

Expected repository validation:

```powershell
npm ci
npm run verify:blueprint
npm run check
npm run worker:check:acceptance
git diff --check
```

`npm run verify:blueprint` must confirm canonical Git blob `616c691e6b4c9cea93615963a07375d13ffba57f` before the acceptance slice continues.

Record:

```powershell
New-Item -ItemType Directory -Force ".acceptance-receipts" | Out-Null

git rev-parse HEAD |
  Out-File ".acceptance-receipts\00-head.txt"

npm run check *>&1 |
  Tee-Object ".acceptance-receipts\01-local-check.txt"

npx wrangler --version |
  Out-File ".acceptance-receipts\02-wrangler-version.txt"
```

Do not commit `.acceptance-receipts`. Add it to `.git/info/exclude` locally if needed.

---

## 5. Phase 1 — reconcile the domain without risking production

### Current conflict

The current `wrangler.toml` uses:

```text
Frontend: https://ghosttowntest.com
API:      https://api.ghosttowntest.com
```

The previously deployed GhostTown application used:

```text
Frontend: https://lit-ghosttown.app
API:      https://api.lit-ghosttown.app
```

Do not guess which pair is authoritative.

### Required inventory

In Cloudflare Dashboard, record:

1. Which zones exist and are active.
2. Which Pages project currently serves the live GhostTown frontend.
3. Which custom domains are attached to that Pages project.
4. Which Worker currently receives API traffic.
5. Which domains/routes are attached to that Worker.
6. Whether either API hostname already has a CNAME or conflicting Worker route.
7. Whether SSL is active for each hostname.
8. Which frontend URL Stripe currently uses for success and cancel redirects.

Capture screenshots with no secrets and save a text decision record:

```text
.acceptance-receipts/03-domain-inventory.md
```

### Decision rule

Use this order:

1. **Do not change production domains for acceptance.**
2. Deploy an isolated `acceptance` Worker environment to `workers.dev`.
3. Deploy the frontend to a Cloudflare Pages preview/acceptance URL with `VITE_API_URL` set to the acceptance Worker URL.
4. Complete the entire Stripe test acceptance on those isolated URLs.
5. After acceptance passes, choose the production pair:
   - Use `ghosttowntest.com` only if the zone, Pages deployment, API hostname, SSL, redirects, and support/legal pages are all ready.
   - Otherwise keep `lit-ghosttown.app` for the initial launch and treat the rename as a later controlled migration.

### Required final domain receipt

Before production deploy, create:

```text
.acceptance-receipts/20-production-domain-decision.md
```

It must contain:

- canonical frontend URL;
- canonical API URL;
- Pages project name;
- Worker name;
- Cloudflare zone;
- Stripe success URL pattern;
- Stripe cancel URL;
- Stripe webhook endpoint;
- rollback domain pair;
- owner approval date.

---

## 6. Phase 2 — create an isolated acceptance environment

Do not point the acceptance environment at production D1, R2, or KV.

### Acceptance resource names

Use these names unless they already exist:

```text
KV namespace: ghosttown-acceptance
D1 database:  ghosttowntest-blueprints-acceptance
R2 bucket:    ghosttowntest-private-blueprints-acceptance
Workflow:     ghosttown-launch-blueprint-acceptance
Worker env:   acceptance
```

### Inventory existing resources first

```powershell
npx wrangler kv namespace list |
  Tee-Object ".acceptance-receipts\04-kv-inventory.txt"

npx wrangler d1 list |
  Tee-Object ".acceptance-receipts\05-d1-inventory.txt"

npx wrangler r2 bucket list |
  Tee-Object ".acceptance-receipts\06-r2-inventory.txt"

npx wrangler workflows list |
  Tee-Object ".acceptance-receipts\07-workflow-inventory.txt"
```

Reuse only resources explicitly created for GhostTown acceptance. Never reuse the public videos bucket for Blueprint artifacts.

### Create missing resources

```powershell
npx wrangler kv namespace create ghosttown-acceptance

npx wrangler d1 create ghosttowntest-blueprints-acceptance

npx wrangler r2 bucket create ghosttowntest-private-blueprints-acceptance
```

Record the returned KV ID and D1 database ID privately in the acceptance receipt. These IDs are configuration identifiers, not secrets, but do not invent them.

### `[env.acceptance]` in `wrangler.toml`

The current branch contains an isolated acceptance environment using the previously provisioned acceptance KV and D1 identifiers. Re-inventory those resources before a live run; never assume an old receipt proves their current state.

Required shape:

```toml
[env.acceptance]
workers_dev = true

[env.acceptance.vars]
AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"
ACTION_PLAN_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
GEMINI_RESEARCH_MODEL = "gemini-2.5-flash"
GEMINI_GOOGLE_SEARCH_MODEL = "gemini-2.5-flash"
DISTRIBUTION_FOOTPRINT_ENABLED = "false"
DISTRIBUTION_FOOTPRINT_BATCH_SIZE = "3"
VERTEX_BLUEPRINT_REQUIRED = "true"
VERTEX_PROJECT_ID = "REPLACE_WITH_VERTEX_PROJECT_ID"
VERTEX_LOCATION = "us-central1"
VERTEX_BLUEPRINT_MODEL = "gemini-2.5-flash"
FRONTEND_URL = "REPLACE_AFTER_ACCEPTANCE_FRONTEND_DEPLOY"

[[env.acceptance.kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_VERIFIED_ACCEPTANCE_KV_ID"

[env.acceptance.ai]
binding = "AI"

[[env.acceptance.d1_databases]]
binding = "DB"
database_name = "ghosttowntest-blueprints-acceptance"
database_id = "REPLACE_WITH_VERIFIED_ACCEPTANCE_D1_ID"
migrations_dir = "migrations"

[[env.acceptance.r2_buckets]]
binding = "BLUEPRINTS"
bucket_name = "ghosttowntest-private-blueprints-acceptance"

[[env.acceptance.workflows]]
binding = "LAUNCH_BLUEPRINT_WORKFLOW"
name = "ghosttown-launch-blueprint-acceptance"
class_name = "LaunchBlueprintWorkflow"
```

If free-verdict video generation is required in the acceptance run, bind a dedicated acceptance `VIDEOS` bucket. Do not use `BLUEPRINTS` as `VIDEOS`.

### Validate config before secrets

```powershell
npm run worker:check:acceptance *>&1 |
  Tee-Object ".acceptance-receipts\08-acceptance-dry-run.txt"
```

Stop on any missing binding or class export error.

---

## 7. Phase 3 — apply the complete current migration chain

The current v2.1.1 acceptance environment requires the Blueprint, Launch Site, and normalized Daily Execution Log schemas. Apply all unapplied migrations in filename order:

```text
0002_launch_blueprints.sql
0003_launch_sites.sql
0004_blueprint_execution_log.sql
```

Do not mark acceptance storage ready if `0004_blueprint_execution_log.sql` is absent. The executable account Blueprint, evidence ledger, checkpoint reviews, reminders, and version-attached recovery depend on its normalized tables.

List unapplied migrations:

```powershell
npx wrangler d1 migrations list ghosttowntest-blueprints-acceptance `
  --env acceptance `
  --remote *>&1 |
  Tee-Object ".acceptance-receipts\09-migrations-before.txt"
```

Apply all unapplied migrations:

```powershell
npx wrangler d1 migrations apply ghosttowntest-blueprints-acceptance `
  --env acceptance `
  --remote *>&1 |
  Tee-Object ".acceptance-receipts\10-migrations-apply.txt"
```

List again:

```powershell
npx wrangler d1 migrations list ghosttowntest-blueprints-acceptance `
  --env acceptance `
  --remote *>&1 |
  Tee-Object ".acceptance-receipts\11-migrations-after.txt"
```

Verify tables:

```powershell
npx wrangler d1 execute ghosttowntest-blueprints-acceptance `
  --env acceptance `
  --remote `
  --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;" *>&1 |
  Tee-Object ".acceptance-receipts\12-d1-tables.txt"
```

Required tables include the canonical delivery tables and normalized execution architecture:

```text
launch_blueprints
launch_blueprint_progress
launch_sites
launch_site_leads
accounts
blueprints
blueprint_actions
action_progress
journal_entries
journal_evidence
reminder_preferences
scheduled_reminders
checkpoint_reviews
acs_readiness_assessments
```

Stop if any required table is absent. This is a schema-presence check only; acceptance data must still be created through the real paid/customer paths.

---

## 8. Phase 4 — configure Vertex identity and acceptance secrets privately

Use Stripe **test/sandbox** credentials only in the acceptance environment. The paid acceptance run must exercise the staged Vertex Blueprint path, so do not rely on implicit Vertex defaults.

### Non-secret Vertex environment variables

These values identify the intended Vertex runtime and belong in `[env.acceptance.vars]`:

```text
VERTEX_BLUEPRINT_REQUIRED=true
VERTEX_PROJECT_ID
VERTEX_LOCATION
VERTEX_BLUEPRINT_MODEL
```

`VERTEX_BLUEPRINT_REQUIRED` must be explicitly `true` for the release acceptance run. Record the exact project, location, and model used.

### Cloudflare secrets

Only the service-account private key is inherently secret, but keep all service-account identity fields in the Cloudflare secret store to reduce accidental exposure in config, screenshots, and logs.

```text
VERTEX_SERVICE_ACCOUNT_EMAIL
VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY
VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
STRIPE_PAID_TEST_PRICE_ID
STRIPE_30_DAY_PLAN_PRICE_ID
LIT_API_KEY, if the verdict/video path requires it
GEMINI_API_KEY
DATAFORSEO_LOGIN
DATAFORSEO_PASSWORD
PODCAST_INDEX_API_KEY
PODCAST_INDEX_API_SECRET
YOUTUBE_API_KEY
INTERNAL_RESEARCH_OWNER_EMAILS
```

Enter them one at a time through the authenticated prompt:

```powershell
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_EMAIL --env acceptance
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY --env acceptance
npx wrangler secret put VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID --env acceptance
npx wrangler secret put JWT_SECRET --env acceptance
npx wrangler secret put STRIPE_SECRET_KEY --env acceptance
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env acceptance
npx wrangler secret put STRIPE_PRICE_ID --env acceptance
npx wrangler secret put STRIPE_PAID_TEST_PRICE_ID --env acceptance
npx wrangler secret put STRIPE_30_DAY_PLAN_PRICE_ID --env acceptance
npx wrangler secret put LIT_API_KEY --env acceptance
npx wrangler secret put GEMINI_API_KEY --env acceptance
npx wrangler secret put DATAFORSEO_LOGIN --env acceptance
npx wrangler secret put DATAFORSEO_PASSWORD --env acceptance
npx wrangler secret put PODCAST_INDEX_API_KEY --env acceptance
npx wrangler secret put PODCAST_INDEX_API_SECRET --env acceptance
npx wrangler secret put YOUTUBE_API_KEY --env acceptance
npx wrangler secret put INTERNAL_RESEARCH_OWNER_EMAILS --env acceptance
```

If a value is not required by the active route, verify that in code before omitting it. Do not use placeholders such as `sk_test_...` in a deployed environment.

List secret names only:

```powershell
npx wrangler secret list --env acceptance *>&1 |
  Tee-Object ".acceptance-receipts\13-secret-names.txt"
```

The secret inventory must contain names only, never values. Never record the Vertex private key, generated JWT assertion, OAuth access token, Stripe secret, webhook signing secret, or any other credential value.

---

## 9. Phase 5 — deploy the acceptance API and frontend

### Deploy API with research disabled

```powershell
npx wrangler deploy --env acceptance *>&1 |
  Tee-Object ".acceptance-receipts\14-api-deploy-disabled.txt"
```

Record the generated `workers.dev` URL.

Verify basic API health and authentication routes before enabling provider research.

### Deploy an acceptance frontend

Use a Cloudflare Pages preview or dedicated acceptance project.

Build with:

```powershell
$env:VITE_API_URL = "https://REPLACE-WITH-ACCEPTANCE-WORKER.workers.dev"
npm run build
```

Deploy `dist` using the existing Pages deployment process. Record the public acceptance frontend URL.

Update `FRONTEND_URL` under `[env.acceptance.vars]` to the exact Pages acceptance URL, commit the config change, rerun `npm run check`, and redeploy the acceptance Worker.

Verify CORS and redirects between the acceptance frontend and acceptance Worker.

### Stripe acceptance webhook

Create or update a Stripe **test-mode** webhook endpoint for the acceptance Worker’s real route:

```text
https://<acceptance-worker>.workers.dev/api/webhook/stripe
```

Subscribe only to the events required by the current webhook implementation, including `checkout.session.completed`.

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET` for `--env acceptance`, then redeploy.

Do not use the Stripe CLI forwarding secret for the remotely registered endpoint.

---

## 10. Phase 6 — provider smoke tests before enabling fulfillment

Keep:

```toml
DISTRIBUTION_FOOTPRINT_ENABLED = "false"
```

Run provider-specific smoke tests through owner-controlled or dedicated diagnostic paths without creating a paid customer artifact.

### DataForSEO

Verify:

- Basic authentication succeeds;
- one known competitor domain returns referring pages;
- response parsing produces immutable candidate IDs;
- low-quality and duplicate referring pages are filtered;
- raw payload is not persisted.

### Podcast Index

Verify:

- signed headers succeed;
- a known topic returns shows;
- public show/feed URLs are reachable;
- dead feeds are rejected.

### YouTube

Verify:

- API key succeeds;
- `search.list` returns current videos/channels;
- channel URLs normalize correctly;
- quota errors fail clearly.

### Gemini research selection

Verify:

- model returns valid structured output;
- supplied candidate IDs remain advisory selection references rather than evidence;
- an unknown model-selected ID is discarded and the network is recovered only from provider-verified candidates, or the research run fails if canonical outcomes cannot be satisfied.

### Vertex Blueprint generation

Verify:

- service-account OAuth succeeds without logging the assertion or access token;
- the configured project, location, and model match the acceptance environment;
- exactly four ordered stage receipts exist: evidence normalization, strategy synthesis, asset generation, and red-team review;
- the red-team result passes with no blocking finding;
- the generation evidence records the normalized input SHA-256 and, after persistence, the exact canonical Blueprint SHA-256;
- no private key, access token, raw prompt, or raw model response enters customer artifacts or the acceptance receipt.

Record only normalized outputs, receipt-safe identifiers/hashes, and error summaries. Never record credentials or complete raw provider payloads.

---

## 11. Phase 7 — enable paid research in acceptance only

After all bindings, migrations, secrets, routes, and provider smoke tests pass, change only the acceptance flag:

```toml
[env.acceptance.vars]
DISTRIBUTION_FOOTPRINT_ENABLED = "true"
```

Production must remain:

```toml
DISTRIBUTION_FOOTPRINT_ENABLED = "false"
```

Run:

```powershell
npm run check
npm run worker:check:acceptance
npx wrangler deploy --env acceptance
```

Capture deployment output:

```text
.acceptance-receipts/15-api-deploy-enabled.txt
```

Confirm the Workflow exists:

```powershell
npx wrangler workflows list --env acceptance *>&1 |
  Tee-Object ".acceptance-receipts\16-workflows-after-deploy.txt"
```

---

## 12. Phase 8 — complete one real Stripe test purchase

Use a new test customer account and the board-game/family-activity subscription fixture.

### Free flow

1. Open the acceptance frontend in a clean browser profile.
2. Create or sign in to a test account.
3. Enter the board-game subscription idea.
4. Complete the free GhostTown assessment.
5. Verify the verdict renders before optional micro-commitments.
6. Complete or skip each micro-commitment.
7. Use at least one provider-backed suggestion.
8. Verify the selected commercial, audience, and ecosystem signals appear in checkout intake.

### Stripe checkout

Use Stripe test data only:

```text
Card:       4242 4242 4242 4242
Expiration: any future date
CVC:        any three digits
Postal:     any valid postal code
```

Verify:

- Checkout uses a `price_...` from the same Stripe test account as `STRIPE_SECRET_KEY`;
- redirect returns to the acceptance frontend;
- webhook receives `checkout.session.completed`;
- webhook returns promptly;
- duplicate delivery does not create a duplicate order or Workflow.

Record:

- Stripe Checkout Session ID;
- Stripe event ID;
- GhostTown order ID;
- test customer email;
- webhook response status;
- no secret values.

### Post-purchase map

Verify:

1. Order becomes `awaiting_seeds`.
2. No research Workflow exists before confirmation.
3. Pre-purchase signals are carried forward.
4. Customer confirms exactly two or three distinct commercial domains.
5. Invalid, duplicate, private, or unreachable URLs are rejected.
6. Confirmation creates one Workflow instance.
7. Order becomes `researching`.

### Workflow and generation

Verify:

1. Required DataForSEO, Podcast Index, YouTube, and original-source verification tasks execute.
2. At least ten verified candidates exist before selection.
3. Research covers at least three independent verification dimensions of the business idea; provider count and content/channel category diversity are diagnostic, not release quotas.
4. Unknown model-selected candidate IDs are never treated as evidence or delivered unless independently researched and verified.
5. Final customer-access network contains 10–25 verified targets with all required source and execution metadata.
6. `VERTEX_BLUEPRINT_REQUIRED=true` is effective for the acceptance Worker.
7. Vertex runs exactly four ordered stages and the red-team gate passes with no blocking finding.
8. The generation receipt records Vertex project ID, location, configured model, four stage receipts, normalized input SHA-256, and exact canonical Blueprint SHA-256.
9. Order progresses to `generating` and then `ready` only after the full release and delivery gates pass.
10. Incomplete research, failed Vertex generation, failed red-team review, or missing receipt integrity never becomes `ready`.

Record the Workflow instance ID and state transitions.

---

## 13. Phase 9 — verify every customer artifact

### Canonical D1 record

Query by order ID and verify:

- one `launch_blueprints` record;
- correct owner ID;
- `ghosttown-launch-blueprint-v2` schema;
- ready status;
- research receipt;
- one progress record after progress is saved;
- normalized v2.1 execution records attach to the same account, Blueprint ID, Blueprint version, action, and checkpoint.

### Private R2 objects

Verify these keys exist in the private acceptance bucket:

```text
orders/<orderId>/ghosttown-launch-blueprint-v2.pdf
orders/<orderId>/ghosttown-launch-blueprint-v2.json
orders/<orderId>/ghosttown-launch-blueprint-v2-assets.zip
```

Confirm the bucket has no public development URL or custom public domain.

### PDF

Download as the purchasing account and inspect:

- executive decision;
- offer and pricing;
- positioning;
- customer-access and idea-verification evidence;
- source links and research dates;
- outreach scripts;
- landing-page copy;
- weekly milestones;
- all thirty daily actions;
- no clipped text, overlapping content, missing characters, or blank pages.

### Asset ZIP

Verify the ZIP contains the expected 16 files and that:

- `blueprint.json` matches the canonical Blueprint exactly;
- the current v2.1.1 enrichment is present in README/executive/offer/checkpoint/decision assets;
- CSV files open correctly;
- scripts and posts are usable text;
- no secret, prompt, provider raw payload, or owner Google result is present.

### JSON

JSON is a technical/canonical artifact. Verify it exists and matches D1, but do not require the customer to download it separately. It is already included in the ZIP.

---

## 14. Phase 10 — publish and test the Launch Site

From the purchasing account:

1. Open the executable Blueprint.
2. Preview the Launch Site.
3. Verify offer, price, positioning, headline, deliverables, FAQ, proof boundary, and CTA match the canonical Blueprint.
4. Publish the site.
5. Copy the public URL.
6. Open it in a signed-out/incognito browser.
7. Verify the page is public only while status is `published`.
8. Submit one test lead with explicit consent.
9. Return to the owner account and verify the lead appears.
10. Export leads as CSV.
11. Unpublish the site.
12. Confirm the public URL no longer renders the customer page.
13. Republish and confirm the same slug remains valid unless the implementation intentionally rotates it.

Verify D1:

- one `launch_sites` record;
- status transitions and timestamps;
- one `launch_site_leads` record;
- correct site ownership.

Verify response headers:

- public page follows the implemented public cache policy;
- owner routes and lead lists use `private, no-store`;
- unsafe HTML is not executed;
- oversized or invalid lead fields are rejected.

---

## 15. Phase 11 — account recovery and ownership denial

### Account recovery

1. Save progress on multiple days.
2. Add evidence notes, metrics, fulfillment economics, and at least one checkpoint review.
3. Sign out.
4. Sign in on another browser/device with the purchasing account.
5. Confirm Blueprint, normalized progress/evidence, PDF, ZIP, Launch Site state, and leads are restored.

### Cross-account denial

Create a second authenticated test account.

Attempt to:

- open the first customer’s Blueprint;
- download PDF;
- download ZIP;
- request technical JSON;
- read or save progress;
- publish/unpublish the Launch Site;
- list/export leads;
- retry the order.

Every attempt must return a privacy-safe denial, preferably `404` where the existing ownership boundary uses it. No response may reveal the owner email, order details, Stripe checkout metadata, R2 keys, site ID, lead count, verdict ID, or Blueprint existence.

Record request path and status only.

---

## 16. Phase 12 — forced failure and retry

Perform controlled failures in acceptance only.

### Provider failure

Temporarily invalidate or disable one provider in the acceptance environment.

Verify:

- provider error is captured;
- Workflow retries according to policy;
- order does not become ready if quality gates cannot pass;
- customer sees a useful failed/retry state;
- no fabricated targets appear.

Restore the provider and retry through the existing authenticated retry route.

Verify the same paid order proceeds to ready without creating a second charge.

### Storage failure

Temporarily remove or misbind `BLUEPRINTS` in acceptance, or use another controlled test mechanism that cannot affect production.

Verify:

- PDF/JSON/ZIP persistence failure prevents ready status;
- error is retryable;
- after restoring the binding, retry completes;
- no duplicate Stripe order or Workflow is created.

Do not perform destructive D1 or R2 tests against production resources.

---

## 17. Phase 13 — mobile and desktop visual inspection

Inspect the real acceptance frontend and public Launch Site at minimum:

```text
Mobile:  375 × 667
Mobile:  390 × 844
Tablet:  768 × 1024
Desktop: 1366 × 768
Desktop: 1440 × 900
```

Check:

- verdict and micro-commitment cards;
- checkout modal;
- seed confirmation map;
- building/status screens;
- Blueprint navigation;
- customer-access target cards;
- daily calendar and evidence fields;
- PDF/ZIP buttons;
- Launch Site panel;
- public Launch Site;
- lead form;
- owner lead table/export;
- error and retry states.

Record screenshots without customer secrets or payment details.

---

## 18. Phase 14 — production configuration after acceptance passes

Only after all acceptance phases pass:

1. Complete `20-production-domain-decision.md`.
2. Create or select dedicated production D1 and private R2 resources.
3. Configure the production `DB`, `BLUEPRINTS`, and `LAUNCH_BLUEPRINT_WORKFLOW` bindings.
4. Apply all current migrations, including `0002_launch_blueprints.sql`, `0003_launch_sites.sql`, and `0004_blueprint_execution_log.sql`, to production D1.
5. Configure production provider and Vertex secrets and the correct Stripe mode.
6. Deploy with `DISTRIBUTION_FOOTPRINT_ENABLED = "false"` first.
7. Verify health, auth, owner Google boundary, bindings, and Stripe endpoint.
8. Enable paid research only after production smoke tests.
9. Deploy again.
10. Run one production smoke order only if explicitly approved and using an intentional payment/refund procedure.

Do not copy acceptance D1 data, leads, orders, or R2 artifacts into production.

---

## 19. Required acceptance receipt

Create:

```text
docs/receipts/GHOSTTOWN_LAUNCH_BLUEPRINT_ACCEPTANCE_RECEIPT.md
```

Do not include secrets or sensitive customer information.

Keep the receipt concise. Record only evidence needed to reproduce the environment, prove the paid path, verify customer deliverables, or authorize release. Do not duplicate raw logs that already exist in `.acceptance-receipts`.

Required sections:

```text
1. Build identity
- Repository, branch, final commit SHA
- GitHub Actions run and conclusion

2. Acceptance environment identity
- Cloudflare account identity (non-secret)
- Acceptance Worker URL and frontend URL
- KV namespace title/ID, D1 database name/ID, applied migrations, private R2 bucket name
- Workflow name and instance ID
- Configured secret names only
- Vertex project ID, location, configured model
- Vertex service-account email identifier and key ID

3. Paid-path and generation proof
- Stripe test Checkout Session ID and event ID
- GhostTown order ID and confirmed seed domains
- Provider tasks attempted/succeeded, verified candidate count, and independent evidence-dimension count/set
- Vertex stage receipt count (must be 4) and red-team result
- Normalized input SHA-256 and exact canonical Blueprint SHA-256
- Blueprint ID/schema and D1 persistence verification

4. Customer-delivery proof
- PDF/JSON/ZIP persistence, hash-match, and repeat-download result
- PDF visual inspection and ZIP manifest result
- Public Launch Site URL, lead capture, and lead CSV export result
- Account recovery and cross-account denial result

5. Resilience and release decision
- Provider/storage failure-and-retry matrix, including no second charge and no false `ready`
- Mobile/desktop visual acceptance result
- Production domain decision
- Remaining blockers
- Owner approval
```

Do **not** copy the private key, generated JWT assertion, OAuth access token, provider raw payloads, raw prompts, or secret values into the receipt. Individual stage prompt/response hashes are already preserved in the generation receipt and do not need to be duplicated here unless investigating a failure.

---

## 20. Stop conditions

Stop and report rather than improvising when:

- the canonical Blueprint hash does not equal `616c691e6b4c9cea93615963a07375d13ffba57f`;
- current branch or head is not authoritative;
- Wrangler is authenticated to the wrong Cloudflare account;
- resource names collide with unrelated production resources;
- D1 migration order is unclear or migration `0004_blueprint_execution_log.sql` is not applied;
- Stripe price belongs to a different account or mode;
- webhook signature verification fails;
- the acceptance frontend redirects to a production URL;
- research starts before seed confirmation;
- an unknown model-selected candidate is treated as verified evidence or delivered instead of being discarded/recovered;
- quality gates are bypassed;
- paid artifacts enter the public videos bucket;
- another account can infer or access the order;
- the Launch Site renders copy different from the canonical Blueprint;
- a failed provider, Vertex, or storage operation still produces ready status.

No architecture expansion is authorized to work around these failures. Fix the existing contract or record the blocker.

---

## 21. Definition of Done

Environment acceptance is complete only when:

- PR #7 remains based on the authoritative branch;
- canonical Blueprint v2.1.1 hash verification passes;
- CI passes on the acceptance changes, including the acceptance Worker dry-run;
- acceptance resources are isolated from production;
- migrations 0002, 0003, and 0004 are applied;
- all required secret names are configured privately;
- the real Stripe test checkout succeeds;
- webhook idempotency is proven;
- seed confirmation starts exactly one Workflow;
- provider research and original-source verification pass;
- research satisfies the canonical independent-evidence-dimension gate rather than provider/content quotas;
- the acceptance Worker explicitly requires Vertex and the four-stage Vertex pipeline, red-team result, project/location/model identity, and canonical input/output hashes are recorded;
- quality gates pass with real data;
- D1 and private R2 contain the expected records/objects;
- normalized Daily Execution Log records persist and recover for the purchasing account;
- PDF and 16-file v2.1.1-enriched ZIP are valid;
- canonical JSON remains available internally and in the ZIP;
- public Launch Site publishes from the canonical Blueprint;
- lead capture and owner export work;
- account recovery works on another authenticated browser/device;
- cross-account access is denied across Blueprint, artifacts, progress, Launch Site, leads, and retry;
- provider/storage failures do not deliver an incomplete Blueprint;
- retry completes without another charge;
- real PDF and public site pass mobile and desktop visual inspection;
- the production domain pair is explicitly selected and recorded;
- the acceptance receipt is complete and reviewed.

Until all conditions pass, keep PR #7 draft and keep production paid research disabled.
