interface LaunchBlueprintWorkflowBinding {
  create(options: {
    id: string;
    params: { orderId: string; eventId: string };
  }): Promise<{ id: string }>;
}

export interface Env {
  KV: KVNamespace;
  AI: Ai;
  DB?: D1Database;
  VIDEOS?: R2Bucket;
  BLUEPRINTS?: R2Bucket;
  LAUNCH_BLUEPRINT_WORKFLOW?: LaunchBlueprintWorkflowBinding;
  AI_MODEL?: string;
  ACTION_PLAN_AI_MODEL?: string;
  GEMINI_RESEARCH_MODEL?: string;
  GEMINI_GOOGLE_SEARCH_MODEL?: string;
  DISTRIBUTION_FOOTPRINT_ENABLED?: string;
  DISTRIBUTION_FOOTPRINT_BATCH_SIZE?: string;
  INTERNAL_RESEARCH_OWNER_EMAILS?: string;
  FRONTEND_URL?: string;
  LIT_API_KEY?: string;
  SHORTS_FACTORY_RESEARCH_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  PODCAST_INDEX_API_KEY?: string;
  PODCAST_INDEX_API_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PAID_TEST_PRICE_ID?: string;
  STRIPE_30_DAY_PLAN_PRICE_ID?: string;
  STRIPE_WEBHOOK_SECRET: string;
}
