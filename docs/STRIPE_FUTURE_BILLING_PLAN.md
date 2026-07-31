# Future Stripe Billing plan

This is intentionally not implemented in the current one-time purchase repair.

1. Add separate recurring Stripe Products/Prices and keep their IDs in server-side environment configuration.
2. Create or reuse a Stripe Customer mapped to the authenticated internal user; never select plans or entitlements solely from browser input.
3. Create subscription-mode Checkout Sessions on the Worker and add authenticated Customer Portal session creation.
4. Persist subscription/customer/price identifiers, status, current period, cancellation state, and an application entitlement record.
5. Verify and process `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and any Checkout events required by the final flow.
6. Derive access from the persisted entitlement state, not redirects or frontend claims; make event processing retryable and order-independent.
7. Add sandbox tests for signup, renewals, failed invoices, cancellation now/at-period-end, reactivation, plan changes, portal return, and out-of-order/duplicate events before enabling live Billing.
