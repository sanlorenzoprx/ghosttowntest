# GhostTown Custom Website Creation Capability Contract

> **CURRENT COMMERCIAL SCOPE — supersedes older Launch Site wording in this document**
>
> The active customer ladder is **Free Verdict → $97 30-Day Sprint → $297 Get Me Live**.
> The $97 Sprint does **not** include a live website, domain, publishing, or payment setup.
> Get Me Live is the separate $297 one-time implementation product. Older Launch Site language below is retained only where it documents historical implementation architecture or acceptance work.


**Status:** implementation contract  
**Product position:** optional post-Blueprint upsell  
**Production auto-deploy:** prohibited  
**Website upsell price:** intentionally not defined by this contract

## Purpose

GhostTown's $97 Launch Blueprint is not the endpoint of the customer journey. Once GhostTown has validated what should exist and the Launch Blueprint has established the offer, customer, positioning, evidence rules, launch plan, and validation-stage Launch Site, GhostTown may manufacture a separate custom customer-facing website.

The custom website is a **separate product capability**. It must not be folded into paid Blueprint generation, and the existing validation-stage Launch Site remains part of the $97 Blueprint contract.

## Runtime boundary

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

`WebsiteCreationService` owns the product workflow. `GenerativeAIService` remains the one model-inference boundary and exposes a dedicated `custom_website` task slot. Cloudflare remains the application, storage, workflow, payment, acceptance, and release platform.

## Manufacturing workflow

```text
validated GhostTown opportunity
        ↓
ready $97 Launch Blueprint
        ↓
website source contract check
        ↓
structured website brief/specification
        ↓
component selection from registry
        ↓
deterministic truth-critical normalization
        ↓
deterministic static build
        ↓
browser test adapter
        ↓
bounded AI repair loop when blocking findings exist
        ↓
passing deployable build
        ↓
explicit DeploymentAdapter invocation only
```

The default outcome is a deployable build, **not an automatically published production site**.

## Vertex responsibilities

Vertex may:

- choose a style preset;
- choose optional registered page components;
- adapt low-risk positioning and sales copy from the approved Blueprint;
- organize the customer story;
- produce a structured website specification;
- review browser-test findings supplied to the repair loop;
- propose a repaired structured specification.

Vertex may not become authoritative for pricing, proof, checkout state, payment state, account ownership, legal flags, source evidence, component registration, build hashes, browser pass/fail, deployment, or production release.

## Controlled component registry

The initial registry is:

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

The model selects from these IDs. It does not emit arbitrary executable HTML, CSS, JavaScript, React, or framework source code. Deterministic software renders the registered components into a build artifact.

This provides customization without allowing a model to create unbounded application code.

## Truth-critical normalization

The following values are always reconstructed from the approved Launch Blueprint after the model call:

- business identity;
- validation-stage status;
- approved test price;
- risk reversal;
- proof claims and proof placeholders;
- FAQ evidence already in the Blueprint;
- primary and secondary CTA labels;
- legal/disclaimer requirements;
- contact identity;
- current-alternative comparison inputs.

A model-authored testimonial, customer count, award, guarantee, market statistic, new price, or proof claim cannot become customer-facing merely because the model generated it.

## Build system

`WebsiteBuildRunner` is deterministic. It:

- validates the component contract;
- escapes all model-authored text before rendering;
- restricts action URLs to safe `https:`, `mailto:`, `tel:`, or in-page anchors;
- renders from fixed style presets and component templates;
- creates `index.html`, `site-spec.json`, and `build-manifest.json`;
- SHA-256 hashes every build file and the canonical site specification.

## Browser testing and repair

Browser testing is an adapter boundary so Playwright or another approved renderer can run outside the model. The tester returns machine-readable findings with severity, viewport, message, and optional screenshot reference.

Blocking/high findings may trigger a bounded repair loop. The default maximum is two repairs and the hard maximum is three. A repair is another `custom_website` structured-model call; it cannot weaken the source Blueprint truth contract.

## Deployment

Deployment requires all of the following:

1. the caller explicitly sets deployment intent;
2. a `DeploymentAdapter` is supplied;
3. browser testing has run;
4. the latest browser-test result passes.

No custom website code path may silently deploy to GhostTown production. Production release remains controlled outside the model.

## Commercial ladder

The intended ladder is:

```text
FREE GhostTown Verdict
        ↓
$97 30-Day Launch Blueprint
        ↓
optional Custom Website upsell
        ↓
Story Studio acquisition engine
        ↓
ongoing ACS operating/optimization layer
```

The website upsell price, checkout product, entitlement, persistence schema, and production deployment target require separate commercial acceptance before customer launch. This capability contract does not invent those decisions.

## Existing Launch Site boundary

The existing Blueprint Launch Site remains the validation-stage microsite included in the Blueprint product. It is not renamed, replaced, or silently upgraded into the Custom Website upsell. Its current ownership, proof, lead, publish/unpublish, D1, and acceptance contracts remain unchanged.
