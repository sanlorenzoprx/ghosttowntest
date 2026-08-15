# GhostTown Launch Blueprint v2.1.3 Change Record

**Change ID:** `GT-BP-2026-08-15-V2.1.3`  
**Date:** `2026-08-15`  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**PR:** `#7`  
**Base canonical version:** `2.1.1`  
**Previous amendment:** `2.1.2`  
**Amendment version:** `2.1.3`

## Explicit product decision

Custom website creation is added as a separate post-Blueprint commercial capability.

```text
GhostTown Verdict
→ $97 Launch Blueprint
→ optional Custom Website
→ Story Studio acquisition engine
→ ACS operating / optimization layer
```

The Custom Website is not part of the $97 Blueprint generation call and does not replace the existing validation-stage Launch Site.

## Implementation decision

The website capability is owned by `WebsiteCreationService`:

```text
WebsiteCreationService
├── GenerativeAIService (`custom_website` task)
├── ComponentRegistry
├── deterministic BuildRunner
├── BrowserTester adapter
└── DeploymentAdapter
```

`GenerativeAIService` remains the sole active generative-model boundary and routes the dedicated `custom_website` task through Cloudflare AI Gateway to Vertex AI.

The initial website model slot is `VERTEX_WEBSITE_MODEL=gemini-3.5-flash`. The model ID is configuration rather than a product promise.

## Controlled generation decision

The system deliberately does not ask Vertex to invent and execute an unconstrained website codebase.

Vertex returns a structured website specification using registered components. Deterministic code owns rendering, URL safety, escaping, build hashes, browser-test authority, and deployment authority.

Initial registered components:

- hero
- problem
- solution
- how_it_works
- comparison
- pricing
- proof
- faq
- lead_capture
- footer

## Truth boundary

The ready Launch Blueprint is the source strategy. Pricing, proof, risk reversal, business identity, CTA labels, FAQ evidence, legal flags, and comparison inputs are deterministically reconstructed from the Blueprint after the model call.

Model-authored testimonials, customer counts, awards, guarantees, new prices, market statistics, or proof claims cannot become customer-facing facts merely because the model emitted them.

## Browser-test and repair boundary

Website builds may be tested through a `BrowserTester` adapter. Blocking/high findings may trigger a bounded repair loop through the `custom_website` task. The default maximum is two repairs and the hard maximum is three.

A repair may not weaken Blueprint truth, proof, pricing, legal, ownership, or release constraints.

## Deployment boundary

Website generation produces a deployable build by default, not a published production site.

Deployment requires:

1. explicit caller intent;
2. a supplied `DeploymentAdapter`;
3. a passing browser-test result.

No automatic production deployment is authorized.

## Commercial decisions intentionally deferred

No website upsell price, Stripe product, entitlement, custom-domain policy, revision plan, support tier, or production deployment target is introduced by this change. Those require a separate commercial acceptance decision.

## Outcome protection

The v2.1.1 canonical Blueprint and v2.1.2 Vertex AI platform amendment remain binding. The existing Launch Site remains the $97 Blueprint validation microsite. The Custom Website capability expands the commercial ladder without weakening existing customer outcomes or acceptance gates.

**Weakening approved outcomes remains prohibited.**
