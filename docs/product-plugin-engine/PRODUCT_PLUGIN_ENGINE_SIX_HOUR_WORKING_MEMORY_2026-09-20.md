# Product Plugin Engine — Six-Hour Working Memory and Audit Log

**Date:** 2026-09-20  
**Status:** DURABLE PROJECT MEMORY / DECISION AUDIT

This file preserves the actual decisions, corrections, research findings, missing evidence, underused source files, and current authoritative state from the working session. It is intentionally an audit log, not a cleaned-up rewrite.

## 1. First Product Plugin question

The first question is:

> **What is this product's niche?**

Then:

1. What is the subniche?
2. What specific problem / intent brings the customer here?
3. What exact words do people in that niche use?
4. What successful same-niche / same-category creative exists?
5. What successful same-niche / same-category creative exists in other countries?
6. What do titles, captions, hashtags, hooks, visuals, offers, comments, and performance signals tell us?
7. What patterns are real enough to test?
8. Then create the product-specific plugin.

**Correction:** New business vs established business is a later evidence-strategy branch. It is not the first Product Plugin question.

## 2. Core premise

Other people and companies already operate in the product's field.

The Product Plugin Engine should use compute to understand that field from real evidence rather than inventing a market from AI intuition and then searching for confirmation.

> **Evidence supplies reality. Compute supplies understanding.**

Compute is used to understand at scale:

- what people need;
- what people want;
- what people fear;
- what people complain about;
- what they search for;
- what they try;
- what they buy;
- what they reject;
- which alternatives they use;
- what words they use;
- what content gets attention;
- what offers are made;
- what patterns recur;
- what remains unknown.

## 3. Hard separation: Engine vs Product Plugin

### Product Plugin Engine

The generic engine owns **how to learn**:

- niche discovery;
- subniche discovery;
- problem / intent discovery;
- audience discovery;
- market-language discovery;
- research-universe construction;
- same-category research;
- same-category foreign-market research;
- evidence / provenance handling;
- pattern extraction;
- hypothesis management;
- uncertainty handling;
- deterministic validation;
- plugin creation;
- learning / refinement.

### Product-specific plugin

The product plugin owns **what was learned about that product**.

For GhostTown that includes:

- niche;
- subniche;
- problem / intent;
- audience;
- keywords;
- questions;
- competitors;
- exemplars;
- foreign-market exemplars;
- hooks;
- offers;
- CTAs;
- creative patterns;
- hypotheses;
- contradictory evidence;
- results;
- attribution;
- learned performance.

> **ENGINE = HOW TO DISCOVER AND LEARN**  
> **PRODUCT PLUGIN = WHAT WAS DISCOVERED AND LEARNED FOR ONE PRODUCT**

Placement test:

> **Would this still be true if GhostTown did not exist?**

If yes, it may belong in the engine. If no, it belongs in the GhostTown plugin.

## 4. Niche-specific evidence rule

Research counts as product-specific evidence only when anchored to the product's actual:

- niche;
- subniche;
- problem / intent;
- market-native language.

Broad material about business, startups, entrepreneurship, accounting, marketing, making money, or adjacent SaaS does not automatically count as GhostTown evidence.

It may remain useful as platform, pacing, production, hook-format, or adjacent-market reference.

Binding order:

> **Product → niche → subniche → problem / intent → real keywords/questions → research corpus**

Do not collect broad creative first and later relabel it as niche evidence.

## 5. Research priority

1. Same product / closest same-category successful creative.
2. Same-category successful creative from other countries / markets.
3. Same audience / same problem evidence.
4. Adjacent product / adjacent interest evidence.
5. Generic platform mechanics.

Foreign-market same-category research is deliberately #2.

Compare:

- local saturation;
- foreign novelty;
- universal patterns;
- framing;
- hooks;
- offers;
- cultural dependence;
- transferability.

**Important:** “Foreign creative will attract more attention” is a hypothesis, not a proven fact.

## 6. Titles, captions, hashtags, comments

Collect when available:

- title;
- caption;
- description;
- hashtags;
- visible on-screen text;
- hook;
- CTA;
- comments / audience language;
- platform;
- country;
- date;
- performance evidence.

These are separate intelligence layers for audience vocabulary, framing, intent, promises, objections, discovery clusters, claims, and positioning.

Do not compress this into “collect metadata.”

## 7. YouTube

YouTube is a core evidence source.

Useful evidence includes:

- video titles;
- descriptions;
- transcripts;
- hashtags;
- dates;
- views / engagement where available;
- recurring problems;
- desired outcomes;
- objections;
- questions;
- failed solutions;
- exact audience language from comments.

A popular video is evidence of attention, framing, language, and audience interest. It is not proof that the creator's causal claim is true.

Comments are especially valuable for direct user language, unresolved needs, objections, failed attempts, questions, and desired outcomes.

## 8. Build a real User Needs / Niche Intelligence corpus

Architecture is not the research database.

The durable intelligence asset should preserve actual evidence.

Suggested structure:

```text
NICHE_INTELLIGENCE_DATA/
    raw_sources/
        youtube_videos.jsonl
        youtube_comments.jsonl
        tiktok_ads.jsonl
        reddit.jsonl
        search_queries.jsonl

    extracted/
        user_needs.jsonl
        problems.jsonl
        desired_outcomes.jsonl
        objections.jsonl
        failed_solutions.jsonl
        exact_language.jsonl

    clusters/
        niches.json
        subniches.json
        intent_clusters.json
```

A generic evidence record may preserve:

```text
source
source_url_or_id
date
country
platform
exact_user_statement
problem
desired_outcome
trigger
current_solution
complaint
objection
purchase_intent
exact_language
niche_candidate
subniche_candidate
evidence_class
evidence_strength
```

Do not overwrite exact human language with AI abstractions. Keep both the original statement and the interpretation.

## 9. Niche-specific measurements

The engine should measure what matters in the niche, not only generic platform metrics.

### Market / problem evidence

- recurrence of the same problem;
- recurrence of the same desired outcome;
- independent-source recurrence;
- source/community diversity;
- repeated exact customer language;
- presence of active alternatives / competitors;
- evidence people already try to solve the problem;
- search footprint / topic activity;
- niche-community activity;
- repeated questions in comments / forums.

### Commercial-intent evidence

- willingness-to-pay language;
- recommendation requests;
- requests for tools / services;
- pricing questions;
- switching complaints;
- workaround cost / effort;
- booked calls;
- proposal requests;
- deposits;
- payments;
- repeat purchases where relevant.

### Creative evidence

- same-niche creative persistence;
- repeated hook families;
- repeated offer structures;
- repeated proof types;
- repeated CTAs;
- attention / engagement signals;
- title / caption / hashtag clusters;
- comment response quality;
- local-vs-foreign differences.

### Evidence discipline

Do not convert:

- views into demand;
- search volume into willingness to pay;
- competitor presence into product-market fit;
- repeated creative patterns into causal rules.

## 10. Deterministic shell + probabilistic AI core

This architecture existed before this session.

A prior Product Plugin Creation Engine file defined:

> **AI interpretation + deterministic contracts + runtime validation + observed learning**

Pattern:

```text
authoritative inputs
        ↓
AI interpretation / discovery
        ↓
deterministic validation
        ↓
AI refinement if needed
        ↓
contract acceptance
```

AI is useful for interpretation, niche candidates, clustering, pattern finding, hypotheses, product-specific attributes, and alternatives.

Deterministic code owns:

- required fields;
- valid types;
- valid event names;
- existing capability references;
- real CTA references;
- unsupported-claim rejection;
- bounded dimensions;
- deduplication;
- privacy constraints;
- contract compatibility;
- engine/plugin boundaries;
- state transitions;
- advancement gates.

Session lesson:

> AI can have an earlier rule available and still omit, demote, or misclassify it.

Therefore:

> **Do not rely on AI memory to enforce invariants.**

## 11. Parameterization principle

> **Parameterize dimensions we know vary. Do not parameterize every scenario we can imagine.**

Parameterize when real evidence shows a dimension varies and materially changes behavior.

- one-product quirk → keep it in that product plugin;
- repeated cross-product difference → candidate engine parameter;
- imagined variation without evidence → do not parameterize yet.

The principle is a default, not dogma. If reality later proves a dimension varies and matters, parameterize it.

## 12. Unknowns / claim states

Useful states:

- fact;
- inference;
- hypothesis;
- unknown.

Important claims should preserve:

- provenance;
- supporting evidence;
- contradictory evidence;
- scope;
- confidence;
- next test when useful.

Avoid fake precision such as `market_fit = 92.4` unless a real defined statistical model supports it.

## 13. Mode 1 and Mode 2

### Mode 1 — New business entering a niche

- little/no first-party performance data;
- external niche evidence heavy;
- more hypotheses;
- higher uncertainty.

### Mode 2 — Established business trying to grow

- customers;
- sales history;
- offers;
- conversion;
- retention;
- channel history;
- prior creative;
- customer language;
- richer first-party evidence.

Strategy:

> **Mode 1 now → prove the learning loop → preserve compatibility for Mode 2 → expand into established-business growth later.**

Mode 2 is the long-term commercial bet. Mode 1 is the near-term proving ground.

Again: this branch comes after niche understanding; it is not the first Product Plugin question.

## 14. Research that actually exists

### 14.1 TikTok Top Ads work

Recoverable session history says:

- 30 verified TikTok Top Ads records were identified;
- seven examples were analyzed more deeply;
- examples included multiple QuickBooks ads, Cardiff funding, Hawke Media, TikTok for Business, and 1-800Accountant.

Recovered pacing observations include:

- some QuickBooks examples showed very fast visual-change behavior;
- one analysis counted roughly 37 major changes across about 44 seconds;
- one example showed about 6 changes in the first 3 seconds;
- recalled QuickBooks change intervals were roughly 1.17–1.91 seconds;
- Cardiff was recalled around 2.73 sec/change;
- Hawke around 4.33 sec/change;
- TikTok Business around 4.62 sec/change;
- 1-800Accountant around 5.50 sec/change.

These were used to challenge a slower GhostTown Q1 cadence.

**Critical status:** The raw 30-record TikTok corpus and source-level measurement file were not located in the repo or ChatGPT file library during recovery.

So:

> The research happened, but the raw durable corpus is missing.

Do not treat these recovered conversation notes as a replacement for the source corpus.

### 14.2 Intent clusters

Conversation history references roughly 12 intent clusters.

The full durable file containing those cluster definitions was not located.

Status:

> Work happened; full durable cluster data not recovered.

Do not invent the missing clusters.

### 14.3 GhostTown Evidence Scan

Recovered GhostTown work already includes an Evidence Scan using:

- DataForSEO;
- Podcast Index;
- YouTube Data API;
- Competition scan;
- Demand / search-footprint scan;
- YouTube + podcast buyer-access scan;
- provider receipts;
- deduplication;
- bounded results;
- explicit uncertainty;
- market vs customer vs commercial evidence separation.

It explicitly states:

> Search footprint is market evidence only; it does not prove willingness to pay.

The evidence architecture also stores things such as:

- contact / channel;
- exact customer response;
- customer language;
- alternative;
- objection;
- commitment offered;
- commitment received;
- revenue;
- follow-up;
- evidence strength.

Part of the needed evidence architecture already exists. Do not rebuild it blindly.

### 14.4 GhostTown Launch Blueprint research model

A recovered Launch Blueprint already instructs research into:

- Reddit;
- LinkedIn;
- Facebook;
- associations;
- trade/professional groups;
- forums;
- public Slack/Discord;
- newsletters;
- podcasts;
- conferences/events;
- YouTube channels and comment communities;
- directories;
- marketplaces;
- search terms;
- hashtags;
- referral partners.

YouTube comments and community discovery were therefore already part of the prior research model.

## 15. Earlier file that was underused

### `Product Plugin Creation Engine.md` — 2026-09-18

This prior file already established:

- StoryFactory should be able to generate product plugins;
- Product Analysis;
- Product Attribute Extraction;
- Product Plugin Creation Engine;
- AI-proposed audience, pains, outcomes, story opportunities, attributes, conversion events, CTA families, evidence, constraints, and learning dimensions;
- deterministic validation of required fields, types, events, capabilities, CTA, claims, dimensions, duplication, privacy, and compatibility;
- small plugin contracts;
- generic StoryFactory capabilities stay out of plugins;
- context → experimental dimension → proven plugin dimension;
- plugin learning from observed response;
- Product → Plugin → Creatives → Evidence → Better Plugin → Better Creatives.

It explicitly said:

> **Product Plugin Creation Engine = AI interpretation + deterministic contracts + runtime validation + observed learning**

This file should have been treated as a primary source during today's discussion. Failing to use it consistently caused unnecessary re-derivation.

## 16. Rejected / corrected directions

### 16.1 Rejected: External Baseline Knowledge Check as the main frame

A proposed flow treated external evidence as a sanity check around AI reasoning.

Rejected.

Correct frame:

> Real external evidence is the substance from which compute builds understanding.

### 16.2 Rejected: PP-01 purpose

`PP-01_PRODUCT_PLUGIN_ENGINE_NICHE_INTELLIGENCE_PROOF.md` framed the purpose as proving the generic engine could understand a niche before creating a plugin.

The user rejected that as the purpose.

The file may contain useful candidate mechanics, but its purpose statement is not authoritative.

### 16.3 Corrected: Product-to-published reframing

After PP-01 was corrected, the discussion swung too far toward Product → Plugin → StoryFactory → Published Creative.

That moved away from the immediate layer being defined.

Lesson:

> Do not redefine the system goal when the user is trying to lock one layer.

### 16.4 Corrected: Product Truth as the first question

Useful as an input discipline, but not the agreed first Product Plugin question.

Final:

> **What is this product's niche?**

### 16.5 Corrected: New vs established as first question

Incorrectly promoted to first question.

Final:

- niche;
- subniche;
- problem / intent;
- market-native language;
- then business state changes evidence strategy.

### 16.6 Corrected: $1,000 discussion

The approximate $1,000 refinement figure was casual brainstorming.

It was incorrectly promoted into a canonical rule.

Correct status:

> Conversational example only. Not a canonical budget or architecture requirement.

### 16.7 Corrected: broad TikTok research as GhostTown niche evidence

Broad accounting/startup/business examples are useful platform references but do not automatically count as GhostTown niche evidence.

Final:

> Product-specific evidence must be niche/subniche/problem-language specific.

## 17. Reasoning failures observed during this session

These are preserved because the engine should defend against the same kinds of failure.

### Omission / priority error
An agreed rule was available but omitted or demoted later.

### Boundary error
GhostTown-specific and generic-engine thinking were blurred.

### Classification error
A casual example was promoted into a requirement.

### Goal substitution
An intermediate gate was described as the purpose.

### Over-abstraction
Specific commercial rules were compressed into generic language and lost operational meaning.

### Re-derivation
Existing durable files were not checked early enough, so already-solved architecture was treated as new.

These are not RAM problems. They are state-management and reasoning-discipline problems.

## 18. Rules for future sessions

1. Read the canonical engine files before changing architecture.
2. Read this audit log before redefining niche-learning sequence.
3. Preserve explicit rules until explicitly changed.
4. Do not silently generalize specific rules.
5. Do not promote casual numbers into requirements.
6. Do not treat broad business research as niche-specific evidence.
7. Do not confuse architecture with evidence.
8. Do not treat views/search volume/competitor presence as demand proof.
9. Keep exact human language next to AI interpretation.
10. Let AI explore; let deterministic code enforce invariants.
11. Parameterize dimensions we know vary.
12. Do not parameterize every scenario we can imagine.
13. Keep GhostTown-specific knowledge out of the generic engine.
14. Surface conflicts with earlier locked rules explicitly.
15. If intent becomes unclear, ask for the core idea rather than inventing another architecture layer.

## 19. Files created during this session

Created during this session:

- `PRODUCT_PLUGIN_CREATION_CANONICAL_RULES.md`
- `PRODUCT_PLUGIN_ENGINE_CANONICAL.md`
- `GHOSTTOWN_PRODUCT_PLUGIN_CANONICAL.md`
- `PRODUCT_PLUGIN_HARD_SEPARATION.md`
- `PP-01_PRODUCT_PLUGIN_ENGINE_NICHE_INTELLIGENCE_PROOF.md`

Status:

- `PRODUCT_PLUGIN_ENGINE_CANONICAL.md` — useful canonical boundary.
- `GHOSTTOWN_PRODUCT_PLUGIN_CANONICAL.md` — useful product boundary.
- `PRODUCT_PLUGIN_HARD_SEPARATION.md` — useful hard separation rule.
- `PRODUCT_PLUGIN_CREATION_CANONICAL_RULES.md` — useful, but contains the now-invalid canonicalization of the casual $1,000 discussion; that budget language must not control future work.
- `PP-01_PRODUCT_PLUGIN_ENGINE_NICHE_INTELLIGENCE_PROOF.md` — useful candidate mechanics; stated purpose was rejected and is not authoritative.

## 20. Important prior files recovered

### `Product Plugin Creation Engine.md`
Major pre-existing source for the hybrid AI/deterministic architecture.

### `GhostTownTest Improvements 2, 9-15.pdf`
Evidence Scan, YouTube Data API, search/demand signals, evidence classes, observed evidence.

### `GhostTown Launch Blueprint.md`
Customer language, communities, YouTube comments, search terms, hashtags.

### `Improved Autonomous Acquisition Factory structure.md`
Outcome Graph, evidence taxonomy, TikTok Top Ads, YouTube Data API, negative examples, closed-loop learning.

These overlap with Product Plugin Engine needs and should be mined rather than duplicated.

## 21. Biggest current gap

The biggest gap is not architecture.

The biggest gap is the missing durable raw corpus for:

- TikTok Top Ads;
- YouTube videos;
- YouTube comments;
- niche-specific keywords / questions;
- intent clusters;
- local-vs-foreign same-category examples.

The system currently has stronger architecture memory than evidence memory.

That is backwards.

The evidence corpus should become the primary intelligence asset.

## 22. Current direction

Do not redesign the whole engine again.

1. Ask: **What is this product's niche?**
2. Use real external evidence to answer it.
3. Drill to subniche.
4. Identify problem / intent.
5. Capture exact market-native language.
6. Define the niche-specific research universe.
7. Collect same-category successful creative.
8. Collect same-category foreign-market successful creative.
9. Preserve titles, captions, hashtags, hooks, offers, comments, and performance evidence.
10. Build the durable User Needs / Niche Intelligence corpus.
11. Use AI to interpret and cluster evidence.
12. Use deterministic rules for boundaries, provenance, evidence classes, and acceptance.
13. Create the product-specific plugin from the learned evidence.
14. Run Mode 1 as the proving ground.
15. Preserve a clean path for Mode 2 later.

## 23. One-sentence memory

> **The Product Plugin Engine uses real niche evidence plus compute to understand what people in a product's market actually need and how that market communicates; AI explores and interprets, deterministic code protects invariants, product-specific learning stays inside that product's plugin, and only dimensions proven to vary are parameterized.**

## 24. Final caution

Do not let a future summary replace this audit log with a cleaner but weaker abstraction.

If a future summary conflicts with this file:

1. identify the exact conflict;
2. check the source files / evidence;
3. change the rule explicitly;
4. preserve why it changed.

Do not silently overwrite history.
