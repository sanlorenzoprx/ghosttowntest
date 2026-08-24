# GhostTown Launch Blueprint v2.1.3 — Custom Website Capability Amendment

**Amendment version:** `2.1.3`  
**Decision date:** `2026-08-15`  
**Change identifier:** `GT-BP-2026-08-15-V2.1.3`  
**Base canonical contract:** `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (`2.1.1`, Git blob `616c691e6b4c9cea93615963a07375d13ffba57f`)  
**Previous platform amendment:** `2.1.2` (`GT-BP-2026-08-15-V2.1.2`)  
**Repository target:** `sanlorenzoprx/ghosttowntest`  
**Preserved implementation path:** PR `#7`, branch `feat/launch-blueprint-spa`

This amendment records an explicit product decision under the base Blueprint authority clause. It adds a separate Custom Website manufacturing capability after the paid Launch Blueprint. It does not weaken, replace, or silently expand the $97 Blueprint fulfillment contract, and it does not authorize production deployment.

## Product decision

**Custom website creation is a separate post-Blueprint `WebsiteCreationService` capability and must not be folded into paid Blueprint generation.**

The commercial sequence is:

```text
FREE GhostTown Verdict
        ↓
$97 30-Day Launch Blueprint
        ↓
optional Custom Website upsell
        ↓
Story Studio acquisition engine
        ↓
ongoing ACS operating / optimization layer
```

The existing Blueprint Launch Site remains the validation-stage microsite already included in the $97 product. It is not the Custom Website upsell and its current contract remains unchanged.

## Architecture

The v2.1.2 AI-platform decision remains binding:

```text
Cloudflare Worker / Workflow
        ↓
WebsiteCreationService
        ├── GenerativeAIService
        │       ↓
        │  Cloudflare AI Gateway
        │       ↓
        │  Google Vertex AI
        │       └── custom_website model slot
        ├── ComponentRegistry
        ├── deterministic BuildRunner
        ├── BrowserTester adapter
        └── DeploymentAdapter
```

Cloudflare remains the application platform. Vertex remains the generative-AI platform. `WebsiteCreationService` is the product orchestration layer for manufacturing a site; `GenerativeAIService` remains the only active model-call boundary.

## Dedicated GenerativeAIService task

The service adds a separate task slot:

| Task | Config key | Initial model | Purpose |
| --- | --- | --- | --- |
| Custom website | `VERTEX_WEBSITE_MODEL` | `gemini-3.5-flash` | structured website specification, copy adaptation, visual direction, and repair reasoning |

This task must not reuse the semantic identity of the paid Blueprint task even when the same underlying model ID is configured. The separation is contractual: website generation is a different product workflow with different inputs, outputs, quality gates, and commercial entitlement.

## Website manufacturing workflow

A Custom Website is not one model call. The capability is:

```text
ready validated Blueprint
        ↓
website source-contract check
        ↓
structured website specification
        ↓
registered component selection
        ↓
truth-critical deterministic normalization
        ↓
deterministic build
        ↓
automated browser testing
        ↓
bounded repair loop
        ↓
deployable build
        ↓
explicit deployment only
```

The system may later attach a commercial checkout/entitlement to this workflow, but this amendment does not invent the website price or authorize a live product SKU.

## Controlled component contract

The initial component registry is:

- `hero`
- `problem`
- `solution`
- `how_it_works`
- `comparison`
- `pricing`
- `proof`
- `faq`
- `lead_capture`
- `footer`

Vertex may select from registered components and return structured content. Vertex may not emit arbitrary executable HTML, CSS, JavaScript, React, or framework source as the authoritative website implementation. Deterministic software renders the registered components.

This preserves meaningful customization while preventing unbounded model-generated software from becoming production code without deterministic controls.

## Blueprint-as-source invariant

Custom website creation starts only from a ready Blueprint whose quality gate passed. The Blueprint is the strategic source of truth for:

- customer and ICP;
- validated offer and promise;
- painful problem and desired outcome;
- test price and pricing rationale;
- positioning and current alternatives;
- deliverables and exclusions;
- risk reversal;
- validation-stage proof status;
- approved proof claims and proof placeholders;
- FAQ evidence;
- CTA language;
- business identity and contact information;
- legal/disclaimer flags.

Website creation does not reopen or silently rewrite the Blueprint.

## Truth and proof invariant

The model may adapt low-risk copy and visual direction, but deterministic software must overwrite or reject model output for truth-critical values. In particular, a model may not create authoritative:

- prices;
- testimonials;
- customer counts;
- awards;
- guarantees;
- market statistics;
- proof claims;
- legal status;
- checkout state;
- ownership state.

Proof remains explicitly `validation-stage` until real evidence changes the governing source state.

## Build and security invariant

The build layer must:

- escape model-authored text;
- use a controlled component registry;
- restrict actionable URLs to approved safe schemes;
- create deterministic build artifacts;
- hash the canonical site specification and build files;
- produce a deployable bundle without requiring arbitrary model-generated code execution.

## Browser testing and repair invariant

Browser testing remains deterministic/external to the model. A tester may return viewport findings and screenshot references. Blocking/high findings may trigger a bounded repair call through the `custom_website` task.

A repair may change style, optional component choice, and low-risk copy. It may not weaken source truth, pricing, proof, legal, ownership, or release constraints.

## Deployment invariant

No Custom Website may deploy merely because generation completed.

Deployment requires explicit caller intent, a configured `DeploymentAdapter`, and a passing browser-test result. Automatic production deployment remains prohibited. Production release authority remains deterministic and outside Vertex.

## Existing Launch Site invariant

The current Launch Site is still the Blueprint's validation-stage microsite with its existing D1 ownership, public slug, publish/unpublish, lead capture, CSV export, proof, and security contracts. This amendment does not replace it.

## Commercial scope intentionally unresolved

The following are not decided by this amendment and must not be invented in code or copy:

- Custom Website upsell price;
- Stripe product/price ID;
- website entitlement rules;
- customer-facing checkout placement;
- persistent website-job schema;
- custom-domain policy;
- production deployment target;
- revision/support entitlement.

Those require a later commercial acceptance decision.

## Outcome protection

All requirements in v2.1.1 and the v2.1.2 Vertex AI platform amendment remain binding unless this v2.1.3 amendment explicitly adds a requirement. The Custom Website capability expands the commercial ladder without weakening the approved GhostTown customer outcome.

**No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived by this capability addition.**
