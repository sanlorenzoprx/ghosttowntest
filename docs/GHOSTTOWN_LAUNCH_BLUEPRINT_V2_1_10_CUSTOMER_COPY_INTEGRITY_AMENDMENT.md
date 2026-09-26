# GhostTown Launch Blueprint v2.1.10 - Customer Copy Integrity Amendment

**Amendment version:** `2.1.10`
**Change ID:** `GT-BP-2026-09-26-V2.1.10`
**Base canonical contract:** `2.1.1`
**Predecessor amendment:** `2.1.9`

## Product decision

GhostTown must preserve **source meaning**, not accidental surface errors.

> **Source meaning is authoritative. Customer-facing wording is editable.**

Obvious spelling, grammar, punctuation, readability, and audience-fit defects must be corrected before a paid Sprint is released. GhostTown must not preserve a misspelling merely because the founder typed it.

Obvious misspellings of words such as `requirement`, `memory`, and `caregiver` are corrected before they reach customer-facing copy.

This does not authorize changing technical identifiers, URLs, hashes, source IDs, schema fields, prices, dates, counts, evidence, commitments, claims, or strategy.

## 1. Reusable grammar versus reusable copy

GhostTown may reuse stable validation principles such as:

- observed behavior is stronger evidence than stated interest;
- ask about the most recent real occurrence;
- record the current workaround;
- define an observable commitment;
- change one supported variable at a time.

Those are **system grammar**.

Customer-facing copy is different. Posts, outreach, interview questions, landing-page copy, rejection messages, thank-you copy, and offer-conversation language must be semantically rewritten for the actual:

- customer;
- problem;
- buyer/payer;
- current alternative;
- offer;
- channel; and
- business-model lane.

A reusable validation structure must not leak generic wording into unrelated businesses.

## 2. Audience-fit rule

Customer-facing language must match the actual buyer.

For a consumer product, GhostTown may not inject unsupported B2B language such as:

- "your team";
- "your company";
- "your organization";
- "your department";
- "your staff";
- "your workflow";
- "at work".

Those phrases may be used only when the supplied buyer context actually supports an organizational buyer.

The SureDose-style question:

> "When did this last affect your work, and what did your team use to catch it?"

is therefore invalid for an individual medication-user conversation unless the validated buyer context is explicitly organizational.

## 3. Final customer-copy editor

The production Vertex pipeline advances to:

`vertex-blueprint-staged-v3`

Required order:

1. `evidence_normalization`
2. `strategy_synthesis`
3. `strategic_coherence_gate`
4. `asset_generation`
5. `customer_copy_edit`
6. `red_team_review`

The editor runs after business-specific asset generation and before independent red-team review.

The editor may rewrite only surface copy. It may correct:

- spelling;
- grammar;
- punctuation;
- awkward phrasing;
- unnecessary jargon;
- excessive sentence complexity;
- generic template wording; and
- audience-mismatched language.

It may not change:

- facts;
- evidence;
- promises;
- prices;
- dates;
- counts;
- thresholds;
- URLs;
- emails;
- source or channel IDs;
- day numbers;
- estimated minutes;
- business strategy; or
- the schema shape.

## 4. Readability target

English customer-facing copy should aim for approximately **8th-grade comprehension**.

The editor prompt requires:

- short sentences;
- concrete words;
- direct questions;
- minimal jargon; and
- business-specific language.

A deterministic readability estimate acts as a fail-closed release guard at grade 10 or lower. The wider threshold is intentional because readability formulas are approximate; the model target remains grade 8.

Spanish and other localized copy must be assessed by language-appropriate editing rather than an English syllable formula.

## 5. Protected-token guard

The copy editor must preserve all protected surface tokens, including:

- prices and currency amounts;
- percentages;
- dates and counts;
- URLs;
- email addresses; and
- numeric execution constraints.

If the protected-token fingerprint changes, the copy edit fails closed.

Daily estimated minutes must also remain unchanged.

## 6. Deterministic spelling normalization

The deterministic generator also normalizes obvious customer-facing misspellings before composing fallback copy.

This prevents a local/test or explicitly non-Vertex path from propagating known spelling errors into customer artifacts.

The spelling normalization is intentionally applied to display/copy fields. Technical identifiers and route keys remain protected unless a separate migration explicitly changes them.

## 7. Generic-template leakage protection

The known generic resource block beginning:

> "Use this before buying or building a larger solution..."

is removed from deterministic generation.

The replacement uses the actual target customer and problem.

The final copy editor also blocks this known phrase if it reappears.

The correct rule is:

> **Reuse the validation method. Rewrite the customer language.**

## 8. Temporary repository language wrapper

For a short cleanup period, repository type-check, test, build, and Worker checks run a temporary language-quality wrapper.

The wrapper:

- scans tracked text;
- blocks known obvious misspellings;
- does not rewrite code identifiers automatically; and
- carries a review/removal date of **2026-10-10**.

A one-time broader spell scan was also run across tracked docs/source/tests/scripts. After excluding legitimate Spanish terms and code symbols, it returned no remaining obvious static-repository spelling errors.

The temporary wrapper may be removed after the cleanup window only if the generation-time customer-copy editor and its regression tests remain protected.

## 9. Historical falsification

The paid Sprint review found two confirmed failure classes:

### Template leakage

Two unrelated Sprints contained many identical long customer-facing blocks. The issue was not reusable validation principles; it was insufficient semantic rewriting.

### Founder typo propagation

SureDose founder input included obvious misspellings of `requirement`, `memory`, and `caregiver`. Those errors propagated into polished customer artifacts instead of being corrected.

Under v2.1.10, those misspellings are corrected on customer-facing surfaces while the intended meaning remains unchanged.

## 10. Preserved boundaries

This amendment does not:

- erase evidence provenance;
- change historical stored artifacts in place;
- authorize changing a founder's intended meaning;
- authorize changing claims, price, evidence, dates, thresholds, IDs, or URLs during copy editing;
- weaken the Strategic Coherence Gate;
- weaken research-role separation;
- weaken evidence-recency requirements;
- change the $97 Sprint price;
- change the Free Verdict -> Sprint -> Get Me Live journey;
- authorize production deployment; or
- change the canonical base Blueprint blob.

**Source meaning is authoritative. Surface wording must be corrected when it is obviously wrong, generic, unreadable, or mismatched to the customer.**
