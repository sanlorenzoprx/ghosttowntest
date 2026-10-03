import { authenticateRequest } from './auth';
import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import { hydrateEvaluationResultDecisionV2 } from '../verdict/verdictDecisionV2';
import type {
  CompetitorSeed,
  CompetitorSeedRelationship,
  CompetitorSeedSuggestion,
  PaidTestOrder
} from '../types/paidTest';
import { startLaunchBlueprintWorkflow } from './blueprintFulfillment';
import { generateAIJson, type GenerativeAIResponseSchema } from './generativeAIService';
const orderKey = (orderId: string) => `paid_test_order_${orderId}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
});

interface SuggestedSeedPayload {
  suggestions?: Array<{
    name?: unknown;
    website?: unknown;
    relationship?: unknown;
    reason?: unknown;
    confidence?: unknown;
  }>;
}

interface SeedInput {
  name?: unknown;
  website?: unknown;
  relationship?: unknown;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim() : fallback;
}

function fnvHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
}

function publicWebsite(value: unknown): URL | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    // Older persisted suggestions may contain an http:// URL even though they were
    // previously presented to the customer as verified. Upgrade those public URLs
    // to HTTPS before applying the normal safety and reachability checks.
    const normalized = /^http:\/\//i.test(raw) ? raw.replace(/^http:\/\//i, 'https://') : raw;
    const candidate = new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    const hostname = candidate.hostname.toLowerCase();
    if (candidate.protocol !== 'https:' || candidate.username || candidate.password) return null;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
    if (hostname.includes(':') || privateIpv4(hostname)) return null;
    candidate.hash = '';
    return candidate;
  } catch {
    return null;
  }
}

function relationship(value: unknown): CompetitorSeedRelationship {
  return value === 'direct_competitor' || value === 'adjacent_product' || value === 'current_alternative'
    ? value
    : 'adjacent_product';
}

function confidence(value: unknown): CompetitorSeedSuggestion['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('Seed verification timed out'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyWebsite(raw: unknown): Promise<{ website: string; domain: string } | null> {
  const candidate = publicWebsite(raw);
  if (!candidate) return null;
  let response: Response | null = null;
  try {
    response = await fetchWithTimeout(candidate.toString(), {
      method: 'HEAD',
      headers: { 'User-Agent': 'GhostTownSeedVerifier/1.0 (+https://ghosttowntest.com)' }
    });
    if (response.status === 405 || response.status === 501) {
      await response.body?.cancel();
      response = await fetchWithTimeout(candidate.toString(), {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2',
          'User-Agent': 'GhostTownSeedVerifier/1.0 (+https://ghosttowntest.com)'
        }
      });
    }
    const final = publicWebsite(response.url || candidate.toString());
    if (!final || response.status >= 500) return null;
    return { website: final.origin, domain: final.hostname.replace(/^www\./, '') };
  } catch {
    return null;
  } finally {
    await response?.body?.cancel().catch(() => undefined);
  }
}

async function ownedPaidOrder(request: Request, env: Env, orderId: string): Promise<{ order: PaidTestOrder; verdict: EvaluationResult } | Response> {
  const auth = await authenticateRequest(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const raw = await env.KV.get(orderKey(orderId));
  if (!raw) return json({ error: 'Launch Blueprint order not found' }, 404);
  const order = JSON.parse(raw) as PaidTestOrder;
  if (order.email.trim().toLowerCase() !== auth.email.trim().toLowerCase()) return json({ error: 'Launch Blueprint order not found' }, 404);
  const verdictRaw = await env.KV.get(`verdict_${order.verdictId}`)
    ?? await env.KV.get(`verdict:${order.verdictId}`)
    ?? await env.KV.get(`user_result_${order.email.trim().toLowerCase()}_${order.verdictId}`);
  if (!verdictRaw) return json({ error: 'Source verdict not found' }, 404);
  return { order, verdict: hydrateEvaluationResultDecisionV2(JSON.parse(verdictRaw) as EvaluationResult) };
}

function suggestionPrompt(order: PaidTestOrder, verdict: EvaluationResult): string {
  return `Help a paying GhostTown customer identify competitors and adjacent products for a distribution-footprint analysis.

Idea: ${verdict.idea.ideaName}
Description: ${verdict.idea.description}
Target customer: ${order.intake.targetBuyer}
Problem: ${order.intake.problem}
Current workaround: ${order.intake.currentWorkaround}
Known alternative from verdict: ${verdict.idea.currentAlternative || 'not supplied'}
Geography: ${order.intake.geography || 'not specified'}

Suggest up to six real, established products, brands, marketplaces, publications, or adjacent tools whose public distribution footprint would help reveal where this buyer already pays attention. Include a direct competitor when one is confidently known, but adjacent products are valid and often better. Use existing model knowledge only; do not claim that you searched the web. Never invent a brand or domain. Omit any candidate whose official homepage domain you are not confident about.

Return only JSON:
{"suggestions":[{"name":"Public brand name","website":"https://official-domain.example","relationship":"direct_competitor|adjacent_product|current_alternative","reason":"Why its distribution footprint is relevant","confidence":"high|medium|low"}]}`;
}

const SEED_SUGGESTION_SCHEMA: GenerativeAIResponseSchema = {
  type: 'OBJECT',
  properties: {
    suggestions: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          website: { type: 'STRING' },
          relationship: {
            type: 'STRING',
            enum: ['direct_competitor', 'adjacent_product', 'current_alternative']
          },
          reason: { type: 'STRING' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] }
        },
        required: ['name', 'website', 'relationship', 'reason', 'confidence']
      }
    }
  },
  required: ['suggestions']
};

async function aiSuggestions(env: Env, order: PaidTestOrder, verdict: EvaluationResult): Promise<SuggestedSeedPayload> {
  const generated = await generateAIJson<SuggestedSeedPayload>(env, {
    task: 'candidate_selection',
    systemInstruction: [
      'You select real public market-reference resources for a paying GhostTown customer.',
      'Never invent a company, brand, product, publication, marketplace, or domain.',
      'Prefer official homepages for established resources.',
      'Return only resources whose official domain you are confident is correct.'
    ].join(' '),
    prompt: suggestionPrompt(order, verdict),
    responseSchema: SEED_SUGGESTION_SCHEMA,
    temperature: 0.1,
    maxOutputTokens: 2200,
    timeoutMs: 45_000
  });
  return generated.data;
}

async function buildSuggestions(env: Env, order: PaidTestOrder, verdict: EvaluationResult): Promise<CompetitorSeedSuggestion[]> {
  const candidates: Array<{ name: string; website: string; relationship: CompetitorSeedRelationship; reason: string; confidence: CompetitorSeedSuggestion['confidence'] }> = [];
  const commercialSignal = order.intake.researchSignals?.commercial;
  if (commercialSignal?.publicUrl && commercialSignal.source !== 'not_sure') {
    const signalUrl = publicWebsite(commercialSignal.publicUrl);
    if (signalUrl) candidates.push({
      name: commercialSignal.value || signalUrl.hostname.replace(/^www\./, ''),
      website: signalUrl.toString(),
      relationship: 'current_alternative',
      reason: 'Commercial alternative selected before purchase and carried into the confirmation map.',
      confidence: commercialSignal.verificationStatus === 'verified' ? 'high' : 'medium'
    });
  }
  for (const link of order.intake.competitorLinks || []) {
    const url = publicWebsite(link);
    if (!url) continue;
    candidates.push({
      name: url.hostname.replace(/^www\./, ''),
      website: url.toString(),
      relationship: 'direct_competitor',
      reason: 'Website supplied during the original checkout intake.',
      confidence: 'high'
    });
  }
  let payload: SuggestedSeedPayload = {};
  try {
    payload = await aiSuggestions(env, order, verdict);
  } catch (error) {
    if (candidates.length < 3) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`GhostTown could not preselect the starting research set with Vertex AI: ${message}`);
    }
  }
  for (const item of payload.suggestions || []) {
    candidates.push({
      name: text(item.name),
      website: text(item.website),
      relationship: relationship(item.relationship),
      reason: text(item.reason, 'Potentially useful distribution-footprint seed.'),
      confidence: confidence(item.confidence)
    });
  }

  const verified = await Promise.all(candidates.slice(0, 10).map(async candidate => ({
    candidate,
    verified: await verifyWebsite(candidate.website)
  })));
  const seen = new Set<string>();
  const suggestions: CompetitorSeedSuggestion[] = [];
  for (const item of verified) {
    if (!item.verified || !item.candidate.name) continue;
    if (seen.has(item.verified.domain)) continue;
    seen.add(item.verified.domain);
    suggestions.push({
      suggestionId: `seed_suggestion_${fnvHash(item.verified.domain)}`,
      name: item.candidate.name,
      website: item.verified.website,
      relationship: item.candidate.relationship,
      reason: item.candidate.reason,
      confidence: item.candidate.confidence,
      verified: true
    });
  }
  const result = suggestions.slice(0, 6);
  if (result.length < 2) {
    throw new Error(`GhostTown could verify only ${result.length} starting research resource${result.length === 1 ? '' : 's'}. At least two verified resources are required before the Blueprint can start.`);
  }
  return result;
}

export async function handleBlueprintSeeds(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedPaidOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (request.method === 'GET') {
    return json({
      orderId,
      ideaName: owned.verdict.idea.ideaName,
      status: owned.order.status,
      paid: Boolean(owned.order.paidAt),
      suggestions: owned.order.competitorSeedSuggestions || [],
      confirmedSeeds: owned.order.intake.competitorSeeds || [],
      researchSignals: owned.order.intake.researchSignals || null,
      targetCustomer: owned.order.intake.targetBuyer,
      requirements: { minimum: 2, maximum: 3 }
    });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!owned.order.paidAt) return json({ error: 'Payment has not been verified yet' }, 425);
  if (owned.order.status === 'researching' || owned.order.status === 'generating' || owned.order.status === 'ready') {
    return json({ error: 'Competitor seeds can no longer be changed after research starts' }, 409);
  }

  const body = await request.json<{ seeds?: SeedInput[] }>();
  if (!Array.isArray(body.seeds) || body.seeds.length < 2 || body.seeds.length > 3) {
    return json({ error: 'Confirm exactly two or three competitor or adjacent-product seeds' }, 400);
  }
  const verified = await Promise.all(body.seeds.map(async seed => ({ seed, website: await verifyWebsite(seed.website) })));
  if (verified.some(item => !item.website)) return json({ error: 'Each seed needs a reachable public HTTPS website' }, 400);
  const domains = verified.map(item => item.website!.domain);
  if (new Set(domains).size !== domains.length) return json({ error: 'Use two or three different seed domains' }, 400);

  const suggestionDomains = new Set((owned.order.competitorSeedSuggestions || []).map(item => publicWebsite(item.website)?.hostname.replace(/^www\./, '')).filter(Boolean));
  const now = new Date().toISOString();
  const seeds: CompetitorSeed[] = verified.map((item, index) => ({
    seedId: `competitor_seed_${fnvHash(item.website!.domain)}`,
    name: text(item.seed.name, item.website!.domain),
    website: item.website!.website,
    domain: item.website!.domain,
    relationship: relationship(item.seed.relationship),
    origin: suggestionDomains.has(item.website!.domain) ? 'ghosttown_suggestion' : 'customer_confirmed',
    reason: `Confirmed by the customer as distribution-footprint seed ${index + 1}.`,
    verifiedAt: now
  }));

  owned.order.intake.competitorSeeds = seeds;
  owned.order.status = 'paid';
  owned.order.updatedAt = now;
  owned.order.fulfillmentError = undefined;
  await env.KV.put(orderKey(orderId), JSON.stringify(owned.order));
  const queued = await startLaunchBlueprintWorkflow(env, orderId);
  return json({
    orderId,
    status: queued.order.status,
    workflowId: queued.workflowId,
    confirmedSeeds: seeds
  }, 202);
}

export async function handleBlueprintSeedSuggestions(request: Request, env: Env, orderId: string): Promise<Response> {
  const owned = await ownedPaidOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!owned.order.paidAt) return json({ error: 'Payment has not been verified yet' }, 425);
  if (owned.order.competitorSeedSuggestions?.length) {
    return json({ suggestions: owned.order.competitorSeedSuggestions, generatedAt: owned.order.competitorSeedSuggestionsGeneratedAt });
  }
  const suggestions = await buildSuggestions(env, owned.order, owned.verdict);
  owned.order.competitorSeedSuggestions = suggestions;
  owned.order.competitorSeedSuggestionsGeneratedAt = new Date().toISOString();
  owned.order.updatedAt = owned.order.competitorSeedSuggestionsGeneratedAt;
  await env.KV.put(orderKey(orderId), JSON.stringify(owned.order));
  return json({ suggestions, generatedAt: owned.order.competitorSeedSuggestionsGeneratedAt });
}
