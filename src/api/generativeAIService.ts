import type { Env } from './env';

export type GenerativeAITask =
  | 'verdict'
  | 'candidate_selection'
  | 'grounded_research'
  | 'blueprint'
  | 'custom_website';

export type GenerativeAIResponseSchema = {
  type: 'OBJECT' | 'ARRAY' | 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN';
  description?: string;
  nullable?: boolean;
  enum?: string[];
  properties?: Record<string, GenerativeAIResponseSchema>;
  required?: string[];
  items?: GenerativeAIResponseSchema;
  minItems?: number;
  maxItems?: number;
};

interface VertexServiceAccountConfig {
  projectId: string;
  location: string;
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
  error?: string;
  error_description?: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  groundingSupports?: Array<{
    segment?: { startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>;
}

interface VertexGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GroundingMetadata;
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  modelVersion?: string;
  responseId?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

export interface GenerativeAIReceipt {
  provider: 'google_vertex_ai';
  gateway: 'cloudflare_ai_gateway';
  gatewayId: string;
  task: GenerativeAITask;
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

export interface GenerateOptions {
  task: GenerativeAITask;
  prompt: string;
  systemInstruction?: string;
  responseSchema?: GenerativeAIResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  googleSearch?: boolean;
}

export interface GenerateResult {
  text: string;
  groundingMetadata?: GroundingMetadata;
  receipt: GenerativeAIReceipt;
}

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_CACHE_PREFIX = 'vertex_generative_ai_access_token_v1_';
const DEFAULT_GATEWAY_ID = 'default';
const DEFAULT_MODELS: Record<GenerativeAITask, string> = {
  verdict: 'gemini-3.5-flash-lite',
  candidate_selection: 'gemini-3.5-flash-lite',
  grounded_research: 'gemini-3.5-flash',
  blueprint: 'gemini-3.5-flash',
  custom_website: 'gemini-3.5-flash'
};

function text(value: string | undefined): string {
  return value?.trim() || '';
}

export function resolveGenerativeModel(env: Env, task: GenerativeAITask): string {
  const configured = task === 'verdict'
    ? env.VERTEX_VERDICT_MODEL
    : task === 'candidate_selection'
      ? env.VERTEX_SELECTION_MODEL
      : task === 'grounded_research'
        ? env.VERTEX_RESEARCH_MODEL
        : task === 'custom_website'
          ? env.VERTEX_WEBSITE_MODEL
          : env.VERTEX_BLUEPRINT_MODEL;
  return text(configured) || DEFAULT_MODELS[task];
}

export function generativeAIConfigured(env: Env): boolean {
  return Boolean(
    env.AI
    && text(env.AI_GATEWAY_TOKEN)
    && text(env.VERTEX_PROJECT_ID)
    && text(env.VERTEX_SERVICE_ACCOUNT_EMAIL)
    && text(env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY)
  );
}

function serviceAccountConfig(env: Env): VertexServiceAccountConfig {
  const config = {
    projectId: text(env.VERTEX_PROJECT_ID),
    location: text(env.VERTEX_LOCATION) || 'us',
    clientEmail: text(env.VERTEX_SERVICE_ACCOUNT_EMAIL),
    privateKey: text(env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY).replace(/\\n/g, '\n'),
    privateKeyId: text(env.VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY_ID) || undefined
  };
  const missing = Object.entries({
    VERTEX_PROJECT_ID: config.projectId,
    VERTEX_SERVICE_ACCOUNT_EMAIL: config.clientEmail,
    VERTEX_SERVICE_ACCOUNT_PRIVATE_KEY: config.privateKey
  }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Generative AI Vertex configuration is missing: ${missing.join(', ')}`);
  if (!/^[a-z0-9-]+$/i.test(config.projectId)) throw new Error('VERTEX_PROJECT_ID has an invalid format');
  if (!/^[a-z0-9-]+$/i.test(config.location)) throw new Error('VERTEX_LOCATION has an invalid format');
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

function ownedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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
    ownedArrayBuffer(pemBytes(config.privateKey)),
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

function tokenCacheKey(config: VertexServiceAccountConfig): string {
  return `${TOKEN_CACHE_PREFIX}${fnvHash(`${config.projectId}:${config.clientEmail}`)}`;
}

async function vertexAccessToken(env: Env, config: VertexServiceAccountConfig): Promise<string> {
  const key = tokenCacheKey(config);
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
  const cached: CachedAccessToken = { accessToken: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  await env.KV.put(key, JSON.stringify(cached), { expirationTtl: Math.max(60, expiresIn - 120) });
  return body.access_token;
}

function fnvHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function parseJson<T>(value: string): T {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced || value).trim();
  const firstObject = source.indexOf('{');
  const firstArray = source.indexOf('[');
  const start = firstObject < 0 ? firstArray : firstArray < 0 ? firstObject : Math.min(firstObject, firstArray);
  const end = Math.max(source.lastIndexOf('}'), source.lastIndexOf(']'));
  if (start < 0 || end <= start) throw new Error('Generative AI response did not contain JSON');
  return JSON.parse(source.slice(start, end + 1)) as T;
}

/**
 * Vertex can reject otherwise-valid structured-output schemas when their grammar
 * becomes too complex. Stage 3 is uniquely large because it returns a full
 * 30-day calendar plus several nested asset collections. The exact 30-day
 * requirement remains enforced deterministically by validateAssets(); removing
 * only the transport-level 30/30 array bound reduces schema grammar complexity
 * without weakening the Blueprint contract. The same transport adaptation makes
 * the already-required prepared-asset invariant explicit to Vertex so Stage 3
 * cannot erase a canonical day's prepared assets with an empty array.
 */
export function responseSchemaForVertexRequest(
  task: GenerativeAITask,
  schema: GenerativeAIResponseSchema
): GenerativeAIResponseSchema {
  if (task === 'candidate_selection' && schema.type === 'OBJECT' && schema.properties) {
    const channels = schema.properties.channels;
    const item = channels?.items;
    if (channels?.type === 'ARRAY' && item?.type === 'OBJECT' && item.properties) {
      const relaxedProperties = Object.fromEntries(
        Object.entries(item.properties).map(([key, value]) => {
          if (key === 'targetType' || key === 'outreachScriptId') {
            const { enum: _enum, ...rest } = value;
            return [key, rest];
          }
          return [key, value];
        })
      ) as Record<string, GenerativeAIResponseSchema>;
      const { minItems: _minItems, maxItems: _maxItems, ...relaxedChannels } = channels;
      return {
        ...schema,
        properties: {
          ...schema.properties,
          channels: {
            ...relaxedChannels,
            items: {
              ...item,
              properties: relaxedProperties
            }
          }
        }
      };
    }
    return schema;
  }

  if (task !== 'blueprint' || schema.type !== 'OBJECT' || !schema.properties) return schema;
  const dailyActions = schema.properties.dailyActions;
  if (!dailyActions || dailyActions.type !== 'ARRAY' || dailyActions.minItems !== 30 || dailyActions.maxItems !== 30) {
    return schema;
  }

  const dailyItem = dailyActions.items;
  let transportItem = dailyItem;
  if (dailyItem?.type === 'OBJECT' && dailyItem.properties) {
    const preparedAssets = dailyItem.properties.preparedAssets;
    if (preparedAssets?.type === 'ARRAY' && (preparedAssets.minItems ?? 0) < 1) {
      transportItem = {
        ...dailyItem,
        properties: {
          ...dailyItem.properties,
          preparedAssets: {
            ...preparedAssets,
            minItems: 1
          }
        }
      };
    }
  }

  const { minItems: _minItems, maxItems: _maxItems, ...relaxedDailyActions } = dailyActions;
  return {
    ...schema,
    properties: {
      ...schema.properties,
      dailyActions: {
        ...relaxedDailyActions,
        ...(transportItem ? { items: transportItem } : {})
      }
    }
  };
}

export async function aiGatewayVertexUrl(env: Env, task: GenerativeAITask): Promise<string> {
  const config = serviceAccountConfig(env);
  const gatewayId = text(env.AI_GATEWAY_ID) || DEFAULT_GATEWAY_ID;
  const model = resolveGenerativeModel(env, task);
  if (!/^[a-z0-9._-]+$/i.test(model)) throw new Error(`Vertex model for ${task} has an invalid format`);
  const base = (await env.AI.gateway(gatewayId).getUrl('google-vertex-ai')).replace(/\/$/, '');
  return `${base}/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
}

export async function generateAI(env: Env, options: GenerateOptions): Promise<GenerateResult> {
  const config = serviceAccountConfig(env);
  const gatewayId = text(env.AI_GATEWAY_ID) || DEFAULT_GATEWAY_ID;
  const gatewayToken = text(env.AI_GATEWAY_TOKEN);
  if (!gatewayToken) {
    throw new Error('Generative AI Cloudflare AI Gateway configuration is missing: AI_GATEWAY_TOKEN');
  }
  const model = resolveGenerativeModel(env, options.task);
  const token = await vertexAccessToken(env, config);
  const url = await aiGatewayVertexUrl(env, options.task);
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.1,
    maxOutputTokens: options.maxOutputTokens ?? 8192
  };
  if (options.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchemaForVertexRequest(options.task, options.responseSchema);
  }
  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
    generationConfig
  };
  if (options.systemInstruction) {
    requestBody.systemInstruction = { role: 'system', parts: [{ text: options.systemInstruction }] };
  }
  if (options.googleSearch) requestBody.tools = [{ google_search: {} }];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'cf-aig-authorization': `Bearer ${gatewayToken}`,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Vertex ${options.task} request timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const body = await response.json() as VertexGenerateContentResponse;
  if (!response.ok) {
    throw new Error(`Vertex ${options.task} returned HTTP ${response.status}: ${body.error?.message || 'request failed'}`);
  }
  const candidate = body.candidates?.[0];
  const output = candidate?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
  const groundingMetadata = candidate?.groundingMetadata;
  const groundedWebChunks = (groundingMetadata?.groundingChunks || [])
    .filter(chunk => text(chunk.web?.uri));
  const groundingOnlyResult = options.task === 'grounded_research'
    && options.googleSearch === true
    && groundedWebChunks.length > 0;
  if (!output && !groundingOnlyResult) {
    throw new Error(body.promptFeedback?.blockReason || candidate?.finishReason || `Vertex ${options.task} returned no content`);
  }
  const responseMaterial = output || JSON.stringify(groundedWebChunks.map(chunk => ({
    uri: text(chunk.web?.uri),
    title: text(chunk.web?.title)
  })));
  return {
    text: output,
    groundingMetadata,
    receipt: {
      provider: 'google_vertex_ai',
      gateway: 'cloudflare_ai_gateway',
      gatewayId,
      task: options.task,
      model,
      modelVersion: body.modelVersion,
      responseId: body.responseId,
      promptHash: fnvHash(options.prompt),
      responseHash: fnvHash(responseMaterial),
      promptTokenCount: body.usageMetadata?.promptTokenCount,
      candidatesTokenCount: body.usageMetadata?.candidatesTokenCount,
      totalTokenCount: body.usageMetadata?.totalTokenCount,
      completedAt: new Date().toISOString()
    }
  };
}

export async function generateAIJson<T>(env: Env, options: GenerateOptions): Promise<{ data: T; result: GenerateResult }> {
  const result = await generateAI(env, options);
  return { data: parseJson<T>(result.text), result };
}
