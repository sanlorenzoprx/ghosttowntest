import type { Env } from './env';
import type { EvaluationResult } from '../types/lit';
import type { PaidTestOrder } from '../types/paidTest';
import type { BlueprintSource, CustomerAccessChannel } from '../types/launchBlueprint';
import type { CustomerAccessResearchInput } from './launchBlueprintGenerator';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface CustomerAccessResearchReceipt {
  provider: 'gemini_google_search';
  model: string;
  requestedAt: string;
  completedAt: string;
  webSearchQueries: string[];
  searchEntryPointRenderedContent?: string;
  searchEntryPointSdkBlob?: string;
  candidateChannelCount: number;
  verifiedChannelCount: number;
  rejectedUrls: Array<{ url: string; reason: string }>;
  responseHash: string;
}

export interface CustomerAccessResearchResult {
  research: CustomerAccessResearchInput;
  receipt: CustomerAccessResearchReceipt;
}

interface CandidateChannel {
  community?: unknown;
  platform?: unknown;
  publicUrl?: unknown;
  relevance?: unknown;
  activity?: unknown;
  participationRules?: unknown;
  recommendedApproach?: unknown;
  usefulTopic?: unknown;
  risk?: unknown;
  firstAction?: unknown;
  confidence?: unknown;
}

interface CandidateExpert {
  name?: unknown;
  role?: unknown;
  publicUrl?: unknown;
  relevance?: unknown;
}

interface CandidatePayload {
  channels?: CandidateChannel[];
  publicExpertsAndPartners?: CandidateExpert[];
}

interface GeminiGroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: Array<{ web?: { uri?: string; title?: string; domain?: string } }>;
  searchEntryPoint?: { renderedContent?: string; sdkBlob?: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GeminiGroundingMetadata;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

interface VerifiedUrl {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  publisher: string;
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

function sourceId(url: string): string {
  return `source_${fnvHash(url.toLowerCase())}`;
}

function channelId(url: string): string {
  return `channel_${fnvHash(url.toLowerCase())}`;
}

function extractJson(value: string): CandidatePayload {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || value;
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('Google research response did not contain JSON');
  return JSON.parse(source.slice(first, last + 1)) as CandidatePayload;
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

function safePublicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
    if (hostname.includes(':') || privateIpv4(hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function verifyUrl(rawUrl: string): Promise<VerifiedUrl> {
  const safe = safePublicUrl(rawUrl);
  if (!safe) throw new Error('URL is not a public HTTPS address');
  const response = await fetch(safe.toString(), {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2',
      'User-Agent': 'GhostTownResearchVerifier/2.0 (+https://ghosttowntest.com)'
    }
  });
  const final = safePublicUrl(response.url || safe.toString());
  if (!response.ok || !final) {
    await response.body?.cancel();
    throw new Error(`Public page returned HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(`Unsupported page type: ${contentType}`);
  }
  await response.body?.cancel();
  return {
    requestedUrl: safe.toString(),
    finalUrl: final.toString(),
    title: final.hostname.replace(/^www\./, ''),
    publisher: final.hostname.replace(/^www\./, '')
  };
}

function activity(value: unknown): CustomerAccessChannel['activity'] {
  return value === 'recent' || value === 'active' || value === 'occasional' || value === 'uncertain' ? value : 'uncertain';
}

function confidence(value: unknown): CustomerAccessChannel['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' || value === 'unverified' ? value : 'unverified';
}

function score(channel: CustomerAccessChannel): number {
  const confidenceScore = { high: 6, medium: 4, low: 2, unverified: 0 }[channel.confidence];
  const activityScore = { recent: 4, active: 3, occasional: 1, uncertain: 0 }[channel.activity];
  return confidenceScore + activityScore;
}

function researchPrompt(order: PaidTestOrder, verdict: EvaluationResult): string {
  const geography = text(order.intake.geography, 'United States and other English-speaking markets where relevant');
  const alternatives = [order.intake.currentWorkaround, verdict.idea.currentAlternative].filter(Boolean).join('; ');
  return `You are the current-web research stage for a paid GhostTown Launch Blueprint.

Business idea: ${verdict.idea.ideaName}
Description: ${verdict.idea.description}
Initial customer: ${order.intake.targetBuyer}
Painful problem: ${order.intake.problem}
Current alternatives: ${alternatives}
Geography: ${geography}

Use Google Search extensively. Find 15-25 distinct, current, publicly reachable customer-access channels where this exact buyer is likely to gather, learn, ask questions, evaluate alternatives, or build professional relationships. Favor official associations, active public communities, forums, newsletters, directories, conferences, podcasts, public creator pages, local organizations, and complementary partners. Do not invent names or URLs. Do not use generic search-result pages. Do not claim rules or activity that the public evidence does not support.

For participationRules, state the confirmed public rule when available. Otherwise write exactly: "Rules not confirmed publicly; read the channel's current rules before participating."
For activity, use recent, active, occasional, or uncertain.
For confidence, use high, medium, low, or unverified.
Rank the best channels first. Include practical, non-spammy first actions. Also identify up to 8 public experts, associations, organizers, or complementary partners.

Return only valid JSON with this shape:
{
  "channels": [{
    "community": "public name",
    "platform": "platform or channel type",
    "publicUrl": "https://direct-public-page.example/path",
    "relevance": "why this buyer is present",
    "activity": "recent|active|occasional|uncertain",
    "participationRules": "confirmed rule or required uncertainty statement",
    "recommendedApproach": "relationship-first approach",
    "usefulTopic": "specific helpful topic",
    "risk": "access, promotion, moderation, or fit risk",
    "firstAction": "one concrete first action",
    "confidence": "high|medium|low|unverified"
  }],
  "publicExpertsAndPartners": [{
    "name": "public name",
    "role": "public role",
    "publicUrl": "https://direct-public-page.example/path",
    "relevance": "why this person or organization matters"
  }]
}`;
}

export async function researchCustomerAccess(env: Env, order: PaidTestOrder, verdict: EvaluationResult): Promise<CustomerAccessResearchResult> {
  if (env.GOOGLE_SEARCH_GROUNDING_ENABLED !== 'true') throw new Error('Google Search grounding is not enabled');
  if (!env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_API_KEY is not configured');
  const model = env.GEMINI_RESEARCH_MODEL?.trim() || DEFAULT_MODEL;
  const requestedAt = new Date().toISOString();
  const response = await fetch(`${GOOGLE_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: researchPrompt(order, verdict) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 14000 }
    })
  });
  const body = await response.json() as GeminiResponse;
  if (!response.ok) throw new Error(`Google research request failed: ${body.error?.message || response.status}`);
  const candidate = body.candidates?.[0];
  const outputText = candidate?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
  if (!outputText) throw new Error(`Google research returned no usable text${body.promptFeedback?.blockReason ? `: ${body.promptFeedback.blockReason}` : ''}`);
  const payload = extractJson(outputText);
  const rawCandidates = Array.isArray(payload.channels) ? payload.channels.slice(0, 35) : [];
  const researchDate = new Date().toISOString().slice(0, 10);
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  const verifiedResults = await Promise.all(rawCandidates.map(async raw => {
    const url = text(raw.publicUrl);
    try {
      const verified = await verifyUrl(url);
      return { raw, verified };
    } catch (error) {
      rejectedUrls.push({ url, reason: error instanceof Error ? error.message : 'Verification failed' });
      return null;
    }
  }));

  const seen = new Set<string>();
  const channels: CustomerAccessChannel[] = [];
  const sources: BlueprintSource[] = [];
  for (const result of verifiedResults) {
    if (!result) continue;
    const normalizedUrl = result.verified.finalUrl.replace(/\/$/, '');
    if (seen.has(normalizedUrl.toLowerCase())) continue;
    seen.add(normalizedUrl.toLowerCase());
    const id = sourceId(normalizedUrl);
    const community = text(result.raw.community, result.verified.title);
    const channel: CustomerAccessChannel = {
      channelId: channelId(normalizedUrl),
      community,
      platform: text(result.raw.platform, result.verified.publisher),
      publicUrl: normalizedUrl,
      relevance: text(result.raw.relevance, `Public channel potentially relevant to ${order.intake.targetBuyer}; fit requires manual confirmation.`),
      activity: activity(result.raw.activity),
      participationRules: text(result.raw.participationRules, "Rules not confirmed publicly; read the channel's current rules before participating."),
      recommendedApproach: text(result.raw.recommendedApproach, 'Read current discussions, contribute useful context, and avoid unsolicited promotion.'),
      usefulTopic: text(result.raw.usefulTopic, order.intake.problem),
      risk: text(result.raw.risk, 'Public access was verified, but membership fit and current moderation rules still require confirmation.'),
      firstAction: text(result.raw.firstAction, 'Open the public page, read the current rules, and record three recurring buyer questions before participating.'),
      confidence: confidence(result.raw.confidence),
      researchDate,
      sourceIds: [id]
    };
    channels.push(channel);
    sources.push({
      sourceId: id,
      title: community,
      url: normalizedUrl,
      publisher: result.verified.publisher,
      accessedAt: new Date().toISOString(),
      supports: [`Customer access channel: ${community}`]
    });
  }
  channels.sort((left, right) => score(right) - score(left) || left.community.localeCompare(right.community));
  const prioritized = channels.slice(0, 25);
  const allowedSourceIds = new Set(prioritized.flatMap(channel => channel.sourceIds));
  const prioritizedSources = sources.filter(source => allowedSourceIds.has(source.sourceId));

  const rawExperts = Array.isArray(payload.publicExpertsAndPartners) ? payload.publicExpertsAndPartners.slice(0, 12) : [];
  const expertResults = await Promise.all(rawExperts.map(async raw => {
    const url = text(raw.publicUrl);
    try {
      const verified = await verifyUrl(url);
      return { raw, verified };
    } catch (error) {
      rejectedUrls.push({ url, reason: error instanceof Error ? error.message : 'Verification failed' });
      return null;
    }
  }));
  const publicExpertsAndPartners = expertResults.filter((item): item is NonNullable<typeof item> => Boolean(item)).map(item => {
    const url = item.verified.finalUrl.replace(/\/$/, '');
    const id = sourceId(url);
    if (!prioritizedSources.some(source => source.sourceId === id)) {
      prioritizedSources.push({ sourceId: id, title: text(item.raw.name, item.verified.title), url, publisher: item.verified.publisher, accessedAt: new Date().toISOString(), supports: [`Public expert or partner: ${text(item.raw.name, item.verified.title)}`] });
    }
    return {
      name: text(item.raw.name, item.verified.title),
      role: text(item.raw.role, 'Public organization, expert, or complementary partner'),
      publicUrl: url,
      relevance: text(item.raw.relevance, `Potentially relevant to ${order.intake.targetBuyer}; relationship fit requires manual confirmation.`),
      sourceIds: [id]
    };
  });

  const metadata = candidate?.groundingMetadata;
  const complete = prioritized.length >= 10;
  return {
    research: {
      status: complete ? 'complete' : prioritized.length ? 'partial' : 'not_run',
      researchDate,
      sources: prioritizedSources,
      channels: prioritized,
      publicExpertsAndPartners
    },
    receipt: {
      provider: 'gemini_google_search',
      model,
      requestedAt,
      completedAt: new Date().toISOString(),
      webSearchQueries: metadata?.webSearchQueries?.filter(Boolean) || [],
      searchEntryPointRenderedContent: metadata?.searchEntryPoint?.renderedContent,
      searchEntryPointSdkBlob: metadata?.searchEntryPoint?.sdkBlob,
      candidateChannelCount: rawCandidates.length,
      verifiedChannelCount: prioritized.length,
      rejectedUrls,
      responseHash: fnvHash(outputText)
    }
  };
}
