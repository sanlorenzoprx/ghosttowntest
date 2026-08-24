import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import type { PaidTestOrder } from "../../src/types/paidTest";
import { handleSignup } from "../../src/api/auth";
import { handleLaunchSiteOwner } from "../../src/api/launchSite";
import { consumeHourlyRateLimit } from "../../src/api/runtimeControls";
import {
  checkoutAccessibilityBlueprintFixture,
  checkoutAccessibilityOrder,
} from "../fixtures/checkoutAccessibilityBlueprint";

function runtimeEnv(): Env {
  return env as unknown as Env;
}

describe("Slice C hardening on real local Cloudflare bindings", () => {
  it("enforces the hourly request ceiling atomically under concurrent D1 writes", async () => {
    const runtime = runtimeEnv();
    const now = new Date("2026-08-22T17:15:00.000Z");
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        consumeHourlyRateLimit(runtime, "slice-c-concurrency", 5, now),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(15);
    const row = await env.DB.prepare(
      "SELECT used FROM runtime_rate_limits WHERE scope = ? AND window_key = ?",
    )
      .bind("slice-c-concurrency", "2026-08-22T17")
      .first<{ used: number }>();
    expect(row?.used).toBe(5);
  });

  it("keeps Launch Site GET read-only and creates lifecycle state only on explicit publish", async () => {
    const runtime = runtimeEnv();
    const owner = "slice-c-owner@runtime.test";
    const signup = await handleSignup(
      new Request("https://runtime.test/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: owner, password: "runtime-password" }),
      }),
      runtime,
    );
    expect(signup.status).toBe(201);
    const { token } = (await signup.json()) as { token: string };

    const blueprint = checkoutAccessibilityBlueprintFixture();
    blueprint.ownerId = owner;
    blueprint.status = "ready";
    blueprint.qualityGate.passed = true;
    const order: PaidTestOrder = {
      ...checkoutAccessibilityOrder,
      orderId: blueprint.orderId,
      email: owner,
      verdictId: blueprint.sourceVerdictId,
      status: "ready",
      artifactType: "launch_blueprint_v2",
      updatedAt: new Date().toISOString(),
    };
    await env.KV.put(`paid_test_order_${order.orderId}`, JSON.stringify(order));
    await env.DB.prepare(`
      INSERT INTO launch_blueprints (
        order_id, owner_id, source_verdict_id, schema_version, status,
        blueprint_json, research_receipt_json, pdf_r2_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        blueprint.orderId,
        owner,
        blueprint.sourceVerdictId,
        blueprint.schemaVersion,
        blueprint.status,
        JSON.stringify(blueprint),
        "{}",
        `orders/${blueprint.orderId}/blueprint.pdf`,
        blueprint.createdAt,
        new Date().toISOString(),
      )
      .run();

    const before = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM launch_sites WHERE order_id = ?",
    )
      .bind(order.orderId)
      .first<{ count: number }>();
    expect(before?.count).toBe(0);

    const getResponse = await handleLaunchSiteOwner(
      new Request(
        `https://runtime.test/api/paid-test/orders/${order.orderId}/launch-site`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
      runtime,
      order.orderId,
      "get",
    );
    expect(getResponse.status).toBe(200);
    const getBody = (await getResponse.json()) as { site: unknown };
    expect(getBody.site).toBeNull();

    const afterRead = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM launch_sites WHERE order_id = ?",
    )
      .bind(order.orderId)
      .first<{ count: number }>();
    expect(afterRead?.count).toBe(0);

    const publishResponse = await handleLaunchSiteOwner(
      new Request(
        `https://runtime.test/api/paid-test/orders/${order.orderId}/launch-site/publish`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      ),
      runtime,
      order.orderId,
      "publish",
    );
    expect(publishResponse.status).toBe(200);

    const afterPublish = await env.DB.prepare(
      "SELECT status FROM launch_sites WHERE order_id = ?",
    )
      .bind(order.orderId)
      .first<{ status: string }>();
    expect(afterPublish?.status).toBe("published");
  });
});
