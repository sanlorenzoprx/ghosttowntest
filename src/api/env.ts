export interface Env {
  KV: KVNamespace;
  AI: Ai;
  AI_MODEL?: string;
  FRONTEND_URL?: string;
  LIT_API_KEY?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PAID_TEST_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
}
