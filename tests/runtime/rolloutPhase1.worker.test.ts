import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import type { Env } from "../../src/api/env";
import { handleSignup } from "../../src/api/auth";
import {
  FIRST_30_WAITLIST_KEY_PREFIX,
  handleFirst30WaitlistExport,
  handleFirst30WaitlistJoin,
  type First30WaitlistEntry,
} from "../../src/api/first30Waitlist";
import { addToDailyCounter } from "../../src/api/runtimeControls";
import { emptyVerdictUsage, enforceVerdictRateLimit, recordVerdictCost } from "../../src/api/verdictBudget";

function runtimeEnv(extra: Partial<Env> = {}): Env {
  const base = env as unknown as Env;
  return {
    KV: base.KV,
    DB: base.DB,
    AI: base.AI,
    JWT_SECRET: base.JWT_SECRET,
    DEPLOYMENT_ENV: "development",
    ...extra,
  } as Env;
}

function join(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("https://runtime.test/api/first30/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("First 30 email list on real local bindings", () => {
  it("stores one consented entry per email and never trusts client consent text", async () => {
    const runtime = runtimeEnv();
    const first = await handleFirst30WaitlistJoin(join({
      email: " Founder@Example.com ",
      consent: true,
      consentText: "client-supplied text",
      source: "verdict",
      verdictId: "11111111-2222-4333-8444-555555555555",
      locale: "en-US",
    }), runtime);
    expect(first.status).toBe(201);

    const repeat = await handleFirst30WaitlistJoin(join({ email: "founder@example.com", consent: true, source: "landing", locale: "es-PR" }), runtime);
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toEqual({ status: "joined", list: "first30" });

    const listed = await env.KV.list({ prefix: FIRST_30_WAITLIST_KEY_PREFIX });
    const entries = await Promise.all(listed.keys.map(async key => JSON.parse(String(await env.KV.get(key.name))) as First30WaitlistEntry));
    const mine = entries.filter(entry => entry.email === "founder@example.com");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      source: "verdict",
      verdictId: "11111111-2222-4333-8444-555555555555",
      locale: "es",
    });
    expect(mine[0].consentText).not.toBe("client-supplied text");
    expect(mine[0].consentText).toMatch(/First 30/);
    expect(listed.keys.some(key => key.name.includes("founder@example.com"))).toBe(false);
  });

  it("rejects a missing consent or an invalid email", async () => {
    const runtime = runtimeEnv();
    expect((await handleFirst30WaitlistJoin(join({ email: "no-consent@example.com" }), runtime)).status).toBe(400);
    expect((await handleFirst30WaitlistJoin(join({ email: "not-an-email", consent: true }), runtime)).status).toBe(400);
  });

  it("limits signups from one connection", async () => {
    const runtime = runtimeEnv();
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      const response = await handleFirst30WaitlistJoin(join({ email: `burst-${index}@example.com`, consent: true }, "198.51.100.77"), runtime);
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every(status => status === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("exports the list only to configured owners", async () => {
    const owner = "list-owner@runtime.test";
    const runtime = runtimeEnv({ INTERNAL_RESEARCH_OWNER_EMAILS: owner });
    const signup = await handleSignup(new Request("https://runtime.test/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: owner, password: "runtime-password" }),
    }), runtime);
    const { token } = (await signup.json()) as { token: string };
    await handleFirst30WaitlistJoin(join({ email: "export-me@example.com", consent: true }, "192.0.2.5"), runtime);

    const anonymous = await handleFirst30WaitlistExport(new Request("https://runtime.test/api/internal/first30-waitlist"), runtime);
    expect(anonymous.status).toBe(401);

    const exported = await handleFirst30WaitlistExport(new Request("https://runtime.test/api/internal/first30-waitlist", {
      headers: { Authorization: `Bearer ${token}` },
    }), runtime);
    expect(exported.status).toBe(200);
    const body = (await exported.json()) as { count: number; entries: First30WaitlistEntry[] };
    expect(body.entries.map(entry => entry.email)).toContain("export-me@example.com");
    expect(body.count).toBe(body.entries.length);
  });
});

describe("POST /api/verdict budget on real local D1", () => {
  function verdictRequest(ip: string): Request {
    return new Request("https://runtime.test/api/verdict", { method: "POST", headers: { "CF-Connecting-IP": ip } });
  }

  it("limits verdicts per connection and per account", async () => {
    const now = new Date("2026-10-19T15:10:00.000Z");
    const runtime = runtimeEnv({ VERDICT_IP_HOURLY_LIMIT: "3", VERDICT_ACCOUNT_HOURLY_LIMIT: "2" });

    const byIp: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      const limited = await enforceVerdictRateLimit(verdictRequest("203.0.113.50"), runtime, undefined, now);
      byIp.push(limited?.status ?? 200);
    }
    expect(byIp).toEqual([200, 200, 200, 429]);

    const byAccount: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const limited = await enforceVerdictRateLimit(verdictRequest(`203.0.113.${60 + index}`), runtime, "Busy@Example.com", now);
      byAccount.push(limited?.status ?? 200);
    }
    expect(byAccount).toEqual([200, 200, 429]);

    const blocked = await enforceVerdictRateLimit(verdictRequest("203.0.113.50"), runtime, undefined, now);
    expect(blocked?.headers.get("Retry-After")).toBe("3000");
    expect(await blocked?.json()).toMatchObject({ code: "VERDICT_RATE_LIMITED" });
  });

  it("adds to a per-day counter atomically", async () => {
    const now = new Date("2026-10-19T08:00:00.000Z");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => addToDailyCounter(runtimeEnv(), "phase1-counter", 7, now)),
    );
    expect(Math.max(...results.map(result => result.after))).toBe(70);
    expect(new Set(results.map(result => result.after)).size).toBe(10);
  });

  it("logs a cost line for each verdict and raises the daily alarm exactly once", async () => {
    const now = new Date("2026-10-18T12:00:00.000Z");
    const hook = "https://alarm.runtime.test/hook";
    const runtime = runtimeEnv({ VERDICT_DAILY_COST_ALARM_USD: "0.002", VERDICT_COST_ALARM_WEBHOOK_URL: hook });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const usage = emptyVerdictUsage();
    usage.aiCalls = 3;
    usage.promptTokens = 4000;
    usage.outputTokens = 1000;
    for (let index = 0; index < 4; index += 1) {
      await recordVerdictCost(runtime, { resultId: `cost-${index}`, cacheHit: false, usedAI: true, authenticated: false, usage }, now);
    }

    const costLines = log.mock.calls.map(call => String(call[0])).filter(line => line.includes('"verdict_cost"'));
    expect(costLines).toHaveLength(4);
    expect(JSON.parse(costLines[0])).toMatchObject({ event: "verdict_cost", promptTokens: 4000, outputTokens: 1000, estimatedCostUsd: 0.0008 });

    const alarms = errors.mock.calls.map(call => String(call[0])).filter(line => line.includes("verdict_daily_cost_alarm"));
    expect(alarms).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(hook);

    const count = await env.DB.prepare("SELECT used FROM runtime_rate_limits WHERE scope = ? AND window_key = ?")
      .bind("verdict_count", "2026-10-18")
      .first<{ used: number }>();
    expect(count?.used).toBe(4);
  });
});
