# GhostTown Launch Blueprint v2.1.6 — Execution Intelligence Amendment

**Amendment version:** `2.1.6`  
**Change ID:** `GT-BP-2026-08-18-V2.1.6`  
**Base canonical contract:** `2.1.1`  
**Predecessor amendment:** `2.1.5`

## Product decision

GhostTown's paid 30-Day Launch Blueprint is an evidence-aware execution system, not a generic business chatbot and not a static calendar.

The customer-facing outcome is:

> GhostTown knows what kind of business I am testing, tells me exactly what to do today, gives me the asset to do it, knows what result I need to record, prevents me from pretending an incomplete test is complete, recognizes when the evidence contradicts the plan, changes only the part the evidence justifies changing, and tells me what experiment to run next.

The implementation combines the canonical execution spine, business-model lane semantics, deterministic execution-context retrieval, formal checkpoint branch routing, and an interactive Execution Copilot. The canonical Blueprint and recorded customer behavior remain more authoritative than model output.

## 1. Execution spine remains authoritative

The thirty canonical DailyExecutionPackets continue to define the live experiment. Each packet owns its objective, target, action, quantity, asset, evidence requirement, success threshold, failure threshold, branch rule, effort estimate, and completion definition.

The model may explain or reason about this contract. It may not waive, replace, or silently rewrite it.

## 2. Business-model lane semantics

GhostTown must interpret execution through the business model selected by the v2.1 classifier:

- `service_or_consulting`;
- `saas`;
- `digital_product`;
- `physical_product`;
- `marketplace`;
- `local_business`;
- `creator_or_media`.

Each lane has an explicit commitment mechanism, first commercial proof, fulfillment proof, economics focus, scale question, and preferred commercial language.

Examples include paid scope/pilot for service, design-partner or concierge-workflow commitment for SaaS, presale for digital product, preorder/prototype commitment for physical product, manually qualified transaction for marketplace, appointment/deposit for local business, and subscriber/sponsor/paid-product behavior for creator/media.

The common evidence spine is preserved. Lane personalization must not create seven unrelated methodologies or lower the standard of evidence.

## 3. Deterministic execution-context retrieval

Before an AI model is called, GhostTown assembles the relevant context from founder-owned canonical state.

The first retrieval tier is deterministic and identity-based:

- Blueprint ID and version;
- active day;
- exact DailyExecutionPacket;
- action IDs and targets;
- prepared assets and their canonical content;
- lane profile;
- completion state and objective metrics;
- evidence attached to the active action/day;
- latest applicable checkpoint review;
- bounded relevant prior evidence;
- bounded relevant Blueprint research sources.

Current-day evidence is prioritized over approximate retrieval.

Semantic or vector retrieval may later improve recall over larger histories, but it remains supplemental. A vector database may not become the authority for current experiment state, completion, evidence identity, or checkpoint permissions.

## 4. Formal checkpoint branch routing

Day 7, 14, 21, and 30 reviews create a formal execution branch state.

Permitted routes are:

- `continue`;
- `revise_customer`;
- `revise_problem`;
- `revise_access`;
- `revise_trust`;
- `revise_offer`;
- `revise_fulfillment`;
- `revise_price`;
- `revise_message`;
- `pause_missing_evidence`;
- `stop`.

A revision branch identifies one experiment variable that `mayChange`. All other experiment variables are returned as `mustKeep` for that bounded test.

The purpose is experimental discipline: a price objection must not automatically cause simultaneous changes to customer, problem, channel, offer, price, and message.

A generic Day-30 `continue_with_revision` or `revise` decision uses the recorded primary constraint to select the one permitted variable. If the evidence review does not support a defensible constraint, GhostTown pauses for missing evidence instead of inventing a revision.

No-evidence is a legitimate outcome. The system must never manufacture positive evidence to permit continuation.

## 5. Execution Copilot

The selected/current day exposes an interactive Copilot with two scopes.

### Current Experiment

This is the default execution mode. The Copilot:

- reads the deterministic retrieved context;
- explains today's exact work;
- points to the relevant prepared asset;
- explains the evidence still required;
- helps interpret customer responses while separating recorded behavior from inference;
- identifies contradictions between recorded evidence and the plan;
- respects the formal branch's `mayChange` and `mustKeep` fields;
- recommends one bounded next experiment;
- may invoke grounded research when the question requires current external evidence.

Current Experiment output does not mutate the canonical Blueprint or live experiment.

### Strategy Room

Strategy Room allows broader exploration of alternate customers, offers, business models, pricing, channels, and business strategy.

Strategy Room is explicitly non-mutating. An explored idea does not become part of the live experiment merely because a model recommends it. Any later adoption must pass through an evidence-backed checkpoint/product-state transition.

## 6. AI capability slots

Execution Intelligence uses stable capability contracts rather than binding product semantics to a model brand:

- `fast_assistant` — routine daily explanation and execution help;
- `strategy_reasoner` — high-impact strategy/constraint/next-experiment reasoning;
- `critic` — skeptical review for unsupported inference, confounded variables, and weak-evidence overreach;
- `grounded_research` — current external research when required.

The current implementation reuses the approved first-party GenerativeAIService through Cloudflare AI Gateway to Google Vertex AI. No second model provider is required by this amendment.

Capability slots may later be served by open-source or other approved models when measured quality, latency, cost, and contract compliance justify substitution. Model replacement must not change the deterministic execution contract.

High-impact Current Experiment reasoning may receive a second critic pass. Routine requests should not require multi-model voting.

## 7. Deterministic authority boundary

AI is advisory. Deterministic software remains authoritative for:

- authentication and paid-order ownership;
- canonical Blueprint identity/version;
- required evidence quantity;
- sequence and completion eligibility;
- checkpoint completion;
- stored evidence and revision history;
- objective money/time/cost arithmetic;
- formal branch permissions;
- payment state;
- D1/R2 persistence;
- artifact integrity;
- release gates and production deployment.

The Copilot may propose language or an interpretation. It may not create evidence merely by saying that something happened.

## 8. Evidence synthesis boundary

Founder-supplied interview notes, replies, objections, call summaries, transcripts, and similar material may be used as Copilot context consistent with the canonical evidence-synthesis requirement.

The model must distinguish direct customer statements from inference. It may propose how the founder should structure or interpret an evidence entry, but the stored evidence remains an explicit product action governed by the evidence system.

## 9. Artifact and release preservation

This amendment does not regenerate or mutate the already accepted paid-order artifacts solely to add Copilot intelligence. The calendar/Copilot experience operates against the existing canonical Blueprint and account execution state.

This amendment does not alter:

- the $97 price or Stripe contract;
- accepted Gate 20 purchase identity;
- accepted Gate 26/27 D1/R2 artifact bytes;
- Gate 28 PDF/ZIP requirements;
- the base canonical Blueprint source/hash;
- Custom Website separation;
- Launch Site boundaries;
- production-deployment policy;
- Gate 36 as the explicit human production-release decision.

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment.

**Weakening approved outcomes remains prohibited.**
