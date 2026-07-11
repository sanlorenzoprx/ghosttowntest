export interface CheckoutRequest {
  email: string;
  token: string;
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
