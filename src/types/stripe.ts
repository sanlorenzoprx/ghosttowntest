export interface CheckoutRequest {
  token?: string;
}

export interface CheckoutResponse {
  sessionUrl?: string;
  error?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer_email: string;
      status: string;
      payment_status: string;
    };
  };
}

export interface StripeSession {
  id: string;
  customer_email: string;
  payment_status: string;
  url?: string;
}

export type StripeMode = 'test' | 'live';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'canceled' | 'partially_refunded' | 'refunded';
export type FulfillmentStatus = 'pending' | 'processing' | 'fulfilled' | 'failed' | 'revoked';

export interface StripeRefundRecord {
  id: string;
  amountCents: number;
  status: string;
  updatedAt: string;
}

export interface StripePrice {
  id: string;
  active: boolean;
  currency: string;
  livemode: boolean;
  type: 'one_time' | 'recurring';
  unit_amount: number | null;
  product: string | { id?: string } | null;
}

export interface AssessmentCreditOrder {
  orderId: string;
  ownerId: string;
  stripePriceId: string;
  stripeMode: StripeMode;
  amountCents: number;
  currency: string;
  credits: number;
  idempotencyKey: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  customerId?: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  stripeEventId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failureReason?: string;
  refundId?: string;
  refundedAmountCents?: number;
  refundedAt?: string;
  refundStatus?: string;
  refunds?: StripeRefundRecord[];
}
