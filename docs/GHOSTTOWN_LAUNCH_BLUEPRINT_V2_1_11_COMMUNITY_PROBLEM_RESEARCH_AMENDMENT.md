# GhostTown Launch Blueprint v2.1.11: Community Problem Research Amendment

Change ID: `GT-BP-2026-10-20-V2.1.11`
Previous change: `GT-BP-2026-09-26-V2.1.10`
Canonical base: `docs/GHOSTTOWN_LAUNCH_BLUEPRINT_CANONICAL_CONTRACT_BUILD_SPEC_V2_1.md` (git blob `616c691e6b4c9cea93615963a07375d13ffba57f`, unchanged)
Product plan: `docs/FIRST_30_CUSTOMER_RESEARCH_LOOP.md`

## Product decision

GhostTown reads the communities it found and keeps customer problems only in the customers' own words, linked to the page they came from.

Customer-access research (v2.1.8, v2.1.9) finds public places where likely buyers talk. Until this amendment, GhostTown checked that each place was relevant and current but did not read what people said there. The founder received a list of places and generic messages.

From v2.1.11, the paid Sprint also tells the founder:

- what likely customers struggle with, in their own words, with a link to each quote;
- why each problem matters to their business, in one or two plain sentences;
- what argues against each problem;
- how each community talks, what format fits, and whether promotion is allowed;
- what to ask next, what GhostTown prepared, and what would change the plan;
- which pages GhostTown could not read.

The posts, outreach messages and landing-page copy are generated from those problems and that customer language.

## Rules

1. **Quotes are copied word for word.** A quote is kept only if, after normalizing whitespace, case and typographic punctuation, it appears in the text of the page it links to. A paraphrase, merged quote or translated quote is rejected by deterministic software, not by the model.
2. **A repeated quote counts once.** Reposts and repeated comments do not confirm each other.
3. **Evidence against a problem is kept.** Quotes that contradict a problem are shown beside it.
4. **A problem needs at least one supporting quote.** A problem with only contradicting evidence, or none, is dropped.
5. **Strength is described, not inflated.** Each problem is labeled `one_mention`, `repeated_in_one_place` or `seen_in_several_places`. GhostTown never says "most of your niche" or "proven demand".
6. **Public discussion is problem evidence at most.** Every problem carries `evidenceLevel = problem_evidence`. Commitments, payments, delivery, repeat use and referrals are recorded separately during the Sprint and are never inferred from community research.
7. **Only current customer-access communities are read.** Targets must have `evidenceRole = customer_access` and `currentActivityStatus = verified_current`, at most six per Sprint. Market evidence, media/PR and partnership targets are not read as customer voices.
8. **Unread pages are visible.** A page that cannot be read, or that yields no checkable quote, becomes a research gap shown to the founder. Missing research is never shown as silence or as a finding.
9. **Quotes are never testimonials.** Generated posts, messages and landing-page copy may use the problems and customer language; they may not present a quote as an endorsement, review, testimonial or result.
10. **Every problem explains why it matters.** Each problem carries `whyItMatters`: one or two plain sentences, for a founder new to the subject, on what it means for their business. Brief, never a lecture. The prompt includes the shared `EXPLAIN_WHY_INSTRUCTION`, which the Coach also uses.
11. **"What we prepared" opens the work.** The dashboard shows the interview guide, the first message for that community and the post written for it, ready to copy. A list of tasks is not prepared work.

## Pipeline

The paid Sprint workflow adds one durable step after customer-access research is finalized and before the canonical draft is built:

`read customer communities and keep source-linked problems`

Its result is stored in the canonical Blueprint as `communityResearch` (`ghosttown-community-problem-research-v1`). The asset-generation stage receives the problems, customer words and community rules as `customerResearch`. The pipeline order of v2.1.10 is otherwise unchanged.

## Surfaces

- Dashboard, Research & Access tab: one card per problem, the research boundary, and research gaps.
- PDF (document model): a `customer_problems` supporting section.
- ZIP: the problems lead `helpful-posts.md`. The 16-file package manifest is unchanged.
- `blueprint.json` carries the full record.

A Blueprint created before v2.1.11 has no `communityResearch` and renders exactly as before.

## Outcome protection

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment. The three-current-customer-access-target release requirement of v2.1.8 and the recency rules of v2.1.9 remain in force.

Weakening approved outcomes remains prohibited.
