import { authenticateRequest } from './auth';
import type { Env } from './env';
import { generateAI, generativeAIConfigured, resolveGenerativeModel } from './generativeAIService';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache'
  }
});

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
      available: generativeAIConfigured(env),
      model: resolveGenerativeModel(env, 'grounded_research'),
      provider: 'google_vertex_ai',
      gateway: 'cloudflare_ai_gateway',
      owner: owner.email,
      persistence: 'session_only',
      connectedToPaidBlueprints: false
    });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!generativeAIConfigured(env)) return json({ error: 'Vertex generative AI is not configured' }, 503);

  let prompt: string;
  try {
    const body = await request.json<{ prompt?: unknown }>();
    prompt = safePrompt(body.prompt);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid research request' }, 400);
  }

  try {
    const result = await generateAI(env, {
      task: 'grounded_research',
      prompt,
      googleSearch: true,
      temperature: 0,
      maxOutputTokens: 6000,
      timeoutMs: 45_000
    });
    const grounding = result.groundingMetadata;
    const chunks = grounding?.groundingChunks || [];
    return json({
      model: result.receipt.model,
      provider: result.receipt.provider,
      gateway: result.receipt.gateway,
      answer: result.text,
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
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Vertex grounded research failed' }, 502);
  }
}
