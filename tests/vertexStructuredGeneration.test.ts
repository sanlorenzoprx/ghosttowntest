import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/api/env';
import {
  runVertexStructuredStage,
  vertexBlueprintRequired,
  vertexGenerateContentUrl,
  vertexServiceAccountConfig
} from '../src/api/vertexStructuredGeneration';

function fakeKv(): KVNamespace {
  const values = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    delete: vi.fn(async (key: string) => { values.delete(key); })
  } as unknown as KVNamespace;
}

function pem(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  const encoded = btoa(binary).match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PRIVATE KEY-----\n${encoded}\n-----END PRIVATE KEY-----`;
}

async function vertexEnv(): Promise<Env> {
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const privateKey = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
  return {
    KV: fakeKv(),
    AI: {} as Ai,
    VERTEX_BLUEPRINT_REQUIRED: 'true',
    VERTEX_PROJECT_ID: 'ghosttown-test-project',
    VERTEX_LOCATION: 'us-central1',
    VERTEX_BLUEPRINT_MODEL: 'gemini-2.5-flash',
    VERTEX_SERVICE_ACCOUNT_EMAIL: 'ghosttown@ghosttown-test-project.iam.gserviceaccount.com',
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: pem(privateKey),
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID: 'fixture-key-id',
    JWT_SECRET: 'fixture',
    STRIPE_SECRET_KEY: 'fixture',
    STRIPE_PRICE_ID: 'fixture',
    STRIPE_WEBHOOK_SECRET: 'fixture'
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Vertex structured generation service', () => {
  it('defaults to required and validates the service account configuration', () => {
    const env = {
      VERTEX_PROJECT_ID: 'project-1',
      VERTEX_SERVICE_ACCOUNT_EMAIL: 'service@example.iam.gserviceaccount.com',
      VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: 'key'
    } as Env;
    expect(vertexBlueprintRequired(env)).toBe(true);
    expect(vertexBlueprintRequired({ ...env, VERTEX_BLUEPRINT_REQUIRED: 'false' })).toBe(false);
    expect(vertexServiceAccountConfig(env)).toMatchObject({
      projectId: 'project-1',
      location: 'us-central1',
      model: 'gemini-2.5-flash'
    });
    expect(() => vertexServiceAccountConfig({} as Env)).toThrow('VERTEX_PROJECT_ID');
  });

  it('builds the regional publisher-model generateContent endpoint', () => {
    expect(vertexGenerateContentUrl({
      projectId: 'project-1',
      location: 'us-central1',
      model: 'gemini-2.5-flash'
    })).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/project-1/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent');
  });

  it('signs a service-account assertion, caches the OAuth token, and requests schema-controlled JSON', async () => {
    const env = await vertexEnv();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === 'https://oauth2.googleapis.com/token') {
        const form = new URLSearchParams(String(init?.body || ''));
        expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
        expect(form.get('assertion')?.split('.')).toHaveLength(3);
        return Response.json({ access_token: 'fixture-access-token', expires_in: 3600 });
      }
      const request = JSON.parse(String(init?.body)) as {
        generationConfig: { responseMimeType: string; responseSchema: unknown };
      };
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer fixture-access-token' });
      expect(request.generationConfig.responseMimeType).toBe('application/json');
      expect(request.generationConfig.responseSchema).toBeTruthy();
      return Response.json({
        candidates: [{ content: { parts: [{ text: '{"ok":true,"message":"structured"}' }] } }],
        modelVersion: 'gemini-2.5-flash-001',
        responseId: 'vertex-response-1',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
      });
    }));

    const options = {
      stage: 'fixture',
      systemInstruction: 'Return verified structured output.',
      prompt: 'Produce the fixture result.',
      responseSchema: {
        type: 'OBJECT' as const,
        properties: {
          ok: { type: 'BOOLEAN' as const },
          message: { type: 'STRING' as const }
        },
        required: ['ok', 'message']
      }
    };
    const first = await runVertexStructuredStage<{ ok: boolean; message: string }>(env, options);
    const second = await runVertexStructuredStage<{ ok: boolean; message: string }>(env, options);

    expect(first.data).toEqual({ ok: true, message: 'structured' });
    expect(first.receipt).toMatchObject({
      stage: 'fixture',
      model: 'gemini-2.5-flash',
      modelVersion: 'gemini-2.5-flash-001',
      responseId: 'vertex-response-1',
      totalTokenCount: 15
    });
    expect(second.data.ok).toBe(true);
    expect(calls.filter(call => call.url === 'https://oauth2.googleapis.com/token')).toHaveLength(1);
    expect(calls.filter(call => call.url.includes(':generateContent'))).toHaveLength(2);
  });
});
