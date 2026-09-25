# GhostTown Functional Discovery Keyword Research v2

Date: 2026-09-25
Branch: feat/functional-discovery-bilingual-v2

## Decision

Use 100 high-intent long-tail candidate queries as research input: 50 English and 50 Spanish.
Do not create one page per keyword. Cluster queries by the decision the user is trying to make, then give each distinct intent one useful GhostTown door backed by the canonical `POST /api/v1/free-verdict`.

The current corpus resolves to 20 semantic intents and 40 localized routes (20 EN + 20 ES). The original ten English discovery doors are preserved.

## Evidence boundary

The corpus is language- and intent-researched, not volume-ranked.
Current evidence supports recurring search language around:
- validating an idea before building or investing;
- testing demand before development;
- willingness to pay / real commitment;
- low-cost or no-budget validation;
- first customer / pre-sell before building;
- category-specific validation for SaaS, AI, apps, ecommerce, services, local businesses and side hustles.

Search volume, CPC and keyword difficulty are UNKNOWN until a quantitative keyword provider is attached. Do not label this corpus "top 50 by volume" without that data.

## Sample current SERP evidence
- EN: Exponentially — "How to validate a business idea before you build it": https://www.exponentially.com/how-to-validate-a-business-idea
- EN: LaunchValid — "How to validate a business idea before you build": https://launchvalid.com/guides/validate-a-business-idea
- EN: DemandProof — "How to test business demand before launching": https://www.demandproofhq.com/blog/how-to-test-business-demand
- ES: LibroEmprendedor — "Cómo validar una idea de negocio antes de gastar dinero": https://www.librosemprendedor.com/articulos/como-validar-una-idea-de-negocio-antes-de-gastar-dinero
- ES: Calltek — "Cómo validar una idea de app antes de desarrollarla": https://calltek.es/como-validar-una-idea-de-app-antes-de-desarrollarla/
- ES: Shopify — "Cómo validar una idea de negocio": https://www.shopify.com/es/blog/validar-idea-de-negocio

## Expansion rule

A keyword is not a door. A distinct customer decision intent is a door.

Add or split an intent only when evidence shows a materially different question, buyer context, or conversion behavior. Merge synonyms and near-duplicates into the existing intent. Retire weak routes rather than accumulating pages.

## Measurement rule

Every localized route preserves `intent_id` plus source, campaign, platform, creative and publication lineage through the secure handoff. Evaluate routes on verdict starts, verdict completions, paid Sprint/Get Me Live continuation and revenue—not impressions alone.

## Next quantitative research

When Google Keyword Planner, DataForSEO, or another trusted volume source is available, enrich each candidate with locale/market, monthly volume, CPC, competition/difficulty, trend and source timestamp. Re-rank within each intent; do not rebuild the verdict or discovery architecture.
