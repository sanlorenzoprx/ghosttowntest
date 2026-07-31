import { authenticateRequest } from './auth';
import type { Env } from './env';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache'
  }
});

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

interface GroundingSupport {
  segment?: { startIndex?: number; endIndex?: number; text?: string };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GroundingMetadata;
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function ownerEmails(env: Env): Set<string> {
  return new Set((env.INTERNAL_RESEARCH_OWNER_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean));
}

async function requireOwner(request: Request, env: Env): Promise<{ email: string } | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const allowed = ownerEmails(env);
  if (!allowed.size) return json({ error: 'Internal research owners are not configured' }, 503);
  if (!allowed.has(normalizeEmail(auth.email))) return json({ error: 'Internal research access denied' }, 403);
  return { email: auth.email };
}

function plainText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safePrompt(value: unknown): string {
  const prompt = plainText(value).replace(/\u0000/g, '').trim();
  if (prompt.length < 3) throw new Error('Enter a research question');
  if (prompt.length > 8000) throw new Error('Research question is too long');
  return prompt;
}

export async function handleInternalGoogleSearch(request: Request, env: Env): Promise<Response> {
  const owner = await requireOwner(request, env);
  if (owner instanceof Response) return owner;

  if (request.method === 'GET') {
    return json({
      available: Boolean(env.GEMINI_API_KEY?.trim()),
      model: env.GEMINI_GOOGLE_SEARCH_MODEL?.trim() || DEFAULT_MODEL,
      owner: owner.email,
      persistence: 'session_only',
      connectedToPaidBlueprints: false
    });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.GEMINI_API_KEY?.trim()) return json({ error: 'GEMINI_API_KEY is not configured' }, 503);

  let prompt: string;
  try {
    const body = await request.json<{ prompt?: unknown }>();
    prompt = safePrompt(body.prompt);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid research request' }, 400);
  }

  const model = env.GEMINI_GOOGLE_SEARCH_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 6000
      }
    })
  });
  const body = await response.json() as GeminiResponse;
  if (!response.ok) return json({ error: body.error?.message || `Google grounded search returned HTTP ${response.status}` }, 502);
  const candidate = body.candidates?.[0];
  const answer = candidate?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
  if (!answer) return json({ error: body.promptFeedback?.blockReason || candidate?.finishReason || 'Google grounded search returned no answer' }, 502);
  const grounding = candidate?.groundingMetadata;
  const chunks = grounding?.groundingChunks || [];

  return json({
    model,
    answer,
    webSearchQueries: grounding?.webSearchQueries || [],
    searchSuggestionHtml: grounding?.searchEntryPoint?.renderedContent || '',
    sources: chunks.map((chunk, index) => ({
      index: index + 1,
      title: chunk.web?.title || `Source ${index + 1}`,
      uri: chunk.web?.uri || ''
    })).filter(source => source.uri),
    supports: (grounding?.groundingSupports || []).map(support => ({
      startIndex: support.segment?.startIndex,
      endIndex: support.segment?.endIndex,
      text: support.segment?.text,
      sourceIndices: (support.groundingChunkIndices || []).map(index => index + 1),
      confidenceScores: support.confidenceScores || []
    })),
    persistence: 'session_only',
    connectedToPaidBlueprints: false,
    notice: 'This live Google-grounded result is displayed only to the owner who submitted the prompt. GhostTown does not save it or use it for paid Blueprint fulfillment.'
  });
}
