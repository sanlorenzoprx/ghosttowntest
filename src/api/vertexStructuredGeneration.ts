import type { Env } from './env';

export type VertexResponseSchema = {
  type: 'OBJECT' | 'ARRAY' | 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN';
  description?: string;
  nullable?: boolean;
  enum?: string[];
  properties?: Record<string, VertexResponseSchema>;
  required?: string[];
  items?: VertexResponseSchema;
  minItems?: number;
  maxItems?: number;
};

interface VertexServiceAccountConfig {
  projectId: string;
  location: string;
  model: string;
  clientEmail: string;
  privateKey: string;
  privateKeyId?: string;
}

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface VertexGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  modelVersion?: string;
  responseId?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface VertexStructuredStageReceipt {
  stage: string;
  model: string;
  modelVersion?: string;
  responseId?: string;
  promptHash: string;
  responseHash: string;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  completedAt: string;
}

export interface VertexStructuredStageResult<T> {
  data: T;
  receipt: VertexStructuredStageReceipt;
}

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_CACHE_PREFIX = 'vertex_blueprint_access_token_v1_';

function text(value: string | undefined): string {
  return value?.trim() || '';
}

export function vertexBlueprintRequired(env: Env): boolean {
  return text(env.VERTEX_BLUEPRINT_REQUIRED).toLowerCase() !== 'false';
}

export function vertexServiceAccountConfig(env: Env): VertexServiceAccountConfig {
  const config = {
    projectId: text(env.VERTEX_PROJECT_ID),
    location: text(env.VERTEX_LOCATION) || 'us-central1',
    model: text(env.VERTEX_BLUEPRINT_MODEL) || 'gemini-2.5-flash',
    clientEmail: text(env.VERTEX_SERVICE_ACCOUNT_EMAIL),
    privateKey: text(env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY).replace(/\\n/g, '\n'),
    privateKeyId: text(env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID) || undefined
  };
  const missing = Object.entries({
    VERTEX_PROJECT_ID: config.projectId,
    VERTEX_SERVICE_ACCOUNT_EMAIL: config.clientEmail,
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: config.privateKey
  }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Vertex Blueprint configuration is missing: ${missing.join(', ')}`);
  if (!/^[a-z0-9-]+$/i.test(config.projectId)) throw new Error('VERTEX_PROJECT_ID has an invalid format');
  if (!/^[a-z0-9-]+$/i.test(config.location)) throw new Error('VERTEX_LOCATION has an invalid format');
  if (!/^[a-z0-9._-]+$/i.test(config.model)) throw new Error('VERTEX_BLUEPRINT_MODEL has an invalid format');
  return config;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function pemBytes(pem: string): Uint8Array {
  const encoded = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!encoded) throw new Error('Vertex service-account private key is empty');
  try {
    const binary = atob(encoded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    throw new Error('Vertex service-account private key is not valid PKCS#8 PEM');
  }
}

async function signedAssertion(config: VertexServiceAccountConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header: Record<string, string> = { alg: 'RS256', typ: 'JWT' };
  if (config.privateKeyId) header.kid = config.privateKeyId;
  const claims = {
    iss: config.clientEmail,
    scope: CLOUD_PLATFORM_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(config.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

function cacheKey(config: VertexServiceAccountConfig): string {
  const identity = `${config.projectId}:${config.clientEmail}`;
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${TOKEN_CACHE_PREFIX}${(hash >>> 0).toString(16)}`;
}

async function accessToken(env: Env, config: VertexServiceAccountConfig): Promise<string> {
  const key = cacheKey(config);
  const cachedRaw = await env.KV.get(key);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedAccessToken;
      if (cached.accessToken && cached.expiresAt > Date.now() + 120_000) return cached.accessToken;
    } catch {
      await env.KV.delete(key);
    }
  }

  const assertion = await signedAssertion(config);
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const body = await response.json() as GoogleTokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `Vertex OAuth token exchange returned HTTP ${response.status}`);
  }
  const expiresIn = Math.max(300, Math.min(3600, Number(body.expires_in) || 3600));
  const cached: CachedAccessToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + expiresIn * 1000
  };
  await env.KV.put(key, JSON.stringify(cached), { expirationTtl: Math.max(60, expiresIn - 120) });
  return body.access_token;
}

export function vertexGenerateContentUrl(config: Pick<VertexServiceAccountConfig, 'projectId' | 'location' | 'model'>): string {
  const host = config.location === 'global'
    ? 'aiplatform.googleapis.com'
    : `${config.location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(config.model)}:generateContent`;
}

function parseJson<T>(value: string): T {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced || value).trim();
  const firstObject = source.indexOf('{');
  const firstArray = source.indexOf('[');
  const start = firstObject < 0 ? firstArray : firstArray < 0 ? firstObject : Math.min(firstObject, firstArray);
  const end = Math.max(source.lastIndexOf('}'), source.lastIndexOf(']'));
  if (start < 0 || end <= start) throw new Error('Vertex structured stage returned no JSON value');
  return JSON.parse(source.slice(start, end + 1)) as T;
}

function fnvHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function runVertexStructuredStage<T>(
  env: Env,
  options: {
    stage: string;
    systemInstruction: string;
    prompt: string;
    responseSchema: VertexResponseSchema;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
  }
): Promise<VertexStructuredStageResult<T>> {
  const config = vertexServiceAccountConfig(env);
  const token = await accessToken(env, config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 45_000);
  let response: Response;
  try {
    response = await fetch(vertexGenerateContentUrl(config), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [{ text: options.systemInstruction }]
        },
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema
        }
      })
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Vertex ${options.stage} stage timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const body = await response.json() as VertexGenerateContentResponse;
  if (!response.ok) throw new Error(body.error?.message || `Vertex ${options.stage} returned HTTP ${response.status}`);
  const output = body.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
  if (!output) throw new Error(`Vertex ${options.stage} returned no structured content`);
  const data = parseJson<T>(output);
  return {
    data,
    receipt: {
      stage: options.stage,
      model: config.model,
      modelVersion: body.modelVersion,
      responseId: body.responseId,
      promptHash: fnvHash(options.prompt),
      responseHash: fnvHash(output),
      promptTokenCount: body.usageMetadata?.promptTokenCount,
      candidatesTokenCount: body.usageMetadata?.candidatesTokenCount,
      totalTokenCount: body.usageMetadata?.totalTokenCount,
      completedAt: new Date().toISOString()
    }
  };
}
