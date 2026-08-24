import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(here, "migrations"));
      return {
        miniflare: {
          compatibilityDate: "2024-01-01",
          kvNamespaces: ["KV"],
          r2Buckets: ["BLUEPRINTS", "VIDEOS"],
          d1Databases: {
            DB: "00000000-0000-0000-0000-000000000001"
          },
          bindings: {
            TEST_MIGRATIONS: migrations,
            DEPLOYMENT_ENV: "development",
            FRONTEND_URL: "http://127.0.0.1:5300",
            JWT_SECRET: "runtime_test_jwt_secret_123456789",
            STRIPE_SECRET_KEY: "sk_test_runtime_contract_123456789",
            STRIPE_PRICE_ID: "price_runtime_contract",
            STRIPE_PAID_TEST_PRICE_ID: "price_runtime_contract",
            STRIPE_30_DAY_PLAN_PRICE_ID: "price_runtime_contract",
            STRIPE_WEBHOOK_SECRET: "whsec_runtime_contract_123456789",
            AI_GATEWAY_ID: "default",
            VERTEX_PROJECT_ID: "ghosttown-runtime-test",
            VERTEX_LOCATION: "us",
            VERTEX_BLUEPRINT_MODEL: "gemini-3.5-flash",
            VERTEX_BLUEPRINT_REQUIRED: "true",
            VERTEX_SERVICE_ACCOUNT_EMAIL: "runtime-test@example.invalid",
            VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nRUNTIME_TEST_ONLY_NOT_REAL_123456789\\n-----END PRIVATE KEY-----"
          }
        }
      };
    })
  ],
  test: {
    include: ["tests/runtime/**/*.worker.test.ts"],
    setupFiles: ["./tests/runtime/apply-migrations.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: true
  }
});
