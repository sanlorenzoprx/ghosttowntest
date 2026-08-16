# GhostTown Launch Blueprint v2.1.4 — Cloudflare SPA Template Amendment

**Amendment version:** `2.1.4`  
**Decision date:** `2026-08-15`  
**Change identifier:** `GT-BP-2026-08-15-V2.1.4`  
**Base canonical contract:** `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (`2.1.1`, Git blob `616c691e6b4c9cea93615963a07375d13ffba57f`)  
**Previous platform amendment:** `2.1.2` (`GT-BP-2026-08-15-V2.1.2`)  
**Previous Custom Website amendment:** `2.1.3` (`GT-BP-2026-08-15-V2.1.3`)  
**Repository target:** `sanlorenzoprx/ghosttowntest`  
**Preserved implementation path:** PR `#7`, branch `feat/launch-blueprint-spa`

This amendment records an explicit product and implementation decision under the base Blueprint authority clause. It refines the separate Custom Website capability defined in v2.1.3: the manufactured customer website is a React/Vite single-page application designed for Cloudflare, and GhostTown plus MemoriesMyStory become the first two governed template reference models.

This amendment does not change the $97 Launch Blueprint fulfillment contract, does not replace its validation-stage Launch Site, does not authorize automatic production deployment, and does not weaken any existing evidence, ownership, payment, or release requirement.

## Product decision

**Custom Website output is a React/Vite single-page application deployed on Cloudflare. GhostTown and MemoriesMyStory are the first two governed template reference models.**

The website manufacturing sequence is:

```text
ready validated GhostTown Launch Blueprint
        ↓
WebsiteCreationService
        ↓
Vertex structured website plan
        ↓
governed SPA template selection
        ├── ghosttown_conversion
        └── memories_story_editorial
        ↓
truth-critical deterministic normalization
        ↓
deterministic React/Vite SPA source generation
        ↓
Cloudflare SPA routing configuration
        ↓
asset provenance validation
        ↓
browser testing
        ↓
bounded repair loop
        ↓
deployable SPA bundle
        ↓
explicit deployment only
```

## Cloudflare SPA runtime contract

The generated customer website is an application source bundle, not a single generated HTML document.

The deterministic BuildRunner owns these minimum artifacts:

- `package.json`
- `index.html`
- `vite.config.js`
- `wrangler.jsonc`
- `src/main.jsx`
- `src/App.jsx`
- `src/site.js`
- `src/styles.css`
- `site-spec.json`
- `README.md`
- `build-manifest.json`

The runtime contract is:

```text
React
→ Vite production build
→ Cloudflare Workers Static Assets
→ single-page-application fallback
```

Cloudflare routing must explicitly use the SPA fallback contract:

```json
{
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

The generated source may be deployed through an approved `DeploymentAdapter` only after the website passes the required browser tests and deployment has been explicitly authorized. Generated projects may expose a Cloudflare dry-run command, but they must not contain a production auto-deploy path.

## Governed reference templates

The template system extracts reusable product-design patterns from GhostTown and MemoriesMyStory. It does not copy their customer-specific copy, assets, trademarks, data, or business claims into a new customer's site.

### `ghosttown_conversion`

Reference product: GhostTown  
Reference repository: `sanlorenzoprx/ghosttowntest`

Use when the business benefits from a direct commercial decision path such as a validated service, SaaS offer, business tool, professional solution, or other action-oriented purchase.

Governing characteristics:

- one dominant promise and one dominant conversion action;
- high-contrast hero and commercial hierarchy;
- direct problem → solution → proof → price → action pacing;
- strong dark/light section contrast where useful;
- large readable typography and mobile-first CTA prominence;
- explicit evidence and validation-stage proof boundaries;
- conversion clarity without fabricated urgency, proof, or guarantees.

### `memories_story_editorial`

Reference product: MemoriesMyStory  
Reference repository: `sanlorenzoprx/memoriesmystory`

Use when the business benefits from trust, emotion, care, family, legacy, health, personal service, premium service, or story-led persuasion.

Governing characteristics:

- warm editorial pacing and generous whitespace;
- clear shared brand shell and calm navigation;
- serif-led headings with highly readable body text;
- trust, privacy, evidence limits, and next steps as visible product behavior;
- human imagery or provenance-bearing assets when they help comprehension and emotion;
- clear conversion actions without high-pressure presentation;
- narrative progression that helps the customer understand why the offer matters before asking for commitment.

## Template selection contract

Vertex may select exactly one registered template as part of the structured `custom_website` response.

Allowed template IDs are initially:

```text
ghosttown_conversion
memories_story_editorial
```

Template selection is a design/orchestration decision only. It does not give the model authority over:

- price;
- proof;
- testimonials;
- customer counts;
- guarantees;
- business identity;
- legal requirements;
- payment state;
- entitlements;
- deployment;
- production release.

If model selection is absent or invalid, deterministic software selects from the approved registry using the configured style class. Unregistered templates fail closed.

## Deterministic source ownership

Vertex must not emit the authoritative React, HTML, CSS, JavaScript, Cloudflare configuration, or deployment commands.

Vertex owns structured reasoning such as:

- template selection;
- optional registered-section selection;
- visual direction;
- low-risk sales-copy adaptation;
- repair suggestions after browser findings.

Deterministic software owns:

- registered component implementation;
- React application source;
- Vite configuration;
- Cloudflare SPA routing configuration;
- CTA URL sanitization;
- Blueprint-approved pricing;
- proof status and allowed claims;
- business identity;
- legal disclosures;
- asset provenance;
- build manifests and hashes;
- browser acceptance;
- deployment authorization;
- production release.

React rendering must remain the normal escaping boundary for structured content. The generated application must not use `dangerouslySetInnerHTML` for model-authored website copy.

## Blueprint-as-source invariant

The v2.1.3 source invariant remains binding. The website can be manufactured only from a ready Blueprint whose quality gate passed.

The following remain source-controlled by the approved Blueprint and deterministic normalization:

- customer / ICP;
- validated offer and promise;
- painful problem and desired outcome;
- test price and pricing rationale;
- current alternatives and positioning;
- deliverables and exclusions;
- risk reversal;
- allowed proof and proof-to-earn placeholders;
- CTA labels;
- FAQ evidence;
- business identity and contact details;
- required legal flags.

A template changes presentation and pacing. It does not change business truth.

## Relationship to the $97 Launch Site

The existing Blueprint Launch Site remains the validation-stage microsite already included in the $97 product.

The Custom Website remains a separate post-Blueprint product capability.

```text
FREE GhostTown Verdict
        ↓
$97 Launch Blueprint + validation-stage Launch Site
        ↓
optional Custom Website Cloudflare SPA
        ↓
Story Studio acquisition engine
        ↓
ACS operating / optimization layer
```

No website SKU, price, entitlement, custom-domain policy, revision entitlement, support promise, or production deployment target is created by this amendment. Those require separate explicit commercial decisions.

## Acceptance requirements

The Custom Website SPA capability is not production-accepted until evidence proves:

1. a ready quality-passed Blueprint is the source;
2. exactly one approved template ID is selected;
3. the generated source bundle contains the required React/Vite/Cloudflare artifacts;
4. Cloudflare configuration uses the SPA fallback contract;
5. pricing, proof, CTA, identity, FAQ, and legal values remain Blueprint-authoritative;
6. unregistered components/templates fail closed;
7. asset provenance is validated;
8. model-authored copy is not executed as arbitrary markup or script;
9. browser tests cover the approved viewport set and return no blocker/high findings;
10. any repair loop is bounded and receipt-backed;
11. deployment occurs only through an explicit DeploymentAdapter decision;
12. `productionAutoDeploy` remains `false`.

## Outcome protection

No commercial, evidence, safety, ownership, fulfillment, or release requirement is waived by this amendment.

The base canonical Blueprint remains authoritative. The v2.1.2 generative-AI platform amendment remains binding. The v2.1.3 Custom Website product separation remains binding.

Any future template, runtime, checkout, domain, or deployment expansion must preserve the approved customer outcome and follow the same versioned source update, explicit change record, regenerated evidence chain, and acceptance process.
