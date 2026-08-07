# GhostTown Launch Blueprint — Canonical Contract and Build Specification v2.1

**Canonical version:** `2.1.1`  
**Source update date:** `2026-08-07`  
**Repository target:** `sanlorenzoprx/ghosttowntest`  
**Preserved implementation path:** PR `#7`, branch `feat/launch-blueprint-spa`

The canonical Blueprint is the authoritative product and implementation guide. Every Factory slice must revalidate its exact hash before execution. Clarifying or implementation-enabling amendments are permitted only through a versioned source update, an explicit change record, and a regenerated evidence chain. No amendment may weaken, remove, substitute, or materially alter the approved customer outcome without an explicit product decision.

### **v2.1.1 research-quality amendment**

By explicit product decision on 2026-08-07, research quality is measured by **independent verification dimensions of the business idea**, not by quotas for provider types or content/channel formats. Valid dimensions may include customer/problem definition, competitor or alternative evidence, customer-access evidence, audience reach, ecosystem or partner evidence, prior market behavior, and later commercial evidence. Podcast, YouTube, publication, community, or other channel formats are useful metadata and ranking signals, but multiple content formats are not a release requirement by themselves.

A model-selected candidate ID that does not match the current verified candidate pool is selection drift, not customer evidence and not a release blocker by itself. GhostTown must discard that unverified selection and recover from verified research already collected, or perform additional research and verification when needed. The Blueprint may become `ready` only when the actual research outcomes remain satisfied: verified candidates, independent verification coverage, public sources, research dates, confidence, access paths, risks, prepared assets, scripts, and first actions.

I reviewed the earlier product decisions, the original Blueprint, the implementation handoff, the acceptance contract, and the current draft PR. The foundation is strong, but the product needs one major shift:

**GhostTown Launch Blueprint should not primarily be a report generator. It should become a customer-acquisition and evidence system.**

The current PR already establishes the canonical Blueprint, current customer-access research, PDF, finished-assets ZIP, dashboard, Launch Site, lead capture, and progress tracking. It remains open and draft, so we should improve the product contract without discarding the 79 commits already invested in it.

# **GhostTown Launch Blueprint**

## **Final Product and Value Specification**

## **1. Product verdict**

The product should remain named:

# **GhostTown Launch Blueprint**

Its core promise should become:

> **Turn your GhostTown verdict into a focused offer, a current map of where your first customers can be reached, finished launch assets, a working Launch Site, and an adaptive 30-day path to obtain real market evidence and pursue the first meaningful customer commitment.**

The outcome is not “a launched business.”

The outcome is:

1. A business idea reduced to a testable offer.
2. A clearly identified first customer.
3. A credible path to reaching that customer.
4. Finished assets required to run the test.
5. A live or ready-to-publish Launch Site.
6. Thirty days of specific actions.
7. Recorded behavioral evidence.
8. A disciplined continue, revise, pivot, or stop decision.

This preserves the earlier product promise while making the commercial outcome much clearer. The existing design already intends to generate the roadmap, offer, positioning, customer-access research, copy, scripts, calendar, Launch Site, and downloadable assets from one canonical Blueprint.

---

# **2. Hard assessment of the current Blueprint**

## **What is already right**

The current design correctly recognizes that an offer generator alone is insufficient. It already includes:

* A complete offer and pricing strategy.
* Target-customer positioning.
* Current Media & Distribution research.
* Five helpful posts.
* Relationship-specific outreach scripts.
* Landing-page copy.
* Exactly thirty daily actions.
* Weekly milestones.
* A working Cloudflare Launch Site.
* A PDF, canonical JSON, and finished-assets ZIP.
* An executable dashboard.
* Evidence recording and final decision rules.
* Truth labels: **Verified, Inferred, and Test**.

The Customer Access Pack is especially valuable because it answers the founder’s practical question:

> “Where do I find the first people who might actually care?”

The existing contract also correctly limits research to 10–25 strong targets rather than hundreds of weak links, and requires research dates, public sources, activity confidence, access restrictions, engagement recommendations, risks, and first actions.

## **Where it is still vulnerable**

### **1. It can still become a polished generic task dump**

Thirty personalized-looking tasks are not enough. Each action must respond to:

* The founder’s current stage.
* What they have already tried.
* Their available time and budget.
* Their business model.
* Existing audience or customer access.
* Their ability to fulfill the offer.
* Evidence collected during the month.

The earlier criticism was correct: the plan must not send the founder through another month of activity without examining what has already produced signals.

### **2. “Launch” can displace “customer evidence”**

Publishing a site, writing posts, and sending outreach are activities. They are not proof of demand.

Strategyzer explicitly distinguishes faster, weaker evidence from stronger behavioral evidence and recommends testing the most important low-evidence assumptions first. YC similarly recommends asking about actual past behavior instead of hypothetical interest. ([Y Combinator](https://www.ycombinator.com/blog/startup-school-week-1-recap-kevin-hale-and-eric-migicovsky/?utm_source=chatgpt.com))

GhostTown must rank evidence approximately like this:

**Strong evidence**

* Payment.
* Deposit.
* Paid pilot.
* Signed or clearly accepted pilot scope.
* Access to data, systems, staff, or facilities.
* Meaningful time commitment.
* Introduction to a decision maker.

**Moderate evidence**

* Qualified sales conversation.
* Proposal request.
* Trial or demonstration request.
* Specific buying-process objection.
* Referral to another qualified buyer.

**Early evidence**

* Qualified reply.
* Customer interview.
* Landing-page lead.
* Relevant question or direct inquiry.

**Weak evidence**

* Likes.
* Generic compliments.
* Unqualified waitlist entries.
* Friends saying they would use it.
* Traffic without a meaningful action.

### **3. One calendar cannot serve every business model**

A service business should be asking for a paid pilot earlier than a SaaS founder building a technical prototype.

The final plan must select one business-model execution lane:

| Business model | First meaningful test |
| --- | --- |
| Service or consulting | Paid diagnostic, pilot, or manually delivered engagement |
| SaaS | Concierge solution, demo, paid design partner, or deposit |
| Digital product | Presale, paid workshop, founding-member offer, or preorder |
| Physical product | Prototype response, preorder, deposit, or retailer conversation |
| Marketplace | Manually matched first transaction on a narrow initial side |
| Local business | Appointment, estimate, reservation, deposit, or paid service |
| Creator or media | Qualified subscriber action, sponsor conversation, or paid product test |

The customer sees only the lane relevant to their business.

### **4. It lacks an explicit first-revenue path**

The Blueprint has an offer section and a launch plan, but the first commercial transaction should be expressed as a separate system:

> **Who will be asked, what will they be offered, at what price, through which channel, using what proof, and how will the founder fulfill it manually?**

That should be visible in the first five pages.

### **5. It needs a learning loop, not one-time generation**

The dashboard already records evidence and progress. The next step is to use that evidence at Days 7, 14, and 21.

Progress monitoring generally improves goal attainment, with stronger effects when progress is explicitly recorded or reported. Research on implementation intentions also supports specific “when this happens, do this” plans rather than vague intentions. ([PubMed](https://pubmed.ncbi.nlm.nih.gov/26479070/?utm_source=chatgpt.com))

The plan should contain branching rules such as:

> If ten qualified messages produce no replies, stop increasing volume. Review customer fit, channel relevance, and the opening message.

> If prospects reply but refuse calls, reduce the size of the requested commitment.

> If calls occur but nobody accepts the offer, examine urgency, trust, scope, price, and proof.

> If customers accept but fulfillment is unprofitable, revise delivery before acquiring more customers.

---

# **3. Exact Blueprint structure**

## **Part 1 — Executive Launch Decision**

This should be the first two pages and the first dashboard screen.

It contains:

* Original idea.
* GhostTown verdict.
* Recommended decision.
* Strongest opportunity.
* Largest unresolved risk.
* Recommended first customer.
* Recommended offer.
* First meaningful commercial commitment.
* Thirty-day objective.
* Maximum founder time investment.
* Maximum test budget.
* Evidence required by Day 30.
* Immediate 48-hour actions.
* Continue, revise, pivot, and stop thresholds.

### **New value: 48-Hour Launch Card**

The founder should immediately receive:

1. The first customer to pursue.
2. The first offer to test.
3. The first three people or channels to approach.
4. The exact first message.
5. The first measurable commitment to request.
6. The generated Launch Site preview.

This reduces the delay between purchase and action.

---

## **Part 2 — Starting-State and Evidence Audit**

This is an essential new section.

It documents:

* What the founder has already built.
* Previous landing pages or offers.
* Previous outreach attempts.
* Existing customers, audience, contacts, or partners.
* Previous traffic, replies, calls, sales, or failures.
* Existing skills and assets.
* Available hours per week.
* Test budget.
* Geographic and language constraints.
* Technical capability.
* Current ability to fulfill manually.
* What has produced a real response.
* What has produced no meaningful response.

It then creates three registers:

### **Verified facts**

Facts supported by customer input, transaction data, current sources, or supplied evidence.

### **Inferences**

Reasonable conclusions that still require testing.

### **Critical tests**

The assumptions most likely to invalidate the opportunity.

The final output should identify no more than **five critical assumptions**. A founder should not be asked to test twenty assumptions simultaneously.

---

## **Part 3 — First-Customer Definition**

This section answers:

* Exactly who should be approached first?
* What event or condition makes them care now?
* What are they currently doing instead?
* How costly, risky, slow, or frustrating is the current approach?
* Who experiences the problem?
* Who approves the purchase?
* Who can block it?
* What language does the buyer use?
* What evidence would make the offer credible?
* Who should explicitly not be targeted during the first 30 days?

### **Required outputs**

* Initial customer profile.
* Trigger-event map.
* Current-alternative map.
* Buyer and decision-maker map.
* Customer language bank.
* Excluded segments.
* Qualification checklist.
* Five disqualification questions.

Customer interviews should focus on recent concrete experiences, existing alternatives, current costs, and what buyers have already attempted—not hypothetical reactions to an imagined product. ([Y Combinator](https://www.ycombinator.com/blog/startup-school-week-1-recap-kevin-hale-and-eric-migicovsky/?utm_source=chatgpt.com))

## **Part 4 — Offer and Pricing Strategy**

Keep this to the previously approved **three or four pages**.

It must include:

* Offer name.
* Specific target customer.
* Painful or costly situation.
* Desired useful outcome.
* One-sentence promise.
* Deliverables.
* Delivery process.
* Time to first useful result.
* Buyer responsibilities.
* Explicit exclusions.
* Required customer inputs.
* Initial proof boundary.
* Initial test price.
* Price floor.
* Base test price.
* Upper test boundary.
* Reasoning behind the range.
* Top objections.
* Objection responses.
* Ethical risk reversal.
* Refund or cancellation boundary where appropriate.
* What must be learned before raising or lowering the price.

The offer must not use an enormous artificial value stack. It must be understandable, deliverable, and testable.

Pricing should be treated as an experiment in the real market. Stripe recommends deliberate pricing experiments that observe actual purchase behavior and balance willingness to pay with sustainable economics. ([Stripe](https://stripe.com/resources/more/pricing-experiments?utm_source=chatgpt.com))

## **Part 5 — First-Revenue and Fulfillment Plan**

This should be added as a distinct section.

### **First-revenue path**

* First offer format.
* First buyer.
* First channel.
* First ask.
* First price.
* Required proof.
* Payment or commitment method.
* Target date for making the ask.
* Minimum number of qualified asks.
* Follow-up sequence.
* Success threshold.

### **Manual fulfillment plan**

* Customer onboarding steps.
* Inputs required from the customer.
* Work performed by the founder.
* Expected delivery time.
* Tools required.
* Customer communication points.
* Definition of successful delivery.
* Quality checklist.
* Capacity per week.
* Estimated variable cost.
* Estimated founder hours.
* Basic gross-margin guardrail.
* What is intentionally manual during validation.

This prevents the founder from acquiring a customer for an offer they cannot deliver profitably.

### **Finished asset**

GhostTown should create a one-page **Founding Customer Pilot Brief** containing:

* Problem.
* Scope.
* Deliverables.
* Timeline.
* Price.
* Buyer responsibilities.
* Proof boundary.
* Next step.

It is a commercial one-pager, not a fabricated legal agreement.

---

## **Part 6 — Customer Access and Distribution Network**

This remains one of the largest and most valuable sections.

The system researches **10–25 current, verified targets** relevant to reaching, learning from, or partnering around the first customer. It should seek useful breadth when the market supports it, but it must not force three content or channel categories merely to satisfy a quota. Research quality is judged by independent verification dimensions of the idea; channel format diversity is a ranking preference, not a release minimum.

Possible target types include:

* Communities.
* Associations.
* Publications.
* Newsletters.
* Podcasts.
* YouTube creators.
* Public experts.
* Events.
* Directories.
* Marketplaces.
* Complementary products.
* Potential referral partners.
* Review sites.
* Public discussions.

Every target must include:

* Name.
* Public URL.
* Category.
* Source.
* Research date.
* Evidence of relevance.
* Evidence of recent activity.
* Audience overlap.
* Public access path.
* Participation or promotional rules when visible.
* Recommended engagement type.
* Specific useful topic.
* Matching prepared asset.
* Matching outreach script.
* Risk.
* Confidence.
* First action.
* Tracking source code.

### **Prioritization**

The customer should not initially see twenty-five equally important recommendations.

Divide them into:

**Priority Five**

The highest-fit, most accessible places to begin.

**Reserve Five**

Useful alternatives if the first channels do not respond.

**Partner Targets**

Associations, complementary providers, creators, or organizers suitable for relationships rather than direct promotion.

Gemini may rank and explain verified provider candidates, but it must not invent channels, organizations, URLs, activity claims, or participation rules. An unknown model candidate reference must be discarded or researched and verified before it can become a delivered target; the unknown reference alone is not a release blocker.

---

## **Part 7 — Helpful Content Pack**

Deliver five completed, channel-specific contributions.

Each includes:

* Target channel.
* Objective.
* Why the topic fits that audience.
* Finished title or hook.
* Finished post.
* Non-promotional closing question.
* Optional permitted soft CTA.
* Recommended posting conditions.
* Responses to likely comments.
* Signals to record.
* What not to say.
* Source or insight supporting the content.

The sequence should normally include:

1. Practical checklist.
2. Decision framework or breakdown.
3. Evidence-based observation.
4. Useful template or resource.
5. Conversation-starting validation post.

A Reddit post must not simply be copied into LinkedIn, Facebook, or an industry forum.

### **New value: Comment and Reply Pack**

Each post should include:

* Three useful comment replies.
* One response to skepticism.
* One response to interest.
* One transition from public discussion to a private customer conversation.

---

## **Part 8 — Outreach, Interview, and Sales Pack**

The existing twelve relationship-specific scripts should remain:

* Warm contact.
* Former colleague or customer.
* Community participant.
* LinkedIn connection.
* Association member.
* Potential referral partner.
* Customer interview invitation.
* Offer-test invitation.
* No-response follow-up.
* Interest follow-up.
* Rejection follow-up.
* Referral request.

Add these finished assets:

### **Customer interview guide**

* Problem-history questions.
* Last-occurrence questions.
* Current-workaround questions.
* Cost and consequence questions.
* Buying-process questions.
* Existing-spending questions.
* Switching-friction questions.
* Closing and referral questions.

### **Offer conversation guide**

* Opening.
* Problem confirmation.
* Offer explanation.
* Scope confirmation.
* Price presentation.
* Objection capture.
* Commitment request.
* Follow-up agreement.

### **No-Response Rescue Pack**

* Alternate opening.
* Smaller request.
* Different channel.
* Referral-based approach.
* Value-first contribution.
* Stop-contact rule.

---

## **Part 9 — Launch Site and Campaign Kit**

The Launch Site remains part of the Blueprint—not a bonus.

It should be generated from the same canonical data and include:

* Business or offer name.
* Target-customer callout.
* Headline.
* Subheadline.
* Problem section.
* Current-alternative section.
* Offer.
* Deliverables.
* Process.
* Timeline.
* Price presentation.
* Proof boundary.
* FAQ.
* Risk-reversal language.
* Primary CTA.
* Secondary CTA.
* Lead form.
* Thank-you message.
* Confirmation email.
* Metadata.
* Social-sharing description.
* Privacy and terms placeholders.
* Validation-stage disclaimer.

### **Campaign measurement**

The site should record:

* Page view.
* Primary CTA click.
* Secondary CTA click.
* Lead submitted.
* Call requested.
* Checkout or payment started where configured.
* Source channel.
* Campaign identifier.

Each Customer Access target should receive a corresponding trackable campaign link.

The site does not have to be published on Day 1. The immediate value is that the customer can see the business and offer they are preparing to test.

---

## **Part 10 — Adaptive 30-Day Calendar**

The calendar must contain exactly thirty personalized daily actions.

Every day contains:

* Day and date.
* Primary objective.
* Why it matters.
* Estimated time.
* Exact required actions.
* Prepared GhostTown assets.
* Expected deliverable.
* Success measure.
* Evidence to record.
* “If this happens, then do this” branch.
* Completion status.

### **Week 1 — Establish the test**

Objective:

* Audit existing evidence.
* Select the customer.
* Finalize the offer.
* Confirm fulfillment.
* Review customer-access research.
* Activate the Launch Site draft.
* Set test thresholds.

The week should end with a real first action, not just planning.

### **Week 2 — Reach customers and learn their language**

Objective:

* Publish or privately share the Launch Site.
* Begin customer conversations.
* Use the first helpful posts.
* Conduct interviews.
* Record exact language.
* Make the first commercial asks where appropriate.

For service, consulting, local, and simple digital offers, the first paid-pilot request should generally occur during Week 2—not be postponed until the end of the month.

### **Week 3 — Test commitment**

Objective:

* Present the offer to qualified prospects.
* Test the price.
* Follow up.
* Contact partners.
* Compare channels.
* Record objections.
* Seek payment, deposit, access, or another meaningful commitment.

### **Week 4 — Correct the largest constraint**

Objective:

* Identify whether the constraint is customer, urgency, access, trust, offer, fulfillment, price, or message.
* Change one primary variable.
* Run a focused second test.
* Complete follow-ups.
* Assess economics and feasibility.
* Make the final decision.

---

## **Part 11 — Evidence Ledger and Checkpoint Reviews**

The dashboard should become the primary operating surface.

### **Evidence ledger**

For each action, record:

* Contact or channel.
* Date.
* Action.
* Response.
* Customer language.
* Alternative mentioned.
* Objection.
* Commitment offered.
* Commitment received.
* Revenue or deposit.
* Follow-up date.
* Evidence strength.
* Source attachment or note.

### **Day 7 review**

Questions:

* Was the customer definition coherent?
* Can qualified people be reached?
* Did the founder complete the first actions?
* Which assumptions remain unsupported?
* Should the offer or customer be revised before increasing outreach?

### **Day 14 review**

Questions:

* Are conversations occurring?
* Is the problem recent and meaningful?
* What alternatives are repeatedly named?
* Is the language on the page accurate?
* Has the founder made a transparent commercial ask?

### **Day 21 review**

Questions:

* Is there meaningful commitment?
* Which channel produces the strongest signals?
* What is the main conversion constraint?
* Is fulfillment practical?
* Which single variable should change?

### **Day 30 review**

The system produces one decision:

* **Continue**
* **Continue with revision**
* **Pivot customer**
* **Pivot problem**
* **Pivot offer**
* **Pause for missing evidence**
* **Stop**

It must explain the evidence supporting the decision and what evidence is still missing.

### **Version rule**

A checkpoint regeneration creates a new Blueprint version. It never overwrites:

* Original recommendations.
* Previous assets.
* Previous evidence.
* Earlier decision thresholds.
* Customer-entered results.

---

## **Part 12 — Interview and Evidence Synthesis**

This is the strongest additional value feature after the initial launch.

The customer can paste:

* Interview notes.
* Call transcripts.
* Objection notes.
* Email replies.
* Survey responses.
* Sales-call summaries.

Gemini then produces a source-linked synthesis:

* Repeated customer language.
* Trigger events.
* Current alternatives.
* Problem frequency.
* Urgency.
* Buying authority.
* Existing spending.
* Switching barriers.
* Offer objections.
* Price objections.
* Trust objections.
* Recommended evidence-backed revisions.

It must distinguish direct customer statements from model inference.

This turns GhostTown from a one-time generator into a learning system without pretending to replace the founder’s customer conversations.

---

## **Part 13 — Sources, Assumptions, and Generation Receipt**

The Blueprint concludes with:

* Public sources.
* Research dates.
* Provider source IDs.
* Reachability verification.
* Truth labels.
* Confidence.
* Known access limitations.
* Unsupported or unavailable facts.
* Blueprint schema version.
* Prompt or generator version identifier.
* Vertex Gemini model configuration identifier.
* Input hash.
* Source-verification receipt.
* Quality-gate results.
* Artifact hashes.
* Generation timestamp.

No raw provider payloads, internal prompts, private keys, or owner-only Google research should appear in customer artifacts.

---

# **4. Personalization contract**

The Blueprint should be personalized across six dimensions.

## **Founder state**

* New idea.
* Existing offer.
* Existing product.
* Existing audience.
* Existing customers.
* Previously failed launch.

## **Business model**

* Service.
* SaaS.
* Digital product.
* Physical product.
* Marketplace.
* Local business.
* Creator or media.

## **Customer motion**

* Direct sales.
* Community-led.
* Partner-led.
* Content-led.
* Local discovery.
* Marketplace discovery.
* Existing-network launch.

## **Founder constraints**

* Hours available.
* Budget.
* Technical skill.
* Sales comfort.
* Geography.
* Language.
* Existing relationships.

## **Evidence maturity**

* Assumption only.
* Problem evidence.
* Access evidence.
* Offer evidence.
* Commitment evidence.
* Revenue evidence.

## **Verdict state**

* Proceed.
* Proceed cautiously.
* Narrow the idea.
* Validate the problem first.
* Pivot.
* Stop.

The system must never give a “proceed” calendar to an idea whose evidence says the customer, problem, or access path is too weak.

---

# **5. Gemini through Vertex AI production role**

Gemini should not write an unrestricted long report in one request.

Use a staged pipeline:

## **Stage 1 — Evidence normalization**

Input:

* GhostTown verdict.
* Paid intake.
* Starting-state audit.
* Founder constraints.
* Verified provider research.
* Confirmed seed domains.
* Current sources.

Output:

* Structured evidence packet.
* Verified facts.
* Inferences.
* Missing evidence.
* Critical assumptions.

## **Stage 2 — Strategy synthesis**

Generate:

* Executive decision.
* Customer definition.
* Offer.
* Pricing hypothesis.
* First-revenue path.
* Fulfillment plan.
* Channel priorities.
* Decision thresholds.

## **Stage 3 — Asset generation**

Generate:

* Helpful posts.
* Outreach scripts.
* Interview guide.
* Offer conversation guide.
* Landing-page copy.
* Confirmation email.
* Daily action instructions.

## **Stage 4 — Red-team review**

A separate generation pass checks:

* Unsupported claims.
* Invented sources.
* Contradictions.
* Generic language.
* Business-model mismatch.
* Impossible workload.
* Missing daily assets.
* Unclear success measurements.
* Softened stop criteria.
* Pricing and fulfillment inconsistencies.

## **Stage 5 — Schema validation**

Vertex AI supports controlled JSON generation against a predefined response schema. The output should be rejected unless it validates against the canonical `ghosttown-launch-blueprint-v2` or successor schema. ([Google Cloud Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-controlled-generation-response-schema-2?utm_source=chatgpt.com))

## **Deterministic rendering**

The validated canonical record drives:

* Dashboard.
* PDF.
* Finished-assets ZIP.
* Launch Site.
* Calendar.
* Sources.
* Progress system.

Gemini does not independently create different copy for each surface.

---

# **6. Customer delivery package**

The customer should receive four primary surfaces.

## **1. Executable account Blueprint**

The main operating system:

* Today’s actions.
* This week’s milestone.
* Priority channels.
* Scripts.
* Posts.
* Evidence ledger.
* Metrics.
* Checkpoint reviews.
* Launch Site.
* Leads.
* Final decision.

## **2. Professional PDF**

The PDF is the readable strategic reference.

It should prioritize:

* Executive decision.
* Starting-state audit.
* Customer.
* Offer.
* First-revenue path.
* Priority access channels.
* Prepared assets.
* Weekly plan.
* Thirty-day calendar.
* Decision criteria.

Large CSV-style research tables belong in the appendix and ZIP, not in the middle of the narrative.

## **3. Finished-assets ZIP**

Retain the existing package and add the new content inside the most appropriate files:

* Blueprint.
* PDF.
* Executive summary.
* Offer and pricing.
* Positioning.
* Distribution network.
* Outreach scripts.
* Helpful posts.
* Landing-page copy.
* Launch Site configuration.
* Thirty-day calendar.
* Weekly milestones.
* Metrics.
* Decision rules.
* Sources.
* README.

After the first successful customer, the next ZIP version should add:

* Founding Customer Pilot Brief.
* Interview notes template.
* Objection log.
* Evidence ledger.
* Importable `.ics` calendar.

Do not destabilize the current 16-file acceptance gate solely to add these before the first completed purchase.

## **4. Working Launch Site**

* Previewable.
* Publishable.
* Unpublishable.
* Lead-capturing.
* Source-tracked.
* Recoverable from the account.
* Generated from canonical Blueprint data.

---

# **7. Required quality gates**

A Blueprint cannot become `ready` unless:

## **Strategy**

* One first customer exists.
* One primary problem exists.
* One offer exists.
* One fulfillment method exists.
* One initial price hypothesis exists.
* One first meaningful commitment exists.
* Time and budget limits exist.

## **Research**

* Two or three verified commercial seed domains exist.
* Required provider tasks were attempted.
* At least three independent verification dimensions are represented across available evidence. Valid dimensions include customer/problem definition, competitor or alternative evidence, customer-access evidence, audience reach, ecosystem or partner evidence, prior market behavior, and later commercial evidence.
* At least ten verified candidates exist.
* Final network contains 10–25 verified targets.
* Provider-count and content/channel-category diversity are diagnostic signals, not release minimums by themselves.
* Every delivered target has a source, date, confidence, access path, asset, script, risk, and first action.

## **Assets**

* Five finished helpful posts exist.
* Required relationship-specific scripts exist.
* Landing-page copy is complete.
* Launch Site configuration is complete.
* First-revenue brief exists.
* Interview and offer guides exist.

## **Calendar**

* Exactly thirty actions exist.
* Every action has a prepared asset or explains why one is unnecessary.
* Every action has a deliverable.
* Every action has a success measure.
* Every action has evidence to record.
* Critical actions have branching rules.
* Workload respects the founder’s stated time limit.

## **Truth and safety**

* No fabricated testimonials.
* No invented results.
* No fake scarcity.
* No unsupported guarantees.
* No invented channels or contacts.
* No private personal information.
* No concealed access restrictions.
* All claims are labeled Verified, Inferred, or Test.

## **Delivery**

* Canonical record saved.
* PDF rendered.
* ZIP rendered.
* Launch Site generated.
* Private artifacts stored.
* Account ownership verified.
* Repeat download works.
* Artifact hashes and generation receipt exist.

---

# **8. Highest-value improvements by priority**

## **Required before the first real paid delivery**

1. Vertex Gemini produces the structured canonical Blueprint.
2. Starting-state and previous-evidence audit.
3. Business-model-specific execution lane.
4. Explicit first-revenue path.
5. Manual fulfillment and economics guardrail.
6. Stronger evidence hierarchy.
7. 48-hour Quick Start Card.
8. Daily branching rules.
9. PDF organized around decisions and execution rather than volume.
10. Complete acceptance purchase through the real Workflow.

## **High value immediately after the first customer**

1. Day 7, 14, and 21 evidence-based regeneration.
2. Interview-note and transcript synthesis.
3. Founding Customer Pilot Brief.
4. Calendar import.
5. Objection and no-response rescue packs.
6. Channel attribution and campaign comparison.
7. Legitimate proof-building workflow from completed pilots.
8. Next-30-day plan generated only from recorded evidence.

## **Deliberately deferred**

* Multiple site themes.
* Drag-and-drop page builder.
* Customer custom domains.
* Automatic mass outreach.
* CRM automation.
* Private-platform scraping.
* Generalized autonomous business orchestration.
* A second paid-product repository.

These should remain deferred until a paying customer completes the entire Blueprint and provides usage evidence.

---

# **9. Product pricing assessment**

Earlier documents contain $49 and $97 price concepts. The scope now includes current provider-backed research, Vertex generation, a working Launch Site, lead capture, a private dashboard, PDF, finished assets, and persistent execution tracking.

That is no longer a $19 or $29 report.

The strongest initial hypothesis is:

> **$97 one-time for the complete GhostTown Launch Blueprint.**

Keep one product and one promise. Test price changes across new cohorts rather than creating confusing tiers.

A temporary launch price may be used as a clearly stated test, but the product should not be permanently anchored at $49 unless actual conversion and delivery-cost evidence supports it. Pricing experiments should measure real purchase behavior rather than rely only on stated willingness to pay. ([Stripe](https://stripe.com/resources/more/pricing-experiments?utm_source=chatgpt.com))

# **10. Final customer promise**

> **GhostTown Launch Blueprint gives you more than advice. It turns your verdict into a focused first offer, a current map of where your customers can be reached, finished content and outreach assets, a working launch page, and thirty days of specific actions designed to produce real market evidence. As you record conversations, objections, commitments, and revenue, GhostTown helps you decide whether to continue, revise, pivot, or stop—before you spend months building from assumptions.**

The differentiator is not “AI creates a business plan.”

The differentiator is:

> **GhostTown performs the research, completes the first launch assets, organizes the customer-acquisition work, records the evidence, and forces a disciplined decision.**

The correct next build move is to revise the canonical Blueprint contract around the **starting-state audit, first-revenue path, fulfillment plan, business-model lane, and adaptive evidence checkpoints**, while preserving the existing PR #7 architecture and acceptance path.
