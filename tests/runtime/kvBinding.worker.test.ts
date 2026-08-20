import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

describe("GhostTown real local KV contract", () => {
  it("round-trips owner-scoped records and exposes real list pagination shape", async () => {
    await env.KV.put("user_result_owner@example.com_11111111-1111-4111-8111-111111111111", JSON.stringify({ ok: true }));
    await env.KV.put("user_result_owner@example.com_22222222-2222-4222-8222-222222222222", JSON.stringify({ ok: true }));

    const result = await env.KV.list({ prefix: "user_result_owner@example.com_", limit: 1 });
    expect(result.keys).toHaveLength(1);
    expect(typeof result.list_complete).toBe("boolean");
    expect(typeof result.cursor).toBe("string");

    const first = await env.KV.get(result.keys[0].name, "json") as { ok?: boolean } | null;
    expect(first?.ok).toBe(true);

    if (!result.list_complete) {
      const second = await env.KV.list({
        prefix: "user_result_owner@example.com_",
        limit: 1,
        cursor: result.cursor
      });
      expect(second.keys.length).toBeGreaterThan(0);
    }
  });
});
