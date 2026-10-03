# GhostTown Production Customer Journey — Proof Record

## Surface proof

Status: **PASS**

Production surface proof run:

- GitHub Actions run: `37129441429`
- Harness commit: `d90334dcb1d31b792f32b63b03092cb77a4d8e93`
- Production Worker asserted: `a5514c69-5485-49d1-8a39-1bc43cbc2484`
- Receipt artifact: `ghosttown-production-surface-proof-37129441429`
- Artifact ID: `11276002875`
- Artifact digest: `sha256:3f3aa3f3fdbfce69f8f3173860373cb6345dcbed352a362b1fed3326106016f7`
- Finished: `2026-10-03T14:24:30.105Z`

Receipt-backed stages passed:

1. exact production Worker health/version attribution;
2. invalid-token protected-route rejection with HTTP 401;
3. English landing and primary CTA;
4. Spanish landing, Spanish CTA, and document language;
5. complete anonymous free verdict through all 17 questions;
6. anonymous paid-offer account gate without creating a checkout;
7. mobile 390×844 landing with zero horizontal overflow.

Safety receipt:

- no real purchase completed;
- no provider mutation;
- no Sprint progress write;
- no domain mutation;
- no publish mutation;
- no synthetic production lead submitted;
- no dangerous request was blocked because none was attempted;
- no browser page errors;
- no production API 5xx responses.

## Full canary proof

Status: **NOT RUN YET**

Full scope is intentionally gated on a dedicated production canary identity and pre-existing canary paid state. The harness will not spend real money or create a hidden production backdoor to manufacture paid entitlements.

Required GitHub Environment secrets:

- `PCJ_CANARY_EMAIL`
- `PCJ_CANARY_PASSWORD`

The account must already own at least one ready `launch_blueprint_v2` with a linked live Get Me Live order. The harness discovers that lineage automatically and requires exactly one eligible pair. Optional `PCJ_SPRINT_ORDER_ID`, `PCJ_GML_ORDER_ID`, and `PCJ_LIVE_URL` secrets are only needed to disambiguate an account with multiple eligible pairs.

## Reuse rule

Keep production mutation policy stricter than product-specific acceptance. Production journey harnesses may observe and exercise reversible UI behavior, but provider changes, real purchases, publishing, domain attachment, and durable execution-progress writes belong in pre-production acceptance unless a future product explicitly defines a disposable production canary contract.
