# GhostTown Launch Blueprint v2.1.4 Change Record

**Change ID:** `GT-BP-2026-08-15-V2.1.4`  
**Date:** `2026-08-15`  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Branch:** `feat/launch-blueprint-spa`  
**PR:** `#7`  
**Base canonical version:** `2.1.1`  
**Platform amendment:** `2.1.2`  
**Previous Custom Website amendment:** `2.1.3`  
**Amendment version:** `2.1.4`

## Explicit product decision

Custom Website output is standardized as a React/Vite single-page application for Cloudflare.

The first two governed template reference models are:

```text
ghosttown_conversion
memories_story_editorial
```

GhostTown provides the conversion-first reference model. MemoriesMyStory provides the warm editorial / trust-first reference model.

These are reusable design-system and information-architecture references, not customer-content clones.

## Why

The v2.1.3 capability correctly separated Custom Website manufacturing from the $97 Blueprint, but its initial deterministic BuildRunner produced a static HTML artifact. The approved customer product is a real SPA on Cloudflare.

The change therefore upgrades the manufacturing contract from:

```text
structured website spec
→ deterministic static HTML
```

to:

```text
structured website spec
→ governed reference template
→ deterministic React/Vite SPA source
→ Cloudflare SPA configuration
→ browser acceptance
→ explicit deployment
```

This aligns the generated product with the same application class already proven in GhostTown and MemoriesMyStory while keeping generative model authority constrained.

## Implementation consequences

1. Add a governed `WebsiteTemplateId` contract.
2. Add a `WebsiteTemplateRegistry` with `ghosttown_conversion` and `memories_story_editorial`.
3. Require the `custom_website` structured plan to select an approved template.
4. Keep deterministic fallback selection for absent/invalid template output.
5. Generate a React/Vite application source bundle rather than a one-file website.
6. Generate Cloudflare configuration with `assets.directory = "./dist"` and `assets.not_found_handling = "single-page-application"`.
7. Keep all source code and Cloudflare configuration deterministic.
8. Keep Vertex limited to structured template/component/copy/visual-direction reasoning.
9. Preserve Blueprint-authoritative price, proof, CTA, identity, FAQ, positioning, and legal values.
10. Preserve the existing ComponentRegistry, BrandSystem, AssetGenerator, BrowserTester, DeploymentAdapter, and receipt boundaries.
11. Record the chosen template and `cloudflare_spa` runtime in build and creation receipts.
12. Keep production auto-deploy disabled.

## Reference-model extraction

### GhostTown

Reusable patterns extracted from the GhostTown application include:

- conversion-first hero hierarchy;
- high-contrast dark/light pacing;
- direct commercial language;
- visible evidence/proof boundaries;
- large mobile-first CTA hierarchy;
- problem → decision → proof → offer flow.

### MemoriesMyStory

Reusable patterns extracted from MemoriesMyStory include:

- shared brand shell;
- editorial serif-led presentation;
- warm neutral/navy/gold visual language;
- story-led pacing;
- privacy/trust as visible product behavior;
- clear but lower-pressure conversion moments.

No GhostTown or MemoriesMyStory customer-specific copy, product claims, user data, proprietary customer assets, or transaction state becomes part of another customer's generated site.

## Preserved boundaries

This change does not alter:

- the $97 Launch Blueprint product;
- the validation-stage Launch Site included with the Blueprint;
- the v2.1.2 Vertex + Cloudflare AI Gateway architecture;
- the v2.1.3 separation of Custom Website as a post-Blueprint capability;
- Stripe fulfillment rules;
- ownership and account-recovery rules;
- provider-backed evidence requirements;
- truth labels;
- deterministic validation and fail-closed behavior;
- browser acceptance;
- the prohibition on automatic production release.

The Custom Website price/SKU, purchase entitlement, website-job persistence, custom-domain policy, revision/support entitlement, and production deployment target remain undecided.

**Weakening approved outcomes remains prohibited.**
