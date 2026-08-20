declare module "cloudflare:workers" {
  interface ProvidedEnv {
    KV: KVNamespace;
    DB: D1Database;
    BLUEPRINTS: R2Bucket;
    VIDEOS: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
    DEPLOYMENT_ENV: "development";
    FRONTEND_URL: string;
    JWT_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_PRICE_ID: string;
    STRIPE_PAID_TEST_PRICE_ID: string;
    STRIPE_30_DAY_PLAN_PRICE_ID: string;
    STRIPE_WEBHOOK_SECRET: string;
    AI_GATEWAY_ID: string;
    VERTEX_PROJECT_ID: string;
    VERTEX_LOCATION: string;
    VERTEX_BLUEPRINT_MODEL: string;
    VERTEX_BLUEPRINT_REQUIRED: string;
    VERTEX_SERVICE_ACCOUNT_EMAIL: string;
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  }
}
export {};
