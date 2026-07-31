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
  SOURCE_FEDERATION_ENABLED?: string;
  SOURCE_FEDERATION_MAX_SOURCES?: string;
  SOURCE_FEDERATION_BATCH_SIZE?: string;
  FRONTEND_URL?: string;
  LIT_API_KEY?: string;
  GEMINI_API_KEY?: string;
  YOUTUBE_API_KEY?: string;
  GITHUB_RESEARCH_TOKEN?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PAID_TEST_PRICE_ID?: string;
  STRIPE_30_DAY_PLAN_PRICE_ID?: string;
  STRIPE_WEBHOOK_SECRET: string;
}
