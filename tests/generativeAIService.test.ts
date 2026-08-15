import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import {
  aiGatewayVertexUrl,
  generateAI,
  generateAIJson,
  resolveGenerativeModel
} from '../src/api/generativeAIService';

function fakeKv(): KVNamespace {
  const values = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    delete: vi.fn(async (key: string) => { values.delete(key); })
  } as unknown as KVNamespace;
}

function fakeAi(base = 'https://gateway.ai.cloudflare.com/v1/account/default/google-vertex-ai'): Ai {
  return {
    gateway: vi.fn((id: string) => {
      expect(id).toBe('default');
      return {
        getUrl: vi.fn(async (provider?: string) => {
          expect(provider).toBe('google-vertex-ai');
          return base;
        })
      };
    })
  } as unknown as Ai;
}

function pem(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  const encoded = btoa(binary).match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PRIVATE KEY-----\n${encoded}\n-----END PRIVATE KEY-----`;
}

async function env(): Promise<Env> {
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const privateKey = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
  return {
    KV: fakeKv(),
    AI: fakeAi(),
    AI_GATEWAY_ID: 'default',
    VERTEX_PROJECT_ID: 'ghosttown-test-project',
    VERTEX_LOCATION: 'us',
    VERTEX_VERDICT_MODEL: 'gemini-3.5-flash-lite',
    VERTEX_SELECTION_MODEL: 'gemini-3.5-flash-lite',
    VERTEX_RESEARCH_MODEL: 'gemini-3.5-flash',
    VERTEX_BLUEPRINT_MODEL: 'gemini-3.5-flash',
    VERTEX_WEBSITE_MODEL: 'gemini-3.5-flash',
    VERTEX_SERVICE_ACCOUNT_EMAIL: 'ghosttown@ghosttown-test-project.iam.gserviceaccount.com',
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: pem(privateKey),
    JWT_SECRET: 'fixture',
    STRIPE_SECRET_KEY: 'fixture',
    STRIPE_PRICE_ID: 'fixture',
    STRIPE_WEBHOOK_SECRET: 'fixture'
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GenerativeAIService', () => {
  it('maps all active generative tasks to task-specific Vertex model slots', () => {
    const configured = {
      VERTEX_VERDICT_MODEL: 'verdict-model',
      VERTEX_SELECTION_MODEL: 'selection-model',
      VERTEX_RESEARCH_MODEL: 'research-model',
      VERTEX_BLUEPRINT_MODEL: 'blueprint-model',
      VERTEX_WEBSITE_MODEL: 'website-model'
    } as Env;
    expect(resolveGenerativeModel(configured, 'verdict')).toBe('verdict-model');
    expect(resolveGenerativeModel(configured, 'candidate_selection')).toBe('selection-model');
    expect(resolveGenerativeModel(configured, 'grounded_research')).toBe('research-model');
    expect(resolveGenerativeModel(configured, 'blueprint')).toBe('blueprint-model');
    expect(resolveGenerativeModel(configured, 'custom_website')).toBe('website-model');
  });

  it('builds the provider-native Cloudflare AI Gateway URL for Vertex', async () => {
    const configured = await env();
    await expect(aiGatewayVertexUrl(configured, 'candidate_selection')).resolves.toBe(
      'https://gateway.ai.cloudflare.com/v1/account/default/google-vertex-ai/v1/projects/ghosttown-test-project/locations/us/publishers/google/models/gemini-3.5-flash-lite:generateContent'
    );
    await expect(aiGatewayVertexUrl(configured, 'custom_website')).resolves.toContain('/models/gemini-3.5-flash:generateContent');
  });

  it('uses short-lived Vertex OAuth upstream while routing generation through AI Gateway', async () => {
    const configured = await env();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === 'https://oauth2.googleapis.com/token') {
        const form = new URLSearchParams(String(init?.body || ''));
        expect(form.get('grant_type')).toBe('urn:ietf:params:oauth-grant-type:jwt-bearer'.replace('oauth-grant', 'oauth:grant'));
        return Response.json({ access_token: 'vertex-short-lived-token', expires_in: 3600 });
      }
      expect(url).toContain('/google-vertex-ai/v1/projects/ghosttown-test-project/locations/us/');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer vertex-short-lived-token' });
      return Response.json({
        candidates: [{
          content: { parts: [{ text: 'grounded answer' }] },
          groundingMetadata: {
            webSearchQueries: ['fixture query'],
            groundingChunks: [{ web: { uri: 'https://example.com/source', title: 'Fixture source' } }]
          }
        }],
        modelVersion: 'gemini-3.5-flash',
        responseId: 'response-1',
        usageMetadata: { totalTokenCount: 12 }
      });
    }));

    const result = await generateAI(configured, {
      task: 'grounded_research',
      prompt: 'Research this fixture.',
      googleSearch: true,
      temperature: 0
    });

    const gatewayRequest = calls.find(call => call.url.includes('/google-vertex-ai/'));
    const request = JSON.parse(String(gatewayRequest?.init?.body)) as { tools?: unknown[] };
    expect(request.tools).toEqual([{ google_search: {} }]);
    expect(result.text).toBe('grounded answer');
    expect(result.groundingMetadata?.webSearchQueries).toEqual(['fixture query']);
    expect(result.receipt).toMatchObject({
      provider: 'google_vertex_ai',
      gateway: 'cloudflare_ai_gateway',
      gatewayId: 'default',
      task: 'grounded_research',
      model: 'gemini-3.5-flash',
      totalTokenCount: 12
    });
    expect(JSON.stringify(result.receipt)).not.toContain('vertex-short-lived-token');
  });

  it('preserves schema-controlled structured output through the same service', async () => {
    const configured = await env();
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'vertex-short-lived-token', expires_in: 3600 });
      }
      const body = JSON.parse(String(init?.body)) as { generationConfig: Record<string, unknown> };
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      expect(body.generationConfig.responseSchema).toBeTruthy();
      return Response.json({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] });
    }));

    const output = await generateAIJson<{ ok: boolean }>(configured, {
      task: 'custom_website',
      prompt: 'Return structured fixture.',
      responseSchema: {
        type: 'OBJECT',
        properties: { ok: { type: 'BOOLEAN' } },
        required: ['ok']
      }
    });
    expect(output.data).toEqual({ ok: true });
    expect(output.result.receipt.task).toBe('custom_website');
  });
});
