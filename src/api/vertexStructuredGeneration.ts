import type { Env } from './env';
import {
  generateAIJson,
  resolveGenerativeModel,
  type GenerativeAIResponseSchema
} from './generativeAIService';

export type VertexResponseSchema = GenerativeAIResponseSchema;

interface VertexServiceAccountConfig {
  projectId: string;
  location: string;
  model: string;
  clientEmail: string;
  privateKey: string;
  privateKeyId?: string;
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
  provider: 'google_vertex_ai';
  gateway: 'cloudflare_ai_gateway';
  gatewayId: string;
}

export interface VertexStructuredStageResult<T> {
  data: T;
  receipt: VertexStructuredStageReceipt;
}

function text(value: string | undefined): string {
  return value?.trim() || '';
}

export function vertexBlueprintRequired(env: Env): boolean {
  return text(env.VERTEX_BLUEPRINT_REQUIRED).toLowerCase() !== 'false';
}

export function vertexServiceAccountConfig(env: Env): VertexServiceAccountConfig {
  const config = {
    projectId: text(env.VERTEX_PROJECT_ID),
    location: text(env.VERTEX_LOCATION) || 'us',
    model: resolveGenerativeModel(env, 'blueprint'),
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

/**
 * Compatibility helper for diagnostics/tests. Runtime generation does not call this URL;
 * all model inference is routed by GenerativeAIService through Cloudflare AI Gateway.
 */
export function vertexGenerateContentUrl(config: Pick<VertexServiceAccountConfig, 'projectId' | 'location' | 'model'>): string {
  const host = config.location === 'global'
    ? 'aiplatform.googleapis.com'
    : `${config.location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(config.model)}:generateContent`;
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
  let generated: Awaited<ReturnType<typeof generateAIJson<T>>>;
  try {
    generated = await generateAIJson<T>(env, {
      task: 'blueprint',
      systemInstruction: options.systemInstruction,
      prompt: options.prompt,
      responseSchema: options.responseSchema,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      timeoutMs: options.timeoutMs ?? 45_000
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vertex Blueprint stage ${options.stage} failed: ${message}`);
  }
  const { data, result } = generated;
  return {
    data,
    receipt: {
      stage: options.stage,
      model: result.receipt.model,
      modelVersion: result.receipt.modelVersion,
      responseId: result.receipt.responseId,
      promptHash: result.receipt.promptHash,
      responseHash: result.receipt.responseHash,
      promptTokenCount: result.receipt.promptTokenCount,
      candidatesTokenCount: result.receipt.candidatesTokenCount,
      totalTokenCount: result.receipt.totalTokenCount,
      completedAt: result.receipt.completedAt,
      provider: result.receipt.provider,
      gateway: result.receipt.gateway,
      gatewayId: result.receipt.gatewayId
    }
  };
}
