// Preserve the established paid fulfillment/report/PDF implementation while
// allowing Q5 to own only the Stripe checkout attribution boundary.
export * from './paidTestCore';
export { handlePaidTestCheckout } from './paidTestCheckout';
