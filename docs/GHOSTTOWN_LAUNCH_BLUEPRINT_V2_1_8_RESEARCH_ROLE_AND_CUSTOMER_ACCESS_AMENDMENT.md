# GhostTown Launch Blueprint v2.1.8 - Research Role and Customer Access Amendment

**Amendment version:** `2.1.8`
**Change ID:** `GT-BP-2026-09-26-V2.1.8`
**Base canonical contract:** `2.1.1`
**Predecessor amendment:** `2.1.7`

## Product decision

GhostTown must distinguish **market evidence**, **direct customer access**, **media / PR opportunities**, and **partnership opportunities** before any researched target can influence first-revenue execution.

A source that proves the market exists is not automatically a place to sell. A creator with the right audience is not automatically buyer access. A backlink is not automatically a sales channel. A partnership target is not automatically a customer.

The paid Sprint must answer two different questions separately:

1. **What evidence helps us understand this market?**
2. **Where can the founder practically reach the intended buyer/payer for a direct conversation or commercial test?**

## 1. Four mandatory research roles

Every retained research target has exactly one evidence role:

- `customer_access` - a public discussion/community route where prospective buyers may be approached directly.
- `market_evidence` - competitors, alternatives, reviews, comparison evidence, and category behavior.
- `media_pr` - creators, podcasts, publications, events, interviews, reviews, guest content, and awareness opportunities.
- `partnership` - associations, referral relationships, complementary products, and other ecosystem partners.

Target type and evidence role are related but not interchangeable.

The default deterministic mapping is:

| Target type | Evidence role |
| --- | --- |
| community | customer_access |
| review_site | market_evidence |
| podcast | media_pr |
| youtube_creator | media_pr |
| newsletter_or_publication | media_pr |
| event | media_pr |
| association | partnership |
| complementary_partner | partnership |

The model may rank or explain candidates, but it may not relabel a media, market, or partner candidate as a community merely to make it eligible for first revenue.

## 2. Dedicated customer-access discovery

Competitor backlinks, podcasts, and YouTube remain useful evidence providers, but they are not sufficient customer-access research.

The research plan must separately search for public buyer discussion surfaces using grounded Google Search through the existing Vertex / AI Gateway path.

Customer-access discovery must prioritize:

- public forums
- discussion communities
- support communities
- message boards
- public groups
- question/discussion pages

It must exclude generic articles, podcasts, creator channels, directories, vendor pages, conferences, and associations from direct-customer-access classification unless the returned source itself is a public buyer discussion/community surface.

This amendment adds no new infrastructure provider. It reuses the existing grounded Vertex capability.

## 3. Minimum direct-access requirement

Research does not pass merely because ten or more relevant targets were found.

Before research is considered complete, it must contain:

- at least 10 total retained research targets;
- at least 3 distinct target types across the research set; and
- at least **3 direct `customer_access` targets**.

If fewer than three direct customer-access targets exist, research fails closed.

Media, market, and partnership targets may remain valuable supporting evidence, but none may substitute for this minimum.

## 4. First-revenue eligibility

Only a target whose evidence role is `customer_access` may drive:

- `firstRevenuePath.firstChannel`;
- the three approaches on the 48-Hour Launch Card;
- Strategic Coherence Gate `access_path` channel references; or
- direct buyer-acquisition prioritization.

The system must fail release when:

- first revenue points to a non-customer-access target;
- any 48-Hour Launch Card approach points to a non-customer-access target; or
- fewer than three direct customer-access targets remain.

A podcast, YouTube creator, publication, event, association, review site, or complementary partner can still appear in the Sprint, but only in its correct supporting role unless separate evidence independently establishes a direct buyer-access route.

## 5. Strategy synthesis boundary

Strategy synthesis receives each target's evidence role and role boundary.

The model may choose among valid customer-access targets, but may not promote a supporting evidence role into direct acquisition.

The Strategic Coherence Gate independently verifies that every channel referenced for `access_path` is a direct customer-access target.

## 6. Customer-facing presentation

The dashboard and PDF must show researched targets in four separate groups:

1. **Direct Customer Access**
2. **Market Evidence**
3. **Media / PR Opportunities**
4. **Partnership Opportunities**

Each target must expose:

- evidence role;
- role boundary;
- target type and platform;
- public source URL;
- relevance;
- public access or participation path;
- prepared asset;
- first action;
- confidence; and
- research date.

The ZIP research CSV retains its existing filename for artifact compatibility, but adds authoritative `evidence_role` and `role_boundary` columns.

## 7. Historical falsification

The two saved paid-Sprint outputs that triggered this amendment were replayed through the deterministic role classifier.

### Longevity / health example

- 12 total researched targets
- 0 direct customer-access targets
- 7 media / PR targets
- 3 partnership targets
- 2 market-evidence targets
- original first-revenue channel: podcast
- result under v2.1.8: **blocked**

### SureDose example

- 12 total researched targets
- 0 direct customer-access targets
- 9 media / PR targets
- 3 partnership targets
- original first-revenue channel: YouTube creator
- result under v2.1.8: **blocked**

These historical Sprints are evidence of the defect. They are not templates for future customer access.

## 8. Release blocker codes

The release gate adds:

- `RESEARCH_FEWER_THAN_THREE_CUSTOMER_ACCESS_TARGETS`
- `STRATEGY_FIRST_REVENUE_USES_NON_CUSTOMER_ACCESS`
- `STRATEGY_LAUNCH_CARD_USES_NON_CUSTOMER_ACCESS`

These are blocking failures, not warnings.

## 9. Preserved boundaries

This amendment does not:

- discard competitor, media, PR, or partnership research;
- claim that a community member is automatically a qualified buyer;
- create lists of private individuals;
- authorize unsolicited mass outreach;
- change the $97 Sprint price;
- change the Free Verdict -> Sprint -> Get Me Live customer journey;
- change the canonical base Blueprint blob;
- add a new orchestration framework;
- weaken v2.1.7 Strategic Coherence Gate behavior; or
- weaken any evidence, safety, ownership, artifact-integrity, delivery, or release gate.

Direct customer access identifies a plausible **route to buyer conversations**. Qualification still occurs through observed behavior, recent-problem evidence, buyer/payer fit, and the Sprint's existing interview / commitment process.

**Market evidence is not customer-access evidence. Customer-access evidence is not PR. PR is not partnership. Partnership is not a buyer. Keep the roles separate.**
