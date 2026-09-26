# GhostTown Launch Blueprint v2.1.7 - Strategic Coherence Gate Amendment

**Amendment version:** `2.1.7`
**Change ID:** `GT-BP-2026-09-26-V2.1.7`
**Base canonical contract:** `2.1.1`
**Predecessor amendment:** `2.1.6`

## Product decision

GhostTown must not generate the paid 30-Day Sprint until one coherent commercial chain exists:

> **Customer -> problem -> buyer/payer -> current alternative -> test -> commitment -> fulfillment -> access path**

A complete-looking Sprint is not evidence that the underlying strategy is coherent. Strategy synthesis may propose a chain, but an independent fail-closed Strategic Coherence Gate must approve that chain before customer-facing 30-day assets are generated.

## 1. Hard pre-generation boundary

The Strategic Coherence Gate runs after evidence normalization and strategy synthesis and before asset generation.

The generation order is:

```text
Evidence normalization
-> Strategy synthesis
-> STRATEGIC COHERENCE GATE
   PASS -> generate 30-day assets
   FAIL -> stop generation and report the blocking link(s)
-> Asset generation
-> Independent red-team review
-> Canonical release gates
```

A failed coherence gate may not be converted into a warning. GhostTown must not manufacture a complete Sprint around unresolved strategic logic.

## 2. Required eight-link chain

The gate evaluates exactly these links:

1. **Customer** - the user or beneficiary whose problem is being addressed.
2. **Problem** - the concrete problem or costly/frustrating condition being tested.
3. **Buyer/payer** - the person or organization able and willing to authorize the requested commitment. GhostTown must not assume this is the same as the user.
4. **Current alternative** - the behavior, workaround, process, product, or service currently used instead. A competitor list alone is not a current alternative.
5. **Test** - a bounded experiment that exercises the same core value hypothesis as the proposed product.
6. **Commitment** - an observable action appropriate to the buyer/payer and test. Compliments and generic interest are not commitment.
7. **Fulfillment** - a specific, feasible way to deliver the test inside known founder time, cost, capability, safety, and operational constraints.
8. **Access path** - a plausible route to the stated buyer/payer. Media, PR, backlinks, events, creators, or partners are not automatically customer-access channels merely because they are relevant to the market.

## 3. Allowed gate statuses

Each link is classified as one of:

- `coherent`
- `testable_hypothesis`
- `unresolved`
- `contradictory`

A `testable_hypothesis` may pass only when the hypothesis is explicit, internally consistent, bounded, and testable without assuming the answer.

Any `unresolved` or `contradictory` link blocks Sprint generation.

## 4. Manual-proxy rule

GhostTown may use a manual or concierge test only when that test preserves the same:

- buyer/payer
- core problem
- value mechanism
- requested outcome
- meaningful commitment
- material risk profile

A manual proxy fails the gate when it silently changes the business being tested.

For safety-sensitive products, GhostTown must fail any manual proxy that introduces monitoring, intervention, escalation, clinical, financial, legal, or other high-consequence responsibility that is not clearly bounded and realistically fulfillable.

## 5. Buyer/payer rule

Naming a target user is not enough.

Before Sprint generation, GhostTown must be able to state who can authorize or pay for the proposed test. When the user, beneficiary, buyer, payer, caregiver, employer, provider, parent, sponsor, or partner may be different people, the relationship must be explicit rather than assumed.

If the payer is not yet known, the correct product action is to stop and identify the smallest missing evidence needed to resolve that uncertainty.

## 6. Access-path rule

Research evidence and customer access are separate concepts.

A source may prove that:

- competitors exist
- a problem is discussed
- an ecosystem exists
- relevant media or partners exist

That does not automatically prove the source is a practical route to the buyer/payer.

The gate must verify that at least one source-linked access path plausibly reaches the stated buyer/payer before the 30-Day Sprint is generated.

## 7. Failure behavior

When the gate fails:

- no 30-day customer assets are generated
- no Sprint is marked ready
- the workflow fails closed
- the failure names the blocking chain link
- the failure states the smallest evidence or decision required to continue

The system must prefer a short unresolved-strategy correction over thirty days of polished downstream work built on a weak premise.

## 8. Preserved boundaries

This amendment does not:

- change the $97 Sprint price
- change the current Free Verdict -> Sprint -> Get Me Live journey
- fold Get Me Live into the $97 Sprint
- weaken existing evidence, ownership, artifact-integrity, red-team, or release gates
- authorize automatic production deployment
- change the canonical base Blueprint blob
- require a second AI provider or new orchestration framework

The existing v2.1.6 Execution Intelligence behavior remains downstream of this gate.

No commercial, evidence, safety, ownership, fulfillment, artifact-integrity, or release requirement is waived by this amendment.

**Weakening approved outcomes remains prohibited.**
