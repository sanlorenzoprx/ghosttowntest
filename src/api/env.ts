export interface Env {
  KV: KVNamespace;
  AI: Ai;
  DB?: D1Database;
  VIDEOS?: R2Bucket;
  BLUEPRINTS?: R2Bucket;
  AI_MODEL?: string;
  ACTION_PLAN_AI_MODEL?: string;
  GEMINI_RESEARCH_MODEL?: string;
  GOOGLE_SEARCH_GROUNDING_ENABLED?: string;
  FRONTEND_URL?: string;
  LIT_API_KEY?: string;
  GEMINI_API_KEY?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PAID_TEST_PRICE_ID?: string;
  STRIPE_30_DAY_PLAN_PRICE_ID?: string;
  STRIPE_WEBHOOK_SECRET: string;
}
