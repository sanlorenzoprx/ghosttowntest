# GhostTown Launch Blueprint v2.1.2 — Vertex AI Platform Amendment

**Amendment version:** `2.1.2`  
**Decision date:** `2026-08-15`  
**Change identifier:** `GT-BP-2026-08-15-V2.1.2`  
**Base canonical contract:** `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (`2.1.1`, Git blob `616c691e6b4c9cea93615963a07375d13ffba57f`)  
**Repository target:** `sanlorenzoprx/ghosttowntest`  
**Preserved implementation path:** PR `#7`, branch `feat/launch-blueprint-spa`

This amendment is an explicit product decision and an implementation-enabling source update under the authority clause of the base canonical Blueprint. It changes the generative-AI runtime architecture and billing path. It does **not** weaken, remove, substitute, or materially alter any approved customer outcome, evidence requirement, quality gate, safety rule, payment rule, ownership boundary, artifact contract, or release criterion in the base contract.

## Canonical architecture decision

**Cloudflare remains the application platform; Google Vertex AI becomes GhostTown's canonical generative-AI platform.**

The required runtime architecture is:

```text
Cloudflare Worker
      ↓
one GenerativeAIService
      ↓
Cloudflare AI Gateway
      ↓
Google Vertex AI
      ├── cost-efficient model for verdict reasoning
      ├── cost-efficient model for verified-candidate selection
      ├── grounded model for research synthesis
      └── stronger structured model for the paid Launch Blueprint
```

### Application-platform boundary

Cloudflare remains responsible for application execution and deterministic system authority, including:

- Pages and Worker runtime.
- Authentication and account ownership.
- Stripe checkout, webhook handling, idempotency, refunds, and commercial state.
- D1, KV, R2, and Workflow orchestration.
- Launch Site state and lead capture.
- Acceptance and release controls.
- Deterministic scoring, validation, schema checks, evidence checks, and fallback behavior.

Cloudflare Workers AI model inference is not an active GhostTown generative runtime after this amendment. The `AI` binding is retained for Cloudflare AI Gateway access and observability, not as authority to select or execute a Workers AI model.

### Generative-platform boundary

All active GhostTown generative reasoning and generation must enter through one first-party `GenerativeAIService`. That service is responsible for:

- task-to-model selection;
- Vertex service-account OAuth;
- Cloudflare AI Gateway routing;
- request timeout and structured-output configuration;
- Google Search grounding when explicitly requested;
- model/provider/gateway receipts;
- prompt and response hashes without persisting secrets.

Runtime application modules must not call `generativelanguage.googleapis.com` directly and must not depend on a Google AI Studio API key or prepaid Gemini API balance for GhostTown fulfillment.

### Billing and authentication decision

Vertex AI usage is authenticated with the existing Google Cloud service account and billed through the Google Cloud project linked to Vertex AI. Cloudflare AI Gateway sits in the request path for logging, control, and observability. GhostTown does not introduce a second Google AI Studio prepaid-credit requirement for production or acceptance inference.

AI Gateway is accessed from the Cloudflare Worker through the account-bound `AI` binding. The upstream Vertex credential remains a short-lived OAuth access token derived from the service-account key. No long-lived model-provider credential may be written to customer artifacts, source control, or roadmap receipts.

## Task-specific model contract

One integration does not require one model. The runtime exposes independently configurable task slots so cost and quality can be tuned without reintroducing multiple provider integrations.

Initial model policy:

| Task | Config key | Initial model | Intent |
| --- | --- | --- | --- |
| Verdict reasoning | `VERTEX_VERDICT_MODEL` | `gemini-3.5-flash-lite` | high-volume, cost-sensitive reasoning |
| Verified-candidate selection | `VERTEX_SELECTION_MODEL` | `gemini-3.5-flash-lite` | constrained ranking/selection from immutable IDs |
| Grounded research synthesis | `VERTEX_RESEARCH_MODEL` | `gemini-3.5-flash` | Google-grounded research and synthesis |
| Paid Launch Blueprint | `VERTEX_BLUEPRINT_MODEL` | `gemini-3.5-flash` | structured, higher-value generation |

The initial Vertex location is the `us` multi-region because all four selected model slots must be callable from the same supported Vertex location. Model IDs remain configuration, not product promises; a future model lifecycle change may replace a model only through a versioned implementation change that preserves the task contract and acceptance evidence.

## Evidence-provider boundary

This amendment does not turn Vertex into a factual evidence source for data that GhostTown already obtains from deterministic providers.

DataForSEO, Podcast Index, YouTube Data API, customer-supplied evidence, transaction evidence, and public-source verification remain evidence inputs. Vertex may rank, synthesize, explain, or transform verified evidence only within the base Blueprint's truth rules.

## Candidate-selection invariant

The base v2.1.1 research-quality amendment remains fully binding.

For customer-access selection:

1. Provider candidates are collected and verified before the model call.
2. Candidate IDs supplied to Vertex form an immutable allowlist for that selection pass.
3. Vertex may rank and explain only those supplied candidates.
4. A returned candidate ID outside the current allowlist is selection drift.
5. Unknown IDs are rejected/discarded and may never become customer evidence merely because a model emitted them.
6. Delivered targets still require source, date, confidence, access path, asset, script, risk, and first action.

## Verdict invariant

The free GhostTown verdict may use Vertex for reasoning, but deterministic scoring and deterministic fallback remain mandatory. A Vertex outage, quota failure, gateway failure, invalid response, or quality-validation failure must not silently manufacture an AI verdict. The runtime must fall back to the existing deterministic result path where the product contract permits it and must preserve provenance.

## Paid Blueprint invariant

The staged structured-generation requirements in the base contract remain unchanged. The paid Blueprint continues to require staged generation, schema-controlled output, deterministic validation, research-quality gates, receipts, deterministic rendering, private artifact storage, ownership enforcement, and the complete acceptance purchase path.

The only routing change is:

```text
previous: Worker → direct Vertex endpoint
required: Worker → GenerativeAIService → Cloudflare AI Gateway → Vertex AI
```

## Grounded-research invariant

Owner-only Google-grounded research and any later approved grounded synthesis use the same `GenerativeAIService` and Vertex task slot. Grounding metadata must remain source-linked. Owner-only research remains session-only and may not silently enter paid customer fulfillment unless the governing product contract is explicitly changed.

## Deterministic authority remains outside the model

No model may become authoritative for:

- payment or refund state;
- account identity or ownership;
- D1/R2/KV/Workflow state transitions;
- evidence existence or source verification;
- candidate allowlists;
- artifact hashes;
- release decisions;
- production deployment;
- acceptance pass/fail status.

Those remain deterministic software responsibilities.

## Acceptance changes

The Production Roadmap executable decomposition must be updated without changing its commercial sequence:

- the former Gemini API supplied-candidate smoke becomes a **Vertex supplied-candidate-only selection via AI Gateway** smoke;
- the following structured-generation smoke proves **Vertex OAuth + AI Gateway routing + seven receipt-backed structured stages**;
- the acceptance environment must prove the four model slots, `AI_GATEWAY_ID`, Vertex project/location, and service-account secret names;
- `GEMINI_API_KEY` is no longer a required GhostTown generative-runtime secret;
- no production deployment is implied or authorized by this amendment.

## Outcome protection

All customer-facing outcomes and all quality/safety gates from v2.1.1 remain binding. This amendment exists to reduce integration fragmentation, consolidate Google generative billing on Vertex AI, improve observability through Cloudflare AI Gateway, and make one first-party generative service responsible for model calls.

**No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived by this architecture change.**
