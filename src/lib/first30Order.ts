// First 30 orders are created with the `gtf_` prefix (FIRST30_CHECKOUT_OFFER in
// src/api/paidTestCheckout.ts); the $97 Sprint uses `gtt_`.
export function isFirst30OrderId(orderId: string | undefined): boolean {
  return Boolean(orderId?.startsWith('gtf_'));
}
