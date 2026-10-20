# GhostTown Launch Blueprint v2.1.12: Founder and Buyer Language, and Why It Matters

Change ID: `GT-BP-2026-10-20-V2.1.12`
Previous change: `GT-BP-2026-10-20-V2.1.11`
Canonical base: `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (git blob `616c691e6b4c9cea93615963a07375d13ffba57f`, unchanged)

## Product decision

A Sprint has two languages: the one the founder reads the plan in, and the one their buyers read. Each is written natively in its own language, never translated afterwards. Everything the founder reads explains why it matters.

A founder in San Juan may read the plan in Spanish and sell to English-speaking buyers, or the reverse. Translating an English plan would produce outreach in the wrong language for some founders and stiff, translated copy for the rest.

## Rules

1. **Two languages, chosen by the founder.** The Sprint intake records `founderLanguage` and `buyerLanguage` (`en` or `es`). Missing values default to English, so existing orders behave exactly as before.
2. **Founder-facing text follows the founder's language.** Decisions, daily actions, why it matters, guidance, checkpoints and fulfillment notes.
3. **Buyer-facing text follows the buyer's language.** Posts, outreach messages, interview and offer questions, landing-page copy and emails, written natively for that audience.
4. **Facts never change with language.** Product names, prices, dates, counts, URLs and IDs stay exactly as given. Customer quotes stay in their original words.
5. **Research follows the buyer.** When buyers speak Spanish, the customer-access search prefers Spanish-language communities, including Puerto Rico and Latin American ones. Community findings are written in the founder's language; quotes stay as written.
6. **Every step explains why it matters.** The strategy, asset, copy-edit and community research stages include the shared `EXPLAIN_WHY_FOR_DOCUMENTS` instruction: a brief, plain why for each finding or step, written for a founder new to the subject, never a lecture. The Execution Coach uses the conversational variant, which may offer to explain more, and answers in the language the founder writes in.
7. **Wrong language is a defect.** The red-team review treats text in the wrong language for its reader as a consistency defect.
8. **Readability guard.** The English grade-level guard runs only when both languages are English. Spanish copy is held to the same plain reading level by instruction.

The starting-state audit records both languages as verified founder input.

## Not in this amendment

The dashboard labels, PDF headings and fixed deterministic sections of the paid Sprint remain English until the Sprint dashboard is translated.

## Outcome protection

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment. The v2.1.7 through v2.1.11 decisions remain in force.

Weakening approved outcomes remains prohibited.
