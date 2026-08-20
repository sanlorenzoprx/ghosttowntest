import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

describe("GhostTown real local R2 contract", () => {
  it("round-trips bytes plus HTTP/custom metadata through R2ObjectBody", async () => {
    const key = "runtime/contracts/object.txt";
    await env.BLUEPRINTS.put(key, "runtime-body", {
      httpMetadata: {
        contentType: "text/plain; charset=utf-8",
        contentDisposition: 'attachment; filename="runtime.txt"'
      },
      customMetadata: {
        ownerId: "owner@example.com",
        contract: "ghosttown-runtime-v1"
      }
    });

    const object = await env.BLUEPRINTS.get(key);
    expect(object).not.toBeNull();
    expect(await object?.text()).toBe("runtime-body");
    expect(object?.httpMetadata?.contentType).toContain("text/plain");
    expect(object?.customMetadata?.ownerId).toBe("owner@example.com");
    expect(object?.httpEtag).toBeTruthy();
  });

  it("supports the arrayBuffer body method production delivery paths consume", async () => {
    const key = "runtime/contracts/object.bin";
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await env.BLUEPRINTS.put(key, bytes);
    const object = await env.BLUEPRINTS.get(key);
    expect(Array.from(new Uint8Array(await object!.arrayBuffer()))).toEqual([1, 2, 3, 4]);
  });
});
