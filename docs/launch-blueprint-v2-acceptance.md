# Launch Blueprint v2 acceptance fixture

The board-game subscription purchase from July 31, 2026 is the first regression fixture.

The v2 product must not pass acceptance unless it produces one coherent **GhostTown Launch Blueprint** containing strategy, current distribution research, prepared assets, a working Launch Site, account storage, and the complete thirty-day execution system.

## Pre-purchase acceptance

1. The free verdict is delivered before purchase.
2. Three optional micro-commitments appear before the paid CTA:
   - one brand/product the target customer buys;
   - one podcast, YouTube channel, or creator they consume;
   - one association, event, newsletter, publication, or community they trust.
3. Every answer produces an immediate useful insight.
4. Every card supports **Show suggestions** and **I’m not sure**.
5. Skipping all three does not block checkout.
6. Selected signals persist and prefill the paid intake.

## Paid Blueprint acceptance

The artifact must not pass unless it produces:

1. A founding-family subscription pilot rather than a generic “narrow manual pilot” sentence.
2. A preference profile, curated first selection, use guide, fit review, and founding-member decision.
3. A concrete test price and controlled lower/upper boundaries.
4. A narrow target-customer and positioning plan.
5. A populated landing-page and Launch Site configuration on Day 1.
6. Ten to twenty-five current, sourced Media & Distribution targets across at least three target types.
7. Competitor/audience evidence, access path, prepared asset, matching script, risk, and first action for every priority target.
8. Five finished helpful posts.
9. Twelve relationship-specific outreach scripts.
10. Complete landing-page, FAQ, thank-you, and confirmation-email copy.
11. Four weekly priorities with milestones and success metrics.
12. Thirty daily actions that use prepared GhostTown assets.
13. A fail-closed result when research is absent, stale, unattributed, incomplete, or cannot be stored privately.
14. Private PDF and canonical JSON saved to the owner account.
15. A downloadable ZIP containing the finished research, scripts, posts, landing copy, Launch Site config, calendar, metrics, and sources.

## Post-purchase intake acceptance

1. Payment enters `awaiting_seeds`.
2. The customer sees the pre-purchase map carried forward.
3. The customer confirms exactly two or three verified commercial seed domains.
4. Audience and ecosystem signals are preserved without repeating the questions.
5. The Workflow does not begin until confirmation.
6. Inputs lock after the Workflow begins.

## Working Cloudflare Launch Site acceptance

1. The customer can publish and unpublish the Launch Site from the Blueprint.
2. The public URL renders the canonical Blueprint’s offer, pricing, positioning, landing copy, deliverables, FAQ, proof boundary, and CTA.
3. The website is explicitly presented as the working implementation of the Blueprint’s landing-page section—not an unrelated bonus.
4. Public lead capture works with abuse protection and consent text.
5. Leads are private to the owning account and exportable as CSV.
6. No order IDs, private account fields, source receipts, secrets, or storage keys are publicly exposed.
7. Unpublishing removes public access without deleting the Blueprint.

## Account and recovery acceptance

1. Blueprint SPA, PDF, JSON, and ZIP remain available after sign-out/sign-in.
2. They are available on another authenticated device.
3. Progress, evidence notes, metrics, leads, and final decision persist.
4. Another account cannot open or download the order.

## Final release gate

PR #7 must remain draft until:

- CI passes;
- live provider credentials and Cloudflare bindings are configured outside Git;
- one complete Stripe test-mode board-game order passes the entire flow;
- the actual PDF is visually reviewed;
- the public Launch Site is visually reviewed on mobile and desktop;
- one public test lead is captured and recovered by the owner;
- a forced failure remains failed/retryable and never becomes falsely ready.
