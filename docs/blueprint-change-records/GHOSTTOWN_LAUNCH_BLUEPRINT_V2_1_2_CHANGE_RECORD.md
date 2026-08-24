# GhostTown Launch Blueprint v2.1.2 Change Record

**Change ID:** `GT-BP-2026-08-15-V2.1.2`  
**Date:** `2026-08-15`  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**PR:** `#7`  
**Base canonical version:** `2.1.1`  
**Amendment version:** `2.1.2`

## Explicit product decision

The approved generative-AI architecture is changed from multiple inference paths to one controlled path:

```text
Cloudflare Worker
→ GenerativeAIService
→ Cloudflare AI Gateway
→ Google Vertex AI
```

Cloudflare remains the application, data, workflow, payment, and release platform. Vertex AI becomes the generative model platform. Cloudflare AI Gateway is the mandatory routing/observability layer for active GhostTown model inference.

## Reason

The previous implementation had three different generative execution and billing surfaces:

- Cloudflare Workers AI for verdict inference;
- direct Gemini API / Google AI Studio credentials for candidate selection and owner research;
- direct Vertex AI for paid Blueprint structured generation.

This created unnecessary provider plumbing, credential/billing fragmentation, lifecycle drift, and acceptance complexity. The direct Gemini API path also exposed acceptance to a separate prepaid-credit balance unrelated to the existing Vertex Cloud Billing path.

The v2.1.2 decision consolidates model inference on the already-approved Vertex service-account and Google Cloud billing boundary while preserving Cloudflare as the runtime and introducing AI Gateway as the single routing/observability point.

## Implementation consequences

1. Add one first-party `GenerativeAIService` for all active model calls.
2. Use the Cloudflare `AI` binding only for AI Gateway access, not Workers AI inference.
3. Use task-specific Vertex model slots for verdict, selection, grounded research, and paid Blueprint generation.
4. Remove runtime calls to `generativelanguage.googleapis.com`.
5. Remove `GEMINI_API_KEY` as a required generative-runtime secret.
6. Preserve service-account OAuth and short-lived access tokens for upstream Vertex authentication.
7. Preserve deterministic verdict fallback.
8. Preserve immutable supplied-candidate selection and unknown-ID rejection.
9. Preserve all provider evidence, quality, ownership, Stripe, artifact, and release gates.
10. Replace Roadmap Gate 14 with a Vertex + AI Gateway supplied-candidate smoke and Gate 15 with a Vertex + AI Gateway seven-stage structured-generation smoke.

## Initial model policy

- Verdict: `gemini-3.5-flash-lite`
- Candidate selection: `gemini-3.5-flash-lite`
- Grounded research: `gemini-3.5-flash`
- Paid Blueprint: `gemini-3.5-flash`
- Vertex location: `us`
- AI Gateway ID: `default`

These are implementation configuration values, not customer-facing product promises. Model replacement must preserve each task's contract and acceptance evidence.

## Outcome protection

This change does not alter the approved GhostTown customer outcome. It does not waive or weaken any requirement in the v2.1.1 base canonical contract. In particular, it does not change:

- the $97 Launch Blueprint product outcome;
- the starting-state, offer, first-revenue, fulfillment, research, asset, Launch Site, calendar, evidence, checkpoint, PDF, ZIP, or dashboard contracts;
- provider-backed factual evidence requirements;
- truth labels and source verification;
- candidate allowlist enforcement;
- deterministic fallback and validation;
- account ownership and private artifact rules;
- Stripe fulfillment/idempotency rules;
- acceptance sequencing;
- the explicit prohibition on automatic production release.

**Weakening approved outcomes remains prohibited.**
