# GhostTown Launch Blueprint v2.1.13: Spanish for the Fixed Parts of the Sprint

Change ID: `GT-BP-2026-10-20-V2.1.13`
Previous change: `GT-BP-2026-10-20-V2.1.12`
Canonical base: `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (git blob `616c691e6b4c9cea93615963a07375d13ffba57f`, unchanged)

## Product decision

The fixed parts of the Sprint follow the same two languages as the AI-written parts: what the founder reads is in the founder's language, and what the founder sends to buyers is in the buyers' language.

v2.1.12 made the AI stages write in each reader's language. The text that code writes into the Blueprint, the PDF and ZIP headings, and the Sprint screens were still English.

## Rules

1. **The Blueprint records its languages.** `languages` (`founder`, `buyer`) is set only when the order supplied a language, so Blueprints for existing orders are byte-identical to before.
2. **Founder-facing fixed text follows the founder's language.** Lanes, the starting-state audit, evidence levels, the first-revenue path, fulfillment, checkpoints, branches, milestones, decision criteria and the 30 daily packets. The strings live in `src/lib/blueprintFixedCopy.ts` as `Record<Locale, …>` tables.
3. **Buyer-facing fixed text follows the buyers' language.** Interview questions, offer wording, commitment requests and the messages inside founder worksheets.
4. **Exports follow the founder's language.** Document model, HTML, PDF and ZIP headings and labels. ZIP file names, the 16-file manifest, CSV column keys, asset IDs, lineage and completion keys stay unchanged in every language.
5. **Spanish characters survive the PDF.** When a Blueprint has Spanish text, accents and ñ ¿ ¡ are kept (WinAnsi encoding, octal escapes). English PDFs keep the previous path byte for byte.
6. **Validators keep their keys.** Text that the release gate or document validators match stays English in the data; only rendered output changes. The Get Me Live boundary check reads the phrase in the Blueprint's founder language and is not weakened.
7. **Screens follow the site language.** The Sprint dashboard, plan view, Coach, uncertainty panel, website evidence and share screens take the site locale and keep their words in `Record<Locale, …>` objects.

## Not in this amendment

Deterministic buyer templates in the base generator (offer, positioning, scripts, posts, landing copy) remain English when Vertex does not rewrite them; in paid runs the Vertex stages write them in the buyers' language.

## Outcome protection

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment. English output is unchanged.

Weakening approved outcomes remains prohibited.
