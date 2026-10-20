# First 30: customer research loop (follow-up work)

Status: **being built.** This research is part of how First 30 delivers its primary offer, the
customer-acquisition website and outreach materials. It does not change that offer. The landing page,
the First 30 signup card and `llms.txt` say:

> GhostTown finds places where your likely customers are already talking, researches the problems they
> describe, and uses what they say to shape your website and the messages and content you test during
> those 30 days.

First 30 opens with this loop working end to end.

Source: founder notes of 20 October 2026, reviewing a TikTok / e-commerce research playbook. This file
keeps the parts of that playbook GhostTown adopts and the corrections it needs.

## The loop

research → problems and frustrations → choose where to test → content made the way that group
consumes it → test → change the plan based on what customers do.

| Step | What GhostTown does | What the founder receives |
|---|---|---|
| 1. Define the buyer | Business, buyer, problem hypothesis, language, market | "Here is who we are trying to reach." |
| 2. Find where they gather | Specific communities, channels, discussions, review sites and creators | Links, with evidence of relevance, recent activity and participation rules |
| 3. Research those places | Existing providers first; Playwright where a page is public and the site allows it; founder-supplied material | A source-linked summary of questions, complaints, alternatives and objections |
| 4. Pick problems worth testing | Group recurring frustrations (functional, emotional, price) and keep contradictory evidence | Who has each problem, when, what it costs and how they handle it today |
| 5. Choose where to test | Compare buyer relevance, access, community rules and the founder's time | A first place and a backup, with reasons |
| 6. Prepare content for that place | Match how people in that place talk and what they trust | Finished posts, replies, messages, scripts or video briefs |
| 7. Test and learn | Tie each asset to one hypothesis and record responses | What to repeat, change or stop |

Steps 2 and 3 run together: finding a place and reading it are one pass.

Name specific places, not platforms. "Your customers use Facebook" is not a result. A result names the
group, says why its members match the buyer, links relevant discussions and says whether commercial posts
are allowed. If the research shows members distrust promotional links, prepare a useful discussion post
and a conversation guide, not a sales video.

This builds on `GHOSTTOWN_LAUNCH_BLUEPRINT_V2_1_8_RESEARCH_ROLE_AND_CUSTOMER_ACCESS_AMENDMENT.md`
(the `customer_access` role) and the V2.1.9 recency amendment. Reuse that research path. Do not build a
separate TikTok research engine.

## Rules

- **Wording.** Say "we found relevant, active communities," never "we know where most of your niche
  gathers." Finding several communities does not show where most buyers are.
- **Complaints are not demand.** A complaint shows a possible problem, not that anyone will buy the fix.
- **Independent sources.** Reposts and repeated comments by the same people do not confirm each other.
- **Keep the source.** Every quote links to where it came from. Never turn a complaint into a testimonial.
- **Research gaps are visible.** A page GhostTown could not read shows up as a gap, not as missing silence.
- **Missing metrics stay unknown.** Do not estimate a number and show it as observed. TikTok Top Ads
  metrics are relative and limited to selected, advertiser-authorized creatives: inspiration, not a
  benchmark.
- **No unsupported claims.** The playbook's "$172M generated," "5× cheaper CPMs" and "$25K/month from
  three emails" have no evidence and never become GhostTown copy or advice.

## Evidence levels

Show these separately. They never count as each other.

1. **Attention:** views, likes, saves, shares.
2. **Problem evidence:** relevant people describe a recent problem and how they deal with it now.
3. **Commitment:** a booked call, inputs sent, a pilot accepted, a deposit. A booked call and a paid order
   are not equal proof.
4. **Commercial and delivery evidence:** payment, successful delivery, repeat use, renewal, an actual
   referral.

## Tests replace the "$50 / 2%" rule

The playbook's rule (spend $50, stop under 2% conversion) is not used. At $1 a visit, $50 buys 50 visits,
and one sale reads as 2%: one sale is not enough to decide anything. Before each test, record:

- the question being tested;
- the audience and the action that counts;
- the cash and time limits;
- what result means continue, and what means revise;
- when the result is labeled inconclusive.

Start with a few clearly different messages. Do not generate hundreds of hooks.

## The 30 days follow the evidence

A starting order, not a fixed script. Founders with customers, revenue or strong prior evidence skip
what they have already done.

| Days | Focus | Review |
|---|---|---|
| 1–2 | One buyer, one suspected problem, where they gather | |
| 3–4 | Customer language, current alternatives, objections | |
| 5–6 | Conversations with potential customers | Day 7: keep, narrow, change the problem, or gather more |
| 8–10 | One small offer: pilot brief, price idea, delivery checklist | |
| 11–13 | Qualified offers | Day 14: what is blocking — reach, offer, trust, price? |
| 15–17 | Test one change | |
| 18–20 | Deliver a small pilot if commitments exist | Day 21: demand, delivery cost and capacity |
| 22–27 | Repeat what worked; test continued value | |
| 28–30 | Results, open questions | Day 30: continue, revise, change direction, or stop |

If Day 14 shows no real commitments, Day 18 must not tell the founder to onboard customers who do not
exist; it assigns the next useful test. If customers buy but delivery is slow, the plan shifts to
fulfillment, not more marketing. When the Coach replaces work, the old task's completion requirement
leaves the active plan.

## What the founder sees: a research card

- **What people are struggling with:** the problem, where we found it, what is still uncertain.
- **What to ask next:** for example, "Ask a potential customer to describe the last time this happened."
- **What we prepared:** opens the actual interview guide, first message, tracker or page draft. A list
  of tasks is not prepared work.
- **What would change the plan:** for example, "If buyers already solve this easily, or will not take
  the next step, we reconsider the offer."

## Build status

| Part | Status |
|---|---|
| Find where likely customers gather (steps 1–2) | Built: customer-access research, v2.1.8 and v2.1.9. |
| Read those places; problems in customers' own words, with evidence against them (steps 3–4) | Built: v2.1.11, `src/api/communityProblemResearch.ts`. Quotes must appear word for word on the linked page. |
| How each place talks and whether promotion is allowed (step 5 input) | Built: v2.1.11, per-community style. |
| Posts, messages and landing-page copy written from that language (step 6) | Built: v2.1.11, the asset stage receives `customerResearch`. |
| Research card: struggling / ask next / prepared / what would change the plan | Built: v2.1.11, dashboard, PDF and ZIP. |
| Written test definitions and the four evidence levels in the tracker (step 7) | Next. |
| Coach decisions that change the active plan; obsolete tasks leave the plan | Next. |
| First 30 order, checkout and fulfillment running this loop | Next; checkout needs production approval. |

## Build order

1. Prove one complete journey first: customer language → conversation → offer → commitment → delivery
   → revised plan.
2. Then add written test definitions and Coach decisions that update the active plan.
3. Keep the canonical record, the shared dashboard / PDF / ZIP content, ownership checks, durable
   retries and version history. Any approved contract change gets a new version and hash.
4. Later, if the evidence supports it: more scraping, more content variations, ad automation, other
   countries. Lower ad costs abroad do not show profitable demand there.
