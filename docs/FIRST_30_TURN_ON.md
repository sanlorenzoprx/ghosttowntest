# Turning First 30 sales on

First 30 is built (Blueprint contract v2.1.14) and switched off in production. Turning it on is a founder decision. Do the steps in order; each can be undone.

## What a buyer gets

$297 paid once: the 30-day plan (the Launch Blueprint Sprint) and the customer-acquisition website (Get Me Live), with no second charge. Full refund until the website build starts; the build starts the first time the founder asks GhostTown to build the website preview.

## Steps

1. **Stripe price.** In Stripe (live mode), create a product "First 30" with a one-time price of $297.00 USD. Copy the price ID (`price_…`).
2. **Secret.** Set it on the production Worker:
   `wrangler secret put STRIPE_FIRST_30_PRICE_ID --env production`
3. **Webhook events.** In Stripe → Developers → Webhooks, make sure the production endpoint sends `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
4. **Worker switch.** After releasing the proven Worker, open Cloudflare → Workers & Pages → `lit-ghost-town-api-production` → Settings → Variables and Secrets. Set the text variable `FIRST30_CHECKOUT_ENABLED` to `true` and deploy that variable change. The release workflow uses `--keep-vars`, so editing `wrangler.toml` alone does not change the deployed flag. Agents then see First 30 as available at $297.
5. **Site switch.** Run Production Pages Release with `post_verdict_offer = first30` and the proven `expected_main_sha`. This workflow builds locally and passes the choice as `VITE_POST_VERDICT_OFFER`; Cloudflare project build variables do not configure this direct upload. The verdict page then shows the First 30 purchase panel instead of the email list.
6. **Test purchase.** Buy First 30 once with a real card, check that the plan and the "website included" notice appear, then refund it from the owner refund endpoint (`POST /api/internal/first30/refund` with `{ "orderId": "gtf_…" }`) before building the website.
7. **Tell the list.** Export the First 30 list (`GET /api/internal/first30-waitlist`) and send the "First 30 is open" email from your email tool. Each entry includes its unsubscribe link.

## Undo

Set `FIRST30_CHECKOUT_ENABLED = "false"` and the Production Pages Release `post_verdict_offer` back to `waitlist`, and release again. Existing First 30 orders keep working.

## Refunds

- Before the website build starts: `POST /api/internal/first30/refund` (owner only) refunds in full and closes the website.
- After it starts: the endpoint refuses (`FIRST30_REFUND_WINDOW_CLOSED`). If you still choose to refund from the Stripe dashboard, the `charge.refunded` event closes the order and website.
