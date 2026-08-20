import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness, type TestHarness } from "wrangler";

let server: TestHarness;

describe("GhostTown production Worker build harness", () => {
  beforeAll(async () => {
    server = createTestHarness({
      workers: [{
        config: {
          name: "ghosttown-runtime-harness",
          main: "src/api/worker.ts",
          compatibility_date: "2024-01-01",
          vars: {
            DEPLOYMENT_ENV: "development",
            FRONTEND_URL: "http://127.0.0.1:5300",
            AI_GATEWAY_ID: "default",
            VERTEX_VERDICT_MODEL: "gemini-3.5-flash-lite",
            VERTEX_SELECTION_MODEL: "gemini-3.5-flash-lite",
            VERTEX_RESEARCH_MODEL: "gemini-3.5-flash",
            VERTEX_BLUEPRINT_MODEL: "gemini-3.5-flash",
            VERTEX_WEBSITE_MODEL: "gemini-3.5-flash",
            JWT_SECRET: "runtime_harness_jwt_secret",
            STRIPE_SECRET_KEY: "sk_test_runtime_harness",
            STRIPE_PRICE_ID: "price_runtime_harness",
            STRIPE_WEBHOOK_SECRET: "whsec_runtime_harness"
          }
        }
      }]
    });
    await server.listen();
  });

  afterAll(async () => {
    await server.close();
  });

  it("serves the production health route from a Wrangler-built Worker", async () => {
    const response = await server.fetch("/api/integrations/shorts-factory/health");
    expect(response.status).toBe(200);
    const body = await response.json() as {
      status?: string;
      service?: string;
      evaluation?: { primary?: string };
      live_publishing_enabled?: boolean;
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("ghosttowntest");
    expect(body.evaluation?.primary).toBe("google_vertex_ai_via_cloudflare_ai_gateway");
    expect(body.live_publishing_enabled).toBe(false);
  });
});
