import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/api/env';
import { handlePaidTestCheckout } from '../src/api/paidTestCheckout';
import { currentAgentOffer } from '../src/api/agentVerdict';
import { sprintCheckoutEnabled } from '../src/api/runtimeControls';
import {
  addModelUsage,
  addSearchUsage,
  emptyVerdictUsage,
  estimateVerdictCostUsd,
  VERDICT_COST_RATES_USD
} from '../src/api/verdictBudget';
import { GHOSTTOWN_FIRST_30_WAITLIST_V1, resolvePostVerdictOffer } from '../src/lib/ghosttownOffer';
import type { GenerateResult } from '../src/api/generativeAIService';

const read = (path: string) => readFileSync(path, 'utf8');

describe('rollout phase 1: free verdict with First 30 email list', () => {
  it('defaults the post-verdict offer to the First 30 list and only shows the Sprint on an explicit opt-in', () => {
    expect(resolvePostVerdictOffer(undefined)).toBe('first30_waitlist');
    expect(resolvePostVerdictOffer('')).toBe('first30_waitlist');
    expect(resolvePostVerdictOffer('$97.00')).toBe('first30_waitlist');
    expect(resolvePostVerdictOffer(' Sprint ')).toBe('sprint');
  });

  it('can switch the post-verdict offer to buying First 30', () => {
    expect(resolvePostVerdictOffer('first30')).toBe('first30');
    expect(resolvePostVerdictOffer(' FIRST30 ')).toBe('first30');
  });

  it('keeps First 30 copy honest about not being on sale', () => {
    expect(GHOSTTOWN_FIRST_30_WAITLIST_V1.headline).toBe('First 30 opens soon');
    expect(GHOSTTOWN_FIRST_30_WAITLIST_V1.truthBoundary).toMatch(/not on sale yet/);
    expect(GHOSTTOWN_FIRST_30_WAITLIST_V1.es.truthBoundary).toMatch(/no está a la venta/);
    const copy = JSON.stringify(GHOSTTOWN_FIRST_30_WAITLIST_V1);
    expect(copy).not.toMatch(/\$\d/);
  });

  it('weaves the customer research into the First 30 offer without overclaiming', () => {
    const landing = read('src/components/LandingCommercial.tsx');
    expect(landing).toContain('GhostTown finds places where your likely customers are already talking, researches the problems they describe, and uses what they say to shape your website and the messages and content you test during those 30 days.');
    expect(landing).toContain('GhostTown encuentra lugares donde tus posibles clientes ya conversan, investiga los problemas que describen y usa lo que dicen para dar forma a tu sitio web y a los mensajes y contenido que pruebas durante esos 30 días.');
    // Why it matters, in the customer's terms.
    expect(landing).toContain('That way you are not guessing what to say or where to say it: your website and first messages use the words your customers already use, in the places where they already talk.');
    expect(landing).toContain('Así no adivinas qué decir ni dónde decirlo: tu sitio web y tus primeros mensajes usan las palabras que tus clientes ya usan, en los lugares donde ya conversan.');
    // The primary offer leads; research shapes the website and the materials.
    const { promise, es } = GHOSTTOWN_FIRST_30_WAITLIST_V1;
    expect(promise).toHaveLength(es.promise.length);
    expect(promise[1]).toMatch(/^A customer-acquisition website .* what your likely customers actually say$/);
    expect(promise[2]).toMatch(/where they are already talking$/);
    expect(es.promise[1]).toMatch(/^Un sitio web para conseguir clientes/);
    // Finding some communities does not show where most buyers are.
    const copy = `${landing}\n${JSON.stringify(GHOSTTOWN_FIRST_30_WAITLIST_V1)}\n${read('public/llms.txt')}`;
    expect(copy).not.toMatch(/majority of|most of your (niche|customers|buyers)|la mayoría de tus/i);
  });

  it('closes new Sprint checkouts unless the Worker opts in', async () => {
    expect(sprintCheckoutEnabled({} as Env)).toBe(false);
    expect(sprintCheckoutEnabled({ SPRINT_CHECKOUT_ENABLED: 'false' } as Env)).toBe(false);
    expect(sprintCheckoutEnabled({ SPRINT_CHECKOUT_ENABLED: 'true' } as Env)).toBe(true);

    const response = await handlePaidTestCheckout(new Request('https://api.ghosttownverdict.app/api/paid-test/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }), {} as Env);
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'SPRINT_CHECKOUT_CLOSED' });
  });

  it('turns the Sprint off in production and keeps it proven in acceptance', () => {
    const wrangler = read('wrangler.toml');
    const production = wrangler.slice(wrangler.indexOf('[env.production.vars]'), wrangler.indexOf('[[env.production.kv_namespaces]]'));
    const acceptance = wrangler.slice(wrangler.indexOf('[env.acceptance.vars]'), wrangler.indexOf('[[env.acceptance.kv_namespaces]]'));
    expect(production).toContain('SPRINT_CHECKOUT_ENABLED = "false"');
    // First 30 sales stay closed in production until the founder turns them on.
    expect(production).toContain('FIRST30_CHECKOUT_ENABLED = "false"');
    expect(production).toContain('VERDICT_IP_HOURLY_LIMIT');
    expect(production).toContain('VERDICT_DAILY_COST_ALARM_USD');
    expect(acceptance).toContain('SPRINT_CHECKOUT_ENABLED = "true"');
  });

  it('keeps the Sprint code dormant rather than deleted', () => {
    const report = read('src/components/ResultReport.tsx');
    const landing = read('src/components/LandingCommercial.tsx');
    expect(report).toContain('SPRINT_OFFER_ACTIVE && <section id="thirty-day-plan"');
    expect(report).toContain('Start 30-Day Evidence Sprint checkout');
    expect(report).toContain('<First30Waitlist source="verdict"');
    expect(landing).toContain('<First30Waitlist source="landing"');
    expect(landing).toContain('A live website is not included; Get Me Live is a separate $297 one-time product.');
  });

  it('routes the agent verdict around the web limiter because it has its own', () => {
    expect(read('src/api/agentVerdict.ts')).toContain('verdictHandler(canonicalRequest, env, { callerRateLimited: true })');
  });

  it('keeps agent-facing files in step with the offer the API returns', () => {
    for (const file of ['public/llms.txt', 'public/llms-full.txt', 'public/agent/capabilities.md', 'public/agent/evidence.md', 'public/agent/examples.md', 'public/agent/privacy.md', 'public/distribution-channels.json']) {
      const text = read(file);
      expect(text, file).not.toContain('$97');
      expect(text, file).not.toContain('Evidence Sprint');
    }
    const offer = currentAgentOffer({ FRONTEND_URL: 'https://ghosttownverdict.app' } as Env);
    const schema = JSON.parse(read('public/openapi.json')).components.schemas.Offer;
    expect([...schema.required].sort()).toEqual(Object.keys(offer).sort());
    expect(schema.properties.status.enum).toContain(offer.status);
    expect(schema.properties.price_usd.type).toContain('null');
  });

  it('estimates verdict cost from tokens and searches', () => {
    const usage = emptyVerdictUsage();
    const receipt = { promptTokenCount: 2000, candidatesTokenCount: 500, thoughtsTokenCount: 100 } as GenerateResult['receipt'];
    addModelUsage(usage, receipt);
    addModelUsage(usage, receipt);
    addSearchUsage(usage, [
      { provider: 'dataforseo', status: 'complete', queryCount: 2, resultCount: 10 },
      { provider: 'youtube_api', status: 'complete', queryCount: 1, resultCount: 5 },
      { provider: 'podcast_index', status: 'failed', queryCount: 1, resultCount: 0 }
    ]);
    expect(usage).toMatchObject({ aiCalls: 2, promptTokens: 4000, outputTokens: 1000, thoughtsTokens: 200 });
    expect(usage.searches).toEqual({ dataforseo: 2, youtube_api: 1, podcast_index: 1 });

    const rates = VERDICT_COST_RATES_USD;
    const expected = (4000 * rates.inputPerMillionTokens + 1200 * rates.outputPerMillionTokens) / 1_000_000
      + 2 * rates.perSearch.dataforseo;
    expect(estimateVerdictCostUsd(usage)).toBeCloseTo(expected, 6);
    expect(estimateVerdictCostUsd(emptyVerdictUsage())).toBe(0);
  });
});
