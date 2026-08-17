# GhostTown Commercial Quality + Story Studio Autopilot Development Contract v1.0

**Status:** Governing development contract for the next GhostTown + Story Studio implementation phase  
**Repository:** `sanlorenzoprx/ghosttowntest`  
**Working branch:** `feat/launch-blueprint-spa`  
**Primary operator command:** `npm run roadmap:autopilot`  
**Production release rule:** Gate 36 remains explicit human authorization. No automatic production release.

## 1. Governing decision

GhostTown has proved the mechanics of paid fulfillment. The next objective is not to add infrastructure. It is to make the customer-facing outputs unusually specific, credible, usable, commercially effective, and worth paying for.

The governing development rule is:

> **Freeze infrastructure. Improve verdict quality, deliverable quality, conversion, and measurement.**

After customer-facing quality is accepted and Gate 36 is explicitly released, Story Studio becomes both:

> **CONTENT FACTORY + EXPERIMENTAL ACQUISITION SYSTEM**

## 2. Master roadmap

```text
Production Gates 1–25
        ↓
Infrastructure Freeze
        ↓
Q1 — Verdict Decision v2
        ↓
Q2 — Daily Execution Assets
        ↓
Q3 — Blueprint Quality + Premium Document
        ↓
Q4 — Direct-Response Launch Site
        ↓
Q5 — Commercial Measurement
        ↓
Production Gates 26–35
        ↓
Gate 36 — HUMAN PRODUCTION RELEASE
        ↓
Story Studio Slice A → Slice B → Slice C
        ↓
Show/Treatment Portfolio Lock
        ↓
Baseline 001: 100 verdicts × 10 treatments = 1,000 masters
        ↓
1h / 24h / 72h / 7d observations
        ↓
winner + segment discovery
        ↓
~80% exploit / ~20% explore
        ↓
winner mutation
        ↓
predictive routing
        ↓
attributable $97 sales
        ↓
repeatable acquisition economics
```

The sequence `30–50 videos → prove commercial economics → permission for 1,000` is rejected. Small Story Studio slices prove machine readiness. Baseline 001 is the large exploration corpus used to discover winners.

## 3. Infrastructure Freeze

Infrastructure Freeze is an always-on preflight, not a one-time gate.

Allowed purposes:

```text
verdict_quality
deliverable_quality
conversion
measurement
critical_customer_path_defect
security_or_data_integrity_required_for_customer_path
```

Presumptively blocked unless an explicit exception proves customer/commercial necessity:

```text
new orchestration framework
new agent framework
new generic capability platform
new database or queue for architecture cleanliness only
new AI provider without demonstrated quality/reliability need
new persistence layer without customer-path need
new generalized ACS architecture
new Container without a proven workload need
framework migration
wrapper around an already proven integration
```

Every exception must identify the customer/commercial problem, metric/output improved, why the current architecture cannot solve it, minimum change, alternatives rejected, acceptance test, rollback plan, and production impact.

## 4. Quality operating model

Every important output follows:

```text
INPUTS
↓
TRANSFORMATION
↓
OUTPUT CONTRACT
↓
STRUCTURAL VALIDATION
↓
USEFULNESS VALIDATION
↓
CROSS-SURFACE CONSISTENCY
↓
VISUAL / PRESENTATION VALIDATION
↓
CUSTOMER ACTION
↓
BEHAVIORAL SIGNAL
↓
DECISION RULE
↓
RECEIPT
```

Five quality layers apply:

1. **Contract** — required structure exists.
2. **Usefulness** — customer can use the result without writing the missing deliverable themselves.
3. **Consistency** — verdict, Blueprint, daily assets, Launch Site, and Story Studio creative agree on customer/problem/offer/truth.
4. **Presentation** — output renders professionally on the real surface.
5. **Behavior** — customer or market takes the intended next action.

Behavior is the ultimate authority. AI quality scores may assist review but cannot overrule customer behavior.

## 5. Q1 — Verdict Decision v2

GhostTown should not pretend to predict whether an entire business will succeed. The prediction target becomes:

> **Given this customer, problem, offer, access path, and founder constraints, how plausible is it that this concept can produce a meaningful customer commitment during the validation window?**

Required customer-facing order:

```text
DECISION
WHAT WE ARE ACTUALLY PREDICTING
CONFIDENCE
WHY THIS MAY WORK
WHY THIS MAY FAIL
BIGGEST UNKNOWN
CHEAPEST WAY TO PROVE US WRONG
DO THIS FIRST
WHAT WOULD CHANGE THIS VERDICT
```

Canonical contract:

```ts
interface VerdictDecisionV2 {
  decision: "WORTH_TESTING" | "REVISE_BEFORE_TESTING" | "WEAK_EVIDENCE" | "DO_NOT_PURSUE_YET";
  predictionTarget: string;
  confidence: { level: "LOW" | "MODERATE" | "HIGH"; rationale: string };
  customer: { initialCustomer: string; whyThisCustomer: string; excludedBroadAudiences: string[] };
  problem: { painfulProblem: string; existingAlternative: string; urgencyEvidence: string[] };
  offerHypothesis: { offer: string; commitmentRequested: string; priceOrCommitmentRange?: string };
  reasonsFor: string[];
  reasonsAgainst: string[];
  largestUncertainty: { assumption: string; whyItMatters: string };
  cheapestFalsification: {
    test: string;
    target: string;
    successThreshold: string;
    failureThreshold: string;
    maximumTime: string;
    maximumCash: string;
  };
  firstAction: { action: string; preparedAssetRequired: boolean };
  whatWouldChangeTheVerdict: string[];
  evidenceLabels: Array<{ statement: string; truthLabel: "VERIFIED" | "INFERRED" | "UNKNOWN"; sourceId?: string }>;
}
```

Q1 fails if it makes unsupported whole-business success claims, leaves the first customer broad when specificity is possible, gives an unfalsifiable test, presents inference as verified truth, or recommends substantial building before cheaper demand evidence.

## 6. Q2 — DailyExecutionPacket + DeliverableAsset

The governing change is:

> **When GhostTown can reasonably produce a finished execution asset, the customer receives the finished asset rather than a description of what to create.**

Canonical packet:

```ts
interface DailyExecutionPacket {
  dayNumber: number;
  title: string;
  objective: string;
  whyThisDayExists: string;
  targets: ExecutionTarget[];
  actions: ExecutionAction[];
  assets: DeliverableAsset[];
  expectedOutcome: string;
  successThreshold: string;
  evidenceToCapture: string[];
  branchRules: BranchRule[];
  estimatedMinutes: number;
  completionDefinition: string;
}
```

Canonical deliverable:

```ts
interface DeliverableAsset {
  assetId: string;
  dayNumber: number;
  type: string;
  title: string;
  finishedContent: string;
  personalizationFields: Array<{ name: string; description: string; required: boolean }>;
  usageInstructions: string;
  targetChannel?: string;
  targetIds: string[];
  capabilities: { copyReady: boolean; editable: boolean; downloadable: boolean; openable: boolean };
  evidenceExpected: string[];
  version: string;
}
```

This does **not** pass:

```text
Prepared asset: LinkedIn outreach script
```

A passing Day Packet supplies the target, finished first message, finished follow-ups, copy/open actions, success threshold, evidence to record, and IF/THEN next action.

All-30-days acceptance:

```text
30/30 DailyExecutionPackets
30/30 measurable completion definitions
30/30 evidence requirements
30/30 usable primary assets or explicitly justified non-asset actions
branch rules where uncertainty requires adaptation
asset lineage preserved
```

The successful paid Blueprint produced before this quality phase becomes **GhostTown Quality Baseline 001** for comparison.

## 7. Q3 — Blueprint Quality + Premium Document

Keep the Executable Blueprint information architecture. Upgrade the substance.

First-priority sections:

```text
48-Hour Launch Card
First Customer
First Offer
First Revenue Path
Customer Access Network
Today / Daily Execution
```

Each high-value section follows:

```text
DECISION
↓
WHY
↓
EVIDENCE
↓
READY-TO-USE ASSETS
↓
MEASUREMENT
↓
ADAPTATION RULE
```

Use specialized logical generation boundaries rather than one monolithic prompt:

```text
Canonical Evidence
→ First Customer Factory
→ Offer Factory
→ First Revenue Factory
→ Access Network Factory
→ Daily Asset Factory
→ Launch Site Conversion Factory
→ Document Composition Factory
→ Cross-surface consistency validator
→ red-team / quality gate
```

These are logical capability boundaries inside the existing architecture, not justification for a second orchestration framework.

Customer-facing download surface remains:

```text
Open Blueprint
PDF
```

Internal JSON and ZIP remain private canonical/system artifacts for integrity and recovery, not customer-facing clutter.

Preferred premium-document pipeline:

```text
Canonical Blueprint JSON
→ DocumentModel
→ HTML + CSS
→ tables / diagrams / SVG charts / callouts / imagery
→ document manifest
→ browser-grade render
→ PDF
→ hash
→ private R2
```

## 8. Q4 — Direct-Response Launch Site

The Launch Site is a commercial experiment, not a generated brochure.

Process:

```text
First Customer
→ pain / desired outcome
→ existing alternative
→ offer
→ mechanism / differentiated approach
→ evidence
→ objections
→ commercial ask
→ conversion architecture
→ copy
→ visual hierarchy
→ responsive render
→ critique
→ bounded repair
```

Required conversion jobs include Hero, specific promise, customer qualifier, pain/cost, mechanism, offer, inclusions, how it works, evidence/proof, risk/scope boundary, CTA, objections, FAQ, and final CTA.

Generic filler such as "unlock your potential" or "revolutionize your workflow" fails unless evidence/context makes it specific.

The page must use deliberate visual hierarchy and relevant images/product visuals rather than behaving like a text-heavy PowerPoint template.

## 9. Q5 — Commercial Measurement

Minimum attributable chain:

```text
publication/source
→ qualified click
→ GhostTown session
→ test started
→ verdict completed
→ $97 offer viewed
→ checkout started
→ purchase
→ revenue
```

Post-purchase execution should also measure:

```text
Blueprint opened
→ Day Packet opened
→ asset used/copied
→ day completed
→ evidence recorded
→ checkpoints
```

This enables repair routing:

```text
low qualified traffic → Story Studio/distribution/targeting
traffic but low test start → GhostTown positioning/Launch Site
starts but low verdict completion → intake/verdict journey
verdicts but low $97 interest → offer/output/value communication
checkout but low purchase → trust/price/payment
purchase but low Blueprint use → deliverables/onboarding
Blueprint used but no commitments → strategy/target/offer/asset quality
```

## 10. Final GhostTown acceptance

After Q1–Q5 pass, resume existing Production Gates 26–35 so they certify the upgraded product. Do not weaken D1/R2/privacy/recovery/failure/visual requirements.

Gate 36 remains a human production-release decision.

## 11. Story Studio after release

Story Studio is both Content Factory and Experimental Acquisition System.

Calibration remains:

```text
Gate 39 / Slice A: 1 verdict × 2 creatives × 1 platform
Gate 40 / Slice B: 3 verdicts × several treatments × 2 platforms
Gate 41 / Slice C: 10 verdicts × 10 treatments = 100 masters
```

The slices prove machine readiness: generation, rendering, publishing, attribution, observation, quality floor, lineage, failure recovery, and experiment-ledger integrity.

Before Baseline 001, perform a Show/Treatment Portfolio Review. Existing show concepts receive `KEEP`, `EVOLVE`, `REPLACE`, `MERGE`, or `RETIRE`. The exact ten treatments must be versioned in a Treatment Registry.

Baseline 001 remains:

```text
100 GhostTown verdicts
× 10 experimental treatments
= 1,000 controlled master creatives
```

Observation windows:

```text
1 hour
24 hours
72 hours
7 days
```

After Baseline 001, approximately 80% of production/distribution capacity exploits known or predicted winners while approximately 20% continues exploration. Winners are mutated and future verdicts are routed using accumulated performance evidence.

## 12. Quality receipts

Every Q gate leaves a machine-readable receipt with contract version, input/output hashes, structural/usefulness/consistency/visual checks, baseline comparison, decision, Git SHA, and timestamp.

No Q gate passes from an LLM score alone.

## 13. Autopilot integration

Do not renumber existing Production Gates 1–47.

Machine files:

```text
config/production-roadmap-47-gates.json
config/infrastructure-freeze-policy-v1.json
config/commercial-quality-roadmap-v1.json
scripts/roadmap-master-autopilot.mjs
scripts/roadmap-infrastructure-freeze.mjs
scripts/commercial-quality-roadmap-autopilot.mjs
```

`npm run roadmap:autopilot` remains the operator command.

Master logic:

```text
if Gates 1–25 are not PASS:
    run existing production lane

run Infrastructure Freeze

if Q1–Q5 are not PASS:
    run next Commercial Quality gate

if Q1–Q5 PASS:
    resume Production Gate 26

Gate 36:
    always require human production-release authorization

post-release:
    resume Story Studio production/learning gates
```

## 14. Immediate implementation order

```text
I0 — Infrastructure Freeze + Commercial Quality Roadmap integration
↓
Q1 — Verdict Decision v2
↓
Q2 — DailyExecutionPacket + DeliverableAsset
↓
Q3 — Blueprint Quality + Premium Document
↓
Q4 — Direct-Response Launch Site
↓
Q5 — Commercial Measurement
```

No substantive unrelated feature begins before I0 passes.

## 15. Non-negotiable rules

1. Freeze infrastructure unless customer/commercial value requires change.
2. Do not confuse schema completeness with customer-value completeness.
3. Do not confuse an asset description with a finished asset.
4. Do not let AI quality scores overrule customer behavior.
5. Improve underlying content before cosmetic PDF work.
6. Treat the Launch Site as a conversion experiment.
7. Preserve truth/provenance.
8. Preserve the existing 47 production-gate IDs.
9. Never bypass Gate 36.
10. Do not make 30–50 videos a permission gate for Baseline 001.
11. Do not optimize treatments away before the large baseline is complete.
12. Preserve lineage from verdict → treatment → creative → publication → behavior → revenue.
13. Preserve Story Studio as both a content factory and acquisition experiment engine.
14. Let validated learning change production.
15. Judge the system by measurable customer/business outcomes.
