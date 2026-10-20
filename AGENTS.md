# Working in this repository

Rules for every contributor and coding agent (Claude Code, Codex, Cursor and people).

## Languages: English and Spanish

GhostTown serves English and Spanish speakers. Puerto Rico is home, and Spanish is an official language there.

**Every customer-facing UI component must work in English and Spanish.** That includes new components and new text added to an existing component.

How to do it:

1. **Take a locale.** The component accepts `locale?: Locale` (from `src/lib/locale.ts`), defaulting to `'en'`. Pass the app's locale down from `src/app/App.tsx`.
2. **Keep the words in one typed object.** Put all the component's words in `const COPY: Record<Locale, …> = { en: {…}, es: {…} }`. TypeScript then fails the build if one language is missing a string. Examples: `src/components/CommunityResearchCards.tsx`, `src/components/LegalPage.tsx`, `src/components/AboutPage.tsx`.
3. **Write Spanish, not a word-for-word translation.** Use the informal *tú* form, plain words, and Puerto Rico–friendly Spanish. Keep prices, dates, product names (First 30, Year Squared, GhostTown) and URLs identical.
4. **Shared offer copy lives in data.** Offer, price and legal text keep `en` and `es` side by side in `src/lib` (`ghosttownOffer.ts`, `legalPages.ts` / `legalPagesEs.ts`), so one change updates every surface.
5. **Generated content follows the customer's language.** When AI writes for a customer (verdicts, Blueprints, posts, messages), pass the customer's locale into the prompt so it writes in that language. Do not translate generated content after the fact.
6. **Legal pages:** the English version prevails; the Spanish page says so.
7. **Test both.** Add at least one Spanish render assertion for a new component.

`tests/bilingualComponents.test.ts` fails when a new component in `src/components` has no Spanish. Older components that predate this rule are listed there; that list may only shrink. Owner-only consoles are exempt.

## Explain why it matters

Everything GhostTown tells a founder carries its "why": research findings, Coach answers, the First 30 days and Year Squared. A fact without the why is worthless to someone who does not know the subject.

- For each finding, number or step, add one or two plain sentences: what it means for their business and what they can do with it.
- Assume they do not know the subject. A short example from their own business beats a definition.
- Natural and brief, never a lecture.
- When the topic is new or technical, end with one short offer to explain more.

Every AI prompt that writes for a founder includes `EXPLAIN_WHY_INSTRUCTION` from `src/lib/explainWhy.ts`, and every finding shown to a founder has a `whyItMatters` field that the UI shows. Community research and the Execution Coach follow this today; the verdict and the Blueprint strategy stages are next.

## Copy

- Plain words, about 8th-grade reading level, in both languages.
- Never promise income or results. Say what GhostTown does, not what the customer will earn.
- Say "places where your likely customers are already talking", never "where most of your niche gathers".
- Customer quotes are never presented as testimonials.

## Contract changes

The paid Blueprint is governed by a hash-verified contract chain (`npm run verify:blueprint`). A change to what the Blueprint promises or produces needs a new amendment version, a change record, and regenerated evidence. See `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_11_COMMUNITY_PROBLEM_RESEARCH_AMENDMENT.md` for the latest example.

## Before you push

Run `npm run type-check`, `npm run test:fast` and `npm run build`. Run `npm run test:workers-runtime` when Worker code changes.
