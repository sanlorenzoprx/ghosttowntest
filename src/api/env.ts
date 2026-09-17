type LaunchBlueprintWorkflowStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'errored'
  | 'terminated'
  | 'complete'
  | 'waiting'
  | 'waitingForPause'
  | 'unknown';

interface LaunchBlueprintWorkflowInstanceBinding {
  id: string;
  status(): Promise<{ status: LaunchBlueprintWorkflowStatus; error?: { name: string; message: string }; output?: unknown }>;
}

interface LaunchBlueprintWorkflowBinding {
  create(options: {
    id: string;
    params: { orderId: string; eventId: string };
  }): Promise<{ id: string }>;
  get(id: string): Promise<LaunchBlueprintWorkflowInstanceBinding>;
}

interface BrowserRunBinding {
  quickAction(action: 'pdf', options: {
    html: string;
    pdfOptions?: {
      printBackground?: boolean;
      preferCSSPageSize?: boolean;
      landscape?: boolean;
      scale?: number;
    };
  }): Promise<Response>;
}

export interface Env {
  KV: KVNamespace;
  AI: Ai;
  DB?: D1Database;
  VIDEOS?: R2Bucket;
  BLUEPRINTS?: R2Bucket;
  BROWSER?: BrowserRunBinding;
  LAUNCH_BLUEPRINT_WORKFLOW?: LaunchBlueprintWorkflowBinding;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  VERTEX_VERDICT_MODEL?: string;
  VERTEX_SELECTION_MODEL?: string;
  VERTEX_RESEARCH_MODEL?: string;
  VERTEX_BLUEPRINT_MODEL?: string;
  VERTEX_WEBSITE_MODEL?: string;
  // Legacy names remain optional during acceptance migration only. Runtime inference must not use them.
  AI_MODEL?: string;
  ACTION_PLAN_AI_MODEL?: string;
  GEMINI_RESEARCH_MODEL?: string;
  GEMINI_GOOGLE_SEARCH_MODEL?: string;
  DISTRIBUTION_FOOTPRINT_ENABLED?: string;
  PAID_BLUEPRINT_RESEARCH_ENABLED?: string;
  DISTRIBUTION_FOOTPRINT_BATCH_SIZE?: string;
  INTERNAL_RESEARCH_OWNER_EMAILS?: string;
  FRONTEND_URL?: string;
  DEPLOYMENT_ENV?: 'production' | 'acceptance' | 'development';
  LIT_API_KEY?: string;
  STORY_STUDIO_EVIDENCE_API_KEY?: string;
  STORY_STUDIO_URL?: string;
  GEMINI_API_KEY?: string;
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  PODCAST_INDEX_API_KEY?: string;
  PODCAST_INDEX_API_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  VERTEX_BLUEPRINT_REQUIRED?: string;
  VERTEX_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;
  VERTEX_SERVICE_ACCOUNT_EMAIL?: string;
  VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_PAID_TEST_PRICE_ID?: string;
  STRIPE_30_DAY_PLAN_PRICE_ID?: string;
  STRIPE_GET_ME_LIVE_PRICE_ID?: string;
  CLOUDFLARE_OAUTH_CLIENT_ID?: string;
  CLOUDFLARE_OAUTH_CLIENT_SECRET?: string;
  CLOUDFLARE_OAUTH_SCOPES?: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
}
