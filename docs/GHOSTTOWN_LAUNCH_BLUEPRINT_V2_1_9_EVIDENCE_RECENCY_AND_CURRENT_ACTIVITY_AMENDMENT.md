# GhostTown Launch Blueprint v2.1.9 - Evidence Recency and Current-Activity Integrity Amendment

**Amendment version:** `2.1.9`
**Change ID:** `GT-BP-2026-09-26-V2.1.9`
**Base canonical contract:** `2.1.1`
**Predecessor amendment:** `2.1.8`

## Product decision

GhostTown must never treat the date research was performed as proof that the underlying evidence, publication, event, community, creator, or acquisition route is current.

Three clocks are authoritative and must remain separate:

1. **Research/access date** - when GhostTown retrieved or inspected the source.
2. **Evidence date** - when the underlying article, event, post, video, feed update, or other observable evidence occurred.
3. **Current-activity verification** - when GhostTown independently established that a channel is active and practically reachable now.

A source accessed in September 2026 can still be evidence from 2015, 2018, 2022, or 2025. Accessing it now does not refresh the underlying event.

## 1. Mandatory recency metadata

Every newly generated researched target must carry:

- `researchDate`
- `evidenceDate` when observable
- `evidenceDateSource`
- `evidenceRecency`
- `currentActivityStatus`
- `currentActivityVerifiedAt` when activity was independently checked
- `currentActivityEvidence`
- `confidence`

Every newly generated research source must carry:

- `accessedAt`
- `evidenceDate` when observable
- `evidenceDateSource`
- `evidenceRecency`

Historical Blueprint records remain readable. Missing historical fields render as `unknown` / `unverified`; they are not silently backfilled as current.

## 2. Recency classifications

The deterministic initial policy is:

| Evidence age | evidenceRecency |
| --- | --- |
| 0-90 days | current |
| 91-365 days | recent |
| over 365 days | stale |
| no usable evidence date | unknown |

For present-day acquisition eligibility, current activity must be supported by an observable activity date no older than 120 days.

These thresholds are policy constants, not model judgments. They can be versioned later without changing the separation between the three clocks.

## 3. Confidence does not mean current

`confidence` describes confidence in the evidence claim or provider observation.

It does **not** mean:

- the publication is still active;
- the event still occurs;
- the person or organization is currently reachable;
- the community currently permits participation;
- the channel is a present-day acquisition opportunity.

Customer-facing surfaces therefore label this field **Evidence confidence**.

Current reachability is represented separately by `currentActivityStatus`.

## 4. Provider rules

### DataForSEO backlinks

A recently observed backlink proves that the backlink is observable. It does not prove the referring publication, event, organization, or author is currently active.

Therefore:

- backlink `last_seen` may be retained as backlink evidence;
- page publication/event date is used when observable;
- current activity remains `unverified` unless a separate current-activity signal exists;
- a backlink source cannot become a current acquisition target merely because DataForSEO saw the link recently.

### Podcast Index

The feed's last-update time is an observable activity signal.

GhostTown may classify the podcast as currently active only when that update falls inside the current-activity window.

### YouTube

The matching video's publication timestamp is the activity signal used for the discovered creator.

The research date cannot substitute for the video's publication date.

### Grounded customer-access search

A public community/discussion page must expose a dated activity signal inside the current-activity window before it can count toward the minimum direct customer-access requirement.

A reachable page with no dated recent activity remains useful supporting evidence but is not a current first-revenue route.

## 5. Current customer-access eligibility

v2.1.8 required at least three `customer_access` targets.

v2.1.9 tightens that rule: at least three targets must be both:

- classified as `customer_access`; and
- `currentActivityStatus = verified_current` with `currentActivityVerifiedAt` recorded.

Only those currently verified customer-access targets may drive:

- `firstRevenuePath.firstChannel`;
- the 48-Hour Launch Card approaches;
- Strategic Coherence Gate `access_path` references; and
- direct buyer-acquisition prioritization.

If the role is correct but current activity is stale, inactive, unknown, or unverified, the Sprint fails closed for direct acquisition.

## 6. Release blockers

The release gate adds:

- `RESEARCH_MISSING_EVIDENCE_RECENCY_METADATA`
- `RESEARCH_INCONSISTENT_CURRENT_ACTIVITY_CLAIM`

The existing `RESEARCH_FEWER_THAN_THREE_CUSTOMER_ACCESS_TARGETS` now counts only currently verified customer-access targets.

A channel cannot be labeled `recent` or `active` while `currentActivityStatus` is anything other than `verified_current`.

## 7. Recovery behavior

If model selection fails or invents an unknown candidate ID, deterministic recovery must not allow higher-scoring media or market-evidence candidates to crowd out the minimum buyer-access requirement.

Recovery therefore:

1. verifies that at least three currently verified customer-access candidates exist;
2. reserves those buyer-access candidates first; and
3. fills the remaining target set by deterministic score.

If three currently verified customer-access candidates do not exist, recovery fails closed.

## 8. Customer-facing presentation

Dashboard, PDF, semantic document model, and ZIP research CSV must expose the distinction directly.

For each target, show:

- **Evidence dated**
- **Evidence recency**
- **Research checked**
- **Current activity**
- **Current activity verification**
- **Current activity evidence**
- **Evidence confidence**

The customer should be able to see immediately that, for example, a 2015 article inspected in 2026 is old evidence rather than a 2026 acquisition route.

## 9. Historical falsification: SureDose

The saved SureDose Sprint exposed the defect clearly:

- CES 2022 material was still useful as historical/category evidence.
- A 2018 conference article was presented as recent/high-confidence.
- A 2015 Dosecast article was presented as active/high-confidence.
- A HIMSS 2025 page was accessed during 2026 research.

The error was not that old sources existed. Old sources can remain valuable competitor, category, or historical evidence.

The error was allowing **research/access date** or a recently observed backlink to stand in for **underlying evidence date** and **current channel activity**.

Under v2.1.9:

- old sources remain in their correct evidence roles when useful;
- stale or unknown evidence is labeled truthfully;
- current activity requires separate proof; and
- stale evidence cannot satisfy the current customer-access minimum.

## 10. Preserved boundaries

This amendment does not:

- delete old evidence merely because it is old;
- equate evidence age with evidence quality;
- claim that a currently active community contains qualified buyers;
- authorize unsolicited mass outreach;
- change the $97 Sprint price;
- change the Free Verdict -> Sprint -> Get Me Live customer journey;
- change the canonical base Blueprint blob;
- add a new infrastructure provider; or
- weaken v2.1.8 research-role separation or v2.1.7 Strategic Coherence Gate behavior.

**Research date tells us when GhostTown looked. Evidence date tells us when the thing happened. Current-activity verification tells us whether the route is usable now. Never collapse those three facts.**
