# LIT Verdict Contract

## Ownership

LIT-GhostTown evaluates an idea. Shorts Factory consumes the validated
structured verdict and packages it into content. Shorts Factory does not invent
or repair business conclusions.

## Required legacy fields

- `verdict_headline`
- `lit_score` (integer 0-100)
- `risk_level`
- `top_reason`
- `next_step`
- `source`

## Rich Phase 4F fields

- `ghost_town_risk`
- `buyer_pain_clarity`
- `willingness_to_pay_signal`
- `distribution_difficulty`
- `unfair_advantage_check`
- `business_model_weakness`
- `why_it_might_work`
- `why_it_might_fail`
- `killer_question`
- `mvp_test`
- `warnings`
- `provenance`

Risk fields use `low | medium | high`. Signal fields use
`weak | medium | strong`. Warnings are strings.

## Validation rules

All rich fields are required for a verdict to be marked rich. Text must be
specific and non-empty. The validator rejects unknown fields, out-of-range
scores, invalid enums, non-array warnings, malformed provenance, generic
advice, fake certainty, and unsupported market/statistical claims.

The evaluator must treat user input as supplied evidence, not verified market
fact. It must not add external statistics.

## Provider and provenance

The provider interface accepts normalized idea input plus deterministic scoring
signals. Phase 4F includes the deterministic `mock` provider, which needs no
network or AI key:

```json
{
  "source": "ai_verdict_engine",
  "provider": "mock",
  "model": "mock-lit-verdict-v1",
  "generated_at": "2026-01-01T00:00:00.000Z",
  "validated": true
}
```

The fixed mock timestamp is part of deterministic test provenance. It does not
claim that a live provider ran.

## Fallback behavior

- LIT validates provider output before returning it.
- Shorts Factory accepts complete rich verdicts and records their provenance.
- If rich fields are missing or invalid but all legacy fields are valid, Shorts
  Factory uses the legacy verdict, records `rich_verdict: false`, and writes a
  verdict warning.
- If any required legacy field is invalid, Shorts Factory uses its existing
  deterministic `api_fallback` path.

## Example response

```json
{
  "idea": {
    "name": "AI UGC Creator Agency",
    "description": "A manual short-form product-video service",
    "target_user": "small ecommerce brands",
    "market": "US"
  },
  "verdict_headline": "Promising, but distribution is the real test.",
  "lit_score": 78,
  "risk_level": "medium",
  "ghost_town_risk": "medium",
  "top_reason": "The offer is clear but the buyer path still needs direct proof.",
  "buyer_pain_clarity": "strong",
  "willingness_to_pay_signal": "medium",
  "distribution_difficulty": "high",
  "unfair_advantage_check": "No durable advantage is established yet.",
  "business_model_weakness": "The offer may be valued without replacing the current workaround.",
  "why_it_might_work": "The supplied buyer problem is specific and testable.",
  "why_it_might_fail": "Interested buyers may not commit money to a pilot.",
  "killer_question": "Who needs this urgently enough to pay before the product exists?",
  "mvp_test": "Offer 10 manual pilots and require 3 paid commitments.",
  "next_step": "Sell a paid manual pilot to a narrow buyer list.",
  "warnings": [],
  "provenance": {
    "source": "ai_verdict_engine",
    "provider": "mock",
    "model": "mock-lit-verdict-v1",
    "generated_at": "2026-01-01T00:00:00.000Z",
    "validated": true
  },
  "source": "lit_api"
}
```
